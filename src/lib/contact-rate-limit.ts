// Plafond de fréquence du formulaire de contact : limite les envois par
// visiteur (PER_IP) et au global (GLOBAL), utilisé par
// src/app/contact/actions.ts.
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";

/**
 * État en mémoire du process, assumé (pas de Redis) : sur Vercel plusieurs
 * instances peuvent coexister et une instance peut être recyclée à tout
 * moment, donc le plafond réel est approximatif. Acceptable ici : on protège
 * une nuisance (spam, quota Resend), pas une donnée.
 *
 * PER_IP compte les soumissions acceptées (protège la boîte mail). GLOBAL
 * compte les appels Resend réellement tentés, via recordResendCall — un
 * serveur sans clé Resend (QA) n'entame donc jamais ce compteur.
 *
 * Atomicité : aucun `await` ne doit séparer lecture et écriture d'un compteur
 * (hachage SYNCHRONE, jamais crypto.subtle), sinon des requêtes concurrentes
 * liraient toutes le même état et passeraient toutes. Strict pour PER_IP.
 * Pas strict pour GLOBAL (contrôle dans claimContactSendSlot, écriture dans
 * recordResendCall, séparés par un await) : dépassement borné par les
 * requêtes en vol, jugé acceptable au vu de la marge sous le quota Resend.
 */

type SlidingWindow = { readonly max: number; readonly windowMs: number };

/**
 * 3 envois / 15 min : un visiteur envoie un message, éventuellement le renvoie,
 * éventuellement se ravise. Au-delà, ce n'est plus un usage de portfolio.
 */
const PER_IP: SlidingWindow = { max: 3, windowMs: 15 * 60_000 };

// 50/24h toutes clés confondues (protège contre une source distribuée),
// déduit du quota Resend gratuit (100/jour) avec 50 de marge. Fenêtre
// glissante pour éviter le doublement de débit à chaque frontière fixe.
const GLOBAL: SlidingWindow = { max: 50, windowMs: 24 * 60 * 60_000 };

/** Clé de repli quand aucune IP n'est dérivable. Voir deriveClientKey. */
const UNATTRIBUTED_KEY = "unattributed";

type RateLimitState = {
  readonly perKey: Map<string, number[]>;
  globalHits: number[];
  // SHA-256 non salé d'une IPv4 s'inverse par énumération en quelques secondes.
  readonly salt: Buffer;
  warnedMissingIp: boolean;
  // Évite d'inonder les logs quand le plafond global reste dépassé en continu.
  warnedGlobalCap: boolean;
};

// globalThis, pas une variable de module : deux bundles serveur (ou un hot
// reload) donneraient deux tables, donc une limite silencieusement doublée.
const STATE_KEY = Symbol.for("portfolio.contact.rate-limit");

type GlobalWithState = typeof globalThis & { [STATE_KEY]?: RateLimitState };

function getState(): RateLimitState {
  const container = globalThis as GlobalWithState;
  container[STATE_KEY] ??= {
    perKey: new Map(),
    globalHits: [],
    salt: randomBytes(16),
    warnedMissingIp: false,
    warnedGlobalCap: false,
  };
  return container[STATE_KEY];
}

// `timestamp <= now` exclu une dérive d'horloge future qui, sinon, ne
// sortirait jamais de la fenêtre et bannirait l'entrée à vie.
function withinWindow(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((timestamp) => timestamp <= now && now - timestamp < windowMs);
}

// Purge à l'accès, jamais par setInterval : une instance serverless gelée
// n'exécute pas ses timers à l'heure. Pas de plafond de cardinalité car
// Vercel écrase x-forwarded-for (clé non falsifiable) — à revoir si le
// dépôt change de plateforme ou passe derrière un proxy tiers.
function purgeExpired(state: RateLimitState, now: number) {
  for (const [key, timestamps] of state.perKey) {
    const live = withinWindow(timestamps, now, PER_IP.windowMs);
    if (live.length === 0) state.perKey.delete(key);
    else state.perKey.set(key, live);
  }
}

/** Retire la forme `[2001:db8::1]:443` et la forme `1.2.3.4:5678`. */
function stripBracketsAndPort(value: string): string {
  const bracketed = value.match(/^\[(.+?)\](?::\d+)?$/);
  if (bracketed) return bracketed[1];

  // Un seul `:` et une IPv4 devant : c'est un port, pas une IPv6.
  const firstColon = value.indexOf(":");
  if (firstColon !== -1 && value.indexOf(":", firstColon + 1) === -1) {
    const host = value.slice(0, firstColon);
    if (isIP(host) === 4) return host;
  }

  return value;
}

// Développe la compression `::` avant de tronquer au /64 : un split naïf sur
// `2a00:1450::5` renverrait l'adresse entière au lieu du préfixe.
function toIpv6Prefix(address: string): string {
  const [withoutZone] = address.toLowerCase().split("%");
  const [head, tail = ""] = withoutZone.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const filler = Array<string>(Math.max(8 - left.length - right.length, 0)).fill("0");

  return [...left, ...filler, ...right]
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":");
}

// IPv6 ramenée à son /64 (un hébergeur en fournit un entier d'office, sinon
// pas de limite réelle). IPv4 inchangée, avec la contrepartie CGNAT assumée
// (plusieurs abonnés mobiles partagent une IPv4 et donc le plafond).
function toKeyableAddress(rawIp: string): string {
  const candidate = stripBracketsAndPort(rawIp.trim());
  const version = isIP(candidate);

  if (version === 4) return candidate;

  if (version !== 6) return candidate; // ni IPv4 ni IPv6 : brute sert de clé

  // ::ffff:1.2.3.4 : c'est l'IPv4 embarquée qui identifie l'hôte, hors du /64.
  const embedded = candidate.slice(candidate.lastIndexOf(":") + 1);
  if (isIP(embedded) === 4) return embedded;

  return toIpv6Prefix(candidate);
}

// L'IP brute ne sort jamais d'ici, seule l'empreinte hachée circule. Dernière
// entrée de x-forwarded-for : valable tant que Vercel écrase l'en-tête à une
// seule IP — deviendrait faux derrière un proxy ajoutant des sauts (il
// faudrait alors compter depuis la droite selon le nombre de sauts de
// confiance). Aucune IP dérivable -> seau partagé (échec fermé), signalé une
// fois par process.
async function deriveClientKey(state: RateLimitState): Promise<string> {
  const forwardedFor = (await headers()).get("x-forwarded-for");
  const hops = forwardedFor?.split(",").map((hop) => hop.trim()).filter(Boolean) ?? [];
  const clientIp = hops.at(-1);

  if (!clientIp) {
    if (!state.warnedMissingIp) {
      state.warnedMissingIp = true;
      console.warn(
        "[contact] Aucune IP cliente dans `x-forwarded-for` : le plafond de fréquence " +
          "retombe sur un seau partagé par tous les visiteurs de cette instance.",
      );
    }
    return UNATTRIBUTED_KEY;
  }

  return createHash("sha256")
    .update(state.salt)
    .update(toKeyableAddress(clientIp))
    .digest("base64url");
}

export type SendSlotOutcome = "granted" | "rate-limited";

// Refus SANS RIEN ÉCRIRE avant d'écrire : un refus qui incrémenterait quand
// même laisserait un flooder épuiser le budget commun. À appeler après le
// honeypot et les validations.
export async function claimContactSendSlot(): Promise<SendSlotOutcome> {
  const state = getState();
  // Seul await de la fonction, en tête : le reste est synchrone donc atomique.
  const key = await deriveClientKey(state);

  const now = Date.now();
  purgeExpired(state, now);

  const keyHits = withinWindow(state.perKey.get(key) ?? [], now, PER_IP.windowMs);
  if (keyHits.length >= PER_IP.max) return "rate-limited";

  state.globalHits = withinWindow(state.globalHits, now, GLOBAL.windowMs);
  if (state.globalHits.length >= GLOBAL.max) {
    if (!state.warnedGlobalCap) {
      state.warnedGlobalCap = true;
      console.warn(
        `[contact] Plafond global atteint (${GLOBAL.max} envois / 24 h) : le formulaire ` +
          "refuse tous les envois jusqu'à ce que la fenêtre glisse.",
      );
    }
    return "rate-limited";
  }
  state.warnedGlobalCap = false;

  state.perKey.set(key, [...keyHits, now]);
  return "granted";
}

// À appeler juste AVANT l'appel Resend, jamais après (fenêtre de concurrence).
export function recordResendCall(): void {
  const state = getState();
  const now = Date.now();
  state.globalHits = [...withinWindow(state.globalHits, now, GLOBAL.windowMs), now];
}

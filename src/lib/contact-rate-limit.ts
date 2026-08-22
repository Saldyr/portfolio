import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";

/**
 * Plafond de fréquence du formulaire de contact (POR-51).
 *
 * LIMITE STRUCTURELLE, ASSUMÉE — à lire avant de traiter un comportement
 * inattendu comme un bug : l'état vit en mémoire du process. Sur Vercel, les
 * Server Actions tournent en fonctions serverless : plusieurs instances peuvent
 * coexister et une instance peut être recyclée à tout moment. Le plafond réel
 * vaut donc `seuil × nombre d'instances chaudes`, et il retombe à zéro à chaque
 * démarrage à froid. C'est le prix intégral de la décision « mémoire seule »
 * (POR-51), prise sciemment contre un service externe type Redis : ce qu'on
 * protège ici est une nuisance (spam de boîte mail, quota Resend), pas une
 * donnée. Ne pas « corriger » cette approximation sans rouvrir cet arbitrage.
 *
 * Ce que le dispositif protège, et avec quel compteur :
 *   - PER_IP  -> la boîte mail de destination. Commité dès qu'une soumission
 *                valide est acceptée.
 *   - GLOBAL  -> le quota Resend. Commité seulement quand un appel Resend est
 *                réellement tenté (voir recordResendCall).
 * Chacun compte ce qu'il protège. C'est ce qui fait qu'un serveur sans clé
 * Resend — le cas du serveur QA — n'entame jamais le compteur global.
 *
 * INVARIANT D'ATOMICITÉ — la règle que le prochain refactor cassera s'il
 * l'ignore : Node est mono-thread par instance, donc « lire, décider, écrire »
 * n'est atomique QUE si aucun `await` ne s'y intercale. `await headers()` est
 * fait en premier, le hachage est SYNCHRONE (jamais `crypto.subtle`, qui est
 * asynchrone), et rien d'asynchrone ne sépare ensuite le contrôle de l'écriture.
 * Sans ça, la limite de 3 devient « 3, plus tout ce qui tient dans un
 * aller-retour réseau » : N requêtes concurrentes lisent le même compteur et
 * passent toutes.
 *
 * Cet invariant est STRICT pour PER_IP — contrôle et écriture ont lieu dans le
 * même bloc synchrone de claimContactSendSlot. Il ne l'est PAS pour GLOBAL, et
 * c'est assumé : son contrôle est dans claimContactSendSlot, son écriture dans
 * recordResendCall, et la résolution de l'`await` les sépare. Deux requêtes
 * concurrentes peuvent donc franchir le contrôle avant que l'une ait écrit. Le
 * dépassement est borné par le nombre de requêtes en vol sur l'instance, très
 * en deçà des 50 de marge laissés sous le quota Resend. Refermer cette fenêtre
 * exigerait de commiter le global au moment du contrôle, ce qui ferait compter
 * des envois jamais tentés — un défaut pire, et qui casserait l'isolation de la
 * QA décrite plus haut.
 */

type SlidingWindow = { readonly max: number; readonly windowMs: number };

/**
 * 3 envois / 15 min : un visiteur envoie un message, éventuellement le renvoie,
 * éventuellement se ravise. Au-delà, ce n'est plus un usage de portfolio.
 */
const PER_IP: SlidingWindow = { max: 3, windowMs: 15 * 60_000 };

/**
 * 50 envois / 24 h, toutes clés confondues — seule protection contre une source
 * distribuée, qu'un plafond par IP ne voit pas. Déduit du quota Resend gratuit
 * (100 emails/jour) avec 50 de marge, et non choisi au jugé. Vu le plafond par
 * IP, l'atteindre exige au moins 17 clés distinctes.
 *
 * Fenêtre GLISSANTE et non fixe : la réouverture est progressive au lieu d'un
 * mur qui retomberait d'un coup toutes les 24 h. Une fenêtre fixe offrirait en
 * prime un doublement du débit à chaque frontière, dont l'horaire est public.
 */
const GLOBAL: SlidingWindow = { max: 50, windowMs: 24 * 60 * 60_000 };

/** Clé de repli quand aucune IP n'est dérivable. Voir deriveClientKey. */
const UNATTRIBUTED_KEY = "unattributed";

type RateLimitState = {
  /** clé hachée -> horodatages des envois acceptés dans la fenêtre */
  readonly perKey: Map<string, number[]>;
  /** horodatages des appels Resend réellement tentés */
  globalHits: number[];
  /**
   * Sel du hachage, tiré une fois par process et jamais persisté. Il n'est pas
   * décoratif : un SHA-256 d'adresse IPv4 non salé s'inverse par énumération de
   * 2^32 en quelques secondes — ce ne serait pas de l'anonymisation. L'état
   * étant déjà par process, un sel par process ne perd rien.
   */
  readonly salt: Buffer;
  /** Voir deriveClientKey : on ne veut avertir qu'une fois par process. */
  warnedMissingIp: boolean;
  /**
   * Voir claimContactSendSlot. Une fois le plafond global atteint, toutes les
   * requêtes suivantes le franchissent en échec — et comme les entrées par clé
   * expirent au bout de PER_IP.windowMs, plus rien ne les arrête en amont.
   * Sans ce drapeau, chacune produirait sa ligne de journal : le pic de trafic
   * refusé se transformerait en inondation de logs, précisément sur le chemin
   * censé protéger. Remis à faux dès que la fenêtre glisse sous le plafond,
   * pour que l'épisode suivant soit à nouveau signalé.
   */
  warnedGlobalCap: boolean;
};

/**
 * État porté par `globalThis` et non par une variable de module : deux copies
 * du bundle (bundles serveur distincts, rechargement à chaud en dev) donneraient
 * deux tables, donc une limite silencieusement doublée. Le symbole global est
 * la seule façon de garantir une table unique par process.
 */
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

/**
 * Ne garde que les horodatages encore dans la fenêtre.
 *
 * Le filtre `timestamp <= now` n'est pas de la précaution gratuite : un
 * horodatage dans le futur (dérive d'horloge) ne sortirait jamais d'une fenêtre
 * calculée uniquement sur `now - timestamp`, et figerait l'entrée à vie — un
 * visiteur banni pour toujours, sans la moindre erreur.
 */
function withinWindow(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((timestamp) => timestamp <= now && now - timestamp < windowMs);
}

/**
 * Purge paresseuse, à l'accès — et surtout PAS par `setInterval` : une instance
 * serverless gelée entre deux invocations n'exécute pas ses timers à l'heure,
 * une purge par timer est une purge qui n'arrive jamais, silencieusement.
 *
 * Balayage complet à chaque appel : la table ne contient que des clés ayant
 * réellement envoyé dans les 15 dernières minutes, soit quelques entrées sur ce
 * site.
 *
 * Aucun plafond de cardinalité, et cette absence tient à UN fait de plateforme,
 * sourcé pour qu'il puisse être réévalué : Vercel écrase `x-forwarded-for` et ne
 * relaie pas les IP externes — « This restriction is in place to prevent IP
 * spoofing » (doc Vercel, *Request headers*). La clé n'étant pas falsifiable,
 * personne ne peut faire grossir cette table à volonté. Le jour où ce dépôt
 * quitterait Vercel, ou passerait derrière un proxy tiers, il faudrait ajouter
 * un plafond de cardinalité AVANT le déploiement : sans lui, une rotation de
 * clés forgées donne une croissance mémoire non bornée plus un balayage complet
 * par requête.
 */
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

  // Un seul `:` et une IPv4 devant : c'est un port, pas une IPv6. Sans ce cas,
  // le port entrerait dans la clé et suffirait à la faire tourner.
  const firstColon = value.indexOf(":");
  if (firstColon !== -1 && value.indexOf(":", firstColon + 1) === -1) {
    const host = value.slice(0, firstColon);
    if (isIP(host) === 4) return host;
  }

  return value;
}

/**
 * Développe la compression `::` en 8 groupes, normalise, et ne garde que les 4
 * premiers — le /64.
 *
 * Le découpage naïf `split(":").slice(0, 4)` ne suffit pas : sur `2a00:1450::5`
 * — un préfixe unicast global parfaitement ordinaire — il rend l'adresse
 * entière au lieu du /64, et l'agrégation ne se fait pas. Même problème pour la
 * casse et les zéros de tête : `2001:0DB8:0001:0002::1` et `2001:db8:1:2::1`
 * désignent le même hôte et doivent donner la même clé.
 */
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

/**
 * Réduit l'adresse à ce qui identifie durablement l'émetteur.
 *
 * Une IPv6 est ramenée à son /64 : un /64 entier est fourni d'office par
 * n'importe quel hébergeur, donc limiter sur l'adresse complète reviendrait à
 * ne pas limiter du tout.
 *
 * Les IPv4 sortent inchangées — avec la contrepartie assumée du CGNAT : les
 * opérateurs mobiles partagent une même IPv4 publique entre de nombreux
 * abonnés, qui partagent donc les 3 envois / 15 min. Sur un site qui reçoit
 * quelques messages par mois, la collision est improbable ; si le trafic
 * changeait d'ordre de grandeur, c'est ce compromis qu'il faudrait rouvrir en
 * premier.
 */
function toKeyableAddress(rawIp: string): string {
  const candidate = stripBracketsAndPort(rawIp.trim());
  const version = isIP(candidate);

  if (version === 4) return candidate;

  // Ni IPv4 ni IPv6 valide : on ne devine pas, la valeur brute sert de clé.
  // Plus strict que de l'ignorer, et le cas ne se produit pas derrière Vercel.
  if (version !== 6) return candidate;

  // IPv6 portant une IPv4 (`::ffff:1.2.3.4`) : c'est l'IPv4 qui identifie
  // l'hôte, et elle vit hors du /64 — appliquer le préfixe effondrerait toutes
  // ces adresses dans une clé unique.
  const embedded = candidate.slice(candidate.lastIndexOf(":") + 1);
  if (isIP(embedded) === 4) return embedded;

  return toIpv6Prefix(candidate);
}

/**
 * Clé de limitation, dérivée de l'IP cliente puis hachée. L'IP brute ne sort
 * jamais d'ici : le reste du module ne manipule que des empreintes, et aucune
 * n'est jamais journalisée ni persistée.
 *
 * On prend la DERNIÈRE entrée de `x-forwarded-for`. Sur Vercel l'en-tête n'en
 * porte qu'une seule — la plateforme l'écrase et ne relaie pas les IP externes,
 * explicitement « to prevent IP spoofing » (doc Vercel, *Request headers*) —
 * donc les deux extrémités sont équivalentes aujourd'hui et ce choix est sans
 * conséquence tant que rien ne s'intercale.
 *
 * Ne pas en tirer une règle générale si un proxy s'ajoutait un jour : dans
 * `X-Forwarded-For`, chaque proxy AJOUTE l'adresse du pair dont il a reçu la
 * requête. La règle correcte est alors « N sauts de confiance depuis la
 * droite », et `.at(-1)` ne coïncide avec elle que pour N = 1. Avec deux
 * proxies elle renverrait l'adresse de sortie du premier, commune à tous les
 * visiteurs : le plafond deviendrait 3 envois / 15 min pour le site entier,
 * sans aucune alerte puisque la clé existerait et serait simplement fausse.
 * Prendre la première entrée serait pire encore — elle est intégralement
 * choisie par le client, donc contournable par simple rotation.
 *
 * Aucune IP dérivable -> seau partagé, jamais « pas d'IP donc pas de limite » :
 * l'échec est fermé. Et il s'annonce, une fois par process : sans ce signal, la
 * disparition de l'en-tête ferait basculer tous les visiteurs dans un compteur
 * commun sans que rien ne le dise, et le 4e visiteur de la fenêtre serait
 * bloqué sans erreur, sans log et sans plainte.
 */
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

/**
 * Réserve un droit d'envoi pour la requête courante.
 *
 * Ordre volontaire : contrôler la clé, refuser SANS RIEN ÉCRIRE, puis contrôler
 * le global, refuser SANS RIEN ÉCRIRE, et n'écrire qu'ensuite. Ce n'est pas un
 * détail de style — un refus qui incrémenterait quand même donnerait à un seul
 * flooder de quoi épuiser le budget commun, c'est-à-dire un déni de service à
 * coût nul contre tous les autres visiteurs. C'est aussi ce qui borne la table :
 * seule une soumission acceptée y crée une entrée.
 *
 * À n'appeler qu'APRÈS le honeypot et les validations : un envoi qui n'aurait de
 * toute façon jamais atteint Resend ne coûte ni boîte mail ni quota, et le
 * compter rapprocherait le limiteur du faux positif.
 */
export async function claimContactSendSlot(): Promise<SendSlotOutcome> {
  const state = getState();
  // Seul `await` de la fonction, et il est en tête : tout ce qui suit est
  // synchrone, donc atomique vis-à-vis des autres requêtes de cette instance.
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

/**
 * Consomme un jeton du plafond global. À appeler juste AVANT l'appel Resend,
 * jamais après : après, l'`await` ouvrirait une fenêtre où N requêtes
 * concurrentes partiraient toutes sur un compteur non encore incrémenté.
 *
 * Volontairement dissocié de claimContactSendSlot : ce compteur protège le
 * quota Resend, il ne doit donc bouger que si un appel Resend a réellement lieu.
 * Conséquence directe et voulue — un serveur sans `RESEND_API_KEY`, c'est-à-dire
 * le serveur QA, n'entame jamais ce compteur, et l'état ne fuit pas d'un run de
 * tests à l'autre.
 */
export function recordResendCall(): void {
  const state = getState();
  const now = Date.now();
  state.globalHits = [...withinWindow(state.globalHits, now, GLOBAL.windowMs), now];
}

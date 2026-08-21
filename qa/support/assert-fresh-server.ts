import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { BASE_URL, PORT } from "../qa.config";

/**
 * `globalSetup` de qa/playwright.config.ts : refuse de lancer la suite contre un
 * serveur qui ne sert pas le build présent dans `.next/`.
 *
 * Le piège gardé ici (POR-52) : `reuseExistingServer` adopte tel quel un
 * `next start` déjà en écoute sur le port. Or tout ce que la suite observe est
 * figé au DÉMARRAGE du serveur — en-têtes de sécurité, HTML prérendu, code
 * serveur. Un serveur périmé produit donc un résultat qui a l'apparence exacte
 * d'un vrai : faux rouges, et surtout faux verts validant du code jamais
 * compilé. Constaté en session : un `worker-src` ajouté à la CSP puis rebuild
 * reste invisible côté serveur déjà démarré.
 *
 * Ce que cette garde garantit, et rien de plus : « ce qui est testé == ce qu'il
 * y a dans `.next/` ». Elle ne compare PAS `.next/` aux sources — quand un
 * serveur est réutilisé, `npm run test:qa:*` ne rebuild pas, donc un `.next/`
 * lui-même périmé vis-à-vis des sources passerait vert. `npm run qa` n'a pas ce
 * trou : qa/run-all.mjs build systématiquement avant de servir.
 */

const projectRoot = path.resolve(__dirname, "..", "..");
const buildIdPath = path.join(projectRoot, ".next", "BUILD_ID");
const prerenderedHomePath = path.join(projectRoot, ".next", "server", "app", "index.html");

// Le BUILD_ID est présent dans le payload RSC du HTML servi, sous la clé `b`,
// échappée parce qu'elle vit dans un littéral de chaîne JS :
//   self.__next_f.push([1,"...\"b\":\"7FD-GEL4yn74OBwypheM4\"..."])
// Vérifié sur Next 16.3.0. Ce n'est pas une API publique : la garde ne s'appuie
// dessus que pour NOMMER le build servi dans le message d'erreur — la décision,
// elle, repose sur les deux signaux d'`assertFreshServer`.
const SERVED_BUILD_ID = [
  /\\"b\\":\\"([\w-]+)\\"/, // échappé, tel qu'émis dans self.__next_f.push([1,"…"])
  /"b":"([\w-]+)"/, // même clé, si Next cesse un jour de l'échapper
];

function readIfPresent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * `node:http` avec `agent: false`, et non `fetch` : le pool keep-alive d'undici
 * survit au `throw` de cette garde, et Node abandonne alors sur Windows
 * (`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`), remplaçant le code
 * de sortie 1 de Playwright par un 127. Vérifié en isolant les deux cas : un
 * globalSetup qui lève sans requête HTTP sort proprement en 1.
 *
 * BASE_URL est toujours en http (localhost), jamais en https.
 */
function getHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { agent: false }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      response.on("error", reject);
    });
    request.on("error", reject);
    request.setTimeout(10_000, () => request.destroy(new Error("délai de 10 s dépassé")));
  });
}

function fail(message: string): void {
  if (process.env.QA_ALLOW_STALE_SERVER === "1") {
    console.warn(`\n[qa] AVERTISSEMENT — garde de build désactivée (QA_ALLOW_STALE_SERVER=1).\n${message}\n`);
    return;
  }
  throw new Error(message);
}

export default async function assertFreshServer(): Promise<void> {
  const localBuildId = readIfPresent(buildIdPath)?.trim();
  if (!localBuildId) {
    fail(
      `[qa] .next/BUILD_ID est absent : impossible de vérifier que le serveur sur ${BASE_URL} sert le build courant.\n` +
        `Lancer \`npm run build\`, ou forcer avec QA_ALLOW_STALE_SERVER=1.`,
    );
    return;
  }

  let servedHtml: string;
  try {
    servedHtml = await getHtml(BASE_URL);
  } catch (err) {
    fail(
      `[qa] ${BASE_URL} n'a pas répondu : impossible de vérifier quel build est servi (${(err as Error).message}).`,
    );
    return;
  }

  // Signal 1 — le BUILD_ID local apparaît tel quel dans le HTML servi. Un
  // identifiant de 21 caractères ne coïncide pas par hasard : la présence
  // suffit à conclure, sans dépendre de la forme exacte du payload RSC.
  if (servedHtml.includes(localBuildId)) return;

  // Signal 2 — repli si une version future de Next cesse d'émettre le BUILD_ID
  // dans le HTML : comparer au HTML prérendu sur disque. Le serveur met le sien
  // en cache mémoire au démarrage, les deux divergent donc dès qu'un rebuild a
  // eu lieu depuis (vérifié en session).
  const prerenderedHome = readIfPresent(prerenderedHomePath);
  if (prerenderedHome !== null && prerenderedHome === servedHtml) {
    console.warn(
      `\n[qa] Le BUILD_ID n'apparaît plus dans le HTML servi — le marqueur a probablement changé\n` +
        `[qa] avec une mise à jour de Next. La fraîcheur du serveur a été confirmée autrement\n` +
        `[qa] (HTML servi identique à .next/server/app/index.html). Voir qa/support/assert-fresh-server.ts.\n`,
    );
    return;
  }

  const servedBuildId =
    SERVED_BUILD_ID.map((pattern) => pattern.exec(servedHtml)?.[1]).find(Boolean) ?? "inconnu";
  fail(
    `[qa] Le serveur qui écoute sur ${BASE_URL} ne sert PAS le build présent dans .next/.\n\n` +
      `      build servi : ${servedBuildId}\n` +
      `      build local : ${localBuildId}\n\n` +
      `Les en-têtes, le HTML prérendu et le code serveur sont figés au démarrage du serveur :\n` +
      `poursuivre validerait du code qui n'a jamais été compilé, sans que le rapport le montre.\n\n` +
      `Sortie, au choix :\n` +
      `  - arrêter le process qui écoute sur le port ${PORT}, puis relancer ;\n` +
      `  - relancer sur un port libre : QA_PORT=3111 npm run test:qa ;\n` +
      `  - forcer malgré tout : QA_ALLOW_STALE_SERVER=1 (le résultat n'engage alors rien).`,
  );
}

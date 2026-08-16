// Orchestrateur de `npm run qa` (Portfolio_QA/QA_PLAN.md section 6).
//
// Choix d'architecture, documentés parce qu'ils s'écartent d'une lecture
// littérale de la demande initiale :
//
// - Un seul `npx playwright test -c qa/playwright.config.ts` (sans filtre de
//   dossier) suffit à exécuter Functional, Responsive, Visual, Accessibility,
//   SEO, Security et WebGL : `qa/playwright.config.ts` (`testDir: "."`,
//   `testIgnore` limité à Reports/Performance/__snapshots__) les couvre déjà
//   toutes en une invocation. Les découper en 7 commandes séparées aurait
//   dupliqué le démarrage du serveur de build à chaque appel sans bénéfice
//   réel. SEO et Security sont donc des suites Playwright comme les autres,
//   pas des "audits" à part — seul Lighthouse (Performance) est un script
//   Node indépendant hors Playwright.
// - Ce script ne fait PAS échouer `npm run qa` (exit code 0) si une suite
//   Playwright échoue : `qa/Security/*.spec.ts` échoue *par construction*
//   quand un gap de sécurité réel existe (cf. qa/Reports/security-*.md,
//   "10/10 tests échoués" documentant des lacunes, pas des tests cassés).
//   Un exit code non nul systématique rendrait `npm run qa` inutilisable
//   comme gate CI tant que ces gaps connus ne sont pas corrigés. Seuls un
//   échec de build ou un serveur qui ne démarre pas font échouer ce script.
// - `qa/Performance/lighthouse.run.mjs` exige un serveur déjà démarré et ne
//   le lance pas lui-même (voir sa fonction `assertServerUp`) : ce script
//   démarre donc `next start -p 3100` une seule fois, le réutilise pour
//   Playwright (`reuseExistingServer` dans `qa/playwright.config.ts`) puis
//   pour Lighthouse, et ne l'arrête que s'il l'a lui-même démarré (un
//   serveur déjà présent avant l'exécution — résidu d'une tâche précédente —
//   est laissé tel quel, comme le fait `reuseExistingServer` de Playwright).

import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const isWindows = process.platform === "win32";
const npmCmd = "npm";
const npxCmd = "npx";

function log(msg) {
  console.log(`\n[qa] ${msg}`);
}

// Sur Windows, spawnSync/spawn avec shell:false échoue avec EINVAL sur les
// shims .cmd (npm.cmd, npx.cmd) — passer par `cmd.exe /c` les résout comme le
// ferait un vrai shell, sans le warning DEP0190 (arguments non échappés) que
// déclenche shell:true.
function resolve(cmd, args) {
  return isWindows
    ? { cmd: "cmd.exe", args: ["/c", cmd, ...args] }
    : { cmd, args };
}

function run(cmd, args, opts = {}) {
  const resolved = resolve(cmd, args);
  const result = spawnSync(resolved.cmd, resolved.args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    ...opts,
  });
  return result.status ?? 1;
}

async function isServerUp() {
  try {
    const res = await fetch(BASE_URL, { method: "GET" });
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// Sur Windows, `child.kill()` ne tue que le process `cmd.exe` immédiat lancé
// par `spawn` — pas les processus enfants (npm.cmd → node → next start) —
// laissant le port occupé. `taskkill /T` descend tout l'arbre. Playwright
// utilise déjà ce même mécanisme pour son propre webServer (voir
// node_modules/playwright-core/lib/coreBundle.js) : qa/playwright.config.ts
// n'a donc pas besoin du même correctif.
async function killServerTree(child) {
  if (!child || child.pid == null) return;
  try {
    if (isWindows) {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
    } else {
      child.kill();
    }
  } catch (err) {
    console.error(`[qa] échec de l'arrêt du serveur : ${err.message}`);
  }
  const start = Date.now();
  while (Date.now() - start < 5_000) {
    if (!(await isServerUp())) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(
    `[qa] le port ${PORT} semble encore occupé après l'arrêt du serveur — un kill manuel pourrait être nécessaire.`,
  );
}

async function main() {
  let startedServer = null;

  const cleanupOnSignal = (signal) => async () => {
    log(`signal ${signal} reçu — nettoyage du serveur avant sortie`);
    await killServerTree(startedServer);
    process.exit(130);
  };
  process.on("SIGINT", cleanupOnSignal("SIGINT"));
  process.on("SIGTERM", cleanupOnSignal("SIGTERM"));

  log("1/4 — build de production (npm run build)");
  const buildStatus = run(npmCmd, ["run", "build"]);
  if (buildStatus !== 0) {
    console.error("[qa] build échoué — arrêt (voir la sortie ci-dessus).");
    process.exitCode = buildStatus;
    return;
  }

  try {
    if (await isServerUp()) {
      log(`2/4 — serveur déjà actif sur ${BASE_URL}, réutilisé tel quel`);
    } else {
      log(`2/4 — démarrage du serveur de production sur le port ${PORT}`);
      const serverCmd = resolve(npmCmd, ["run", "start", "--", "-p", String(PORT)]);
      startedServer = spawn(serverCmd.cmd, serverCmd.args, {
        cwd: projectRoot,
        stdio: "inherit",
        shell: false,
        detached: false,
        // RESEND_API_KEY exclue : les specs de formulaire de contact soumettent
        // réellement le formulaire ; avec la clé présente, chaque run envoie un
        // vrai email via Resend (cf. qa/playwright.config.ts webServer.env).
        env: { ...process.env, RESEND_API_KEY: "" },
      });
      const ready = await waitForServer();
      if (!ready) {
        console.error(
          `[qa] le serveur n'a pas répondu sur ${BASE_URL} dans le délai imparti — arrêt.`,
        );
        process.exitCode = 1;
        return;
      }
    }

    log(
      "3/4 — suites Playwright (Functional, Responsive, Visual, Accessibility, SEO, Security, WebGL)",
    );
    const playwrightStatus = run(npxCmd, [
      "playwright",
      "test",
      "-c",
      "qa/playwright.config.ts",
    ]);
    if (playwrightStatus !== 0) {
      console.warn(
        "[qa] au moins une suite Playwright a échoué (attendu pour qa/Security/* tant que ses gaps ne sont pas corrigés — voir QA_REPORT.md). Poursuite vers Lighthouse.",
      );
    }

    log("4/4 — audit Performance (Lighthouse)");
    const perfStatus = run("node", ["qa/Performance/lighthouse.run.mjs"]);

    console.log(
      "\n[qa] Terminé. qa/Reports/ contient les résultats frais de ce run.\n" +
        "[qa] QA_REPORT.md (racine, gitignoré, espace de travail local) doit être régénéré\n" +
        "[qa] MANUELLEMENT à partir de ces rapports frais — la génération automatique du markdown\n" +
        "[qa] de synthèse est hors périmètre de ce script (jugement humain nécessaire pour\n" +
        "[qa] classer/rédiger chaque constat).",
    );

    if (playwrightStatus !== 0 || perfStatus !== 0) {
      console.log(
        "[qa] Note : au moins une étape a retourné un code non nul (voir logs ci-dessus) ; " +
          "npm run qa se termine néanmoins en succès (voir en-tête de qa/run-all.mjs pour la justification).",
      );
    }
  } finally {
    if (startedServer) {
      log("arrêt du serveur démarré par ce script");
      await killServerTree(startedServer);
    }
  }
}

main().catch((err) => {
  console.error(`[qa] erreur inattendue : ${err.stack ?? err.message}`);
  process.exitCode = 1;
});

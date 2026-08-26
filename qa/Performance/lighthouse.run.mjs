// Script Node autonome, hors Playwright (QA_PLAN.md section 2).
// Exécute Lighthouse contre le build de production (voir qa/qa.config.ts,
// port 3100) sur les pages réelles du site et compare aux seuils de
// qa/Performance/budgets.json. Écrit un rapport JSON brut par run + un
// rapport HTML par page (dernier run) sous qa/Reports/performance/.

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

// Repris de qa/qa.config.ts (PORT, BASE_URL, ROUTES.home,
// ROUTES.projectWithDetail) sans l'importer : ce script est exécuté par
// `node` seul, hors Playwright/tsx, et qa.config.ts est un module TypeScript
// — l'importer directement forcerait une dépendance au type-stripping natif
// de Node (fragile selon la version) pour un script qui doit rester un gate
// fiable. Garder ces deux fichiers synchronisés manuellement si ROUTES ou
// PORT changent.
const PORT = Number(process.env.QA_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

// Garde de fraîcheur, portée depuis qa/support/assert-fresh-server.ts :
// ce script est un `node` autonome hors Playwright/globalSetup, donc
// le globalSetup de qa/playwright.config.ts ne le couvre pas — voir
// qa/qa.config.ts:16-17. Dupliquée en JS plutôt qu'importée pour
// la même raison que PORT/BASE_URL ci-dessus : importer un module TypeScript
// depuis un script `node` pur dépendrait du type-stripping natif. Garder cette
// logique synchronisée manuellement avec assert-fresh-server.ts si l'un des
// deux change.
const buildIdPath = path.join(projectRoot, ".next", "BUILD_ID");
const prerenderedHomePath = path.join(projectRoot, ".next", "server", "app", "index.html");
const SERVED_BUILD_ID = [
  /\\"b\\":\\"([\w-]+)\\"/, // échappé, tel qu'émis dans self.__next_f.push([1,"…"])
  /"b":"([\w-]+)"/, // même clé, si Next cesse un jour de l'échapper
];

// `node:http` avec `agent: false`, comme dans assert-fresh-server.ts : le pool
// keep-alive d'undici (`fetch`) survit au `process.exit()` de la garde de
// fraîcheur, et Node abandonne alors sur Windows
// (`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`), remplaçant le
// code de sortie 1 par un 127. Ici le script est un `node` autonome qui appelle
// `process.exit()` directement (pas un `throw` dans un globalSetup Playwright
// comme dans assert-fresh-server.ts) — vérifié dans ce contexte précis, sur
// cette machine : `await fetch(...).catch(() => {})` suivi de `process.exit(1)`
// sort en 127, la même séquence avec `http.get(..., { agent: false })` sort
// proprement en 1.
//
// Différence avec assert-fresh-server.ts : ce `getHtml` rejette tout statut
// ≠ 200/304 (voir plus bas), alors que le `getHtml` d'assert-fresh-server.ts
// ne contrôle aucun statut et accepte le corps quel qu'il soit — aucun des
// deux ne suit les redirections, ni ne passe par `fetch`. Sans impact
// aujourd'hui — les deux ne requêtent que `BASE_URL`, qui répond toujours
// 200 en fonctionnement normal — mais à corriger si l'une des deux gardes se
// met un jour à cibler une route pouvant répondre autre chose que 200/304.
function getHtml(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { agent: false }, (response) => {
      if (response.statusCode !== 200 && response.statusCode !== 304) {
        response.resume(); // vider le flux pour libérer le socket avant de rejeter
        reject(new Error(`GET ${url} → HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      response.on("error", reject);
    });
    request.on("error", reject);
    request.setTimeout(10_000, () => request.destroy(new Error("délai de 10 s dépassé")));
  });
}

async function readIfPresent(filePath) {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

function failFreshness(message) {
  if (process.env.QA_ALLOW_STALE_SERVER === "1") {
    console.warn(`\n[qa] AVERTISSEMENT — garde de build désactivée (QA_ALLOW_STALE_SERVER=1).\n${message}\n`);
    return;
  }
  console.error(message);
  process.exit(1);
}

async function assertFreshServer(servedHtml) {
  const localBuildId = (await readIfPresent(buildIdPath))?.trim();
  if (!localBuildId) {
    failFreshness(
      `[qa] .next/BUILD_ID est absent : impossible de vérifier que le serveur sur ${BASE_URL} sert le build courant.\n` +
        `Lancer \`npm run build\`, ou forcer avec QA_ALLOW_STALE_SERVER=1.`,
    );
    return;
  }

  // Signal 1 — le BUILD_ID local apparaît tel quel dans le HTML servi.
  if (servedHtml.includes(localBuildId)) return;

  // Signal 2 — repli si le BUILD_ID n'apparaît plus dans le HTML : comparer au
  // HTML prérendu sur disque.
  const prerenderedHome = await readIfPresent(prerenderedHomePath);
  if (prerenderedHome !== null && prerenderedHome === servedHtml) {
    console.warn(
      `\n[qa] Le BUILD_ID n'apparaît plus dans le HTML servi — la fraîcheur du serveur a été\n` +
        `[qa] confirmée autrement (HTML servi identique à .next/server/app/index.html).\n`,
    );
    return;
  }

  const servedBuildId =
    SERVED_BUILD_ID.map((pattern) => pattern.exec(servedHtml)?.[1]).find(Boolean) ?? "inconnu";
  failFreshness(
    `[qa] Le serveur qui écoute sur ${BASE_URL} ne sert PAS le build présent dans .next/.\n\n` +
      `      build servi : ${servedBuildId}\n` +
      `      build local : ${localBuildId}\n\n` +
      `Les métriques Lighthouse mesureraient alors du code qui n'a jamais été compilé.\n\n` +
      `Sortie, au choix :\n` +
      `  - arrêter le process qui écoute sur le port ${PORT}, puis relancer ;\n` +
      `  - relancer sur un port libre : QA_PORT=3111 npm run test:qa:perf ;\n` +
      `  - forcer malgré tout : QA_ALLOW_STALE_SERVER=1 (le résultat n'engage alors rien).`,
  );
}

// Mêmes pages que le reste de la suite qa/ : accueil, fiche projet
// noiseless-mind (seul slug avec detail statique), et la section #contact
// de la home (pas de route dédiée — même document, fragment d'ancre).
const PAGES = [
  { id: "home", url: `${BASE_URL}/` },
  { id: "project-noiseless-mind", url: `${BASE_URL}/projets/noiseless-mind` },
  { id: "home-contact", url: `${BASE_URL}/#contact` },
];

const RUNS = 2;

const budgetsPath = path.join(__dirname, "budgets.json");
const reportsDir = path.join(projectRoot, "qa", "Reports", "performance");

async function assertChromiumInstalled() {
  try {
    await fs.access(CHROME_PATH);
  } catch {
    console.error(
      `Chromium introuvable à ${CHROME_PATH}. ` +
        `Lancer "npm run test:qa:install" (playwright install --with-deps chromium) avant d'exécuter ce script.`,
    );
    process.exit(1);
  }
}

async function assertServerUp() {
  try {
    return await getHtml(BASE_URL);
  } catch (err) {
    console.error(
      `Serveur de production introuvable sur ${BASE_URL}. ` +
        `Démarrer avec "next build && next start -p ${PORT}" avant d'exécuter ce script.\n` +
        `Détail : ${err.message}`,
    );
    process.exit(1);
  }
}

function bytesToKb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

// Chromium headless nécessite SwiftShader/ANGLE pour exposer webgl2, comme
// dans qa/playwright.config.ts, sinon Dust s'autodésactive silencieusement
// et les métriques ne reflètent pas le coût réel du canvas.
// Réutilise le Chromium déjà téléchargé par Playwright (qa/playwright.config.ts)
// plutôt qu'un second téléchargement de navigateur (QA_PLAN.md section 3).
const CHROME_PATH = chromium.executablePath();

async function runOnce(pageInfo, budgets) {
  const chrome = await launch({
    chromePath: CHROME_PATH,
    chromeFlags: [
      "--headless=new",
      "--use-gl=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--no-sandbox",
    ],
  });

  try {
    const result = await lighthouse(
      pageInfo.url,
      {
        port: chrome.port,
        onlyCategories: ["performance"],
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttling: {
          rttMs: 40,
          throughputKbps: 10 * 1024,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
      },
      undefined,
    );

    const lhr = result.lhr;
    const audits = lhr.audits;

    const perfScore = lhr.categories.performance.score;
    const lcp = audits["largest-contentful-paint"]?.numericValue ?? null;
    const cls = audits["cumulative-layout-shift"]?.numericValue ?? null;
    const inp = audits["interaction-to-next-paint"]?.numericValue ?? null;
    const ttfb = audits["server-response-time"]?.numericValue ?? null;
    const tbt = audits["total-blocking-time"]?.numericValue ?? null;
    const fcp = audits["first-contentful-paint"]?.numericValue ?? null;
    const speedIndex = audits["speed-index"]?.numericValue ?? null;

    const resourceSummary = audits["resource-summary"]?.details?.items ?? [];
    const byType = Object.fromEntries(
      resourceSummary.map((item) => [
        item.resourceType,
        { requestCount: item.requestCount, transferSize: item.transferSize },
      ]),
    );

    // Lighthouse 13 a remplacé plusieurs audits legacy par des audits
    // "*-insight" (vérifié sur la version installée, 13.4.1 — voir
    // node_modules/lighthouse/package.json).
    const renderBlocking = audits["render-blocking-insight"]?.details?.items ?? [];
    const unusedJs = audits["unused-javascript"]?.details?.items ?? [];
    const unusedCss = audits["unused-css-rules"]?.details?.items ?? [];
    const longTasks = audits["long-tasks"]?.details?.items ?? [];
    const thirdParty = audits["third-parties-insight"]?.details?.items ?? [];
    const bootupTime = audits["bootup-time"]?.details?.items ?? [];
    const imageDelivery = audits["image-delivery-insight"]?.details?.items ?? [];
    const domSize = audits["dom-size-insight"]?.numericValue ?? null;
    const mainThreadWork = audits["mainthread-work-breakdown"]?.details?.items ?? [];
    const networkRequests = audits["network-requests"]?.details?.items ?? [];
    const jsCssRequests = networkRequests
      .filter((r) => r.resourceType === "Script" || r.resourceType === "Stylesheet")
      .map((r) => ({
        url: r.url,
        resourceType: r.resourceType,
        transferSize: r.transferSize,
        resourceSize: r.resourceSize,
      }));

    const totalTransferKb = bytesToKb(
      resourceSummary.find((i) => i.resourceType === "total")?.transferSize ?? 0,
    );
    const jsKb = bytesToKb(byType.script?.transferSize ?? 0);
    const cssKb = bytesToKb(byType.stylesheet?.transferSize ?? 0);
    const imageKb = bytesToKb(byType.image?.transferSize ?? 0);
    const fontKb = bytesToKb(byType.font?.transferSize ?? 0);

    return {
      pageId: pageInfo.id,
      url: pageInfo.url,
      finalUrl: lhr.finalDisplayedUrl ?? lhr.finalUrl,
      fetchTime: lhr.fetchTime,
      lighthouseVersion: lhr.lighthouseVersion,
      userAgent: lhr.userAgent,
      perfScore,
      metrics: { lcp, cls, inp, ttfb, tbt, fcp, speedIndex, domSize },
      weight: {
        totalKb: totalTransferKb,
        jsKb,
        cssKb,
        imageKb,
        fontKb,
        byType,
      },
      renderBlocking: renderBlocking.map((r) => ({
        url: r.url,
        totalBytes: r.totalBytes,
        wastedMs: r.wastedMs,
      })),
      unusedJs: unusedJs.map((r) => ({
        url: r.url,
        totalBytes: r.totalBytes,
        wastedBytes: r.wastedBytes,
      })),
      unusedCss: unusedCss.map((r) => ({
        url: r.url,
        totalBytes: r.totalBytes,
        wastedBytes: r.wastedBytes,
      })),
      longTasks: longTasks.map((t) => ({ url: t.url, duration: t.duration })),
      thirdParty: thirdParty.map((t) => ({
        entity: t.entity?.text ?? t.entity,
        transferSize: t.transferSize,
        mainThreadTime: t.mainThreadTime,
      })),
      bootupTime: bootupTime.map((b) => ({
        url: b.url,
        total: b.total,
        scripting: b.scripting,
      })),
      imageDelivery: imageDelivery.map((i) => ({
        url: i.url,
        totalBytes: i.totalBytes,
        wastedBytes: i.wastedBytes,
      })),
      jsCssRequests,
      mainThreadWork: mainThreadWork.map((m) => ({
        groupLabel: m.groupLabel,
        duration: m.duration,
      })),
      budgetCheck: {
        lcpOk: lcp !== null ? lcp <= budgets.coreWebVitals.LCP : null,
        clsOk: cls !== null ? cls <= budgets.coreWebVitals.CLS : null,
        inpOk: inp !== null ? inp <= budgets.coreWebVitals.INP : null,
        weightBudgetKb:
          pageInfo.id === "home" || pageInfo.id === "home-contact"
            ? budgets.pageWeightKb.home
            : budgets.pageWeightKb.projectPage,
        weightOk:
          totalTransferKb <=
          (pageInfo.id === "home" || pageInfo.id === "home-contact"
            ? budgets.pageWeightKb.home
            : budgets.pageWeightKb.projectPage),
      },
      rawReportHtml: result.report,
    };
  } finally {
    // chrome-launcher tente de supprimer son dossier temp de profil au kill ;
    // sur Windows, Chrome relâche parfois le verrou fichier avec un léger
    // retard (EPERM transitoire, sans rapport avec la mesure elle-même).
    try {
      await chrome.kill();
    } catch (err) {
      console.warn(`Nettoyage Chrome (non bloquant) : ${err.message}`);
    }
  }
}

async function main() {
  const servedHtml = await assertServerUp();
  await assertFreshServer(servedHtml);
  await assertChromiumInstalled();

  const budgets = JSON.parse(await fs.readFile(budgetsPath, "utf-8"));
  await fs.mkdir(reportsDir, { recursive: true });

  const allRuns = [];

  for (let runIndex = 1; runIndex <= RUNS; runIndex++) {
    for (const pageInfo of PAGES) {
      console.log(`[run ${runIndex}/${RUNS}] ${pageInfo.id} → ${pageInfo.url}`);
      const result = await runOnce(pageInfo, budgets);
      allRuns.push({ runIndex, ...result });

      const htmlPath = path.join(reportsDir, `${pageInfo.id}-run${runIndex}.html`);
      await fs.writeFile(htmlPath, result.rawReportHtml, "utf-8");

      const { rawReportHtml, ...jsonSafe } = result;
      const jsonPath = path.join(reportsDir, `${pageInfo.id}-run${runIndex}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(jsonSafe, null, 2), "utf-8");

      console.log(
        `  score=${result.perfScore} LCP=${result.metrics.lcp}ms CLS=${result.metrics.cls} ` +
          `INP=${result.metrics.inp} totalKb=${result.weight.totalKb}`,
      );
    }
  }

  const summaryPath = path.join(reportsDir, "summary.json");
  await fs.writeFile(
    summaryPath,
    JSON.stringify(
      allRuns.map(({ rawReportHtml, ...rest }) => rest),
      null,
      2,
    ),
    "utf-8",
  );

  console.log(`\nRapports écrits dans ${path.relative(projectRoot, reportsDir)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

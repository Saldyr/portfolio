// Script Node autonome, hors Playwright (QA_PLAN.md section 2).
// Exécute Lighthouse contre le build de production (voir qa/qa.config.ts,
// port 3100) sur les pages réelles du site et compare aux seuils de
// qa/Performance/budgets.json. Écrit un rapport JSON brut par run + un
// rapport HTML par page (dernier run) sous qa/Reports/performance/.

import fs from "node:fs/promises";
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
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

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
    const res = await fetch(BASE_URL, { method: "GET" });
    if (!res.ok && res.status !== 304) {
      throw new Error(`GET ${BASE_URL} → HTTP ${res.status}`);
    }
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
  await assertServerUp();
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

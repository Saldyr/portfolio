import { expect, test } from "playwright/test";
import { ROUTES, WEBGL_MIN_WIDTH } from "../qa.config";
import {
  collectConsole,
  dustGeometry,
  installDustProbe,
  metricsReader,
  readProbe,
  sampleDrawRate,
  writeEvidence,
} from "./dust.helpers";

const NAVIGATIONS = 8;

/**
 * Fait de structure, vérifié dans src/app/layout.tsx : `<Backdrop/>` — donc
 * `<Dust/>` — est monté par le layout racine. Aucune route du site ne le
 * démonte : une navigation client-side conserve le composant, son contexte
 * WebGL2 et sa boucle rAF. Le nettoyage du `useEffect` n'est donc atteint
 * qu'à la destruction du document. Ces tests vérifient les deux régimes.
 *
 * Toutes les mesures de fuite sont prises APRÈS ramasse-miettes forcé
 * (`HeapProfiler.collectGarbage`, cf. metricsReader) : sans lui, les
 * compteurs montent linéairement par simple report de collecte.
 */

const leakView = (m: Record<string, number>) => ({
  jsHeapUsedSizeKB: Math.round(m.JSHeapUsedSize / 1024),
  documents: m.Documents,
  nodes: m.Nodes,
  jsEventListeners: m.JSEventListeners,
});

test("cycle de vie: navigation client-side répétée — un seul contexte, pas d'accumulation", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(180_000);
  await installDustProbe(context);
  const consoleLog = collectConsole(page);
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const readMetrics = await metricsReader(context, page);
  const baseline = leakView(await readMetrics({ gc: true }));
  const samples = [];

  for (let i = 0; i < NAVIGATIONS; i++) {
    // Carte projet : le nom accessible du lien reprend toute la carte, on
    // cible donc par href (src/components/project-card.tsx).
    await page.locator(`#projets a[href="${ROUTES.projectWithDetail}"]`).click();
    await expect(page.getByRole("heading", { level: 1, name: "Noiseless Mind" })).toBeVisible();
    await page.waitForTimeout(250);

    await page.getByRole("link", { name: "Saldyr", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Construire, créer, imaginer en pilotant l'IA.",
      }),
    ).toBeVisible();
    await page.waitForTimeout(250);

    const probe = await readProbe(page);
    samples.push({
      iteration: i + 1,
      contextCalls: probe.contextCalls.length,
      draws: probe.draws,
      isLost: probe.isLost,
      ...leakView(await readMetrics()),
    });
  }

  const probe = await readProbe(page);
  const settled = leakView(await readMetrics({ gc: true }));
  const geometry = await dustGeometry(page);
  const rate =
    geometry.cssWidth >= WEBGL_MIN_WIDTH ? await sampleDrawRate(page, 1500) : null;

  writeEvidence(`lifecycle-client-${testInfo.project.name}`, {
    baseline,
    samples,
    settled,
    heapGrowthKB: settled.jsHeapUsedSizeKB - baseline.jsHeapUsedSizeKB,
    rateAfterNavigations: rate,
    contextCalls: probe.contextCalls.length,
  });

  // Le canvas n'est jamais remonté : un seul getContext pour tout le parcours.
  expect(probe.contextCalls, "contexte WebGL2 recréé pendant la navigation").toHaveLength(1);
  expect(probe.isLost, "contexte perdu pendant la navigation").toBe(false);

  // Après GC, rien ne subsiste des documents traversés.
  expect(
    settled.documents,
    `documents : ${baseline.documents} → ${settled.documents}`,
  ).toBeLessThanOrEqual(baseline.documents + 1);
  expect(
    settled.nodes,
    `nœuds DOM : ${baseline.nodes} → ${settled.nodes}`,
  ).toBeLessThanOrEqual(baseline.nodes + 60);
  expect(
    settled.jsEventListeners,
    `listeners : ${baseline.jsEventListeners} → ${settled.jsEventListeners}`,
  ).toBeLessThanOrEqual(baseline.jsEventListeners + 60);
  expect(
    settled.jsHeapUsedSizeKB - baseline.jsHeapUsedSizeKB,
    `tas JS : ${baseline.jsHeapUsedSizeKB} KB → ${settled.jsHeapUsedSizeKB} KB après ${NAVIGATIONS} aller-retours`,
  ).toBeLessThan(8 * 1024);

  if (rate) expect(rate.frames, "boucle rAF morte après les navigations").toBeGreaterThan(0);
  expect(consoleLog.errors(), JSON.stringify(consoleLog.errors())).toHaveLength(0);
});

test("cycle de vie: rechargements complets répétés — un contexte par document", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(180_000);
  await installDustProbe(context);
  const consoleLog = collectConsole(page);
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");

  const readMetrics = await metricsReader(context, page);
  const baseline = leakView(await readMetrics({ gc: true }));
  const samples = [];

  for (let i = 0; i < NAVIGATIONS; i++) {
    await page.goto(i % 2 === 0 ? ROUTES.projectWithDetail : ROUTES.home);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    const probe = await readProbe(page);
    // Le document est neuf : la sonde repart de zéro, un seul contexte.
    expect(probe.contextCalls, `chargement ${i + 1} : ${probe.contextCalls.length} contextes`).toHaveLength(1);
    expect(probe.isLost, `chargement ${i + 1} : contexte perdu`).toBe(false);
    samples.push({ iteration: i + 1, ...leakView(await readMetrics()) });
  }

  const settled = leakView(await readMetrics({ gc: true }));
  writeEvidence(`lifecycle-reload-${testInfo.project.name}`, {
    baseline,
    samples,
    settled,
    heapGrowthKB: settled.jsHeapUsedSizeKB - baseline.jsHeapUsedSizeKB,
  });

  /* Les documents détachés s'empilent tant que le GC n'est pas passé
     (mesuré : 2 → 18 documents sur 8 rechargements sans GC). Ce qui compte
     est l'état après collecte : le contexte WebGL2 et ses ressources ne
     doivent rien retenir. */
  expect(
    settled.documents,
    `documents après GC : ${baseline.documents} → ${settled.documents} sur ${NAVIGATIONS} rechargements`,
  ).toBeLessThanOrEqual(baseline.documents + 1);
  expect(
    settled.jsEventListeners,
    `listeners après GC : ${baseline.jsEventListeners} → ${settled.jsEventListeners}`,
  ).toBeLessThanOrEqual(baseline.jsEventListeners + 60);
  expect(
    settled.jsHeapUsedSizeKB - baseline.jsHeapUsedSizeKB,
    `tas JS après GC : ${baseline.jsHeapUsedSizeKB} KB → ${settled.jsHeapUsedSizeKB} KB`,
  ).toBeLessThan(8 * 1024);
  expect(consoleLog.errors(), JSON.stringify(consoleLog.errors())).toHaveLength(0);
});

import { expect, test } from "playwright/test";
import { ROUTES, WEBGL_MIN_WIDTH } from "../qa.config";
import {
  collectConsole,
  drainGlErrors,
  dustGeometry,
  installDustProbe,
  metricsReader,
  readPixels,
  readProbe,
  writeEvidence,
} from "./dust.helpers";

/** Durée de la fenêtre longue et pas d'échantillonnage. */
const SOAK_MS = 180_000;
const SAMPLE_MS = 15_000;
/** Fenêtre du comparatif de coût CPU (animé vs figé). */
const CPU_WINDOW_MS = 20_000;

/**
 * Ces mesures tournent sur le rendu logiciel de Chromium headless
 * (ANGLE/Vulkan/SwiftShader) : le travail GPU est exécuté par le CPU. Les
 * valeurs de coût mesurées ici majorent donc largement celles d'une machine
 * avec GPU réel. Elles servent à comparer deux régimes (animé vs figé) et à
 * détecter une dérive dans le temps, pas à chiffrer le coût en production.
 */

test("stabilité: 3 minutes de rendu continu — cadence et mémoire", async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "mesure longue : desktop-chromium seulement");
  test.setTimeout(SOAK_MS + 120_000);

  await installDustProbe(context);
  const consoleLog = collectConsole(page);
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const geometry = await dustGeometry(page);
  expect(geometry.backingWidth, "bande inactive : mesure sans objet").toBeGreaterThan(0);

  const readMetrics = await metricsReader(context, page);
  const samples: {
    at: number;
    fps: number;
    jsHeapUsedSize: number;
    taskDurationDelta: number;
    nodes: number;
    jsEventListeners: number;
    pixelHash: number | null;
  }[] = [];

  const heapBaseline = (await readMetrics({ gc: true })).JSHeapUsedSize;
  let previous = { probe: await readProbe(page), metrics: await readMetrics(), wall: Date.now() };
  const started = previous.wall;

  while (Date.now() - started < SOAK_MS) {
    await page.waitForTimeout(SAMPLE_MS);
    const probe = await readProbe(page);
    const metrics = await readMetrics();
    const wall = Date.now();
    const seconds = (wall - previous.wall) / 1000;
    const pixels = await readPixels(page, 120);

    samples.push({
      at: Math.round((wall - started) / 1000),
      fps: Number(((probe.draws - previous.probe.draws) / seconds).toFixed(2)),
      jsHeapUsedSize: metrics.JSHeapUsedSize,
      taskDurationDelta: Number((metrics.TaskDuration - previous.metrics.TaskDuration).toFixed(3)),
      nodes: metrics.Nodes,
      jsEventListeners: metrics.JSEventListeners,
      pixelHash: pixels.available ? pixels.hash : null,
    });
    previous = { probe, metrics, wall };
  }

  // Mesure de fuite prise après ramasse-miettes forcé : sans lui, le tas
  // reflète surtout le report de collecte (cf. lifecycle.spec.ts).
  const heapSettled = (await readMetrics({ gc: true })).JSHeapUsedSize;
  const fps = samples.map((s) => s.fps);
  const first = samples[0];
  const last = samples[samples.length - 1];
  const summary = {
    durationSeconds: Math.round((Date.now() - started) / 1000),
    sampleCount: samples.length,
    fpsMin: Math.min(...fps),
    fpsMax: Math.max(...fps),
    fpsFirst: first.fps,
    fpsLast: last.fps,
    heapFirstKB: Math.round(first.jsHeapUsedSize / 1024),
    heapLastKB: Math.round(last.jsHeapUsedSize / 1024),
    heapBaselineAfterGcKB: Math.round(heapBaseline / 1024),
    heapSettledAfterGcKB: Math.round(heapSettled / 1024),
    heapGrowthAfterGcKB: Math.round((heapSettled - heapBaseline) / 1024),
    mainThreadBusyRatio: Number(
      (samples.reduce((a, s) => a + s.taskDurationDelta, 0) / (samples.length * (SAMPLE_MS / 1000))).toFixed(3),
    ),
  };

  const probe = await readProbe(page);
  writeEvidence("stabilite-3min", { geometry, summary, samples });

  expect(probe.isLost, "contexte perdu pendant les 3 minutes").toBe(false);
  expect(probe.lostAt).toEqual([]);
  expect(await drainGlErrors(page), "erreur GL accumulée sur la durée").toEqual([]);
  expect(
    consoleLog.errors(),
    `erreurs console sur la durée : ${JSON.stringify(consoleLog.errors())}`,
  ).toHaveLength(0);

  // La boucle ne doit ni mourir ni s'effondrer : la dernière fenêtre reste
  // du même ordre que la première (seuil large, rendu logiciel très variable).
  expect(summary.fpsMin, "boucle rAF arrêtée pendant la mesure").toBeGreaterThan(0);
  expect(
    summary.fpsLast,
    `cadence effondrée : ${summary.fpsFirst} → ${summary.fpsLast} fps`,
  ).toBeGreaterThan(summary.fpsFirst * 0.4);

  // Pas de dérive mémoire franche sur la durée (comparaison après GC).
  expect(
    heapSettled - heapBaseline,
    `tas JS après GC : ${summary.heapBaselineAfterGcKB} KB → ${summary.heapSettledAfterGcKB} KB`,
  ).toBeLessThan(8 * 1024 * 1024);
  expect(last.nodes, `nœuds DOM : ${first.nodes} → ${last.nodes}`).toBeLessThanOrEqual(first.nodes + 20);
  expect(
    last.jsEventListeners,
    `listeners : ${first.jsEventListeners} → ${last.jsEventListeners}`,
  ).toBeLessThanOrEqual(first.jsEventListeners + 20);
});

test("coût CPU soutenu: rendu animé vs rendu figé (reduced-motion)", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "mesure longue : desktop-chromium seulement");
  test.setTimeout(CPU_WINDOW_MS * 2 + 120_000);

  /**
   * Complète le constat IMPORTANT #2 de qa/Reports/performance-2026-08-13.md
   * (coût CPU/GPU de Dust hors fenêtre de trace Lighthouse) : on compare deux
   * contextes identiques, l'un avec la boucle rAF active, l'autre avec
   * `prefers-reduced-motion: reduce` (une seule frame, puis plus rien).
   */
  const measure = async (reduced: boolean) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await installDustProbe(context);
    const page = await context.newPage();
    await page.goto(ROUTES.home);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const readMetrics = await metricsReader(context, page);
    const geometry = await dustGeometry(page);
    const m0 = await readMetrics();
    const p0 = await readProbe(page);
    const wall0 = Date.now();
    await page.waitForTimeout(CPU_WINDOW_MS);
    const m1 = await readMetrics();
    const p1 = await readProbe(page);
    const seconds = (Date.now() - wall0) / 1000;

    const result = {
      reducedMotion: reduced,
      windowSeconds: Number(seconds.toFixed(2)),
      frames: p1.draws - p0.draws,
      fps: Number(((p1.draws - p0.draws) / seconds).toFixed(2)),
      taskDuration: Number((m1.TaskDuration - m0.TaskDuration).toFixed(3)),
      scriptDuration: Number((m1.ScriptDuration - m0.ScriptDuration).toFixed(3)),
      layoutCount: m1.LayoutCount - m0.LayoutCount,
      heapDeltaKB: Math.round((m1.JSHeapUsedSize - m0.JSHeapUsedSize) / 1024),
      backingBuffer: [geometry.backingWidth, geometry.backingHeight],
    };
    await context.close();
    return result;
  };

  const animated = await measure(false);
  const frozen = await measure(true);

  const summary = {
    animated,
    frozen,
    taskDurationDelta: Number((animated.taskDuration - frozen.taskDuration).toFixed(3)),
    mainThreadBusyRatioAnimated: Number((animated.taskDuration / animated.windowSeconds).toFixed(3)),
    mainThreadBusyRatioFrozen: Number((frozen.taskDuration / frozen.windowSeconds).toFixed(3)),
    note:
      "Rendu logiciel (SwiftShader) : le travail GPU est exécuté par le CPU. " +
      "Majore le coût d'une machine à GPU réel ; sert de comparaison entre régimes.",
  };
  writeEvidence("cout-cpu-soutenu", summary);

  expect(animated.frames, "aucune frame dans le régime animé").toBeGreaterThan(0);
  expect(frozen.frames, "le régime figé dessine encore").toBe(0);

  // Constat attendu : le régime animé coûte plus cher. On n'impose pas de
  // plafond chiffré, qui n'aurait pas de sens sur un rendu logiciel.
  expect(
    animated.taskDuration,
    `thread principal : ${animated.taskDuration}s (animé) vs ${frozen.taskDuration}s (figé) sur ${animated.windowSeconds}s`,
  ).toBeGreaterThan(frozen.taskDuration);
});

test("stabilité: aucune erreur console sur une session prolongée avec interactions", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(180_000);
  await installDustProbe(context);
  const consoleLog = collectConsole(page);

  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const geometry = await dustGeometry(page);
  const active = geometry.cssWidth >= WEBGL_MIN_WIDTH;

  for (let i = 0; i < 6; i++) {
    await page.mouse.move(200 + i * 90, 150 + i * 70, { steps: 6 });
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(1200);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(1200);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(600);
  }

  const probe = await readProbe(page);
  expect(probe.isLost ?? false, "contexte perdu pendant la session").toBe(false);
  if (active) expect(probe.draws, "aucune frame sur toute la session").toBeGreaterThan(0);
  expect(await drainGlErrors(page)).toEqual([]);
  expect(
    consoleLog.errors(),
    `erreurs console : ${JSON.stringify(consoleLog.errors())}`,
  ).toHaveLength(0);

  writeEvidence(`session-console-${testInfo.project.name}`, {
    geometry,
    draws: probe.draws,
    consoleAll: consoleLog.all,
    driverNoise: consoleLog.driverNoise().length,
  });
});

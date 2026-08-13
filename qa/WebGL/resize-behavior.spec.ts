import { expect, test } from "playwright/test";
import { ROUTES, WEBGL_MIN_WIDTH } from "../qa.config";
import {
  collectConsole,
  dustGeometry,
  installDustProbe,
  readPixels,
  readProbe,
  sampleDrawRate,
  writeEvidence,
} from "./dust.helpers";

/** MAX_DPR dans src/components/dust.tsx : le back-buffer ne dépasse jamais ×2. */
const MAX_DPR = 2;

/**
 * Largeurs choisies pour encadrer le seuil : avec une hauteur de 800px, la
 * bande vaut `100vw - min(100vw, 100vh × 0.451)` (25vw de panneau entre 641
 * et 900px, cf. src/app/globals.css) — soit 239px à 600px de large et 214px
 * à 575px, de part et d'autre des 220px de MIN_WIDTH.
 */
const SWEEP = [
  { width: 1280, height: 800 },
  { width: 900, height: 800 },
  { width: 700, height: 800 },
  { width: 620, height: 800 },
  { width: 600, height: 800 },
  { width: 575, height: 800 },
  { width: 500, height: 800 },
  { width: 420, height: 800 },
  { width: 1280, height: 800 },
] as const;

test(`dust: canvas désactivé sous MIN_WIDTH (${WEBGL_MIN_WIDTH}px)`, async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(180_000);
  await installDustProbe(context);
  const consoleLog = collectConsole(page);

  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const observations = [];
  for (const viewport of SWEEP) {
    await page.setViewportSize({ ...viewport });
    // ResizeObserver + réallocation du back-buffer.
    await page.waitForTimeout(600);

    const geometry = await dustGeometry(page);
    const rate = await sampleDrawRate(page, 700);
    const pixels = await readPixels(page, 120);
    observations.push({ viewport, geometry, rate, pixels });

    const active = geometry.cssWidth >= WEBGL_MIN_WIDTH;
    const label = `${viewport.width}×${viewport.height} → bande ${geometry.cssWidth}px`;

    if (active) {
      // Back-buffer = largeur CSS × DPR, plafonné à MAX_DPR.
      const dpr = Math.min(MAX_DPR, geometry.dpr);
      expect(geometry.backingWidth, `${label} : back-buffer nul alors que la bande est exploitable`)
        .toBeGreaterThan(0);
      expect(
        Math.abs(geometry.backingWidth - Math.round(geometry.cssWidth * dpr)),
        `${label} : back-buffer ${geometry.backingWidth}px ≠ ${geometry.cssWidth}×${dpr}`,
      ).toBeLessThanOrEqual(1);
      expect(rate.frames, `${label} : boucle rAF à l'arrêt`).toBeGreaterThan(0);
    } else {
      // Sous le seuil : canvas remis à 0×0 et boucle stoppée.
      expect(geometry.backingWidth, `${label} : back-buffer non remis à zéro`).toBe(0);
      expect(geometry.backingHeight, `${label} : back-buffer non remis à zéro`).toBe(0);
      expect(rate.frames, `${label} : la boucle tourne encore sous le seuil`).toBe(0);
      /* Chromium borne le drawing buffer d'un canvas 0×0 à 1×1 : `readPixels`
         reste techniquement possible, mais sur un pixel — ce qui suffit à
         prouver qu'il n'y a plus de surface de rendu. */
      expect(
        !pixels.available || pixels.sampled <= 1,
        `${label} : surface de rendu encore exploitable (${JSON.stringify(pixels)})`,
      ).toBe(true);
    }
  }

  // Retour à 1280×800 en fin de balayage : le canvas doit être reparti.
  const last = observations[observations.length - 1];
  expect(last.geometry.backingWidth, "canvas non réactivé après retour au-dessus du seuil").toBeGreaterThan(0);
  expect(last.rate.frames, "boucle rAF non redémarrée après retour au-dessus du seuil").toBeGreaterThan(0);
  expect(last.pixels.available && last.pixels.nonZero > 0, "aucun rendu après réactivation").toBe(true);

  // Un seul contexte pour tout le balayage : pas de recréation à chaque resize.
  const probe = await readProbe(page);
  expect(probe.contextCalls, "contexte WebGL2 recréé pendant les resize").toHaveLength(1);
  expect(probe.isLost, "contexte perdu pendant les resize").toBe(false);
  expect(consoleLog.errors(), JSON.stringify(consoleLog.errors())).toHaveLength(0);

  writeEvidence(`resize-${testInfo.project.name}`, {
    observations,
    canvasSizeWrites: probe.canvasSizes,
    contextCalls: probe.contextCalls.length,
  });
});

test("dust: changement d'orientation (portrait ↔ paysage)", async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  await installDustProbe(context);
  const consoleLog = collectConsole(page);

  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");

  const steps = [];
  for (const [label, size] of [
    ["portrait", { width: 412, height: 915 }],
    ["paysage", { width: 915, height: 412 }],
    ["portrait (retour)", { width: 412, height: 915 }],
    ["paysage (retour)", { width: 915, height: 412 }],
  ] as const) {
    await page.setViewportSize({ ...size });
    await page.waitForTimeout(700);
    const geometry = await dustGeometry(page);
    const rate = await sampleDrawRate(page, 800);
    steps.push({ label, size, geometry, rate });

    if (geometry.cssWidth >= WEBGL_MIN_WIDTH) {
      expect(geometry.backingWidth, `${label} : back-buffer nul`).toBeGreaterThan(0);
      expect(rate.frames, `${label} : boucle à l'arrêt`).toBeGreaterThan(0);
    } else {
      expect(geometry.backingWidth, `${label} : back-buffer non remis à zéro`).toBe(0);
      expect(rate.frames, `${label} : boucle encore active`).toBe(0);
    }
  }

  // En portrait 412px, la photo occupe toute la largeur : bande nulle, effet
  // désactivé par conception (MIN_WIDTH). En paysage il redevient actif.
  expect(steps[0].geometry.cssWidth, "bande non nulle en portrait 412px").toBeLessThan(
    WEBGL_MIN_WIDTH,
  );
  expect(steps[1].geometry.cssWidth, "bande inexploitable en paysage 915px").toBeGreaterThanOrEqual(
    WEBGL_MIN_WIDTH,
  );
  expect(steps[3].geometry.backingWidth, "canvas non réactivé au second passage en paysage")
    .toBeGreaterThan(0);

  const probe = await readProbe(page);
  expect(probe.contextCalls, "contexte recréé au changement d'orientation").toHaveLength(1);
  expect(probe.isLost).toBe(false);
  expect(consoleLog.errors(), JSON.stringify(consoleLog.errors())).toHaveLength(0);

  writeEvidence(`orientation-${testInfo.project.name}`, { steps, canvasSizeWrites: probe.canvasSizes });
});

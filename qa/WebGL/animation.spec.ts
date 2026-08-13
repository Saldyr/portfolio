import fs from "node:fs";
import { expect, test } from "playwright/test";
import { ROUTES, WEBGL_MIN_WIDTH } from "../qa.config";
import {
  collectConsole,
  dustBandClip,
  dustGeometry,
  evidencePath,
  installDustProbe,
  md5,
  pauseCssAnimations,
  readPixels,
  readProbe,
  sampleDrawRate,
  writeEvidence,
} from "./dust.helpers";

test("dust: la boucle rAF tourne et le rendu change d'une frame à l'autre", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(90_000);
  await installDustProbe(context);
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const geometry = await dustGeometry(page);
  if (geometry.backingWidth === 0) {
    test.skip(true, `bande < ${WEBGL_MIN_WIDTH}px (${geometry.cssWidth}px) : canvas désactivé par conception`);
  }

  const first = await readPixels(page);
  const rate = await sampleDrawRate(page, 3000);
  const second = await readPixels(page);

  // Le rendu logiciel (SwiftShader) plafonne bas : on vérifie que la boucle
  // avance, pas qu'elle tient 60 fps — le seuil resterait arbitraire ici.
  expect(rate.frames, "aucune frame dessinée en 3s").toBeGreaterThan(0);
  expect(first.available && second.available).toBe(true);
  if (first.available && second.available) {
    expect(first.hash, "back-buffer identique après 3s : rendu figé").not.toBe(second.hash);
  }

  const probe = await readProbe(page);
  expect(probe.isLost, "contexte perdu pendant l'animation").toBe(false);

  writeEvidence(`animation-rate-${testInfo.project.name}`, { geometry, rate, first, second });
});

test("dust: le canvas est bien la seule chose qui bouge dans la bande (sans instrumentation)", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const clip = await dustBandClip(page);
  const geometry = await dustGeometry(page);
  if (!clip || geometry.backingWidth === 0) {
    test.skip(true, `bande < ${WEBGL_MIN_WIDTH}px (${geometry.cssWidth}px) : canvas désactivé par conception`);
    return;
  }

  // Les animations CSS du fond (backdrop-breathe, backdrop-spill) sont figées
  // pour que la seule source de mouvement restante soit le canvas.
  const paused = await pauseCssAnimations(page);
  expect(paused, "aucune animation CSS trouvée à figer").toBeGreaterThan(0);

  const withCanvasA = await page.screenshot({ clip });
  await page.waitForTimeout(1500);
  const withCanvasB = await page.screenshot({ clip });

  await page.addStyleTag({ content: ".site-backdrop__dust { visibility: hidden; }" });
  await page.waitForTimeout(400);
  const withoutCanvasA = await page.screenshot({ clip });
  await page.waitForTimeout(1500);
  const withoutCanvasB = await page.screenshot({ clip });

  const name = testInfo.project.name;
  for (const [suffix, buf] of [
    ["canvas-t0", withCanvasA],
    ["canvas-t1", withCanvasB],
    ["sans-canvas-t0", withoutCanvasA],
    ["sans-canvas-t1", withoutCanvasB],
  ] as const) {
    fs.writeFileSync(evidencePath(`bande-${name}-${suffix}.png`), buf);
  }

  const hashes = {
    withCanvasA: md5(withCanvasA),
    withCanvasB: md5(withCanvasB),
    withoutCanvasA: md5(withoutCanvasA),
    withoutCanvasB: md5(withoutCanvasB),
  };
  writeEvidence(`animation-visuelle-${name}`, { clip, paused, hashes });

  // 1. Animations CSS figées, canvas visible : la bande change quand même.
  expect(hashes.withCanvasA, "bande figée alors que le canvas est visible").not.toBe(
    hashes.withCanvasB,
  );
  // 2. Canvas masqué : plus rien ne bouge — le mouvement venait bien de lui.
  expect(hashes.withoutCanvasA, "la bande bouge encore sans le canvas").toBe(hashes.withoutCanvasB);
  // 3. Le canvas contribue visuellement (le masquer change l'image).
  expect(hashes.withCanvasB, "masquer le canvas ne change rien à l'image").not.toBe(
    hashes.withoutCanvasA,
  );
});

test("backdrop: les animations CSS du fond tournent", async ({ page }) => {
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");

  const state = await page.evaluate(() => ({
    ambiance: getComputedStyle(document.querySelector(".site-backdrop__ambiance")!).animationName,
    spill: getComputedStyle(document.querySelector(".site-backdrop__spill")!).animationName,
    running: document
      .getAnimations()
      .map((a) => [(a as CSSAnimation).animationName ?? "?", a.playState] as const),
  }));

  expect(state.ambiance).toBe("backdrop-breathe");
  expect(state.spill).toBe("backdrop-spill");
  expect(state.running.map(([n]) => n).sort()).toEqual(["backdrop-breathe", "backdrop-spill"]);
  expect(state.running.every(([, s]) => s === "running")).toBe(true);
});

test("dust: le déplacement de la souris ne perturbe ni le rendu ni la console", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(120_000);
  await installDustProbe(context);
  const consoleLog = collectConsole(page);
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const geometry = await dustGeometry(page);
  if (geometry.backingWidth === 0) {
    test.skip(true, `bande < ${WEBGL_MIN_WIDTH}px (${geometry.cssWidth}px) : canvas désactivé par conception`);
  }

  const idle = await sampleDrawRate(page, 2500);

  // Balayage continu de la bande pendant la même durée.
  const [vw, vh] = geometry.viewport;
  const bandCenterX = vw - geometry.cssWidth / 2;
  const before = await readProbe(page);
  const started = Date.now();
  for (let i = 0; i < 25; i++) {
    const t = i / 24;
    await page.mouse.move(
      Math.round(bandCenterX + Math.sin(t * Math.PI * 2) * (geometry.cssWidth / 3)),
      Math.round(vh * (0.2 + 0.6 * t)),
      { steps: 4 },
    );
    await page.waitForTimeout(80);
  }
  const after = await readProbe(page);
  const moving = {
    frames: after.draws - before.draws,
    elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(3)),
  };

  expect(moving.frames, "la boucle s'est arrêtée pendant le mouvement souris").toBeGreaterThan(0);
  expect(after.isLost, "contexte perdu pendant le mouvement souris").toBe(false);
  expect(after.lostAt).toEqual([]);
  expect(
    consoleLog.errors(),
    `erreurs console pendant le mouvement souris : ${JSON.stringify(consoleLog.errors())}`,
  ).toHaveLength(0);

  writeEvidence(`souris-${testInfo.project.name}`, { idle, moving, geometry });
});

test("dust: onglet en arrière-plan puis retour — la boucle s'arrête et repart", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(120_000);
  await installDustProbe(context, { controllableVisibility: true });
  const consoleLog = collectConsole(page);
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const geometry = await dustGeometry(page);
  if (geometry.backingWidth === 0) {
    test.skip(true, `bande < ${WEBGL_MIN_WIDTH}px (${geometry.cssWidth}px) : canvas désactivé par conception`);
  }

  const visibleBefore = await sampleDrawRate(page, 2000);

  await page.evaluate(() => (window as unknown as { __setHidden: (v: boolean) => void }).__setHidden(true));
  await page.waitForTimeout(300);
  const hidden = await sampleDrawRate(page, 2000);

  await page.evaluate(() => (window as unknown as { __setHidden: (v: boolean) => void }).__setHidden(false));
  await page.waitForTimeout(300);
  const visibleAfter = await sampleDrawRate(page, 2000);

  const probe = await readProbe(page);
  expect(probe.visibilityEvents).toEqual(["hidden", "visible"]);
  expect(visibleBefore.frames, "aucune frame avant la mise en arrière-plan").toBeGreaterThan(0);
  expect(hidden.frames, "la boucle continue alors que document.hidden est vrai").toBe(0);
  expect(visibleAfter.frames, "la boucle n'a pas redémarré au retour au premier plan").toBeGreaterThan(0);
  expect(probe.isLost, "contexte perdu au retour au premier plan").toBe(false);
  expect(consoleLog.errors()).toHaveLength(0);

  writeEvidence(`visibilite-${testInfo.project.name}`, { visibleBefore, hidden, visibleAfter, probe });
});

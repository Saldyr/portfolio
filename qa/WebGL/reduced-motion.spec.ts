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

/**
 * Volet WebGL du fallback `prefers-reduced-motion` (le volet contenu/CSS est
 * couvert par la tâche Accessibilité). Point vérifié ici : la boucle rAF est
 * bien coupée, mais le canvas conserve une image rendue — le composant
 * dessine une frame figée (`time = 8; draw();`) plutôt que de laisser un
 * canvas vide.
 */
// `reducedMotion` n'est pas une option de test dans cette version de
// Playwright (1.62) : elle passe par `contextOptions`.
test.use({ contextOptions: { reducedMotion: "reduce" } });

test("dust: prefers-reduced-motion=reduce désactive la boucle rAF", async ({
  page,
  context,
}, testInfo) => {
  await installDustProbe(context);
  const consoleLog = collectConsole(page);

  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);

  expect(
    await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
    "l'émulation prefers-reduced-motion n'est pas active",
  ).toBe(true);

  const geometry = await dustGeometry(page);
  const settled = await readProbe(page);
  const rate = await sampleDrawRate(page, 3000);

  // Le contexte est créé dans tous les cas : c'est la boucle qui ne part pas.
  expect(settled.contextCalls).toHaveLength(1);
  expect(settled.contextCalls[0].ok).toBe(true);
  expect(rate.frames, `${rate.frames} frames dessinées en mode reduced-motion`).toBe(0);

  const pixelsBefore = await readPixels(page);
  await page.waitForTimeout(1500);
  const pixelsAfter = await readPixels(page);

  if (geometry.backingWidth > 0) {
    // Frame unique figée : présente, et identique dans le temps.
    expect(pixelsBefore.available).toBe(true);
    if (pixelsBefore.available && pixelsAfter.available) {
      expect(pixelsBefore.nonZero, "canvas vide en mode reduced-motion").toBeGreaterThan(0);
      expect(pixelsBefore.hash, "le rendu change alors que la boucle est censée être coupée").toBe(
        pixelsAfter.hash,
      );
    }
  } else {
    expect(geometry.cssWidth, "back-buffer nul attendu seulement sous MIN_WIDTH").toBeLessThan(
      WEBGL_MIN_WIDTH,
    );
  }

  expect(consoleLog.errors()).toHaveLength(0);

  writeEvidence(`reduced-motion-${testInfo.project.name}`, {
    geometry,
    drawsAtSettle: settled.draws,
    rate,
    pixelsBefore,
    pixelsAfter,
  });
});

test("reduced-motion: le fond ne s'anime plus et le contenu reste utilisable", async ({ page }) => {
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");

  const css = await page.evaluate(() => ({
    ambiance: getComputedStyle(document.querySelector(".site-backdrop__ambiance")!).animationName,
    spill: getComputedStyle(document.querySelector(".site-backdrop__spill")!).animationName,
    running: document.getAnimations().length,
  }));
  expect(css.ambiance).toBe("none");
  expect(css.spill).toBe("none");
  expect(css.running, "des animations tournent encore en mode reduced-motion").toBe(0);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Construire, créer, imaginer en pilotant l'IA.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Me contacter", exact: true })).toBeVisible();
  await expect(page.locator("#projets a")).toHaveCount(3);
});

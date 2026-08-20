import { test, expect, type Page } from "playwright/test";
import { ROUTES } from "../qa.config";

/**
 * Même contrainte que home.visual.spec.ts : le backdrop (Dust WebGL2 +
 * animations CSS) ne se fige que via prefers-reduced-motion, posé avant la
 * navigation.
 */
async function stabilize(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function waitForRenderSettled(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  // Les images de galerie sont `loading="lazy"`. Depuis POR-39 la galerie est
  // assez haute (les portraits ne sont plus rognés dans une case de 170px) pour
  // qu'elles restent hors de la marge de préchargement de Chrome : sans ce
  // parcours, `complete` ne devient jamais vrai et l'attente ci-dessous expire
  // au lieu de capturer. Retour en haut avant la capture, sinon la position de
  // défilement se retrouverait figée dans l'image.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete),
  );
}

test("project-page: capture visuelle page détail (noiseless-mind)", async ({
  page,
}) => {
  await stabilize(page);
  await page.goto(ROUTES.projectWithDetail);
  await waitForRenderSettled(page);

  await expect(page).toHaveScreenshot("project-noiseless-mind-full.png", {
    fullPage: true,
    animations: "disabled",
  });
});

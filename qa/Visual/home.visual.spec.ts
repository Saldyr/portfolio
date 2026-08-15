import { test, expect, type Page } from "playwright/test";
import { ROUTES } from "../qa.config";

/**
 * Le canvas Dust (WebGL2, rAF continu) et les animations CSS du backdrop
 * (`backdrop-breathe`/`backdrop-spill`) ne se figent que via
 * `prefers-reduced-motion: reduce` : c'est le seul signal que le composant
 * écoute (src/components/dust.tsx) pour dessiner une frame fixe (time=8) au
 * lieu de boucler. Doit être posé AVANT la navigation pour s'appliquer dès
 * le premier rendu.
 */
async function stabilize(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function waitForRenderSettled(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete),
  );
}

test.describe("Visual — home", () => {
  test.beforeEach(async ({ page }) => {
    await stabilize(page);
  });

  test("home: capture visuelle pleine page", async ({ page }) => {
    await page.goto(ROUTES.home);
    await waitForRenderSettled(page);

    await expect(page).toHaveScreenshot("home-full.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

});

test("contact: capture visuelle pleine page", async ({ page }) => {
  await stabilize(page);
  await page.goto(ROUTES.contact);
  await waitForRenderSettled(page);

  await expect(page).toHaveScreenshot("contact-full.png", {
    fullPage: true,
    animations: "disabled",
  });
});

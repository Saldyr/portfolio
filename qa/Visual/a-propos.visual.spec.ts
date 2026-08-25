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
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete),
  );
}

/**
 * POR-57 : la page n'avait aucune baseline visuelle alors qu'elle porte
 * désormais un portrait dans la colonne du titre — c'est la seule suite qui
 * verrait l'image disparaître, se déformer ou déborder de sa colonne.
 */
test("a-propos: capture visuelle pleine page", async ({ page }) => {
  await stabilize(page);
  await page.goto(ROUTES.aPropos);
  await waitForRenderSettled(page);

  await expect(page).toHaveScreenshot("a-propos-full.png", {
    fullPage: true,
    animations: "disabled",
  });
});

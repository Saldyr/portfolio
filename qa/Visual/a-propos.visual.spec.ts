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
 * POR-57 : la page n'avait aucune baseline visuelle. Elle n'a plus d'image,
 * mais elle porte désormais une frise dont le filet, les pastilles et
 * l'alignement ne tiennent qu'à des pseudo-éléments et à des positions
 * absolues — rien d'autre ici ne verrait le filet disparaître, une pastille
 * se décaler du rail, ou la colonne de lecture reperdre sa largeur.
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

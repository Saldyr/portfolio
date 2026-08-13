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

import { test, expect, type Page } from "playwright/test";
import { ROUTES } from "../qa.config";

/**
 * Aucun harnais Storybook/isolé dans ce projet : les composants sont
 * capturés directement sur la page d'accueil, où chaque état existe déjà
 * (Button primaire/secondaire du hero, ProjectCard + Tag de la grille
 * #projets).
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

test.describe("Visual — components", () => {
  test.beforeEach(async ({ page }) => {
    await stabilize(page);
    await page.goto(ROUTES.home);
    await waitForRenderSettled(page);
  });

  test("Button: états par défaut/hover/focus", async ({ page }) => {
    const primary = page.getByRole("link", { name: "Voir les projets" });
    const secondary = page.getByRole("link", { name: "Me contacter" });

    // Un locator.screenshot() se cale strictement sur la boîte de layout de
    // l'élément et rogne tout box-shadow (glow hover, anneau focus), qui ne
    // participe pas au layout. On élargit donc la zone capturée avec
    // page.screenshot({ clip }) pour que ces effets restent visibles.
    const clipAround = async (locator: typeof primary, pad = 40) => {
      const box = await locator.boundingBox();
      if (!box) throw new Error("locator has no bounding box");
      return {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      };
    };

    await expect(page).toHaveScreenshot("button-primary-default.png", {
      clip: await clipAround(primary),
    });
    await expect(page).toHaveScreenshot("button-secondary-default.png", {
      clip: await clipAround(secondary),
    });

    await primary.hover();
    await expect(page).toHaveScreenshot("button-primary-hover.png", {
      clip: await clipAround(primary),
    });

    await secondary.hover();
    await expect(page).toHaveScreenshot("button-secondary-hover.png", {
      clip: await clipAround(secondary),
    });

    await primary.focus();
    await expect(page).toHaveScreenshot("button-primary-focus.png", {
      clip: await clipAround(primary),
    });
  });

  test("Tag: état par défaut", async ({ page }) => {
    const tag = page
      .locator("#projets")
      .getByText("Jeu", { exact: true })
      .first();

    await expect(tag).toHaveScreenshot("tag-default.png");
  });

  test("ProjectCard: état par défaut/hover", async ({ page }) => {
    const card = page.locator("#projets a").first();

    await expect(card).toHaveScreenshot("project-card-default.png");

    await card.hover();
    await expect(card).toHaveScreenshot("project-card-hover.png");
  });
});

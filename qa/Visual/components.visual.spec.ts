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

    // Un débord côté haut/gauche (x-pad<0 ou y-pad<0) ne tronque rien : le
    // clamp à 0 plus bas déplace juste le clip, la largeur/hauteur pleine
    // reste dans le viewport. Seul un débord côté bas/droite tronque
    // réellement la capture (cf. POR-24, bas du viewport desktop) — c'est
    // le seul cas qui justifie un scroll.
    const exceedsViewport = (
      box: { x: number; y: number; width: number; height: number },
      viewport: { width: number; height: number },
      pad: number,
    ) =>
      box.x + box.width + pad > viewport.width ||
      box.y + box.height + pad > viewport.height;

    // Le check est générique (basé sur page.viewportSize()) : sur le
    // viewport mobile (Pixel 7) le clip élargi tient déjà, donc il ne
    // déclenche aucun scroll — sur le viewport desktop, il détecte le débord
    // introduit par la réécriture du hero (POR-24). On ne recentre donc que
    // si l'un des deux boutons en aurait besoin, et seulement une fois,
    // avant toute interaction — un scroll déclenché après hover()/focus()
    // romprait le hit-test du curseur et invaliderait silencieusement
    // l'état :hover/:focus capturé.
    const pad = 40;
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("page has no viewport size");
    const primaryBox = await primary.boundingBox();
    if (!primaryBox) throw new Error("primary has no bounding box");
    const secondaryBox = await secondary.boundingBox();
    if (!secondaryBox) throw new Error("secondary has no bounding box");
    if (
      exceedsViewport(primaryBox, viewport, pad) ||
      exceedsViewport(secondaryBox, viewport, pad)
    ) {
      await primary.evaluate((el) => el.scrollIntoView({ block: "center" }));
    }

    // Un locator.screenshot() se cale strictement sur la boîte de layout de
    // l'élément et rogne tout box-shadow (glow hover, anneau focus), qui ne
    // participe pas au layout. On élargit donc la zone capturée avec
    // page.screenshot({ clip }) pour que ces effets restent visibles.
    const clipAround = async (locator: typeof primary) => {
      const box = await locator.boundingBox();
      if (!box) throw new Error("locator has no bounding box");
      const width = box.width + pad * 2;
      const height = box.height + pad * 2;
      return {
        x: Math.min(Math.max(0, box.x - pad), viewport.width - width),
        y: Math.min(Math.max(0, box.y - pad), viewport.height - height),
        width,
        height,
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

import { test, expect, type Page } from "playwright/test";
import { projects } from "@/lib/projects";
import { ROUTES } from "../qa.config";

/**
 * Aucun harnais Storybook/isolé dans ce projet : les composants sont
 * capturés directement sur les pages où chaque état existe déjà (Button
 * primaire du hero home, Button secondaire de la page détail /projets/gojob,
 * ProjectCard + Tag de la grille #projets sur la home).
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

// Un débord côté haut/gauche (x-pad<0 ou y-pad<0) ne tronque rien : le clamp
// à 0 plus bas déplace juste le clip, la largeur/hauteur pleine reste dans
// le viewport. Seul un débord côté bas/droite tronque réellement la capture
// (cf. POR-24, bas du viewport desktop) — c'est le seul cas qui justifie un
// scroll.
function exceedsViewport(
  box: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
  pad: number,
) {
  return (
    box.x + box.width + pad > viewport.width ||
    box.y + box.height + pad > viewport.height
  );
}

type Locator = ReturnType<Page["getByRole"]>;

// Un locator.screenshot() se cale strictement sur la boîte de layout de
// l'élément et rogne tout box-shadow (glow hover, anneau focus), qui ne
// participe pas au layout. On élargit donc la zone capturée avec
// page.screenshot({ clip }) pour que ces effets restent visibles.
async function clipAround(
  locator: Locator,
  viewport: { width: number; height: number },
  pad: number,
) {
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
}

/**
 * POR-45 — le survol du projet est posé derrière `@media (hover: hover)`, qui
 * ne matche JAMAIS sur mobile-chromium (Pixel 7, appareil tactile). Les
 * baselines « hover » y étaient donc identiques au pixel près à leurs
 * équivalents « default » : 0 px d'écart mesuré sur project-card, contre
 * 1723 px sur la paire desktop. Elles ne protégeaient rien et doublaient le
 * nombre de snapshots à maintenir.
 *
 * Le pas est SAUTÉ, pas effacé : l'annotation le fait apparaître dans le
 * rapport HTML (qa/playwright.config.ts) — le reporter `list`, lui, n'imprime
 * pas les annotations d'un run vert. Un pas qui disparaît sans laisser la
 * moindre trace ne se distingue plus d'un pas qui passe.
 */
function shouldCaptureHover(hasTouch: boolean, snapshot: string) {
  if (!hasTouch) return true;
  test.info().annotations.push({
    type: "skipped-step",
    description: `${snapshot} — @media (hover: hover) ne matche pas sur un appareil tactile (POR-45)`,
  });
  return false;
}

/**
 * Plancher de la garde ci-dessus (POR-45). `shouldCaptureHover` saute la
 * capture sur TOUT projet tactile : si la configuration venait à n'en déclarer
 * que de tactiles, les trois baselines de survol cesseraient d'être comparées
 * et la suite resterait verte — exactement le trou silencieux que le ticket
 * ferme, rouvert par l'autre bout. Ce test-ci refuse ce scénario.
 */
test("Visual — au moins un projet capture le survol (plancher POR-45)", () => {
  const pointerProjects = test
    .info()
    .config.projects.filter((project) => !project.use.hasTouch)
    .map((project) => project.name);

  expect(
    pointerProjects,
    "aucun projet non tactile déclaré : plus aucune baseline de survol n'est comparée, et rien ne devient rouge pour le signaler",
  ).not.toHaveLength(0);
});

test.describe("Visual — components", () => {
  test.beforeEach(async ({ page }) => {
    await stabilize(page);
  });

  test("Button primaire: états par défaut/hover/focus", async ({ page, hasTouch }) => {
    await page.goto(ROUTES.home);
    await waitForRenderSettled(page);

    const primary = page.getByRole("link", { name: "Me contacter" });

    const pad = 40;
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("page has no viewport size");
    const primaryBox = await primary.boundingBox();
    if (!primaryBox) throw new Error("primary has no bounding box");
    // Recentre avant toute interaction — un scroll déclenché après
    // hover()/focus() romprait le hit-test du curseur et invaliderait
    // silencieusement l'état :hover/:focus capturé.
    if (exceedsViewport(primaryBox, viewport, pad)) {
      await primary.evaluate((el) => el.scrollIntoView({ block: "center" }));
    }

    await expect(page).toHaveScreenshot("button-primary-default.png", {
      clip: await clipAround(primary, viewport, pad),
    });

    if (shouldCaptureHover(hasTouch, "button-primary-hover.png")) {
      await primary.hover();
      await expect(page).toHaveScreenshot("button-primary-hover.png", {
        clip: await clipAround(primary, viewport, pad),
      });
    }

    await primary.focus();
    await expect(page).toHaveScreenshot("button-primary-focus.png", {
      clip: await clipAround(primary, viewport, pad),
    });
  });

  test("Button secondaire: états par défaut/hover", async ({ page, hasTouch }) => {
    await page.goto("/projets/gojob");
    // Pas waitForRenderSettled : la galerie de gojob charge ses images en
    // lazy loading, hors du viewport mobile court — images.complete ne se
    // résout jamais tant qu'on ne scrolle pas jusqu'à elles, alors que le
    // bouton "Code source" (aside, au-dessus du pli) n'en dépend pas.
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    const secondary = page.getByRole("link", { name: "Code source" });

    const pad = 40;
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("page has no viewport size");
    const secondaryBox = await secondary.boundingBox();
    if (!secondaryBox) throw new Error("secondary has no bounding box");
    if (exceedsViewport(secondaryBox, viewport, pad)) {
      await secondary.evaluate((el) => el.scrollIntoView({ block: "center" }));
    }

    await expect(page).toHaveScreenshot("button-secondary-default.png", {
      clip: await clipAround(secondary, viewport, pad),
    });

    if (shouldCaptureHover(hasTouch, "button-secondary-hover.png")) {
      await secondary.hover();
      await expect(page).toHaveScreenshot("button-secondary-hover.png", {
        clip: await clipAround(secondary, viewport, pad),
      });
    }
  });

  test("Tag: état par défaut", async ({ page }) => {
    // POR-41 : libellé dérivé de src/lib/projects.ts, jamais figé. La version
    // précédente cherchait « Jeu », un tag disparu des données — le locator ne
    // résolvait plus, et le test échouait faute de cible, pas sur un écart de
    // pixels. Régénérer la baseline n'y aurait donc rien changé.
    const label = projects[0]?.tags[0];
    if (!label) {
      throw new Error(
        "Le premier projet de src/lib/projects.ts ne déclare aucun tag : ce test capture le Tag neutre de la première carte, il n'a plus d'objet.",
      );
    }

    await page.goto(ROUTES.home);
    await waitForRenderSettled(page);

    // Scopé à la première carte — la même que celle du test ProjectCard plus
    // bas. Un getByText sur tout #projets prendrait le premier libellé
    // identique rencontré, quelle que soit la carte qui le porte.
    const tag = page
      .locator("#projets a")
      .first()
      .getByText(label, { exact: true });

    await expect(tag).toHaveScreenshot("tag-default.png");
  });

  test("ProjectCard: état par défaut/hover", async ({ page, hasTouch }) => {
    await page.goto(ROUTES.home);
    await waitForRenderSettled(page);

    const card = page.locator("#projets a").first();

    await expect(card).toHaveScreenshot("project-card-default.png");

    if (shouldCaptureHover(hasTouch, "project-card-hover.png")) {
      await card.hover();
      await expect(card).toHaveScreenshot("project-card-hover.png");
    }
  });
});

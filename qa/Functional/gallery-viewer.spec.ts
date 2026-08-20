import { expect, test, type Page } from "playwright/test";
import { projects } from "@/lib/projects";
import { decodeNextImageSrc, imageIdentity } from "../support/next-image";

/**
 * POR-40 — visionneuse plein écran de la galerie projet (`<dialog>` natif).
 *
 * Couverture jusqu'ici nulle sur ce composant. Ce qui est asserté ici est le
 * COMPORTEMENT observable : ouverture, navigation, focus, poids téléchargé,
 * verrou de scroll. Pas le rendu visuel — aucune baseline de la visionneuse
 * ouverte n'existe, c'est un choix assumé (voir le plan sur POR-40).
 *
 * Décisions de comportement, arbitrées avant implémentation :
 *   - les flèches BUTENT aux extrémités, elles ne bouclent pas ;
 *   - le focus est rendu à la vignette de l'image affichée à la FERMETURE,
 *     pas à celle d'origine — c'est le seul cas où les deux se distinguent,
 *     et donc le seul qui prouve que la restauration native n'a pas gagné.
 */

const GALLERY = '[data-testid="project-gallery"]';
const VIEWER = '[data-testid="gallery-viewer"]';
const VIEWER_IMAGE = '[data-testid="gallery-viewer-image"]';
const VIEWER_COUNTER = '[data-testid="gallery-viewer-counter"]';
const PRELOAD_IMAGE = '[data-testid="gallery-viewer-preload"]';

/**
 * `sizes` propre à la visionneuse (exigence 4). Recopié ici à dessein : c'est
 * la valeur ATTENDUE, elle ne doit pas être importée du composant, sinon le
 * test suivrait n'importe quelle dérive au lieu de la signaler.
 */
const EXPECTED_VIEWER_SIZES = "100vw";

// Galerie la plus fournie du site, dérivée de projects.ts — jamais un slug
// figé (motif POR-18, déjà appliqué dans project-page.spec.ts). Trois images
// minimum : en dessous, ni butée ni image lointaine à vérifier.
const galleries = projects
  .flatMap((project) => {
    const gallery = project.detail?.gallery;
    return gallery && gallery.length >= 3 ? [{ slug: project.slug, gallery }] : [];
  })
  .sort((a, b) => b.gallery.length - a.gallery.length);

/** Échec explicite plutôt que skip : une garde qui s'auto-désactive est une garde perdue. */
function target() {
  const largest = galleries[0];
  if (!largest) {
    throw new Error(
      "Aucune galerie de 3 images ou plus dans src/lib/projects.ts : cette suite ne couvre plus rien, la retirer explicitement.",
    );
  }
  return largest;
}

function galleryIdentity(index: number) {
  return imageIdentity(target().gallery[index].image.src);
}

async function gotoGallery(page: Page) {
  const { slug, gallery } = target();
  const response = await page.goto(`/projets/${slug}`);
  expect(response?.status()).toBe(200);

  const thumbs = page.locator(`${GALLERY} button`);
  await expect(thumbs).toHaveCount(gallery.length);

  // Les vignettes sont `loading="lazy"` : sans ce scroll elles ne sont jamais
  // requêtées, et le relevé réseau du test de préchargement les compterait
  // comme des requêtes de la visionneuse.
  await page.locator(GALLERY).scrollIntoViewIfNeeded();
  await page.waitForFunction(
    (selector) =>
      Array.from(document.querySelectorAll(`${selector} img`)).every(
        (node) => (node as HTMLImageElement).complete,
      ),
    GALLERY,
  );

  return { gallery, thumbs };
}

async function openViewer(page: Page, index: number) {
  await page.locator(`${GALLERY} button`).nth(index).click();
  const viewer = page.locator(VIEWER);
  await expect(viewer).toBeVisible();
  return viewer;
}

/**
 * Assertion RÉESSAYÉE, et non un relevé unique de `document.activeElement`.
 *
 * Motif mesuré (POR-40) : la fermeture d'un `<dialog>` restaure d'abord
 * nativement le focus sur la vignette d'ORIGINE, avant que le composant ne le
 * repose sur la vignette courante — 3 ms plus tard sur desktop, 25 ms sur
 * mobile. Un relevé unique lit ce transitoire et échoue par intermittence,
 * selon la charge de la machine.
 *
 * L'assertion ne perd rien : si le focus ne finit jamais sur la vignette
 * attendue, elle échoue au timeout.
 */
async function expectThumbFocused(page: Page, index: number) {
  await expect(
    page.locator(`${GALLERY} button`).nth(index),
    `le focus n'est pas revenu sur la vignette ${index}`,
  ).toBeFocused();
}

async function shownIdentity(page: Page) {
  return imageIdentity(decodeNextImageSrc(await page.locator(VIEWER_IMAGE).getAttribute("src")));
}

test("gallery-viewer: chaque vignette est un bouton, et le clic ouvre la visionneuse sur CETTE image", async ({
  page,
}) => {
  const { gallery, thumbs } = await gotoGallery(page);

  // Le <div> d'avant POR-40 n'était ni cliquable ni atteignable au clavier :
  // vérifier le type autant que le comportement.
  await expect(thumbs.first()).toHaveAttribute("type", "button");
  await expect(page.locator(VIEWER)).toBeHidden();

  // Index 1, pas 0 : ouvrir sur la première image rendrait ce test vert même
  // si la visionneuse ignorait l'index cliqué.
  await openViewer(page, 1);
  await expect(page.locator(VIEWER)).toHaveAttribute("open", "");
  expect(await shownIdentity(page)).toBe(galleryIdentity(1));
  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`2 / ${gallery.length}`);
});

// Sans navigation, vignette d'origine et vignette courante sont la même : ce
// test couvre la fermeture au clavier, pas la règle de restauration — c'est le
// test « vignette COURANTE » plus bas qui distingue les deux.
test("gallery-viewer: Escape ferme et rend le focus à la vignette ouverte", async ({ page }) => {
  await gotoGallery(page);
  await openViewer(page, 1);

  await page.keyboard.press("Escape");

  await expect(page.locator(VIEWER)).toBeHidden();
  await expectThumbFocused(page, 1);
});

test("gallery-viewer: les flèches changent l'image affichée et le compteur", async ({ page }) => {
  const { gallery } = await gotoGallery(page);
  await openViewer(page, 0);

  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`1 / ${gallery.length}`);

  await page.keyboard.press("ArrowRight");
  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`2 / ${gallery.length}`);
  expect(await shownIdentity(page)).toBe(galleryIdentity(1));

  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`1 / ${gallery.length}`);
  expect(await shownIdentity(page)).toBe(galleryIdentity(0));
});

test("gallery-viewer: la navigation bute aux extrémités, elle ne boucle pas", async ({ page }) => {
  const { gallery } = await gotoGallery(page);
  const last = gallery.length - 1;

  await openViewer(page, 0);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`1 / ${gallery.length}`);
  expect(await shownIdentity(page)).toBe(galleryIdentity(0));
  await expect(page.getByRole("button", { name: "Image précédente" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Image suivante" })).toBeEnabled();

  await page.keyboard.press("Escape");
  await openViewer(page, last);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`${gallery.length} / ${gallery.length}`);
  expect(await shownIdentity(page)).toBe(galleryIdentity(last));
  await expect(page.getByRole("button", { name: "Image suivante" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Image précédente" })).toBeEnabled();
});

test("gallery-viewer: après navigation, le focus revient sur la vignette COURANTE", async ({
  page,
}) => {
  const { gallery } = await gotoGallery(page);
  await openViewer(page, 0);

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  // Ancre obligatoire avant de fermer : sans elle, des flèches perdues
  // donneraient le même symptôme qu'une restauration de focus fautive — le
  // focus reviendrait sur la vignette 0, et pour une tout autre raison.
  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`3 / ${gallery.length}`);

  await page.keyboard.press("Escape");

  await expect(page.locator(VIEWER)).toBeHidden();
  // La fermeture restaure NATIVEMENT le focus sur la vignette 0, celle d'avant
  // l'ouverture. Finir sur 2 prouve que la restauration explicite du composant
  // passe bien APRÈS elle — c'est le seul scénario où les deux se distinguent.
  await expectThumbFocused(page, 2);
});

test("gallery-viewer: les boutons précédent/suivant naviguent aussi à la souris", async ({
  page,
}) => {
  const { gallery } = await gotoGallery(page);
  await openViewer(page, 0);

  await page.getByRole("button", { name: "Image suivante" }).click();
  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`2 / ${gallery.length}`);

  await page.getByRole("button", { name: "Image précédente" }).click();
  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`1 / ${gallery.length}`);

  // Revenir à l'index 0 désactive le bouton qui vient d'être actionné. Sans
  // déplacement explicite du focus, celui-ci tombe sur `<body>` : les flèches
  // ne remontent alors plus jusqu'au `<dialog>` et la navigation clavier meurt
  // en silence. C'est la seule règle de focus écrite à la main hors de la
  // fermeture, et rien d'autre ne la couvre.
  await expect(page.getByRole("button", { name: "Fermer la visionneuse" })).toBeFocused();
});

test("gallery-viewer: après un clic dans la visionneuse, les flèches répondent encore", async ({
  page,
}) => {
  const { gallery } = await gotoGallery(page);
  await openViewer(page, 0);

  // Le gestionnaire de flèches est posé sur le `<dialog>` et compte sur la
  // remontée de l'événement. Cliquer une zone non focusable de la visionneuse
  // (l'image, ou le fond letterboxé autour) déplace le focus hors des boutons :
  // si le navigateur le rend à `<body>` plutôt qu'au dialogue, le keydown ne
  // remonte plus jusqu'au gestionnaire et la navigation clavier cesse de
  // répondre — sans erreur, et seulement après une interaction souris.
  await page.locator(VIEWER_IMAGE).click();
  await page.keyboard.press("ArrowRight");

  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`2 / ${gallery.length}`);
});

test("gallery-viewer: le bouton fermer et le clic sur le fond ferment la visionneuse", async ({
  page,
}) => {
  await gotoGallery(page);

  await openViewer(page, 0);
  await page.getByRole("button", { name: "Fermer la visionneuse" }).click();
  await expect(page.locator(VIEWER)).toBeHidden();

  await openViewer(page, 0);
  // Coin supérieur gauche : hors de l'image comme des contrôles.
  await page.locator(VIEWER).click({ position: { x: 4, y: 4 } });
  await expect(page.locator(VIEWER)).toBeHidden();
});

test("gallery-viewer: sizes propre à la visionneuse, distinct de celui des vignettes", async ({
  page,
}) => {
  await gotoGallery(page);
  const thumbSizes = await page.locator(`${GALLERY} img`).first().getAttribute("sizes");

  await openViewer(page, 0);
  const viewerSizes = await page.locator(VIEWER_IMAGE).getAttribute("sizes");

  expect(viewerSizes).toBe(EXPECTED_VIEWER_SIZES);
  expect(
    viewerSizes,
    "la visionneuse réutilise le `sizes` des vignettes : elle afficherait en plein écran une image calibrée pour une case de ~300px",
  ).not.toBe(thumbSizes);
});

test("gallery-viewer: seules les images voisines (n±1) sont préchargées", async ({ page }) => {
  const { gallery } = await gotoGallery(page);

  const requestedIdentities = new Set<string | null>();
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/_next/image")) {
      requestedIdentities.add(imageIdentity(decodeNextImageSrc(url)));
    }
  });

  await openViewer(page, 0);
  await expect(page.locator(VIEWER_IMAGE)).toBeVisible();
  await page.waitForLoadState("networkidle");

  // Le cœur de l'exigence 5. Poids relevés sur public/uploads le 2026-08-20 :
  // 714 Ko pour la plus lourde des captures GoJob, 2,5 Mo pour
  // noiseless-mind-veilleuses.png — ouvrir la visionneuse ne doit pas tirer la
  // galerie entière.
  for (let index = 2; index < gallery.length; index += 1) {
    expect(
      requestedIdentities.has(galleryIdentity(index)),
      `image ${index + 1}/${gallery.length} téléchargée alors qu'elle n'est pas voisine de l'image affichée`,
    ).toBe(false);
  }

  // Le voisin est bien préchargé — et surtout AU MÊME CANDIDAT de srcset que
  // celui qui sera affiché. Sans cette égalité, le préchargement ferait
  // télécharger une deuxième variante de la même image : deux fois le poids,
  // aucune erreur, aucun symptôme visible.
  const preloadedSrc = await page
    .locator(PRELOAD_IMAGE)
    .first()
    .evaluate((node) => (node as HTMLImageElement).currentSrc);
  expect(preloadedSrc, "aucune image voisine préchargée").not.toBe("");

  await page.keyboard.press("ArrowRight");
  await expect(page.locator(VIEWER_COUNTER)).toHaveText(`2 / ${gallery.length}`);
  const shownSrc = await page
    .locator(VIEWER_IMAGE)
    .evaluate((node) => (node as HTMLImageElement).currentSrc);
  expect(shownSrc).toBe(preloadedSrc);
});

test("gallery-viewer: la page derrière la visionneuse ne défile pas, et redéfile après fermeture", async ({
  page,
}) => {
  await gotoGallery(page);
  await openViewer(page, 0);

  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 800);
  await page.keyboard.press("PageDown");
  await page.keyboard.press("End");
  // Le défilement est asynchrone : asserter l'ABSENCE d'effet demande de lui
  // laisser le temps de se produire.
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => window.scrollY),
    "la page a défilé derrière la visionneuse (exigence 6)",
  ).toBe(before);

  await page.keyboard.press("Escape");
  await expect(page.locator(VIEWER)).toBeHidden();

  // Le pire mode d'échec de ce ticket : un verrou jamais relâché fige la page
  // définitivement, sans la moindre erreur.
  await page.mouse.wheel(0, 800);
  await page.waitForFunction((previous) => window.scrollY !== previous, before, {
    timeout: 3000,
  });
});

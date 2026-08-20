import { expect, test, type Page } from "playwright/test";
import { projects } from "@/lib/projects";
import { ROUTES } from "../qa.config";

// POR-18 : le projet « sans detail » est dérivé de src/lib/projects.ts, jamais
// figé sur un slug. La version précédente codait hermes-agent, qui a depuis
// acquis un `detail` et une route réelle — la spec décrivait un site disparu.
const projectWithoutDetail = projects.find((project) => !project.detail);

test("project-page: slug avec detail (noiseless-mind) affiche la page détail", async ({ page }) => {
  const project = projects.find((candidate) => candidate.href === ROUTES.projectWithDetail);
  if (!project?.detail) {
    throw new Error(
      `Aucun projet avec \`detail\` pour ${ROUTES.projectWithDetail} dans src/lib/projects.ts : mettre à jour ROUTES.projectWithDetail (qa/qa.config.ts).`,
    );
  }

  const response = await page.goto(ROUTES.projectWithDetail);
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1, name: project.title })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Tous les projets" })).toBeVisible();
  // Le bouton démo n'est rendu que si le projet déclare un `demoHref`
  // (src/app/projets/[slug]/page.tsx:112-116). Les deux sens sont couverts :
  // présent quand il est déclaré, absent sinon.
  await expect(page.getByRole("link", { name: "Voir la démo" })).toHaveCount(
    project.detail.demoHref ? 1 : 0,
  );
});

test("project-page: un projet sans detail 404 en direct et n'est lié nulle part sur la home", async ({
  page,
}) => {
  // Échec explicite plutôt que skip : une garde qui s'auto-désactive est une
  // garde perdue.
  if (!projectWithoutDetail) {
    throw new Error(
      "Plus aucun projet sans `detail` dans src/lib/projects.ts : cette garde n'a plus d'objet, la retirer explicitement.",
    );
  }

  // Le projet existe (src/lib/projects.ts) mais n'a pas de `detail` :
  // generateStaticParams ne le génère pas et la route appelle notFound()
  // (src/app/projets/[slug]/page.tsx:38-39) — pas de redirection réelle.
  const deadRoute = `/projets/${projectWithoutDetail.slug}`;
  const response = await page.goto(deadRoute);
  expect(response?.status()).toBe(404);

  await page.goto(ROUTES.home);
  // Ancre littérale : la carte du projet doit exister, sinon l'assertion
  // d'absence ci-dessous passerait au vert sur une section vide.
  await expect(
    page.locator(`#projets a[href="${projectWithoutDetail.href}"]`),
  ).toHaveCount(1);
  // L'invariant : aucun lien de la home ne mène à cette route morte.
  await expect(page.locator(`#projets a[href="${deadRoute}"]`)).toHaveCount(0);
});

test("project-page: slug inconnu déclenche notFound()", async ({ page }) => {
  const response = await page.goto(ROUTES.projectUnknown);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("404")).toBeVisible();
});

// ---------------------------------------------------------------------------
// POR-38 — Tests de caractérisation de la galerie projet.
//
// Filet de régression écrit AVANT la refonte de grille (POR-39 : imports
// statiques + ratio uniforme `object-contain`). Il caractérise le rendu tel
// qu'il est, il ne prescrit pas celui qu'il devrait avoir.
//
// Ce qu'il n'assert PAS, délibérément : ni `object-fit: cover`, ni « l'image
// remplit exactement sa case », ni la hauteur fixe de 170 px. Asserter l'un des
// trois figerait le rognage actuel comme souhaitable — ce que POR-38 interdit
// explicitement — et passerait au rouge au premier commit de POR-39.
//
// Ce qu'il assert à la place, sur le cadrage : une PROPRIÉTÉ — le ratio de
// l'image est préservé — et non la valeur du jour. Voir RATIO_PRESERVING_FITS.
// ---------------------------------------------------------------------------

const GALLERY_SELECTOR = '[data-testid="project-gallery"]';

// Les `object-fit` qui préservent le ratio de l'image.
//
// On assert l'appartenance à cet ensemble, jamais l'égalité à `cover` : POR-39
// passera à `contain`, et ce test doit rester vert. Les deux exclus sont des
// défauts de rendu, pas des variantes de design — `fill` étire l'image,
// `none` l'affiche à sa taille naturelle sans tenir compte de la case.
//
// `fill` mérite une mention explicite : c'est la valeur INITIALE de
// `object-fit` en CSS, donc celle que le navigateur calcule si la classe
// utilitaire disparaît. Vérifié sur l'artefact de build : le `style` inline
// posé par `next/image` (prop `fill`) ne contient aucun `object-fit` — la
// classe est l'unique source. La collision de noms entre la prop React `fill`
// et la valeur CSS `fill` rend l'accident d'autant plus facile pendant la
// refonte. Sans cette assertion, une image étirée passerait toutes les autres.
const RATIO_PRESERVING_FITS = ["cover", "contain", "scale-down"];

// Tolérance de bordure : le conteneur porte une bordure de 1 px, l'image en
// `fill` est donc mesurée 2 px plus petite que lui (247x168 dans 249x170,
// mesuré le 2026-08-20). La marge évite de transformer cette bordure en faux
// positif de débordement.
const BORDER_TOLERANCE_PX = 2;

// Plancher de rognage, calé sous le pire cas RÉELLEMENT MESURÉ le 2026-08-20
// sur build de prod : 0.279 pour `noiseless-mind-ecoutes.jpg` (ratio 0.58) dans
// une case de ratio 2.09 sur mobile-chromium. Desktop-chromium : 0.286 pour
// `medaillo-liste.png` (ratio 5.12).
//
// Ce plancher ne prétend pas être une exigence de qualité — le rendu actuel
// rogne beaucoup trop pour qu'une telle exigence soit verte aujourd'hui. C'est
// un fil de détente : toute évolution qui rognerait PLUS fort qu'aujourd'hui
// passe au rouge.
//
// Après POR-39 (`object-contain`), toutes ces valeurs montent à 1.0 et ce
// plancher devient inerte : le remonter à 0.95 donnerait `1 >= 0.95`, une
// tautologie. Ce n'est donc PAS le plancher qui portera l'exigence après la
// refonte, c'est l'assertion RATIO_PRESERVING_FITS. Garder quand même la
// constante : elle redevient mordante si le rendu repasse un jour en `cover`.
//
// COUPLAGE À CONNAÎTRE avant d'ajouter une image de galerie : sous `cover`, ce
// plancher borne les ratios admissibles. Un ratio < 0.52 devient rouge sur
// mobile (case 2.09), un ratio > 5.88 devient rouge sur desktop (case 1.47).
// Pour mémoire, `gojob-sidebar.png` (ratio 0.40), retiré par POR-37, donnait
// 0.19 — donc rouge. Un échec ici sur une image fraîchement ajoutée signale
// un problème de curation, pas une régression de la grille.
const MIN_VISIBLE_FRACTION = 0.25;

type BoxMetric = {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type GalleryImageMetric = {
  rawSrc: string | null;
  alt: string;
  naturalWidth: number;
  naturalHeight: number;
  objectFit: string;
  box: BoxMetric;
  container: BoxMetric;
};

// `next/image` sert une image optimisée : le `src` rendu est
// `/_next/image?url=%2Fuploads%2F...&w=3840&q=75`, jamais le chemin déclaré
// dans projects.ts. Seul le paramètre `url` est comparable à la donnée source.
function decodeNextImageSrc(rawSrc: string | null) {
  if (rawSrc === null) return null;
  if (!rawSrc.startsWith("/_next/image")) return rawSrc;
  return new URL(rawSrc, "http://localhost").searchParams.get("url");
}

// Fraction des pixels de l'image effectivement peints, dérivée du `object-fit`
// RÉELLEMENT calculé — surtout pas d'une valeur figée ici. C'est ce qui permet
// à la métrique de rester juste après POR-39 sans être réécrite.
function visibleFraction(metric: GalleryImageMetric) {
  const imageRatio = metric.naturalWidth / metric.naturalHeight;
  const boxRatio = metric.box.width / metric.box.height;

  switch (metric.objectFit) {
    // Rognage géométrique : le grand côté déborde et se fait couper.
    case "cover":
      return Math.min(imageRatio, boxRatio) / Math.max(imageRatio, boxRatio);
    // Rien n'est coupé : `contain` et `scale-down` inscrivent l'image entière
    // dans la case (`scale-down` = le plus petit de `none` et `contain`, il ne
    // rogne donc jamais non plus).
    case "contain":
    case "scale-down":
      return 1;
    // Surtout pas de vert par défaut. `fill` et `none` arrivent ici : ils ne
    // préservent pas le ratio, la notion de « fraction visible » n'a pas de
    // sens pour eux, et retourner 1 reviendrait à bénir une image déformée.
    // L'assertion RATIO_PRESERVING_FITS les intercepte en amont avec un
    // message lisible ; ce `throw` est le filet de ce filet.
    default:
      throw new Error(
        `visibleFraction() appelée avec object-fit "${metric.objectFit}", qui ne préserve pas le ratio de l'image. L'assertion RATIO_PRESERVING_FITS aurait dû filtrer ce cas en amont.`,
      );
  }
}

async function collectGalleryMetrics(page: Page, slug: string): Promise<GalleryImageMetric[]> {
  const response = await page.goto(`/projets/${slug}`);
  expect(response?.status()).toBe(200);

  // Ancre obligatoire avant tout relevé : sans elle, un relevé vide rendrait
  // les trois tests verts sur zéro image.
  const gallery = page.locator(GALLERY_SELECTOR);
  await expect(gallery).toHaveCount(1);

  // L'ancre ne prouve que l'existence du conteneur. C'est cette assertion-ci
  // qui empêche le vert sur une galerie vide, et elle est posée AVANT
  // l'attente ci-dessous : sinon le cas « conteneur présent, zéro image »
  // sortirait en timeout opaque de `waitForFunction` au lieu d'un message.
  const images = gallery.locator("img");
  await expect(images).not.toHaveCount(0);

  // Les images de galerie sont `loading="lazy"` (le hero ne l'est pas) : sans
  // scroll, elles ne sont jamais requêtées.
  // L'ORDRE EST PORTEUR : amener d'abord la galerie dans le viewport, puis
  // descendre en bas de page. Inversé, une galerie plus haute que le viewport
  // peut rester hors de la marge de préchargement de Chrome, et l'attente
  // ci-dessous expire.
  await gallery.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // On attend `complete`, qui passe à `true` aussi bien pour une image chargée
  // que pour une image en ERREUR. Attendre `toBeVisible` ou un état « chargée »
  // ferait expirer le test sur une 404, au lieu de l'assertion lisible plus bas.
  await page.waitForFunction((selector) => {
    const nodes = Array.from(document.querySelectorAll(`${selector} img`));
    return nodes.every((node) => (node as HTMLImageElement).complete);
  }, GALLERY_SELECTOR);

  return page.evaluate((selector) => {
    const measure = (rect: DOMRect): BoxMetric => ({
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    });

    return Array.from(document.querySelectorAll(`${selector} img`)).map((node) => {
      const image = node as HTMLImageElement;
      const container = image.parentElement as HTMLElement;
      return {
        rawSrc: image.getAttribute("src"),
        alt: image.getAttribute("alt") ?? "",
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        objectFit: getComputedStyle(image).objectFit,
        box: measure(image.getBoundingClientRect()),
        container: measure(container.getBoundingClientRect()),
      };
    });
  }, GALLERY_SELECTOR);
}

// Dérivé de src/lib/projects.ts, jamais figé : ni la liste des projets, ni le
// nombre d'images. C'est l'exigence centrale de POR-38 — une curation de
// galerie (POR-37 : gojob 9 → 5) ne doit rien exiger ici.
const galleriedProjects = projects.flatMap((project) => {
  const gallery = project.detail?.gallery;
  return gallery && gallery.length > 0 ? [{ project, gallery }] : [];
});

test("project-page: au moins un projet déclare une galerie", () => {
  // Échec explicite plutôt que skip (motif POR-18, plus haut dans ce fichier) :
  // sans cette garde, une liste vide rendrait toute la caractérisation verte en
  // ne testant rien.
  expect(
    galleriedProjects.length,
    "Plus aucun projet avec `detail.gallery` dans src/lib/projects.ts : les tests de galerie ci-dessous ne couvrent plus rien, les retirer explicitement.",
  ).toBeGreaterThan(0);
});

for (const { project, gallery } of galleriedProjects) {
  test(`project-page: galerie ${project.slug} — rend exactement les images déclarées dans projects.ts`, async ({
    page,
  }) => {
    const metrics = await collectGalleryMetrics(page, project.slug);

    expect(metrics).toHaveLength(gallery.length);
    // Le comptage seul ne verrait ni une image substituée, ni un réordonnancement.
    expect(metrics.map((metric) => decodeNextImageSrc(metric.rawSrc))).toEqual(
      gallery.map((item) => item.image),
    );
  });

  test(`project-page: galerie ${project.slug} — chaque image porte un alt non vide`, async ({
    page,
  }) => {
    const metrics = await collectGalleryMetrics(page, project.slug);
    expect(metrics).toHaveLength(gallery.length);

    for (const [index, metric] of metrics.entries()) {
      const label = `${project.slug} image ${index + 1} (${gallery[index].image})`;
      expect(metric.alt.trim(), `${label} : alt vide`).not.toBe("");
      expect(metric.alt, `${label} : alt rendu différent de projects.ts`).toBe(gallery[index].alt);
    }
  });

  test(`project-page: galerie ${project.slug} — chaque image est chargée et visible dans son conteneur`, async ({
    page,
  }) => {
    const metrics = await collectGalleryMetrics(page, project.slug);
    expect(metrics).toHaveLength(gallery.length);

    for (const [index, metric] of metrics.entries()) {
      const label = `${project.slug} image ${index + 1} (${gallery[index].image})`;

      // Mode d'échec principal hérité de POR-37 : `next build` ne vérifie pas
      // l'existence des fichiers de public/. Une image supprimée mais encore
      // référencée passe le build et casse en 404 SILENCIEUSE — ici `complete`
      // vaut `true` et `naturalWidth` vaut 0.
      expect(
        metric.naturalWidth,
        `${label} : image non chargée (fichier absent de public/ ?)`,
      ).toBeGreaterThan(0);
      expect(metric.naturalHeight, `${label} : image non chargée`).toBeGreaterThan(0);

      expect(metric.box.width, `${label} : largeur rendue nulle`).toBeGreaterThan(0);
      expect(metric.box.height, `${label} : hauteur rendue nulle`).toBeGreaterThan(0);

      // « Visible » au sens Playwright : une boîte non nulle ne dit rien de
      // `visibility: hidden` ni de `display: none`.
      await expect(
        page.locator(`${GALLERY_SELECTOR} img`).nth(index),
        `${label} : image présente mais non visible`,
      ).toBeVisible();

      // Contenue dans son conteneur : vrai sous `cover` comme sous `contain`,
      // donc l'assertion survit à POR-39.
      expect(metric.box.left, `${label} : déborde à gauche`).toBeGreaterThanOrEqual(
        metric.container.left - BORDER_TOLERANCE_PX,
      );
      expect(metric.box.top, `${label} : déborde en haut`).toBeGreaterThanOrEqual(
        metric.container.top - BORDER_TOLERANCE_PX,
      );
      expect(metric.box.right, `${label} : déborde à droite`).toBeLessThanOrEqual(
        metric.container.right + BORDER_TOLERANCE_PX,
      );
      expect(metric.box.bottom, `${label} : déborde en bas`).toBeLessThanOrEqual(
        metric.container.bottom + BORDER_TOLERANCE_PX,
      );

      // Propriété assertée, pas valeur du jour : le ratio de l'image doit être
      // préservé. Reste vert quand POR-39 passera à `contain` ; passe au rouge
      // si la classe utilitaire disparaît, auquel cas le calculé retombe sur
      // `fill` (valeur initiale CSS) et l'image est étirée sans que rien
      // d'autre dans ce test ne le voie.
      expect(
        RATIO_PRESERVING_FITS,
        `${label} : object-fit "${metric.objectFit}" ne préserve pas le ratio de l'image`,
      ).toContain(metric.objectFit);

      const fraction = visibleFraction(metric);
      expect(
        fraction,
        `${label} : ${(fraction * 100).toFixed(1)} % de l'image visible, sous le plancher de ${(MIN_VISIBLE_FRACTION * 100).toFixed(0)} % (object-fit: ${metric.objectFit})`,
      ).toBeGreaterThanOrEqual(MIN_VISIBLE_FRACTION);
    }
  });
}

import path from "node:path";
import { expect, test, type Page } from "playwright/test";
import { ROUTES } from "../qa.config";
import { projects } from "../../src/lib/projects";

/**
 * Viewports imposés par la tâche "Responsive QA" (Portfolio_QA/QA_PLAN.md,
 * détail de tâche) — volontairement distincts de VIEWPORTS dans
 * ../qa.config.ts, qui reste inchangé car partagé avec
 * qa/Functional/e2e-mobile.spec.ts (autre dossier, hors périmètre ici).
 */
const TASK_VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844", width: 390, height: 844 },
  { name: "375x667", width: 375, height: 667 },
  { name: "360x800", width: 360, height: 800 },
] as const;

const REPORT_SCREENSHOT_DIR = path.resolve(__dirname, "../Reports/Responsive");

// Breakpoint `sm` de Tailwind (40rem). En dessous, nav.tsx:38 masque les liens
// du nav desktop (`hidden sm:flex`) et MobileMenu prend le relais
// (mobile-menu.tsx:30, `sm:hidden`).
const SM_BREAKPOINT = 640;

// Projet servant de fiche de référence, dérivé des données plutôt que figé
// (même principe que la note POR-18 dans qa/qa.config.ts).
const PROJECT_UNDER_TEST = projects.find(
  (project) => project.href === ROUTES.projectWithDetail,
);
// Échec explicite plutôt que garde silencieuse, comme
// qa/Functional/project-page.spec.ts:34-40 : si le slug de référence changeait,
// `find` renverrait undefined et les assertions dérivées disparaîtraient sans
// que rien ne le signale.
if (!PROJECT_UNDER_TEST) {
  throw new Error(
    `Aucun projet pour ${ROUTES.projectWithDetail} dans src/lib/projects.ts : mettre à jour ROUTES.projectWithDetail (qa/qa.config.ts).`,
  );
}

/**
 * Vérifications communes à toutes les pages : absence d'overflow horizontal,
 * navigation (logo + lien Contact du Nav) visible et contenue dans le
 * viewport, toutes les <img> effectivement chargées (pas de dimension nulle).
 * src/components/nav.tsx n'utilise pas <nav> sémantique (simple <div>),
 * les liens sont donc ciblés par rôle/texte plutôt que par landmark.
 */
async function assertCommonLayout(page: Page, viewportWidth: number) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    scrollWidth,
    `overflow horizontal : scrollWidth=${scrollWidth}px > clientWidth=${clientWidth}px`,
  ).toBeLessThanOrEqual(clientWidth + 1);

  const logo = page.getByRole("link", { name: "Romain Cartia", exact: true });
  await expect(logo).toBeVisible();
  const logoBox = await logo.boundingBox();
  expect(logoBox, "logo Nav sans bounding box").not.toBeNull();
  if (logoBox) {
    expect(logoBox.x).toBeGreaterThanOrEqual(0);
    expect(logoBox.x + logoBox.width).toBeLessThanOrEqual(viewportWidth + 1);
  }

  // Le point d'entrée de navigation CHANGE avec le viewport : sous 640px les
  // liens du nav desktop sont en display:none (nav.tsx:38) et la navigation
  // passe par le hamburger (mobile-menu.tsx:30). L'exigence, elle, ne change
  // pas — il doit être visible et contenu dans le viewport.
  // Au-dessus : getByText plutôt que getByRole("link"), car sur /contact
  // (page active) nav.tsx:15-16 rend "Contact" en <span> inerte, pas en <a>.
  const navEntry =
    viewportWidth < SM_BREAKPOINT
      ? page.getByRole("button", { name: "Ouvrir le menu" })
      : page.getByText("Contact", { exact: true });
  await expect(navEntry).toBeVisible();
  const navBox = await navEntry.boundingBox();
  expect(navBox, "point d'entrée de navigation du Nav sans bounding box").not.toBeNull();
  if (navBox) {
    expect(navBox.x + navBox.width).toBeLessThanOrEqual(viewportWidth + 1);
  }

  const brokenImages = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img"))
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.src),
  );
  expect(brokenImages, `images cassées : ${brokenImages.join(", ")}`).toHaveLength(0);
}

/** Bouton = zone tactile atteignable : visible, dans le viewport, hauteur exploitable. */
async function assertButtonAccessible(page: Page, name: string, viewportWidth: number) {
  const button = page.getByRole("link", { name, exact: true }).or(
    page.getByRole("button", { name, exact: true }),
  );
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box, `bouton "${name}" sans bounding box`).not.toBeNull();
  if (box) {
    expect(box.height, `bouton "${name}" trop petit (${box.height}px)`).toBeGreaterThanOrEqual(32);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
  }
}

// Chaque test capture une screenshot `fullPage`. Sur mobile-chromium
// (Pixel 7, deviceScaleFactor 3), un viewport 1920x1080 représente un backing
// store de ~5760x3240 : la capture seule frôle les 30 s du timeout par défaut,
// et bascule sous la charge du run complet (2 workers). Mesuré, croissance
// monotone avec l'aire : 2,6 s à 375x667, 13,4 s à 768x1024, 31,4 s à
// 1920x1080 — un coût de capture, pas une lenteur du site.
// Budget indexé sur le viewport plutôt qu'appliqué à plat : un budget unique
// de 90 s donnerait aux petites tailles une marge x35, où plus aucune
// régression de performance ne serait détectable par timeout.
function captureBudgetMs(viewportWidth: number) {
  return viewportWidth >= 1280 ? 90_000 : 30_000;
}

test.describe("responsive: accueil", () => {
  for (const viewport of TASK_VIEWPORTS) {
    test(`accueil @ ${viewport.name}`, async ({ page }) => {
      test.setTimeout(captureBudgetMs(viewport.width));
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.home);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByRole("heading", { level: 1, name: "Construire, créer, imaginer en pilotant l'IA." }),
      ).toBeVisible();

      await assertCommonLayout(page, viewport.width);
      await assertButtonAccessible(page, "Me contacter", viewport.width);

      // Grille de projets : les cartes déclarées dans src/lib/projects.ts.
      const cards = page.locator("#projets a");
      await expect(cards).toHaveCount(projects.length);

      await page.screenshot({
        path: path.join(REPORT_SCREENSHOT_DIR, `accueil-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }
});

test.describe("responsive: fiche projet (noiseless-mind)", () => {
  for (const viewport of TASK_VIEWPORTS) {
    test(`fiche-projet-noiseless-mind @ ${viewport.name}`, async ({ page }) => {
      test.setTimeout(captureBudgetMs(viewport.width));
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.projectWithDetail);
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { level: 1, name: "Noiseless Mind" })).toBeVisible();

      await assertCommonLayout(page, viewport.width);
      // Le CTA démo n'est rendu que si le projet déclare un `demoHref`
      // (src/app/projets/[slug]/page.tsx:112-115), ce qu'aucun ne fait à ce
      // jour. Les DEUX branches assèrent : sans la seconde, la garde
      // s'auto-désactive et le test devient un no-op silencieux.
      if (PROJECT_UNDER_TEST.detail?.demoHref) {
        await assertButtonAccessible(page, "Voir la démo", viewport.width);
      } else {
        await expect(
          page.getByRole("link", { name: "Voir la démo", exact: true }),
          "CTA démo rendu alors qu'aucun `demoHref` n'est déclaré",
        ).toHaveCount(0);
      }
      await assertButtonAccessible(page, "Voir le projet", viewport.width);

      await page.screenshot({
        path: path.join(REPORT_SCREENSHOT_DIR, `fiche-projet-noiseless-mind-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }
});

test.describe("responsive: contact", () => {
  for (const viewport of TASK_VIEWPORTS) {
    test(`contact @ ${viewport.name}`, async ({ page }) => {
      test.setTimeout(captureBudgetMs(viewport.width));
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.contact);
      await page.waitForLoadState("networkidle");

      await assertCommonLayout(page, viewport.width);

      const emailInput = page.getByLabel("Email", { exact: true });
      const messageInput = page.getByLabel("Message", { exact: true });
      await expect(emailInput).toBeVisible();
      await expect(messageInput).toBeVisible();

      for (const [labelName, field] of [
        ["Email", emailInput],
        ["Message", messageInput],
      ] as const) {
        const box = await field.boundingBox();
        expect(box, `champ "${labelName}" sans bounding box`).not.toBeNull();
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
        }
      }

      await assertButtonAccessible(page, "Envoyer", viewport.width);

      await page.screenshot({
        path: path.join(REPORT_SCREENSHOT_DIR, `contact-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }
});

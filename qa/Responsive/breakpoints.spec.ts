import path from "node:path";
import { expect, test, type Page } from "playwright/test";
import { ROUTES } from "../qa.config";

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

  const logo = page.getByRole("link", { name: "Saldyr", exact: true });
  await expect(logo).toBeVisible();
  const logoBox = await logo.boundingBox();
  expect(logoBox, "logo Nav sans bounding box").not.toBeNull();
  if (logoBox) {
    expect(logoBox.x).toBeGreaterThanOrEqual(0);
    expect(logoBox.x + logoBox.width).toBeLessThanOrEqual(viewportWidth + 1);
  }

  // getByText plutôt que getByRole("link") : sur /contact (page active),
  // nav.tsx:15-16 rend "Contact" en <span> inerte, pas en <a> — le même
  // élément textuel doit rester détecté dans les deux cas.
  const contactLink = page.getByText("Contact", { exact: true });
  await expect(contactLink).toBeVisible();
  const contactBox = await contactLink.boundingBox();
  expect(contactBox, "lien Contact du Nav sans bounding box").not.toBeNull();
  if (contactBox) {
    expect(contactBox.x + contactBox.width).toBeLessThanOrEqual(viewportWidth + 1);
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

test.describe("responsive: accueil", () => {
  for (const viewport of TASK_VIEWPORTS) {
    test(`accueil @ ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.home);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByRole("heading", { level: 1, name: "Je construis des agents, des jeux et des outils web." }),
      ).toBeVisible();

      await assertCommonLayout(page, viewport.width);
      await assertButtonAccessible(page, "Voir les projets", viewport.width);
      await assertButtonAccessible(page, "Me contacter", viewport.width);

      // Grille de projets : les 3 cartes déclarées dans src/lib/projects.ts.
      const cards = page.locator("#projets a");
      await expect(cards).toHaveCount(3);

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
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.projectWithDetail);
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { level: 1, name: "Noiseless Mind" })).toBeVisible();

      await assertCommonLayout(page, viewport.width);
      await assertButtonAccessible(page, "Voir la démo", viewport.width);
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

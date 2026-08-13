import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";

test("metadata: title/description définis sur la home", async ({ page }) => {
  await page.goto(ROUTES.home);

  await expect(page).toHaveTitle("Saldyr — développeur full-stack");
  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute(
    "content",
    "Portfolio de Saldyr, développeur full-stack junior. Projets, à propos et contact.",
  );
});

test("metadata: title/description définis sur project-page", async ({ page }) => {
  await page.goto(ROUTES.projectWithDetail);

  await expect(page).toHaveTitle("Noiseless Mind — Saldyr");
  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute(
    "content",
    "Jeu d'horreur atmosphérique dans la ville abandonnée de Fogreach, inspiré de Silent Hill.",
  );
});

// Absence d'opengraph-image constatée dans QA_PLAN.md section 1 (gap connu,
// hors périmètre de correction de cette tâche — cf. qa/Reports/seo-audit.md).
test.fixme("metadata: balises Open Graph présentes", async () => {});

// Aucun `alternates.canonical` déclaré dans layout.tsx ou generateMetadata
// (fichier project-page) — gap constaté à l'audit, non corrigé (hors
// périmètre : voir qa/Reports/seo-audit.md, finding HIGH-1).
test.fixme("metadata: canonical présent sur chaque page", async () => {});

test("metadata: favicon et apple-icon servis", async ({ request }) => {
  const icon = await request.get("/icon.png");
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/png");

  const appleIcon = await request.get("/apple-icon.png");
  expect(appleIcon.status()).toBe(200);
  expect(appleIcon.headers()["content-type"]).toContain("image/png");
});

test("metadata: <link> icon/apple-touch-icon référencés dans le <head>", async ({ page }) => {
  await page.goto(ROUTES.home);

  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute(
    "href",
    /\/icon\.png/,
  );
  await expect(page.locator('link[rel="apple-touch-icon"]').first()).toHaveAttribute(
    "href",
    /\/apple-icon\.png/,
  );
});

test("metadata: viewport présent et mobile-friendly", async ({ page }) => {
  await page.goto(ROUTES.home);

  const viewport = page.locator('meta[name="viewport"]');
  await expect(viewport).toHaveAttribute("content", /width=device-width/);
});

test("metadata: H1 unique sur la home", async ({ page }) => {
  await page.goto(ROUTES.home);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("metadata: H1 unique sur project-page", async ({ page }) => {
  await page.goto(ROUTES.projectWithDetail);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("metadata: hiérarchie headings cohérente sur la home (pas de niveau sauté)", async ({
  page,
}) => {
  await page.goto(ROUTES.home);

  const levels = await page.$$eval("h1, h2, h3, h4, h5, h6", (nodes) =>
    nodes.map((node) => Number(node.tagName[1])),
  );

  expect(levels[0]).toBe(1);
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  }
});

test("metadata: hiérarchie headings cohérente sur project-page (pas de niveau sauté)", async ({
  page,
}) => {
  await page.goto(ROUTES.projectWithDetail);

  const levels = await page.$$eval("h1, h2, h3, h4, h5, h6", (nodes) =>
    nodes.map((node) => Number(node.tagName[1])),
  );

  expect(levels[0]).toBe(1);
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  }
});

test("metadata: liens de navigation crawlables (href réel, pas de JS-only nav)", async ({
  page,
}) => {
  await page.goto(ROUTES.home);

  // Tous les <a> de la grille projets et de la nav doivent porter un href
  // absolu ou relatif exploitable par un crawler (pas de href="#" vide ni
  // de navigation pilotée uniquement par onClick).
  const hrefs = await page.$$eval("a", (nodes) =>
    nodes.map((node) => node.getAttribute("href")),
  );

  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    expect(href).not.toBeNull();
    expect(href).not.toBe("");
    expect(href).not.toBe("#");
  }
});

test("metadata: URLs propres (pas de query string ni de casse incohérente)", async ({
  page,
}) => {
  await page.goto(ROUTES.home);

  const hrefs = await page.$$eval("a", (nodes) =>
    nodes
      .map((node) => node.getAttribute("href"))
      .filter((href): href is string => !!href && href.startsWith("/")),
  );

  for (const href of hrefs) {
    expect(href).not.toContain("?");
    expect(href).toBe(href.toLowerCase());
  }
});

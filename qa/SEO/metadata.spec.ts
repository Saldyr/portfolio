import { expect, test } from "playwright/test";
import { projects } from "@/lib/projects";
import { SITE_NAME, SITE_TITLE } from "@/lib/site";
import { ROUTES } from "../qa.config";

/**
 * `og:image` est une URL ABSOLUE, bâtie par Next.js sur `metadataBase` =
 * SITE_URL (src/lib/site-url.ts), qui retombe sur http://localhost:3000 hors
 * Vercel — alors que la suite tourne sur un autre port (qa/qa.config.ts).
 * La récupérer telle quelle vise un serveur inexistant (socket hang up).
 * Gap prévu à l'audit : qa/Reports/seo-audit-2026-08-13.md, MEDIUM-1.
 *
 * L'assertion sur le CONTENU de la balise est conservée telle quelle ; seule
 * la REQUÊTE est redirigée vers le serveur sous test, via le baseURL du
 * contexte `request` (qa/playwright.config.ts).
 */
function serverPath(absoluteUrl: string) {
  const url = new URL(absoluteUrl);
  return `${url.pathname}${url.search}`;
}

/**
 * Description de la home, écrite ici plutôt qu'importée de src/app/layout.tsx :
 * ce module tire next/font, inimportable depuis une spec Playwright. Le
 * littéral est donc la valeur ATTENDUE — mais UN seul, au lieu des deux
 * exemplaires qu'en portaient les tests title et Open Graph.
 */
const HOME_DESCRIPTION =
  "Portfolio de Romain Cartia, développeur full-stack junior. Projets, à propos et contact.";

test("metadata: title/description définis sur la home", async ({ page }) => {
  await page.goto(ROUTES.home);

  await expect(page).toHaveTitle(SITE_TITLE);
  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute("content", HOME_DESCRIPTION);
});

test("metadata: title/description définis sur project-page", async ({ page }) => {
  // POR-43 : titre ET description dérivés de src/lib/projects.ts, jamais
  // recopiés. generateMetadata bâtit le titre en `${project.title} — Saldyr`
  // (src/app/projets/[slug]/page.tsx:29) et émet `detail.subtitle` tel quel
  // (:30) ; figer ces chaînes ici les reperime à chaque réécriture de contenu,
  // ce qui s'est déjà produit deux fois sur ce projet. Les deux assertions
  // suivent la même source : une bascule de ROUTES.projectWithDetail vers un
  // autre projet ne peut pas en désynchroniser une seule. « Saldyr » reste
  // littéral à dessein — c'est openGraph.siteName (src/app/layout.tsx:27), pas
  // le titre du site ; y substituer SITE_TITLE changerait l'attendu.
  const project = projects.find((candidate) => candidate.href === ROUTES.projectWithDetail);
  if (!project?.detail) {
    throw new Error(
      `Aucun projet avec \`detail\` pour ${ROUTES.projectWithDetail} dans src/lib/projects.ts : mettre à jour ROUTES.projectWithDetail (qa/qa.config.ts).`,
    );
  }

  await page.goto(ROUTES.projectWithDetail);

  await expect(page).toHaveTitle(`${project.title} — Saldyr`);
  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute("content", project.detail.subtitle);
});

test("metadata: balises Open Graph présentes sur la home", async ({ page, request }) => {
  await page.goto(ROUTES.home);

  // og:title n'est pas déclaré dans layout.tsx : Next.js retombe sur `title`,
  // donc sur la même constante.
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    SITE_TITLE,
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    HOME_DESCRIPTION,
  );

  const imageUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(imageUrl).toBeTruthy();
  const image = await request.get(serverPath(imageUrl!));
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
});

test("metadata: balises Open Graph présentes sur project-page, distinctes de la home", async ({
  page,
  request,
}) => {
  await page.goto(ROUTES.projectWithDetail);

  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Noiseless Mind — Saldyr",
  );

  const imageUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(imageUrl).toBeTruthy();
  expect(imageUrl).toContain("/projets/noiseless-mind/opengraph-image");

  const image = await request.get(serverPath(imageUrl!));
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
});

/**
 * POR-46 — INVARIANT, pas recopie : l'`alt` de l'image Open Graph doit être le
 * titre de la page. Les trois `alt` étaient des littéraux figés, et celui de la
 * home était resté sur « Saldyr — développeur full-stack », périmé depuis le
 * changement de titre de POR-43 — sans aucune assertion sur `og:image:alt`,
 * rien ne pouvait le signaler.
 *
 * Deux assertions, deux rôles distincts. Le titre est confronté à la constante
 * partagée : c'est ce qui prouve que la page consomme bien SITE_NAME plutôt
 * qu'un suffixe réécrit à la main. L'alt, lui, est confronté au titre
 * RÉELLEMENT SERVI, relu de la page — jamais à une chaîne écrite ici. Une
 * réécriture de titre ne peut donc pas reperimer cette seconde assertion, elle
 * ne peut que révéler une désynchronisation.
 */
const TITLED_ROUTES = [
  { label: "home", route: ROUTES.home, title: SITE_TITLE },
  { label: "a-propos", route: ROUTES.aPropos, title: `À propos — ${SITE_NAME}` },
  { label: "contact", route: ROUTES.contact, title: `Contact — ${SITE_NAME}` },
] as const;

for (const { label, route, title } of TITLED_ROUTES) {
  test(`metadata: titre centralisé et og:image:alt aligné (${label})`, async ({ page }) => {
    await page.goto(route);

    await expect(page).toHaveTitle(title);

    // Relu de la page, et NON repris de `title` : c'est ce qui fait de
    // l'assertion suivante un invariant (« l'alt EST le titre servi ») plutôt
    // qu'une seconde comparaison à la même constante attendue.
    const served = await page.title();
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      served,
    );
  });
}

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

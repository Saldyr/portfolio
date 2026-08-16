import { expect, test } from "playwright/test";
import { projects } from "@/lib/projects";
import { ROUTES } from "../qa.config";

// sitemap.ts/robots.ts créés (src/app/sitemap.ts, src/app/robots.ts) — gap
// QA_PLAN.md section 1 comblé, jugé pertinent pour un portfolio public.

test("sitemap: /sitemap.xml accessible et valide", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("xml");

  const body = await response.text();
  expect(body).toContain("<urlset");
  expect(body).toContain(`<loc>`);
  expect(body).toMatch(/<loc>https?:\/\/[^<]+<\/loc>/);
  // Ancre littérale : documente qu'un projet avec `detail` est bien indexé.
  // Ne conditionne pas la comparaison ensembliste ci-dessous, qui échoue déjà
  // seule si le sitemap est vide (expectedProjectPaths reste à sa taille réelle).
  expect(body).toContain(ROUTES.projectWithDetail);

  const allPaths = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1]).pathname,
  );
  // Perte de couverture POR-17 : l'entrée home (src/app/sitemap.ts) doit rester listée.
  expect(allPaths).toContain("/");

  // Le sitemap liste exactement les projets ayant un `detail` (src/app/sitemap.ts).
  // Les projets sans `detail` (src/lib/projects.ts) n'ont pas de route locale à
  // indexer (page non générée, ou `href` externe). Comparaison sur les pathname,
  // pas sur les URL absolues : SITE_URL (src/lib/site-url.ts) vaut localhost:3000
  // hors Vercel alors que la suite tourne sur un autre port (qa/playwright.config.ts).
  const sitemapProjectPaths = allPaths
    .filter((pathname) => pathname.startsWith("/projets/"))
    .sort();
  const expectedProjectPaths = projects
    .filter((project) => project.detail)
    .map((project) => project.href)
    .sort();
  expect(sitemapProjectPaths).toEqual(expectedProjectPaths);
});

test("robots: /robots.txt accessible et valide", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");

  const body = await response.text();
  expect(body).toMatch(/User-agent:\s*\*/i);
  expect(body).toMatch(/Allow:\s*\//i);
  expect(body).toContain("Sitemap:");
  expect(body).toContain("/sitemap.xml");
});

import { expect, test } from "playwright/test";
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
  // Home et la seule fiche projet statique (noiseless-mind) doivent être listées.
  expect(body).toMatch(/<loc>https?:\/\/[^<]+<\/loc>/);
  expect(body).toContain(ROUTES.projectWithDetail);
  // Le projet sans detail (redirige vers /#projets) ne doit pas avoir d'URL dédiée.
  expect(body).not.toContain("/projets/hermes-agent");
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

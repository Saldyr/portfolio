import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";

// Constat initial (QA_PLAN.md section 1) : pas de headers() dans
// next.config.ts. Ces tests vérifient l'état réel du serveur de prod — un
// échec documente une lacune réelle, il ne signale pas un bug du test.
// Correction hors périmètre de cette tâche (audit, pas remédiation) : voir
// qa/Reports/security-*.md pour la classification et la preuve.

test("headers: Content-Security-Policy présent", async ({ request }) => {
  const response = await request.get(ROUTES.home);
  expect(response.headers()["content-security-policy"]).toBeTruthy();
});

test("headers: X-Frame-Options présent", async ({ request }) => {
  const response = await request.get(ROUTES.home);
  expect(response.headers()["x-frame-options"]).toBeTruthy();
});

test("headers: Referrer-Policy présent", async ({ request }) => {
  const response = await request.get(ROUTES.home);
  expect(response.headers()["referrer-policy"]).toBeTruthy();
});

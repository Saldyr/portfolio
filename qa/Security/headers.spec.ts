import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";

// Ces tests vérifient l'état réel du serveur de prod. Les en-têtes sont posés
// par `headers()` dans next.config.ts (POR-48) ; un échec ici signale donc une
// régression de configuration, pas un bug du test.
// Limite connue : seule la PRÉSENCE est assertée, jamais la valeur — une CSP
// vidée ou affaiblie resterait verte. Durcissement porté par POR-50.

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

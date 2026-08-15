import { expect, test } from "playwright/test";
import { ROUTES, VIEWPORTS } from "../qa.config";

// Parcours E2E "Mobile" : Nav (src/components/nav.tsx) n'a pas de menu
// hamburger — c'est un simple conteneur flex-wrap, tous les liens restent
// visibles sans toggle. Le parcours vérifie donc l'absence d'overflow
// horizontal et que le flux home -> projet -> retour -> contact fonctionne
// à 375px (VIEWPORTS.mobile), plutôt qu'un menu qui n'existe pas.
test.use({ viewport: VIEWPORTS.mobile });

test("e2e mobile: home -> projet -> retour -> contact en viewport 375px", async ({ page }) => {
  await page.goto(ROUTES.home);

  await expect(page.getByRole("link", { name: "Contact", exact: true })).toBeVisible();

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  await page.locator("#projets").getByText("Noiseless Mind", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Noiseless Mind" })).toBeVisible();

  await page.goBack();
  // Honeypot : court-circuite en succès avant tout appel Resend (voir
  // e2e-contact.spec.ts) — sans ça, ce test envoyait un vrai email à chaque run.
  await page.locator('input[name="company"]').fill("bot-value", { force: true });
  await page.getByLabel("Email").fill("mobile@example.com");
  await page.getByLabel("Message").fill("Test depuis mobile.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).toBeVisible();
});

import { expect, test } from "playwright/test";
import { ROUTES, VIEWPORTS } from "../qa.config";

// Parcours E2E "Mobile" à 375px (VIEWPORTS.mobile) : POR-21 — Nav
// (src/components/nav.tsx) masque désormais ses liens sous `sm`, remplacés
// par MobileMenu (bouton "Ouvrir le menu" + overlay, voir
// e2e-contact.spec.ts) ; le commentaire précédent ("pas de menu hamburger")
// décrivait une version antérieure du composant. Le site a aussi été scindé
// en 4 routes réelles (home, a-propos, contact, projet) : il n'y a plus de
// formulaire de contact intégré à la home, il faut naviguer vers /contact.
// Le parcours vérifie l'absence d'overflow horizontal et le flux réel
// home -> projet -> retour -> contact (via le menu mobile) à cette largeur.
test.use({ viewport: VIEWPORTS.mobile });

test("e2e mobile: home -> projet -> retour -> contact en viewport 375px", async ({ page }) => {
  await page.goto(ROUTES.home);

  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.getByRole("link", { name: "Contact", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  await page.locator("#projets").getByText("Noiseless Mind", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Noiseless Mind" })).toBeVisible();

  await page.goBack();
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page).toHaveURL(ROUTES.contact);

  // Honeypot : court-circuite en succès avant tout appel Resend (voir
  // e2e-contact.spec.ts) — sans ça, ce test envoyait un vrai email à chaque run.
  await page.locator('input[name="company"]').fill("bot-value", { force: true });
  await page.getByLabel("Email").fill("mobile@example.com");
  await page.getByLabel("Message").fill("Test depuis mobile.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).toBeVisible();
});

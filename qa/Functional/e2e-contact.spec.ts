import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";

// Parcours E2E "Contact" : navigation depuis le nav vers /contact (route
// dédiée, plus une ancre #contact sur la home), une tentative invalide
// fermée manuellement, puis un succès dérivé du serveur via honeypot — pas
// un envoi valide réel (voir contact-form.spec.ts : .env.local contient une
// vraie clé RESEND_API_KEY).
test("e2e contact: navigation vers /contact, erreur puis succès serveur (honeypot)", async ({
  page,
}) => {
  await page.goto(ROUTES.home);

  // Nav (src/components/nav.tsx) : les liens desktop sont masqués sous `sm`,
  // remplacés par MobileMenu (bouton + overlay) — les deux projets Playwright
  // (desktop/mobile) passent par ce même test.
  const desktopContactLink = page.getByRole("link", { name: "Contact", exact: true });
  if (await desktopContactLink.isVisible()) {
    await desktopContactLink.click();
  } else {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.getByRole("link", { name: "Contact", exact: true }).click();
  }
  await expect(page).toHaveURL(ROUTES.contact);

  await page.getByLabel("Email").fill("adresse-invalide");
  await page.getByLabel("Message").fill("Bonjour, je découvre le portfolio.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Adresse email invalide.")).toBeVisible();
  await page.getByRole("button", { name: "Fermer la notification" }).click();

  // React réinitialise les champs non-contrôlés après chaque action —
  // il faut donc tout remplir à nouveau, pas seulement l'email corrigé.
  await page.locator('input[name="company"]').fill("bot-value", { force: true });
  await page.getByLabel("Email").fill("contact@example.com");
  await page.getByLabel("Message").fill("Bonjour, je découvre le portfolio.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).toBeVisible();
});

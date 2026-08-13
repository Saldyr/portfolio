import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";

// Parcours E2E "Contact" : navigation depuis le nav jusqu'au formulaire,
// une tentative invalide fermée manuellement, puis un envoi valide.
test("e2e contact: navigation vers #contact, erreur puis envoi valide", async ({ page }) => {
  await page.goto(ROUTES.home);

  await page.getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page.locator("#contact")).toBeInViewport();

  await page.getByLabel("Email").fill("adresse-invalide");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(
    page.getByText("Envoi impossible. Vérifie ton adresse email."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fermer la notification" }).click();

  await page.getByLabel("Email").fill("contact@example.com");
  await page.getByLabel("Message").fill("Bonjour, je découvre le portfolio.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).toBeVisible();
});

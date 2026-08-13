import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";

// ContactForm (src/components/contact-form.tsx) est entièrement client,
// aucun appel réseau réel (QA_PLAN.md section 6, risque 2) : la seule
// validation est un regex JS sur l'email dans handleSend(). Le champ email
// est type="text" (pas type="email"), aucun champ n'a l'attribut `required`,
// et le textarea "message" n'est même pas contrôlé — son contenu n'influence
// jamais le résultat. Ces tests valident ce comportement réel, pas un envoi
// serveur supposé.

test.beforeEach(async ({ page }) => {
  await page.goto(ROUTES.home);
});

test("contact-form: champ email vide affiche une erreur de validation", async ({ page }) => {
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(
    page.getByText("Envoi impossible. Vérifie ton adresse email."),
  ).toBeVisible();
});

test("contact-form: email invalide affiche une erreur de validation", async ({ page }) => {
  await page.getByLabel("Email").fill("pas-un-email");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(
    page.getByText("Envoi impossible. Vérifie ton adresse email."),
  ).toBeVisible();
});

test("contact-form: aucun champ n'a l'attribut HTML5 required (comportement réel)", async ({
  page,
}) => {
  await expect(page.getByLabel("Email")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Message")).not.toHaveAttribute("required");
});

test("contact-form: soumission valide affiche un toast de succès simulé", async ({ page }) => {
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Message").fill("Un message de test.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).toBeVisible();
});

test("contact-form: le toast d'erreur reste affiché jusqu'à fermeture manuelle", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Envoyer" }).click();
  const toast = page.getByText("Envoi impossible. Vérifie ton adresse email.");
  await expect(toast).toBeVisible();

  // Le toast succès se ferme seul après 4s (dismissTimer), le toast erreur non
  // (cf. handleSend: `if (next?.type !== "error")`).
  await page.waitForTimeout(4200);
  await expect(toast).toBeVisible();

  await page.getByRole("button", { name: "Fermer la notification" }).click();
  await expect(toast).not.toBeVisible();
});

test("contact-form: soumission ne déclenche aucun appel réseau", async ({ page }) => {
  await page.waitForLoadState("networkidle");

  // On ne suit que fetch/XHR (un appel backend potentiel), pas la totalité
  // du trafic de la page : les ProjectCard voisines chargent leurs images
  // en lazy-loading via IntersectionObserver, sans rapport avec le formulaire.
  // On exclut aussi les requêtes de prefetch RSC (`?_rsc=`) : Next.js
  // précharge automatiquement les <Link> visibles à l'écran (ProjectCard,
  // nav, footer) via fetch, à un instant non déterministe — sans rapport
  // avec la soumission du formulaire.
  const requests: string[] = [];
  page.on("request", (req) => {
    if (!["fetch", "xhr"].includes(req.resourceType())) return;
    if (new URL(req.url()).searchParams.has("_rsc")) return;
    requests.push(req.url());
  });

  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Message").fill("Un message de test.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).toBeVisible();

  expect(requests, `Requêtes inattendues: ${requests.join(", ")}`).toEqual([]);
});

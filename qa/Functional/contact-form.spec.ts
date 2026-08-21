import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";

// ContactForm (src/components/contact-form.tsx) poste vers la Server Action
// sendContactMessage (src/app/contact/actions.ts) : email non-`required` mais
// validé côté serveur (regex), message `required` en HTML5 et revalidé côté
// serveur, honeypot `company` qui court-circuite en succès *avant* tout accès
// à Resend (actions.ts:23-25). L'état loading/erreur/succès est entièrement
// dérivé de la réponse serveur (useActionState).
//
// Important : ne jamais soumettre ici un formulaire valide SANS honeypot —
// .env.local contient une vraie clé RESEND_API_KEY, un tel envoi partirait
// réellement. Le chemin honeypot déclenche le même rendu de succès sans
// jamais appeler Resend, et sert de doublure sûre pour tester le succès.

test.beforeEach(async ({ page }) => {
  await page.goto(ROUTES.contact);
});

test("contact-form: message vide bloqué par le required HTML5, aucune requête", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST") requests.push(req.url());
  });

  await page.getByLabel("Email").fill("test@example.com");
  await page.getByRole("button", { name: "Envoyer" }).click();

  await expect(
    page.getByText("Message envoyé. Réponse sous 48 h."),
  ).not.toBeVisible();
  await expect(
    page.getByLabel("Message").evaluate((el: HTMLTextAreaElement) => el.validity.valid),
  ).resolves.toBe(false);
  expect(requests).toEqual([]);
});

test("contact-form: email invalide affiche l'erreur retournée par le serveur", async ({
  page,
}) => {
  await page.getByLabel("Email").fill("pas-un-email");
  await page.getByLabel("Message").fill("Un message de test.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Adresse email invalide.")).toBeVisible();
});

test("contact-form: email sans required, message avec required (comportement réel)", async ({
  page,
}) => {
  await expect(page.getByLabel("Email")).not.toHaveAttribute("required");
  await expect(page.getByLabel("Message")).toHaveAttribute("required", "");
});

test("contact-form: honeypot rempli renvoie un succès serveur sans appeler Resend", async ({
  page,
}) => {
  // Simule un bot qui remplit tous les champs, y compris le piège caché.
  await page.locator('input[name="company"]').fill("bot-value", { force: true });
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Message").fill("Un message de test.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).toBeVisible();
});

test("contact-form: le toast d'erreur reste affiché jusqu'à fermeture manuelle", async ({
  page,
}) => {
  await page.getByLabel("Email").fill("pas-un-email");
  await page.getByLabel("Message").fill("Un message de test.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  const toast = page.getByText("Adresse email invalide.");
  await expect(toast).toBeVisible();

  await page.waitForTimeout(4200);
  await expect(toast).toBeVisible();

  await page.getByRole("button", { name: "Fermer la notification" }).click();
  await expect(toast).not.toBeVisible();
});

test("contact-form: le toast de succès (honeypot) se ferme seul après ~4s", async ({
  page,
}) => {
  await page.locator('input[name="company"]').fill("bot-value", { force: true });
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Message").fill("Un message de test.");
  await page.getByRole("button", { name: "Envoyer" }).click();

  const toast = page.getByText("Message envoyé. Réponse sous 48 h.");
  await expect(toast).toBeVisible();
  await page.waitForTimeout(4200);
  await expect(toast).not.toBeVisible();
});

test("contact-form: le bouton est désactivé pendant la Server Action (état loading serveur)", async ({
  page,
}) => {
  let intercepted = 0;
  // Barrière tenue par le test, pas délai fixe : le handler retient la requête
  // Server Action jusqu'à ce que l'état `pending` ait été constaté. Un délai
  // n'ouvre qu'une fenêtre, que l'assertion peut manquer sous charge — et
  // `toBeDisabled()` ne ramène pas un état déjà refermé (POR-49). Ici la
  // fenêtre reste ouverte exactement aussi longtemps qu'il faut.
  let releasePendingWindow!: () => void;
  const pendingObserved = new Promise<void>((resolve) => {
    releasePendingWindow = resolve;
  });

  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) {
      intercepted += 1;
      await pendingObserved;
    }
    await route.continue();
  });

  await page.locator('input[name="company"]').fill("bot-value", { force: true });
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Message").fill("Un message de test.");

  try {
    // Le clic est DANS le try : s'il lève après avoir déclenché la soumission,
    // le finally libère quand même le handler — sinon l'erreur de clic se
    // déguiserait en timeout, le mode d'échec que ce finally supprime.
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByRole("button", { name: "Envoi..." })).toBeDisabled();
  } finally {
    // Sans ce finally, une assertion en échec laisserait le handler bloqué :
    // l'échec réel se déguiserait en timeout du test.
    releasePendingWindow();
  }

  await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).toBeVisible();
  expect(intercepted, "aucune requête Server Action interceptée").toBeGreaterThan(0);
});

test("contact-form: une soumission valide déclenche un appel réseau réel vers la Server Action", async ({
  page,
}) => {
  // Remplace l'ancien test "aucun appel réseau" (comportement disparu avec
  // POR-5) : on vérifie désormais qu'un POST vers la Server Action a bien
  // lieu. Chemin honeypot pour ne pas déclencher un vrai envoi Resend.
  const actionRequests: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.headers()["next-action"]) {
      actionRequests.push(req.url());
    }
  });

  await page.locator('input[name="company"]').fill("bot-value", { force: true });
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Message").fill("Un message de test.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).toBeVisible();

  expect(actionRequests).toHaveLength(1);
});

test("contact-form: défense en profondeur — le serveur rejette un message vide même si le required HTML5 est contourné", async ({
  page,
}) => {
  await page.getByLabel("Message").evaluate((el: HTMLTextAreaElement) => {
    el.removeAttribute("required");
  });

  await page.getByLabel("Email").fill("test@example.com");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Le message ne peut pas être vide.")).toBeVisible();
});

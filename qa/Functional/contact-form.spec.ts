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
  // `toBeDisabled()` ne ramène pas un état déjà refermé. Ici la
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
  // Vérifie qu'un POST vers la Server Action a bien lieu à la soumission.
  // Chemin honeypot pour ne pas déclencher un vrai envoi Resend.
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

// Plafonds de longueur : sans borne, un seul POST pousse un corps de plusieurs
// centaines de kilo-octets jusqu'à Resend et dans la boîte de réception.
//
// Les deux cas ci-dessous sont sûrs sans honeypot, contrairement à la consigne
// générale du haut de ce fichier : les deux contrôles de longueur sont placés
// AVANT le limiteur et avant tout accès à Resend (src/app/contact/actions.ts),
// donc ces soumissions retournent sans rien envoyer et sans consommer de quota.

test("contact-form: un message au-delà de 5000 caractères est rejeté avec un message explicite", async ({
  page,
}) => {
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Message").fill("a".repeat(5001));
  await page.getByRole("button", { name: "Envoyer" }).click();

  await expect(
    page.getByText("Le message est trop long (5000 caractères maximum)."),
  ).toBeVisible();
  await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).not.toBeVisible();
});

test("contact-form: une adresse au-delà de 254 caractères est rejetée bien qu'elle passe la regex", async ({
  page,
}) => {
  // Valide au sens d'EMAIL_PATTERN (`.+@.+\..+`) et longue de 255 caractères :
  // seule la borne RFC 5321 peut la rejeter. Sans elle, ce test passerait au
  // travers — c'est ce qui distingue cette assertion de celle sur "pas-un-email".
  const tooLong = `${"a".repeat(250)}@e.fr`;
  expect(tooLong.length).toBe(255);

  await page.getByLabel("Email").fill(tooLong);
  await page.getByLabel("Message").fill("Un message de test.");
  await page.getByRole("button", { name: "Envoyer" }).click();

  await expect(page.getByText("Adresse email invalide.")).toBeVisible();
});

import { expect, test, type Page, type TestInfo } from "playwright/test";
import { ROUTES } from "../qa.config";

// POR-51 — plafond de fréquence sur sendContactMessage (src/app/contact/actions.ts).
//
// Cette suite asserte les DEUX sens, et c'est délibéré : le dispositif peut
// échouer de deux façons, toutes deux muettes.
//   - trop permissif  -> il ne protège rien, personne ne le remarque ;
//   - trop strict     -> il refuse de vrais visiteurs, et un visiteur bloqué
//                        ne se plaint pas : il part.
// Un test qui n'asserte que le blocage laisse passer le second, qui est le plus
// coûteux sur un site dont la fonction même est de recevoir des messages.
//
// Seul endroit du dépôt qui soumet un formulaire VALIDE SANS honeypot — les
// autres suites passent toutes par le piège ou par une saisie invalide
// (qa/Functional/contact-form.spec.ts:11-14). C'est indispensable ici : le
// limiteur est placé après les validations, donc inatteignable autrement. D'où
// le canari ci-dessous, qui doit rester la première assertion exécutée.
//
// Le serveur QA tourne RESEND_API_KEY vidée (qa/playwright.config.ts:48) : une
// soumission valide franchit le limiteur puis ressort sur le chemin « clé
// absente » de actions.ts, sans jamais toucher Resend. C'est ce qui rend le
// plafond exerçable sans envoyer d'email — et c'est aussi pourquoi le compteur
// GLOBAL, qui ne s'incrémente que juste avant un appel Resend réel, ne bouge
// jamais d'un run à l'autre. Aucune fuite d'état entre exécutions.

// Doit rester aligné sur PER_IP.max (src/lib/contact-rate-limit.ts). Codé en
// dur et non importé : le module porte `import "server-only"`, qui le rend
// inimportable depuis une spec Playwright — c'est ce qui avait fait échouer
// POR-42 (voir src/lib/site.ts:41-46).
const IP_LIMIT = 3;

const NO_KEY_MESSAGE = "Envoi impossible pour le moment. Réessaie plus tard.";
const RATE_LIMITED_MESSAGE = "Trop de messages envoyés depuis peu.";
const SUCCESS_MESSAGE = "Message envoyé. Réponse sous 48 h.";

let forgedKeyCounter = 0;

/**
 * Clé de limitation unique par run ET par worker.
 *
 * Sans unicité, `reuseExistingServer` (qa/playwright.config.ts:49) ferait
 * hériter le run suivant d'un compteur déjà saturé, et l'assertion « les N
 * premières passent » partirait rouge sans qu'aucun code applicatif n'ait
 * régressé. Une suite parfois rouge finit ignorée : c'est ainsi qu'une
 * protection meurt vraiment.
 *
 * Préfixe 2001:db8::/32 = plage de documentation (RFC 3849). L'unicité est
 * placée dans les 64 bits de poids fort parce que la dérivation de clé réduit
 * l'IPv6 à son /64 : la mettre dans l'identifiant d'interface serait tronqué,
 * et tous les runs partageraient un seul compteur.
 */
function freshForgedIp(testInfo: TestInfo): string {
  forgedKeyCounter += 1;
  const seconds = Math.floor(Date.now() / 1000) & 0xffff;
  const worker = ((testInfo.workerIndex << 8) | (forgedKeyCounter & 0xff)) & 0xffff;
  const hi = seconds.toString(16).padStart(4, "0");
  const lo = worker.toString(16).padStart(4, "0");
  return `2001:db8:${hi}:${lo}::1`;
}

/**
 * Force la clé vue par le serveur. En local aucun proxy ne s'intercale, donc
 * l'en-tête émis ici EST celui que lit la Server Action.
 *
 * Ce n'est pas un contournement laissé dans le produit : sur Vercel la
 * plateforme écrase `x-forwarded-for` et ne relaie pas les IP externes,
 * explicitement pour empêcher l'usurpation. La falsification n'est possible
 * qu'ici, sans proxy devant.
 */
async function forceClientIp(page: Page, ip: string) {
  await page.route("**/*", async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), "x-forwarded-for": ip },
    });
  });
}

async function submitValidMessage(page: Page, body: string) {
  // React réinitialise les champs non contrôlés après chaque action : tout
  // re-remplir à chaque tour (voir qa/Functional/e2e-contact.spec.ts:33-36).
  await page.getByLabel("Email").fill("qa-rate-limit@example.com");
  await page.getByLabel("Message").fill(body);
  await page.getByRole("button", { name: "Envoyer" }).click();
}

async function readToast(page: Page): Promise<string> {
  const toast = page.getByRole("status");
  await expect(toast).toBeVisible();
  return (await toast.innerText()).trim();
}

async function dismissToast(page: Page) {
  await page.getByRole("button", { name: "Fermer la notification" }).click();
  await expect(page.getByRole("status")).toBeHidden();
}

/**
 * Canari. Une soumission valide sans honeypot part réellement chez Resend si le
 * serveur interrogé porte une vraie clé — .env.local en contient une, et
 * `reuseExistingServer` peut adopter un serveur démarré à la main avec cette
 * clé. Échouer ici dit pourquoi, au lieu de laisser la suite envoyer un email
 * par assertion. Même intention que la garde de qa/support/assert-fresh-server.ts.
 *
 * Portée exacte de la borne, à ne pas surestimer : elle vaut UN email PAR
 * INSTANCE DE TEST, pas un par run. `fullyParallel: true`, `workers: 2` et les
 * deux projets desktop/mobile (qa/playwright.config.ts) produisent 4 instances
 * des tests ci-dessous, chacune émettant sa première soumission avant que son
 * propre canari ne morde, et aucun `maxFailures` n'interrompt le run. Le pire
 * cas réel est donc de 4 emails, pas de 1.
 */
function assertNoRealSend(toastText: string) {
  expect(
    toastText,
    "Un envoi RÉEL vient de partir : le serveur QA porte un RESEND_API_KEY non vide. " +
      "Attendu, le chemin « clé absente ». Relancer via `npm run test:qa:security`, " +
      "qui vide la clé (qa/playwright.config.ts:48), et ne pas viser un serveur lancé à la main.",
  ).not.toContain(SUCCESS_MESSAGE);
}

test.describe("Contact — plafond de fréquence par IP", () => {
  test("contact-rate-limit: les soumissions sous le seuil passent, celle au-delà est rejetée proprement", async ({
    page,
  }, testInfo) => {
    await forceClientIp(page, freshForgedIp(testInfo));
    await page.goto(ROUTES.contact);

    // Sens 1 — le limiteur n'est PAS trop strict : chacune des IP_LIMIT
    // premières soumissions le franchit et ressort sur le chemin « clé
    // absente », preuve qu'elle a bien atteint le point d'envoi.
    for (let attempt = 1; attempt <= IP_LIMIT; attempt += 1) {
      await submitValidMessage(page, `Soumission ${attempt} sous le seuil.`);
      const toastText = await readToast(page);

      if (attempt === 1) assertNoRealSend(toastText);

      expect(
        toastText,
        `Soumission ${attempt}/${IP_LIMIT} : elle est sous le seuil et doit passer le limiteur.`,
      ).toContain(NO_KEY_MESSAGE);

      await dismissToast(page);
    }

    // Sens 2 — le limiteur n'est PAS trop permissif : la suivante est bloquée.
    await submitValidMessage(page, "Soumission au-delà du seuil.");
    const blockedToast = await readToast(page);

    expect(
      blockedToast,
      `La soumission ${IP_LIMIT + 1} dépasse le plafond par IP et doit être rejetée.`,
    ).toContain(RATE_LIMITED_MESSAGE);

    // Rejet propre : un message d'erreur rendu, pas un 500 ni un faux succès.
    expect(blockedToast).not.toContain(SUCCESS_MESSAGE);
  });

  test("contact-rate-limit: le plafond est bien par IP — une autre clé n'hérite pas du blocage", async ({
    page,
  }, testInfo) => {
    const saturatedIp = freshForgedIp(testInfo);
    await forceClientIp(page, saturatedIp);
    await page.goto(ROUTES.contact);

    for (let attempt = 1; attempt <= IP_LIMIT; attempt += 1) {
      await submitValidMessage(page, `Saturation ${attempt}.`);
      const toastText = await readToast(page);
      if (attempt === 1) assertNoRealSend(toastText);
      await dismissToast(page);
    }

    await submitValidMessage(page, "Soumission qui sature la clé.");
    expect(await readToast(page), "La clé doit être saturée avant de changer d'IP.").toContain(
      RATE_LIMITED_MESSAGE,
    );

    // Même page, même session, seule la clé change : si le compteur était
    // global au lieu d'être par IP, ce visiteur hériterait du blocage.
    await page.unroute("**/*");
    await forceClientIp(page, freshForgedIp(testInfo));
    await page.goto(ROUTES.contact);

    await submitValidMessage(page, "Premier message d'un autre visiteur.");
    expect(
      await readToast(page),
      "Une clé neuve ne doit pas hériter du blocage d'une autre : le plafond serait global, pas par IP.",
    ).toContain(NO_KEY_MESSAGE);
  });
});

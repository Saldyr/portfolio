import { test, expect, type Locator, type Page } from "playwright/test";
import { BASE_URL, ROUTES } from "../qa.config";

/**
 * Navigation clavier réelle (Tab/Shift+Tab/Enter/Escape), volontairement PAS
 * via locator.focus() : dust.tsx et globals.css exposent un anneau de focus
 * (`:focus-visible { box-shadow: var(--focus-ring) }`), mais qa/Visual a déjà
 * constaté (tâche 5) que ce focus programmatique (`.focus()`, utilisé par
 * components.visual.spec.ts) ne reflète pas forcément ce qu'un utilisateur
 * clavier obtient réellement en tabulant — d'où ces tests au clavier réel.
 */

async function focusIndicator(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? "").trim().slice(0, 40),
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      boxShadow: cs.boxShadow,
    };
  });
}

function hasVisibleIndicator(
  ind: Awaited<ReturnType<typeof focusIndicator>>,
): boolean {
  if (!ind) return false;
  const outlineVisible = ind.outlineStyle !== "none" && ind.outlineWidth !== "0px";
  const shadowVisible = ind.boxShadow !== "none";
  return outlineVisible || shadowVisible;
}

/** Tabule jusqu'à ce que `locator` reçoive le focus ; retourne le nombre de
 * Tab pressés, ou lève une erreur si non atteint en `maxSteps`. */
async function tabToElement(page: Page, locator: Locator, maxSteps = 40) {
  const target = await locator.elementHandle();
  if (!target) throw new Error("tabToElement: locator introuvable dans le DOM");
  for (let i = 0; i < maxSteps; i++) {
    await page.keyboard.press("Tab");
    const isTarget = await page.evaluate(
      ([el]) => document.activeElement === el,
      [target],
    );
    if (isTarget) return i + 1;
  }
  throw new Error(`tabToElement: cible non atteinte en ${maxSteps} Tab`);
}

/** Variante non bloquante : retourne null au lieu de lever si non atteint. */
async function tabToElementOrNull(page: Page, locator: Locator, maxSteps = 40) {
  const target = await locator.elementHandle();
  if (!target) return null;
  for (let i = 0; i < maxSteps; i++) {
    await page.keyboard.press("Tab");
    const isTarget = await page.evaluate(
      ([el]) => document.activeElement === el,
      [target],
    );
    if (isTarget) return i + 1;
  }
  return null;
}

/**
 * Sous 640px, nav.tsx:38 (`hidden sm:flex`) met le nav desktop en
 * display:none — donc hors de l'arbre d'accessibilité : ses liens sont
 * introuvables par getByRole, et tabToElement expire. La navigation passe
 * par MobileMenu (src/components/mobile-menu.tsx). Ouverture au clavier
 * (Tab + Entrée) et non au clic : c'est l'objet de cette suite.
 * Équivalent clavier de qa/Functional/e2e-contact.spec.ts:18-22.
 */
async function openMobileNav(page: Page) {
  const burger = page.getByRole("button", { name: "Ouvrir le menu" });
  await tabToElement(page, burger);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Fermer le menu" })).toBeVisible();
}

test.describe("Keyboard navigation — ordre de tabulation", () => {
  test("keyboard-nav: ordre de tabulation logique (home) — jamais de retour en arrière dans le DOM", async ({
    page,
  }) => {
    await page.goto(ROUTES.home);
    await page.waitForLoadState("networkidle");

    let prevHandle = await page.evaluateHandle(() => document.body as Node);
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      await page.keyboard.press("Tab");
      const curHandle = await page.evaluateHandle(() => document.activeElement as Node);
      const isBody = await page.evaluate((el) => el === document.body, curHandle);
      if (isBody) break;

      const follows = await page.evaluate(
        ([prev, cur]) => {
          if (prev === document.body) return true;
          const rel = (prev as Node).compareDocumentPosition(cur as Node);
          return Boolean(rel & Node.DOCUMENT_POSITION_FOLLOWING);
        },
        [prevHandle, curHandle],
      );
      expect(follows, `Tab n°${i + 1} : le focus revient en arrière dans le DOM`).toBe(true);
      prevHandle = curHandle;
    }
  });

  test("keyboard-nav: Shift+Tab revient exactement sur l'élément précédent", async ({
    page,
  }) => {
    await page.goto(ROUTES.home);
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Tab");
    const first = await focusIndicator(page);
    await page.keyboard.press("Tab");
    const second = await focusIndicator(page);
    expect(second?.text).not.toEqual(first?.text);

    await page.keyboard.press("Shift+Tab");
    const backToFirst = await focusIndicator(page);
    expect(backToFirst).toEqual(first);
  });
});

test.describe("Keyboard navigation — focus visible (WCAG 2.4.7)", () => {
  test("keyboard-nav: anneau de focus visible — Nav → Contact (référence de contrôle)", async ({
    page,
    isMobile,
  }) => {
    await page.goto(ROUTES.home);
    if (isMobile) await openMobileNav(page);
    // exact: true — sans ça, "Contact" matche aussi "Me contacter" (substring
    // insensible à la casse par défaut dans getByRole).
    const link = page.getByRole("link", { name: "Contact", exact: true });
    await tabToElement(page, link);
    const ind = await focusIndicator(page);
    expect(hasVisibleIndicator(ind), `indicateur observé: ${JSON.stringify(ind)}`).toBe(true);
  });

  test("keyboard-nav: anneau de focus visible — ProjectCard (référence de contrôle)", async ({
    page,
  }) => {
    await page.goto(ROUTES.home);
    const card = page.locator("#projets a").first();
    await tabToElement(page, card);
    const ind = await focusIndicator(page);
    expect(hasVisibleIndicator(ind), `indicateur observé: ${JSON.stringify(ind)}`).toBe(true);
  });

  test("keyboard-nav: anneau de focus visible — lien Nav 'Romain Cartia'", async ({ page }) => {
    await page.goto(ROUTES.home);
    const link = page.getByRole("link", { name: "Romain Cartia" });
    await tabToElement(page, link);
    const ind = await focusIndicator(page);
    expect(hasVisibleIndicator(ind), `indicateur observé: ${JSON.stringify(ind)}`).toBe(true);
  });

  test("keyboard-nav: anneau de focus visible — Button primaire (hero, 'Me contacter')", async ({
    page,
  }) => {
    await page.goto(ROUTES.home);
    const button = page.getByRole("link", { name: "Me contacter" });
    await tabToElement(page, button);
    const ind = await focusIndicator(page);
    expect(hasVisibleIndicator(ind), `indicateur observé: ${JSON.stringify(ind)}`).toBe(true);
  });

  test("keyboard-nav: anneau de focus visible — Button secondaire (détail projet, 'Code source')", async ({
    page,
  }) => {
    await page.goto("/projets/gojob");
    const button = page.getByRole("link", { name: "Code source" });
    await tabToElement(page, button);
    const ind = await focusIndicator(page);
    expect(hasVisibleIndicator(ind), `indicateur observé: ${JSON.stringify(ind)}`).toBe(true);
  });

  test("keyboard-nav: anneau de focus visible — champs du formulaire de contact", async ({
    page,
  }) => {
    await page.goto(ROUTES.contact);

    const email = page.getByLabel("Email");
    await tabToElement(page, email);
    expect(hasVisibleIndicator(await focusIndicator(page))).toBe(true);

    const message = page.getByLabel("Message");
    await tabToElement(page, message);
    expect(hasVisibleIndicator(await focusIndicator(page))).toBe(true);

    const submit = page.getByRole("button", { name: "Envoyer" });
    await tabToElement(page, submit);
    expect(hasVisibleIndicator(await focusIndicator(page))).toBe(true);
  });
});

test.describe("Keyboard navigation — 'À propos' (span sans href)", () => {
  test("keyboard-nav: 'À propos' est sémantiquement inerte et donc non atteignable au Tab (sur sa propre page)", async ({
    page,
    isMobile,
  }) => {
    // Desktop uniquement, et non "adapté au mobile". Sous 640px le
    // nav desktop n'est pas rendu (nav.tsx:38, `hidden sm:flex`) et le menu
    // mobile rend "À propos" en <Link> tabbable (mobile-menu.tsx:55-62) :
    // l'assertion de ce test y serait fausse par conception du composant.
    // L'adapter reviendrait à écrire un autre test, affirmant l'inverse.
    test.skip(
      Boolean(isMobile),
      "Assertion propre au nav desktop : dans le menu mobile, « À propos » est un <Link> tabbable, pas un <span> inerte.",
    );

    // nav.tsx:42 — active = page === "apropos" : le lien "À propos" n'est
    // rendu en <span> inerte QUE sur /a-propos (page courante). Sur la home,
    // active=false, c'est un vrai <Link href="/a-propos"> tabbable.
    await page.goto(ROUTES.aPropos);
    const aPropos = page.getByText("À propos", { exact: true });
    await expect(aPropos).toBeVisible();

    const tag = await aPropos.evaluate((el) => el.tagName.toLowerCase());
    const href = await aPropos.getAttribute("href");
    const tabindex = await aPropos.getAttribute("tabindex");
    const role = await aPropos.getAttribute("role");
    expect(tag).toBe("span");
    expect(href).toBeNull();
    expect(tabindex).toBeNull();
    expect(role).toBeNull();

    // Cohérent avec son markup (pas de href/tabindex/role) : ce test
    // documente que l'élément n'est pas dans l'ordre de tabulation — ce
    // n'est pas un piège clavier. Le risque réel (affordance visuelle
    // trompeuse pour un utilisateur souris — même style hover que les vrais
    // liens Contact/Projets sans être cliquable) n'est pas testable par une
    // assertion Playwright ; voir qa/Reports/.
    const reached = await tabToElementOrNull(page, aPropos, 40);
    expect(reached, "'À propos' a été atteint au Tab alors qu'il n'a ni href ni tabindex").toBeNull();
  });
});

test.describe("Keyboard navigation — Entrée / Échap", () => {
  test("keyboard-nav: Entrée active un lien de la Nav (Contact → page /contact)", async ({
    page,
    isMobile,
  }) => {
    await page.goto(ROUTES.home);

    // Le nav desktop n'existe pas sous 640px, la navigation passe
    // par le hamburger (voir openMobileNav).
    if (isMobile) await openMobileNav(page);

    const link = page.getByRole("link", { name: "Contact", exact: true });
    await tabToElement(page, link);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${BASE_URL}${ROUTES.contact}`);
  });

  test("keyboard-nav: formulaire de contact entièrement opérable au clavier (Tab + saisie + Entrée)", async ({
    page,
  }) => {
    await page.goto(ROUTES.contact);
    // Honeypot : court-circuite en succès avant tout appel Resend (voir
    // e2e-mobile.spec.ts) — sans ça, ce test échoue en l'absence de
    // RESEND_API_KEY dans l'environnement de test.
    await page.locator('input[name="company"]').fill("bot-value", { force: true });

    const email = page.getByLabel("Email");
    await tabToElement(page, email);
    await page.keyboard.type("test@example.com");

    const message = page.getByLabel("Message");
    await tabToElement(page, message);
    await page.keyboard.type("Un message de test.");

    const submit = page.getByRole("button", { name: "Envoyer" });
    await tabToElement(page, submit);
    await page.keyboard.press("Enter");

    await expect(page.getByText("Message envoyé. Réponse sous 48 h.")).toBeVisible();
  });

  test("keyboard-nav: Échap ne provoque aucun effet indésirable sur la page contact", async ({
    page,
  }) => {
    // Ce test vérifie une absence de régression (pas de vidage de champ, page
    // toujours fonctionnelle), pas une fonctionnalité Escape.
    //
    // L'app contient bien des dialogues ailleurs (le `<dialog>` de la
    // visionneuse de galerie, et le menu mobile qui écoute Escape via
    // src/components/mobile-menu.tsx), mais la page contact n'a ni l'un ni
    // l'autre. Escape sur la visionneuse est
    // couvert par qa/Functional/gallery-viewer.spec.ts.
    await page.goto(ROUTES.contact);
    const email = page.getByLabel("Email");
    await email.fill("test@example.com");
    await page.keyboard.press("Escape");
    await expect(email).toHaveValue("test@example.com");
    await expect(page.getByRole("main")).toBeVisible();
  });
});

test.describe("Keyboard navigation — labels et statut du formulaire", () => {
  test("keyboard-nav: Email et Message atteignables par leur label associé (accessible name)", async ({
    page,
  }) => {
    await page.goto(ROUTES.contact);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Message")).toBeVisible();
  });

  test("keyboard-nav: le message de statut (toast) est annoncé aux lecteurs d'écran", async ({
    page,
  }) => {
    await page.goto(ROUTES.contact);
    const email = page.getByLabel("Email");
    await email.fill("adresse-invalide");
    // Message est `required` (src/components/contact-form.tsx:64-65) : sans
    // lui, la validation HTML5 bloque la soumission, la Server Action n'est
    // jamais appelée et AUCUN toast n'apparaît — le test échouait donc pour
    // cette raison autant que pour le texte attendu. Même préparation que
    // qa/Functional/contact-form.spec.ts:41-46, qui passe.
    await page.getByLabel("Message").fill("Un message de test.");

    const submit = page.getByRole("button", { name: "Envoyer" });
    await tabToElement(page, submit);
    await page.keyboard.press("Enter");

    // Le message est aligné sur src/app/contact/actions.ts:27-28, qui
    // valide l'email via EMAIL_PATTERN ; ce test rejoint contact-form.spec.ts:46,73 et
    // e2e-contact.spec.ts:29, qui asservissent déjà ce même texte.
    const toast = page.getByText("Adresse email invalide.");
    await expect(toast).toBeVisible();

    // Ciblé par rôle plutôt que par `div.z-50` : cette classe utilitaire est
    // aussi portée par le panneau du menu mobile (mobile-menu.tsx:53), ce qui
    // rendrait le locator ambigu dès que ce menu est ouvert.
    const toastContainer = page.getByRole("status");
    await expect(toastContainer).toBeVisible();
    const ariaLive = await toastContainer.getAttribute("aria-live");
    const role = await toastContainer.getAttribute("role");
    expect(
      ariaLive ?? role,
      "le toast de statut (succès/erreur) n'a ni aria-live ni role='status'/'alert' — non annoncé automatiquement à un lecteur d'écran",
    ).not.toBeNull();
  });
});

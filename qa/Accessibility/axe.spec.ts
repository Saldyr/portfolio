import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page, type TestInfo } from "playwright/test";
import { ROUTES } from "../qa.config";

/**
 * Tags WCAG couverts par le scan principal — cf. QA_PLAN.md section 3.
 * `best-practice` (landmarks, régions...) est scanné séparément : ces règles
 * ne sont pas des critères WCAG et ne doivent pas faire échouer le gate
 * "violation critique/sérieuse", seulement être documentées.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

function formatViolations(violations: Violation[]): string {
  if (violations.length === 0) return "aucune violation";
  return violations
    .map((v) => {
      const nodes = v.nodes.map((n) => `    - ${n.target.join(" ")}`).join("\n");
      return `[${v.impact ?? "?"}] ${v.id} — ${v.help} (${v.nodes.length} nœud(s))\n${nodes}`;
    })
    .join("\n");
}

async function attachViolations(
  testInfo: TestInfo,
  name: string,
  violations: Violation[],
) {
  await testInfo.attach(name, {
    body: JSON.stringify(violations, null, 2),
    contentType: "application/json",
  });
}

async function gotoSettled(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState("networkidle");
}

/**
 * IMPORTANT — limite de la couverture automatisée (axe-core) :
 * un score axe à 0 violation ne prouve PAS une accessibilité conforme.
 * axe ne couvre qu'un sous-ensemble des critères WCAG (~30-40 % selon
 * axe-core lui-même) : il ne peut pas juger la pertinence sémantique d'un
 * texte alternatif, la cohérence de l'ordre de lecture au clavier, la
 * qualité d'un message d'erreur annoncé, ou l'expérience réelle au lecteur
 * d'écran. Ces points sont couverts par des vérifications manuelles/ciblées
 * dans ce fichier et dans keyboard-nav.spec.ts, pas par le scan seul.
 */
test.describe("Accessibility — axe scan", () => {
  test("a11y: home ne remonte aucune violation WCAG critique/sérieuse", async ({
    page,
  }, testInfo) => {
    await gotoSettled(page, ROUTES.home);

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    await attachViolations(testInfo, "axe-home-all.json", results.violations);

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousOrCritical, formatViolations(seriousOrCritical)).toEqual([]);
  });

  test("a11y: project-page ne remonte aucune violation WCAG critique/sérieuse", async ({
    page,
  }, testInfo) => {
    await gotoSettled(page, ROUTES.projectWithDetail);

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    await attachViolations(testInfo, "axe-project-page-all.json", results.violations);

    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousOrCritical, formatViolations(seriousOrCritical)).toEqual([]);
  });

  test("a11y: landmarks best-practice (informationnel, hors gate WCAG)", async ({
    page,
  }, testInfo) => {
    for (const [label, route] of [
      ["home", ROUTES.home],
      ["project-page", ROUTES.projectWithDetail],
    ] as const) {
      await gotoSettled(page, route);
      const results = await new AxeBuilder({ page })
        .withTags(["best-practice"])
        .analyze();
      await attachViolations(testInfo, `axe-${label}-best-practice.json`, results.violations);
    }
    // Pas d'assertion : ces règles (landmark-one-main, region, ...) sont des
    // recommandations best-practice, pas des critères WCAG — voir le rapport
    // pour le détail réel remonté par axe sur ce point.
  });

  test("a11y: contrastes texte/boutons/liens (règle axe color-contrast)", async ({
    page,
  }, testInfo) => {
    for (const [label, route] of [
      ["home", ROUTES.home],
      ["project-page", ROUTES.projectWithDetail],
    ] as const) {
      await gotoSettled(page, route);
      const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
      await attachViolations(testInfo, `axe-${label}-color-contrast.json`, results.violations);
      expect(results.violations, formatViolations(results.violations)).toEqual([]);
    }
  });
});

test.describe("Accessibility — structure sémantique", () => {
  test("a11y: un seul <h1> par page, hiérarchie des titres sans saut de niveau", async ({
    page,
  }) => {
    for (const [label, route] of [
      ["home", ROUTES.home],
      ["project-page", ROUTES.projectWithDetail],
    ] as const) {
      await gotoSettled(page, route);

      const h1Count = await page.locator("h1").count();
      expect(h1Count, `${label}: doit avoir exactement un <h1>`).toBe(1);

      const levels = await page
        .locator("h1, h2, h3, h4, h5, h6")
        .evaluateAll((els) => els.map((el) => Number(el.tagName[1])));
      for (let i = 1; i < levels.length; i++) {
        const jump = levels[i] - levels[i - 1];
        expect(
          jump,
          `${label}: saut de niveau h${levels[i - 1]} → h${levels[i]} (position ${i})`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  test("a11y: landmark <nav> réel pour la barre de navigation", async ({
    page,
  }) => {
    // POR-31 : la racine de src/components/nav.tsx est un <nav> depuis ce
    // ticket ; ce test documentait auparavant le gap inverse. Il garde
    // désormais l'acquis — une zone de navigation identifiable par landmark
    // (WCAG). Le menu mobile n'expose volontairement PAS son propre landmark
    // (src/components/mobile-menu.tsx:53) : il est déjà couvert par celui-ci.
    await gotoSettled(page, ROUTES.home);
    const navLandmarks = await page.getByRole("navigation").count();
    expect(
      navLandmarks,
      "aucun landmark 'navigation' — la racine de src/components/nav.tsx doit rester un <nav>",
    ).toBeGreaterThan(0);
  });

  test("a11y: landmarks main/contentinfo présents et uniques", async ({ page }) => {
    // POR-31 : le rôle `contentinfo` exige que le <footer> ne soit PAS
    // descendant de <main> (HTML-AAM), où il perdrait son rôle implicite.
    // C'est l'acquis que ce test garde : le sortir de <main> a été le
    // correctif, l'y remettre serait la régression.
    for (const route of [ROUTES.home, ROUTES.projectWithDetail]) {
      await gotoSettled(page, route);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
    }
  });
});

test.describe("Accessibility — images", () => {
  test("a11y: chaque <img> de contenu porte un attribut alt", async ({ page }) => {
    for (const route of [ROUTES.home, ROUTES.projectWithDetail]) {
      await gotoSettled(page, route);
      const alts = await page.locator("img").evaluateAll((imgs) =>
        imgs.map((img) => img.getAttribute("alt")),
      );
      for (const alt of alts) {
        expect(alt, `${route}: <img> sans attribut alt`).not.toBeNull();
      }
    }
  });

  test("a11y: canvas Dust et fond décoratif masqués de l'arbre d'accessibilité", async ({
    page,
  }) => {
    await gotoSettled(page, ROUTES.home);
    await expect(page.locator(".site-backdrop")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("canvas.site-backdrop__dust")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

test.describe("Accessibility — prefers-reduced-motion", () => {
  test("a11y: reduced-motion coupe les animations CSS du backdrop (globals.css)", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoSettled(page, ROUTES.home);

    const ambianceAnim = await page
      .locator(".site-backdrop__ambiance")
      .evaluate((el) => getComputedStyle(el).animationName);
    const spillAnim = await page
      .locator(".site-backdrop__spill")
      .evaluate((el) => getComputedStyle(el).animationName);

    expect(ambianceAnim, "backdrop-breathe doit être coupée sous reduced-motion").toBe("none");
    expect(spillAnim, "backdrop-spill doit être coupée sous reduced-motion").toBe("none");
  });

  test("a11y: reduced-motion fige le canvas Dust (pas de rAF actif)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoSettled(page, ROUTES.home);

    const canvas = page.locator("canvas.site-backdrop__dust");
    await expect(canvas).toBeVisible();
    // dust.tsx: sous matchMedia(reduce).matches, resize() appelle stop() puis
    // un unique draw() figé — deux captures espacées doivent être identiques
    // pixel pour pixel si aucune boucle requestAnimationFrame ne tourne.
    await page.waitForTimeout(200);
    const frame1 = await canvas.screenshot();
    await page.waitForTimeout(600);
    const frame2 = await canvas.screenshot();

    expect(Buffer.compare(frame1, frame2), "le canvas Dust a changé entre deux captures sous reduced-motion").toBe(0);
  });

  test("a11y: sans reduced-motion, le canvas Dust anime réellement (contrôle négatif)", async ({
    page,
  }) => {
    // Sans ce contrôle négatif, un canvas Dust cassé (gl null, contexte
    // perdu...) donnerait le même résultat "figé" que le test reduced-motion
    // ci-dessus et ferait passer ce dernier pour une mauvaise raison.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await gotoSettled(page, ROUTES.home);

    const canvas = page.locator("canvas.site-backdrop__dust");
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(200);
    const frame1 = await canvas.screenshot();
    await page.waitForTimeout(600);
    const frame2 = await canvas.screenshot();

    expect(
      Buffer.compare(frame1, frame2),
      "le canvas Dust ne semble pas animer sans reduced-motion — vérifier que le contrôle négatif est valide",
    ).not.toBe(0);
  });
});

import { expect, test, type Page } from "playwright/test";
import { BASE_URL, ROUTES } from "../qa.config";

// Nav (src/components/nav.tsx:39) : "Projets" a active = page==="home" ||
// page==="project" — inerte (<span>) sur la home ET sur toute page projet,
// jamais les deux à la fois avec "Contact" depuis la page projet. "Projets"
// n'est un vrai lien que sur /a-propos ou /contact ; "Contact" (nav.tsx:45,
// active = page==="contact") reste un vrai lien partout sauf sur /contact
// lui-même.
//
// Les liens desktop sont masqués sous `sm` (nav.tsx:38), remplacés
// par MobileMenu (bouton + overlay) — même contournement que
// e2e-contact.spec.ts, requis ici pour que le projet Playwright
// mobile-chromium passe par le même test que desktop-chromium.
async function clickNavLink(page: Page, name: string) {
  const directLink = page.getByRole("link", { name, exact: true });
  if (await directLink.isVisible()) {
    await directLink.click();
    return;
  }
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("link", { name, exact: true }).click();
}

test("nav: liens ancrés vers #projets et #contact", async ({ page }) => {
  await page.goto(ROUTES.aPropos);

  await clickNavLink(page, "Projets");
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.home}#projets`);

  await page.goto(ROUTES.projectWithDetail);
  await clickNavLink(page, "Contact");
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.contact}`);
});

test("nav: lien externe GitHub ouvre un nouvel onglet (rel=noopener noreferrer)", async ({ page }) => {
  await page.goto(ROUTES.home);

  const link = page.getByRole("link", { name: "GitHub" });
  await expect(link).toHaveAttribute("href", "https://github.com/Saldyr");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

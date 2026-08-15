import { expect, test } from "playwright/test";
import { BASE_URL, ROUTES } from "../qa.config";

// Nav (src/components/nav.tsx:39) : "Projets" a active = page==="home" ||
// page==="project" — inerte (<span>) sur la home ET sur toute page projet,
// jamais les deux à la fois avec "Contact" depuis la page projet comme le
// commentaire précédent l'affirmait à tort. "Projets" n'est un vrai lien
// que sur /a-propos ou /contact ; "Contact" (nav.tsx:45, active =
// page==="contact") reste un vrai lien partout sauf sur /contact lui-même.
test("nav: liens ancrés vers #projets et #contact", async ({ page }) => {
  await page.goto(ROUTES.aPropos);

  await page.getByRole("link", { name: "Projets", exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.home}#projets`);

  await page.goto(ROUTES.projectWithDetail);
  await page.getByRole("link", { name: "Contact" }).click();
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.contact}`);
});

test("nav: lien externe GitHub ouvre un nouvel onglet (rel=noopener noreferrer)", async ({ page }) => {
  await page.goto(ROUTES.home);

  const link = page.getByRole("link", { name: "GitHub" });
  await expect(link).toHaveAttribute("href", "https://github.com/Saldyr");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

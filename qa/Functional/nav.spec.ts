import { expect, test } from "playwright/test";
import { BASE_URL, ROUTES } from "../qa.config";

// Nav (src/components/nav.tsx) : "Projets" n'est un vrai lien que sur les
// pages où page !== "home" (sur la home c'est un <span> déjà actif) ;
// "Contact" est toujours un lien. On teste donc les deux depuis la page
// projet, où les deux sont réellement des <a href>.
test("nav: liens ancrés vers #projets et #contact", async ({ page }) => {
  await page.goto(ROUTES.projectWithDetail);

  await page.getByRole("link", { name: "Projets", exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.home}#projets`);

  await page.goto(ROUTES.projectWithDetail);
  await page.getByRole("link", { name: "Contact" }).click();
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.home}#contact`);
});

test("nav: lien externe GitHub ouvre un nouvel onglet (rel=noreferrer)", async ({ page }) => {
  await page.goto(ROUTES.home);

  const link = page.getByRole("link", { name: "Code source" });
  await expect(link).toHaveAttribute("href", "https://github.com/Saldyr/portfolio");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noreferrer");
});

import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";

test("project-page: slug avec detail (noiseless-mind) affiche la page détail", async ({ page }) => {
  const response = await page.goto(ROUTES.projectWithDetail);
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1, name: "Noiseless Mind" })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Tous les projets" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir la démo" })).toBeVisible();
});

test("project-page: slug sans detail (hermes-agent) renvoie vers /#projets", async ({ page }) => {
  // Accès direct par URL : le projet existe (src/lib/projects.ts) mais n'a
  // pas de `detail` -> generateStaticParams ne le génère pas et la route
  // appelle notFound() (vérifié dans le code, pas de redirection réelle).
  const response = await page.goto(ROUTES.projectWithoutDetail);
  expect(response?.status()).toBe(404);

  // Depuis la home, la carte du même projet ne pointe jamais vers cette
  // route : son `href` déclaré est directement "/#projets".
  await page.goto(ROUTES.home);
  const card = page.locator("#projets a").filter({ hasText: "Hermes-Agent" });
  await expect(card).toHaveAttribute("href", "/#projets");
});

test("project-page: slug inconnu déclenche notFound()", async ({ page }) => {
  const response = await page.goto(ROUTES.projectUnknown);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("404")).toBeVisible();
});

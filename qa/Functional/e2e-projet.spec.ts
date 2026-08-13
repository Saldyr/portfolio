import { expect, test } from "playwright/test";
import { BASE_URL, ROUTES } from "../qa.config";

// Parcours E2E "Projet" : sur les 3 projets déclarés (src/lib/projects.ts),
// seul noiseless-mind a une page détail générée statiquement (generateStaticParams
// filtre sur `detail`). Le parcours couvre donc le seul chemin de détail réel,
// puis vérifie que les deux autres slugs 404 en accès direct par URL.
test("e2e projet: détail noiseless-mind puis retour via 'Projet suivant'", async ({ page }) => {
  await page.goto(ROUTES.projectWithDetail);

  await expect(page.getByRole("heading", { level: 1, name: "Noiseless Mind" })).toBeVisible();
  await expect(page.getByText("Prototype jouable")).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir la démo" })).toBeVisible();
  await expect(page.getByText("Hermes-Agent")).toBeVisible();

  await page.getByRole("link", { name: "Voir le projet" }).click();
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.home}#projets`);
});

test("e2e projet: les slugs sans detail (hermes-agent, inconnu) 404 en accès direct", async ({
  page,
}) => {
  const withoutDetail = await page.goto(ROUTES.projectWithoutDetail);
  expect(withoutDetail?.status()).toBe(404);

  const unknown = await page.goto(ROUTES.projectUnknown);
  expect(unknown?.status()).toBe(404);

  const withDetail = await page.goto(ROUTES.projectWithDetail);
  expect(withDetail?.status()).toBe(200);
});

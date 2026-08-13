import { expect, test } from "playwright/test";
import { BASE_URL, ROUTES } from "../qa.config";

// Parcours E2E "Découverte" : un visiteur arrive sur la home, active le CTA
// "Voir les projets" au clavier, parcourt les sections, ouvre un projet puis
// revient en arrière. Surveille aussi les erreurs console JS et les requêtes
// réseau en échec (4xx/5xx/ressources manquantes) sur l'ensemble du parcours.
test("e2e découverte: home -> CTA projets -> sections -> détail projet -> retour arrière", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
  });

  await page.goto(ROUTES.home);
  await expect(page).toHaveTitle(/Saldyr/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const ctaProjets = page.getByRole("link", { name: "Voir les projets" });
  await ctaProjets.hover();
  await ctaProjets.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.home}#projets`);
  await expect(page.getByRole("heading", { name: "PROJETS" })).toBeVisible();

  await page.getByRole("heading", { name: "À PROPOS" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "À PROPOS" })).toBeVisible();

  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "CONTACT" })).toBeVisible();

  await page.locator("#projets").getByText("Noiseless Mind", { exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.projectWithDetail}`);
  await expect(page.getByRole("heading", { level: 1, name: "Noiseless Mind" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.home}#projets`);
  await expect(page.getByRole("heading", { name: "PROJETS" })).toBeVisible();

  expect(consoleErrors, `Erreurs console JS: ${consoleErrors.join(" | ")}`).toEqual([]);
  expect(failedRequests, `Requêtes en échec: ${failedRequests.join(" | ")}`).toEqual([]);
});

import { expect, test } from "playwright/test";
import { BASE_URL, ROUTES } from "../qa.config";

// Parcours E2E "Découverte" : un visiteur arrive sur la home, parcourt les
// sections jusqu'aux projets, ouvre un projet puis revient en arrière.
// Surveille aussi les erreurs console JS et les requêtes réseau en échec
// (4xx/5xx/ressources manquantes) sur l'ensemble du parcours.
test("e2e découverte: home -> sections -> détail projet -> retour arrière", async ({
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
  // POR-42 : l'attendu précédent (/Saldyr/) était périmé depuis le changement
  // de titre d'onglet. Motif volontairement partiel : ce test est une étape de fumée dans un
  // parcours, il vérifie que la home porte bien le titre du site. L'assertion
  // exacte appartient à qa/SEO/metadata.spec.ts, qui la porte désormais sur
  // SITE_TITLE (src/lib/site.ts).
  // POR-43 a examiné le resserrement de ce motif vers cette constante et l'a
  // écarté : SITE_TITLE EST le titre entier, donc toHaveTitle(SITE_TITLE) — ou
  // toute regex bâtie dessus — recrée exactement la double-assertion que ce
  // motif partiel évite. Découper la constante pour rester partiel
  // fabriquerait une dépendance à un séparateur arbitraire, plus fragile que
  // ce littéral. Ne pas rouvrir sans argument nouveau.
  await expect(page).toHaveTitle(/Romain C/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const projectsHeading = page.getByRole("heading", { name: "PROJETS" });
  await projectsHeading.scrollIntoViewIfNeeded();
  await expect(projectsHeading).toBeVisible();

  await page.locator("#projets").getByText("Noiseless Mind", { exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.projectWithDetail}`);
  await expect(page.getByRole("heading", { level: 1, name: "Noiseless Mind" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(`${BASE_URL}${ROUTES.home}`);
  await expect(page.getByRole("heading", { name: "PROJETS" })).toBeVisible();

  expect(consoleErrors, `Erreurs console JS: ${consoleErrors.join(" | ")}`).toEqual([]);
  expect(failedRequests, `Requêtes en échec: ${failedRequests.join(" | ")}`).toEqual([]);
});

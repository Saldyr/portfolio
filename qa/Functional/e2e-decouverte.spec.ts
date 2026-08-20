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
  // de titre d'onglet. Titre réel : « Romain C // Développeur full-stack IA »
  // (src/app/layout.tsx:21) — « Saldyr » ne subsiste que dans openGraph.siteName
  // et la description.
  // Motif volontairement partiel : ce test est une étape de fumée dans un
  // parcours, il vérifie que la home porte bien le titre du site. L'assertion
  // exacte du titre appartient à qa/SEO/metadata.spec.ts, et la dupliquer ici
  // doublerait le coût de maintenance au prochain changement de titre.
  // Réserve à connaître : qa/SEO/metadata.spec.ts:23 et :48 sont eux-mêmes
  // encore périmés sur ce titre (même cause, autre fichier) — le titre exact
  // n'est donc asserté correctement nulle part tant que POR-43 n'est pas fait.
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

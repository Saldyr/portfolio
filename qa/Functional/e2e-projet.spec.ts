import { expect, test } from "playwright/test";
import { projects } from "@/lib/projects";
import { BASE_URL, ROUTES } from "../qa.config";

// Parcours E2E "Projet". Sur les projets déclarés (src/lib/projects.ts), seuls
// ceux qui portent un `detail` ont une page générée (generateStaticParams
// filtre dessus, src/app/projets/[slug]/page.tsx:12-16). Tous en portent un
// depuis que Sportify a acquis sa page détail : la garde « projet sans detail »
// a donc été retirée plutôt que laissée à vide, comme son message l'exigeait.
//
// Ce que couvrait aussi cette garde et qu'il ne fallait pas perdre avec elle :
// aucun lien de la home ne doit mener à une route morte. Reformulé plus bas en
// invariant dérivé des données — il ne se périme pas au prochain projet, et
// couvre strictement plus que la version figée sur un seul slug.

test("e2e projet: détail noiseless-mind puis navigation via 'Projet suivant'", async ({ page }) => {
  const project = projects.find((candidate) => candidate.href === ROUTES.projectWithDetail);
  if (!project?.detail?.nextProject) {
    throw new Error(
      `Aucun projet avec \`detail.nextProject\` pour ${ROUTES.projectWithDetail} dans src/lib/projects.ts : mettre à jour ROUTES.projectWithDetail (qa/qa.config.ts).`,
    );
  }
  const { nextProject } = project.detail;

  await page.goto(ROUTES.projectWithDetail);

  await expect(page.getByRole("heading", { level: 1, name: project.title })).toBeVisible();
  // Ancre le contenu réel du projet plutôt qu'une sous-chaîne pouvant matcher
  // une phrase de sens inverse (ex. "aucun prototype jouable n'existe encore").
  await expect(page.getByText(project.detail.tagline, { exact: true })).toBeVisible();
  // Bouton démo conditionné à `demoHref` (src/app/projets/[slug]/page.tsx:112-116).
  await expect(page.getByRole("link", { name: "Voir la démo" })).toHaveCount(
    project.detail.demoHref ? 1 : 0,
  );
  await expect(page.getByText(nextProject.title)).toBeVisible();

  await page.getByRole("link", { name: "Voir le projet" }).click();
  await expect(page).toHaveURL(`${BASE_URL}${nextProject.href}`);
});

test("e2e projet: chaque projet de la home est lié et sa cible interne répond 200", async ({
  page,
}) => {
  await page.goto(ROUTES.home);
  for (const project of projects) {
    // Ancre littérale : la carte doit exister, sinon l'assertion de résolution
    // ci-dessous ne testerait rien.
    await expect(
      page.locator(`#projets a[href="${project.href}"]`),
      `carte absente pour ${project.slug}`,
    ).toHaveCount(1);
  }

  const internalTargets = projects.filter((project) => project.href.startsWith("/"));
  expect(internalTargets.length, "aucun projet ne pointe vers une route interne").toBeGreaterThan(0);

  for (const project of internalTargets) {
    const response = await page.goto(project.href);
    expect(response?.status(), `href=${project.href}`).toBe(200);
  }
});

test("e2e projet: un slug inconnu 404", async ({ page }) => {
  const unknown = await page.goto(ROUTES.projectUnknown);
  expect(unknown?.status()).toBe(404);
});

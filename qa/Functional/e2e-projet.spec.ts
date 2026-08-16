import { expect, test } from "playwright/test";
import { projects } from "@/lib/projects";
import { BASE_URL, ROUTES } from "../qa.config";

// Parcours E2E "Projet". Sur les projets déclarés (src/lib/projects.ts), seuls
// ceux qui portent un `detail` ont une page générée (generateStaticParams
// filtre dessus, src/app/projets/[slug]/page.tsx:12-16) ; les autres 404 en
// accès direct. POR-18 : les identifiants du parcours sont dérivés des données,
// pas figés — l'ancienne version codait « hermes-agent = projet sans detail »,
// hypothèse devenue fausse.
const projectWithoutDetail = projects.find((project) => !project.detail);

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

test("e2e projet: les slugs sans detail et inconnu 404 en accès direct", async ({ page }) => {
  // Échec explicite plutôt que skip : une garde qui s'auto-désactive est une
  // garde perdue.
  if (!projectWithoutDetail) {
    throw new Error(
      "Plus aucun projet sans `detail` dans src/lib/projects.ts : cette garde n'a plus d'objet, la retirer explicitement.",
    );
  }

  const withoutDetail = await page.goto(`/projets/${projectWithoutDetail.slug}`);
  expect(withoutDetail?.status()).toBe(404);

  const unknown = await page.goto(ROUTES.projectUnknown);
  expect(unknown?.status()).toBe(404);

  const withDetail = await page.goto(ROUTES.projectWithDetail);
  expect(withDetail?.status()).toBe(200);
});

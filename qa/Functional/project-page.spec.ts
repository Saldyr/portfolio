import { expect, test } from "playwright/test";
import { projects } from "@/lib/projects";
import { ROUTES } from "../qa.config";

// POR-18 : le projet « sans detail » est dérivé de src/lib/projects.ts, jamais
// figé sur un slug. La version précédente codait hermes-agent, qui a depuis
// acquis un `detail` et une route réelle — la spec décrivait un site disparu.
const projectWithoutDetail = projects.find((project) => !project.detail);

test("project-page: slug avec detail (noiseless-mind) affiche la page détail", async ({ page }) => {
  const project = projects.find((candidate) => candidate.href === ROUTES.projectWithDetail);
  if (!project?.detail) {
    throw new Error(
      `Aucun projet avec \`detail\` pour ${ROUTES.projectWithDetail} dans src/lib/projects.ts : mettre à jour ROUTES.projectWithDetail (qa/qa.config.ts).`,
    );
  }

  const response = await page.goto(ROUTES.projectWithDetail);
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { level: 1, name: project.title })).toBeVisible();
  await expect(page.getByRole("link", { name: "← Tous les projets" })).toBeVisible();
  // Le bouton démo n'est rendu que si le projet déclare un `demoHref`
  // (src/app/projets/[slug]/page.tsx:112-116). Les deux sens sont couverts :
  // présent quand il est déclaré, absent sinon.
  await expect(page.getByRole("link", { name: "Voir la démo" })).toHaveCount(
    project.detail.demoHref ? 1 : 0,
  );
});

test("project-page: un projet sans detail 404 en direct et n'est lié nulle part sur la home", async ({
  page,
}) => {
  // Échec explicite plutôt que skip : une garde qui s'auto-désactive est une
  // garde perdue.
  if (!projectWithoutDetail) {
    throw new Error(
      "Plus aucun projet sans `detail` dans src/lib/projects.ts : cette garde n'a plus d'objet, la retirer explicitement.",
    );
  }

  // Le projet existe (src/lib/projects.ts) mais n'a pas de `detail` :
  // generateStaticParams ne le génère pas et la route appelle notFound()
  // (src/app/projets/[slug]/page.tsx:38-39) — pas de redirection réelle.
  const deadRoute = `/projets/${projectWithoutDetail.slug}`;
  const response = await page.goto(deadRoute);
  expect(response?.status()).toBe(404);

  await page.goto(ROUTES.home);
  // Ancre littérale : la carte du projet doit exister, sinon l'assertion
  // d'absence ci-dessous passerait au vert sur une section vide.
  await expect(
    page.locator(`#projets a[href="${projectWithoutDetail.href}"]`),
  ).toHaveCount(1);
  // L'invariant : aucun lien de la home ne mène à cette route morte.
  await expect(page.locator(`#projets a[href="${deadRoute}"]`)).toHaveCount(0);
});

test("project-page: slug inconnu déclenche notFound()", async ({ page }) => {
  const response = await page.goto(ROUTES.projectUnknown);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("404")).toBeVisible();
});

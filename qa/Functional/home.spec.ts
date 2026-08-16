import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";
import { projects } from "../../src/lib/projects";

test("home: sections hero et #projets présentes", async ({ page }) => {
  await page.goto(ROUTES.home);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#projets")).toBeVisible();
  await expect(page.getByRole("heading", { name: "PROJETS" })).toBeVisible();
});

// Filtre appliqué avant rendu (src/app/page.tsx:7-10) : dériver la liste attendue
// de là plutôt que de projects.length, qui inclut les projets masqués sur la home.
const HOME_HIDDEN_SLUGS = new Set(["refonte-du-portfolio"]);
const homeProjects = projects.filter((project) => !HOME_HIDDEN_SLUGS.has(project.slug));

test("home: grille ProjectCard affiche les projets déclarés", async ({ page }) => {
  await page.goto(ROUTES.home);

  const grid = page.locator("#projets");
  await expect(grid.locator("a")).toHaveCount(homeProjects.length);

  for (const project of homeProjects) {
    await expect(grid.getByText(project.title, { exact: true })).toBeVisible();
  }
});

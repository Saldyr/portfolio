import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";
import { projects } from "../../src/lib/projects";

test("home: sections hero et #projets présentes", async ({ page }) => {
  await page.goto(ROUTES.home);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#projets")).toBeVisible();
  await expect(page.getByRole("heading", { name: "PROJETS" })).toBeVisible();
});

test("home: grille ProjectCard affiche les projets déclarés", async ({ page }) => {
  await page.goto(ROUTES.home);

  const grid = page.locator("#projets");
  await expect(grid.locator("a")).toHaveCount(projects.length);

  for (const project of projects) {
    await expect(grid.getByText(project.title, { exact: true })).toBeVisible();
  }
});

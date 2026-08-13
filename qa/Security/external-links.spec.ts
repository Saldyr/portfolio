import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";

// Un seul lien externe identifié dans le code (src/components/footer.tsx,
// rendu dans le footer commun à toutes les pages) : GitHub, target="_blank".
// Vérifié sur home et une page projet pour couvrir les deux layouts.

async function getBlankLinks(page: import("playwright/test").Page) {
  return page.$$eval('a[target="_blank"]', (nodes) =>
    nodes.map((node) => ({
      href: node.getAttribute("href"),
      rel: node.getAttribute("rel") ?? "",
    })),
  );
}

test('external-links: tout target="_blank" porte rel="noopener"/"noreferrer" (home)', async ({
  page,
}) => {
  await page.goto(ROUTES.home);

  const links = await getBlankLinks(page);
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    expect(link.rel, `href=${link.href}`).toContain("noopener");
    expect(link.rel, `href=${link.href}`).toContain("noreferrer");
  }
});

test('external-links: tout target="_blank" porte rel="noopener"/"noreferrer" (page projet)', async ({
  page,
}) => {
  await page.goto(ROUTES.projectWithDetail);

  const links = await getBlankLinks(page);
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    expect(link.rel, `href=${link.href}`).toContain("noopener");
    expect(link.rel, `href=${link.href}`).toContain("noreferrer");
  }
});

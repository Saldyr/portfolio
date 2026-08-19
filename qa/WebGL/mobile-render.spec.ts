import fs from "node:fs";
import { expect, test } from "playwright/test";
import { ROUTES, WEBGL_MIN_WIDTH } from "../qa.config";
import { projects } from "../../src/lib/projects";
import {
  collectConsole,
  drainGlErrors,
  dustBandClip,
  dustGeometry,
  evidencePath,
  installDustProbe,
  readPixels,
  readProbe,
  sampleDrawRate,
  writeEvidence,
} from "./dust.helpers";

/**
 * Spécifique au projet `mobile-chromium` (Pixel 7 : 412×915, DPR 2.625).
 * En portrait la photo occupe toute la largeur, la bande de poussière est
 * donc quasi nulle et le canvas se désactive — comportement voulu
 * (MIN_WIDTH, src/components/dust.tsx). Le rendu mobile réel se vérifie en
 * paysage, seul cas où la bande existe.
 */

test("dust (mobile): portrait désactivé, paysage rendu avec DPR plafonné", async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "projet mobile-chromium uniquement");
  test.setTimeout(120_000);

  await installDustProbe(context);
  const consoleLog = collectConsole(page);

  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const portrait = await dustGeometry(page);
  const portraitRate = await sampleDrawRate(page, 1200);
  const portraitProbe = await readProbe(page);

  expect(portrait.dpr, "device scale factor attendu du Pixel 7").toBeGreaterThan(2);
  expect(portrait.cssWidth, "bande de poussière non nulle en portrait").toBeLessThan(WEBGL_MIN_WIDTH);
  expect(portrait.backingWidth, "back-buffer alloué alors que la bande est inexploitable").toBe(0);
  expect(portraitRate.frames, "boucle rAF active en portrait").toBe(0);
  // Le contexte est tout de même demandé et obtenu au montage.
  expect(portraitProbe.contextCalls).toHaveLength(1);
  expect(portraitProbe.contextCalls[0].ok).toBe(true);

  await page.setViewportSize({ width: 915, height: 412 });
  await page.waitForTimeout(900);

  const landscape = await dustGeometry(page);
  const landscapeRate = await sampleDrawRate(page, 2000);
  const pixels = await readPixels(page);

  expect(landscape.cssWidth).toBeGreaterThanOrEqual(WEBGL_MIN_WIDTH);
  // MAX_DPR = 2 : le back-buffer ne suit pas les 2.625 du device.
  expect(
    Math.abs(landscape.backingWidth - Math.round(landscape.cssWidth * 2)),
    `back-buffer ${landscape.backingWidth}px pour ${landscape.cssWidth}px CSS (DPR device ${landscape.dpr})`,
  ).toBeLessThanOrEqual(1);
  expect(landscapeRate.frames, "aucune frame rendue en paysage").toBeGreaterThan(0);
  expect(pixels.available && pixels.nonZero > 0, "aucun pixel lumineux en paysage").toBe(true);

  expect(await drainGlErrors(page), "erreur GL sur mobile").toEqual([]);
  expect(consoleLog.errors(), JSON.stringify(consoleLog.errors())).toHaveLength(0);

  const clip = await dustBandClip(page);
  if (clip) {
    fs.writeFileSync(evidencePath("mobile-bande-paysage.png"), await page.screenshot({ clip }));
  }
  fs.writeFileSync(evidencePath("mobile-paysage-pleine-page.png"), await page.screenshot());

  writeEvidence("mobile-render", {
    portrait: { geometry: portrait, rate: portraitRate },
    landscape: { geometry: landscape, rate: landscapeRate, pixels },
  });
});

test("dust (mobile): le contenu reste utilisable sans bande de poussière", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "projet mobile-chromium uniquement");

  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Construire, créer, imaginer en pilotant l'IA.",
    }),
  ).toBeVisible();
  await expect(page.locator("#projets a")).toHaveCount(projects.length);
  // Sous 640px les liens du nav desktop sont masqués (nav.tsx:38) : le point
  // d'entrée de navigation est le hamburger (mobile-menu.tsx:30).
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeVisible();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "débordement horizontal").toBeLessThanOrEqual(clientWidth + 1);
});

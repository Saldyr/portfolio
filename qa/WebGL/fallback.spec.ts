import fs from "node:fs";
import { expect, test } from "playwright/test";
import { ROUTES, WEBGL_MIN_WIDTH } from "../qa.config";
import {
  collectConsole,
  dustGeometry,
  evidencePath,
  installDustProbe,
  readProbe,
  sampleDrawRate,
  writeEvidence,
} from "./dust.helpers";

/**
 * Deux pannes distinctes :
 *  1. WebGL2 indisponible au montage — `getContext("webgl2")` renvoie null.
 *     Simulé en enveloppant `getContext` avant chargement du document ; c'est
 *     le chemin exact du composant (`if (!gl) return;`).
 *  2. Perte du contexte en cours de vie — provoquée pour de vrai via
 *     l'extension WEBGL_lose_context, disponible sur cette pile GL.
 */

test("fallback: WebGL2 indisponible — le site reste entièrement utilisable", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(120_000);
  await installDustProbe(context, { failWebgl2: true });
  const consoleLog = collectConsole(page);

  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);

  const probe = await readProbe(page);
  const geometry = await dustGeometry(page);

  // Le composant a bien tenté, a reçu null, et s'est arrêté là.
  expect(probe.contextCalls, "aucune tentative de contexte").toHaveLength(1);
  expect(probe.contextCalls[0].ok).toBe(false);
  expect(probe.hasContext).toBe(false);
  expect(probe.draws, "des frames sont dessinées sans contexte").toBe(0);
  // `resize()` n'est jamais atteint : le canvas garde sa taille intrinsèque.
  expect(probe.canvasSizes, "le canvas a été redimensionné malgré l'absence de contexte").toEqual([]);

  // Désactivation silencieuse : rien dans la console.
  expect(
    consoleLog.errors(),
    `erreurs console alors que la désactivation doit être silencieuse : ${JSON.stringify(consoleLog.errors())}`,
  ).toHaveLength(0);

  // Le fond CSS, lui, reste complet et animé.
  const backdrop = await page.evaluate(() => ({
    layers: [
      ".site-backdrop__ambiance",
      ".site-backdrop__spill",
      ".site-backdrop__image",
      ".site-backdrop__vignette",
      ".site-backdrop__grain",
    ].filter((s) => !!document.querySelector(s)).length,
    animations: document.getAnimations().length,
  }));
  expect(backdrop.layers, "calques CSS du fond manquants").toBe(5);
  expect(backdrop.animations, "fond CSS figé").toBeGreaterThan(0);

  // Contenu et parcours principaux.
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Je construis des agents, des jeux et des outils web.",
    }),
  ).toBeVisible();
  await expect(page.locator("#projets a")).toHaveCount(3);
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Message", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Voir les projets", exact: true }).click();
  await expect(page.locator("#projets")).toBeInViewport();

  await page.goto(ROUTES.projectWithDetail);
  await expect(page.getByRole("heading", { level: 1, name: "Noiseless Mind" })).toBeVisible();

  fs.writeFileSync(
    evidencePath(`sans-webgl-${testInfo.project.name}.png`),
    await page.screenshot({ fullPage: true }),
  );
  writeEvidence(`sans-webgl-${testInfo.project.name}`, { probe, geometry, console: consoleLog.all });
});

test("fallback: perte réelle du contexte en cours de vie (WEBGL_lose_context)", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(120_000);
  await installDustProbe(context);
  const consoleLog = collectConsole(page);

  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const geometry = await dustGeometry(page);
  if (geometry.backingWidth === 0) {
    test.skip(true, `bande < ${WEBGL_MIN_WIDTH}px (${geometry.cssWidth}px) : rien à perdre ici`);
  }

  const extensionAvailable = await page.evaluate(() => {
    const gl = (window as unknown as { __dustProbe: { gl: WebGL2RenderingContext | null } })
      .__dustProbe.gl;
    return !!gl?.getExtension("WEBGL_lose_context");
  });
  expect(extensionAvailable, "WEBGL_lose_context indisponible : panne non simulable").toBe(true);

  const before = await sampleDrawRate(page, 1500);

  await page.evaluate(() => {
    const gl = (window as unknown as { __dustProbe: { gl: WebGL2RenderingContext | null } })
      .__dustProbe.gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await page.waitForTimeout(800);

  const afterLoss = await sampleDrawRate(page, 3000);
  const probe = await readProbe(page);

  // La panne a bien eu lieu, et n'est pas récupérée.
  expect(probe.lostAt, "aucun événement webglcontextlost").toHaveLength(1);
  expect(probe.isLost, "contexte non marqué perdu").toBe(true);
  expect(probe.restoredAt, "contexte restauré : le composant ne prévoit pourtant rien pour ça").toEqual([]);

  // Ce qui doit rester vrai : le site reste utilisable et silencieux côté JS.
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Je construis des agents, des jeux et des outils web.",
    }),
  ).toBeVisible();
  await expect(page.locator("#projets a")).toHaveCount(3);
  await page.getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page.locator("#contact")).toBeInViewport();
  const pageErrors = consoleLog.all.filter((e) => e.type === "pageerror");
  expect(pageErrors, `exceptions après la perte du contexte : ${JSON.stringify(pageErrors)}`).toHaveLength(0);

  fs.writeFileSync(
    evidencePath(`contexte-perdu-${testInfo.project.name}.png`),
    await page.screenshot({ fullPage: true }),
  );

  /* Mesure conservée sans assertion : le composant n'écoute pas
     `webglcontextlost`, la boucle rAF continue donc d'appeler `drawArrays`
     sur un contexte mort (appels sans effet). Constat reporté dans
     qa/Reports/webgl-2026-08-13.md ; le figer en assertion reviendrait à
     graver un comportement qui n'est pas un contrat. */
  writeEvidence(`contexte-perdu-${testInfo.project.name}`, {
    beforeLoss: before,
    afterLoss,
    stillDrawing: afterLoss.frames > 0,
    probe,
    consoleWarnings: consoleLog.all.filter((e) => /CONTEXT_LOST_WEBGL/.test(e.text)),
  });
});

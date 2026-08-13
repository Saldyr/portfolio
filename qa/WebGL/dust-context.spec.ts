import { expect, test } from "playwright/test";
import { ROUTES, WEBGL_MIN_WIDTH } from "../qa.config";
import {
  collectConsole,
  drainGlErrors,
  dustGeometry,
  installDustProbe,
  readPixels,
  readProbe,
  writeEvidence,
} from "./dust.helpers";

test("dust: contexte webgl2 obtenu, aucune erreur console", async ({ page, context }, testInfo) => {
  await installDustProbe(context);
  const consoleLog = collectConsole(page);

  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const probe = await readProbe(page);

  // Un seul canvas WebGL2 sur la page : celui de Dust.
  expect(probe.contextCalls, "aucun appel getContext('webgl2')").toHaveLength(1);
  expect(probe.contextCalls[0].className).toContain("site-backdrop__dust");
  expect(probe.contextCalls[0].ok, "getContext('webgl2') a renvoyé null").toBe(true);
  expect(probe.hasContext).toBe(true);

  // Attributs réellement demandés par src/components/dust.tsx.
  expect(probe.contextCalls[0].attrs).toMatchObject({
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });

  // Le contexte doit survivre au chargement (harness-gl-flags.spec.ts
  // vérifie la stabilité du harnais lui-même).
  expect(probe.isLost, "contexte WebGL2 perdu après le chargement").toBe(false);
  expect(probe.lostAt, "événements webglcontextlost pendant le chargement").toEqual([]);

  // Compilation/link des shaders : le composant logge "dust: shader" /
  // "dust: link" en cas d'échec, et rien sinon.
  const dustErrors = consoleLog.all.filter((e) => e.text.startsWith("dust:"));
  expect(dustErrors, `erreurs shader/link : ${JSON.stringify(dustErrors)}`).toHaveLength(0);
  expect(
    consoleLog.errors(),
    `erreurs console : ${JSON.stringify(consoleLog.errors())}`,
  ).toHaveLength(0);

  expect(await drainGlErrors(page), "drapeau d'erreur GL levé").toEqual([]);

  writeEvidence(`context-${testInfo.project.name}`, {
    project: testInfo.project.name,
    probe,
    geometry: await dustGeometry(page),
    consoleAll: consoleLog.all,
  });
});

test("dust: le canvas est purement décoratif (aria-hidden, non interactif)", async ({ page }) => {
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");

  const canvas = page.locator(".site-backdrop__dust");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("aria-hidden", "true");

  // Le fond ne doit jamais intercepter le pointeur.
  const pointerEvents = await page.evaluate(
    () => getComputedStyle(document.querySelector(".site-backdrop")!).pointerEvents,
  );
  expect(pointerEvents).toBe("none");

  const geometry = await dustGeometry(page);
  if (geometry.cssWidth < WEBGL_MIN_WIDTH) test.skip(true, "bande de poussière désactivée à ce viewport");

  // Un point au centre de la bande doit atteindre le contenu, pas le canvas.
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.className ?? null,
    {
      x: Math.round(geometry.viewport[0] - geometry.cssWidth / 2),
      y: Math.round(geometry.viewport[1] / 2),
    },
  );
  expect(String(hit)).not.toContain("site-backdrop__dust");
});

test("dust: le canvas rend réellement de la lumière (back-buffer non vide)", async ({
  page,
  context,
}, testInfo) => {
  await installDustProbe(context);
  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const geometry = await dustGeometry(page);
  if (geometry.backingWidth === 0) {
    test.skip(true, `bande < ${WEBGL_MIN_WIDTH}px (${geometry.cssWidth}px) : canvas désactivé par conception`);
  }

  const pixels = await readPixels(page);
  expect(pixels.available, `lecture impossible : ${JSON.stringify(pixels)}`).toBe(true);
  if (!pixels.available) return;

  // Fond noir opaque + particules lumineuses : quelques pixels non nuls
  // suffisent à prouver que le shader a écrit, sans figer un seuil visuel.
  expect(pixels.nonZero, "aucun pixel lumineux dans le back-buffer").toBeGreaterThan(0);
  expect(pixels.max, "luminance maximale nulle").toBeGreaterThan(0);

  writeEvidence(`pixels-${testInfo.project.name}`, { geometry, pixels });
});

import { expect, test } from "playwright/test";
import { ROUTES, WEBGL_MIN_WIDTH } from "../qa.config";
import {
  collectConsole,
  dustGeometry,
  installDustProbe,
  readProbe,
  sampleDrawRate,
  writeEvidence,
} from "./dust.helpers";

/**
 * Vérifie que le harnais lui-même expose un contexte WebGL2 EXPLOITABLE (et
 * pas seulement créable), avec les `launchOptions` par défaut du projet
 * (`--enable-webgl --ignore-gpu-blocklist`, `qa/playwright.config.ts`).
 *
 * Historique (corrigé) : le config incluait aussi `--use-gl=swiftshader`,
 * qui provoquait la perte du contexte WebGL2 au bout de ~4 frames
 * (`webglcontextlost`, jamais restauré), y compris pour un canvas WebGL2
 * témoin sans rapport avec le site — ce test le documentait et échouait.
 * Le flag a été retiré du config ; ce test reste en place comme garde-fou
 * de non-régression sur la stabilité du contexte.
 */

test("harnais: le contexte WebGL2 doit survivre au-delà des premières frames", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(120_000);
  await installDustProbe(context);
  const consoleLog = collectConsole(page);

  await page.goto(ROUTES.home);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const geometry = await dustGeometry(page);
  if (geometry.backingWidth === 0) {
    test.skip(true, `bande < ${WEBGL_MIN_WIDTH}px (${geometry.cssWidth}px) : aucune frame à observer`);
  }

  const rate = await sampleDrawRate(page, 3000);
  const probe = await readProbe(page);

  /* Contrôle : un canvas WebGL2 indépendant du site, créé APRÈS la fenêtre de
     perte. S'il survit, c'est que la pile GL reste utilisable ensuite — la
     perte frappe le contexte présent au démarrage du rendu, pas n'importe
     quel contexte créé plus tard. */
  const control = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    canvas.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
    document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl2");
    if (!gl) return { created: false, lost: null, draws: 0 };
    for (let i = 0; i < 30; i++) {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      await new Promise((r) => requestAnimationFrame(r));
    }
    const lost = gl.isContextLost();
    canvas.remove();
    return { created: true, lost, draws: 30 };
  });

  writeEvidence(`harnais-flags-${testInfo.project.name}`, {
    launchArgs: testInfo.project.use.launchOptions?.args ?? null,
    geometry,
    rate,
    probe,
    controlCanvasCreatedAfterLoss: control,
    consoleWarnings: consoleLog.all.filter((e) => /CONTEXT_LOST_WEBGL/.test(e.text)),
  });

  expect(
    probe.contextCalls[0]?.ok,
    "getContext('webgl2') a échoué : aucune pile GL disponible dans ce Chromium",
  ).toBe(true);

  expect(
    probe.lostAt,
    `contexte WebGL2 perdu après ${probe.lostAt[0]} frame(s) sous les flags du projet ` +
      `(${JSON.stringify(testInfo.project.use.launchOptions?.args)}), sans restauration. ` +
      `Canvas témoin créé après la perte : perdu = ${control.lost}.`,
  ).toEqual([]);

  expect(probe.isLost, "contexte WebGL2 mort : les tests WebGL n'observeraient rien").toBe(false);
});

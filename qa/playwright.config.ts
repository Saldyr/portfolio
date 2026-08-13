import path from "node:path";
import { defineConfig, devices } from "playwright/test";
import { BASE_URL, PORT } from "./qa.config";

const projectRoot = path.resolve(__dirname, "..");

/**
 * Suites qa/* exécutées contre un build de production (voir QA_PLAN.md
 * section 5) : le mode dev affiche des éléments (indicateur Next) absents
 * en prod et pollueraient les captures Visual.
 */
export default defineConfig({
  testDir: ".",
  testIgnore: ["**/Reports/**", "**/Performance/**", "**/__snapshots__/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Valeur mesurée stable sur cette machine (voir qa/README.md) : au-delà de
  // 2 workers, la saturation CPU fait planter des sessions Chromium
  // (Runtime.callFunctionOn: session closed), pas des échecs d'assertion.
  workers: 2,
  reporter: [
    ["html", { outputFolder: "Reports/html", open: "never" }],
    ["json", { outputFile: "Reports/results.json" }],
    ["list"],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build && npm run start -- -p " + PORT,
    url: BASE_URL,
    cwd: projectRoot,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Chromium headless nécessite SwiftShader/ANGLE pour exposer webgl2
        // (QA_PLAN.md section 6, risque 3) — sans ça Dust s'autodésactive
        // silencieusement et les tests WebGL passeraient à vide.
        launchOptions: {
          args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
        },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
        launchOptions: {
          args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
        },
      },
    },
  ],
});

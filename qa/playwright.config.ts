// Doit précéder le chargement de toute spec : plusieurs d'entre elles
// importent src/lib/projects.ts, qui importe statiquement des images. Voir le
// fichier pour le mode d'échec exact.
import "./support/register-image-imports";
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
  // Refuse de tester un serveur préexistant qui sert un autre build que `.next/`.
  // `reuseExistingServer` ci-dessous adopte tel quel un `next start`
  // déjà en écoute ; sans cette garde, la suite valide silencieusement du code
  // jamais compilé. Voir qa/support/assert-fresh-server.ts.
  globalSetup: "./support/assert-fresh-server.ts",
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
    // RESEND_API_KEY exclue : qa/Functional/contact-form.spec.ts et les specs
    // visuelles/responsive soumettent réellement le formulaire de contact ;
    // avec la clé présente, chaque run envoie un vrai email via Resend.
    env: { ...process.env, RESEND_API_KEY: "" },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Fait vérifié (qa/WebGL/harness-gl-flags.spec.ts) : --use-gl=swiftshader
        // provoque une perte du contexte WebGL2 après ~4 frames, jamais
        // restaurée, y compris pour un canvas témoin sans rapport avec le
        // site. Retiré. --enable-webgl --ignore-gpu-blocklist suffisent à
        // exposer un contexte WebGL2 stable en headless.
        launchOptions: {
          args: ["--enable-webgl", "--ignore-gpu-blocklist"],
        },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
        launchOptions: {
          args: ["--enable-webgl", "--ignore-gpu-blocklist"],
        },
      },
    },
  ],
});

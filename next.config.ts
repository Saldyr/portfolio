import type { NextConfig } from "next";

// Variables d'environnement fournies par le projet (hors variables injectées
// par la plateforme, ex. VERCEL_PROJECT_PRODUCTION_URL) requises en
// production/preview Vercel. Voir README.md pour la procédure d'ajout.
const REQUIRED_ENV_VARS = ["RESEND_API_KEY"] as const;

// Garde de build : une variable requise absente en prod/preview Vercel ne
// doit jamais passer silencieusement (voir POR-25/POR-26). Restreinte à
// VERCEL_ENV pour ne pas casser les builds locaux et `npm run qa`, qui vide
// volontairement RESEND_API_KEY (voir qa/playwright.config.ts, POR-15/POR-16).
const vercelEnv = process.env.VERCEL_ENV;
if (vercelEnv === "production" || vercelEnv === "preview") {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Variable(s) d'environnement requise(s) manquante(s) pour ce build Vercel (${vercelEnv}) : ${missing.join(", ")}`,
    );
  }
}

const nextConfig: NextConfig = {
  // Indicateur de dev par défaut (bottom-left) chevauche le CTA hero et
  // le titre "PROJETS" à certaines tailles d'écran ; invisible en prod.
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;

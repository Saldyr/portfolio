/**
 * Constantes partagées entre les suites qa/*.
 * Source des choix : Portfolio_QA/QA_PLAN.md (sections 2 et 5).
 */

// Surchargeable par QA_PORT. Motif vérifié : un `next start` resté orphelin
// sur le port par défaut est réutilisé tel quel par `reuseExistingServer`
// (qa/playwright.config.ts) ET par qa/run-all.mjs.
//
// Depuis POR-52, ce cas n'est plus silencieux : la garde `globalSetup` de
// qa/support/assert-fresh-server.ts compare le build servi à `.next/BUILD_ID`
// et fait échouer le run plutôt que de produire un faux vert. QA_PORT reste le
// moyen le plus simple de contourner un port occupé — ce n'est simplement plus
// la seule chose qui sépare d'un résultat faux.
//
// Angle mort restant : `npm run test:qa:perf`
// (qa/Performance/lighthouse.run.mjs) ne passe pas par Playwright et n'est donc
// pas couvert par cette garde.
function resolvePort() {
  const raw = process.env.QA_PORT;
  if (raw === undefined || raw === "") return 3100;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`QA_PORT invalide : "${raw}" (entier attendu entre 1 et 65535).`);
  }
  return parsed;
}

export const PORT = resolvePort();
export const BASE_URL = `http://localhost:${PORT}`;

export const ROUTES = {
  home: "/",
  contact: "/contact",
  aPropos: "/a-propos",
  projectWithDetail: "/projets/noiseless-mind",
  // POR-18 : pas de `projectWithoutDetail` ici. Un slug figé reperime au
  // prochain projet qui gagne un `detail` (c'était le cas de hermes-agent).
  // Les specs concernées dérivent le cas de src/lib/projects.ts ; ce fichier
  // reste sans import applicatif, car qa/playwright.config.ts l'importe et ne
  // doit pas dépendre de l'alias `@/` pour se charger.
  projectUnknown: "/projets/does-not-exist",
} as const;

// Breakpoints listés dans QA_PLAN.md section 2 (Responsive/breakpoints.spec.ts).
export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  mobileLarge: { width: 768, height: 1024 },
  tablet: { width: 1024, height: 1366 },
  desktop: { width: 1280, height: 800 },
  desktopLarge: { width: 1920, height: 1080 },
} as const;

// Dust (src/components/dust.tsx) se désactive sous cette largeur.
export const WEBGL_MIN_WIDTH = 220;

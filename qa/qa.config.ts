/**
 * Constantes partagées entre les suites qa/*.
 * Source des choix : Portfolio_QA/QA_PLAN.md (sections 2 et 5).
 */

// Surchargeable par QA_PORT. Motif vérifié : un `next start` resté orphelin
// sur le port par défaut est réutilisé tel quel par `reuseExistingServer`
// (qa/playwright.config.ts) ET par qa/run-all.mjs.
//
// Ce cas n'est pas silencieux : la garde `globalSetup` de
// qa/support/assert-fresh-server.ts compare le build servi à `.next/BUILD_ID`
// et fait échouer le run plutôt que de produire un faux vert. QA_PORT reste le
// moyen le plus simple de contourner un port occupé — ce n'est simplement pas
// la seule chose qui sépare d'un résultat faux.
//
// `npm run test:qa:perf` (qa/Performance/lighthouse.run.mjs),
// qui ne passe pas par Playwright, porte la même garde dupliquée en JS pur.
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
  // Pas de `projectWithoutDetail` ici, et il n'y en a plus à dériver —
  // tous les projets portent un `detail`. Ce fichier reste sans
  // import applicatif, car qa/playwright.config.ts l'importe et ne doit pas
  // dépendre de l'alias `@/` pour se charger ; les specs qui ont besoin des
  // données projet importent src/lib/projects.ts elles-mêmes.
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

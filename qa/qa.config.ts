/**
 * Constantes partagées entre les suites qa/*.
 * Source des choix : Portfolio_QA/QA_PLAN.md (sections 2 et 5).
 */

export const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;

export const ROUTES = {
  home: "/",
  contact: "/contact",
  aPropos: "/a-propos",
  projectWithDetail: "/projets/noiseless-mind",
  projectWithoutDetail: "/projets/hermes-agent",
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

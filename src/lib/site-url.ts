// Origine du site, utilisée par les métadonnées (src/app/layout.tsx), le
// sitemap et robots.txt. Domaine de prod injecté par Vercel
// (VERCEL_PROJECT_PRODUCTION_URL) ; pas de domaine custom connu à ce jour
// (voir qa/Reports/seo-audit.md, finding LOW-1).
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

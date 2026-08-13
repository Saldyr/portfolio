import type { MetadataRoute } from "next";

// Domaine de prod injecté par Vercel (VERCEL_PROJECT_PRODUCTION_URL) ; pas de
// domaine custom connu à ce jour (voir qa/Reports/seo-audit.md, finding LOW-1).
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

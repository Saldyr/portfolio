import type { MetadataRoute } from "next";
import { projects } from "@/lib/projects";

// Domaine de prod injecté par Vercel (VERCEL_PROJECT_PRODUCTION_URL) ; pas de
// domaine custom connu à ce jour (voir qa/Reports/seo-audit.md, finding LOW-1).
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  // Seuls les slugs avec `detail` ont une route réelle ; les autres projets
  // pointent vers /#projets (déjà couvert par l'entrée home).
  const detailPages = projects.filter((project) => project.detail);

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/a-propos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...detailPages.map((project) => ({
      url: `${SITE_URL}${project.href}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

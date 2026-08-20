import { notFound } from "next/navigation";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";
import { getProjectBySlug, projects } from "@/lib/projects";

export function generateStaticParams() {
  return projects
    .filter((project) => project.detail)
    .map((project) => ({ slug: project.slug }));
}

// Seul `alt` d'image OG resté littéral après POR-46, et c'est délibéré : le
// titre de cette page est `${project.title} — Saldyr` (page.tsx:29), bâti sur
// `openGraph.siteName` que POR-43 a décidé de ne pas centraliser. L'aligner
// sur SITE_NAME le désynchroniserait du titre qu'il décrit. L'invariant
// « alt = titre de la page » de qa/SEO/metadata.spec.ts couvre donc les trois
// routes bâties sur SITE_TITLE, et exclut celle-ci en connaissance de cause.
export const alt = "Aperçu du projet — Saldyr";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project?.detail) notFound();

  return renderOgImage({
    eyebrow: project.detail.tagline,
    title: project.title,
    subtitle: project.detail.subtitle,
  });
}

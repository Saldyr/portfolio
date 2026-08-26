import { notFound } from "next/navigation";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";
import { getProjectBySlug, projects } from "@/lib/projects";

export function generateStaticParams() {
  return projects
    .filter((project) => project.detail)
    .map((project) => ({ slug: project.slug }));
}

// Le titre de cette page est désormais `project.title` seul (page.tsx:29,
// suffixe « — Saldyr » retiré) : plus de littéral à suivre ici, alt reste un
// texte générique indépendant du titre.
export const alt = "Aperçu du projet";
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

import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/button";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { ProjectGallery } from "@/components/project-gallery";
import { SectionHeading } from "@/components/section-heading";
import { Tag } from "@/components/tag";
import { galleryLayout } from "@/lib/gallery-layout";
import { getProjectBySlug, projects } from "@/lib/projects";

export function generateStaticParams() {
  return projects
    .filter((project) => project.detail)
    .map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project?.detail) return {};
  return {
    title: `${project.title} — Saldyr`,
    description: project.detail.subtitle,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project?.detail) notFound();
  const { detail } = project;
  // Ratio commun et largeur de colonne dérivés des dimensions réelles des
  // images de CETTE galerie : une galerie de portraits et une galerie de
  // captures larges n'ont pas la même mise en page (POR-39).
  const gallery = detail.gallery && detail.gallery.length > 0 ? detail.gallery : null;
  const galleryGrid = gallery ? galleryLayout(gallery.map((shot) => shot.image)) : null;

  return (
    <>
      <Nav page="project" />

      <main className="container-page flex flex-col gap-(--gap-section) pt-10">
        <section className="flex flex-col gap-(--space-l)">
          <Link
            href="/#projets"
            className="font-mono text-xs uppercase tracking-(--tracking-caps) text-(--text-muted) transition-colors duration-150 hover:text-accent"
          >
            ← Tous les projets
          </Link>
          <div className="flex flex-col gap-(--space-m)">
            <div className="font-mono text-[13px] font-medium uppercase tracking-(--tracking-caps) text-accent">
              {detail.tagline}
            </div>
            <h1 className="m-0 text-[clamp(40px,6.5vw,68px)] font-bold leading-none tracking-[-0.035em]">
              {project.title}
            </h1>
            <p className="m-0 max-w-[56ch] text-lg leading-[1.7] text-(--text-muted) text-pretty">
              {detail.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-(--space-s)">
            <Tag variant="accent">{project.status}</Tag>
            {detail.badges?.map((badge) => (
              <Tag key={badge.label} variant={badge.accent ? "accent" : "neutral"}>
                {badge.label}
              </Tag>
            ))}
          </div>
        </section>

        {detail.heroImage && (
          <div className="relative h-[clamp(200px,38vw,420px)] overflow-hidden rounded-card border border-(--border-subtle) bg-(--leaf-void)">
            <Image
              src={detail.heroImage}
              alt={project.title}
              fill
              className="object-cover"
              sizes="(min-width: 1120px) 1120px, 100vw"
              priority
            />
          </div>
        )}

        <section className="flex flex-wrap items-start gap-(--space-xl)">
          <aside className="sticky top-(--space-l) flex max-w-70 flex-[1_1_220px] flex-col gap-(--space-l)">
            {detail.role && (
              <div className="flex flex-col gap-(--space-m)">
                <div className="font-mono text-xs uppercase tracking-(--tracking-caps) text-(--text-muted)">
                  Rôle
                </div>
                <div className="text-[15px] leading-[1.7]">{detail.role}</div>
              </div>
            )}
            {detail.period && (
              <div className="flex flex-col gap-(--space-m)">
                <div className="font-mono text-xs uppercase tracking-(--tracking-caps) text-(--text-muted)">
                  Période
                </div>
                <div className="text-[15px] leading-[1.7]">{detail.period}</div>
              </div>
            )}
            <div className="flex flex-col gap-(--space-m)">
              <div className="font-mono text-xs uppercase tracking-(--tracking-caps) text-(--text-muted)">
                État
              </div>
              <div className="text-[15px] leading-[1.7]">{project.status}</div>
            </div>
            {detail.demoHref && (
              <Button href={detail.demoHref} variant="secondary" className="self-start">
                Voir la démo
              </Button>
            )}
            {detail.repoHref && (
              <Button href={detail.repoHref} variant="secondary" className="self-start">
                {detail.repoLabel ?? "Code source"}
              </Button>
            )}
          </aside>

          <div className="flex min-w-0 flex-[2_1_420px] flex-col gap-(--space-xl)">
            {/* `story`, `build` et `sections` se CUMULENT, dans cet ordre. La version
                précédente rendait `sections` en ALTERNATIVE aux deux autres : Sportify,
                premier projet à déclarer les trois, perdait silencieusement 3 paragraphes
                et 8 puces — sans qu'aucune spec ne le voie. La non-régression est
                assurée par qa/Functional/project-page.spec.ts. */}
            {detail.story && detail.story.length > 0 && (
              <div className="flex flex-col gap-(--space-m)">
                <SectionHeading>LE POINT DE DÉPART</SectionHeading>
                {detail.story.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="m-0 max-w-[64ch] text-[17px] leading-[1.7] text-pretty"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {detail.build && detail.build.length > 0 && (
              <div className="flex flex-col gap-(--space-m)">
                <SectionHeading>CE QUE J&apos;AI CONSTRUIT</SectionHeading>
                <ul className="m-0 max-w-[64ch] list-disc pl-5 text-[17px] leading-[1.9]">
                  {detail.build.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {detail.sections?.map((section) => (
              <div key={section.heading} className="flex flex-col gap-(--space-m)">
                <SectionHeading>{section.heading}</SectionHeading>
                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="m-0 max-w-[64ch] text-[17px] leading-[1.7] text-pretty"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="m-0 max-w-[64ch] list-disc pl-5 text-[17px] leading-[1.9]">
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {gallery && galleryGrid && (
              <div className="flex flex-col gap-(--space-l)">
                <SectionHeading gap="l">IMAGES</SectionHeading>
                {/* Grille et visionneuse : composant client, cette page étant
                    un composant serveur qui ne peut pas porter l'état
                    d'ouverture (POR-40). `galleryLayout()` reste calculé ici. */}
                <ProjectGallery items={gallery} layout={galleryGrid} />
              </div>
            )}
          </div>
        </section>

        {detail.nextProject && (
          <section className="flex flex-wrap items-center justify-between gap-(--space-l) rounded-card border border-(--border-subtle) bg-surface p-(--pad-card)">
            <div className="flex flex-col gap-(--space-s)">
              <div className="font-mono text-xs uppercase tracking-(--tracking-caps) text-(--text-muted)">
                Projet suivant
              </div>
              <div className="text-[28px] font-semibold tracking-[-0.02em]">
                {detail.nextProject.title}
              </div>
            </div>
            <Button href={detail.nextProject.href}>Voir le projet</Button>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}

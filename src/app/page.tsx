import { Button } from "@/components/button";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { ProjectCard } from "@/components/project-card";
import { projects } from "@/lib/projects";

const HOME_HIDDEN_SLUGS = new Set(["refonte-du-portfolio"]);
const homeProjects = projects.filter(
  (project) => !HOME_HIDDEN_SLUGS.has(project.slug)
);

export default function Home() {
  return (
    <>
      <Nav page="home" />

      <main className="container-page flex flex-1 flex-col gap-(--gap-section) pb-[90px] pt-(--gap-section)">
        <section className="flex flex-col gap-(--space-l) pb-6.25 pt-10">
          <div className="font-mono text-[13px] font-medium uppercase tracking-(--tracking-caps) text-accent">
            Saldyr — Développeur
          </div>
          <h1 className="m-0 max-w-[16ch] text-[clamp(40px,7vw,76px)] font-bold leading-none tracking-[-0.035em] text-balance">
            Construire, créer, imaginer en pilotant l&apos;IA.
          </h1>
          <p className="m-0 max-w-[58ch] text-lg leading-[1.7] text-(--text-muted) text-pretty">
            Chaque projet est un terrain neuf. Une appli mobile, un outil
            desktop, un jeu. Je relis tout ce que l&apos;IA produit : une
            méthode que j&apos;affine à chaque projet. Ce que j&apos;aimerais, c&apos;est
            avancer dans une équipe à taille humaine où l&apos;entraide est
            réelle : y apprendre au contact des autres, gagner en
            expérience et contribuer à des produits qui répondent à de
            vrais besoins.
          </p>
          <div className="flex flex-wrap gap-(--space-m) pt-(--space-m)">
            <Button href="#projets">Voir les projets</Button>
            <Button href="/contact" variant="secondary">
              Me contacter
            </Button>
          </div>
        </section>

        <section id="projets" className="flex flex-col gap-(--space-l)">
          <div className="flex flex-wrap items-baseline justify-between gap-(--space-l) border-b border-(--border-subtle) pb-(--space-m)">
            <h2 className="m-0 text-(length:--type-card-title) font-bold tracking-(--tracking-caps)">
              PROJETS
            </h2>
            <span className="font-mono text-xs text-(--text-muted)">
              {String(homeProjects.length).padStart(2, "0")} — sélection
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-(--space-l)">
            {homeProjects.map((project) => (
              <ProjectCard
                key={project.slug}
                href={project.href}
                meta={project.meta}
                title={project.title}
                desc={project.desc}
                tags={project.tags}
                image={project.image}
                imageFit={project.imageFit}
                imagePosition={project.imagePosition}
                status={project.status}
              />
            ))}
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}

import { Button } from "@/components/button";
import { ContactForm } from "@/components/contact-form";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { projects } from "@/lib/projects";

export default function Home() {
  return (
    <>
      <Nav page="home" />

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[clamp(40px,6vw,65px)] px-[clamp(20px,5vw,40px)] pb-[90px] pt-[clamp(40px,6vw,65px)]">
        <section className="flex flex-col gap-(--space-l) pb-6.25 pt-10">
          <div className="font-mono text-[13px] font-medium uppercase tracking-(--tracking-caps) text-accent">
            Développeur
          </div>
          <h1 className="m-0 max-w-[16ch] text-[clamp(40px,7vw,76px)] font-bold leading-none tracking-[-0.035em] text-balance">
            Je construis des agents, des jeux et des outils web.
          </h1>
          <p className="m-0 max-w-[58ch] text-lg leading-[1.7] text-(--text-muted) text-pretty">
            Deux ou trois lignes à réécrire avec tes mots : ce que tu
            cherches, ce sur quoi tu travailles en ce moment, ce qui
            t&apos;intéresse dans un projet.
          </p>
          <div className="flex flex-wrap gap-(--space-m) pt-(--space-m)">
            <Button href="#projets">Voir les projets</Button>
            <Button href="#contact" variant="secondary">
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
              {String(projects.length).padStart(2, "0")} — sélection
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-(--space-l)">
            {projects.map((project) => (
              <ProjectCard
                key={project.slug}
                href={project.href}
                meta={project.meta}
                title={project.title}
                desc={project.desc}
                tags={project.tags}
                image={project.image}
              />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-(--space-xl)">
          <SectionHeading>À PROPOS</SectionHeading>
          <div className="flex flex-col gap-(--space-l)">
            <p className="m-0 max-w-[62ch] text-[17px] leading-[1.7] text-pretty">
              Paragraphe à réécrire : ton parcours en trois phrases, ce que tu
              fais le mieux, et ce que tu veux faire ensuite. Garde-le court —
              la page projet portera les détails.
            </p>
            <div className="flex flex-wrap gap-(--space-l) font-mono text-xs leading-[1.8] text-(--text-muted)">
              <div>
                Stack
                <br />
                <span className="text-foreground">Next.js · TypeScript</span>
              </div>
              <div>
                Disponibilité
                <br />
                <span className="text-foreground">À préciser</span>
              </div>
              <div>
                Localisation
                <br />
                <span className="text-foreground">À préciser</span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-(--space-xl) rounded-card border border-(--border-subtle) bg-surface p-[clamp(25px,4vw,40px)]"
        >
          <div className="flex flex-col gap-(--space-m)">
            <SectionHeading>CONTACT</SectionHeading>
            <p className="m-0 max-w-[40ch] text-sm leading-[1.7] text-(--text-muted)">
              Une question, une piste de collaboration : écris-moi, je
              réponds sous 48 h.
            </p>
          </div>
          <ContactForm />
        </section>

        <Footer />
      </main>
    </>
  );
}

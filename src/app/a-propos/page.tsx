import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "À propos — Saldyr",
  description:
    "Parcours et stack de Saldyr, développeur full-stack junior.",
};

export default function AProposPage() {
  return (
    <>
      <Nav page="apropos" />

      <main className="container-page flex flex-col gap-(--gap-section) pt-(--gap-section)">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-(--space-xl)">
          <SectionHeading>À PROPOS</SectionHeading>
          <div className="flex flex-col gap-(--space-l)">
            <p className="m-0 max-w-[62ch] text-[17px] leading-[1.7] text-pretty">
              Je suis venu au dev par une conversation avec un ami
              d&apos;enfance, ingénieur R&amp;D en logiciel embarqué, qui
              m&apos;a montré du code — j&apos;ai adoré, et j&apos;ai
              commencé en autodidacte. Pour aller plus loin, j&apos;ai
              quitté un poste de fonctionnaire à la Métropole de Lyon en
              2024 pour me reconvertir sérieusement : une première
              formation développeur full-stack m&apos;a donné de bonnes
              bases théoriques — front, back, MVC, UI/UX — qu&apos;il me
              manquait encore de mettre en pratique. Depuis janvier 2026,
              je termine un titre Concepteur Développeur
              d&apos;Application chez Alt, en formation réelle avec des
              devs expérimentés : TypeScript, Node, NestJS, Prisma,
              React, Docker, CI/CD, conception et travail en équipe avec
              Git. C&apos;est là que j&apos;ai vraiment gagné en
              compréhension et en autonomie.
            </p>
            <p className="m-0 max-w-[62ch] text-[17px] leading-[1.7] text-pretty">
              Aujourd&apos;hui je mise sur le pilotage de l&apos;IA pour
              livrer du code utile rapidement — une voie qui me semble
              ouvrir le plus de portes tant que le secteur évolue à ce
              rythme. Je cherche un poste de développeur full-stack IA
              dans une petite structure — startup, agence ou boîte tech
              à taille humaine — où l&apos;esprit d&apos;équipe et le
              partage de connaissances comptent vraiment. J&apos;ai
              envie de construire des produits utiles au grand public,
              que ce soit des sites, des jeux vidéo, des applications ou
              des SaaS, portés par des équipes passionnées et à taille
              humaine.
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
                <span className="text-foreground">Immédiate</span>
              </div>
              <div>
                Localisation
                <br />
                <span className="text-foreground">Lyon / Annecy</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

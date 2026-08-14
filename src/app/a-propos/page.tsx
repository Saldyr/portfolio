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

      <main className="container-page flex flex-1 flex-col gap-(--gap-section) pb-[90px] pt-(--gap-section)">
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

        <Footer />
      </main>
    </>
  );
}

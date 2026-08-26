import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { SectionHeading } from "@/components/section-heading";
import { SITE_AUTHOR } from "@/lib/site";

export const metadata: Metadata = {
  title: `À propos`,
  description:
    `Parcours et stack de ${SITE_AUTHOR}, développeur full-stack junior.`,
};

/**
 * Les dates ne sont plus dans les paragraphes : elles sont ICI. La frise et le
 * texte se répartissent l'information, ils ne la répètent pas — un « 2024 » qui
 * apparaîtrait aux deux endroits ferait bégayer la page.
 * `now` marque la seule étape en cours : la lueur anis signale une source
 * active, jamais un repère ordinaire (cf. globals.css, section Lumière).
 */
const TIMELINE = [
  {
    year: "2024",
    event: "Départ de la Métropole de Lyon pour me reconvertir",
  },
  {
    year: "2024-2025",
    event: "Formation développeur full-stack : front, back, MVC, UI/UX",
  },
  {
    year: "2026",
    event: "Concepteur Développeur d'Application chez Alt",
  },
  {
    year: "Aujourd'hui",
    event: "Développeur full-stack IA, en recherche d'un poste",
    now: true,
  },
];

/**
 * Le filet ne relie que des repères entre eux : il naît sous une pastille et
 * meurt sur la suivante. Porté par chaque <li> sauf le dernier (`last:before:
 * hidden`), il s'arrête donc exactement sur « Aujourd'hui » au lieu de le
 * dépasser de la hauteur du dernier libellé. La pastille suivante, opaque et
 * peinte après, recouvre le dépassement de 4px qui évite une coupure visible.
 *
 * Pas de dégradé vers l'anis sur le filet : c'est la pastille active qui porte
 * la lueur, seule (globals.css, section Lumière). Un dégradé aurait en plus
 * demandé un point de bascule calibré à la main, faux dès qu'on ajoute une
 * étape — et qu'aucun test ne verrait bouger.
 */
const RAIL = [
  "before:absolute before:start-1 before:top-4 before:w-px",
  "before:bottom-[calc(var(--space-xl)*-1-4px)]",
  "before:bg-(--border-subtle) last:before:hidden",
].join(" ");

export default function AProposPage() {
  return (
    <>
      <Nav page="apropos" />

      <main className="container-page flex flex-col gap-(--gap-section) pt-(--gap-section)">
        <section className="flex flex-col gap-(--space-l)">
          <SectionHeading>À PROPOS</SectionHeading>

          {/* Mêmes proportions que l'aside des fiches projet (1_1_220 / 2_1_420,
              max-w-70) : à 835px de zone utile la frise fait ~270px et le texte
              ~520px, soit enfin les 62ch que `max-w-[62ch]` demande. La grille
              auto-fit précédente coupait en deux parts égales et bloquait le
              texte à 46 caractères par ligne. `flex-wrap` empile frise puis
              texte dès que la colonne de lecture ne tient plus. */}
          <div className="flex flex-wrap items-start gap-(--space-xl)">
            <ol
              role="list"
              className="relative m-0 flex max-w-70 flex-[1_1_220px] list-none flex-col gap-(--space-xl) p-0"
            >
              {TIMELINE.map((step) => (
                <li key={step.year} className={`relative flex flex-col gap-(--space-m) ps-(--space-l) ${RAIL}`}>
                  {/* Opaque, pas transparent : la pastille doit interrompre le
                      filet qui passe dessous, pas le laisser la traverser. */}
                  <span
                    aria-hidden
                    className={`absolute start-0 top-1 size-2.5 rounded-full border ${
                      step.now
                        ? "border-accent bg-accent"
                        : "border-(--border-subtle) bg-background"
                    }`}
                  />
                  <div
                    className={`font-mono text-xs uppercase tracking-(--tracking-caps) ${
                      step.now ? "text-accent" : "text-(--text-muted)"
                    }`}
                  >
                    {step.year}
                  </div>
                  <div className="text-[15px] leading-[1.7]">{step.event}</div>
                </li>
              ))}
            </ol>

            <div className="flex min-w-0 flex-[2_1_420px] flex-col gap-(--space-l)">
              <p className="m-0 max-w-[62ch] text-[17px] leading-[1.7] text-pretty">
                Je suis venu au dev par une conversation avec un ami
                d&apos;enfance, ingénieur R&amp;D en logiciel embarqué, qui
                m&apos;a montré du code. J&apos;ai adoré, et j&apos;ai
                commencé en autodidacte. Pour aller plus loin, j&apos;ai
                quitté un poste de fonctionnaire pour me reconvertir
                sérieusement : une première formation m&apos;a donné de
                bonnes bases théoriques qu&apos;il me manquait encore de
                mettre en pratique. Chez Alt, j&apos;ai suivi une formation
                réelle avec des devs expérimentés, en conception comme en
                travail d&apos;équipe. C&apos;est là que j&apos;ai vraiment gagné
                en compréhension et en autonomie.
              </p>
              <p className="m-0 max-w-[62ch] text-[17px] leading-[1.7] text-pretty">
                Aujourd&apos;hui je mise sur le pilotage de l&apos;IA pour
                livrer du code utile rapidement : une voie qui me semble
                ouvrir le plus de portes tant que le secteur évolue à ce
                rythme. Je cherche un poste de développeur full-stack IA
                dans une petite structure (startup, agence ou boîte tech
                à taille humaine) où l&apos;esprit d&apos;équipe et le
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
                  <span className="text-foreground">
                    TypeScript · Node · NestJS · Prisma · React · Docker ·
                    CI/CD · Git
                  </span>
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
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

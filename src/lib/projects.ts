export type ProjectBadge = {
  label: string;
  accent?: boolean;
};

export type GalleryItem =
  | { image: string; alt: string }
  | { placeholder: string };

export type ProjectDetail = {
  tagline: string;
  subtitle: string;
  badges: ProjectBadge[];
  role: string;
  period: string;
  status: string;
  demoHref: string;
  heroImage: string;
  story: string[];
  build: string[];
  gallery: GalleryItem[];
  nextProject: { title: string; href: string };
};

export type Project = {
  slug: string;
  meta: string;
  title: string;
  desc: string;
  tags: string[];
  image: string | null;
  href: string;
  detail?: ProjectDetail;
};

export const projects: Project[] = [
  {
    slug: "noiseless-mind",
    meta: "Projet — jeu",
    title: "Noiseless Mind",
    desc: "Jeu d'horreur atmosphérique dans la ville de Fogreach, inspiré de Silent Hill.",
    tags: ["Jeu", "Narration"],
    image: "/uploads/noiselessmind.png",
    href: "/projets/noiseless-mind",
    detail: {
      tagline: "Jeu — en cours",
      subtitle:
        "Jeu d'horreur atmosphérique dans la ville abandonnée de Fogreach, inspiré de Silent Hill.",
      badges: [
        { label: "En cours", accent: true },
        { label: "Horreur" },
        { label: "Narration" },
        { label: "Moteur à préciser" },
      ],
      role: "Conception, direction artistique, développement",
      period: "À préciser",
      status: "Prototype jouable",
      demoHref: "#",
      heroImage: "/uploads/noiselessmind.png",
      story: [
        "Deux ou trois paragraphes à réécrire : d'où vient l'idée, ce que tu voulais faire ressentir au joueur, et pourquoi Fogreach plutôt qu'un autre décor. C'est la partie que les gens lisent vraiment — garde-la personnelle.",
        "La mesure est bloquée à 64 caractères : sur fond sombre, un paragraphe large fatigue avant d'être long. Les titres de section restent en capitales, doublés d'un filet lime de 60px — le même motif que sur toutes les pages.",
      ],
      build: [
        "Une boucle de jeu à réécrire en une ligne.",
        "Un système d'ambiance sonore — le silence comme mécanique.",
        "Une ville explorable, découpée en quartiers.",
      ],
      gallery: [
        { image: "/uploads/noiselessmind.png", alt: "Noiseless Mind" },
        { placeholder: "Capture 2" },
        { placeholder: "Capture 3" },
      ],
      nextProject: { title: "Hermes-Agent", href: "/#projets" },
    },
  },
  {
    slug: "hermes-agent",
    meta: "Projet — agent",
    title: "Hermes-Agent",
    desc: "Agent autonome. Une phrase à écrire : ce qu'il fait, pour qui, ce qui était difficile.",
    tags: ["Agent", "IA"],
    image: "/uploads/hermes-agent.png",
    href: "/#projets",
  },
  {
    slug: "refonte-du-portfolio",
    meta: "2026 — Next.js",
    title: "Refonte du portfolio",
    desc: "Design system maison, rendu statique, ce site.",
    tags: ["Next.js", "Tailwind"],
    image: null,
    href: "/#projets",
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

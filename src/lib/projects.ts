export type ProjectStatus =
  | "Idée"
  | "Prototype"
  | "En construction"
  | "Utilisé tous les jours"
  | "Terminé";

export type ProjectBadge = {
  label: string;
  accent?: boolean;
};

export type GalleryItem = { image: string; alt: string };

export type ProjectDetail = {
  tagline: string;
  subtitle: string;
  badges?: ProjectBadge[];
  role?: string;
  period?: string;
  demoHref?: string;
  heroImage?: string;
  story?: string[];
  build?: string[];
  gallery?: GalleryItem[];
  nextProject?: { title: string; href: string };
};

export type Project = {
  slug: string;
  meta: string;
  title: string;
  desc: string;
  tags: string[];
  image: string | null;
  href: string;
  status: ProjectStatus;
  detail?: ProjectDetail;
};

export const projects: Project[] = [
  {
    slug: "noiseless-mind",
    meta: "Projet — jeu",
    title: "Noiseless Mind",
    desc: "Jeu d'horreur atmosphérique dans la ville de Fogreach, inspiré de Silent Hill. Au stade du worldbuilding visuel.",
    tags: ["Jeu", "Direction artistique"],
    image: "/uploads/noiselessmind.png",
    href: "/projets/noiseless-mind",
    status: "Idée",
    detail: {
      tagline: "Jeu d'horreur — worldbuilding en cours",
      subtitle:
        "Exploration de la ville abandonnée de Fogreach, inspirée de Silent Hill : direction artistique et bestiaire en cours de conception.",
      badges: [{ label: "Horreur" }, { label: "Direction artistique" }],
      role: "Conception, direction artistique",
      heroImage: "/uploads/noiselessmind.png",
      story: [
        "Fogreach est une ville abandonnée, envahie par le brouillard et la végétation — une inspiration assumée de Silent Hill. Le travail actuel porte sur la direction artistique : une image clé posant l'ambiance de la ville, et trois créatures conçues comme premiers ennemis, les Écoutés, les Veilleuses et les Éveillés.",
        "Le projet en est au stade du worldbuilding visuel : aucun prototype jouable n'existe encore, aucun moteur n'a été choisi. La suite consistera à définir la boucle de jeu et les mécaniques d'exploration.",
      ],
      build: [
        "Une image clé définissant l'ambiance visuelle de Fogreach.",
        "Trois créatures conçues : les Écoutés, les Veilleuses, les Éveillés.",
      ],
      gallery: [{ image: "/uploads/noiselessmind.png", alt: "Noiseless Mind — Fogreach" }],
      nextProject: { title: "Hermes-Agent", href: "/projets/hermes-agent" },
    },
  },
  {
    slug: "hermes-agent",
    meta: "Projet — agent IA",
    title: "Hermes-Agent",
    desc: "Système d'orchestration IA personnel, construit sur le framework open source Hermes Agent (Nous Research). Utilisé au quotidien.",
    tags: ["Orchestration IA", "Agent"],
    image: "/uploads/hermes-agent.png",
    href: "/projets/hermes-agent",
    status: "Utilisé tous les jours",
    detail: {
      tagline: "Système d'orchestration IA personnel — utilisé au quotidien",
      subtitle:
        "Couche d'orchestration et d'audit personnelle, construite sur le framework open source Hermes Agent (Nous Research), pour piloter du développement logiciel multi-agents.",
      badges: [
        { label: "Orchestration IA" },
        { label: "Framework open source" },
      ],
      role: "Conception et implémentation d'une couche d'orchestration personnelle (architecture superviseur/workers, méthodologie d'audit, protocoles QA et sécurité) construite sur le framework open source Hermes Agent (Nous Research) — pas le développement du framework lui-même.",
      period: "Depuis juin 2026",
      heroImage: "/uploads/hermes-agent.png",
      story: [
        "Hermes Agent est un framework d'agent IA open source publié par Nous Research. Par-dessus, j'ai construit ma propre couche d'orchestration : une architecture superviseur/workers pour découper le travail entre agents jetables, une méthodologie d'audit qui fait dialoguer deux IA en pairs pour se relire mutuellement, et des protocoles de QA et de sécurité automatisés.",
        "Une première version de cette architecture s'est révélée mal organisée : je l'ai entièrement supprimée pour repartir sur des bases solides. La version actuelle applique des rôles orchestrateur/exécutant formalisés, avec un pair IA qui relit les décisions avant qu'elles ne soient appliquées.",
      ],
      build: [
        "Architecture superviseur/workers, avec workers jetables par ticket.",
        "Méthodologie d'audit par confrontation de deux IA en pairs Principal AI Engineer.",
        "Protocole QA end-to-end via Playwright, avec rapport noté.",
        "Audit de sécurité multi-agents (auth, injections, CORS, Docker, CI/CD) fusionné en un rapport unique.",
        "Rôles orchestrateur/exécutant formalisés pour la gestion de projet multi-conversation.",
      ],
      nextProject: { title: "Noiseless Mind", href: "/projets/noiseless-mind" },
    },
  },
  {
    slug: "refonte-du-portfolio",
    meta: "2026 — Next.js",
    title: "Portfolio personnel",
    desc: "Ce site : design system maison, fond WebGL animé, suite de tests QA intégrée.",
    tags: ["Next.js", "WebGL"],
    image: "/uploads/wallpaper.webp",
    href: "/projets/refonte-du-portfolio",
    status: "En construction",
    detail: {
      tagline: "Portfolio personnel — en ligne, en construction",
      subtitle:
        "Ce site : design system maison, fond WebGL animé, suite de tests QA intégrée, construit avec Next.js 16 et React 19.",
      badges: [{ label: "Next.js" }, { label: "WebGL" }],
      role: "Conception et développement complet — design system, composants, shaders WebGL, suite de tests QA.",
      demoHref: "https://portfolio-saldyr.vercel.app/",
      heroImage: "/uploads/wallpaper.webp",
      story: [
        "Mon premier portfolio personnel, construit avec Next.js 16 et React 19. Le design system, baptisé Nocturne, part d'un fond d'écran réel dont j'ai extrait une palette de huit teintes de feuillage, avec des ratios de contraste calculés pour rester accessibles.",
        "Le fond animé de l'accueil est un shader WebGL2 écrit à la main, sans bibliothèque externe : trois nappes de particules à profondeurs différentes pour un effet de parallaxe, avec un budget de frame borné et la prise en charge explicite de la préférence de mouvement réduit.",
      ],
      build: [
        "Design system \"Nocturne\" : palette extraite d'un wallpaper réel, contrastes AA documentés.",
        "Fond WebGL \"Dust\" en GLSL fait main, accessible (préférence de mouvement réduit gérée).",
        "Suite de tests Playwright : fonctionnel, visuel, responsive, accessibilité, SEO, sécurité, WebGL.",
        "Sitemap et robots.txt générés, avec couverture QA dédiée.",
      ],
      gallery: [
        { image: "/uploads/wallpaper.webp", alt: "Wallpaper source du design system Nocturne" },
      ],
      nextProject: { title: "Noiseless Mind", href: "/projets/noiseless-mind" },
    },
  },
  {
    slug: "sportify",
    meta: "Alternance — NestJS",
    title: "Sportify",
    desc: "Plateforme de gestion de clubs sportifs associatifs, développée en équipe pendant l'alternance. Projet clos.",
    tags: ["NestJS", "Prisma", "Alternance"],
    image: null,
    href: "https://github.com/Saldyr/Sportify",
    status: "Terminé",
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

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
  repoHref?: string;
  repoLabel?: string;
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
  imageFit?: "cover" | "contain";
  imagePosition?: string;
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
    image: "/uploads/noiseless-mind-card.jpg",
    imagePosition: "50% 15%",
    href: "/projets/noiseless-mind",
    status: "Idée",
    detail: {
      tagline: "Jeu d'horreur — worldbuilding en cours",
      subtitle:
        "Exploration de la ville abandonnée de Fogreach, inspirée de Silent Hill : direction artistique et bestiaire en cours de conception.",
      badges: [{ label: "Horreur" }, { label: "Direction artistique" }],
      role: "Conception, direction artistique",
      heroImage: "/uploads/noiseless-mind.png",
      story: [
        "Fogreach est une ville abandonnée, envahie par le brouillard et la végétation — une inspiration assumée de Silent Hill. Le travail actuel porte sur la direction artistique : une image clé posant l'ambiance de la ville, et trois créatures conçues comme premiers ennemis, les Écoutés, les Veilleuses et les Éveillés.",
        "Le projet en est au stade du worldbuilding visuel : aucun prototype jouable n'existe encore, aucun moteur n'a été choisi. La suite consistera à définir la boucle de jeu et les mécaniques d'exploration.",
      ],
      build: [
        "Une image clé définissant l'ambiance visuelle de Fogreach.",
        "Trois créatures conçues : les Écoutés, les Veilleuses, les Éveillés.",
      ],
      gallery: [{ image: "/uploads/noiseless-mind.png", alt: "Noiseless Mind — Fogreach" }],
      nextProject: { title: "Hermes-Agent", href: "/projets/hermes-agent" },
    },
  },
  {
    slug: "hermes-agent",
    meta: "Projet — agent IA",
    title: "Hermes-Agent",
    desc: "Système d'orchestration IA personnel, construit sur le framework open source Hermes Agent (Nous Research). Utilisé au quotidien.",
    tags: ["Orchestration IA", "Agent"],
    image: "/uploads/hermes-agent-card.png",
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
    slug: "gojob",
    meta: "Projet perso — Electron",
    title: "GoJob",
    desc: "Application desktop Windows qui agrège en local les offres d'emploi de plusieurs sources (France Travail, Adzuna, Jooble, Reed, alertes email) dans une interface unique.",
    tags: ["Electron", "React", "TypeScript"],
    image: "/uploads/gojob-card.jpg",
    href: "/projets/gojob",
    status: "Prototype",
    detail: {
      tagline: "Agrégateur d'offres d'emploi — MVP fonctionnel",
      subtitle:
        "GoJob est une application desktop Windows qui agrège en local les offres d'emploi de plusieurs sources (France Travail, Adzuna, Jooble, Reed, alertes email) dans une interface unique, avec recherche et filtres avancés.",
      badges: [{ label: "Electron" }, { label: "Pilotage IA" }],
      role: "Premier projet piloté entièrement par IA : conception de l'architecture et des skills, développement initial via Hermes-Agent (modèle DeepSeek), puis reprise et finalisation avec Claude.",
      heroImage: "/uploads/gojob-dashboard.png",
      repoHref: "https://github.com/Saldyr/GoJob",
      story: [
        "Premier projet personnel piloté avec l'IA de bout en bout : recherche multi-source d'offres d'emploi (France Travail, Adzuna, Jooble, Reed) et par alertes email IMAP, réunies dans un tableau de bord unique avec filtres par mots-clés, source, localisation, type de contrat et télétravail.",
        "Le développement a d'abord été tenté avec Hermes-Agent sur le modèle DeepSeek, qui s'est montré peu fiable ; le projet a ensuite été repris et peaufiné avec Claude. L'application tourne en local (testée sur deux machines après configuration des clés API) et constitue un MVP fonctionnel, avec des points encore à améliorer.",
      ],
      build: [
        "Multi-source : France Travail, Adzuna, Jooble, Reed + alertes IMAP par email.",
        "Stack React + TypeScript + Electron, build via Vite/electron-builder.",
        "Sécurité soignée : credentials chiffrés via safeStorage, context isolation activée, Node integration désactivée, CSP restrictive.",
        "Dashboard de répartition par plateforme, filtres par mots-clés/source/localisation/type de contrat/télétravail.",
        "i18n (FR/ES), state management Zustand.",
        "Livrable installeur NSIS + version portable.",
      ],
      gallery: [
        { image: "/uploads/gojob-onboarding-1.png", alt: "GoJob — écran d'accueil de l'onboarding" },
        { image: "/uploads/gojob-onboarding-2.png", alt: "GoJob — connexion des sources dans l'onboarding" },
        { image: "/uploads/gojob-onboarding-3.png", alt: "GoJob — dernier écran de l'onboarding" },
        { image: "/uploads/gojob-dashboard.png", alt: "GoJob — tableau de bord avec répartition par plateforme" },
        { image: "/uploads/gojob-sidebar.png", alt: "GoJob — navigation latérale de l'application" },
        { image: "/uploads/gojob-offres-plateformes.png", alt: "GoJob — offres regroupées par plateforme" },
        { image: "/uploads/gojob-offres-filtres.png", alt: "GoJob — page Offres d'emploi avec filtres de recherche" },
        { image: "/uploads/gojob-offres-resultats.png", alt: "GoJob — résultats filtrés par mots-clés et contrat" },
        { image: "/uploads/gojob-parametres.png", alt: "GoJob — paramètres de connexion des sources d'offres" },
      ],
      nextProject: { title: "Médaillo", href: "/projets/medaillo" },
    },
  },
  {
    slug: "medaillo",
    meta: "Projet perso — React Native",
    title: "Médaillo",
    desc: "Application mobile qui sert de carnet de santé numérique pour animaux : suivi des soins, vaccinations, rappels de rendez-vous.",
    tags: ["React Native", "Expo", "Mobile"],
    image: "/uploads/medaillo-card.png",
    href: "/projets/medaillo",
    status: "Prototype",
    detail: {
      tagline: "Carnet de santé numérique pour animaux — build in public",
      subtitle:
        "Médaillo est une application mobile React Native (Expo) qui sert de carnet de santé numérique pour animaux : suivi des soins, vaccinations, rappels de rendez-vous, avec à terme une identification par QR code.",
      badges: [{ label: "React Native" }, { label: "Build in public" }],
      role: "Pilotage complet du développement via Claude Code et des skills dédiés, avec gestion du projet dans YouTrack (rédaction des tickets, suivi, commentaires de décision à chaque étape) — l'IA a écrit l'intégralité du code, vérifié et relu par le porteur du projet.",
      heroImage: "/uploads/medaillo-fiche.png",
      repoHref: "https://gitlab.com/romain.cartia/medaillo",
      repoLabel: "Dépôt GitLab",
      story: [
        "Deuxième projet personnel piloté par IA, cette fois documenté publiquement : posts LinkedIn et chaîne TikTok (@medaillo) présentant l'avancement. Médaillo est un carnet de santé numérique pour animaux — suivi des soins et traitements, rappels programmés, avec à terme une identification par QR code.",
        "Le projet suit une architecture en couches, pensée dès le départ pour séparer l'interface du stockage des données et permettre une migration vers le cloud sans réécrire les écrans. La Phase 1 (stockage local) est en cours ; la Phase 2 prévoit comptes utilisateurs, Supabase, une page publique par QR code et la publication sur Google Play.",
      ],
      build: [
        "Stack Expo SDK 57 + TypeScript + expo-router, React Native cross-platform.",
        "Architecture en couches : séparation UI / stockage des données, pensée pour migrer vers le cloud sans toucher aux écrans.",
        "Roadmap claire : Phase 1 stockage local en cours, Phase 2 comptes utilisateurs + Supabase + page publique QR + publication Google Play.",
        "Workflow de branches structuré (main / dev / features).",
        "Build in public sur LinkedIn et TikTok (@medaillo).",
      ],
      gallery: [
        { image: "/uploads/medaillo-vide.png", alt: "Médaillo — écran d'accueil sans animal enregistré" },
        { image: "/uploads/medaillo-liste.png", alt: "Médaillo — liste des animaux enregistrés" },
        { image: "/uploads/medaillo-fiche.png", alt: "Médaillo — fiche animal avec carnet de santé" },
        { image: "/uploads/medaillo-nouveau-soin.png", alt: "Médaillo — formulaire d'ajout d'un soin" },
      ],
      nextProject: { title: "Claude Code", href: "/projets/claude-code" },
    },
  },
  {
    slug: "claude-code",
    meta: "Méthodologie — orchestration IA",
    title: "Claude Code",
    desc: "Architecture par skills pour piloter des sessions Claude Code reproductibles : workflow d'itération, relecture pré-commit, clôture de tickets, intégration YouTrack.",
    tags: ["Orchestration IA", "Méthodologie"],
    image: "/uploads/claude-code-card.jpg",
    imageFit: "contain",
    href: "/projets/claude-code",
    status: "Utilisé tous les jours",
    detail: {
      tagline: "Architecture par skills — utilisée au quotidien sur mes projets",
      subtitle:
        "Un ensemble de skills Claude Code qui structurent chaque session de travail : compréhension validée avant le code, plan relu avant l'implémentation, revue avant le commit, clôture de ticket tracée — utilisé sur ce portfolio et sur Médaillo.",
      badges: [{ label: "Claude Code" }, { label: "Méthodologie" }],
      role: "Conception et écriture de l'ensemble des skills, itérée au fil des projets pilotés par IA.",
      story: [
        "Piloter du développement par IA session après session pose toujours le même problème : sans cadre, chaque session réinvente sa méthode — compréhension bâclée, plan absent, revue sautée, ticket qui ne se ferme jamais vraiment. Cette architecture répond à ça avec un ensemble de skills Claude Code chaînés, chacun responsable d'une étape précise du cycle de développement.",
        "task-flow est le point d'entrée : il force une compréhension validée avant toute exploration du code, un plan explicite (avec red-team des modes d'échec avant de le soumettre), une implémentation qui vérifie en continu ce qui est vérifiable, puis un wrap-up qui trace ce qui a réellement été fait. lead-review relit ensuite le diff avec le recul d'un lead dev avant tout commit, git-commit applique les Conventional Commits et le découpage atomique, et verify-done ferme les tickets en constatant l'état réel du disque et de git — pour les projets sans forge qui ferme automatiquement au merge.",
        "L'intégration avec YouTrack passe par un fichier `.claude/workflow.md` par projet : tracker utilisé, branche de base, gates de validation (lint, build, tests), et le mapping des états du tracker vers les rôles `In Progress` / `To Verify` / `Done`. Pour les tâches qui dépassent une session, un rôle orchestrateur pilote plusieurs conversations exécutantes cloisonnées, chacune responsable d'une tâche unique sans dépendre du contexte des autres.",
      ],
      build: [
        "task-flow : workflow d'itération complet — compréhension validée, plan avec red-team des modes d'échec, implémentation vérifiée en continu, wrap-up tracé sur le ticket.",
        "lead-review : relecture pré-commit du diff contre la spec, la base de connaissances et les conventions du projet.",
        "git-commit : Conventional Commits en anglais, découpage atomique, workflow git du projet.",
        "verify-done : clôture des tickets sans forge, en confrontant la description du ticket à l'état réel du disque et de git.",
        "Intégration YouTrack via `.claude/workflow.md` par projet : tracker, branche de base, gates de validation, mapping des états.",
        "Rôles orchestrateur/exécutant pour la gestion de projet multi-conversation, avec des workers cloisonnés par tâche.",
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
    image: "/uploads/sportify-card.jpg",
    href: "https://github.com/Saldyr/Sportify",
    status: "Terminé",
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

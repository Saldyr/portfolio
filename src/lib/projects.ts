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

export type ProjectSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

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
  sections?: ProjectSection[];
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
    slug: "hermes-agent",
    meta: "Projet — assistant IA",
    title: "Hermes-Agent",
    desc: "Assistant IA que j'utilise au quotidien : mémoire de mes projets, décisions journalisées, montée en compétence, veille tech filtrée.",
    tags: ["Assistant IA", "Mémoire et organisation"],
    image: "/uploads/hermes-agent-card.png",
    href: "/projets/hermes-agent",
    status: "Utilisé tous les jours",
    detail: {
      tagline: "Mon assistant IA personnel",
      subtitle:
        "Hermes Agent, c'est un assistant IA que j'utilise au quotidien depuis juin 2026. Construit sur un framework open source (créé par Nous Research), il s'occupe de tout ce qui ne demande pas de décision humaine : mémoriser, organiser, exécuter. Par-dessus, j'ai construit ma propre méthode de travail.",
      badges: [
        { label: "Mémoire et organisation" },
        { label: "Framework open source" },
      ],
      role: "Conception et mise en place de ma méthode de travail avec l'assistant (mémoire des projets, journal de décisions, veille filtrée, audit de sécurité multi-agents) construite sur le framework open source Hermes Agent (Nous Research).",
      period: "Depuis juin 2026",
      heroImage: "/uploads/hermes-agent.png",
      story: [
        "Ma première version était trop compliquée : tickets automatiques, allers-retours entre agents. Je l'ai entièrement supprimée pour repartir sur des bases simples. Règle que j'ai gardée depuis : un outil qui m'oblige à me souvenir de tout n'est pas un assistant, c'est une charge de plus.",
        "La version actuelle est plus simple et plus fiable. J'y ai ajouté une règle stricte : rien n'est annoncé sans preuve. Avant de dire « c'est fait », l'assistant vérifie sur le disque et montre la sortie réelle. S'il ne peut pas vérifier, il écrit « non vérifié ».",
        "En clair : l'IA exécute, mais c'est moi qui conçois l'architecture, tranche les choix et valide chaque résultat.",
      ],
      build: [
        "Une veille tech quotidienne, filtrée : je ne lis que ce qui vaut le coup.",
        "Une mémoire persistante de mes projets : objectifs, décisions, conventions. Je ne dois jamais rappeler qui je suis ni où on en est.",
        "Un journal de décisions écrites et datées : on ne re-tranche pas deux fois la même chose.",
        "Une base de connaissances où ce que j'apprends est rangé, avec la source conservée et vérifiée.",
        "Un audit de sécurité multi-agents (auth, injections, CORS, Docker, CI/CD) fusionné en un rapport unique.",
        "Des rôles orchestrateur/exécutant formalisés pour la gestion de projet multi-conversation.",
      ],
      nextProject: { title: "Noiseless Mind", href: "/projets/noiseless-mind" },
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
      heroImage: "/uploads/claude-code-hero.jpg",
      story: [
        "Piloter du développement par IA session après session pose toujours le même problème : sans cadre, chaque session réinvente sa méthode. La compréhension de la demande est bâclée, le plan absent, la relecture sautée, et le ticket ne se ferme jamais vraiment. Cette architecture répond à ce problème avec une série d'outils qui s'enchaînent, chacun responsable d'une étape précise du travail.",
        "Le premier outil m'oblige à bien comprendre la demande avant de toucher au code, à écrire un plan clair et à en chercher les failles avant de le valider, puis à vérifier en continu ce que je construis, et enfin à noter ce qui a vraiment été fait. Un deuxième relit ensuite mon travail avec un regard extérieur avant le moindre envoi. Un troisième s'assure que mes sauvegardes de code sont bien décrites et bien découpées. Un dernier ferme les tickets terminés en vérifiant sur le disque que tout correspond vraiment à la demande, plutôt que de faire confiance à un simple « c'est fait ».",
        "L'ensemble se connecte à mon outil de suivi de tickets grâce à un petit fichier de réglages par projet : quelles vérifications lancer avant de valider, et comment les tickets doivent avancer d'une étape à l'autre. Pour les tâches trop grosses pour une seule session, un rôle « chef de projet » répartit le travail entre plusieurs sessions séparées, chacune concentrée sur une seule tâche, sans se mélanger avec les autres.",
      ],
      build: [
        "task-flow : la méthode complète pour avancer sur une tâche. Je comprends bien la demande, j'écris un plan et j'en cherche les failles, je vérifie mon travail au fur et à mesure, puis je note ce qui a vraiment été fait.",
        "lead-review : une relecture de mon code avant chaque sauvegarde, pour vérifier qu'il répond bien à la demande et respecte les habitudes du projet.",
        "git-commit : des messages de sauvegarde clairs, en anglais, et bien découpés.",
        "verify-done : la clôture des tickets terminés, en vérifiant sur le disque que tout correspond vraiment à la demande.",
        "Connexion à mon outil de suivi de tickets via un petit fichier de réglages par projet : quelles vérifications lancer avant de valider, et comment les tickets avancent d'une étape à l'autre.",
        "Un rôle « chef de projet » pour répartir une grosse tâche entre plusieurs sessions séparées, chacune concentrée sur son propre travail.",
      ],
      nextProject: { title: "Noiseless Mind", href: "/projets/noiseless-mind" },
    },
  },
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
    slug: "sportify",
    meta: "Alternance — NestJS",
    title: "Sportify",
    desc: "Plateforme de gestion de clubs sportifs associatifs, développée en équipe pendant l'alternance. Projet clos.",
    tags: ["NestJS", "Prisma", "Alternance"],
    image: "/uploads/sportify-card.jpg",
    href: "https://github.com/Saldyr/Sportify",
    status: "Terminé",
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
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

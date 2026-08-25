import type { StaticImageData } from "next/image";

/* Imports statiques, et non des chemins : Next.js en dérive `width`, `height`
   et `blurDataURL` sans dimensions saisies à la main — donc sans possibilité
   de désynchronisation silencieuse avec le fichier. C'est ce qui permet à la
   galerie de choisir un ratio depuis les vraies dimensions (POR-39). Le prix
   à payer : ces imports rendent le module illisible par Node tel quel, d'où
   qa/support/register-image-imports.ts pour les specs qui l'importent. */
import noiselessMindEcoutes from "@public/uploads/noiseless-mind-ecoutes.jpg";
import noiselessMindVeilleuses from "@public/uploads/noiseless-mind-veilleuses.jpg";
import noiselessMindEveillees from "@public/uploads/noiseless-mind-eveillees.jpg";
import sportifyConnexion from "@public/uploads/sportify-connexion.png";
import sportifyAccueil from "@public/uploads/sportify-accueil.png";
import sportifyMatchs from "@public/uploads/sportify-matchs.png";
import sportifyProfil from "@public/uploads/sportify-profil.png";
import sportifyProfilEdition from "@public/uploads/sportify-profil-edition.png";
import gojobOnboarding from "@public/uploads/gojob-onboarding.png";
import gojobDashboard from "@public/uploads/gojob-dashboard.png";
import gojobOffresFiltres from "@public/uploads/gojob-offres-filtres.png";
import gojobOffresResultats from "@public/uploads/gojob-offres-resultats.png";
import gojobParametres from "@public/uploads/gojob-parametres.png";
import medailloVide from "@public/uploads/medaillo-vide.png";
import medailloListe from "@public/uploads/medaillo-liste.png";
import medailloFiche from "@public/uploads/medaillo-fiche.png";
import medailloNouveauSoin from "@public/uploads/medaillo-nouveau-soin.png";

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

export type GalleryItem = { image: StaticImageData; alt: string };

export type ProjectSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

/* Liens externes libres de la colonne latérale (réseaux, article, démo tierce).
   Distinct de `repoHref`/`demoHref`, dont les libellés sont figés : ici le
   libellé fait partie de la donnée, parce que le nombre et la nature de ces
   liens varient d'un projet à l'autre. */
export type ProjectLink = {
  label: string;
  href: string;
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
  links?: ProjectLink[];
  heroImage?: string;
  /* `story`, `build` et `sections` se cumulent à l'affichage, dans cet ordre
     (src/app/projets/[slug]/page.tsx). Ce ne sont pas des alternatives. */
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
    desc: "Survival horror en développement sous Godot, avec bible narrative complète et prologue en cours d'implémentation : appartement modélisé, direction artistique PSX, système sonore et interactions en place.",
    tags: ["Horreur", "Direction artistique", "Godot"],
    image: "/uploads/noiseless-mind-card.jpg",
    imagePosition: "50% 15%",
    href: "/projets/noiseless-mind",
    status: "Prototype",
    detail: {
      tagline: "Survival horror où le bruit tue",
      subtitle:
        "Un survival horror où le bruit tue. Le prologue, dans l'appartement d'Adrian, est en cours d'implémentation avant l'entrée à Fogreach.",
      badges: [{ label: "Horreur" }, { label: "Direction artistique" }, { label: "Godot" }],
      role: "Game design et écriture narrative, direction artistique, level design, sound design, développement Godot, modélisation et intégration 3D",
      heroImage: "/uploads/noiseless-mind.png",
      story: [
        "Adrian part chercher sa femme Sarah à Fogreach, une ville de cure disparue dans le brouillard. La règle du monde est simple : le bruit tue. Trois familles de créatures s'y partagent la chasse, chacune privée d'un sens et hypersensible aux autres : les Écoutes traquent au son, les Veilleuses à la lumière, les Éveillées à la vue. Le joueur doit composer avec ces règles contradictoires pour avancer, entre silence, cachettes et gestion de son propre bruit (souffle, blessures, pas). Le projet est parti d'une bible narrative complète et se construit maintenant niveau par niveau, en commençant par le prologue : l'appartement d'Adrian.",
      ],
      build: [
        "Le prologue, sous Godot, en cours d'implémentation : l'appartement d'Adrian, sans monstre, sert de tutoriel silencieux au vocabulaire sonore du jeu (portes, cachettes, sac) avant l'entrée à Fogreach",
        "Le mobilier de la scène, modélisé et intégré (lit, table, évier, table de chevet), remplaçant les placeholders d'origine pour poser la direction artistique définitive",
        "Le système sonore, avec génération procédurale d'une partie des assets audio : pas gauche/droite du joueur, ambiances de pièce, tension, respiration et réveil des créatures, message vocal du prologue",
        "Les systèmes d'interaction Godot : portes, objets ramassables, cachettes, chacun testé automatiquement (gdUnit4)",
        "La bible narrative complète : les trois familles du bestiaire, leur mécanique de contre-jeu, la structure en actes, écrite avant tout développement pour que chaque niveau, son ou mécanique en découle directement",
        "Un pipeline de production documenté (architecture technique, pipeline de niveau, système de design) pour que le prototype tienne dans la durée",
      ],
      gallery: [
        { image: noiselessMindEcoutes, alt: "Noiseless Mind — Les Écoutes" },
        { image: noiselessMindVeilleuses, alt: "Noiseless Mind — Les Veilleuses" },
        { image: noiselessMindEveillees, alt: "Noiseless Mind — Les Éveillées" },
      ],
      nextProject: { title: "Hermes-Agent", href: "/projets/hermes-agent" },
    },
  },
  {
    slug: "sportify",
    meta: "Alternance — NestJS",
    title: "Sportify",
    desc: "Plateforme de gestion de clubs sportifs amateurs construite en équipe pendant l'alternance : API NestJS + Prisma, authentification JWT à refresh tokens révocables, et gestion complète des matchs côté React.",
    tags: ["NestJS", "Prisma", "React"],
    image: "/uploads/sportify-card.jpg",
    href: "/projets/sportify",
    status: "Terminé",
    detail: {
      tagline: "Gestion de clubs sportifs — projet d'équipe en alternance",
      subtitle:
        "Une plateforme où chaque club amateur gère ses membres, publie ses actualités et programme ses matchs, pendant que les supporters suivent, commentent et likent. Construite à trois sur une période courte, comme exercice de conception et de travail en équipe.",
      badges: [{ label: "NestJS" }, { label: "Prisma" }, { label: "Travail en équipe" }],
      role:
        "Projet à trois, sans spécialisation : la conception — user stories, MCD, MLD, MPD — a été faite ensemble, puis chacun a pris des tâches sur toute la chaîne. J'ai donc écrit du back NestJS, du front React, le câblage entre les deux et les tests d'API sous Postman, comme les deux autres.",
      heroImage: "/uploads/sportify-accueil.png",
      repoHref: "https://github.com/Saldyr/Sportify",
      story: [
        "Sportify est né d'un besoin simple à énoncer et large à couvrir : donner à un club sportif amateur un seul endroit pour tout gérer. Le club a ses membres et ses responsables, publie ses actualités, programme ses matchs à domicile et à l'extérieur. Les supporters suivent leurs clubs, commentent, likent, reçoivent des notifications. Rien d'exotique pris isolément — mais mis bout à bout, un périmètre qui oblige à réfléchir avant d'écrire.",
        "C'est là qu'est le vrai contenu du projet. Nous avons passé la première phase à trois sur du papier plutôt que sur du code : les user stories d'abord, puis le modèle conceptuel, le modèle logique, le modèle physique. Douze tables, les relations entre elles, les rôles au sein d'un club, ce qui se supprime en cascade et ce qui ne doit jamais disparaître. Le découpage en tâches est venu après, suivi sur YouTrack, sans répartition par spécialité : chacun de nous a fait du back, du front, du câblage entre les deux et des tests d'API sous Postman. C'est ce que je retiens le plus — dans une équipe où tout le monde touche à tout, ce qui tient le projet debout n'est pas la répartition, c'est ce qui a été décidé ensemble avant de commencer.",
        "Le projet s'est arrêté avec la fin de la période. Deux domaines sont allés le plus loin — l'authentification et la gestion des matchs, du modèle de données jusqu'à l'écran. Les autres ont leur modèle et leur squelette d'API, mais ne sont jamais remontés jusqu'à l'interface. C'était un exercice d'apprentissage, pas un produit à livrer, et il a rempli son rôle.",
      ],
      build: [
        "Une conception menée avant le code : user stories, MCD, MLD puis MPD posés à trois, aboutissant à 12 tables sous MySQL et 7 migrations Prisma versionnées.",
        "Une authentification à deux clés : un jeton d'accès court et un jeton de renouvellement long, stocké en base et révoqué à chaque renouvellement — un même jeton ne peut donc pas servir deux fois. Mots de passe hashés avec bcrypt.",
        "La gestion des matchs : création, modification, suppression, avec les règles métier isolées dans leur propre service — un club ne peut pas jouer contre lui-même, la fin doit suivre le début, les deux clubs doivent exister — et la garantie que seul l'auteur d'un match peut y toucher.",
        "Un front React branché sur l'API : routes protégées, cache serveur avec invalidation automatique après chaque écriture, session persistée entre les rechargements, formulaires validés.",
        "Le profil utilisateur : modification des informations, changement de mot de passe, suppression de compte avec confirmation.",
        "Chaque route vérifiée sous Postman avant d'être câblée au front — la seule façon, à trois sur la même base, de savoir si un bug venait de l'API ou de l'interface.",
        "Un environnement conteneurisé : front, API et base MySQL sous Docker, le front servi par nginx à partir d'un build multi-stage.",
        "Une interface responsive Tailwind + DaisyUI, avec une navigation mobile dédiée.",
      ],
      sections: [
        {
          heading: "Ce que j'en retiens",
          bullets: [
            "Écrire le modèle de données avant le code n'a jamais coûté du temps ; c'est l'inverse qui en coûte.",
            "Quand personne n'est propriétaire d'une partie, c'est la conception commune qui fait office de contrat. Sans elle, trois personnes sur la même base écrivent trois versions de la même chose.",
            "Sortir les règles métier du contrôleur pour les mettre dans leur propre service est le seul endroit du projet qui serait testable sans monter toute l'application.",
            "Un périmètre large finit rarement complet. Mieux vaut deux domaines terminés que huit à moitié.",
          ],
        },
      ],
      gallery: [
        { image: sportifyConnexion, alt: "Sportify — page de connexion" },
        { image: sportifyAccueil, alt: "Sportify — page d'accueil" },
        { image: sportifyMatchs, alt: "Sportify — page des matchs" },
        { image: sportifyProfil, alt: "Sportify — page du profil" },
        { image: sportifyProfilEdition, alt: "Sportify — modification du profil" },
      ],
      nextProject: { title: "GoJob", href: "/projets/gojob" },
    },
  },
  {
    slug: "gojob",
    meta: "Projet perso — Electron",
    title: "GoJob",
    desc: "Application desktop Windows qui agrège en local les offres de dix sources d'emploi, des API publiques aux alertes reçues par mail, dans une interface unique. Quatre d'entre elles fonctionnent sans aucune clé API.",
    tags: ["Electron", "React", "Local-first"],
    image: "/uploads/gojob-card.jpg",
    href: "/projets/gojob",
    status: "Prototype",
    detail: {
      tagline: "Dix sources d'offres d'emploi, une seule interface, en local",
      subtitle:
        "GoJob interroge dix sources d'offres d'emploi (API publiques, méta-moteurs, plateformes remote et alertes reçues par mail), dédoublonne les résultats et les réunit dans un tableau de bord unique, avec recherche et filtres avancés. Il n'y a aucun serveur GoJob : les offres sont récupérées directement depuis les API des plateformes et restent sur la machine.",
      badges: [{ label: "Electron" }, { label: "Local-first" }, { label: "Pilotage IA" }],
      role: "Conception de l'architecture, intégration des dix connecteurs et du design system. Premier projet piloté entièrement par IA : développement initial via Hermes-Agent (modèle DeepSeek), puis reprise et finalisation avec Claude.",
      heroImage: "/uploads/gojob-dashboard.png",
      repoHref: "https://github.com/Saldyr/GoJob",
      story: [
        "Chercher un poste, c'est ouvrir dix onglets et relire les mêmes annonces. GoJob interroge les dix sources en une fois (France Travail, Adzuna sur quatre pays, Jooble, Reed, Careerjet, The Muse, Arbeitnow, Remotive, RemoteOK, plus les alertes reçues par mail en IMAP), dédoublonne les offres remontées par plusieurs plateformes et les présente dans un tableau de bord unique, filtrable par mots-clés, source, localisation, type de contrat et télétravail.",
        "Quatre sources fonctionnent sans aucune clé : l'application est utile dès l'installation, et l'onboarding en trois étapes propose ensuite de brancher celles qui demandent un compte. Les identifiants restent chiffrés sur la machine via safeStorage ; si le chiffrement de l'OS n'est pas disponible, l'application refuse d'écrire les secrets plutôt que de les stocker en clair.",
        "Le développement a d'abord été tenté avec Hermes-Agent sur le modèle DeepSeek, qui s'est montré peu fiable ; le projet a ensuite été repris et peaufiné avec Claude. Il reste un prototype : la couverture des sources est inégale selon les métiers, et plusieurs points sont encore à améliorer.",
      ],
      build: [
        "Dix sources agrégées : France Travail, Adzuna (FR/UK/ES/DE), Jooble, Reed, Careerjet, The Muse, Arbeitnow, Remotive, RemoteOK, alertes IMAP.",
        "Plateformes en ligne interrogées en parallèle, avec un délai maximum de 8 s par source : une API lente ou en panne ne bloque pas les autres, et son erreur est remontée pour elle seule.",
        "Dédoublonnage entre plateformes par URL normalisée : une offre publiée sur deux d'entre elles n'apparaît qu'une fois.",
        "Sécurité : secrets chiffrés via safeStorage, refus du stockage en clair, context isolation activée, Node integration désactivée, CSP restrictive.",
        "React 19, TypeScript, Tailwind v4, Zustand, animations Framer Motion, build Vite et electron-builder.",
        "Identité visuelle sur mesure : palette violet, bleu et cyan, logo, icônes, design system maison d'une dizaine de composants.",
        "i18n (FR/ES), livrable installeur NSIS et version portable.",
      ],
      gallery: [
        { image: gojobOnboarding, alt: "GoJob — connexion des sources dans l'onboarding" },
        { image: gojobDashboard, alt: "GoJob — tableau de bord avec répartition par plateforme" },
        { image: gojobOffresFiltres, alt: "GoJob — page Offres d'emploi avec filtres de recherche" },
        { image: gojobOffresResultats, alt: "GoJob — résultats filtrés par mots-clés et contrat" },
        { image: gojobParametres, alt: "GoJob — paramètres de connexion des sources d'offres" },
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
        { image: medailloVide, alt: "Médaillo — écran d'accueil sans animal enregistré" },
        { image: medailloListe, alt: "Médaillo — liste des animaux enregistrés" },
        { image: medailloFiche, alt: "Médaillo — fiche animal avec carnet de santé" },
        { image: medailloNouveauSoin, alt: "Médaillo — formulaire d'ajout d'un soin" },
      ],
      nextProject: { title: "Claude Code", href: "/projets/claude-code" },
    },
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

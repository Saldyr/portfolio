// Catalogue des projets affichés sur le site (page d'accueil et fiches
// projet) : une entrée par projet, avec son détail optionnel (`detail`) pour
// les projets qui ont une page dédiée.
import type { StaticImageData } from "next/image";

// Imports statiques (pas des chemins) : Next.js en dérive width/height sans
// saisie manuelle désynchronisable. Rend le module illisible par Node tel
// quel, d'où qa/support/register-image-imports.ts pour les specs.
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

// Distinct de repoHref/demoHref (libellés figés) : ici le libellé fait partie
// de la donnée, le nombre et la nature des liens variant par projet.
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
  // Corrige le recadrage object-cover quand le contenu utile n'est pas au
  // centre vertical de la capture.
  heroImagePosition?: string;
  // "contain" pour les captures qu'aucun recadrage ne laisse entières ;
  // ignore heroImagePosition dans ce cas.
  heroImageFit?: "cover" | "contain";
  // story, build et sections se CUMULENT à l'affichage, dans cet ordre.
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
    desc: "Assistant IA qui retient, organise et exécute à ma place : suivi de mes projets, décisions journalisées, veille filtrée, base de connaissances vérifiée. Je conçois la méthode, l'IA l'applique.",
    tags: ["Assistant IA", "Mémoire et organisation"],
    image: "/uploads/hermes-agent-card.png",
    href: "/projets/hermes-agent",
    status: "Utilisé tous les jours",
    detail: {
      tagline: "Mon assistant IA personnel",
      subtitle:
        "Hermes-Agent est l'assistant IA que j'utilise tous les jours. Il est construit sur un framework open source de Nous Research, et je m'en sers pour tout ce qui ne demande pas de décision humaine : retrouver où j'en suis sur un projet, garder une trace de mes choix, ranger ce que j'apprends, filtrer ma veille technique. Par-dessus le framework, j'ai défini ma propre méthode de travail et mes règles.",
      badges: [
        { label: "Mémoire et organisation" },
        { label: "Framework open source" },
        { label: "Méthode et règles maison" },
      ],
      role: "Conception de ma méthode de travail avec l'assistant et des règles qui l'encadrent : mémoire des projets, journal de décisions, veille filtrée, base de connaissances vérifiée, tâches automatisées. Le framework est open source ; la méthode et les règles sont de moi.",
      heroImage: "/uploads/hermes-agent.png",
      story: [
        "Hermes-Agent me décharge de tout ce qui n'a pas besoin de moi. Quand je reprends un projet, il me rappelle les objectifs, les décisions déjà prises et l'état d'avancement, sans que j'aie à fouiller. Ce que j'apprends au fil des jours est rangé en notes reliées entre elles, avec la source gardée. Ma veille technique est filtrée en amont : je ne lis que ce qui vaut le coup.",
        "J'y tiens un journal de décisions datées, pour ne pas retrancher deux fois la même question. Je me suis aussi créé des tâches qui tournent seules en arrière-plan : sauvegardes, rangement, contrôles réguliers, avec une alerte quand quelque chose cloche.",
        "J'ai renforcé une règle chez lui : rien n'est présenté comme fait sans preuve, et ce qui n'a pas pu être vérifié est signalé comme tel. Je fais tourner Hermes-Agent sur un modèle à faible coût par token (DeepSeek), ce qui me laisse une utilisation large au quotidien mais demande ce garde-fou pour compenser ses limites. L'assistant exécute ; la méthode, les règles et les choix restent de moi.",
      ],
      build: [
        "Une mémoire de mes projets : objectifs, décisions, conventions, état d'avancement, pour reprendre sans tout réexpliquer.",
        "Un journal de décisions datées, pour ne pas revenir en boucle sur les mêmes choix.",
        "Une base de connaissances personnelle : mes notes reliées entre elles, chaque source conservée et vérifiée.",
        "Une veille technique filtrée en amont, avec un récapitulatif en fin de semaine.",
        "Des tâches automatisées que je me suis créées : sauvegardes, rangement, contrôles, avec alerte en cas de problème.",
        "Un audit de sécurité mené par plusieurs agents, réuni en un seul rapport.",
      ],
      nextProject: { title: "Claude Code", href: "/projets/claude-code" },
    },
  },
  {
    slug: "claude-code",
    meta: "Ma méthode de travail avec l'IA",
    title: "Claude Code",
    desc: "Comment je pilote l'IA pour construire un projet : concevoir sa façon d'avancer, cadrer chaque étape, vérifier chaque résultat avant de le valider.",
    tags: ["Orchestration IA", "Méthode de travail"],
    image: "/uploads/claude-code-card.jpg",
    imageFit: "contain",
    href: "/projets/claude-code",
    status: "Utilisé tous les jours",
    detail: {
      tagline: "Concevoir et orchestrer la construction d'un projet avec l'IA",
      subtitle:
        "Sur mes derniers projets, je fais construire le code par l'IA. Mon travail n'est pas de l'écrire à sa place, c'est de concevoir la façon dont elle avance : cadrer la demande, découper le travail, relire, et vérifier chaque résultat avant de le valider. Cette méthode s'est affinée projet après projet.",
      badges: [{ label: "Pilotage IA" }, { label: "Orchestration" }],
      role: "Conception de la méthode et des consignes qui cadrent chaque session de travail, améliorée au fil des projets que je pilote avec l'IA.",
      heroImage: "/uploads/claude-code-hero.jpg",
      story: [
        "Ce qui m'intéresse dans l'IA, ce n'est pas seulement de m'en servir, c'est de comprendre comment elle fonctionne. Je lis, je teste, je pousse ma compréhension des modèles de langage : comment ils lisent une consigne, et comment on cadre leur comportement avec des instructions écrites. Plus je comprends la machine, mieux je sais l'utiliser, et plus je vois ce qu'on peut construire avec.",
        "Piloter du développement par IA sans méthode, c'est repartir de zéro à chaque session : demande mal comprise, pas de plan, relecture sautée. J'ai fixé une façon de travailler qui revient à chaque fois. Comprendre précisément ce qui est demandé et reformuler jusqu'à ce que ce soit clair. Écrire un plan et en chercher les failles avant de le lancer. Vérifier au fur et à mesure au lieu de faire confiance. Et une règle qui ne bouge pas : rien n'est annoncé comme fait sans preuve. Avant de dire que ça marche, on va le constater et on montre le résultat réel.",
        "Pour un projet qui dépasse une seule session, je découpe le travail en tâches suivies dans un outil de gestion, et un rôle de chef de projet répartit ces tâches entre plusieurs sessions séparées, chacune concentrée sur une seule chose. Chaque tâche se ferme en vérifiant vraiment qu'elle répond à la demande, pas sur un simple « c'est fait ». Cette méthode n'est pas figée : je la corrige et je l'étends à chaque projet, selon ce qui a coincé la fois d'avant.",
        "Sur ce que je pratique déjà, je suis à l'aise : écrire les consignes qui cadrent un modèle, l'appeler depuis du code, faire travailler plusieurs agents ensemble et les orchestrer. Pour le reste, je cherche à comprendre la machine en profondeur : comment un modèle apprend, comment un texte est découpé en unités avant d'être traité, comment un modèle génère sa réponse, ce que sont ces vecteurs qui rapprochent les mots par le sens, et comment on relie une base de documents à un modèle pour qu'il réponde à partir de sources précises. J'en connais les principes, je veux les mettre en pratique un par un.",
      ],
      build: [
        "Une méthode d'itération en étapes : comprendre la demande, écrire un plan et le mettre à l'épreuve, construire en vérifiant en continu, puis noter ce qui a réellement été fait.",
        "Une relecture du code avant chaque enregistrement, pour vérifier qu'il répond à la demande et suit les habitudes du projet.",
        "Des messages d'enregistrement clairs, en anglais, découpés par intention.",
        "Une clôture de tâche qui va constater sur le disque que le résultat correspond à la demande, avant de valider.",
        "Un branchement sur un outil de suivi de tickets (YouTrack), réglé par projet : quelles vérifications lancer, comment une tâche passe d'une étape à l'autre.",
        "Un rôle chef de projet pour répartir un gros chantier entre plusieurs sessions cloisonnées.",
        "Méthode appliquée à ce portfolio, à mon assistant Hermes-Agent, et à mes projets Médaillo et GoJob.",
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
      nextProject: { title: "Sportify", href: "/projets/sportify" },
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
      tagline: "Gestion de clubs sportifs, projet d'équipe en alternance",
      subtitle:
        "Une plateforme où chaque club amateur gère ses membres, publie ses actualités et programme ses matchs, pendant que les supporters suivent, commentent et likent. Construite à trois sur une période courte, comme exercice de conception et de travail en équipe.",
      badges: [{ label: "NestJS" }, { label: "Prisma" }, { label: "Travail en équipe" }],
      role:
        "Projet à trois, sans spécialisation : la conception (user stories, MCD, MLD, MPD) a été faite ensemble, puis chacun a pris des tâches sur toute la chaîne. J'ai donc écrit du back NestJS, du front React, le câblage entre les deux et les tests d'API sous Postman, comme les deux autres.",
      heroImage: "/uploads/sportify-accueil.png",
      heroImagePosition: "32% 12%",
      repoHref: "https://github.com/Saldyr/Sportify",
      story: [
        "Sportify est né d'un besoin simple à énoncer et large à couvrir : donner à un club sportif amateur un seul endroit pour tout gérer. Le club a ses membres et ses responsables, publie ses actualités, programme ses matchs à domicile et à l'extérieur. Les supporters suivent leurs clubs, commentent, likent, reçoivent des notifications. Rien d'exotique pris isolément, mais mis bout à bout, un périmètre qui oblige à réfléchir avant d'écrire.",
        "C'est là qu'est le vrai contenu du projet. Nous avons passé la première phase à trois sur du papier plutôt que sur du code : les user stories d'abord, puis le modèle conceptuel, le modèle logique, le modèle physique. Douze tables, les relations entre elles, les rôles au sein d'un club, ce qui se supprime en cascade et ce qui ne doit jamais disparaître. Le découpage en tâches est venu après, suivi sur YouTrack, sans répartition par spécialité : chacun de nous a fait du back, du front, du câblage entre les deux et des tests d'API sous Postman. C'est ce que je retiens le plus : dans une équipe où tout le monde touche à tout, ce qui tient le projet debout n'est pas la répartition, c'est ce qui a été décidé ensemble avant de commencer.",
        "Le projet s'est arrêté avec la fin de la période. Deux domaines sont allés le plus loin : l'authentification et la gestion des matchs, du modèle de données jusqu'à l'écran. Les autres ont leur modèle et leur squelette d'API, mais ne sont jamais remontés jusqu'à l'interface. C'était un exercice d'apprentissage, pas un produit à livrer, et il a rempli son rôle.",
      ],
      build: [
        "Une conception menée avant le code : user stories, MCD, MLD puis MPD posés à trois, aboutissant à 12 tables sous MySQL et 7 migrations Prisma versionnées.",
        "Une authentification à deux clés : un jeton d'accès court et un jeton de renouvellement long, stocké en base et révoqué à chaque renouvellement. Un même jeton ne peut donc pas servir deux fois. Mots de passe hashés avec bcrypt.",
        "La gestion des matchs : création, modification, suppression, avec les règles métier isolées dans leur propre service (un club ne peut pas jouer contre lui-même, la fin doit suivre le début, les deux clubs doivent exister) et la garantie que seul l'auteur d'un match peut y toucher.",
        "Un front React branché sur l'API : routes protégées, cache serveur avec invalidation automatique après chaque écriture, session persistée entre les rechargements, formulaires validés.",
        "Le profil utilisateur : modification des informations, changement de mot de passe, suppression de compte avec confirmation.",
        "Chaque route vérifiée sous Postman avant d'être câblée au front : la seule façon, à trois sur la même base, de savoir si un bug venait de l'API ou de l'interface.",
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
    desc: "Carnet de santé numérique pour animaux : soins, vaccins, rappels d'échéance. Construit en public sur LinkedIn et TikTok, puis mis en pause au stade MVP faute du moindre retour.",
    tags: ["React Native", "Expo", "Build in public"],
    image: "/uploads/medaillo-card.png",
    href: "/projets/medaillo",
    status: "Prototype",
    detail: {
      tagline: "Carnet de santé pour animaux, construit en public et arrêté en public",
      subtitle:
        "Médaillo est une application mobile Android (React Native, Expo) qui sert de carnet de santé numérique pour animaux : fiche de l'animal, vaccins et traitements, rappels d'échéance. À terme, une médaille QR devait permettre à qui trouve un animal perdu de contacter son propriétaire.",
      badges: [{ label: "React Native" }, { label: "Build in public" }],
      role: "Pilotage complet du développement via Claude Code et des skills dédiés, avec gestion du projet dans YouTrack (rédaction des tickets, suivi, commentaires de décision à chaque étape). L'IA a écrit l'intégralité du code, vérifié et relu par le porteur du projet.",
      heroImage: "/uploads/medaillo-fiche.png",
      heroImageFit: "contain",
      repoHref: "https://gitlab.com/romain.cartia/medaillo",
      repoLabel: "Dépôt GitLab",
      links: [
        { label: "Chaîne TikTok", href: "https://www.tiktok.com/@medaillo" },
        {
          label: "Le post LinkedIn",
          href: "https://www.linkedin.com/posts/romain-cartia_jai-fini-mon-app-mvp-je-ne-la-publie-activity-7482759435786846208-zW2Q",
        },
      ],
      story: [
        "Deuxième projet personnel piloté par IA, et le premier construit au grand jour : posts LinkedIn, chaîne TikTok @medaillo, et un design system versionné dans le dépôt pour que l'application et les visuels sortent du même moule.",
        "Le MVP fonctionne. Fiches animaux, carnet de soins, rappels programmés, le tout hors ligne sur le téléphone. Mais le build in public n'a rien produit : pas un seul contact intéressé. J'ai préféré m'arrêter là plutôt que d'enchaîner sur la phase 2 (comptes, Supabase, publication Google Play) pour un besoin que personne n'avait manifesté.",
        "La leçon vaut plus que le code : publier son avancement ne crée pas la demande, et un design system ne remplace pas une conversation avec un utilisateur. Le projet est en pause, mais reprenable tel quel. L'architecture avait justement été pensée pour ça.",
      ],
      build: [
        "Expo SDK 57, TypeScript et expo-router, pour une cible Android (Expo Go en développement, build EAS).",
        "Stockage local SQLite : animaux et soins, suppression en cascade, index sur les échéances.",
        "Rappels automatiques à J-7 et J-1 à 9h, planifiés par la couche données. Les écrans n'y touchent pas.",
        "Règle d'architecture tenue : aucun écran n'importe le stockage ni les notifications, une migration vers Supabase ne réécrirait pas l'interface.",
        "Piège Expo Go résolu : expo-notifications plante à l'import depuis le SDK 53, le module n'est donc jamais chargé dans Expo Go.",
        "Design system documenté dans le dépôt (vert forêt et or), source de vérité pour l'application comme pour les visuels TikTok.",
        "Ce qui était prévu ensuite : comptes utilisateurs, Supabase, page publique de la médaille QR, publication Google Play.",
      ],
      gallery: [
        { image: medailloVide, alt: "Médaillo — écran d'accueil sans animal enregistré" },
        { image: medailloListe, alt: "Médaillo — liste des animaux enregistrés" },
        { image: medailloFiche, alt: "Médaillo — fiche animal avec carnet de santé" },
        { image: medailloNouveauSoin, alt: "Médaillo — formulaire d'ajout d'un soin" },
      ],
      nextProject: { title: "Hermes-Agent", href: "/projets/hermes-agent" },
    },
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

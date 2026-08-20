// Titre du site, affiché dans l'onglet du navigateur (src/app/layout.tsx) et
// repris tel quel par og:title : layout.tsx ne déclare pas openGraph.title,
// et Next.js retombe alors sur `title`.
//
// Délibérément SANS `import "server-only"`, contrairement au module voisin
// src/lib/site-url.ts qui, lui, le porte : les specs Playwright importent
// cette constante pour asserter le titre réellement servi (qa/SEO/metadata.spec.ts).
// La garde y rendrait le module inimportable, et c'est précisément ce qui a
// empêché POR-42 de centraliser le titre. Le modèle suivi ici est celui de
// src/lib/projects.ts, importé sans difficulté par les specs.
export const SITE_TITLE = "Romain C // Développeur full-stack IA";

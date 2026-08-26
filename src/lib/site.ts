/**
 * Nom affiché de la personne derrière le site, tel qu'il apparaît déjà dans la
 * nav (src/components/nav.tsx) et le footer (src/components/footer.tsx).
 *
 * Extrait par POR-46, qui a remplacé « Saldyr » dans les descriptions de
 * métadonnées : « Saldyr » n'est plus le nom affiché du site, il ne subsiste
 * que comme identifiant GitHub. Le sortir en constante évite de reproduire,
 * dans les métadonnées, le littéral dispersé que ce ticket vient d'y retirer.
 *
 * Nav et footer portent encore ce nom en dur : hors périmètre de POR-46, qui
 * ne touche qu'aux métadonnées. Les y brancher est un pas de plus, à faire
 * quand il sera demandé.
 */
export const SITE_AUTHOR = "Romain Cartia";

/**
 * Nom COURT, forme de marque employée dans le titre du site et en suffixe des
 * titres de page secondaires (« À propos — … », « Contact — … »).
 *
 * Distinct de SITE_AUTHOR à dessein : « Romain C » est la stylisation retenue
 * pour les titres (elle vient de SITE_TITLE, fixé en POR-43), « Romain Cartia »
 * est le nom affiché en toutes lettres. Les confondre changerait la valeur de
 * SITE_TITLE, que les specs SEO asservissent.
 *
 * Extrait par POR-46, qui a remplacé les suffixes « — Saldyr » restés en dur.
 * SITE_TITLE est COMPOSÉ à partir de cette constante plutôt qu'écrit à côté :
 * deux littéraux voisins finissent toujours par diverger, et c'est exactement
 * le défaut que POR-43 puis POR-46 ont eu à réparer.
 *
 * `openGraph.siteName` (src/app/layout.tsx) est désormais branché sur cette
 * constante — le dernier « Saldyr » en dur dans les métadonnées a été retiré,
 * de même que le suffixe des titres de pages projet.
 */
export const SITE_NAME = "Romain C";

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
export const SITE_TITLE = `${SITE_NAME} // Développeur full-stack IA`;

import path from "node:path";

/**
 * Rend chargeables, côté Node, les imports statiques d'images de
 * `src/lib/projects.ts` — que plusieurs specs importent pour dériver leurs
 * attentes (qa/Functional/project-page.spec.ts, e2e-projet.spec.ts,
 * home.spec.ts, qa/Responsive/breakpoints.spec.ts).
 *
 * Sans ce hook, le loader Playwright passe le fichier binaire à Babel et le
 * module ne se charge plus du tout :
 *
 *   SyntaxError: public\uploads\medaillo-liste.png: Unexpected character '<0x89>'
 *
 * L'échec est au CHARGEMENT du fichier de spec, pas dans une assertion : la
 * suite entière tombe, filet de caractérisation compris. Le hook est donc
 * importé par qa/playwright.config.ts, que le runner ET chaque worker évaluent
 * avant de charger les specs.
 *
 * Seul `src` est exposé, DÉLIBÉRÉMENT sans `width`/`height` : les fournir
 * demanderait de décoder les fichiers, et des valeurs inventées mentiraient en
 * silence. Le navigateur, lui, mesure les vraies dimensions (`naturalWidth`,
 * cf. qa/Functional/project-page.spec.ts).
 *
 * Ce que `undefined` déclenche côté Node n'est pas laissé au hasard :
 * `galleryLayout()` refuse un ratio non fini plutôt que de propager un NaN
 * jusqu'au template de grille (src/lib/gallery-layout.ts). Une spec qui
 * passerait ces objets à la mise en page échoue donc avec un message, pas avec
 * une galerie muette à une colonne.
 */
const PUBLIC_DIR = path.resolve(__dirname, "..", "..", "public");
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg"];

function publicPath(filename: string) {
  return "/" + path.relative(PUBLIC_DIR, filename).split(path.sep).join("/");
}

for (const extension of IMAGE_EXTENSIONS) {
  require.extensions[extension] = (module, filename) => {
    module.exports = { src: publicPath(filename) };
  };
}

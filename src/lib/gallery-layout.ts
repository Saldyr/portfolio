/**
 * Mise en page de la galerie d'une page projet (POR-39).
 *
 * Le rendu précédent posait une case fixe (`h-[170px]`, `object-cover`) sans
 * rapport avec le ratio réel des fichiers : TOUTES les images étaient rognées,
 * jusqu'à 72 % pour les portraits de Noiseless Mind. La correction ne consiste
 * pas à donner à chaque image son propre ratio — une grille aux hauteurs
 * inégales — mais à donner à chaque GALERIE un ratio commun, tenu par la
 * médiane de ses images, et à inscrire chaque image dedans (`object-contain`).
 * Les images proches de la médiane remplissent leur case ; les outliers sont
 * letterboxés, entiers.
 */

/** Suffisant pour les besoins de ce module ; `StaticImageData` s'y conforme. */
export type ImageDimensions = { width: number; height: number };

export type GalleryLayout = {
  /** Ratio commun à toutes les cases de la galerie (largeur / hauteur). */
  ratio: number;
  /** Largeur mini d'une colonne, avant que la grille ne retire une colonne. */
  minColumnPx: number;
  gridTemplateColumns: string;
  sizes: string;
};

/** Gap de la grille — `--space-l`. */
const COLUMN_GAP_PX = 25;

/**
 * Largeurs RÉELLES du conteneur de galerie, mesurées sur le rendu de
 * production en balayant les viewports de 320 à 1600px. Elles ne se déduisent
 * pas de `container-page` : la galerie vit dans une colonne flex placée à côté
 * d'un aside, qui n'apparaît qu'au-delà de 1566px et fait alors RÉTRÉCIR la
 * colonne (706px juste avant, 720px fixes après — la galerie est donc plus
 * large sur un portable que sur un écran large).
 *
 * Ces valeurs ne servent qu'à calculer `sizes`, c'est-à-dire le POIDS
 * téléchargé. Si la mise en page de la page projet change, elles dérivent en
 * silence : le rendu reste juste, seul le poids se dégrade. C'est le seul
 * compromis de ce module, et il est borné.
 */
const WIDE_VIEWPORT_PX = 1566;
const WIDE_CONTAINER_PX = 720;
const MID_VIEWPORT_PX = 1024;
const MID_CONTAINER_MIN_PX = 498;
const MID_CONTAINER_MAX_PX = 706;
const SMALL_VIEWPORT_VW = 95;

/**
 * Hauteur de case visée pour choisir la largeur mini de colonne. Une valeur
 * fixe pour toutes les galeries ne marche pas : à 220px de mini, une galerie de
 * captures larges (GoJob, ratio 1.88) tomberait à ~117px de haut — moins
 * lisible qu'avant la refonte. La largeur mini suit donc le ratio, bornée pour
 * qu'un portrait extrême ne produise pas une colonne étroite, ni un panorama
 * une colonne unique.
 */
const TARGET_CELL_HEIGHT_PX = 180;
const MIN_COLUMN_PX = 220;
const MAX_COLUMN_PX = 340;

function medianRatio(images: readonly ImageDimensions[]) {
  const ratios = images.map((image) => image.width / image.height).sort((a, b) => a - b);
  const middle = ratios.length / 2;
  // Nombre pair : moyenne des deux ratios centraux, sinon le choix entre les
  // deux serait arbitraire et sensible à l'ordre de déclaration.
  return ratios.length % 2 === 0
    ? (ratios[middle - 1] + ratios[middle]) / 2
    : ratios[Math.floor(middle)];
}

/**
 * Largeur de case la plus grande atteignable quand le conteneur balaie
 * [`containerMinPx`, `containerMaxPx`].
 *
 * Ce n'est PAS la case obtenue au conteneur le plus large : le nombre de
 * colonnes saute par paliers, et une case est au plus large juste AVANT qu'une
 * colonne supplémentaire n'apparaisse. Prendre le conteneur maximal
 * sous-estimerait donc `sizes` — et une image sous-déclarée est servie floue,
 * alors qu'une image sur-déclarée ne coûte que des octets. L'erreur n'est pas
 * symétrique, ce calcul penche du côté sûr.
 */
function widestCell(
  minColumnPx: number,
  itemCount: number,
  containerMinPx: number,
  containerMaxPx: number,
) {
  const trackPx = minColumnPx + COLUMN_GAP_PX;
  const maxColumns = Math.max(
    1,
    Math.min(itemCount, Math.floor((containerMaxPx + COLUMN_GAP_PX) / trackPx)),
  );

  let widestPx = 0;
  for (let columns = 1; columns <= maxColumns; columns += 1) {
    // Plus grand conteneur tenant encore en `columns` colonnes. Une galerie qui
    // n'a plus assez d'images pour remplir une ligne ne gagne pas de colonne :
    // ses pistes s'étirent (`1fr`) jusqu'au conteneur maximal.
    const upperPx =
      columns === itemCount
        ? containerMaxPx
        : Math.min(containerMaxPx, (columns + 1) * trackPx - COLUMN_GAP_PX - 1);
    // Palier hors de portée dans cette bande de viewports.
    if (upperPx < containerMinPx) continue;
    widestPx = Math.max(widestPx, (upperPx - (columns - 1) * COLUMN_GAP_PX) / columns);
  }
  return Math.ceil(widestPx);
}

export function galleryLayout(images: readonly ImageDimensions[]): GalleryLayout {
  if (images.length === 0) {
    throw new Error("galleryLayout() appelée avec une galerie vide : aucun ratio à en déduire.");
  }

  const ratio = medianRatio(images);
  // Sans cette garde, des dimensions manquantes ou nulles se propagent en
  // silence : `ratio` vaut NaN, et la grille sort un `minmax(min(100%, NaNpx),
  // 1fr)` que le navigateur ignore — la galerie retombe alors sur une seule
  // colonne sans que rien ne signale l'erreur.
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new Error(
      `galleryLayout() : ratio non exploitable (${ratio}). Dimensions d'image manquantes ou nulles.`,
    );
  }

  const minColumnPx = Math.min(
    MAX_COLUMN_PX,
    Math.max(MIN_COLUMN_PX, Math.round(ratio * TARGET_CELL_HEIGHT_PX)),
  );

  const wideCellPx = widestCell(minColumnPx, images.length, WIDE_CONTAINER_PX, WIDE_CONTAINER_PX);
  const wideCellVw = Math.ceil((wideCellPx / WIDE_VIEWPORT_PX) * 100);
  const midCellPx = widestCell(minColumnPx, images.length, MID_CONTAINER_MIN_PX, MID_CONTAINER_MAX_PX);

  return {
    ratio,
    minColumnPx,
    // `min(100%, …)` : sans lui, une colonne mini de 340px déborde d'un
    // viewport de 320px au lieu de retomber sur une colonne pleine largeur.
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnPx}px), 1fr))`,
    // La bande large est déclarée en `vw` et non en px, alors que la case y est
    // pourtant de taille FIXE. Motif mesuré : `next/image` élague le srcset de
    // tout palier inférieur à `640 × (plus petit vw de la chaîne)`. Une chaîne
    // 100 % px ne garde aucun petit palier dès qu'un `100vw` y figure — une
    // case de 223px se faisait alors servir en 640px de large. Le `vw` de cette
    // première bande rouvre les paliers 128/256/384 pour toute la chaîne.
    // Il ne peut pas sous-déclarer : la case est constante sur la bande tandis
    // que le viewport ne fait qu'y croître.
    // En dessous de 1024px le conteneur varie trop vite pour qu'une valeur en px
    // tienne aux deux bouts de la bande : seul un `vw` y convient. 95 plutôt que
    // 100 : la galerie n'y dépasse jamais 90 % du viewport (maximum mesuré, à
    // 640px de large), et `100vw` faisait déborder de 36px le palier 1200 du
    // srcset sur un téléphone à DPR 3 — donc servir du 1920 pour une case de
    // 355px. Les 5 points d'écart avec la mesure sont la marge.
    sizes: `(min-width: ${WIDE_VIEWPORT_PX}px) ${wideCellVw}vw, (min-width: ${MID_VIEWPORT_PX}px) ${midCellPx}px, ${SMALL_VIEWPORT_VW}vw`,
  };
}

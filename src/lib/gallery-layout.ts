// Galerie d'images d'une page projet : chaque galerie prend un ratio commun
// (médiane de ses images) plutôt qu'une case fixe qui rognerait les portraits.
// Les outliers sont letterboxés via object-contain plutôt que rognés.

export type ImageDimensions = { width: number; height: number };

export type GalleryLayout = {
  ratio: number;
  minColumnPx: number;
  gridTemplateColumns: string;
  sizes: string;
};

const COLUMN_GAP_PX = 25; // --space-l

// Largeurs réelles du conteneur, mesurées en prod (320-1600px) : la galerie
// est en colonne flex à côté d'un aside qui apparaît >1566px et la rétrécit.
// Sert uniquement à `sizes` (poids téléchargé) : si la mise en page change,
// ces valeurs dérivent en silence sans casser le rendu.
const WIDE_VIEWPORT_PX = 1566;
const WIDE_CONTAINER_PX = 720;
const MID_VIEWPORT_PX = 1024;
const MID_CONTAINER_MIN_PX = 498;
const MID_CONTAINER_MAX_PX = 706;
const SMALL_VIEWPORT_VW = 95;

// Largeur mini de colonne dérivée du ratio (bornée) plutôt que fixe : une
// valeur fixe rendrait une galerie de captures larges illisible (trop bas).
const TARGET_CELL_HEIGHT_PX = 180;
const MIN_COLUMN_PX = 220;
const MAX_COLUMN_PX = 340;

function medianRatio(images: readonly ImageDimensions[]) {
  const ratios = images.map((image) => image.width / image.height).sort((a, b) => a - b);
  const middle = ratios.length / 2;
  return ratios.length % 2 === 0
    ? (ratios[middle - 1] + ratios[middle]) / 2
    : ratios[Math.floor(middle)];
}

// Case la plus large sur [containerMinPx, containerMaxPx] : pas celle du
// conteneur max, car une case est à son plus large juste AVANT qu'une colonne
// supplémentaire n'apparaisse. Sous-estimer `sizes` sert une image floue,
// sur-estimer ne coûte que des octets — ce calcul penche du côté sûr.
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
    // Plus grand conteneur tenant en `columns` colonnes ; une galerie à court
    // d'images pour remplir la ligne s'étire (1fr) jusqu'au conteneur maximal.
    const upperPx =
      columns === itemCount
        ? containerMaxPx
        : Math.min(containerMaxPx, (columns + 1) * trackPx - COLUMN_GAP_PX - 1);
    if (upperPx < containerMinPx) continue; // palier hors de cette bande
    widestPx = Math.max(widestPx, (upperPx - (columns - 1) * COLUMN_GAP_PX) / columns);
  }
  return Math.ceil(widestPx);
}

export function galleryLayout(images: readonly ImageDimensions[]): GalleryLayout {
  if (images.length === 0) {
    throw new Error("galleryLayout() appelée avec une galerie vide : aucun ratio à en déduire.");
  }

  const ratio = medianRatio(images);
  // Sans cette garde, une dimension nulle produit un ratio NaN qui retombe en
  // silence sur une seule colonne (grille ignorée par le navigateur).
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
    // min(100%, …) : sinon une colonne mini de 340px déborde un viewport de 320px.
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnPx}px), 1fr))`,
    // Bande large en vw (bien que la case soit fixe) : next/image élague le
    // srcset sous 640×(plus petit vw de la chaîne), un vw ici rouvre les
    // petits paliers pour toute la chaîne. En dessous de 1024px le conteneur
    // varie trop vite pour une valeur en px : vw obligatoire (95, la galerie
    // ne dépassant jamais 90% du viewport mesuré).
    sizes: `(min-width: ${WIDE_VIEWPORT_PX}px) ${wideCellVw}vw, (min-width: ${MID_VIEWPORT_PX}px) ${midCellPx}px, ${SMALL_VIEWPORT_VW}vw`,
  };
}

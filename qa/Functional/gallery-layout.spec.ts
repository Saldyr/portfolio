import { expect, test } from "playwright/test";
import { galleryLayout } from "@/lib/gallery-layout";

/**
 * Tests unitaires du seam de mise en page de la galerie (POR-39). Pas de
 * navigateur : la logique est pure, et c'est elle qui décide du ratio commun
 * et de la largeur de colonne. Les conséquences RENDUES de ces valeurs
 * (object-fit, géométrie réelle) sont couvertes côté DOM par
 * project-page.spec.ts — les deux ne se recouvrent pas.
 */

// Dimensions réelles des galeries du site, relevées sur public/uploads. Elles
// sont recopiées ici À DESSEIN : ce sont les cas qui ont motivé les seuils, et
// les figer permet de vérifier la logique sans navigateur. Contrepartie à
// connaître : remplacer un fichier de public/uploads ne rend pas ces tests
// rouges. C'est le rendu réel qui fait foi, couvert par project-page.spec.ts.
const NOISELESS_MIND = [
  { width: 298, height: 512 }, // 0.582
  { width: 820, height: 1024 }, // 0.801
  { width: 666, height: 1024 }, // 0.650
];
const GOJOB = [
  { width: 1200, height: 640 }, // 1.875
  { width: 1919, height: 1019 }, // 1.883
  { width: 1486, height: 714 }, // 2.081
  { width: 1373, height: 1263 }, // 1.087
  { width: 1498, height: 939 }, // 1.595
];
const MEDAILLO = [
  { width: 1886, height: 855 }, // 2.206
  { width: 1893, height: 371 }, // 5.102
  { width: 1877, height: 844 }, // 2.224
  { width: 1897, height: 820 }, // 2.313
];

test("gallery-layout: le ratio commun est la médiane, pas la moyenne", () => {
  // La moyenne de Médaillo vaut ~2.96, tirée par le 5.102 de medaillo-liste :
  // toutes les autres images seraient letterboxées pour l'outlier. La médiane
  // sert la majorité et laisse l'outlier être le seul à être letterboxé.
  expect(galleryLayout(MEDAILLO).ratio).toBeCloseTo(2.2685, 3);
  expect(galleryLayout(GOJOB).ratio).toBeCloseTo(1.875, 3);
  expect(galleryLayout(NOISELESS_MIND).ratio).toBeCloseTo(0.65, 3);
});

test("gallery-layout: nombre pair d'images — moyenne des deux ratios centraux", () => {
  const layout = galleryLayout([
    { width: 100, height: 100 }, // 1
    { width: 400, height: 100 }, // 4
    { width: 200, height: 100 }, // 2
    { width: 300, height: 100 }, // 3
  ]);
  expect(layout.ratio).toBeCloseTo(2.5, 6);
});

test("gallery-layout: une seule image — son propre ratio, sur toute la largeur", () => {
  const layout = galleryLayout([{ width: 1600, height: 900 }]);
  expect(layout.ratio).toBeCloseTo(1.7778, 3);
  // Une image seule ne gagne jamais de colonne : elle occupe tout le conteneur.
  expect(layout.sizes).toBe("(min-width: 1566px) 46vw, (min-width: 1024px) 706px, 95vw");
});

test("gallery-layout: la largeur mini de colonne suit le ratio de la galerie", () => {
  // L'exigence centrale de POR-39 : une valeur fixe pour toutes les galeries
  // donne soit des portraits énormes, soit des captures larges illisibles.
  expect(galleryLayout(NOISELESS_MIND).minColumnPx).toBe(220);
  expect(galleryLayout(GOJOB).minColumnPx).toBe(338);
  expect(galleryLayout(MEDAILLO).minColumnPx).toBe(340);
});

test("gallery-layout: la largeur mini reste bornée aux deux extrêmes", () => {
  const veryTall = galleryLayout([{ width: 100, height: 900 }]);
  const veryWide = galleryLayout([{ width: 900, height: 100 }]);
  expect(veryTall.minColumnPx).toBe(220);
  expect(veryWide.minColumnPx).toBe(340);
});

test("gallery-layout: sizes majore la case réellement rendue, sans la sous-estimer", () => {
  // Sous-estimer produit une image floue ; sur-estimer, le sur-téléchargement
  // que ce ticket corrige. Bornes vérifiées contre le rendu réel : 224px et
  // 15vw et 23vw majorent les cases exactes au-delà de 1566px (223px et 348px
  // dans un conteneur de 720px) tout en gardant les petits paliers du srcset.
  expect(galleryLayout(NOISELESS_MIND).sizes).toBe(
    "(min-width: 1566px) 15vw, (min-width: 1024px) 341px, 95vw",
  );
  expect(galleryLayout(GOJOB).sizes).toBe(
    "(min-width: 1566px) 23vw, (min-width: 1024px) 700px, 95vw",
  );
});

test("gallery-layout: sizes couvre le palier juste avant l'apparition d'une colonne", () => {
  // Régression visée : évaluer `sizes` au conteneur le plus large de la bande
  // donnerait 341px pour GoJob (2 colonnes à 706px), alors qu'à 1440px de
  // viewport la galerie tient en UNE colonne de 594px — l'image serait servie
  // trop petite, donc floue. C'est le palier à 1 colonne qui borne la bande.
  expect(galleryLayout(GOJOB).sizes).toContain("(min-width: 1024px) 700px");
});

test("gallery-layout: le template de colonnes ne déborde jamais horizontalement", () => {
  // `min(100%, …)` est ce qui empêche une colonne de 340px de dépasser un
  // viewport de 320px (couvert côté rendu par qa/Responsive/breakpoints).
  expect(galleryLayout(MEDAILLO).gridTemplateColumns).toBe(
    "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
  );
});

test("gallery-layout: des dimensions inexploitables échouent explicitement", () => {
  // Le hook Node de qa/support/register-image-imports.ts n'expose que `src` :
  // une spec qui passerait ces objets ici produirait un ratio NaN, donc un
  // `minmax(min(100%, NaNpx), 1fr)` que le navigateur ignore en silence.
  expect(() => galleryLayout([{ width: 0, height: 0 }])).toThrow(/non exploitable/i);
});

test("gallery-layout: une galerie vide échoue explicitement", () => {
  // Le rendu garde déjà `gallery.length > 0`. Ici, pas de NaN silencieux qui
  // produirait un `aspect-ratio: NaN` ignoré par le navigateur.
  expect(() => galleryLayout([])).toThrow(/vide/i);
});

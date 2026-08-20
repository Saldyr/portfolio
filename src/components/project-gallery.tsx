"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { GalleryLayout } from "@/lib/gallery-layout";
import type { GalleryItem } from "@/lib/projects";

/**
 * Galerie d'une page projet et sa visionneuse plein écran (POR-40).
 *
 * La grille elle-même vient de POR-39 et n'est pas retouchée : ratio commun
 * tenu par `galleryLayout()`, image inscrite en `object-contain`. Ce composant
 * ajoute l'agrandissement au clic, sur `<dialog>` natif — donc sans librairie,
 * et surtout sans piège de focus réécrit à la main : `showModal()` rend
 * l'arrière-plan inerte et confine Tab au dialogue, deux choses qu'une
 * réimplémentation raterait tôt ou tard.
 *
 * La page projet est un composant serveur `async` : elle ne peut pas porter
 * l'état d'ouverture. `galleryLayout()` reste appelé côté serveur et son
 * résultat descend en prop — le calcul ne part pas dans le bundle client.
 */

/**
 * `sizes` de l'image agrandie. Volontairement distinct de `layout.sizes`, qui
 * décrit une case de galerie de ~220 à 340px : le réutiliser ici ferait servir
 * une vignette en plein écran, donc floue.
 *
 * `100vw` majore la largeur réellement occupée (l'image est bornée en hauteur
 * et centrée, donc souvent plus étroite). Majorer coûte des octets ;
 * sous-déclarer coûte du flou. L'erreur n'est pas symétrique, et un `sizes`
 * exact demanderait d'exprimer `min(100vw, hauteur × ratio)` par image — donc
 * un `sizes` par image, pour un gain qui ne concerne que les portraits.
 */
const VIEWER_SIZES = "100vw";

type ProjectGalleryProps = {
  items: GalleryItem[];
  layout: GalleryLayout;
};

export function ProjectGallery({ items, layout }: ProjectGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /**
   * Dernier index affiché, conservé hors du state : au moment où l'événement
   * `close` arrive, `openIndex` est sur le point de repasser à `null` et
   * l'index n'est plus lisible nulle part. C'est lui qui permet de rendre le
   * focus à la vignette COURANTE plutôt qu'à celle d'origine.
   */
  const lastIndexRef = useRef(0);

  const isOpen = openIndex !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    // `showModal()` sur un dialogue déjà ouvert lève `InvalidStateError` et
    // fait tomber la page. D'où la garde, et surtout d'où la dépendance au
    // seul booléen d'ouverture : dépendre de `openIndex` rejouerait l'effet à
    // chaque changement d'image.
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();

    // Exigence 6, MESURÉE et non supposée : `showModal()` rend bien
    // l'arrière-plan inerte au pointeur, mais Chromium laisse la page défiler
    // à la molette et aux touches de défilement. Relevé le 2026-08-20 sur
    // build de prod, visionneuse ouverte : molette + PageDown + End font
    // passer `scrollY` de 1757 à 2387. D'où ce verrou.
    //
    // La valeur PRÉCÉDENTE est restaurée, jamais `""` : un verrou non relâché
    // fige la page définitivement, sans la moindre erreur.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousPaddingRight = root.style.paddingRight;
    const scrollbarPx = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    // Compense la barre de défilement qui disparaît, sinon toute la page se
    // décale sous le dialogue. Local à l'ouverture, à dessein : un
    // `scrollbar-gutter: stable` global décalerait le site entier et
    // invaliderait les trois baselines de qa/Visual.
    if (scrollbarPx > 0) root.style.paddingRight = `${scrollbarPx}px`;

    return () => {
      root.style.overflow = previousOverflow;
      root.style.paddingRight = previousPaddingRight;
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  function show(index: number) {
    // Butée, pas de bouclage : la dernière image ne ramène pas à la première.
    const clamped = Math.min(Math.max(index, 0), items.length - 1);
    lastIndexRef.current = clamped;
    setOpenIndex(clamped);
  }

  function close() {
    dialogRef.current?.close();
  }

  /**
   * Unique sortie : Escape, bouton fermer et clic sur le fond appellent tous
   * `close()`, donc passent tous par ici. Un seul endroit où le focus peut
   * être mal rendu.
   *
   * Le focus est posé DEUX fois, et ce n'est pas une ceinture-bretelles
   * gratuite. Séquence RELEVÉE sous Chromium le 2026-08-20 (journal des
   * `focusin` pendant la fermeture, vignette courante = 2, vignette d'origine
   * = 0) :
   *
   *   1. cet appel-ci n'émet AUCUN focusin — au moment où l'événement `close`
   *      arrive, le focus n'est pas encore rendu au document ;
   *   2. le navigateur restaure le focus sur la vignette d'ORIGINE (0) ;
   *   3. la tâche différée ci-dessous repose le focus sur la vignette
   *      courante (2), qui reste l'état final.
   *
   * D'où le report par `setTimeout(…, 0)` : il faut passer APRÈS l'étape 2.
   * `requestAnimationFrame` a été essayé et écarté — lié à la cadence de
   * rendu, il laissait le focus sur la mauvaise vignette pendant 125 ms sous
   * charge, contre 3 ms ici. L'appel immédiat est conservé : il est gratuit,
   * et il a le dernier mot si un navigateur restaure plus tôt.
   *
   * Ce transitoire de quelques millisecondes est inhérent à `<dialog>` : la
   * restauration native ne peut être ni annulée ni redirigée.
   */
  function handleClose() {
    setOpenIndex(null);
    const thumb = thumbRefs.current[lastIndexRef.current];
    if (!thumb) return;
    thumb.focus();
    setTimeout(() => thumb.focus(), 0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (openIndex === null) return;
    // Escape n'est pas intercepté : le natif émet `cancel` puis `close`, ce qui
    // rejoint handleClose. Le réimplémenter ferait deux chemins de fermeture.
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(openIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(openIndex - 1);
    }
  }

  /** Ferme au clic hors des contrôles et de l'image. */
  function handleSurfaceClick(event: React.MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-viewer-content]")) close();
  }

  /**
   * Déplace le focus hors d'un bouton qui vient de devenir `disabled` : sans
   * ça, atteindre la dernière image au clavier laisse le focus sur un élément
   * inerte, donc sur `<body>`.
   */
  function navigate(nextIndex: number) {
    show(nextIndex);
    if (nextIndex === 0 || nextIndex === items.length - 1) closeButtonRef.current?.focus();
  }

  const current = openIndex === null ? null : items[openIndex];
  // Exigence 5 : n±1 seulement. Poids relevés sur public/uploads le
  // 2026-08-20 : 714 Ko pour la plus lourde des captures GoJob, 2,5 Mo pour
  // noiseless-mind-veilleuses.png. Précharger une galerie entière se compte
  // donc en mégaoctets, à l'ouverture et pour rien.
  const neighbours =
    openIndex === null
      ? []
      : [openIndex - 1, openIndex + 1].filter((index) => index >= 0 && index < items.length);

  return (
    <>
      <div
        data-testid="project-gallery"
        className="grid gap-(--space-l)"
        style={{ gridTemplateColumns: layout.gridTemplateColumns }}
      >
        {items.map((shot, index) => (
          <button
            key={shot.image.src}
            ref={(node) => {
              thumbRefs.current[index] = node;
            }}
            type="button"
            data-gallery-index={index}
            aria-label={`Agrandir l'image : ${shot.alt}`}
            onClick={() => show(index)}
            className="relative cursor-zoom-in overflow-hidden rounded-(--radius-button) border border-(--border-subtle) bg-(--leaf-void) transition-colors duration-150 hover:border-(--leaf-stone)"
            // Hauteur non plafonnée : c'est le ratio de la galerie qui
            // la fixe. La borner rerognerait les portraits, ce que
            // POR-39 corrige.
            style={{ aspectRatio: layout.ratio }}
          >
            <Image
              src={shot.image}
              alt={shot.alt}
              fill
              // `object-contain`, jamais `cover` : l'image entière est
              // inscrite dans la case, les outliers letterboxés sur
              // --leaf-void. Perdre cette classe ferait retomber le
              // navigateur sur `fill`, qui DÉFORME (POR-38 le teste).
              className="object-contain"
              sizes={layout.sizes}
            />
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        data-testid="gallery-viewer"
        aria-label="Image agrandie"
        onClose={handleClose}
        onKeyDown={handleKeyDown}
        onClick={handleSurfaceClick}
        className="gallery-viewer fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-foreground"
      >
        {openIndex !== null && current && (
          <div className="flex h-full w-full flex-col gap-(--space-m) p-(--space-m) sm:p-(--space-l)">
            <div className="flex items-center justify-between gap-(--space-m)">
              <p
                data-viewer-content
                data-testid="gallery-viewer-counter"
                // Annonce le changement d'image à un lecteur d'écran : sans
                // région live, naviguer aux flèches ne produit aucun retour.
                aria-live="polite"
                className="m-0 font-mono text-xs uppercase tracking-(--tracking-caps) text-(--text-muted)"
              >
                {openIndex + 1} / {items.length}
              </p>
              <button
                ref={closeButtonRef}
                data-viewer-content
                type="button"
                onClick={close}
                aria-label="Fermer la visionneuse"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-(--radius-button) border border-(--border-subtle) bg-surface text-lg transition-colors duration-150 hover:border-(--leaf-stone) hover:text-accent"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            {/*
              Zone d'image ÉTIRÉE (pas de `items-center` ici) : le `max-h-full`
              de l'image se résout en pourcentage de la hauteur de ce
              conteneur, et une hauteur en pourcentage ne se résout que si le
              conteneur en a une définie. Centrer ici au lieu d'étirer rendait
              cette hauteur `auto`, donc `max-h-full` inopérant — et l'image
              débordait sous le bas de l'écran (constaté le 2026-08-20). Le
              centrage est fait par le `m-auto` de l'image.
            */}
            <div className="flex min-h-0 flex-1">
              <Image
                key={current.image.src}
                data-viewer-content
                data-testid="gallery-viewer-image"
                src={current.image}
                alt={current.alt}
                sizes={VIEWER_SIZES}
                // Jamais `lazy` : l'image est déjà à l'écran au moment où
                // elle est montée, la différer n'ajouterait qu'une latence.
                loading="eager"
                className="m-auto h-auto max-h-full w-auto max-w-full object-contain"
              />
            </div>

            {/*
              Contrôles en barre basse plutôt qu'en flanc de l'image : en flanc,
              ils amputent la largeur disponible, ce qui se paie surtout sur
              mobile où l'image tombait à ~280px de large. Ici l'image dispose
              de toute la largeur, et les boutons restent atteignables au pouce.
            */}
            <div className="flex items-center justify-center gap-(--space-m)">
              <button
                data-viewer-content
                type="button"
                onClick={() => navigate(openIndex - 1)}
                disabled={openIndex === 0}
                aria-label="Image précédente"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-(--radius-button) border border-(--border-subtle) bg-surface text-lg transition-colors duration-150 hover:border-(--leaf-stone) hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-(--border-subtle) disabled:hover:text-foreground"
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                data-viewer-content
                type="button"
                onClick={() => navigate(openIndex + 1)}
                disabled={openIndex === items.length - 1}
                aria-label="Image suivante"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-(--radius-button) border border-(--border-subtle) bg-surface text-lg transition-colors duration-150 hover:border-(--leaf-stone) hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-(--border-subtle) disabled:hover:text-foreground"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>

            {/*
              Préchargement des voisines. Conteneur de taille nulle, donc
              jamais visible — mais `loading="eager"` est indispensable : en
              `lazy` (le défaut de next/image), une image hors viewport n'est
              JAMAIS requêtée et le préchargement devient un mensonge sans
              symptôme.

              `sizes` identique à l'image affichée, à dessein : c'est ce qui
              garantit que le candidat de srcset préchargé est exactement celui
              qui sera affiché. Une valeur différente ferait télécharger deux
              variantes de la même image, sans erreur et sans rien de visible.
            */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
            >
              {neighbours.map((index) => (
                <Image
                  key={items[index].image.src}
                  data-testid="gallery-viewer-preload"
                  src={items[index].image}
                  alt=""
                  sizes={VIEWER_SIZES}
                  loading="eager"
                />
              ))}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { GalleryLayout } from "@/lib/gallery-layout";
import type { GalleryItem } from "@/lib/projects";

// Galerie + visionneuse plein écran sur `<dialog>` natif : showModal() rend
// l'arrière-plan inerte et confine Tab, sans focus trap à réimplémenter.
// galleryLayout() reste appelé côté serveur (page projet async), le résultat
// descend en prop pour ne pas partir dans le bundle client.

// Distinct de layout.sizes (case ~220-340px) : le réutiliser en plein écran
// servirait une vignette floue.
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
  // Hors du state : à l'event `close`, openIndex est déjà sur le point de
  // repasser à null. Sert à rendre le focus à la vignette courante.
  const lastIndexRef = useRef(0);

  const isOpen = openIndex !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    // Garde requise : showModal() sur un dialogue déjà ouvert lève une
    // InvalidStateError. Dépend du seul booléen d'ouverture, pas d'openIndex,
    // pour ne pas rejouer l'effet à chaque changement d'image.
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();

    // showModal() n'empêche pas le scroll molette/clavier (Chromium) : verrou
    // manuel, valeur PRÉCÉDENTE restaurée (jamais "") pour ne pas figer la page.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousPaddingRight = root.style.paddingRight;
    const scrollbarPx = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    // Compense la scrollbar qui disparaît, sinon la page se décale.
    if (scrollbarPx > 0) root.style.paddingRight = `${scrollbarPx}px`;

    return () => {
      root.style.overflow = previousOverflow;
      root.style.paddingRight = previousPaddingRight;
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  function show(index: number) {
    // Butée, pas de bouclage.
    const clamped = Math.min(Math.max(index, 0), items.length - 1);
    lastIndexRef.current = clamped;
    setOpenIndex(clamped);
  }

  function close() {
    dialogRef.current?.close();
  }

  // Le navigateur restaure le focus sur la vignette d'ORIGINE avant que ce
  // handler tourne ; le setTimeout(0) reprend la main après coup pour le
  // reposer sur la vignette courante (mesuré : requestAnimationFrame arrive
  // trop tard sous charge). L'appel immédiat reste gratuit et a le dernier
  // mot si le navigateur restaure plus tôt.
  function handleClose() {
    setOpenIndex(null);
    const thumb = thumbRefs.current[lastIndexRef.current];
    if (!thumb) return;
    thumb.focus();
    setTimeout(() => thumb.focus(), 0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (openIndex === null) return;
    // Escape non intercepté : le natif émet cancel puis close, qui rejoint handleClose.
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(openIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(openIndex - 1);
    }
  }

  function handleSurfaceClick(event: React.MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-viewer-content]")) close();
  }

  // Sans ça, atteindre la dernière image au clavier laisse le focus sur un
  // bouton devenu disabled, donc sur <body>.
  function navigate(nextIndex: number) {
    show(nextIndex);
    if (nextIndex === 0 || nextIndex === items.length - 1) closeButtonRef.current?.focus();
  }

  const current = openIndex === null ? null : items[openIndex];
  // n±1 seulement : précharger la galerie entière coûterait des mégaoctets pour rien.
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
            style={{ aspectRatio: layout.ratio }}
          >
            <Image
              src={shot.image}
              alt={shot.alt}
              fill
              // object-contain, jamais cover : perdre cette classe ferait
              // retomber sur fill, qui déforme l'image.
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
            {/* Région live distincte du compteur : sans `key`, sinon
                un remount empêcherait le lecteur d'écran d'annoncer la mutation. */}
            <p
              data-viewer-content
              data-testid="gallery-viewer-subject"
              aria-live="polite"
              className="sr-only"
            >
              {current.alt}
            </p>

            <div className="flex items-center justify-between gap-(--space-m)">
              <p
                data-viewer-content
                data-testid="gallery-viewer-counter"
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

            {/* Pas d'items-center ici : sinon la hauteur devient auto et
                max-h-full de l'image ne se résout plus (débordement). */}
            <div className="flex min-h-0 flex-1">
              <Image
                key={current.image.src}
                data-viewer-content
                data-testid="gallery-viewer-image"
                src={current.image}
                alt={current.alt}
                sizes={VIEWER_SIZES}
                loading="eager"
                className="m-auto h-auto max-h-full w-auto max-w-full object-contain"
              />
            </div>

            {/* Barre basse plutôt qu'en flanc : en flanc, ampute la largeur
                disponible pour l'image sur mobile. */}
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

            {/* Préchargement des voisines : loading="eager" indispensable, le
                défaut "lazy" ne requêterait jamais une image hors viewport.
                `sizes` identique à l'image affichée pour préchargier le même
                candidat de srcset. */}
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

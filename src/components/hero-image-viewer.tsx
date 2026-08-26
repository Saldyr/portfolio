"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Hero image cliquable et sa visionneuse plein écran (POR-59).
 *
 * Même mécanique que ProjectGallery (POR-40) : `<dialog>` natif piloté par
 * `showModal()`/`close()`, qui rend l'arrière-plan inerte et confine Tab au
 * dialogue sans réimplémentation de focus trap. Simplifié ici pour une image
 * unique : pas de flèches, de compteur ni de préchargement de voisines.
 *
 * La page projet est un composant serveur `async` : elle ne peut pas porter
 * l'état d'ouverture, d'où ce wrapper client dédié.
 */

type HeroImageViewerProps = {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
  position?: string;
};

export function HeroImageViewer({ src, alt, fit, position }: HeroImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();

    // Scroll-lock identique à ProjectGallery (POR-40) : `showModal()` rend
    // l'arrière-plan inerte au pointeur mais laisse Chromium défiler à la
    // molette/aux touches. La valeur PRÉCÉDENTE est restaurée, jamais `""`,
    // sinon un verrou non relâché fige la page sans erreur visible.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousPaddingRight = root.style.paddingRight;
    const scrollbarPx = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (scrollbarPx > 0) root.style.paddingRight = `${scrollbarPx}px`;

    return () => {
      root.style.overflow = previousOverflow;
      root.style.paddingRight = previousPaddingRight;
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  function open() {
    setIsOpen(true);
  }

  function close() {
    dialogRef.current?.close();
  }

  /**
   * Unique sortie : Escape (natif, via l'event `close`), bouton fermer et
   * clic sur le fond appellent tous `close()`.
   */
  function handleClose() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleSurfaceClick(event: React.MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-viewer-content]")) close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-label={`Agrandir l'image : ${alt}`}
        className="relative block h-[clamp(200px,38vw,420px)] w-full cursor-pointer overflow-hidden rounded-card border border-(--border-subtle) bg-(--leaf-void)"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className={fit === "contain" ? "object-contain" : "object-cover"}
          style={position ? { objectPosition: position } : undefined}
          sizes="(min-width: 1120px) 1120px, 100vw"
          priority
        />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Image agrandie"
        onClose={handleClose}
        onClick={handleSurfaceClick}
        className="gallery-viewer fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-foreground"
      >
        {isOpen && (
          <div className="flex h-full w-full flex-col gap-(--space-m) p-(--space-m) sm:p-(--space-l)">
            <div className="flex items-center justify-end">
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

            <div data-viewer-content className="relative min-h-0 flex-1">
              <Image
                src={src}
                alt={alt}
                fill
                sizes="100vw"
                loading="eager"
                className="object-contain"
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

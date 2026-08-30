"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Hero image + visionneuse plein écran, même mécanique que ProjectGallery
// (dialog natif showModal/close, pas de focus trap à réimplémenter), en
// version simplifiée (une seule image). Wrapper client car la page projet
// est un composant serveur async.

type HeroImageViewerProps = {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
  position?: string;
  // Ratio "L / H" : le cadre l'adopte à toute largeur, l'image le remplit
  // sans rognage. À défaut, hauteur fluide clampée + recadrage object-cover.
  aspectRatio?: string;
};

export function HeroImageViewer({ src, alt, fit, position, aspectRatio }: HeroImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();

    // showModal() n'empêche pas le scroll molette/clavier (Chromium) : verrou
    // manuel, valeur PRÉCÉDENTE restaurée (jamais "") pour ne pas figer la page.
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

  // Point de sortie unique : Escape, bouton fermer et clic sur le fond passent
  // tous par close() puis cet handler.
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
        style={aspectRatio ? { aspectRatio } : undefined}
        className={`relative block w-full cursor-pointer overflow-hidden rounded-card border border-(--border-subtle) bg-(--leaf-void) ${
          aspectRatio ? "" : "h-[clamp(200px,38vw,420px)]"
        }`}
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

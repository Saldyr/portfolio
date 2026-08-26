"use client";

// Menu de navigation mobile : bouton hamburger + panneau plein écran, affiché
// sous le nav desktop de Nav (src/components/nav.tsx).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Accueil" },
  { href: "/#projets", label: "Projets" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-(--radius-button) border border-(--leaf-stone) text-foreground"
      >
        <span
          className={`h-px w-4.5 bg-current transition-transform duration-150 ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
        />
        <span
          className={`h-px w-4.5 bg-current transition-transform duration-150 ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-(--leaf-void)/70"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 top-full z-50 mt-(--space-m) flex flex-col gap-(--space-m) rounded-card border border-(--border-subtle) bg-surface p-(--pad-card) shadow-(--shadow-deep)">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-foreground transition-colors duration-150 hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

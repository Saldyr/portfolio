// Titre de section réutilisé sur les pages (accueil, à-propos, fiche projet) :
// texte en majuscules souligné d'un trait d'accent.
import type { ReactNode } from "react";

const GAP_CLASS: Record<"m" | "l", string> = {
  m: "gap-(--space-m)",
  l: "gap-(--space-l)",
};

export function SectionHeading({
  children,
  gap = "m",
}: {
  children: ReactNode;
  gap?: "m" | "l";
}) {
  return (
    <div className={`flex flex-col ${GAP_CLASS[gap]}`}>
      <h2 className="m-0 text-(length:--type-card-title) font-bold tracking-(--tracking-caps)">
        {children}
      </h2>
      <div className="h-0.5 w-15 bg-accent" />
    </div>
  );
}

import type { ReactNode } from "react";

const VARIANT_CLASS: Record<"neutral" | "accent", string> = {
  neutral: "bg-(--surface-raised) text-foreground border-(--leaf-stone)",
  accent:
    "bg-[rgba(178,227,42,0.12)] text-accent border-(--border-accent)",
};

const SIZE_CLASS: Record<"sm" | "md", string> = {
  sm: "py-[4px] px-[10px]",
  md: "py-[6px] px-[12px]",
};

export function Tag({
  children,
  variant = "neutral",
  size = "md",
}: {
  children: ReactNode;
  variant?: "neutral" | "accent";
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`font-mono text-xs rounded-(--radius-pill) border ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </span>
  );
}

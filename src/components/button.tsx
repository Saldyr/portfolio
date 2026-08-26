// Bouton du design system : rendu en <Link> si `href` est fourni, en <button>
// sinon. Deux variantes (primary/secondary).
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

const VARIANT_CLASS: Record<"primary" | "secondary", string> = {
  primary:
    "bg-accent text-(--leaf-void) hover:bg-(--leaf-green) hover:shadow-(--glow-leaf)",
  secondary:
    "bg-transparent text-foreground border border-(--leaf-stone) hover:border-accent hover:text-accent",
};

const BASE_CLASS =
  "inline-flex h-11 flex-shrink-0 items-center justify-center whitespace-nowrap rounded-(--radius-button) px-[22px] text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-150";

type CommonProps = {
  variant?: "primary" | "secondary";
  className?: string;
};

type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonProps = ButtonAsLink | ButtonAsButton;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const classes = `${BASE_CLASS} ${VARIANT_CLASS[variant]} ${className}`;

  if ("href" in props && props.href !== undefined) {
    const { href, ...rest } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...rest}>
        {props.children}
      </Link>
    );
  }

  const { type = "button", ...rest } = props as ButtonAsButton;
  return (
    <button type={type} className={classes} {...rest}>
      {props.children}
    </button>
  );
}

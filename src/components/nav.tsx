import Link from "next/link";
import { MobileMenu } from "@/components/mobile-menu";

type Page = "home" | "project" | "apropos" | "contact";

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  if (active) {
    return <span className="text-sm font-medium text-accent">{children}</span>;
  }
  return (
    <Link
      href={href}
      className="text-sm text-(--text-muted) transition-colors duration-150 hover:text-foreground"
    >
      {children}
    </Link>
  );
}

export function Nav({ page }: { page: Page }) {
  return (
    <div className="container-page pt-(--space-l)">
      <div className="relative flex flex-wrap items-center justify-between gap-(--space-l) rounded-card border border-(--border-subtle) bg-surface px-[clamp(15px,3vw,25px)] py-(--space-m)">
        <Link
          href="/"
          className="font-mono text-sm font-medium uppercase tracking-widest text-foreground"
        >
          Saldyr
        </Link>
        <div className="hidden items-center gap-(--space-l) sm:flex">
          <NavLink href="/#projets" active={page === "home" || page === "project"}>
            Projets
          </NavLink>
          <NavLink href="/a-propos" active={page === "apropos"}>
            À propos
          </NavLink>
          <NavLink href="/contact" active={page === "contact"}>
            Contact
          </NavLink>
        </div>
        <MobileMenu />
      </div>
    </div>
  );
}

import Link from "next/link";

export function Nav({ page }: { page: "home" | "project" }) {
  return (
    <div className="container-page pt-(--space-l)">
      <div className="flex flex-wrap items-center justify-between gap-(--space-l) rounded-card border border-(--border-subtle) bg-surface px-[clamp(15px,3vw,25px)] py-(--space-m)">
        <Link
          href="/"
          className="font-mono text-sm font-medium uppercase tracking-widest text-foreground"
        >
          Saldyr
        </Link>
        <div className="flex flex-wrap items-center gap-(--space-l)">
          {page === "home" ? (
            <span className="text-sm font-medium text-accent">Projets</span>
          ) : (
            <Link href="/#projets" className="text-sm font-medium text-accent">
              Projets
            </Link>
          )}
          <span className="text-sm text-(--text-muted) transition-colors duration-150 hover:text-foreground">
            À propos
          </span>
          <Link
            href="/#contact"
            className="text-sm text-(--text-muted) transition-colors duration-150 hover:text-foreground"
          >
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}

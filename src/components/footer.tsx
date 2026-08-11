export function Footer() {
  return (
    <footer className="flex flex-wrap justify-between gap-(--space-l) border-t border-(--border-subtle) pt-(--space-l) font-mono text-xs text-(--text-muted)">
      <span>© 2026 Saldyr</span>
      <a
        href="https://github.com/Saldyr/portfolio"
        target="_blank"
        rel="noreferrer"
      >
        Code source
      </a>
    </footer>
  );
}

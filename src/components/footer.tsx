export function Footer() {
  return (
    <footer className="flex flex-wrap justify-between gap-(--space-l) border-t border-(--border-subtle) pt-(--space-l) font-mono text-xs text-(--text-muted)">
      <span>© 2026 Saldyr</span>
      <div className="flex flex-wrap gap-(--space-l)">
        <a href="mailto:saldyr69@proton.me">Email</a>
        <a
          href="https://www.linkedin.com/in/romain-cartia"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <a
          href="https://github.com/Saldyr"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          href="https://gitlab.com/romain.cartia"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitLab
        </a>
      </div>
    </footer>
  );
}

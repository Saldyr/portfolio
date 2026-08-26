export const SITE_AUTHOR = "Romain Cartia";

// Distinct de SITE_AUTHOR : forme courte utilisée dans SITE_TITLE.
export const SITE_NAME = "Romain C";

// Pas de `import "server-only"` ici (contrairement à site-url.ts) : les specs
// Playwright importent cette constante pour asserter le titre servi.
export const SITE_TITLE = `${SITE_NAME} // Développeur full-stack IA`;

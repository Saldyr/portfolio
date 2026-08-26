import type { NextConfig } from "next";

// Variables d'environnement fournies par le projet (hors variables injectées
// par la plateforme, ex. VERCEL_PROJECT_PRODUCTION_URL) requises en
// production/preview Vercel. Voir README.md pour la procédure d'ajout.
const REQUIRED_ENV_VARS = ["RESEND_API_KEY"] as const;

// Garde de build : une variable requise absente en prod/preview Vercel ne doit
// jamais passer silencieusement. Restreinte à VERCEL_ENV pour ne pas casser
// les builds locaux et `npm run qa`, qui vide volontairement RESEND_API_KEY
// (voir qa/playwright.config.ts).
const vercelEnv = process.env.VERCEL_ENV;
if (vercelEnv === "production" || vercelEnv === "preview") {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Variable(s) d'environnement requise(s) manquante(s) pour ce build Vercel (${vercelEnv}) : ${missing.join(", ")}`,
    );
  }
}

// `headers()` s'applique AUSSI à `next dev`, pas seulement au build de prod :
// une CSP calibrée sur la seule prod casserait le mode dev, où Turbopack a
// besoin d'`eval` et d'un websocket HMR. D'où ces deux assouplissements, et
// eux seuls, conditionnés à l'environnement.
const isDev = process.env.NODE_ENV === "development";

/**
 * CSP statique, sans nonce : un middleware générant un nonce par requête
 * forcerait le rendu dynamique de pages aujourd'hui statiques, pour un site
 * vitrine sans contenu utilisateur.
 *
 * Calibrée sur ce que le build produit réellement, constaté dans le HTML servi
 * (`curl http://localhost:<port>/` sur un `next start`) :
 * - `script-src 'unsafe-inline'` : 2 `<script>` inline d'hydratation
 *   (`self.__next_f.push(...)`, payload RSC). Sans nonce, pas d'alternative.
 * - `style-src 'unsafe-inline'` : la home ne contient AUCUN `<style>` (le CSS
 *   part en feuille externe), mais 6 attributs `style="…"` émis par
 *   `next/image fill` — faute de `style-src-attr`, ils retombent sur
 *   `style-src`. S'y ajoutent les `<style>` de `_global-error` / `_not-found`.
 * - `img-src … data:` : le grain du backdrop est une URI `data:image/svg+xml`
 *   (src/app/globals.css:436).
 * - `font-src 'self'` suffit : next/font/google (src/app/layout.tsx) auto-héberge
 *   les polices au build, aucune requête vers fonts.gstatic.com.
 * - `connect-src 'self'` suffit : Resend est appelé côté serveur depuis la
 *   Server Action (src/app/contact/actions.ts, "use server"), jamais depuis le
 *   navigateur. Le seul trafic client est le POST same-origin de l'action.
 * - Rien pour le shader Dust (src/components/dust.tsx) : GLSL en chaîne, sans
 *   eval, Blob, Worker ni createObjectURL — hors périmètre CSP.
 *
 * `upgrade-insecure-requests` volontairement absent : le HTML produit ne charge
 * aucune sous-ressource `http://`, la directive serait donc sans effet. Vercel
 * sert le site en HTTPS et HSTS est posé plus bas.
 *
 * Conséquence connue : sur un *preview deployment*, `script-src 'self'` bloque
 * la Vercel Toolbar (`https://vercel.live/...`), injectée par la plateforme et
 * absente des dépendances du projet. La prod n'est pas concernée. À rouvrir si
 * les commentaires de preview deviennent utiles.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // `ws:` sans hôte : le HMR Turbopack se connecte aussi bien sur localhost que
  // sur l'IP réseau du poste. Restreindre à `ws://localhost:*` casserait
  // l'accès depuis un autre appareil du réseau. Dev uniquement.
  `connect-src 'self'${isDev ? " ws:" : ""}`,
];

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES.join("; ") },
  // Doublon volontaire de `frame-ancestors 'none'` : X-Frame-Options couvre
  // les agents qui ignorent la directive CSP.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // `preload` est aujourd'hui sans portée : le site est servi depuis un domaine
  // *.vercel.app, déjà sur la liste de préchargement. Le jour où un domaine
  // custom est attaché, cet en-tête engage l'apex ET tous ses sous-domaines,
  // et se défait très lentement — à reconfirmer à ce moment-là.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Indicateur de dev par défaut (bottom-left) chevauche le CTA hero et
  // le titre "PROJETS" à certaines tailles d'écran ; invisible en prod.
  devIndicators: {
    position: "top-right",
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;

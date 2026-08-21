import { expect, test } from "playwright/test";
import { ROUTES } from "../qa.config";

// Ces tests vérifient l'état réel du serveur de prod. Les en-têtes sont posés
// par `headers()` dans next.config.ts (POR-48) ; un échec ici signale donc une
// régression de configuration, pas un bug du test.
//
// POR-50 : les valeurs sont figées, pas seulement la présence. Une CSP vidée
// (`content-security-policy: ""`) ou affaiblie (`default-src *`) reste un
// en-tête présent — `toBeTruthy()` la laissait passer.
//
// Les valeurs attendues sont celles de PRODUCTION : la suite tourne contre un
// `next start` (voir qa/playwright.config.ts, webServer), donc les deux
// assouplissements dev de next.config.ts — `'unsafe-eval'` dans `script-src` et
// `ws:` dans `connect-src` — ne s'appliquent pas ici.
//
// Cette suite ne dit la vérité que si le serveur interrogé sert bien le build
// courant : les en-têtes sont figés au démarrage du serveur, un `next start`
// périmé sert donc l'ancienne configuration sans le signaler. C'est la garde de
// qa/support/assert-fresh-server.ts (POR-52) qui l'assure en amont.

const EXPECTED_CSP: Record<string, string[]> = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  "img-src": ["'self'", "data:"],
  "font-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "script-src": ["'self'", "'unsafe-inline'"],
  "connect-src": ["'self'"],
};

const EXPECTED_HEADERS: Record<string, string> = {
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * Découpe la CSP en `directive -> sources`, plutôt que de comparer la chaîne
 * entière : réordonner deux directives ne change rien à la politique et ne doit
 * pas faire rougir la suite.
 *
 * Les sources sont triées pour la même raison — une source-list CSP est
 * sémantiquement un ensemble, `'self' data:` et `data: 'self'` sont la même
 * règle.
 *
 * Une directive répétée lève : le navigateur ne retient que la première
 * occurrence, donc une map qui écraserait silencieusement la précédente
 * validerait une politique que personne n'applique.
 */
function parseCsp(header: string | undefined): Record<string, string[]> {
  const parsed: Record<string, string[]> = {};
  for (const segment of (header ?? "").split(";")) {
    const trimmed = segment.trim();
    if (trimmed === "") continue;
    const [name, ...sources] = trimmed.split(/\s+/);
    const directive = name.toLowerCase();
    if (directive in parsed) {
      throw new Error(
        `Directive CSP dupliquée : "${directive}". Seule la première est appliquée par le navigateur — corriger next.config.ts.`,
      );
    }
    parsed[directive] = [...sources].sort();
  }
  return parsed;
}

test("headers: les six en-têtes de sécurité ont exactement leur valeur attendue", async ({
  request,
}) => {
  const headers = (await request.get(ROUTES.home)).headers();

  // `toEqual` sur la map complète, et non une vérification directive par
  // directive : une directive AJOUTÉE sans intention (un `script-src-elem`
  // permissif, par exemple) doit rougir au même titre qu'une directive retirée.
  expect
    .soft(parseCsp(headers["content-security-policy"]), "content-security-policy")
    .toEqual(EXPECTED_CSP);

  // `soft` : un run doit rapporter les six écarts d'un coup, pas s'arrêter au
  // premier — c'est ce qui rend le diagnostic possible en une seule passe.
  for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
    expect.soft(headers[name], name).toBe(value);
  }
});

test("headers: la CSP s'applique aux autres routes, pas seulement à l'accueil", async ({
  request,
}) => {
  // next.config.ts applique `source: "/:path*"` ; restreindre ce motif par
  // erreur laisserait l'accueil protégé et le reste du site à découvert.
  const headers = (await request.get(ROUTES.contact)).headers();
  expect(parseCsp(headers["content-security-policy"]), "content-security-policy").toEqual(
    EXPECTED_CSP,
  );
});

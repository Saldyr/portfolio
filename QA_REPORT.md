# Rapport QA final — Portfolio

Date d'agrégation : 2026-08-13. Ce document synthétise les 12 rapports réels
produits sous `qa/Reports/*.md` (gitignorés, présents uniquement en local).
Aucun résultat ci-dessous n'est supposé : chaque constat référence le rapport
source et, quand disponible, l'emplacement dans le code applicatif (`src/`).

## 1. Résumé

**Statut global : PASS avec réserves** — aucune suite ne bloque un déploiement
(0 CRITICAL), mais plusieurs gaps réels (HIGH/MEDIUM) restent non corrigés,
volontairement laissés hors périmètre des tâches QA (audit et documentation,
pas de correctif applicatif hors sitemap/robots).

| Sévérité | Nombre | 
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 11 |
| LOW | 15 |
| SUGGESTION | 5 |

Score global : pas de suite ne échoue sur un défaut applicatif bloquant.
Performance (Lighthouse desktop) : 0.99–1.00. Accessibilité automatisée
(axe) : 0 violation WCAG 2.0/2.1 A/AA. Sécurité : 1 HIGH + 2 MEDIUM + 2 LOW
sur les headers/formulaire. SEO : 1 HIGH + 2 MEDIUM + 2 LOW sur les
métadonnées. Qualité de code : 1 MEDIUM (dépendance transitive non
déclarée), rien de bloquant.

## 2. Statut PASS/FAIL par catégorie

| Catégorie | Résultat technique | Statut | Note |
|---|---|---|---|
| Functional | 36/36 (`--workers=1`) ; 31-35/36 en parallélisation par défaut | **PASS** | Échecs en workers=6 dus à saturation CPU machine (timeouts/crash session Chromium), pas à une régression applicative — confirmé par 36/36 stable à workers=1 |
| Responsive | 51-52/54 (2 runs) | **PASS** | 2-3 échecs/run, tous timeout 30s sur `mobile-chromium × viewport desktop large` (limite machine documentée), 0 défaut de layout détecté |
| Visual | 12/12 (après régénération des baselines) | **PASS** | Baselines initiales invalidées par un bug de harnais WebGL (voir WebGL), régénérées et revérifiées 2×12/12 |
| Accessibility (axe + clavier) | 46/52, 0 violation axe WCAG A/AA | **PASS avec gaps** | 6 échecs = 3 gaps réels reproductibles (landmark nav, contentinfo footer, aria-live toast) ; axe à 0 violation ne garantit pas l'accessibilité complète (couverture ~30-40%) |
| Focus Ring Verification | Vérification contradictoire tranchée | **PASS** | Le gap "anneau de focus absent" (repéré en revue Visual) est infirmé : artefact de mesure (lecture prise pendant une transition CSS de 150ms). Reste une observation de design (faible saillance visuelle sur `Button` primaire) |
| Performance (Lighthouse) | 0 CRITIQUE / 3 IMPORTANT / 6 AMÉLIORATION | **PASS** | LCP/CLS/poids tous sous budget avec marge confortable ; INP non mesurable avec l'outillage actuel (limite d'outil, pas un échec) |
| WebGL | 31/44 pass, 12 skip (par conception), 1 échec | **PASS** | Le seul échec documente un bug du **harnais de test** (`--use-gl=swiftshader` tuait le contexte WebGL2), corrigé dans la config ; le composant applicatif dégrade proprement dans les 3 scénarios de panne testés |
| SEO | 26/30 (4 `test.fixme()` documentant des gaps non corrigés) | **PASS avec gaps** | 1 HIGH (canonical), 2 MEDIUM, 2 LOW — voir §3 |
| Security | 0/10 (échecs attendus, documentent des gaps réels) | **PASS avec gaps** | 1 HIGH (X-Frame-Options), 2 MEDIUM, 2 LOW — voir §3. 0 vulnérabilité npm audit, 0 secret committé |
| Code Quality | lint 0 erreur (2 warnings), typecheck 0 erreur, build OK, démarrage prod OK | **PASS** | 1 MEDIUM (dépendance transitive non déclarée), 4 LOW mineurs |

## 3. Problèmes identifiés

### HIGH

**H-1 — Canonical absent sur toutes les pages**
- **Preuve** : `qa/SEO/metadata.spec.ts` (`test.fixme`), `link[rel="canonical"]` → 0 élément sur `/` et `/projets/noiseless-mind`.
- **Impact** : les moteurs de recherche peuvent indexer des variantes d'URL comme des pages distinctes, diluant l'autorité SEO de la page réelle.
- **Localisation** : `src/app/layout.tsx` (métadonnées globales), `src/app/projets/[slug]/page.tsx` (`generateMetadata`).
- **Correction recommandée** : définir `metadataBase`, puis ajouter `alternates: { canonical: "/" }` dans `layout.tsx` et `alternates: { canonical: \`/projets/${slug}\` }` dans `generateMetadata`.

**H-2 — Header `X-Frame-Options` absent (clickjacking)**
- **Preuve** : `qa/Security/headers.spec.ts:15`, `response.headers()["x-frame-options"] === undefined` sur 2 runs, desktop et mobile.
- **Impact** : le site est embarquable dans une `<iframe>` tierce sans restriction (clickjacking).
- **Localisation** : `next.config.ts` (aucune fonction `headers()` définie).
- **Correction recommandée** : ajouter `headers()` renvoyant `X-Frame-Options: DENY` (ou `frame-ancestors 'none'` via CSP, cf. M-4).

### MEDIUM

**M-1 — Nav sans landmark `<nav>`**
- **Preuve** : `qa/Accessibility/axe.spec.ts` + scan axe best-practice (règle `region`) ; assertion manuelle confirmant l'absence.
- **Impact** : navigation sans landmark ARIA `navigation`, gap d'accessibilité pour les utilisateurs de technologies d'assistance.
- **Localisation** : `src/components/nav.tsx` — racine `<div>` au lieu de `<nav>`.
- **Correction recommandée** : remplacer la racine par un élément `<nav>` (ou `role="navigation"`).

**M-2 — `<footer>` perd son rôle `contentinfo`**
- **Preuve** : `qa/Accessibility/axe.spec.ts`, 0 élément avec rôle `contentinfo`.
- **Impact** : aucun landmark de pied de page exposé aux technologies d'assistance.
- **Localisation** : `src/components/footer.tsx`, imbriqué dans `<main>` dans `src/app/page.tsx` et `src/app/projets/[slug]/page.tsx` — par la spec HTML-AAM, un `<footer>` descendant de `main` perd son rôle implicite.
- **Correction recommandée** : sortir `<Footer/>` de `<main>` (frère direct dans le layout), ou lui donner `role="contentinfo"` explicite.

**M-3 — Toast de formulaire sans `aria-live`**
- **Preuve** : `qa/Accessibility/keyboard-nav.spec.ts`, conteneur toast (`div.z-50`) sans `aria-live` ni `role="status"`/`"alert"`.
- **Impact** : un utilisateur de lecteur d'écran soumettant le formulaire n'est pas informé du résultat (succès/erreur) sans re-parcourir la page.
- **Localisation** : `src/components/contact-form.tsx`.
- **Correction recommandée** : ajouter `role="status"` (succès) / `role="alert"` (erreur) ou `aria-live="polite"`/`"assertive"` selon le cas.

**M-4 — Content-Security-Policy absente**
- **Preuve** : `qa/Security/headers.spec.ts:10`, CSP absente sur 2 runs.
- **Impact** : pas de défense en profondeur contre un XSS futur. Coût de mise en place faible (aucun script/CDN tiers identifié dans `src/`).
- **Localisation** : `next.config.ts`.
- **Correction recommandée** : `default-src 'self'; script-src 'self'` (+ exceptions nonce/`unsafe-inline` si nécessaire pour les styles Next inline).

**M-5 — ContactForm sans contraintes HTML5**
- **Preuve** : `qa/Security/headers.spec.ts` (suite Security) + `qa/Functional/contact-form.spec.ts`. Champs `email` (`type="text"`) et `message` sans `required`/`maxLength`/pattern.
- **Impact** : risque XSS actuellement **faible** (pas de `dangerouslySetInnerHTML`, pas d'appel réseau, React échappe le JSX), mais deviendra réel dès qu'un backend réel sera branché sans validation serveur.
- **Localisation** : `src/components/contact-form.tsx`.
- **Correction recommandée** : `type="email"`, `required`, `maxLength` réalistes ; prévoir sanitisation/validation **serveur** avant tout branchement backend.

**M-6 — Aucune balise Open Graph / Twitter Card**
- **Preuve** : `qa/SEO/metadata.spec.ts` (`test.fixme`), `meta[property^="og:"]` → 0 élément.
- **Impact** : aucune preview lors d'un partage de lien (Slack/LinkedIn/Twitter) — impact direct sur le taux de clic pour un portfolio dont la visibilité dépend du partage.
- **Localisation** : `src/app/layout.tsx`, `src/app/projets/[slug]/page.tsx`.
- **Correction recommandée** : `src/app/opengraph-image.png` (convention Next.js) + blocs `openGraph`/`twitter` dans `metadata`/`generateMetadata` ; nécessite `metadataBase` défini au préalable (cf. L-4).

**M-7 — Domaine de production non déclaré / non vérifiable**
- **Preuve** : `src/app/robots.ts`, `src/app/sitemap.ts` (créés dans cette série de tâches) retombent sur `process.env.VERCEL_PROJECT_PRODUCTION_URL`.
- **Impact** : si cette variable n'est pas exposée au runtime réel (déploiement non-Vercel ou config différente), `sitemap.xml`/`robots.txt` généreront des URLs `localhost:3000`, invalides pour un crawler. **Non vérifiable depuis cet environnement** (pas d'accès au déploiement).
- **Localisation** : `src/app/robots.ts`, `src/app/sitemap.ts`.
- **Correction recommandée** : vérifier `/sitemap.xml` sur le domaine réel après déploiement ; à défaut, définir une variable d'env explicite (`SITE_URL`) au lieu de dépendre d'une variable auto-injectée.

**M-8 — `chrome-launcher` utilisé sans déclaration explicite en dépendance**
- **Preuve** : `npx depcheck` → `Missing dependencies: chrome-launcher`. Import direct confirmé `qa/Performance/lighthouse.run.mjs:11`.
- **Impact** : le script `test:qa:perf` fonctionne aujourd'hui uniquement parce que `lighthouse` l'entraîne en transitive ; une montée de version de `lighthouse` qui romprait cette transitive casserait le script sans avertissement.
- **Localisation** : `package.json` (devDependencies).
- **Correction recommandée** : ajouter `chrome-launcher` en devDependency explicite avec la version réellement utilisée.

**M-9 — INP non mesurable avec l'outillage actuel**
- **Preuve** : `qa/Reports/performance-2026-08-13.md`, `interaction-to-next-paint` absent des audits Lighthouse en mode navigation.
- **Impact** : le budget INP (200ms, `qa/Performance/budgets.json`) reste non vérifié — ni conforme ni non conforme.
- **Localisation** : `qa/Performance/lighthouse.run.mjs` (mode navigation uniquement).
- **Correction recommandée** : ajouter une mesure Lighthouse *user flow*/*timespan* avec interaction réelle simulée (soumission formulaire, hover carte projet), ou collecter des données de champ (Chrome UX Report) en production.

**M-10 — Coût CPU/GPU soutenu du canvas Dust non capturé par les métriques de chargement**
- **Preuve** : `qa/Reports/webgl-2026-08-13.md` — sous rendu logiciel (SwiftShader), la boucle occupe ~85% du thread principal du renderer en continu ; Lighthouse (fenêtre de trace limitée au chargement) ne le voit pas.
- **Impact** : coût potentiellement significatif sur la durée de vie de l'onglet (nature transposable : fragment shader continu ; **magnitude non transposable** : mesurée sous rendu logiciel, pas GPU réel).
- **Localisation** : `src/components/dust.tsx` (`step()`, boucle `requestAnimationFrame` sans plafond de cadence).
- **Correction recommandée** : mesurer sur GPU réel avant de trancher ; envisager un plafond de fréquence (30fps) qui diviserait le coût par 2-4 sans changement perceptible (cf. L-9).

**M-11 — Images `noiselessmind.png` livrées plus grandes qu'affichées**
- **Preuve** : `qa/Reports/performance-2026-08-13.md`, insight `image-delivery-insight` — accueil : 25.5 KB (73%) gaspillés ; fiche projet : ~60.6 KB gaspillés cumulés sur les deux variantes servies.
- **Impact** : ~12% du poids image de la fiche projet potentiellement superflu, sous l'émulation desktop 1350×940 utilisée pour la mesure.
- **Localisation** : `ProjectCard` / fiche projet — attribut `sizes` de `next/image` probablement mal calibré vs. largeur de conteneur réelle (non inspecté au-delà du signal Lighthouse).
- **Correction recommandée** : vérifier et ajuster l'attribut `sizes` des composants `next/image` concernés.

### LOW

**L-1 — `Referrer-Policy` absent**
- **Preuve** : `qa/Security/headers.spec.ts:20`. **Impact** : risque résiduel faible (pas de paramètres sensibles en URL), dépend du défaut navigateur plutôt que d'une politique affirmée. **Localisation** : `next.config.ts`. **Correction** : ajouter `Referrer-Policy: strict-origin-when-cross-origin` explicite.

**L-2 — Lien externe sans `noopener` explicite**
- **Preuve** : `qa/Security/external-links.spec.ts`, `rel="noreferrer"` seul sur le lien GitHub. **Impact** : risque déjà couvert en pratique (`noreferrer` implique `noopener` dans les navigateurs modernes), non-conformité à la bonne pratique explicite. **Localisation** : `src/components/footer.tsx:5-9`. **Correction** : `rel="noopener noreferrer"`.

**L-3 — Pas de données structurées Schema.org**
- **Preuve** : `qa/SEO/metadata.spec.ts`, 0 JSON-LD. **Impact/décision** : gain jugé faible pour ce site (une home + une fiche projet statique) ; **décision documentée de ne pas corriger**, à reconsidérer si un blog/catalogue est ajouté.

**L-4 — `metadataBase` non défini**
- **Preuve** : `src/app/layout.tsx`. **Impact** : sans effet observable aujourd'hui, mais bloquant dès l'ajout d'OG (M-6) — Next.js retomberait sur `localhost:3000` pour résoudre les URLs relatives. **Correction** : définir `metadataBase` en même temps que M-6.

**L-5 — 2 warnings ESLint (variable inutilisée)**
- **Preuve** : `qa/Performance/lighthouse.run.mjs:267,282`, `rawReportHtml` assignée jamais utilisée. **Correction** : supprimer la variable ou l'utiliser.

**L-6 — Duplication structurelle mineure entre pages**
- **Preuve** : `src/app/page.tsx:14` et `src/app/projets/[slug]/page.tsx:46`, même wrapper `Nav`/`Footer`/`main`. **Impact** : limité (1019 lignes au total, pas de logique métier dupliquée). **Correction** : extraction en `PageShell` possible, non nécessaire au fonctionnement actuel.

**L-7 — `console.error` visibles en production dans `dust.tsx`**
- **Preuve** : `src/components/dust.tsx:117,153`. **Impact** : diagnostics intentionnels (pas des logs oubliés) mais visibles en prod si le chemin d'erreur shader se déclenche. **Correction** : conditionner à `process.env.NODE_ENV !== "production"` si le bruit console est indésirable côté utilisateur final.

**L-8 — 3 devDependencies majeures en retard (dans la plage semver déclarée)**
- **Preuve** : `npm outdated` — `@types/node`, `eslint`, `typescript` en retard sur `latest` mais conformes à leur range `^`. **Impact** : aucun (majeures volontairement non suivies). **Action** : aucune dans l'immédiat.

**L-9 — Boucle Dust sans plafond de cadence**
- **Preuve** : `qa/Reports/webgl-2026-08-13.md`, `step()` sans limiteur. **Correction possible** : plafonner à 30fps (piste, pas un défaut confirmé sur GPU réel).

**L-10 — Contexte WebGL2 alloué sur mobile portrait sans jamais rendre**
- **Preuve** : `qa/Reports/webgl-2026-08-13.md`, Pixel 7 portrait, `getContext("webgl2")` appelé et réussi, 0 frame dessinée. **Impact** : chunk JS (6.25KB) et contexte GL payés pour rien sur le cas d'usage mobile majoritaire. **Correction** : différer `getContext` après la première mesure de boîte dans `src/components/dust.tsx`.

**L-11 — Aucune récupération après perte de contexte WebGL**
- **Preuve** : `qa/Reports/webgl-2026-08-13.md`, `webglcontextlost` déclenché réellement, `webglcontextrestored` jamais écouté. **Impact** : l'effet disparaît définitivement jusqu'au rechargement complet ; le site reste utilisable (aucune exception). **Localisation** : `src/components/dust.tsx`. **Correction** : écouter `webglcontextlost` (`preventDefault()` + arrêt boucle) et `webglcontextrestored` (reconstruction programme/VAO).

**L-12 — Nettoyage `useEffect` de Dust non exerçable par un test end-to-end**
- **Preuve** : `qa/Reports/webgl-2026-08-13.md` — `<Backdrop/>` monté dans le layout racine, jamais démonté en navigation client-side sur ce site. **Impact** : correction du nettoyage vérifiée par lecture de code uniquement, pas à l'exécution.

**L-13 — Feuille de style bloquant le rendu**
- **Preuve** : `qa/Reports/performance-2026-08-13.md`, `2ack4bw84e3gk.css` (7.18KB transférés) identifiée bloquante sur les 3 pages mesurées, sans retard chiffré disponible dans l'audit.

**L-14 — ~13KB de JavaScript "legacy" inutile (polyfills)**
- **Preuve** : `qa/Reports/performance-2026-08-13.md`, `legacy-javascript-insight`. **Correction possible** : ajuster la cible `browserslist`/`next.config.ts` si les navigateurs ciblés le permettent.

**L-15 — `qa/README.md` périmé**
- **Preuve** : `qa/Reports/webgl-2026-08-13.md` §AMÉLIORATION 5 — classe encore `qa/WebGL` parmi les suites "à l'état de stubs" alors qu'implémentée.

### SUGGESTION

**S-1 — Faible saillance visuelle de l'anneau de focus sur `Button` primaire**
- **Preuve** : `qa/Reports/focus-ring-verification-2026-08-13.md` — l'anneau (`rgba(178,227,42,.45)`) est techniquement rendu à 100% après la transition CSS de 150ms, mais visuellement peu contrasté car proche de la couleur de fond du bouton (`bg-accent`, même lime). Pas un défaut d'implémentation du focus, une observation de design.

**S-2 — Taille du `Tag` incohérente entre la grille projets et la page détail**
- **Preuve** : `qa/Reports/visual-2026-08-13.md` §3.2 — `size="sm"` sur `ProjectCard` (`src/components/project-card.tsx:52`) vs. défaut `"md"` sur la page détail (`src/app/projets/[slug]/page.tsx:67-69`), sans justification apparente.

**S-3 — « À propos » dans la nav a l'apparence d'un lien mais n'en est pas un**
- **Preuve** : `qa/Reports/visual-2026-08-13.md` §3.3 et `qa/Reports/accessibility-2026-08-13.md` — `src/components/nav.tsx:21-23`, `<span>` sans `href`/`onClick`, partage le style hover des vrais liens. Non atteignable au clavier (donc pas un piège), mais affordance visuelle trompeuse pour un utilisateur souris — la section `#about` ciblée n'a d'ailleurs pas d'`id` aujourd'hui.

**S-4 — ~29KB (40%) de JS non exécuté dans le chunk framework**
- **Preuve** : `qa/Reports/performance-2026-08-13.md` — attendu pour un chunk partagé (React DOM/`createRoot`), pas un signe de sur-fetch applicatif. Informationnel.

**S-5 — TTFB (3-7ms) non représentatif de la production**
- **Preuve** : `qa/Reports/performance-2026-08-13.md` — mesuré en localhost sans latence réseau réelle ni CDN/edge (le site est déployé sur Vercel). Ne pas utiliser comme référence de budget TTFB prod.

## 4. Screenshots et preuves visuelles

Toutes les preuves visuelles restent en local (`qa/Reports/`, gitignoré) et ne
sont pas copiées dans ce rapport — chemins référencés pour consultation
directe :

- `qa/Reports/Responsive/*.png` — 27 captures pleine page (une par page/viewport), profil `mobile-chromium` (voir limite de comparaison documentée dans `responsive-2026-08-13.md` §"Note sur les screenshots produits").
- `qa/Visual/*.spec.ts-snapshots/` — 12 baselines × 2 projects = 20 PNG versés en dépôt (baselines Visual, régénérées le 2026-08-13 après correction du bug WebGL, cf. §2 WebGL).
- `qa/Reports/WebGL/run1/`, `qa/Reports/WebGL/run2/` — captures et JSON de preuve (animation, resize, fallback, session prolongée).
- `qa/Reports/FocusRing/*.png` — 18 captures de la vérification contradictoire sur l'anneau de focus.
- `qa/Reports/html/` — rapport HTML Playwright du dernier run exécuté (WebGL au moment de la rédaction, cf. effet de bord documenté dans `webgl-2026-08-13.md`).
- `qa/Reports/performance/*.json` — rapports Lighthouse bruts (2 runs × 3 pages).

## 5. Recommandations (priorisées)

1. **Avant tout partage public du lien** : corriger H-1 (canonical) et M-6 (Open Graph) — impact direct sur l'indexation et le taux de clic au partage.
2. **Avant tout ajout d'un vrai backend au formulaire de contact** : traiter M-5 (contraintes HTML5 + validation serveur) — le risque XSS documenté devient réel à ce moment-là, pas avant.
3. **Défense en profondeur peu coûteuse** : H-2 (`X-Frame-Options`) et M-4 (CSP) — aucun script tiers identifié, coût de mise en place faible.
4. **Accessibilité** : M-1/M-2/M-3 (landmark nav, contentinfo footer, aria-live toast) — 3 correctifs ciblés, faible surface de code (`nav.tsx`, `footer.tsx`, `contact-form.tsx`).
5. **Hygiène dépendances** : M-8 (`chrome-launcher` explicite) — trivial, évite une rupture silencieuse future.
6. **Avant déploiement effectif** : vérifier M-7 (domaine sitemap/robots) sur l'URL de production réelle.
7. **Non urgent, à surveiller** : coût CPU soutenu de Dust (M-10) — nécessite une mesure GPU réel avant toute décision (plafond de cadence, etc.).
8. **Design, non bloquant** : S-1/S-2/S-3 — cohérence visuelle et affordances, à arbitrer avec la personne en charge du design.

## 6. Tests non réalisés

Explicitement documentés comme non couverts par les rapports sources (aucun
n'est présenté comme "passé" par défaut) :

- **Lecture effective au lecteur d'écran** (NVDA/JAWS/VoiceOver) — axe ne couvre qu'un sous-ensemble estimé à 30-40% des critères WCAG (`accessibility-2026-08-13.md`).
- **Navigation au switch/commutateur**, qualité d'expérience de zoom/reflow à 400% — non automatisés.
- **INP (Interaction to Next Paint)** — non mesurable en mode navigation Lighthouse (M-9) ; nécessiterait un *user flow* Lighthouse ou des données de champ CUX en production.
- **Mesure du coût CPU/GPU soutenu de Dust sur GPU réel** — toutes les mesures WebGL ont été prises sous rendu logiciel (SwiftShader) ; magnitude non transposable à un déploiement réel.
- **Comportement réel en onglet caché prolongé** (throttling rAF natif du navigateur) — simulé via redéfinition de `document.hidden`, pas produit nativement par Chromium headless.
- **Destruction du renderer WebGL au démontage** (`useEffect` cleanup) — non exerçable par un test end-to-end sur ce site, le composant n'étant jamais démonté (monté dans le layout racine) ; vérifié par lecture de code uniquement.
- **HTTPS forcé en production** — vérifié par documentation de la plateforme Vercel (comportement par défaut), pas par une requête réelle contre le déploiement.
- **Contenu de `.env.local`** — accès refusé par le sandbox de l'agent Security ; seule sa non-présence dans Git a été vérifiée.
- **Domaine de production réel pour sitemap/robots** (M-7) — non vérifiable depuis cet environnement local, pas d'accès au déploiement Vercel.
- **Mesure mobile Lighthouse** (throttling CPU/réseau par défaut) — seule l'émulation desktop non throttlée a été mesurée ; hypothèse non vérifiée contre l'audience réelle du site.
- **Contraste sur états hover/focus/disabled et sur fond WebGL variable dans le temps** — la règle `color-contrast` d'axe ne couvre que le DOM rendu au moment du scan.
- **Test unitaire au sens strict** — aucun script `test` n'existe dans `package.json` ; seules les suites Playwright `qa/` (E2E/QA) sont en place.

---

*Rapport agrégé à partir de `qa/Reports/functional-2026-08-12.md`,
`responsive-2026-08-13.md`, `visual-2026-08-13.md`,
`webgl-fix-visual-responsive-addendum-2026-08-13.md`,
`webgl-visual-baselines-regen-2026-08-13.md`,
`accessibility-2026-08-13.md`, `focus-ring-verification-2026-08-13.md`,
`performance-2026-08-13.md`, `webgl-2026-08-13.md`, `seo-audit-2026-08-13.md`,
`security-2026-08-13.md`, `code-quality-2026-08-13.md`. Ces fichiers sources
font foi en cas de divergence avec cette synthèse.*

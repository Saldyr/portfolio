# qa/ — suite de tests Portfolio Saldyr

Voir `Portfolio_QA/QA_PLAN.md` à la racine du projet pour le plan complet
(architecture, dépendances, risques identifiés).

Les suites tournent contre un build de production (`next build && next
start -p 3100`), démarré automatiquement par Playwright (`webServer` dans
`qa/playwright.config.ts`).

## Commandes

| Commande | Suite |
|---|---|
| `npm run test:qa` | Toutes les suites |
| `npm run test:qa:ui` | Mode UI Playwright |
| `npm run test:qa:functional` | `qa/Functional` |
| `npm run test:qa:visual` | `qa/Visual` |
| `npm run test:qa:visual:update` | `qa/Visual`, met à jour les baselines |
| `npm run test:qa:responsive` | `qa/Responsive` |
| `npm run test:qa:a11y` | `qa/Accessibility` |
| `npm run test:qa:seo` | `qa/SEO` |
| `npm run test:qa:security` | `qa/Security` |
| `npm run test:qa:webgl` | `qa/WebGL` |
| `npm run test:qa:perf` | `qa/Performance/lighthouse.run.mjs` (nécessite `lighthouse`, non installé) |
| `npm run test:qa:report` | Ouvre le dernier rapport HTML (`qa/Reports/html`) |
| `npm run test:qa:install` | Installe les binaires navigateur Playwright (Chromium) |

## Parallélisation (workers)

`qa/playwright.config.ts` fixe `workers: 2`. Fait vérifié sur cette machine :
avec la parallélisation par défaut (6 workers, un par cœur détecté), la
suite `qa/Functional` échoue de façon instable (31 à 35/36 selon les runs,
`exit code 1`), avec des crashs de session Chromium par saturation CPU
(`Runtime.callFunctionOn: session closed`) — jamais un échec d'assertion
applicative.

Valeurs testées :

- `--workers=1` : aucun crash sur plusieurs runs consécutifs.
- `--workers=2` : retenu — **0 crash de session Chromium sur 6 runs
  consécutifs** (`qa/Functional`, build de production). C'est la valeur la
  plus élevée testée qui reste stable sur cette machine.

Note distincte, sans rapport avec le nombre de workers : sur 4 des 6 runs à
`workers: 2` (et de façon reproductible aussi à `workers: 1`), le test
`contact-form.spec.ts:61` (« aucun appel réseau ») échoue à cause de
requêtes de prefetch RSC (`?_rsc=...`) déclenchées par le prefetch par
défaut des `<Link>` Next.js visibles à l'écran — sans rapport avec la
soumission du formulaire. C'est un défaut préexistant du test lui-même, pas
une instabilité liée à la parallélisation ; correction hors périmètre de
cette tâche (qui ne modifie que `qa/playwright.config.ts` et ce README).

## État actuel

Implémentées : `qa/Accessibility`, `qa/Functional`, `qa/Responsive`,
`qa/Visual`.

Encore à l'état de stubs (`test.fixme`) : `qa/SEO`, `qa/Security`,
`qa/WebGL` (voir QA_PLAN.md section 7 pour le périmètre restant).

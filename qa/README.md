# qa/ — suite de tests Portfolio Saldyr

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
| `npm run test:qa:perf` | `qa/Performance/lighthouse.run.mjs` (`lighthouse` en devDependency) |
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

## État actuel

Implémentées : `qa/Accessibility`, `qa/Functional`, `qa/Responsive`,
`qa/Visual`, `qa/WebGL`, `qa/SEO` (15 tests), `qa/Security` (5 tests).

Un seul test reste en stub (`test.fixme`) : le contrôle de canonical
par page dans `qa/SEO/metadata.spec.ts`.

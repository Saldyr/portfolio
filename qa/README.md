# qa/ — suite de tests Portfolio

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

## Code de sortie

`npm run qa` sort en **code non nul dès qu'une étape échoue** : build,
démarrage du serveur, suites Playwright ou audit Lighthouse. Il est donc
utilisable tel quel comme gate.

Un script ou une habitude qui se fierait à un `npm run qa` toujours vert doit
être revu.

Une étape rouge n'interrompt pas le run : Lighthouse tourne même si Playwright a
échoué, pour que `qa/Reports/` reste complet. Seul le code de sortie final
tranche.

## Port du serveur de test (`QA_PORT`)

La suite démarre un build de production sur le port **3100** par défaut.

Ce port est surchargeable par la variable d'environnement `QA_PORT` :

```bash
QA_PORT=3111 npm run qa
```

**Le piège qu'il évite.** `qa/playwright.config.ts` active
`reuseExistingServer`, et `qa/run-all.mjs` réutilise lui aussi un serveur déjà
présent. Un `next start` resté orphelin sur le port par défaut est donc adopté
tel quel — et la suite testerait **le build qu'il sert, pas celui qui vient
d'être construit** : en-têtes, HTML prérendu et code serveur sont figés au
démarrage du serveur.

**Ce cas n'est plus silencieux.** Le `globalSetup`
`qa/support/assert-fresh-server.ts` compare le build servi à `.next/BUILD_ID` et
fait échouer le run avant le premier test, en indiquant le build servi, le build
local et la marche à suivre. Pour passer outre malgré tout :
`QA_ALLOW_STALE_SERVER=1` — le résultat n'engage alors rien.

Ce que la garde couvre, et rien de plus : **« ce qui est testé == ce qu'il y a
dans `.next/` »**. Elle ne compare pas `.next/` aux sources ; quand un serveur
est réutilisé, `npm run test:qa:*` ne rebuild pas, donc un `.next/` lui-même
périmé vis-à-vis des sources passerait vert. `npm run qa` n'a pas ce trou :
`qa/run-all.mjs` build systématiquement avant de servir.

`npm run test:qa:perf` (`qa/Performance/lighthouse.run.mjs`) ne passe pas par
Playwright, donc pas par le `globalSetup` ci-dessus — il porte donc sa propre
copie de cette garde (mêmes deux signaux, même code de
sortie 1) : elle échoue de la même façon dès que le serveur écouté sur le
port ne sert pas le build présent dans `.next/`, y compris quand ce serveur a
été laissé en place puis reconstruit sans redémarrage. Voir
qa/Performance/lighthouse.run.mjs:28-35 pour pourquoi cette copie n'est pas un
import du globalSetup.

**Poser `QA_PORT` pour les trois points d'entrée**, qui lisent la variable
séparément : `npm run qa` (`qa/run-all.mjs`), `npm run test:qa*`
(`qa/qa.config.ts`) et `npm run test:qa:perf`
(`qa/Performance/lighthouse.run.mjs`). N'en surcharger qu'un seul laisse le
serveur périmé en travers du chemin.

Une valeur non entière ou hors de la plage 1-65535 fait échouer le run
immédiatement, plutôt que de retomber silencieusement sur le port 0
(`qa/qa.config.ts`).

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
`qa/Visual`, `qa/WebGL`, `qa/SEO` (15 tests), `qa/Security` (6 tests).

Un seul test reste en stub (`test.fixme`) : le contrôle de canonical
par page dans `qa/SEO/metadata.spec.ts`.

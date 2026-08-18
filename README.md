# Portfolio Saldyr

Portfolio personnel — présentation, projets et formulaire de contact.

## Stack

- [Next.js](https://nextjs.org) (App Router, `src/app/`) + TypeScript
- Tailwind CSS
- Polices [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) et
  [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (`next/font/google`)
- Envoi du formulaire de contact via [Resend](https://resend.com)
- Suite QA Playwright (`qa/`) — fonctionnel, visuel, responsive, a11y, SEO, sécurité, WebGL,
  performance (Lighthouse)

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

Créer un fichier `.env.local` à la racine avec :

| Variable          | Description                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`  | Clé API [Resend](https://resend.com), requise par le formulaire de contact (`src/app/contact/actions.ts`) |

En build Vercel (`VERCEL_ENV` = `production` ou `preview`), `next.config.ts`
échoue le build si une de ces variables est absente ou vide, en nommant la
variable manquante — pour éviter qu'une fonctionnalité comme le formulaire de
contact parte en prod silencieusement inopérante. Cette garde est inactive en
local et pour `npm run qa`, qui vide volontairement `RESEND_API_KEY`
(`qa/playwright.config.ts`).

Pour ajouter une variable requise : l'ajouter au tableau ci-dessus et à
`REQUIRED_ENV_VARS` dans `next.config.ts`.

## QA

```bash
npm run qa
```

Lance l'ensemble de la suite (build de prod, Playwright, Lighthouse). Voir [qa/README.md](qa/README.md)
pour le détail des commandes par suite.

## Démo

[portfolio-saldyr.vercel.app](https://portfolio-saldyr.vercel.app/)

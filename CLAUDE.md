# CLAUDE.md

Plateforme vitrine + réservation pour indépendants (coiffeur, garage…), vendue en trois formules : **Standard**, **Premium**, **Diamant**. Chaque formule a sa démo complète (site public, espace client, dashboard pro) et une page commerciale les présente. Le propriétaire communique en français : code commenté, commits et textes en français.

## Stack

Astro 7 (`output: 'server'`) + îlots React 19, Tailwind 4 (`@tailwindcss/vite`), composants shadcn/base-ui, Supabase (Auth + Postgres), déploiement Cloudflare Workers (`@astrojs/cloudflare`, `wrangler.jsonc`).

## Commandes

```bash
npm ci                 # installer
npm run dev            # serveur local (astro dev)
npm run build          # build de production : à faire passer avant chaque push
npm run preview        # servir le build
npm run generate-types # wrangler types
```

Pas de lint ni de tests automatisés : `npm run build` est la seule vérification. Copier `.env.example` en `.env` pour le dev local.

## Structure

- `src/pages/` : page commerciale (`index.astro`, `devis.astro`, `contact.astro`, `notre-histoire.astro`, `galerie/<démo>`, pages légales, auth), démos dans `demo-standard/`, `demo-premium/`, `demo-diamant/` (site + `dashboard/` + `espace-client/`), routes serveur dans `api/` (`send-email.ts`, `calendar.ts`).
- `src/components/<commercial|standard|premium|diamant>/` : chaque démo a **ses propres copies** (préfixe `Standard…`, `Premium…`, `Diamant…`) de l'en-tête, `auth/`, `dashboard/`, `client/`, `ui/`. Seul `shared/` est commun. Modifier une démo ne doit pas toucher les autres.
- `src/layouts/<démo>/` et `src/styles/<démo>.css` : un layout et un CSS par démo, tous basés sur `base.css`. Chaque CSS déclare ses `@source` : une classe Tailwind n'existe que si elle apparaît dans les dossiers de sa démo.
- `src/lib/` : logique métier commune (requêtes Supabase `queries.ts`, créneaux `slots.ts`, fidélité `loyalty.ts`, rôles `permissions.ts`, bannissement `ban.ts`, montants `money.ts`, `limits.ts`, devis `devis.ts`). `src/lib/server/` : code serveur uniquement.
- `src/config/site.ts` : contenus de la vitrine. `src/data/devis.json` : source unique des prix.
- `supabase/schema.sql` (schéma initial), `supabase/migrations/` (à appliquer à la main dans le SQL Editor Supabase, il n'y a pas de CLI Supabase configurée), `supabase/seed/`.
- `Documentation/` : `architecture_par_demo.md` détaille l'organisation par démo, à lire avant un gros changement. `Documentation/old/` est obsolète.

## Règles établies

- **Emails : EmailJS, jamais Resend.** Formulaires de contact côté navigateur ; `/api/send-email` appelle l'API REST EmailJS avec `EMAILJS_TEMPLATE_ID` / `EMAILJS_PRIVATE_KEY`.
- **Secrets serveur : `getServerEnv('NOM')`** (`src/lib/server/env.ts`). Sur Cloudflare, les secrets ne sont pas dans `import.meta.env` ; seules les variables `PUBLIC_*` s'y lisent.
- **Prix : uniquement dans `src/data/devis.json`**, jamais en dur dans un composant.
- **Ton commercial sobre** : pas de badges ni de mentions « IA », pas de superlatifs.
- **Profils d'équipe** (`components/commercial/equipe.ts`) : aucune mention de statut étudiant.
- Pousser directement sur `main` après un `npm run build` réussi, sauf demande contraire.

## Pièges connus

- **Multi-démo dans une seule base** : les tables portent une colonne `tag_bd` (`standard` / `premium` / `diamant`). `getDemoTag()` la déduit de l'URL `/demo-<x>` et retombe sur `'diamant'` par défaut : toute nouvelle requête doit filtrer sur `tag_bd`.
- **Rôles Admin / Employé / Démo** : uniquement dans Diamant, stockés en `localStorage` (`pro_active_role`), pas en base. Le rôle Démo est en lecture seule (`isRoleReadOnly`).
- Clés `localStorage` et événements `window` de Standard et Premium préfixés par la démo (`standard_…`, `premium_…`) : garder ce préfixe.
- **Diamant, échelle `deep-teal` inversée** dans `diamant.css` (100 = foncé, 900 = clair, pas de 50) : dans le dashboard, préférer les jetons sémantiques (`bg-secondary`, `text-primary`, `border-border`).
- Les migrations récentes (`0010`, `0011`) doivent être appliquées sur Supabase, sinon le code utilise un repli.
- Performance : le site tourne sur des machines modestes. Éviter d'ajouter des animations lourdes (framer-motion, AOS, WebGL/3D) ou de grosses dépendances client ; préférer `client:visible` ou `client:idle` à `client:load` quand l’îlot n’est pas visible au chargement.
- `components.json` pointe vers `src/styles/global.css`, qui n'existe pas : ajuster le chemin avant un `npx shadcn add`.
- Scripts racine `seed_loyalty.js` (importe `dotenv`, absent des dépendances) et `update_images.js` : utilitaires ponctuels qui lisent `.env`.
- Ne jamais commiter `.env`, `.dev.vars` ni de fichier d'identifiants (OAuth Google, compte de service).

# Architecture par démo

Chaque démo (Standard, Premium, Diamant) et la page commerciale ont leurs propres fichiers de style, layouts et composants. Modifier l'un ne change pas les autres.

## Styles (`src/styles/`)

| Fichier | Utilisé par | Contenu |
| --- | --- | --- |
| `base.css` | importé par les quatre fichiers ci-dessous | Tailwind, jetons shadcn (couleurs sémantiques, rayons), thème clair/sombre, reset |
| `commercial.css` | page commerciale + galerie | polices Coolvetica / Cocogoose, palette galerie, `.commercial-page` |
| `standard.css` | démo Standard | palette bleu/rouge, `.theme-standard` |
| `premium.css` | démo Premium | police Coolvetica, `.theme-premium` (rouge course) |
| `diamant.css` | démo Diamant (site, espace pro, espace client) | polices Monimer Serif / Coolvetica, palette pêche, `.theme-diamant`, `.dashboard-diamant`, animations `section-fade` / `card-hover` |

Chaque fichier déclare ses `@source` : Tailwind ne génère que les classes présentes dans les dossiers de la démo (plus `src/components/shared`, `src/lib`, `src/config`). Une classe utilisée dans une démo n'apparaît donc jamais dans le CSS d'une autre.

## Layouts (`src/layouts/<démo>/`)

- `commercial/CommercialLayout.astro`
- `standard/StandardLayout.astro`, `standard/StandardDashboardLayout.astro`
- `premium/PremiumLayout.astro`, `premium/PremiumDashboardLayout.astro`
- `diamant/DiamantLayout.astro`, `diamant/DiamantDashboardLayout.astro`

Chaque layout importe uniquement le CSS de sa démo.

## Composants (`src/components/<démo>/`)

Chaque démo possède ses copies des composants : en-tête/pied de page, formulaires d'authentification (`auth/`), panneaux du dashboard pro (`dashboard/`), espace client (`client/`), formulaire de réservation, carte, sélecteurs (`ui/`).

Préfixe de fichier : `Standard…`, `Premium…`, `Diamant…`. `commercial/auth/` contient le retour OAuth de la page `/connexion`.

Seul `src/components/shared/SmoothScroll.astro` (défilement Lenis, sans style) est commun.

## Données et état partagés

La logique métier reste commune (`src/lib`, `src/config`) : requêtes Supabase, créneaux, fidélité. Les clés `localStorage` et événements `window` des composants Standard et Premium sont préfixés par leur démo (`standard_…`, `premium_…`). Les rôles Admin / Employé / Démo n'existent que dans la démo Diamant.

## Longueur maximale des noms

`MAX_NAME_LENGTH = 60` (`src/lib/limits.ts`) : `maxLength` sur les champs, validation zod (inscription, réservation), `clampName` dans les requêtes, et migration `supabase/migrations/0010_name_max_length.sql` qui tronque côté base. À appliquer sur Supabase.

## Ajouter une démo

1. Créer `src/styles/<démo>.css` (importer `base.css`, déclarer ses `@source`).
2. Créer les layouts et composants dans `src/layouts/<démo>/` et `src/components/<démo>/`.
3. Les pages vont dans `src/pages/demo-<démo>/` et n'importent que ces dossiers.

# Récap projet — à donner à Copilot en début de nouvelle session (PC perso)

Colle ce fichier (ou son contenu) dans une nouvelle conversation Copilot sur ton PC perso pour reprendre exactement où ça s'est arrêté.

---

## Contexte projet

Plateforme vitrine + réservation en ligne (template générique multi-métiers : coiffeur, fleuriste, coach, institut de beauté...).

**Stack retenue** : Astro (vitrine) + Next.js (dashboard/espace pro et client) + Tailwind CSS + shadcn/ui + Supabase (BDD + Auth) + Cloudflare Pages/Workers (hébergement), avec en parallèle une version alternative sans BDD basée sur Google Calendar API.

Documents de référence dans `projet perso/` :
- `plan_dev_projet.md` — roadmap complète (Phases 0 à 9)
- `phase1_cadrage.md` — cadrage fait (pages, charte graphique, wireframe, visuels)
- `langage_biblioteques.md` — recommandations de librairies front-end
- `solutions.md` — comparatif des 2 architectures (Version 1 BDD vs Version 2 Google Calendar)

## Comptes créés

- **GitHub hébergement** (différent du compte GitHub connecté à Copilot) : `saber-abd`, email `fatima.72@hotmail.it`
- **Repo GitHub** : public, créé et déjà poussé → https://github.com/saber-abd/reservation-platform
- **Cloudflare** : compte créé, projet Workers "reservation-platform" connecté au repo GitHub → déployé en Phase 7 (voir section dédiée plus bas). URL de prod : https://reservation-platform.demonstration-pro.workers.dev (sous-domaine de compte renommé de `fatima-72` vers `demonstration-pro` pour une URL plus neutre)
- **Supabase** : compte créé, projet configuré en Phase 3 → id `rmhsnuvrwdmiolrhahrp`, région `eu-west-1`, URL `https://rmhsnuvrwdmiolrhahrp.supabase.co`
- **Google Cloud Platform** : compte créé, Cloud Shell activé (pas utilisé pour l'instant) → utilisé en Phase 6 (API Google Calendar)

⚠️ **Sécurité** : ne jamais partager de token/PAT/mot de passe dans le chat Copilot. Toute authentification Git doit passer par Git Credential Manager (popup navigateur) ou saisie directe par toi-même dans le terminal.

## Où en est le code (fait sur le PC d'entreprise)

- Node.js v24.18.0 (LTS) + npm 11.16.0 installés et fonctionnels
- Git 2.52.0 installé
- Projet initialisé dans `C:\Dev\reservation-platform` (hors OneDrive, volontairement, pour éviter les ralentissements de sync sur `node_modules`)
- Git initialisé, `.gitignore` créé (`node_modules/`, `dist/`, `.env`, `.astro/`)
- Premier commit fait et **poussé avec succès** sur `main` → `github.com/saber-abd/reservation-platform`

### ⚠️ Point d'attention technique (résolu sur PC perso)
Le scaffold Astro initial avait été fait "à la main" (contournement) car le PC d'entreprise a des **restrictions GPO/AppLocker** qui bloquent l'exécution de `npx` et des scripts `.cmd`/`.ps1` depuis le cache npm. Résultat à l'époque :
- `package.json` générique (`"type": "commonjs"`, pas de scripts `dev`/`build`/`preview`) au lieu d'un vrai package.json généré par `create-astro`.
- Seuls `astro.config.mjs` et `src/pages/index.astro` existaient, structure minimale.

Ce point est maintenant corrigé (voir section suivante).

## Où en est le code (fait sur le PC perso — session du 2026-07-18)

Repo cloné dans `C:\Users\cash31\Desktop\reservation-platform\reservation-platform` (aucune restriction GPO rencontrée, `npx` fonctionne normalement).

Étapes réalisées :
1. **`package.json` corrigé à la main** : passage à `"type": "module"`, ajout des scripts `dev`/`start`/`build`/`preview`/`astro`.
2. `npm install` — scaffold validé, 0 vulnérabilité.
3. **Tailwind CSS** ajouté via `npx astro add tailwind` (intégration officielle, `@tailwindcss/vite`, génère `src/styles/global.css`).
4. **React** ajouté via `npx astro add react` (`@astrojs/react`, met à jour `tsconfig.json` avec `jsx: react-jsx`).
5. **shadcn/ui** initialisé via `npx shadcn@latest init` :
   - Choix : librairie **Base UI** (recommandé), preset **Nova** (Lucide / Geist).
   - Ajout de l'alias `@/*` → `./src/*` dans `tsconfig.json` (`baseUrl` + `paths`), requis par shadcn.
   - Fichiers créés : `components.json`, `src/components/ui/button.tsx`, `src/lib/utils.ts` ; `src/styles/global.css` mis à jour avec les variables de thème shadcn.
6. Création de `src/layouts/Layout.astro` (importe `../styles/global.css`) et mise à jour de `src/pages/index.astro` pour utiliser ce layout + un composant `Button` shadcn (validation de la chaîne complète Astro/Tailwind/React/shadcn).
7. `npm run build` : ✅ build réussi sans erreur.
8. Commit + push effectués sur `main` → `github.com/saber-abd/reservation-platform` (commit `7bd6ecf`).

**Le scaffold est maintenant propre et 100% fonctionnel.** Plus besoin de comparer avec un `create-astro` généré ailleurs.

## Prochaines étapes (Phase 2)

1. ~~Cloner le repo sur le PC perso~~ ✅ fait
2. ~~Corriger/régénérer le `package.json` et la structure Astro~~ ✅ fait
3. ~~`npx astro add tailwind`~~ ✅ fait
4. ~~`npx astro add react`~~ ✅ fait
5. ~~Initialiser shadcn/ui~~ ✅ fait
6. ~~Commit + push~~ ✅ fait
7. Connecter le repo à Cloudflare Pages (build automatique à chaque push) — **toujours à faire, pas bloquant**

## Phase 3 — Supabase (fait — session du 2026-07-18)

- Projet Supabase créé : id `rmhsnuvrwdmiolrhahrp`, région `eu-west-1`.
- Schéma SQL écrit dans `supabase/schema.sql` : tables `professionals`, `services`, `availabilities`, `clients`, `appointments` + toutes les Row Level Security policies (lecture publique pour la vitrine, écriture réservée au propriétaire via `auth.uid()`).
- Schéma exécuté avec succès dans le SQL Editor Supabase (vérifié via Table Editor).
- `@supabase/supabase-js` installé, client créé dans `src/lib/supabase.ts` (utilise `import.meta.env.PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`, typés dans `src/env.d.ts`).
- `.env` créé en local avec les vraies clés (ignoré par Git) ; `.env.example` versionné comme template.
- Connexion testée avec succès via un script Node temporaire (table `professionals` accessible, 0 ligne — normal, base vierge).
- Commit + push effectués sur `main` (commit `37d17a0`).

⚠️ Clé utilisée : la clé **`anon`/`public`** uniquement (jamais la `service_role`, qui reste secrète et ne doit jamais être partagée dans le chat ni committée).

## Prochaine étape en cours : activation de l'authentification Supabase

Objectif Phase 3 (suite) : activer et configurer l'auth (email/mot de passe) pour l'espace professionnel, avec policies RLS déjà prêtes à s'appuyer sur `auth.uid()`.

**Fait (session du 2026-07-18)** :
- Provider **Email** activé (par défaut) dans Authentication > Sign In / Providers.
- Option **Confirm email** désactivée (pratique pour le dev local ; ⚠️ à réactiver avant la mise en prod réelle).
- **Site URL** réglé sur `http://localhost:4321` (Authentication > URL Configuration).
- Helper `src/lib/auth.ts` créé : `signUp`, `signIn`, `signOut`, `getSession`, `getUser`.
- Testé avec succès via script temporaire (signUp + signIn immédiats, sans confirmation email).

## Phase 4 — Site vitrine (fait — session du 2026-07-18)

- Contenu centralisé dans `src/config/site.ts` (jamais codé en dur dans les composants, conformément au cadrage) : démo thème **coiffeur** ("Salon Éclat") avec textes, services, avis clients, horaires.
- Composants partagés créés : `src/components/Header.astro` (nav sticky + CTA "Réserver") et `src/components/Footer.astro` (contact + horaires), tous deux importés dans `src/layouts/Layout.astro`.
- Pages créées, toutes accessibles via le menu du Header :
  - `/` (`src/pages/index.astro`) — Hero, aperçu services, à propos résumé, avis clients, CTA final
  - `/services` (`src/pages/services.astro`) — liste complète des prestations
  - `/a-propos` (`src/pages/a-propos.astro`)
  - `/contact` (`src/pages/contact.astro`) — coordonnées + formulaire (visuel, pas encore branché à un backend)
- Build (`npm run build`) validé sans erreur, rendu vérifié visuellement (navigateur intégré Copilot).
- Commit + push effectués sur `main` (commit `99bb22f`).

⚠️ Rappel navigation : le site a plusieurs pages, accessibles via les liens du Header (`Accueil`, `Services`, `À propos`, `Contact`) — voir section "Comment naviguer" plus bas si une seule page semble visible.

## Phase 5 — Réservation publique + espace pro (fait — session du 2026-07-19)

Tout fait d'un coup (formulaire de réservation + dashboard complet), comme demandé.

- Packages ajoutés : `react-hook-form`, `zod`, `@hookform/resolvers` (validation de formulaires).
- **`src/lib/queries.ts`** : toutes les fonctions d'accès aux données Supabase (professionals, services, availabilities, appointments — lecture et écriture).
- **`src/lib/useAuthedProfessional.ts`** : hook React qui vérifie la session (sinon redirige vers `/connexion`) et charge le professionnel lié au compte (sinon redirige vers `/inscription`). Utilisé par toutes les pages du dashboard.
- **Réservation publique** : `/reservation` → composant `ReservationForm.tsx` (3 étapes : choix prestation → choix créneau → coordonnées client), insère dans `appointments`.
- **Authentification pro** : `/inscription` (création de compte + fiche `professionals`) et `/connexion` (`LoginForm.tsx`/`SignupForm.tsx`).
- **Dashboard pro**, protégé par `useAuthedProfessional` :
  - `/dashboard` — liste des rendez-vous, bouton "Annuler"
  - `/dashboard/services` — CRUD des prestations (ajout, activer/désactiver, suppression)
  - `/dashboard/disponibilites` — CRUD des créneaux (ajout, suppression si non réservé)
  - `/dashboard/profil` — édition des infos du professionnel
- **Header.astro** : ajout d'un lien "Espace professionnel" → `/connexion`.
- ⚠️ **Migration SQL à exécuter dans Supabase** : `supabase/migrations/0002_booking_trigger.sql` (même procédure que `schema.sql` en Phase 3 : SQL Editor → New query → coller → Run). Ce trigger empêche le double-booking en marquant automatiquement un créneau `is_booked = true` de façon atomique à la création d'un rendez-vous. **Tant que cette migration n'est pas exécutée, un même créneau peut être réservé plusieurs fois** (vérifié pendant les tests : le créneau restait affiché "Libre" après une réservation réussie).
- Test end-to-end validé dans le navigateur : inscription pro → ajout service → ajout créneau → réservation publique → apparition du RDV dans le dashboard (statut "Confirmé") → modification du profil. Tout fonctionne.
- Build (`npm run build`) validé, aucune erreur TypeScript/Astro.
- Commit + push effectués sur `main` (commit `e36ad76`).
- Migration SQL `0002_booking_trigger.sql` exécutée avec succès dans Supabase (session du 2026-07-19, après la Phase 7) — le trigger anti-double-booking est bien actif.

## Phase 7 — Déploiement Cloudflare (fait — session du 2026-07-19)

Choix fait : connexion du repo GitHub à Cloudflare via le **Dashboard** (build automatique à chaque push), plutôt que Wrangler CLI en local.

⚠️ Point important découvert pendant cette phase : Cloudflare a fusionné son ancien produit "Pages" dans **Workers** (nouvelle interface unifiée). Le projet a donc été créé comme un **Worker avec assets statiques**, pas comme une "Page" classique.

- **Build command** : `npm run build` (output `dist/`)
- **Deploy command** : `npx wrangler deploy` (généré automatiquement par Cloudflare)
- **Variables d'environnement** : à renseigner dans l'onglet **Build** (pas "Runtime"/"Variables and secrets", qui ne sert qu'à l'exécution du Worker) : `PUBLIC_SUPABASE_URL` et `PUBLIC_SUPABASE_ANON_KEY`, mêmes valeurs que le `.env` local. Sans ça, `astro build` plante (les variables sont injectées en dur dans le JS au moment du build, pas à l'exécution).
- **Adaptateur Cloudflare requis** : `npx astro add cloudflare` exécuté en local pour installer `@astrojs/cloudflare` + générer `wrangler.jsonc` (config committée dans le repo). Sans ce fichier déjà présent, la première tentative de déploiement automatique (`npx wrangler deploy` scaffoldant tout à la volée en mode non-interactif) échouait avec une erreur `Missing file or directory: public/.assetsignore`.
- `.gitignore` mis à jour pour exclure `.wrangler/` (cache local de build, ne doit jamais être commité).
- Build reste en mode `output: "static"` (aucune fonctionnalité serveur nécessaire, tout le fetching de données passe par Supabase JS côté client) — l'adaptateur Cloudflare sert uniquement à générer la config de déploiement Workers/assets.
- Commits : `aafd7e8` (config Cloudflare/wrangler.jsonc), `b85ae34` (nom final du Worker après renommage du sous-domaine).
- **URL de production** : https://reservation-platform.demonstration-pro.workers.dev (sous-domaine de compte Cloudflare renommé de `fatima-72` vers `demonstration-pro` pour une URL plus neutre/pro — modifiable dans Workers & Pages → paramètres du compte).
- Supabase Auth reconfiguré : Site URL + Redirect URLs mis à jour avec l'URL de prod finale (en plus de `http://localhost:4321` gardé pour le dev local).
- Testé en production dans le navigateur : site vitrine ✅, réservation publique (données Supabase live) ✅, connexion pro → dashboard (RDV existant affiché) ✅.

Prochaine étape : **Phase 6** (version alternative Google Calendar, à faire seulement si souhaité — voir `plan_dev_projet.md`) ou finitions (Phase 8).

## Comment lancer le site en local et naviguer entre les pages

1. Dans le terminal, à la racine du projet (`cd reservation-platform` si besoin) : `npm run dev`.
2. Astro affiche `Dev server running at http://localhost:4321`.
3. Ouvrir cette URL dans un navigateur : la page `/` (Accueil) s'affiche, avec un **Header** en haut contenant les liens `Accueil`, `Services`, `À propos`, `Contact` + un bouton `Réserver`.
4. Cliquer sur ces liens change de page (routing par fichiers d'Astro : chaque fichier dans `src/pages/` = une URL). Il n'y a pas de page unique : il suffit de cliquer sur les liens du menu, ou de taper directement `http://localhost:4321/services` etc. dans la barre d'adresse.
5. `npx astro dev stop` arrête le serveur de dev lancé en arrière-plan si besoin (utile si le port reste occupé).

### ⚠️ Souci "devtunnel" au lieu de localhost (VS Code)
Si VS Code redirige automatiquement le port 4321 vers une URL type `https://xxxx.devtunnels.ms` au lieu de proposer `http://localhost:4321` :
- C'est le **Port Forwarding** de VS Code (panneau "Ports", à côté du terminal) qui expose le port via un tunnel Microsoft (utile pour partager un lien avec quelqu'un d'autre, pas nécessaire ici).
- Solutions :
  1. Toujours possible de taper directement `http://localhost:4321` dans un navigateur ouvert sur la même machine — ça fonctionne indépendamment du tunnel.
  2. Dans l'onglet **Ports** de VS Code (Terminal > onglet "Ports"), clic droit sur le port 4321 → **Port Visibility** → vérifier qu'il n'est pas mis en "Public" par erreur (le mode "Private" suffit en local).
  3. Si le port a été forwardé automatiquement, on peut le retirer de la liste (bouton "Forward a Port" / poubelle à côté de la ligne 4321) : VS Code arrêtera de proposer le lien devtunnel et le navigateur local pourra utiliser `http://localhost:4321` directement.
  4. Le lien devtunnel fonctionne aussi (il proxy vers le même serveur), mais il est plus lent et dépend d'une connexion internet — à réserver pour tester depuis un autre appareil (téléphone, etc.).

## Phase 8 — Thème couleurs, header, carte, espace client, dashboard distinct (session du 2026-07-24)

- **Thème couleurs** : remplacement du bleu/blanc par une palette rose/terracotta + stone (`--primary`/`--ring` en oklch, classes `rose-*`/`stone-*` dans tout le site).
- **Header** : logo texte remplacé par une icône (ciseaux, `lucide-react`) + nom du business en `sr-only` ; bouton "Réserver" retiré du header (accessible via le menu classique) ; bandeau "Espace professionnel" supprimé, remplacé par un lien unique "Connexion / Inscription".
- **Nom du site** : `Salon Éclat` → `Salon Coiffure` (dans `src/config/site.ts`).
- **Arrière-plan** : `--background` passé d'un blanc pur à un ivoire pâle (oklch), les cartes restent blanches pour contraster.
- **Carte de localisation** : `leaflet` + `@types/leaflet` installés (OpenStreetMap, gratuit, sans clé API) ; composant `src/components/Map.astro` (vanilla JS, `circleMarker` pour éviter les soucis d'icônes par défaut de Leaflet avec les bundlers) ; intégrée sur l'accueil (section "Où nous trouver") et sur `/contact`.
- **Espace client complet** (table `clients` déjà prête dans `schema.sql` depuis la Phase 3, aucune migration nécessaire pour cette partie) :
  - `src/lib/queries.ts` : `Client`, `getClientById`, `createClient`, `updateClient`, `getAppointmentsForClient`, `getAccountType`.
  - `src/lib/useAuthedClient.ts` (hook miroir de `useAuthedProfessional`).
  - Pages `/espace-client` (mes rendez-vous), `/espace-client/profil`, `/espace-client/messages`.
  - `SignupForm.tsx` : toggle Client/Professionnel à l'inscription. `LoginForm.tsx` : redirige vers `/dashboard` ou `/espace-client` selon `getAccountType`.
- **Dashboard distinct de la vitrine** : nouveau `src/layouts/DashboardLayout.astro` (chrome minimal, sans header/footer public) utilisé par toutes les pages `/dashboard/*` et `/espace-client/*` (elles utilisaient auparavant le `Layout.astro` public).
- Build (`npm run build`) validé, commit `01c4c4b` poussé sur `main`.

### Suite (même session) : réservation, disponibilités, stats, messagerie

⚠️ **Migration SQL à exécuter dans Supabase avant que ces fonctionnalités marchent** : `supabase/migrations/0003_rules_messages.sql` (SQL Editor → New query → coller → Run, même procédure que les migrations précédentes). Elle crée :
- la table `availability_rules` (règles de disponibilité récurrentes/exceptionnelles) + RLS,
- un index unique partiel anti-double-booking sur `appointments (professional_id, start_time) where status = 'confirmed'` (remplace l'ancien trigger `is_booked` pour ce nouveau flux),
- la policy permettant au professionnel de voir les clients ayant déjà réservé chez lui,
- la table `messages` (messagerie pro ↔ client) + RLS.

**Tant que cette migration n'est pas exécutée**, les pages `/reservation`, `/dashboard/disponibilites`, `/dashboard/clients`, `/dashboard/statistiques`, `/espace-client/messages` afficheront des erreurs Supabase (tables/policies inexistantes).

Changements :
- **Réservation publique repensée** (`ReservationForm.tsx`) : au lieu de charger tous les créneaux libres d'un coup, l'utilisateur choisit une date puis clique sur "Voir les disponibilités" (calcul à la volée via `src/lib/slots.ts`, en combinant les règles de dispo du jour + les rendez-vous déjà pris ce jour-là). Les créneaux pris sont grisés/barrés.
- **Services synchronisés avec la base** : `services.astro` et l'aperçu de l'accueil utilisaient encore la liste statique `siteConfig.services` (désynchronisée de la table `services`). Remplacés par un composant `src/components/ServicesList.tsx` qui lit la table `services` en direct (les mêmes prestations que celles gérées dans `/dashboard/services` et proposées à la réservation).
- **Disponibilités pro repensées** (`AvailabilitiesPanel.tsx`) : au lieu de créer un créneau à la fois, le pro définit des **horaires récurrents groupés** (ex. "Lun - Ven, 8h-16h, créneaux de 30 min") avec choix des jours et de la granularité (30 min ou 1h pour les prestations longues), plus une case à cocher "disponibilité exceptionnelle" qui affiche un formulaire libre pour une date précise (remplace l'horaire récurrent ce jour-là).
- **Statistiques pro** : nouvelle page `/dashboard/statistiques` (`StatsPanel.tsx`) — rendez-vous cette semaine/à venir, CA estimé du mois, total, annulations, prestation la plus demandée (calculé côté client à partir des données déjà chargées, pas de nouvelle requête serveur).
- **Messagerie pro ↔ client** : nouvelle table `messages`. Page pro `/dashboard/clients` (`ClientsPanel.tsx`) liste les clients inscrits ayant déjà réservé et permet d'ouvrir une conversation. Page client `/espace-client/messages` (`MessagesClientPanel.tsx`) permet d'écrire au salon. Composant partagé `src/components/shared/MessageThread.tsx`.
- **Comptes clients de test créés** (session du 2026-07-24, via script Node temporaire utilisant uniquement la clé anon, supprimé après usage) pour tester `/espace-client` :
  - `client.test1@example.com` / `TestClient123!`
  - `client.test2@example.com` / `TestClient123!`
- Build (`npm run build`) validé sans erreur.

⚠️ Prochaine étape technique : exécuter la migration `0003_rules_messages.sql`, puis dans `/dashboard/disponibilites`, définir au moins un horaire récurrent (ex. Lun-Ven 8h-16h, 30 min) pour que la réservation publique affiche des créneaux.


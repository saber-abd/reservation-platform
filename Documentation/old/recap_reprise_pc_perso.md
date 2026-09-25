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

## Lot de modifs — session du 2026-07-24 (matin)

### ⚠️ Migrations SQL à exécuter dans Supabase (dans l'ordre)

1. `supabase/migrations/0004_avatars.sql` — ajoute les colonnes `avatar_url` et `phone` sur `professionals` et `clients`, et crée la table `messages` (si pas déjà créée par 0003).
2. `supabase/seed/demo_data.sql` — insère 10 prestations, 5 clients fictifs et 30 réservations passées pour alimenter les stats.

### Changements apportés

- **Avatars de profil prédéfinis** (`src/components/shared/AvatarPicker.tsx`) : 12 avatars SVG inline diversifiés (hommes/femmes), sélectionnables depuis un composant en grille. Intégré dans les panneaux Profil pro et Profil client.
- **Header dynamique** (`HeaderAuthButton.tsx` + `Header.astro`) : le bouton "Connexion / Inscription" est remplacé par l'avatar + prénom de l'utilisateur connecté (avec menu déroulant "Mon espace" / "Se déconnecter"). Si non connecté, affiche le bouton classique. Écoute les changements de session Supabase en temps réel (persistance entre rechargements automatique via `localStorage`).
- **Sélecteur d'heure en scroll** (`src/components/shared/TimePicker.tsx`) : deux colonnes scrollables (heures 0-23, minutes :00 et :30). Remplace tous les `input type="time"` natifs dans `AvailabilitiesPanel.tsx`. À déployer progressivement dans les autres formulaires si besoin.
- **Messages d'erreur précis à la réservation** : si non connecté, la page `/reservation` affiche maintenant une bannière claire avec lien vers `/inscription` (au lieu d'un message générique). La réservation reste possible en "invité" (sans compte), mais si connecté le `client_id` est automatiquement attaché.
- **Données de démo SQL** (`supabase/seed/demo_data.sql`) : 10 prestations coiffure avec durées et prix, 5 clients fictifs et 30 réservations passées sur 3 mois — à exécuter dans le SQL Editor Supabase pour avoir des stats significatives.

### Comptes de test (inchangés)
- **Pro** : `pro-test@example.com` / `Test-Password-123!`
- **Clients** :
  - `client.test1@example.com` / `TestClient123!`
  - `client.test2@example.com` / `TestClient123!`

## Lot 2 — session du 2026-07-25 (matin)

### ⚠️ Migration SQL à exécuter dans Supabase
1. `supabase/migrations/0005_soft_delete_services.sql` — Ajoute la colonne `is_deleted` pour permettre la suppression de prestations sans casser l'historique.

### Changements apportés
- **Images générées par IA** : ajout d'une belle photo de fond pour le "Hero" (`/images/hero_salon.jpg`) et d'une photo d'illustration pour le "À propos" (`/images/about_salon.jpg`).
- **Standardisation du profil Pro** : le formulaire de modification du profil professionnel (`ProfilePanel.tsx`) utilise maintenant le même design élégant sous forme de carte blanche que l'espace client.
- **Suppression "douce" de prestation** : correction du bug de suppression qui échouait à cause de la clé étrangère des réservations. La suppression met désormais `is_deleted = true` et la prestation est masquée dans le dashboard pro (et sur la page publique) sans supprimer les réservations passées.
- **Menu mobile (Hamburger)** : ajout du support de la navigation mobile sur téléphone dans `Header.astro`.
- **Amélioration de la carte Interactive** : remplacement des tuiles OpenStreetMap brutes par le fond "CartoDB Positron" pour un look premium. Activation du zoom (scroll/clic).
- **Intégration d'envoi d'e-mail (Resend)** : création de la route `/api/send-email.ts` et branchement de l'API Resend. Des e-mails sont désormais envoyés lors de :
  1. L'envoi d'un message via le formulaire "Contact".
  2. La confirmation d'une réservation avec succès.
  3. L'envoi d'un message privé client-pro (Notification).
- **Cohérence des informations (SSR)** : `astro.config.mjs` est passé en mode `output: 'server'`. Le site vitrine (`Layout.astro`, `index.astro`, etc.) va désormais piocher les informations nom/téléphone/adresse **directement dans la base de données** du professionnel au lieu de la configuration statique en dur (`siteConfig`).

### Prochaines étapes
- Exécuter la requête `0005_soft_delete_services.sql`.
- Préparer le déploiement.

## Lot 3 — session du 2026-08-20 (liste de petites tâches UX/fonctionnelles)

Traitées une par une, voir `/memories/session/todo.md` pour le suivi détaillé.

- **Email de bienvenue à l'inscription** : `SignupForm.tsx` envoie désormais un email (via `/api/send-email`, Resend) au client/pro juste après la création réussie du compte (fonction `sendWelcomeEmail`, fire-and-forget, cohérent avec le pattern déjà utilisé pour contact/réservation/messagerie).
- **Présélection de la prestation lors de la réservation** : le lien "Réserver" sur la page `/services` pointe vers `/reservation?service={id}` ; `ReservationForm.tsx` lit ce paramètre d'URL au chargement et présélectionne automatiquement la prestation correspondante.
- **Champs obligatoires marqués d'un astérisque** : dans `ReservationForm.tsx` (Nom complet, Email, Date), `LoginForm.tsx` et `SignupForm.tsx` (Email, Mot de passe).
- **Contraste de la sélection dans "reserver"** : la prestation et le créneau sélectionnés utilisent maintenant un fond rose plein (`bg-rose-600 text-white`) au lieu du rose pâle (`bg-rose-50`) peu visible.
- **Carousel d'avis clients sur l'accueil** : nouveau composant `TestimonialsCarousel.tsx` (React) avec flèches précédent/suivant et points de pagination, remplace la grille statique des 3 avis. 2 avis de démo supplémentaires ajoutés dans `site.ts` (5 au total).
- **Carousel de prestations sur l'accueil** : nouveau composant `ServicesCarousel.tsx` (scroll horizontal avec `scroll-snap` + flèches précédent/suivant), remplace `ServicesList` sur `index.astro` (celui-ci reste inchangé et utilisé sur `/services`).
- **Finalisation du mailing (messagerie pro↔client)** : `MessageThread.tsx` envoyait ses notifications à des adresses de test codées en dur (laissé en TODO par l'autre IA). Corrigé : nouvelle fonction `getProfessionalById` dans `queries.ts` (email du pro), email du client déduit de ses réservations passées avec ce pro via `appointments.client_email` (la table `clients` n'a pas de colonne email). `RESEND_API_KEY` ajouté à `.env.example`.
- **"Mot de passe oublié ?"** : lien ajouté dans `LoginForm.tsx` → nouvelle page `/mot-de-passe-oublie` (`ForgotPasswordForm.tsx`) → email Supabase avec lien vers `/reinitialiser-mot-de-passe` (`ResetPasswordForm.tsx`). Nouvelles fonctions `resetPasswordForEmail`/`updatePassword` dans `auth.ts`. ⚠️ Vérifier dans Supabase Auth (Site URL/Redirect URLs) que `/reinitialiser-mot-de-passe` est bien autorisé en redirection.
- **Fenêtre profil centrée** : `mx-auto` ajouté au formulaire (max-w-md) dans `ClientProfilePanel.tsx` et `ProfilePanel.tsx`, qui étaient collés à gauche.
- **Préremplissage du formulaire de réservation** : si le visiteur est connecté (client), `ReservationForm.tsx` récupère sa session + son profil (`getClientById`) et préremplit nom/email/téléphone automatiquement.
- **Contenu enrichi de la page "À propos"** : nouvelle section `about` dans `site.ts` (histoire, objectifs/motivations, diplômes — contenu inventé pour la démo), 3 nouvelles sections dans `a-propos.astro`.
- **Bandeau de navigation** : `Header.astro` passe d'un fond crème translucide + bordure nette à un fond blanc plein (`bg-white`) avec une ombre douce dégradée à la place de la bordure simple.
- **Fond blanc sur tous les champs de formulaire** : `bg-white` ajouté systématiquement à tous les `<input>`/`<textarea>` du site (connexion, inscription, mot de passe oublié, profils client/pro, services, disponibilités, réservation, messagerie, contact) pour contraster avec les fonds de page (souvent crème/stone-50).

### Prochaines étapes (Lot 3)
- Toutes les tâches demandées (1 à 13, voir `/memories/session/todo.md`) sont faites et vérifiées par un build réussi à chaque étape.
- À faire manuellement : vérifier que l'URL de redirection Supabase Auth autorise `/reinitialiser-mot-de-passe` (point 8), configurer `RESEND_API_KEY` en prod si pas déjà fait.

## Lot 4 — session du 2026-08-21 (liste de 15 tâches : sécurité, mobile, dashboard avancé)

Traitées une par une, voir `/memories/session/todo.md` (section "NOUVELLE LISTE 2026-08-21") pour le suivi détaillé.

- **Redirections selon rôle** : `useAuthedProfessional`/`useAuthedClient` redirigeaient vers `/inscription` quand le mauvais rôle visitait une zone protégée (déroutant). Corrigé : un client sur `/dashboard` est renvoyé vers `/espace-client`, un pro sur `/espace-client` vers `/dashboard`, un visiteur non connecté vers `/connexion`. Nouvelle page `404.astro`. ⚠️ Protection toujours côté client (pas de garde SSR, auth Supabase en localStorage) — la vraie sécurité des données reste les policies RLS Supabase.
- **Blocage des réservations dans le passé** : `slots.ts` exclut désormais les créneaux déjà passés (comparaison à l'heure courante), en plus du date picker limité à aujourd'hui. Garde-fou supplémentaire côté `createAppointment` qui rejette toute réservation avec une heure de début déjà passée.
- **Mailing (diagnostic en cours)** : `send-email.ts` amélioré (adresse d'expédition `RESEND_FROM_EMAIL` configurable, support `replyTo`, logs plus explicites). Cause probable du "je ne reçois rien" : `RESEND_API_KEY` est bien dans le `.env` local mais probablement absent des secrets **runtime** du Worker Cloudflare déployé (à ajouter via `wrangler secret put RESEND_API_KEY` ou dashboard Cloudflare, PAS dans l'onglet "Build" qui ne concerne que les vars `PUBLIC_`) ; et/ou compte Resend en mode sandbox (pas de domaine vérifié) qui n'autorise l'envoi qu'à l'adresse du compte Resend lui-même.
- **Confirmation d'email obligatoire** : nouvelle fonction `resendConfirmationEmail` dans `auth.ts`, `LoginForm.tsx` détecte l'erreur Supabase "email not confirmed" et propose de renvoyer l'email de confirmation. ⚠️ Nécessite d'activer "Confirm email" dans Supabase Dashboard > Authentication > Providers > Email (désactivé en dev actuellement).
- **Bug "case client qui grossit" (dashboard pro > Clients)** : la grille parente étirait la colonne liste à la hauteur du panneau de messagerie une fois un client sélectionné (`align-items: stretch` par défaut). Corrigé avec `items-start` dans `ClientsPanel.tsx`.
- **Icône X du menu mobile toujours visible** : `Header.astro` passait `class="hidden"` directement à un composant React (icône lucide), ce qui ne s'appliquait pas de façon fiable. Corrigé en enveloppant les icônes Menu/X dans des `<span>` HTML natifs qui portent la classe.
- **Scroll horizontal parasite sur mobile** : les flèches du `TestimonialsCarousel` dépassaient de la carte (`-translate-x-4`), risquant de sortir du viewport sur petit écran. Repositionnées à l'intérieur (`left-2`/`right-2`). Ajout d'un filet de sécurité global `overflow-x: hidden` sur `html`/`body`.
- **Photos sur les prestations** : migration `0006_service_images.sql` (colonne `services.image_url` + bucket Supabase Storage public `service-images`, policies lecture publique / écriture propriétaire). `ServicesPanel.tsx` permet d'uploader une photo à l'ajout d'une prestation ; l'image s'affiche partout où une prestation est listée (services, accueil, réservation).
- **Fiche client (note privée du pro)** : migration `0007_client_notes.sql` (table `client_notes`, RLS réservée au pro propriétaire, jamais visible du client). `ClientsPanel.tsx` affiche un nouveau bloc "Fiche client" (textarea + bouton Enregistrer) au-dessus de la messagerie.
- **Détail des rendez-vous (dashboard pro)** : `getAppointmentsForProfessional` joint désormais la prestation (nom/durée/prix). Les lignes du tableau des rendez-vous sont cliquables et ouvrent une modale de détail complet.
- **Nom à côté du logo** : le nom du salon était présent mais invisible (`sr-only`) dans `Header.astro`, rendu visible.
- **Statistiques du dashboard améliorées** : `StatsPanel.tsx` refondu avec sélecteur de période glissante (1 semaine/1 mois/1 an/personnalisée) et cartes cliquables ouvrant une modale de détail (ex : liste des clients avec un rendez-vous à venir).
- **Onglets de validation des réservations** : nouveau statut `pending` (migration `0008_pending_status.sql`, défaut passé de `confirmed` à `pending` — les réservations client ne sont plus auto-confirmées). `AppointmentsPanel.tsx` (dashboard pro) affiche 3 onglets (En attente / Confirmées / Historique) avec actions Confirmer/Refuser/Annuler. Messages et emails de `ReservationForm.tsx` mis à jour en conséquence.
- **Édition des prestations** : `ServicesPanel.tsx` permet désormais de modifier une prestation existante (bouton "Modifier", formulaire pré-rempli, image conservée sauf remplacement).
- **Modification de réservation côté client (≥24h avant)** : nouvelle fonction `rescheduleAppointment` (queries.ts). `AppointmentsClientPanel.tsx` affiche un bouton "Modifier" uniquement si le rendez-vous est à ≥24h, ouvrant une modale qui recalcule les disponibilités du pro (en excluant le rendez-vous en cours d'édition de la liste des créneaux pris) pour choisir un nouveau créneau.

### Prochaines étapes (Lot 4 — terminé)
- Les 15 tâches demandées (A1 à A15, voir `/memories/session/todo.md`) sont faites et vérifiées par un build réussi à chaque étape.
- ✅ Les 3 migrations SQL (`0006_service_images.sql`, `0007_client_notes.sql`, `0008_pending_status.sql`) ont été exécutées avec succès dans Supabase (2026-08-21).
- ✅ "Confirm email" activé dans Supabase Auth (2026-08-21) — A4 opérationnel.
- ✅ `RESEND_API_KEY` ajoutée dans Cloudflare "Variables and Secrets" (2026-08-21).
- **A3 mailing — décision utilisateur (2026-08-21)** : reste volontairement en mode démo Resend (sandbox, envoi possible uniquement vers l'adresse du compte Resend du propriétaire), pas d'achat de domaine personnalisé pour l'instant (site sur `*.workers.dev`). À revoir si un domaine personnalisé est acheté un jour (permettrait de vérifier le domaine dans Resend et d'envoyer à n'importe quel destinataire).

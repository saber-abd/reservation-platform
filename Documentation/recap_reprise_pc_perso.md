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
- **Cloudflare** : compte créé (l'intégration Postgres/Hyperdrive proposée par défaut n'est pas utilisée, on garde Supabase comme BDD)
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

Puis : **Phase 4** — développement du site vitrine (pages statiques Accueil/Services/À propos/Contact avec Tailwind).

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
- **Supabase** : compte créé, encore vierge → à configurer en Phase 3
- **Google Cloud Platform** : compte créé, Cloud Shell activé (pas utilisé pour l'instant) → utilisé en Phase 6 (API Google Calendar)

⚠️ **Sécurité** : ne jamais partager de token/PAT/mot de passe dans le chat Copilot. Toute authentification Git doit passer par Git Credential Manager (popup navigateur) ou saisie directe par toi-même dans le terminal.

## Où en est le code (fait sur le PC d'entreprise)

- Node.js v24.18.0 (LTS) + npm 11.16.0 installés et fonctionnels
- Git 2.52.0 installé
- Projet initialisé dans `C:\Dev\reservation-platform` (hors OneDrive, volontairement, pour éviter les ralentissements de sync sur `node_modules`)
- Git initialisé, `.gitignore` créé (`node_modules/`, `dist/`, `.env`, `.astro/`)
- Premier commit fait et **poussé avec succès** sur `main` → `github.com/saber-abd/reservation-platform`

### ⚠️ Point d'attention technique important
Le scaffold Astro actuel a été fait "à la main" (contournement) car le PC d'entreprise a des **restrictions GPO/AppLocker** qui bloquent l'exécution de `npx` et des scripts `.cmd`/`.ps1` depuis le cache npm. Résultat :
- `package.json` est générique (`"type": "commonjs"`, pas de scripts `dev`/`build`/`preview`) au lieu d'un vrai package.json généré par `create-astro`.
- Seuls `astro.config.mjs` et `src/pages/index.astro` existent, structure minimale.

**Sur le PC perso (sans ces restrictions), il faut régénérer proprement le projet** :
1. Cloner le repo existant : `git clone https://github.com/saber-abd/reservation-platform.git`
2. Idéalement, relancer `npm create astro@latest` dans un dossier temporaire et comparer/remplacer la config (ou demander à Copilot de corriger le `package.json` pour avoir les bons scripts npm et `"type": "module"`).
3. Une fois la base propre : `npx astro add tailwind`, `npx astro add react`, puis initialiser shadcn/ui.

## Prochaines étapes (reprise de la Phase 2)

1. Cloner le repo sur le PC perso (dans un dossier hors sync cloud si possible, ex. `C:\Dev\`).
2. Corriger/régénérer le `package.json` et la structure Astro proprement (pas de restrictions attendues ici).
3. `npx astro add tailwind`
4. `npx astro add react`
5. Initialiser shadcn/ui
6. Commit + push
7. Connecter le repo à Cloudflare Pages (build automatique à chaque push)

Puis suite du plan : **Phase 3** (mise en place Supabase — tables `professionals`, `services`, `availabilities`, `appointments`, `clients`, RLS policies).

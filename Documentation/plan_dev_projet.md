# Plan de développement — Plateforme vitrine + réservation

Roadmap complète du projet, de la mise en place initiale jusqu'au déploiement, en cohérence avec la stack retenue : **Astro (vitrine) + Next.js (dashboard) + Tailwind + Supabase + Cloudflare Pages/Workers**, avec en parallèle une version Google Calendar sans BDD.

---

## Phase 0 — Préparation des comptes et outils

1. **Comptes à créer** (tous gratuits) :
   - GitHub (hébergement du code, connecté à Cloudflare pour le déploiement auto)
   - Cloudflare (hébergement du site)
   - Supabase (base de données + auth)
   - Google Cloud Console (pour la Version 2, API Calendar)
2. **Outils à installer en local** :
   - Node.js (version LTS) + npm ou pnpm
   - Git
   - VS Code (ou un autre éditeur)
   - Extension VS Code Tailwind CSS IntelliSense (confort de dev)
3. **Domaine** : pas indispensable pour un portfolio (Cloudflare Pages fournit une URL `*.pages.dev` gratuite), à acheter plus tard si le projet devient concret.

---

## Phase 1 — Cadrage et maquette rapide

Avant de coder, clarifier :
1. **Les pages nécessaires** : Accueil, Services, À propos, Réservation, Contact (adapter selon le métier ciblé — fleuriste, coiffeur...).
2. **La charte graphique** : 1-2 couleurs principales, 1 police pour les titres + 1 pour le texte, ton (épuré/luxueux, coloré/artisanal...).
3. **Un wireframe rapide** (papier, Figma, ou même juste une liste de sections par page) pour ne pas coder "à l'aveugle".
4. **Les visuels** : banque d'images libres de droits (Unsplash, Pexels) en attendant de vrais visuels client.

---

## Phase 2 — Initialisation technique du projet

1. Créer le repo GitHub du projet.
2. Initialiser le site vitrine avec Astro :
   ```
   npm create astro@latest
   ```
3. Ajouter Tailwind CSS au projet Astro (intégration officielle) :
   ```
   npx astro add tailwind
   ```
4. Ajouter le support React pour les îlots interactifs (formulaire, widgets) :
   ```
   npx astro add react
   ```
5. Initialiser shadcn/ui pour les composants (boutons, modales...).
6. Premier commit + push sur GitHub.
7. Connecter le repo à Cloudflare Pages (build automatique à chaque push) — dès cette étape, même un site vide en ligne permet de valider toute la chaîne de déploiement.

---

## Phase 3 — Mise en place de Supabase (Version 1, avec comptes)

1. Créer un nouveau projet Supabase (choisir la région la plus proche, ex. Europe).
2. Modéliser les tables principales :
   - `professionals` (infos du pro : nom, activité, horaires, description)
   - `services` (prestations proposées, durée, prix)
   - `availabilities` (créneaux disponibles)
   - `appointments` (réservations des clients : nom, contact, créneau choisi, service)
3. Activer et configurer **l'authentification** (email/mot de passe, ou magic link) pour l'espace professionnel.
4. Écrire les **Row Level Security (RLS) policies** : chaque professionnel ne doit voir/modifier que ses propres données.
5. Récupérer les clés d'API (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) et les stocker en variables d'environnement (jamais en dur dans le code).
6. Tester la connexion depuis le projet Astro/React avec `supabase-js`.

---

## Phase 4 — Développement du site vitrine (pages statiques)

1. Construire la structure des pages Astro (Accueil, Services, À propos, Contact).
2. Intégrer Tailwind pour la mise en page et le style.
3. Ajouter les animations progressivement (une fois la structure fonctionnelle) :
   - Apparitions au scroll avec **Motion** ou **AOS**
   - Effets de scroll avancés avec **GSAP + ScrollTrigger** si besoin
   - Composants animés prêts à l'emploi (**Aceternity UI** / **Magic UI**) pour la hero section
4. Ajouter les icônes (**Lucide**) et les polices auto-hébergées (**Fontsource**).
5. Rendre le site responsive (mobile-first, puis adapter desktop).

---

## Phase 5 — Développement du formulaire de réservation et du dashboard (Version 1)

1. Construire le formulaire de réservation en React (dans une page/île Astro), avec **React Hook Form** + **Zod** pour la validation.
2. Connecter le formulaire à Supabase : insertion d'une ligne dans `appointments`.
3. Construire l'espace professionnel (dashboard) :
   - Si géré dans Astro : îles React connectées à Supabase Auth
   - Si tu préfères un vrai espace applicatif avec navigation/état complexe : basculer cette partie sur un projet Next.js séparé, déployé sur un sous-domaine (ex. `app.tonsite.com`)
4. Permettre au professionnel de : gérer ses créneaux, voir ses rendez-vous, modifier ses informations.

---

## Phase 6 — Version Google Calendar (sans BDD)

1. Créer un projet dans Google Cloud Console, activer l'**API Google Calendar**.
2. Configurer l'écran de consentement OAuth et créer des identifiants OAuth2.
3. Faire l'authentification une seule fois (manuellement) pour récupérer un **refresh token** lié au compte Google du professionnel.
4. Stocker ce refresh token en secret (jamais côté client) :
   ```
   wrangler secret put GOOGLE_REFRESH_TOKEN
   ```
5. Créer un **Cloudflare Worker** qui :
   - reçoit les données du formulaire de réservation
   - vérifie la disponibilité via `freebusy.query()`
   - crée l'événement via `events.insert()`
6. Relier le formulaire de cette version au Worker (fetch API depuis le frontend).
7. Tester une réservation de bout en bout et vérifier l'apparition de l'événement dans Google Calendar.

---

## Phase 7 — Déploiement et tests

1. Vérifier que toutes les variables d'environnement (Supabase, Google) sont bien configurées en production sur Cloudflare (pas seulement en local).
2. Déployer via push GitHub → build automatique Cloudflare Pages.
3. Tester le site en conditions réelles : parcours complet de réservation, sur mobile et desktop.
4. Vérifier les performances avec Lighthouse (Chrome DevTools) : viser un bon score sur Performance, Accessibilité, SEO.
5. Ajouter les balises meta de base (titre, description, Open Graph) pour le référencement et le partage sur réseaux sociaux.

---

## Phase 8 — Finitions et mise en valeur portfolio

1. Repasser sur les animations et micro-interactions pour peaufiner le rendu "premium".
2. Optimiser les images (compression, formats modernes comme WebP/AVIF).
3. Rédiger une présentation du projet (contexte, choix techniques, démo) pour ton portfolio.
4. Créer deux versions de démo en ligne (une par architecture) pour pouvoir montrer les deux approches à de futurs clients.

---

## Phase 9 — Passage en mode "vente à un client réel" (plus tard)

Étapes à prévoir uniquement quand tu commercialises réellement le produit :
1. Passer sur des plans payants Supabase/Cloudflare si les volumes dépassent les tiers gratuits.
2. Réfléchir à une architecture **multi-tenant** propre (un compte professionnel = un espace isolé).
3. Ajouter un système de paiement (ex. Stripe) si tu factures un abonnement.
4. Permettre une personnalisation par client (couleurs, logo, textes) sans dupliquer le code.
5. Mettre en place un vrai nom de domaine et une politique de confidentialité/CGU (obligatoire dès qu'il y a des données clients réelles).
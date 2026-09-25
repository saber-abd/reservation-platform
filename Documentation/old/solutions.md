# Plateforme vitrine + réservation — comparatif des 2 architectures

Deux façons de construire le même produit (site vitrine + prise de rendez-vous) pour un fleuriste, un coiffeur, etc. La différence se joue sur un point : **qui gère les créneaux et les données ?**

---

## Version 1 — Avec base de données (comptes utilisateurs)

### Principe
Chaque professionnel a un compte sur ta plateforme. Il configure ses créneaux, ses services, ses horaires dans un espace d'administration. Les clients réservent directement dans ta base de données.

### Stack recommandée
- **Frontend** : React / Next.js (ou HTML/JS simple)
- **Backend + BDD** : Supabase (PostgreSQL + Auth + Stockage fichiers + API REST auto-générée)
- **Hébergement du site** : Cloudflare Pages

### Comment ça marche concrètement
1. Le frontend appelle directement le SDK `supabase-js` — pas besoin d'écrire de serveur API toi-même.
2. Supabase Auth gère l'inscription/connexion des professionnels.
3. Les **Row Level Security (RLS) policies** de Postgres garantissent qu'un fleuriste ne voit que ses propres rendez-vous — la sécurité est appliquée côté base de données, pas côté client.
4. Le client final réserve un créneau → une ligne est insérée dans la table `appointments`, visible instantanément dans l'espace admin du professionnel.

### Avantages
- Architecture très simple : quasiment pas de backend à écrire.
- Chaque client a son espace, son historique, ses statistiques — bien plus vendable comme produit SaaS.
- Extensible facilement (paiement en ligne, notifications, multi-utilisateurs par compte...).

### Inconvénients
- Dépendance à Supabase (migration possible mais demande du travail, car Postgres reste portable).
- Sur le tier gratuit, un projet inactif se met en pause après 7 jours (se réveille au premier accès — à surveiller avant une démo).

---

## Version 2 — Sans espace utilisateur, via Google Calendar API

### Principe
Pas de compte, pas de base de données. Le formulaire de réservation du site crée directement un événement dans **ton** Google Calendar (ou celui du client, une fois vendu).

### Stack recommandée
- **Frontend** : formulaire statique (HTML/JS ou React)
- **Backend léger** : une fonction serverless (Cloudflare Worker) qui reçoit les données du formulaire
- **Hébergement** : Cloudflare Pages + Workers

### Comment ça marche concrètement
1. Une seule fois, en amont : authentification OAuth2 avec le compte Google du professionnel → récupération d'un **refresh token**, stocké côté serveur (jamais exposé au client).
2. Le formulaire envoie les données (nom, créneau souhaité...) à ta fonction serverless.
3. La fonction utilise le refresh token pour appeler `events.insert()` via l'API Google Calendar et créer le rendez-vous.
4. Optionnel : vérifier au préalable la disponibilité avec `freebusy.query()` pour éviter les doublons de créneaux.

### Avantages
- Zéro base de données à gérer, zéro compte à créer.
- Le professionnel garde ses rendez-vous dans l'outil qu'il utilise déjà (Google Calendar), donc adoption plus facile.
- Quotas très confortables : l'API Calendar est gratuite jusqu'à 1 000 000 requêtes/jour et 10 000 requêtes/minute par projet — largement suffisant.

### Inconvénients
- Un minimum de backend est obligatoire (impossible d'appeler l'API Google avec le refresh token directement depuis le navigateur, ce serait une faille de sécurité).
- Moins "scalable" en produit : chaque client = une configuration OAuth séparée à gérer soigneusement.
- Pas d'historique client, pas de tableau de bord — plus basique dans l'expérience.

---

## Hébergement : pourquoi Cloudflare plutôt que Netlify ou Vercel

| Plateforme | Bande passante gratuite | Fonctions serverless | Usage commercial autorisé ? |
|---|---|---|---|
| **Cloudflare Pages + Workers** | Illimitée (Pages) | Oui (Workers, ~100k req/jour gratuites) | Oui |
| **Netlify** | ~15 Go/mois (système à crédits depuis fin 2025) | Oui (Netlify Functions, 10s max) | Oui, explicitement autorisé |
| **Vercel Hobby** | 100 Go/mois | Oui (60s max) | **Non — les CGU interdisent l'usage commercial ou générateur de revenu sur le plan gratuit** |

Vercel Hobby est donc à écarter dès que tu comptes vendre le produit, même en phase de démo si le site affiche par exemple un lien de paiement. Cloudflare est le choix le plus solide pour un projet destiné à devenir commercial : pas de restriction d'usage, pas de système de crédits à surveiller.

---

## Cloudflare + Supabase : sont-ils compatibles ?

Oui, totalement, et il y a même une intégration officielle. Deux façons de les connecter :

1. **Via `supabase-js` (le plus simple, recommandé pour ton cas)**
   Le client Supabase communique en HTTP via PostgREST, donc pas de souci de connexions TCP limitées sur Workers. Cloudflare propose même une intégration native dans le dashboard Workers : elle injecte automatiquement `SUPABASE_URL` et `SUPABASE_KEY` dans ton projet.

2. **Via Cloudflare Hyperdrive (si tu veux une connexion Postgres directe)**
   Utile si tu veux utiliser un ORM comme Drizzle ou Prisma avec une vraie connexion TCP. Dans ce cas, utilise la **connection string "Direct connection"** de Supabase (pas la version "pooled" via Supavisor) — Hyperdrive gère déjà sa propre pool de connexions, et cumuler les deux systèmes de pooling casse le cache et génère des erreurs.

Pour la Version 1 telle que décrite plus haut (frontend qui appelle directement Supabase), tu n'as même pas besoin de Workers ni de Hyperdrive : un simple site statique sur Cloudflare Pages + `supabase-js` suffit.

---

## En résumé

| | Version 1 (BDD) | Version 2 (Google Calendar) |
|---|---|---|
| Complexité technique | Faible (grâce à Supabase) | Faible à moyenne (OAuth à gérer) |
| Espace client / historique | Oui | Non |
| Backend nécessaire | Non (Supabase suffit) | Oui (fonction serverless minimale) |
| Idéal pour | Vendre un vrai produit SaaS multi-clients | Démo rapide, usage mono-professionnel |
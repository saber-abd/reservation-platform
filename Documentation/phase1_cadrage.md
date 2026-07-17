# Phase 1 — Cadrage et maquette rapide

Statut des comptes (pour mémo, aucune action requise en Phase 1) :
- GitHub hébergement : compte perso séparé (pas celui de l'IDE) → repo à créer dessus en Phase 2.
- Cloudflare : compte créé, l'intégration Postgres/Hyperdrive vue n'est pas utilisée (on garde Supabase).
- Supabase : compte créé, vierge → configuré en Phase 3.
- GCP : compte créé, Cloud Shell activé (pas utilisé, on fera l'OAuth via la console web) → utilisé en Phase 6.

---

## 1. Positionnement du projet

Template **générique et réutilisable** pour plusieurs métiers de prestation de service avec prise de rendez-vous (coiffeur, fleuriste, coach, institut de beauté, etc.).

Conséquence technique à garder en tête dès maintenant :
- Les textes, couleurs, logo et liste de services ne doivent **jamais être codés en dur** dans les composants → tout doit venir de la table `professionals` / `services` (Supabase) ou d'un fichier de config par instance. Ça prépare le multi-tenant de la Phase 9 sans effort supplémentaire aujourd'hui.

---

## 2. Pages du site

### Partie vitrine (publique, Astro)
| Page | Objectif |
|---|---|
| Accueil | Accroche, présentation rapide, CTA "Réserver" |
| Services / Prestations | Liste des prestations, durée, prix |
| À propos | Présentation du professionnel/de l'activité |
| Galerie photos | Réalisations / ambiance du lieu |
| Avis clients | Témoignages (statiques au départ, dynamiques plus tard) |
| Réservation | Formulaire de prise de RDV (choix service + créneau) |
| Contact | Coordonnées, plan, formulaire de contact |

### Partie applicative (authentifiée, Next.js ou îles React)
| Espace | Objectif |
|---|---|
| Espace client | Historique des RDV du client, annulation/modif, infos perso |
| Espace admin (pro) | Gestion des créneaux, vue des RDV, gestion des services, infos du profil |

> Note : l'espace admin correspond au "dashboard" déjà prévu en Phase 5. L'espace client est un ajout — à intégrer dans le modèle Supabase (Phase 3) avec une table `clients` liée à `appointments` par `user_id` (RLS : un client ne voit que ses propres RDV).

---

## 3. Charte graphique proposée (style épuré/moderne)

- **Couleurs** :
  - Primaire : `#111827` (anthracite/noir doux) — textes, header
  - Accent : `#2563EB` (bleu moderne) — CTA, liens — *facilement remplaçable par instance/métier*
  - Fond : `#FFFFFF` / `#F9FAFB` (gris très clair pour sections alternées)
  - Neutre texte secondaire : `#6B7280`
- **Typographie** :
  - Titres : `Poppins` ou `Sora` (Fontsource, auto-hébergée)
  - Texte courant : `Inter`
- **Style** : beaucoup d'espace blanc, coins arrondis (`rounded-xl`), ombres légères, animations discrètes au scroll (pas d'effet "surchargé").

Comme le site est un template multi-métier, ces couleurs/polices doivent être définies via des **variables CSS/Tailwind config** (pas en dur), pour permettre de changer facilement de thème par client.

---

## 4. Structure de sections par page (wireframe texte)

**Accueil**
1. Header sticky (logo, nav, bouton "Réserver")
2. Hero (accroche + CTA + visuel)
3. Aperçu services (3-4 cartes)
4. Bloc "À propos" résumé + lien
5. Avis clients (carrousel, 3 témoignages)
6. Galerie (aperçu 4-6 photos + lien "voir plus")
7. CTA final "Réserver maintenant"
8. Footer (contact, réseaux sociaux, liens légaux)

**Services**
1. Header
2. Liste des prestations (carte : nom, durée, prix, bouton "Réserver")
3. CTA contact si besoin sur-mesure
4. Footer

**À propos**
1. Header
2. Histoire / présentation du pro
3. Photo(s) + valeurs/qualifications
4. CTA réservation
5. Footer

**Galerie**
1. Header
2. Grille de photos (lightbox au clic)
3. Footer

**Avis clients**
1. Header
2. Liste des avis (note + commentaire + nom)
3. Footer

**Réservation**
1. Header
2. Formulaire : choix service → choix créneau (dispo réelle) → coordonnées client
3. Récapitulatif + confirmation
4. Footer

**Contact**
1. Header
2. Coordonnées + carte
3. Formulaire de contact simple
4. Footer

**Espace client** (après connexion)
1. Nav espace client
2. Liste des RDV à venir / passés
3. Action annuler/modifier
4. Infos du compte

**Espace admin**
1. Nav admin
2. Calendrier des RDV
3. Gestion des créneaux/disponibilités
4. Gestion des services (CRUD)
5. Paramètres du profil pro

---

## 5. Visuels

- Utilisation de **Unsplash** et **Pexels** (libres de droits) pour les maquettes/démo, en attendant de vrais visuels client.
- Prévoir un dossier `public/images/placeholder/` avec une sélection cohérente par métier de démo (ex. thème "coiffeur" pour la première démo).

---

## Prochaine étape → Phase 2

Aucun ID technique n'est nécessaire pour la Phase 1. Pour attaquer la **Phase 2 (init technique)**, il faudra :
- Le nom d'utilisateur/organisation du **compte GitHub d'hébergement** (celui qui recevra le repo).
- Confirmer si tu veux un repo public ou privé.

# Audit du projet par agents spécialisés — 19/10/2026

Revue en lecture seule : aucun fichier du projet n'a été modifié, aucune correction SQL appliquée.
Constats issus de la lecture du code ; les failles n'ont pas été testées sur la base Supabase réelle. Le volet légal est une information générale, pas un avis d'avocat.

**Verdict global :** bon support de démonstration, non vendable en l'état (sécurité, RGPD/licences, promesses non tenues).

---

## 1. Sécurité applicative (security-auditor)

### Critique
- **C1. Fonctions admin `SECURITY DEFINER` appelables par `anon`** (`supabase/migrations/0009_sync_auth_users_and_multi_demo.sql:56-131`). `ban_user_by_admin`, `unban_user_by_admin`, `delete_user_by_admin` ne vérifient pas l'appelant et écrivent dans `auth.users`. Avec la clé anon publique, n'importe qui peut supprimer, bannir ou débannir un compte via `rpc()`.
  Correctif : `REVOKE EXECUTE ... FROM anon, public`, contrôle de l'appelant dans la fonction, ou route serveur en `service_role` après vérification du JWT.
- **C2. RLS de `public.clients` totalement ouverte** (`0009:25-51`), `USING (true)` sur SELECT/INSERT/UPDATE/DELETE. Lecture de tout le fichier clients, modification, suppression, auto-débannissement.
- **C3. `/api/send-email` relais ouvert** (`src/pages/api/send-email.ts:3-38`). Pas d'auth, pas de rate-limit ; `to`, `subject`, `html` libres. Risque de phishing/spam depuis votre compte d'envoi.
  Correctif : emails construits côté serveur depuis un `appointment_id`/`message_id`, JWT vérifié, destinataires issus de la base, gabarits fixes, rate-limit, contrôle `Origin`.

### Élevé
- **E1. RBAC et auth pro dans `localStorage`** (`permissions.ts:27-31, 66-98, 492-509` ; `useAuthedProfessional.ts:33-78` ; `LoginForm.tsx:205-231`). `localStorage.setItem('pro_active_role','admin')` suffit ; mots de passe collaborateurs stockés/comparés en clair ; professionnel de repli chargé sans session sur `/demo-*`.
- **E2. Bannissement contournable côté client** (`permissions.ts:199-215, 312-378`). Seul `auth.users.banned_until` bloque réellement.
- **E3. Injection HTML dans les emails** (`ReservationForm.tsx:170`, `MessageThread.tsx:122`).
- **E4. `/api/calendar`** (`calendar.ts:61-101`) : limite de débit dans un cookie contournable ; événements arbitraires créables dans l'agenda Google.

### Moyen / Faible
- M1 : erreurs brutes Google/Resend renvoyées au client (`calendar.ts:147,175,184`, `send-email.ts:46,52`).
- M2 : aucun header de sécurité (CSP, HSTS, frame-ancestors, nosniff, Referrer-Policy).
- M3 : injection de filtre PostgREST (`permissions.ts:285`).
- M4 : `update_images.js:15` a un repli `SERVICE_ROLE` ; ne jamais exposer cette clé en `PUBLIC_*`.
- F1 : pas de SSRF. F2 : OAuth en flux implicite, passer en PKCE et restreindre les Redirect URLs Supabase. F3 : `set:html`/`dangerouslySetInnerHTML` sur SVG codés en dur, pas de XSS actuel.
- F4 : `.env` non tracké et absent de l'historique git ; `GCP OAuth ID.txt` hors dépôt. En production, secrets via `wrangler secret put`.

**Priorités :** C1+C2 (une migration), puis C3/E3, puis E1/E2.

---

## 2. Base de données Supabase (database-administrator)

### Critique
1. RLS `clients` ouverte (`0009:30-51`, doublon `migration_sync_auth_users.sql`) ; `queries.ts:368` fait `select('*')` et filtre côté client.
2. Fonctions admin exécutables par `anon` (`0009:57-131`).
3. Un banni peut agir : aucune policy ne teste `is_banned` ; INSERT `appointments` en `with check(true)` (`schema.sql:232-234`).

### Élevé
4. **Double-réservation** : index unique limité à `status='confirmed'` (`0003:61-63`) alors que le défaut est `pending` (`0008:15-16`) ; chevauchements non détectés ; `slots.ts:49` calcule `isBooked` côté client.
5. **`tag_bd` n'isole rien** : texte libre, sans FK ni table `tenants`, non testé par la RLS ; devient une liste CSV côté client (`queries.ts:714-735`).
6. `appointments_update_own` (`schema.sql:249-264`) laisse le client modifier toute colonne (statut `completed`, dates, `professional_id`) : faux points de fidélité.
7. Messages : schémas contradictoires 0003/0004, policies cumulatives permettant l'usurpation du pro.

### Moyen / Faible
8. `delete_user_by_admin` supprime l'historique des RDV ; cascades incohérentes.
9. Index manquants : `appointments(professional_id, tag_bd, start_time)`, `messages(professional_id, client_id, created_at)`, etc. ; `ban` et `is_banned` en double.
10. Contraintes manquantes (valeurs de `ban`, `days_of_week`, cohérence `end_time`), services supprimés exposés publiquement.
11. Fidélité calculée à la volée côté client, sans historique ni idempotence ; mois en UTC ; `seed_loyalty.js` crée des comptes de test à mot de passe faible.
12. Migrations non reproductibles (fichiers sans numéro, doublons, `create policy` sans `drop if exists`).
13. Lecture publique de email/téléphone/`user_id` des professionnels ; pas de rétention ni de pagination.

### Correctifs SQL proposés (non appliqués, à tester en staging)
- Remplacer les policies `clients` par `auth.uid() = id` + lecture par le pro concerné ; retirer l'UPDATE des colonnes `is_banned, ban, ban_reason, banned_at, tag_bd`.
- `REVOKE EXECUTE` des 3 fonctions admin pour `public, anon, authenticated`, `GRANT` à `service_role`.
- Fonction `not_banned()` ajoutée au `with check` des INSERT/UPDATE `appointments` et `messages`.
- Contrainte d'exclusion : `exclude using gist (professional_id with =, tstzrange(start_time,end_time) with &&) where (status in ('pending','confirmed'))` (extension `btree_gist`).
- `revoke update on appointments from authenticated; grant update (status)` + trigger limitant les transitions.
- Table `tenants` + FK, table de liaison `client_tenants`.
- Index composites et contrainte `ban in ('oui','non')`.

**Ordre :** fonctions admin → RLS clients → bannis → double-réservation → colonnes RDV → messages → reste.

---

## 3. Front-end et performance (general-purpose)

Lecture du code et grep ; `astro check` non lancé, rendu non mesuré.

### Gains rapides (~4 h)
- **Hydratation** : plus de 90 `client:load` ; carrousels, stats premium et pages d'auth passables en `client:visible`/`client:idle` (ex. `demo-diamant/index.astro:127,140`, `demo-standard/index.astro:200`, `demo-premium/index.astro:16-20`). Navs et guards montés en îlots séparés sur chaque page dashboard.
- **Dépendances probablement mortes** : aucun import de `three`/`@react-three/*` trouvé dans `src` ; à confirmer par grep ciblé puis `npm rm`.
- **Images** : trois JPEG de 721–852 Ko, `imageService: 'passthrough'` ; convertir en WebP/AVIF, ajouter `width`/`height`, `loading="lazy"`. Pas d'`og:image`/`twitter:image` (`Layout.astro:30-40`).
- **Polices** : 988 Ko en TTF/OTF, toutes déclarées pour les 3 thèmes (`global.css:5-65`) ; Coolvetica déclarée 2 fois ; Recoleta pointe vers un fichier absent.
- **Animations** : AOS, Lenis, GSAP, Framer Motion se recouvrent ; `AOS.init({once:false, mirror:true})` ; 0 occurrence de `prefers-reduced-motion`.
- **recharts** (~100 Ko gzip) à charger en lazy ; `leaflet` seulement sur la page contact.
- **SEO** : `robots.txt` ne couvre pas `/demo-*/dashboard` ni `espace-client` ; démos quasi identiques donc risque de contenu dupliqué (canonical ou noindex).

### Duplication (effort élevé)
- `diamant/dashboard` : 17 fichiers, ~6 300 lignes (`DiamantRightsPanel.tsx` 1 752, `DiamantMessenger.tsx` 715).
- 8 layouts (813 lignes) au `<head>` répété → `SeoHead.astro` + config de thème.
- 6 navs quasi identiques → un composant paramétré.
- 3 × 15 pages quasi identiques → route dynamique `[theme]` ou composants partagés.
- Diamant fork les panels Standard au lieu d'être un thème.

### Accessibilité / robustesse
- 92 `outline-none` pour 21 `aria-label` : vérifier les `focus-visible`.
- États de chargement/erreur non annoncés (`role="status"`, `role="alert"` manquants) ; pas d'`ErrorBoundary`.
- Carrousels : navigation clavier, pause de l'auto-play ; menu mobile : `aria-expanded`/focus trap.
- Contraste de `#e11d48` avec texte blanc ~4,6:1 ; responsive des tableaux non vérifié.

---

## 4. Produit et UX (product-manager)

### Écarts entre promesses et code
- SMS automatisés annoncés, absents ; acompte de 30 % cité dans les CGU Premium, non implémenté.
- Standard : écriture seule vers Google Calendar (pas de synchro bidirectionnelle) ; les créneaux ne lisent pas l'agenda (double réservation possible) ; le dashboard Standard lit Supabase qui ne reçoit jamais les réservations, donc vide en conditions réelles.
- Diamant : RBAC annoncé « en base », stocké en local ; mot de passe collaborateur par défaut codé en dur (`Pro2026!`).
- `appointments_select_own` inclut `client_id IS NULL` : réservations invités lisibles par tous.
- Si `RESEND_VERIFIED_EMAIL` est défini, tous les emails partent vers cette seule adresse.
- Comparatif Standard « messagerie : Non » alors qu'une page messages existe.

### Manques pour la vente
Paiement/acompte, rappels email/SMS, annulation par lien (report bloqué <24 h mais annulation libre), multi-employés (pas d'`employee_id`), compteur de no-show, liste d'attente, avis réels, multi-langue, export comptable. Chaque client exige un déploiement avec configuration dans le code.

### Positionnement et prix
Paliers définis par la technique (Zéro-DB, PostgreSQL, luxe) plutôt que par la valeur client. Proposition : paliers par capacité. Prix à tester (hypothèses, sans étude concurrentielle) : Solo 290 € + 29 €/mois ; Équipe 690 € + 79 €/mois ; Multi-sites dès 3 000 € + maintenance.

### Feuille de route
- **MVP vente (4–6 semaines)** : fermer les failles, RBAC et bans en base, retirer le mot de passe par défaut ; Standard interroge Google freeBusy ; annulation/report par lien (règle des 24 h unique) ; rappel email J-1 ; retirer les promesses non tenues ; page de vente chiffrée, une démo par métier.
- **v1 (~3 mois)** : acompte Stripe, SMS en option payante, multi-employés, compteur no-show, export CSV, onboarding multi-clients en base.
- **v2** : liste d'attente, avis, multi-langue, synchro bidirectionnelle, multi-sites.

---

## 5. Conformité légale / RGPD (legal-advisor)

### Bloquant avant vente
1. **Polices non commerciales déjà déployées** (`public/fonts/`, `src/styles/global.css:6-61`) : Monimer Serif (usage personnel), Cocogoose (trial), Recoleta (démo), Coolvetica (EULA freeware), Type Machine (à vérifier). Acheter des licences web avec redistribution ou passer à des polices libres (Google Fonts, Fontsource) ; supprimer ensuite les fichiers de `public/` et `dist/`.
2. **Pas de consentement à l'inscription** (`SignupForm`, `CompleteProfileForm`, OAuth) : case CGU non pré-cochée, liens, preuve horodatée et versionnée.
3. **Politique de confidentialité insuffisante** (4 paragraphes) : responsable de traitement, finalités et bases légales, destinataires/sous-traitants (Supabase, Resend, Cloudflare, Google), transferts hors UE, durées, droits complets, CNIL ; déclarer la messagerie et les notes clients (`client_notes`, migration 0007).
4. **Pas de suppression ni d'export en libre-service** (seul l'admin supprime un client) ; vérifier la cascade (RDV, messages, notes, `auth.users`, storage, `localStorage`).

### Important
5. Mentions légales : forme juridique, SIRET/RCS, directeur de publication, TVA, hébergeur nommé (art. 6 LCEN).
6. CGU/CGV : rétractation, médiation de la consommation, annulation, droit applicable, base contractuelle du bannissement ; CGV séparées pour la vente aux professionnels (licence, SLA, réversibilité).
7. DPA (art. 28) : le commerçant est responsable de traitement, vous sous-traitant ; liste des sous-traitants ultérieurs ; régions Supabase UE et clauses pour transferts US.
8. Cookies : aucun bandeau détecté ; probablement exempté tant qu'aucun traceur non essentiel ; auditer les requêtes réseau.

### À surveiller
Registre des traitements, AIPD, politique de rétention, procédure de violation (72 h), RGAA. Licences des dépendances (Lenis, AOS, three, Geist : OK ; GSAP : licence Webflow à relire) ; lancer `npx license-checker`.

**Allégation trompeuse :** la galerie Diamant (`galerie/diamant.astro`) annonce « conformité RGPD stricte » et « purge RGPD en cascade » ; à reformuler tant que les points ci-dessus ne sont pas réglés.

---

## 6. Nom du projet, domaines et mailing (content-marketer)

**Méthode :** RDAP officiels (AFNIC, Verisign, Identity Digital). Quota AFNIC atteint, donc plusieurs `.fr` non vérifiés. INPI/EUIPO non interrogés. Homonymes recherchés seulement pour quelques noms.

| Nom | Tagline | .fr | .com | .io |
|---|---|---|---|---|
| **Ponctuo** | Votre rendez-vous, à l'heure. | non vérifié | pris | libre |
| Atelio | Votre atelier, toujours plein. | non vérifié | pris | libre |
| Ouvrio | Ouvrez votre agenda au monde. | non vérifié | pris | libre |
| Serein | Réservez l'esprit tranquille. | pris | pris | pris |
| Creneau | Le bon créneau, en un clic. | pris | pris | pris |
| Dispo, Agendo | — | pris | pris | pris |
| Horae, Rendio, Accordo, Simplio, Tempio, Oriel, Fixio, Lumio | — | non vérifié | pris | pris |

Lumio : marque connue d'écrans pédagogiques (supposé). Atelio : proche d'Atellio (SaaS, Londres).

**Top 5 :** Ponctuo, Atelio, Ouvrio, Serein, Creneau. **Choix de l'agent :** Ponctuo, sous réserve du `.fr` libre et d'un contrôle INPI.

### Mailing
- Sous-domaine d'envoi dédié (ex. `rdv.ponctuo.io`) avec SPF, DKIM, DMARC (`p=none` puis `quarantine` puis `reject`).
- Tarifs relevés le 19/10/2026 (à confirmer avant achat) :

| Fournisseur | Gratuit | Entrée | Remarque |
|---|---|---|---|
| Brevo | 300/jour | Starter 7 €/mois (5 000) | Euros, UE ; grille modifiée en juillet 2026 |
| Mailjet | 6 000/mois | Essential 18 € (15 000) | Euros, UE |
| Postmark | 100/mois | 15 $ (10 000) | Référence en délivrabilité, USD |
| Resend | 3 000/mois | Pro 20 $ (50 000) | Bon DX, USD |

Recommandation : Brevo pour démarrer ; Postmark si les rappels de rendez-vous doivent être livrés à coup sûr.

À faire avant lancement : contrôle INPI/EUIPO, vérification du `.fr`, test de délivrabilité après configuration SPF/DKIM/DMARC.

---

## Ordre d'action proposé

1. **Sécurité (jours)** : migration SQL (fonctions admin, RLS `clients`, bannis), route email serveur authentifiée, rôles et mots de passe collaborateurs en base, contrainte anti double-réservation.
2. **Avant la vente** : polices, consentement, politique de confidentialité, suppression/export de compte, mentions légales, retrait des promesses non tenues.
3. **Gains rapides front** : images, hydratation, dépendances mortes, `og:image`, `robots.txt`.
4. **Produit** : annulation par lien, rappel J-1, acompte, multi-employés.
5. **Structure** : factoriser les trois démos en un code thématisé.

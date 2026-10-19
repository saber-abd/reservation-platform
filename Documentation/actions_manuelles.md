# Actions manuelles après l'audit (19/10/2026)

Ce qui a été appliqué dans le code est listé en bas. Ce qui suit demande votre intervention.

## 1. Appliquer la migration de sécurité (priorité 1)

Fichier : `supabase/migrations/0012_security_hardening.sql`

1. Dans Supabase, créez un projet de **test** (Dashboard > New project) ou faites une sauvegarde (Database > Backups).
2. Ouvrez **SQL Editor**, collez le contenu de `0012_security_hardening.sql`, cliquez **Run**.
3. Si l'étape 4 échoue (contrainte `appointments_no_overlap`), des rendez-vous se chevauchent. Lancez la requête de diagnostic en commentaire dans le fichier, annulez ou déplacez les doublons, puis relancez.
4. Testez dans l'app : réservation invité, réservation client connecté, annulation par le client, bannissement depuis le dashboard pro, messagerie.
5. Répétez sur la base de production.

À savoir : les fonctions ban/unban/delete exigent maintenant un compte professionnel Supabase réel. Les dashboards qui reposent sur un faux login `localStorage` ne pourront plus bannir ni supprimer. C'est voulu (l'ancienne version laissait n'importe qui le faire), mais il faut migrer les comptes pro vers de vrais comptes Supabase (voir point 3).

6. Messagerie : dans `supabase/migrations/`, regardez les colonnes de la table `messages` (Table Editor). Si elles sont `sender`, `body`, `read_at`, décommentez les deux `DROP POLICY` en bas de la migration et relancez-les.

## 2. Secrets et envoi d'emails

- En production (Cloudflare), ne mettez pas les clés dans `.env` : `npx wrangler secret put EMAILJS_PRIVATE_KEY`, idem pour `GOOGLE_PRIVATE_KEY` et la clé de compte de service.
- Cloudflare Dashboard > votre domaine > Security > WAF > **Rate limiting rules** : créez une règle sur `/api/send-email` et `/api/calendar` (ex. 5 requêtes par minute par IP). La limite codée dans la route n'est que locale à chaque instance.
- Supabase > Authentication > URL Configuration : limitez les **Redirect URLs** à votre vrai domaine.
- Déplacez `GCP OAuth ID.txt` hors du dossier du projet (gestionnaire de mots de passe).

## 3. Rôles et collaborateurs en base (chantier de développement)

Le RBAC Diamant (`src/lib/permissions.ts`, `useAuthedProfessional.ts`) stocke encore rôles et mots de passe collaborateurs dans `localStorage`. À faire : table `team_members` avec RLS, comptes créés via `supabase.auth.admin` côté serveur, droits vérifiés par RLS. C'est un développement à part entière ; je peux le faire dans une prochaine étape.

## 4. Nom, domaine, email

1. Vérifiez `ponctuo.fr` sur afnic.fr ou chez un registrar (la vérification automatique a été bloquée par un quota).
2. Recherchez « Ponctuo » sur la base de marques de l'INPI (data.inpi.fr) et sur euipo.europa.eu, classes 9, 35 et 42.
3. Achetez le domaine (OVH, Gandi, Cloudflare Registrar), puis ajoutez-le à Cloudflare.
4. Email : voir l'étape E4 de `guide_pas_a_pas.md` (EmailJS + SPF/DKIM/DMARC de votre domaine). Retirez `EMAIL_OVERRIDE_TO` une fois en production : sinon tous les emails partent vers une seule adresse.

## 5. Juridique (avec un juriste)

- **Polices** : retirez ou achetez les licences de Monimer Serif, Cocogoose, Recoleta, Coolvetica et Type Machine (`public/fonts/`, `src/styles/global.css`). Alternative gratuite : Google Fonts / Fontsource, par exemple Playfair Display ou Cormorant (titres), Inter (texte). Supprimez ensuite les fichiers de `public/fonts/`.
- **Politique de confidentialité, CGU, mentions légales** : rédigez-les pour chaque client à partir de la liste du rapport légal (responsable de traitement, finalités, durées, sous-traitants Supabase / Cloudflare / Resend ou Brevo / Google, droits, CNIL, SIRET, hébergeur, médiation). Un modèle CNIL existe sur cnil.fr, rubrique « Modèle de mentions d'information ».
- **DPA** : acceptez en ligne les DPA de Supabase, Cloudflare, EmailJS et Google, archivez-les, et faites signer un DPA à chaque commerçant.
- **Suppression et export de compte** : la migration ajoute les fonctions `delete_my_account()` et `export_my_data()`. Il reste à ajouter deux boutons dans l'espace client qui les appellent (`supabase.rpc('delete_my_account')`).
- **Licences des dépendances** : `npx license-checker --summary`.

## 6. Produit (prochaines étapes)

Annulation et report par lien dans l'email, rappel J-1, acompte Stripe, multi-employés, lecture de l'agenda Google (`freeBusy`) avant d'afficher les créneaux Standard. Faites valider les tarifs proposés (Solo 290 € + 29 €/mois, etc.) auprès de 3 ou 4 commerçants avant de les publier.

## 7. Images et polices (optimisation)

- Convertissez `public/images/*.jpg` en WebP/AVIF (squoosh.app, ou `npx sharp-cli`).
- Créez une image 1200×630 par thème pour `og:image` et ajoutez-la dans les layouts.
- La police Recoleta est référencée dans `global.css` mais absente du dossier : supprimez la règle `@font-face` ou ajoutez le fichier.

---

## Déjà appliqué dans le code

| Changement | Fichier |
|---|---|
| Migration SQL de sécurité (non exécutée) | `supabase/migrations/0012_security_hardening.sql` |
| Route d'email durcie : même origine, validation, limite de débit, erreurs génériques | `src/pages/api/send-email.ts` |
| Échappement HTML des saisies dans les emails | `src/lib/escapeHtml.ts` + 3 formulaires |
| Mot de passe collaborateur par défaut `Pro2026!` supprimé | `DiamantRightsPanel.tsx` |
| En-têtes de sécurité (HSTS, nosniff, frame-ancestors, Referrer-Policy, Permissions-Policy) | `src/middleware.ts` |
| Case de consentement CGU + confidentialité, horodatée et versionnée | `SignupForm.tsx` |
| Allégations non tenues retirées (RGPD « strict », SMS automatisés) | `galerie/diamant.astro`, `DiamantClientProfile.tsx`, `DiamantClientFidelite.tsx` |
| Dépendances mortes retirées : `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three` | `package.json` |
| AOS joué une seule fois, animations et Lenis coupés si « réduire les animations » | layouts, `SmoothScroll.astro` |
| Hydratation allégée (`client:visible` / `client:idle`) | pages démos |
| `robots.txt` et filtre du sitemap complétés | `public/robots.txt`, `astro.config.mjs` |

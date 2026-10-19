# Guide pas à pas : ce que vous devez faire vous-même

Chaque étape précise où cliquer. Faites-les dans l'ordre. Comptez environ 2 h pour les étapes A à D, le reste est à votre rythme.

---

## A. Activer la gestion d'équipe en base (indispensable)

### A1. Exécuter la migration 0013
1. Ouvrez https://supabase.com/dashboard et choisissez votre projet.
2. Menu de gauche : **SQL Editor**, puis **New query**.
3. Ouvrez le fichier `supabase/migrations/0013_team_rbac.sql` dans VS Code, copiez tout, collez dans l'éditeur.
4. Cliquez **Run** (en bas à droite). Message attendu : « Success. No rows returned ».
5. Si une erreur apparaît, copiez-la-moi telle quelle.

### A2. Récupérer la clé « service_role »
Cette clé permet au serveur de créer des comptes collaborateurs. Elle est **secrète** : ne la collez jamais dans un fichier du projet versionné, ni dans un message public.
1. Dans Supabase : **Project Settings** (roue dentée en bas à gauche), puis **API Keys** (ou **API**).
2. Repérez la ligne **service_role** et cliquez **Reveal**, puis copiez la valeur.

### A3. La donner à votre site
**En local** (pour tester) : ouvrez le fichier `.env` du projet et ajoutez une ligne
`SUPABASE_SERVICE_ROLE_KEY=<la valeur copiée>` (une clé « Secret key » `sb_secret_...` convient)
(le fichier `.env` n'est pas envoyé sur git).

**En production (Cloudflare)** :
1. https://dash.cloudflare.com, puis **Workers & Pages**, puis cliquez sur le projet `reservation-platform`.
2. **Settings**, puis **Variables and Secrets**, puis **Add**.
3. Type **Secret**, nom `SUPABASE_SERVICE_ROLE_KEY`, collez la valeur, **Deploy**.
4. Ajoutez de la même façon, si ce n'est pas déjà fait : `EMAILJS_TEMPLATE_ID`, `EMAILJS_PRIVATE_KEY`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_CALENDAR_ID`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`.

### A4. Créer votre compte propriétaire
Le propriétaire est le compte lié à la table `professionals` (`user_id`). Si vous avez déjà un compte pro qui fonctionnait, il l'est déjà. Sinon : inscrivez-vous sur la démo, puis dans SQL Editor lancez
`select id, user_id, business_name from professionals;`
pour vérifier qu'une ligne existe avec votre `user_id`.

### A5. Créer le compte « démo » en lecture seule (pour montrer le site à des clients)
1. Supabase : **Authentication**, puis **Users**, puis **Add user**, puis **Create new user**.
2. Email `demo@votre-domaine.fr` (n'importe quel email), mot de passe de votre choix, cochez **Auto Confirm User**, puis **Create**.
3. Copiez l'**UID** de l'utilisateur créé.
4. Récupérez l'id de l'établissement : dans SQL Editor, `select id from professionals;`
5. Exécutez en remplaçant les deux valeurs :
```sql
insert into public.team_members (professional_id, user_id, name, email, role, specialty, tag_bd)
values ('<ID_ETABLISSEMENT>', '<UID_UTILISATEUR>', 'Visite démo', 'demo@votre-domaine.fr',
        'demo', 'Compte démonstration (lecture seule)', 'diamant');
```
6. Les visiteurs peuvent maintenant se connecter avec ce compte : ils voient le tableau de bord sans pouvoir rien modifier (la base l'interdit).

**Important :** l'ancien accès « sans connexion » aux dashboards des démos n'existe plus (c'était une faille). Pour montrer la démo Diamant à un prospect, donnez-lui ce compte démo. Les dashboards Premium et Standard exigent aussi une connexion : Premium a son propriétaire (`pro-premium@example.com`) ; Standard n'a aucun établissement en base pour l'instant.

### A6. Tester
1. Connectez-vous avec votre compte propriétaire, allez dans **Gestion des droits**, créez un collaborateur (mot de passe d'au moins 8 caractères).
2. Déconnectez-vous, reconnectez-vous avec ce collaborateur : il doit arriver sur le planning.
3. Connectez-vous avec le compte démo : essayez de modifier un service, la base doit refuser.

---

## B. Messagerie : vérifier une règle (2 min)
1. Supabase : **Table Editor**, table `messages`.
2. Regardez les noms de colonnes. Si vous voyez `sender`, `body`, `read_at`, ouvrez `supabase/migrations/0012_security_hardening.sql`, copiez les deux lignes `DROP POLICY` commentées tout en bas (sans les `--`) dans SQL Editor, **Run**.
3. Si vous voyez `sender_role`, `content`, `read` : ne faites rien.

---

## C. Sécuriser Cloudflare et Supabase

### C1. Limiter les abus sur l'envoi d'emails
1. https://dash.cloudflare.com, cliquez sur votre **domaine** (si vous n'en avez pas encore, faites cette étape après l'étape E).
2. **Security**, puis **WAF**, puis **Rate limiting rules**, puis **Create rule**.
3. Nom : `limite emails`. Expression : cliquez **Edit expression** et collez
`(http.request.uri.path in {"/api/send-email" "/api/calendar" "/api/team"})`
4. Caractéristique : **IP**. Seuil : **10 requêtes par 1 minute**. Action : **Block** pour 10 minutes. **Deploy**.
(Sur le sous-domaine `workers.dev` actuel, cette règle n'est pas disponible : la route a déjà une limite interne plus faible.)

### C2. Restreindre les redirections de connexion
1. Supabase : **Authentication**, puis **URL Configuration**.
2. **Site URL** : l'adresse de votre site en production.
3. **Redirect URLs** : supprimez les jokers (`*`) inutiles, gardez seulement votre domaine (et `http://localhost:4321/**` pour le développement). **Save**.

### C3. Ranger le fichier `GCP OAuth ID.txt`
Il est dans le dossier du projet. Ouvrez-le, recopiez son contenu dans votre gestionnaire de mots de passe (Bitwarden gratuit, par exemple), puis supprimez le fichier.

---

## D. Vérifier les modifications faites par le code
1. Dans le dossier du projet : `npm run dev`, ouvrez http://localhost:4321.
2. Testez : une réservation en invité, une inscription (la case de consentement doit apparaître), le bouton **Télécharger mes données** dans le profil d'un client.
3. Si tout va bien et que vous voulez enregistrer : `git add -A` puis `git commit -m "Securite, RBAC en base, RGPD"` puis `git push` (le déploiement Cloudflare suit).

---

## E. Nom, domaine et emails professionnels

### E1. Vérifier le nom
1. https://www.afnic.fr/ : cherchez `ponctuo.fr`. Cherchez aussi `ponctuo.com`, `ponctuo.io`.
2. https://data.inpi.fr/ : recherchez « Ponctuo » dans les marques. Vérifiez qu'aucune marque similaire n'existe dans les classes 9, 35 et 42 (logiciels, services aux entreprises). Faites la même recherche sur https://euipo.europa.eu/eSearch.
3. Si c'est libre : déposez la marque sur https://www.inpi.fr (environ 190 € pour 3 classes). Ce n'est pas obligatoire pour acheter le domaine, mais protège le nom.
4. Si c'est pris, les alternatives sont Atelio ou Ouvrio : refaites les mêmes vérifications.

### E2. Acheter le domaine
1. Choisissez un revendeur : OVHcloud, Gandi ou Cloudflare Registrar (au prix coûtant).
2. Achetez `ponctuo.fr` (environ 8 à 12 € par an). Activez le renouvellement automatique.
3. Si vous n'avez pas acheté chez Cloudflare : sur dash.cloudflare.com, **Add a domain**, entrez le nom, choisissez le plan gratuit, puis copiez les deux serveurs de noms (nameservers) indiqués dans l'interface de votre revendeur, rubrique « Serveurs DNS ». Attendez la validation (quelques minutes à 24 h).

### E3. Brancher le domaine au site
1. Cloudflare : **Workers & Pages**, votre projet, **Settings**, **Domains & Routes**, **Add**, **Custom domain**.
2. Entrez `ponctuo.fr` (et `www.ponctuo.fr`), validez. Cloudflare crée les DNS et le certificat HTTPS tout seul.
3. Mettez à jour `site:` dans `astro.config.mjs` avec le nouveau domaine, et l'URL du Sitemap dans `public/robots.txt`.

### E4. Emails (le projet utilise EmailJS)
Les emails de réservation et de messagerie passent par EmailJS (voir `CLAUDE.md`). Pour qu'ils partent depuis votre domaine :
1. Dans EmailJS (https://dashboard.emailjs.com), **Email Services**, ajoutez un service SMTP ou Gmail lié à une adresse de votre domaine (par exemple `reservation@ponctuo.fr`, créée via Cloudflare Email Routing ou votre hébergeur de messagerie).
2. Chez votre fournisseur de messagerie, ajoutez les enregistrements DNS demandés dans Cloudflare : **DNS**, **Records**, **Add record**, en recopiant exactement type, nom et valeur. Mettez-les en **DNS only** (nuage gris).
3. Ajoutez un enregistrement SPF s'il n'existe pas : type `TXT`, nom `@`, valeur donnée par votre fournisseur de messagerie (par exemple `v=spf1 include:_spf.google.com ~all` pour Google).
4. DMARC : type `TXT`, nom `_dmarc`, valeur `v=DMARC1; p=none; rua=mailto:dmarc@ponctuo.fr`. Après 2 à 4 semaines sans problème, passez à `p=quarantine`.
5. Testez sur https://www.mail-tester.com : visez 9/10 ou plus.
6. Si vous dépassez le quota gratuit d'EmailJS, regardez un service transactionnel (Brevo, Postmark) : dites-le-moi, j'adapterai la route `send-email`.

### E5. Adresse de réception (facultatif)
Pour recevoir `contact@ponctuo.fr`, activez **Email Routing** dans Cloudflare (gratuit) pour rediriger vers votre Gmail.

---

## F. Juridique (à faire avec un juriste ou un modèle sérieux)

### F1. Polices
Les fichiers `public/fonts/*.woff2` (Monimer Serif, Cocogoose, Coolvetica, Type Machine) sont dérivés de polices en version d'essai ou à usage personnel : tant que vous n'avez pas la licence commerciale, ne vendez pas le site tel quel. Deux options :
- **Gratuit et sûr :** remplacez-les par des polices Google Fonts. Allez sur https://fonts.google.com, choisissez par exemple *Playfair Display* (titres élégants) et *Inter* (texte), puis téléchargez-les. Dites-moi lesquelles et je mettrai à jour `src/styles/global.css`.
- **Payant :** achetez les licences « web » sur les sites des créateurs (vérifiez qu'elles autorisent l'usage pour des sites de clients).

### F2. Documents légaux
1. **Mentions légales** : https://www.cnil.fr/fr/modele/mention/mentions-legales-et-informations-sur-lhebergeur. Il faut : votre nom ou raison sociale, SIRET, adresse, email, directeur de publication, et l'hébergeur (Cloudflare Inc., 101 Townsend St, San Francisco, USA).
2. **Politique de confidentialité** : partez du modèle CNIL (https://www.cnil.fr/fr/modele/mention/modele-de-mentions-dinformation) et listez : ce que vous collectez (nom, email, téléphone, rendez-vous, messages), pourquoi, combien de temps, vos prestataires (Supabase, Cloudflare, Brevo, Google), et les droits (accès, rectification, effacement, portabilité, opposition, réclamation à la CNIL).
3. **CGU/CGV** : faites-les relire par un juriste ou une plateforme (Legalstart, Captain Contrat). Prévoyez un contrat séparé pour vos clients commerçants.
4. **DPA (accord de sous-traitance)** : dans les paramètres de chaque prestataire, cherchez « Data Processing Addendum » (Supabase : Legal > DPA ; Cloudflare : Trust Hub ; Brevo : Legal) et acceptez-le en ligne. Gardez une copie PDF.
5. Collez ensuite les textes dans les pages `mentions-legales.astro`, `politique-de-confidentialite.astro` et `conditions-utilisation.astro` de chaque démo (ou envoyez-moi les textes finaux et je les intègre).

---

## G. Fonctionnalités à venir (je peux les faire ensuite)
Annulation par lien dans l'email, rappel J-1, lecture de l'agenda Google pour Standard, acompte Stripe, multi-employés et factorisation des trois démos. Les rappels et les liens d'annulation demandent d'abord le service d'emails (étape E4).

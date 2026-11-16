# Refonte graphique : état et reprise

Fichier de passation écrit le 15/11/2026, au moment où le chantier a été mis en pause (limite d'usage). Il suffit à reprendre le travail sans l'historique de la conversation. À lire avec `brief-commun.md` (même dossier), qui contient les règles communes données aux agents.

## La demande du propriétaire

1. Refondre l'aspect graphique de tout le site, en crescendo :
   - **Standard** : reste simple, mais plus qualitatif.
   - **Premium** : meilleures animations, meilleur rendu, aucun signe distinctif d'IA.
   - **Diamant** : très avancé, animations pilotées par le défilement, dans l'esprit de wisprflow.ai.
   - **Page commerciale** : page qui se déroule avec le scroll, façon wisprflow.ai. Images à générer, à demander au propriétaire, ou à chercher sur Internet.
   - « Le but, ce n'est pas de mettre des mots-clés qui rendent le truc cher, c'est de mettre des fonctionnalités et des animations qui en mettent plein la vue. »
2. Vérifier que les tests et les dashboards fonctionnent toujours.
3. Trier les documents, factoriser ce qui est factorisable, réorganiser l'arborescence pour qu'elle soit plus simple à reprendre.
4. Écrire un `CLAUDE.md` par démonstration permettant de refaire exactement le même site : éléments principaux, textes à modifier, éléments présents, fonctionnalités, tests à passer.
5. Compte rendu final. Carte blanche, agents en parallèle encouragés, proposer des skills ou agents utiles.

## Où on en est

Branche locale **`refonte-graphique`** (créée depuis `main` à jour avec `origin/main`, commit `0a4c503`). Rien n'a été poussé. `main` est intact.

| Étape | État |
|---|---|
| Analyse de l'existant et de la documentation | fait |
| Recherche des outils d'animation et étude de wisprflow.ai | fait (résumé plus bas) |
| Socle d'animation commun, polices libres, outils de capture | fait, commité (`5210612`) |
| Suite de tests Playwright + faux backend Supabase | fait (`npm test`). Dashboards : tout passe (16/11). Échecs triés : 4 venaient des tests (corrigés), 3 défauts Diamant antérieurs corrigés (graphique au rendu serveur, hydratation de `DiamantClientNav`). Diamant sans session affichait le dashboard au lieu de renvoyer à la connexion : corrigé dans `DiamantDashboardNav.tsx` (règle confirmée par le propriétaire, voir « Accès visiteur » plus bas) |
| Refonte Standard | **fait** (16/11) : toutes les pages publiques, dashboard et espace client rhabillés ; tests pages bureau 14/14, mobile 14/14, dashboards 16/16. Reste : URL source des 4 photos de `public/images/standard/` inconnues (à retrouver ou remplacer avant mise en ligne) ; `StandardTestimonialsCarousel.tsx` n'est plus utilisé (à supprimer au tri) |
| Refonte Premium | **code écrit, vérification non terminée** (pause du 16/11) : les 13 pages publiques, en-tête, pied de page, layouts et composants de vitrine réécrits (`AutoHero`, `AutoStats`, `AutoServicesGrid` passés en `.astro`, plus `AutoEtapes`, `AutoMots`, gabarits `PremiumPageHead`, `PremiumCta`, `PremiumLegalPage`, `PremiumAuthShell`), îlots d'authentification rhabillés, images sourcées dans `public/images/premium/SOURCES.md`. L'agent en était aux captures (bande de mots, puis mobile). **Reste** : vérifier par captures (bureau, mobile, mouvement réduit), faire passer les tests Premium (commandes dans « Reprendre »), vérifier le lien d'aperçu sur la connexion et la lisibilité du dashboard / aperçu / espace client |
| Refonte Diamant | **non commencée côté code** : seules des images ont été téléchargées dans `public/images/diamant/` |
| Refonte page commerciale | **en cours, interrompue** : `CommercialLayout.astro` et `commercial.css` réécrits, composants `CadreNavigateur.astro` et `Capture.astro` créés ; `index.astro` pas encore refait |
| Build de vérification après refonte | à faire |
| Désinstallation de `aos`, `@types/aos`, `framer-motion`, suppression des polices de `public/fonts/` | à faire (après la refonte) |
| Nouvelles captures de `public/images/galerie/` | à faire (après la refonte des démos) |
| Tri, factorisation, réorganisation | à faire |
| `CLAUDE.md` par démo | à faire |
| Compte rendu | à faire |

**Attention : le dernier commit de la branche est un état intermédiaire.** Des fichiers à moitié migrés cohabitent avec des pages encore dans l'ancien style (par exemple la page commerciale : nouveau layout, ancien `index.astro`). Au moment de la pause, toutes les pages renvoyaient une erreur 500 « fetch failed » sur le serveur de dev : ce n'était pas le code, mais le processus `workerd` du serveur de dev mort après des heures de fonctionnement. Remède : `npx astro dev stop` puis `npx astro dev --port 4321`. Ne pas fusionner dans `main` avant la fin de la refonte et un `npm run build` réussi.

## Accès visiteur à l'espace pro (règle du propriétaire, 16/11/2026)

- Sans session, le tableau de bord de chaque démo renvoie vers la page de connexion de la démo.
- **Premium** : la page de connexion propose un lien vers l'aperçu à données fictives (`/demo-premium/apercu/dashboard`).
- **Diamant** : la page de connexion propose un bouton qui connecte au compte de démonstration en lecture seule (`demo@example.com`, rôle `demo` en base, `DiamantLoginForm.tsx`).
- **Standard** : aucun accès visiteur, la formule n'intègre pas ce type de fonctionnalité d'espace pro.
- Couvert par `tests/dashboards.spec.ts`. À préserver pendant la refonte des pages de connexion et à reporter dans les `CLAUDE.md` par démo.

## Constats faits pendant l'analyse

- **Supabase est injoignable** : l'hôte du projet configuré dans `.env` n'existe plus côté DNS (projet en pause ou supprimé). Les pages publiques retombent sur `src/config/site.ts`. Les dashboards connectés ne peuvent pas être testés avec la vraie base : d'où le faux backend des tests. **Action du propriétaire :** réactiver le projet dans le tableau de bord Supabase, ou en recréer un (`Documentation/restauration_bdd_complete.md`).
- **Build de référence** (`npm run build`) : réussi avant toute modification.
- **`astro dev` tourne en tâche de fond** dans Astro 7 quand il n'est pas lancé dans un terminal interactif : `npx astro dev --port 4321`, puis `npx astro dev logs`, `status`, `stop`. Le premier démarrage peut dépasser son délai de 30 s ; relancer.
- **Polices sous licence non commerciale** encore déployées (`public/fonts/` : Monimer Serif « personal use only », Cocogoose « trial », Coolvetica, Type Machine). La refonte les remplace par des polices libres Fontsource.
- **`CLAUDE.md` demande d'éviter les animations lourdes** : la demande du propriétaire va en sens inverse pour Diamant et la page commerciale. Règle à réécrire à la fin (pile retenue, règles de performance ci-dessous).
- **`src/pages/index.astro`** ligne 184 : attribut `class` cassé sur le `<h1>` ; le CSS de l'éventail référence un `.fan-inner` absent du HTML.
- **Duplication mesurée** (diff après neutralisation du préfixe Standard/Premium/Diamant), utile pour l'étape de factorisation :
  - identiques dans les trois démos : `HeaderAuthButton`, `Map`, `auth/ForgotPasswordForm`, `auth/ResetPasswordForm`, `auth/SignupForm`, `ui/AvatarPicker`, `ui/ImageCropper`, `ui/MessageThread` ;
  - identiques entre Standard et Premium : `client/AppointmentsClientPanel`, `client/ClientProfilePanel`, `dashboard/AppointmentsPanel`, `dashboard/AvailabilitiesPanel`, `dashboard/ServicesPanel`, `ui/TimePicker` ; `TestimonialsCarousel` identique entre Standard et Diamant ;
  - quasi identiques (2 à 30 lignes d'écart) : `auth/OAuthCallback`, `auth/LoginForm`, `auth/CompleteProfileForm`, `client/LoyaltyClientPanel`, `client/MessagesClientPanel`, `dashboard/ProfilePanel`, et `dashboard/AppointmentsPanel` / `ServicesPanel` côté Diamant ;
  - réellement différents : en-têtes, pieds de page, navigations, `ReservationForm`, `ClientsPanel` (environ 80 lignes d'écart), `StatsPanel`, `BanNotice`.
  - Les copies ne diffèrent souvent que par le préfixe des clés `localStorage` et des événements `window` (`standard_…`, `premium_…`) : un composant commun devra recevoir la démo en paramètre et garder ces préfixes.

## Pile retenue (issue de la recherche)

wisprflow.ai est fait avec Webflow et GSAP 3.15 (ScrollTrigger, SplitText), défilement natif, et seulement six ScrollTrigger sur toute la page : l'effet vient de deux ou trois sections fortes (une section épinglée avec aimantation d'environ sept hauteurs d'écran, une colonne collante, des témoignages en diagonale), pas d'animations partout. L'épinglage n'existe que sur bureau (≥ 992 px).

| Chantier | Outils |
|---|---|
| Standard | CSS seul + socle `data-reveal`, pas de Lenis |
| Premium | Motion vanilla (`animate`, `scroll`, `inView`) dans des `<script>` `.astro`, `position: sticky`, Lenis |
| Diamant | GSAP + ScrollTrigger + SplitText + Lenis, tout dans `gsap.matchMedia()` |
| Page commerciale | comme Diamant |

GSAP et tous ses plugins sont gratuits en usage commercial depuis avril 2025 (licence standard, non open source). À ne pas ajouter : `<ClientRouter />`, Three.js, Lottie, Rive.

Polices (Fontsource, auto-hébergées) : Standard `Instrument Sans Variable` ; Premium `Archivo Variable` (axe de largeur) ; Diamant `Fraunces Variable` + `Hanken Grotesk Variable` (y compris dashboard) ; page commerciale `Bricolage Grotesque Variable` + `Geist Variable`.

## Ce qui est en place

- `src/styles/motion.css` (importé par `base.css`) : `data-reveal`, `data-reveal-group`, `.marquee`. Actif seulement si `<html>` porte la classe `js`.
- `src/lib/motion/reveal.ts` : `initReveal()`, `initCounters()`, `pauseOffscreen()`, `prefersReducedMotion()`.
- `src/lib/motion/gsap.ts` : `gsap`, `ScrollTrigger`, `SplitText`, `MQ`, `splitLines()`, `wireScroll()`.
- `src/styles/base.css` : `overflow-x: clip` à la place de `hidden` (le `hidden` casse `position: sticky` et l'épinglage) ; police par défaut système.
- `src/components/shared/SmoothScroll.astro` : émet `lenis:ready` pour le raccord avec ScrollTrigger.
- `scripts/capture.mjs` : capture d'écran d'une page du serveur local (`node scripts/capture.mjs demo-diamant/ sortie.png --full`, options `--mobile`, `--scroll=N`, `--reduced`). Passer le chemin sans barre initiale sous Git Bash.
- `scripts/optimize-image.mjs` : télécharge une image et l'écrit en AVIF + WebP à plusieurs largeurs.
- `playwright.config.ts`, `tests/` :
  - `tests/support/supabase-mock.ts` : faux backend Supabase (intercepte REST, Auth, RPC dans le navigateur, données fictives par démo, rôles `pro` / `client` / `anonyme`) ;
  - `tests/pages.spec.ts` : toutes les pages publiques (statut 200, titre, aucune erreur JS, pas de débordement horizontal, aucun élément d'animation resté invisible, aucune image cassée, mouvement réduit, plus d'AOS ni de polices sous licence) ;
  - `tests/dashboards.spec.ts` : toutes les pages de dashboard et d'espace client des trois démos avec session simulée, redirection sans session, aperçu Premium, réservation, lecture seule du compte « démo » ;
  - lancer avec `npx playwright test` (ajouter un script `"test": "playwright test"` dans `package.json`).
  - Les 14 échecs relevés sur `dashboards.spec.ts` n'ont pas été triés. Au moins deux viennent des tests eux-mêmes : la réservation Premium/Diamant affiche les prestations dans un `<select>` (texte d'`<option>` jugé non visible), et les pages Diamant remontent un avertissement React d'hydratation (différence de `className` sur une icône entre serveur et client, défaut préexistant à corriger ou à filtrer). Les autres sont à examiner : `npx playwright test tests/dashboards.spec.ts --project=bureau --retries=0`.

## Reprendre

**Prochaine étape (au 16/11)** : terminer la vérification de Premium, en relançant un agent avec le même brief que pour Standard (lire `brief-commun.md`, la direction Premium et « Accès visiteur », puis `git diff af35227 -- src/components/premium src/layouts/premium src/pages/demo-premium src/styles/premium.css public/images/premium` pour voir le travail fait), en lui demandant de vérifier et corriger plutôt que de réécrire. Tests : `npx playwright test tests/pages.spec.ts --project=bureau -g premium --retries=0`, idem `--project=mobile`, et `npx playwright test tests/dashboards.spec.ts --project=bureau -g "premium|Premium" --retries=0`. Puis Diamant, puis la page commerciale, un chantier à la fois. Leçons de Standard à transmettre : classes maison dans `@layer components` ; pas d'enfant qui déborde dans un `data-reveal="clip"` ; un `SOURCES.md` des images par démo.


1. `git checkout refonte-graphique`, `npm ci`, `npx astro dev --port 4321`.
2. Relancer un agent par chantier (ou travailler en direct), chacun avec `Documentation/refonte/brief-commun.md` et sa direction ci-dessous. Lui dire de commencer par `git status` et `git diff` sur ses fichiers : du travail existe déjà. Les captures de l'état d'origine n'ont pas été conservées (dossier temporaire) ; `git stash` ou `git worktree` sur `main` permet de les refaire si besoin.
3. Quand les quatre chantiers sont finis : `grep` de contrôle (`data-aos`, `aos/dist`, `framer-motion`, `Coolvetica`, `Cocogoose`, `Monimer`, `Type Machine`), `npm uninstall aos @types/aos framer-motion`, suppression de `public/fonts/`, `npm run build`, `npx playwright test`.
4. Refaire les captures de `public/images/galerie/<démo>/` (mêmes noms, 1440×900 ×1,5, tailles 960 / 1600 / 2160 + vignette) avec le faux backend des tests.
5. Factorisation et réorganisation (voir « Duplication mesurée »), puis documentation : un `CLAUDE.md` par démo, mise à jour du `CLAUDE.md` racine et de `Documentation/architecture_par_demo.md`, déplacement des documents obsolètes.
6. Compte rendu au propriétaire, puis fusion dans `main` avec son accord.

## Direction artistique par chantier

Règles communes, liste de ce qui « fait IA » et consignes de vérification : `brief-commun.md`.

### Standard — « TechDom », dépannage informatique

Périmètre : `src/pages/demo-standard/**`, `src/layouts/standard/**`, `src/components/standard/**`, `src/styles/standard.css`, `public/images/standard/**`.

Clair, net, « atelier bien rangé » : fond papier, encre bleu nuit, un seul accent bleu franc, rouge en signal. Plus de halos, de dégradés, de photo sombre plein écran, de pastille à point qui pulse. Héros en deux colonnes (titre à gauche, vraie photo cadrée à droite), grille tarifaire traitée comme une carte de prix (filets, prix alignés à droite, durées), étapes numérotées avec trait de progression (`animation-timeline: view()` sous `@supports`), bandeau défilant des appareils réparés, en-tête qui se compacte, menu mobile animé accessible. Retirer `SmoothScroll` du layout. Toutes les pages publiques dans le même langage ; le dashboard hérite seulement de la police et de la palette.

### Premium — « Premium Auto », garage

Périmètre : `src/pages/demo-premium/**`, `src/layouts/premium/**`, `src/components/premium/**`, `src/styles/premium.css`, `public/images/premium/**`.

Atelier mécanique soigné : carbone / graphite, blanc cassé, un rouge unique en signal. Retirer lueurs rouges, dégradés radiaux, effet « shine », slogans (« Performances sans limite »). Mise en page de fiche technique : filets, sections numérotées, photos cadrées serré. Animations Motion vanilla : héros avec parallaxe et zoom liés au défilement, titre ligne par ligne ; chiffres en jauges SVG ; prestations en bande horizontale qui défile pendant la descente (`position: sticky` + `scroll()`), liste simple sous 992 px ; un bandeau de grands mots en contour ; barre de progression de lecture ; boutons « magnétiques » au pointeur fin. Réécrire `AutoHero`, `AutoStats`, `AutoServicesGrid` sans `framer-motion` en gardant le chargement des prestations et son repli. Le dashboard, l'aperçu et l'espace client restent clairs et lisibles : séparer les jetons du site public si celui-ci devient sombre (garder la règle des champs de formulaire blancs).

### Diamant — salon de coiffure haut de gamme

Périmètre : `src/pages/demo-diamant/**`, `src/layouts/diamant/**`, `src/components/diamant/**`, `src/styles/diamant.css`, `public/images/diamant/**`.

Éditorial : ivoire chaud, encre brun-noir, accent terre cuite, une section sombre au milieu. Retirer ronds décoratifs, pastille, étiquettes en capitales, cartes à icône, vocabulaire creux. Ne pas modifier les échelles inversées `deep-teal` / `jasmine` (utilisées par le dashboard) : ajouter des jetons propres au site public. Accueil, dans l'esprit de Wispr Flow : navigation flottante en pilule ; héros à très grand titre serif révélé ligne par ligne et photo dévoilée par masque ; bandeau défilant en serif italique ; **section épinglée « le rendez-vous, étape par étape »** (fond qui bascule au sombre, image réduite en carte portrait à coins animés, trois ou quatre étapes avec aimantation) ; **prestations en colonne collante** (image collante à gauche, liste à droite, ligne active mise en avant, lien de réservation avec service présélectionné) ; **témoignages en diagonale** sur fond sombre ; accès avec la carte Leaflet ; pied de page avec le nom du salon en très grand. Garder le logo animé `Diamant3DLogo` quelque part (promis dans l'offre). Six à dix ScrollTrigger au plus, variantes empilées sous 992 px, mouvement réduit complet. Le nom du commerce vient de `getSiteConfig()` (cookie et base), ne pas le coder en dur.

### Page commerciale — SaberWeb.dev

Périmètre : `src/pages/*.astro` (racine), `src/pages/galerie/**`, `src/layouts/commercial/**`, `src/components/commercial/**`, `src/styles/commercial.css`, `public/images/commercial/**`.

Studio web à taille humaine : fond papier, encre presque noire, un accent unique (ni violet ni rose), une section sombre. Retirer halos « aurora », grille estompée, texte en dégradé, bordure en dégradé, trois couleurs vives de formule. Structure de l'accueil : navigation en pilule ; héros à très grand titre et visuel construit avec les vraies captures des démos dans des cadres dessinés en CSS, les deux associés visibles ; bandeau défilant en texte ; **section épinglée « trois formules »** (on passe de Standard à Premium puis Diamant : la capture change, la liste de ce que la formule ajoute s'allonge, nom / prix / accroche changent, indicateur à trois crans, chaque palier garde ses trois actions : démo, détail, devis) ; **fonctionnalités en colonne collante** ; méthode en trois étapes avec trait qui se dessine ; qui sommes-nous sur fond sombre ; FAQ en deux volets ; appel final. **Aucun témoignage, logo de client ni chiffre de satisfaction inventé.** Prix uniquement depuis `src/data/devis.json`. Garder les ancres des pages galerie et la galerie de captures fonctionnelle. Corriger les deux défauts de `index.astro` cités plus haut.

## Skills et agents utiles déjà installés

- `/code-review` et `/simplify` après la factorisation ; `/security-review` avant fusion.
- `humanizer:humanizer` pour relire les textes des pages (signes d'écriture automatique).
- Agents `voltagent-dev-exp:refactoring-specialist` (factorisation), `voltagent-dev-exp:documentation-engineer` ou `technical-writer` (les `CLAUDE.md` par démo), `voltagent-biz:landing-page-copywriter` (textes de la page commerciale), `voltagent-biz:ux-researcher` (regard critique sur les parcours).
- MCP `supabase` : pour réactiver ou inspecter le projet de base de données une fois rétabli. MCP `context7` : documentation à jour d'Astro, GSAP, Motion.

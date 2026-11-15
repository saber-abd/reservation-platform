# Brief commun — refonte graphique (à lire en entier avant de commencer)

## Le projet

`C:\Users\cash31\Desktop\reservation-platform\reservation-platform` : plateforme vitrine + réservation pour indépendants, vendue en trois formules (Standard, Premium, Diamant). Chaque formule a sa démo (site public, espace client, dashboard pro) et une page commerciale (SaberWeb.dev) les présente. Stack : Astro 7 (`output: 'server'`, Cloudflare Workers), îlots React 19, Tailwind 4, Supabase. Lis `CLAUDE.md` à la racine et `Documentation/architecture_par_demo.md`.

Le propriétaire demande une refonte de l'aspect graphique de tout le site, en crescendo :

- **Standard** : reste simple, mais nettement plus qualitatif que l'existant.
- **Premium** : déjà correct, il veut de meilleures animations et un bien meilleur rendu.
- **Diamant** : doit paraître très avancé, avec de belles animations pilotées par le défilement, dans l'esprit du site wisprflow.ai.
- **Page commerciale** : même niveau que Diamant, une page qui se déroule avec le scroll, façon wisprflow.ai.

Ses mots : « Le but, ce n'est pas juste de mettre des mots-clés qui rendent le truc cher ou prestigieux. Le but, c'est de mettre des fonctionnalités, des animations qui en mettent plein la vue à l'utilisateur. » Et : « qu'il n'y ait pas de signes distinctifs d'IA dessus ».

Quatre agents travaillent en même temps, un par chantier (Standard, Premium, Diamant, page commerciale). Tu en es un. Ton chantier et ta direction artistique sont dans le message qui t'a été envoyé.

## Ce qui te revient et ce que tu ne touches pas

Tu ne modifies que les fichiers de ton chantier (liste dans ton message). Les autres agents écrivent en même temps dans les leurs : toucher un fichier hors de ta liste crée un conflit.

Ne touche jamais à :

- `src/lib/**`, `src/config/**`, `src/data/**`, `src/pages/api/**`, `supabase/**`, `src/middleware.ts`, `src/styles/base.css`, `src/styles/motion.css`, `src/components/shared/**`, `package.json`, `scripts/**`.
- La logique des îlots React fonctionnels (formulaire de réservation, authentification, panneaux de dashboard, espace client, carte Leaflet). Tu peux changer leur habillage (classes, couleurs) si c'est nécessaire à la cohérence, pas leur comportement, leurs props, leurs requêtes, leurs clés `localStorage` ni leurs événements `window`.
- Les routes : aucune page renommée ou supprimée, tous les liens et destinations de boutons existants restent valides.

Ne fais pas de `git commit`, `git push`, `git stash` ni de changement de branche (branche courante : `refonte-graphique`). Ne lance pas `npm install` / `npm uninstall` (tout est déjà installé) ni `npm run build` (le dossier `dist` est partagé entre les quatre agents ; le build sera fait à la fin par le coordinateur).

Si tu as besoin de quelque chose hors de ton périmètre (un utilitaire commun à ajouter, un bug dans le socle), ne le fais pas : signale-le dans ton rapport final.

## Socle déjà en place (à utiliser, pas à réécrire)

- `src/styles/motion.css` (importé par `base.css`, donc par tous les CSS de démo) : apparitions au défilement en CSS.
  - `data-reveal` (montée douce), `data-reveal="left|right|down|scale|fade|clip"`, `data-reveal-delay="120"` (ms), `data-reveal-group` (les enfants directs arrivent en cascade), classes `.marquee` / `.marquee-track` (bandeau défilant : mettre deux copies du contenu dans la piste).
  - Ces styles ne s'activent que si `<html>` porte la classe `js`. Ajoute dans le `<head>` de ton layout : `<script is:inline>document.documentElement.classList.add('js');</script>`.
- `src/lib/motion/reveal.ts` : `initReveal()`, `initCounters()` (`<span data-count="3500" data-count-suffix="+">`), `pauseOffscreen(selector)`, `prefersReducedMotion()`.
- `src/lib/motion/gsap.ts` (Diamant et page commerciale seulement) : exporte `gsap`, `ScrollTrigger`, `SplitText` déjà enregistrés, `MQ` (requêtes pour `gsap.matchMedia()` : `desktop`, `mobile`, `motion`, `reduced`), `splitLines(cible)` (titre révélé ligne par ligne) et `wireScroll()` (à appeler une fois après avoir créé les ScrollTrigger : raccorde Lenis et rafraîchit après chargement des polices et images).
- `src/components/shared/SmoothScroll.astro` : défilement lissé Lenis (désactivé si mouvement réduit).
- Paquets installés : `gsap` 3.15.1 (ScrollTrigger, SplitText, Flip… tous gratuits en usage commercial), `motion` 14 (API vanilla : `import { animate, scroll, inView, stagger } from 'motion'`), `lenis`.
- Polices libres installées via Fontsource. Importe celles de ton chantier dans le frontmatter de tes layouts, par exemple `import '@fontsource-variable/fraunces/index.css';`. Noms de famille CSS : `'Fraunces Variable'`, `'Hanken Grotesk Variable'`, `'Archivo Variable'`, `'Instrument Sans Variable'`, `'Bricolage Grotesque Variable'`, `'Geist Variable'`. Regarde dans `node_modules/@fontsource-variable/<police>/` les fichiers CSS disponibles si tu as besoin d'un axe particulier (largeur, italique, taille optique).

## À retirer dans ton chantier

- **AOS** : supprime `import 'aos/dist/aos.css'`, `AOS.init(...)` et tous les attributs `data-aos*` de tes fichiers (remplace par `data-reveal` ou par tes propres animations). Le paquet sera désinstallé à la fin.
- **framer-motion** : plus aucun import de `framer-motion` (le paquet sera désinstallé). Utilise `motion` vanilla dans un `<script>` de fichier `.astro`, GSAP, ou du CSS.
- **Polices sous licence non commerciale** : Monimer Serif, Cocogoose, Coolvetica, Type Machine, Recoleta. Retire leurs `@font-face` et tout usage (`font-coolvetica`, etc.) dans tes fichiers, **y compris dans le dashboard et l'espace client de ta démo** (ils partagent ton fichier CSS) : remplace par les polices libres de ton chantier. Ne supprime pas les fichiers de `public/fonts/` (le coordinateur s'en charge).

## Règles techniques (vérifiées par une recherche préalable)

1. Les animations de défilement vont dans des `<script>` de fichiers `.astro` (bundlés par Vite, exécutés une fois), pas dans des îlots React : un ScrollTrigger créé à l'hydratation naît trop tard et provoque des flashs. Un `<script>` Astro ne doit porter aucun attribut (sinon il n'est plus bundlé et les imports npm cassent).
2. Rien qui touche `window` / `document` dans un frontmatter `.astro` ni dans le corps de rendu d'un composant React : le rendu serveur tourne sur Cloudflare Workers.
3. États initiaux des animations posés en CSS sous `.js …` (pas en JS au chargement), pour éviter le flash et garder la page lisible sans JS.
4. N'anime que `transform` et `opacity` (plus `clip-path` avec parcimonie). Pas de `filter: blur()` animé, pas de WebGL, pas de Lottie, pas de vidéo en arrière-plan. Le site doit rester fluide sur des machines modestes.
5. `prefers-reduced-motion: reduce` : tout doit rester lisible et utilisable, sans animation. Avec GSAP, tout mettre dans `gsap.matchMedia()` avec les conditions `MQ`.
6. Sections épinglées (pin) seulement au-dessus de 992 px. En dessous, prévoir une variante empilée simple. Au plus 6 à 10 ScrollTrigger par page. Ne jamais animer l'élément épinglé lui-même, seulement ses enfants.
7. Toutes les images ont `width` et `height` (ou un `aspect-ratio` CSS), `loading="lazy"` et `decoding="async"` sauf l'image du héros (`fetchpriority="high"`).
8. Tailwind 4 : chaque CSS de démo déclare ses `@source`. Une classe Tailwind n'existe que si elle apparaît littéralement dans les fichiers de ta démo. Pour les états d'animation et les classes ajoutées par JS, écris du CSS dans ton fichier `src/styles/<chantier>.css` ou dans un `<style>` de la page.
9. `<main>` des layouts porte `overflow-x-hidden` : remplace par `overflow-x-clip` (le `hidden` casse `position: sticky` et l'épinglage).
10. Unités `svh` / `dvh` plutôt que `vh` pour les hauteurs plein écran.
11. Pas de `<ClientRouter />` (View Transitions d'Astro).

## Images

Les images actuelles sont en partie chargées à chaud depuis Unsplash : rapatrie-les en local.

- Source : Unsplash ou Pexels, licence gratuite uniquement (pas Unsplash+). URL directe : `https://images.unsplash.com/photo-<id>?w=2400&q=80&fm=jpg&fit=crop` ou `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=2400`.
- Outil : `node scripts/optimize-image.mjs "<url>" public/images/<chantier> <nom> [largeurs]` écrit `<nom>-<largeur>.avif` et `.webp` et affiche les dimensions.
- **Regarde chaque image téléchargée** (outil Read sur le fichier `.webp`) avant de l'utiliser : elle doit correspondre au métier, ne montrer ni logo de marque reconnaissable ni visage identifiable en gros plan, et ne pas ressembler à une image générée. Si une URL ne répond pas ou si l'image ne convient pas, cherches-en une autre.
- Sers-les avec `<picture>` (source AVIF, repli WebP), `srcset` et `sizes`.
- Note dans ton rapport l'URL source de chaque image retenue.
- Tu ne peux pas générer d'images. S'il manque un visuel que seule une création sur mesure fournirait, dessine-le en SVG/CSS ou signale-le dans ton rapport comme image à faire produire par le propriétaire (avec une description précise de ce qu'il faudrait).

## Direction : ce qui trahit un site fait par une IA (à éviter)

- Dégradés violet/rose/bleu, texte en dégradé, halos flous colorés (« aurora », « blobs »), fonds à grille estompée, verre dépoli partout.
- Pastille d'accroche au-dessus du titre avec un point qui pulse ; petites étiquettes en capitales très espacées au-dessus de chaque titre de section.
- Grille de trois cartes identiques (icône dans un carré arrondi coloré, titre, deux lignes) répétée de section en section ; tout en `rounded-2xl` avec ombre portée et soulèvement au survol.
- Emoji, icônes décoratives partout, chiffres inventés présentés comme des preuves, faux logos de clients.
- Textes creux : « excellence », « sur-mesure », « d'exception », « passion », « libérez le potentiel », « sans compromis », phrases en trois temps, slogans qui pourraient s'appliquer à n'importe quel métier. Écris des phrases concrètes qui parlent du métier de la démo (ce qu'on fait, combien de temps, à quel prix, comment ça se passe).
- Symétrie centrée systématique. Préfère une mise en page éditoriale : grille asymétrique, grands titres calés à gauche, vrais filets, numérotation, légendes, respiration.

Ce qui fait un site soigné : une typographie maîtrisée (échelle nette, interlignage serré sur les grands titres, chiffres tabulaires), peu de couleurs, de vraies photos bien cadrées, des détails d'interaction (survols, focus visibles, états actifs), une cohérence entre toutes les pages de la démo, et deux ou trois moments d'animation forts plutôt que du mouvement partout.

## Ton et contenu

- Tout en français (textes, commentaires de code).
- Ton sobre : pas de superlatifs, aucune mention d'« IA ».
- Conserve l'identité et les informations de la démo (nom du commerce, métier, adresse, horaires, prestations, prix) : elles viennent de `getSiteConfig()` et de Supabase, ne les code pas en dur là où elles sont aujourd'hui lues dynamiquement. Les prix de la page commerciale viennent uniquement de `src/data/devis.json`.
- Tu peux réécrire les textes d'habillage (titres, paragraphes) pour les rendre concrets. N'invente pas de chiffres présentés comme réels sur la page commerciale. Sur les démos, les commerces sont fictifs : des chiffres plausibles sont acceptables.
- Accessibilité : contrastes suffisants, focus visibles, `aria-label` sur les boutons à icône, textes alternatifs, navigation clavier des menus et carrousels.

## Vérifier ton travail

Un serveur de dev tourne sur `http://localhost:4321` (rechargement à chaud). S'il ne répond plus : `npx astro dev --port 4321` (il se lance en tâche de fond ; `npx astro dev logs` pour ses journaux). Ne l'arrête pas, les autres agents s'en servent.

Supabase est injoignable en ce moment (projet en pause) : les erreurs réseau vers `*.supabase.co` sont attendues, les pages publiques retombent sur le contenu de `src/config/site.ts`, et les dashboards connectés affichent leur état sans session. Ce n'est pas à corriger.

Captures d'écran (Chromium sans interface, propre à chaque appel, pas de conflit entre agents) :

```bash
node scripts/capture.mjs demo-diamant/ "<dossier>/accueil.png"                # haut de page, 1440×900
node scripts/capture.mjs demo-diamant/ "<dossier>/accueil-full.png" --full    # page entière après défilement
node scripts/capture.mjs demo-diamant/ "<dossier>/a-2400.png" --scroll=2400   # fenêtre après 2400 px de défilement
node scripts/capture.mjs demo-diamant/ "<dossier>/mobile.png" --mobile --full # 390×844
node scripts/capture.mjs demo-diamant/ "<dossier>/reduit.png" --reduced --full
```

Passe le chemin **sans barre oblique initiale** (`demo-diamant/`, `galerie/standard`, et `home` pour la racine) : Git Bash réécrit sinon le chemin. Le script affiche le statut HTTP, la hauteur de page, un éventuel débordement horizontal et les erreurs console. Écris tes captures dans ton dossier de travail (indiqué dans ton message), puis **ouvre-les avec l'outil Read et regarde-les** : c'est la seule façon de juger le rendu. N'utilise pas les outils `mcp__playwright__*` (navigateur partagé entre agents).

N'utilise pas `sleep` ; si tu dois attendre le serveur, utilise `curl --retry`.

Avant de rendre la main, vérifie au minimum :

1. Chaque page de ton chantier répond 200 (boucle `curl` sur toutes tes routes) et ne produit aucune erreur console hors Supabase.
2. Captures bureau, mobile (pas de débordement horizontal) et mouvement réduit de la page d'accueil, plus des captures à plusieurs positions de défilement pour les sections animées : regarde-les, corrige ce qui est cassé, laid ou vide (un élément resté à `opacity: 0` est le bug le plus courant).
3. Les pages du dashboard et de l'espace client de ta démo répondent toujours 200 et restent lisibles (la police a changé).
4. `grep` : plus de `data-aos`, `aos/dist`, `framer-motion`, `Coolvetica`, `Cocogoose`, `Monimer`, `Type Machine` dans tes fichiers.

## Rapport final

Ton dernier message est lu par le coordinateur, pas par le propriétaire. Donne, sans remplissage :

- la liste des fichiers créés, modifiés, supprimés ;
- pour chaque page : les sections dans l'ordre et les animations de chacune (ce qui se passe, avec quel outil) ;
- les polices, la palette (codes hexadécimaux) et les jetons CSS ;
- les images retenues (fichier, URL source, auteur si connu) ;
- le résultat de chaque vérification ci-dessus (ce qui passe, ce qui ne passe pas) ;
- ce que tu n'as pas pu faire ou vérifier, et tout ce qui demande une action hors de ton périmètre.

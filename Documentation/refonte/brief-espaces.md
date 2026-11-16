# Brief — refonte des espaces pro et clients (à lire en entier avant de commencer)

Lis d'abord `CLAUDE.md` (racine), puis `Documentation/refonte/brief-commun.md` : ses règles techniques, sa liste « ce qui trahit un site fait par une IA », ses règles de ton et d'accessibilité s'appliquent ici aussi. Les notes de recherche sont dans `Documentation/refonte/espaces-pro-client.md`. Ce brief-ci prime en cas de conflit.

## La demande

Les sites publics des trois démos viennent d'être refaits (Standard sobre, Premium plus vivant, Diamant très travaillé). Leurs **tableaux de bord pro** et **espaces clients** sont restés des copies génériques : cartes blanches `rounded-2xl`, icônes dans des carrés colorés, couleurs Tailwind en dur (`stone-*`, `rose-*`, `amber-*`), « Chargement… » en texte, `alert()`. Le propriétaire veut une vraie refonte graphique, « que ça ait de la gueule », **en gardant exactement les mêmes pages, les mêmes catégories, les mêmes données et le même fonctionnement**. Seuls changent le rendu, la mise en page et les interactions.

Crescendo : Standard propre et lisible, Premium nettement plus riche, Diamant le plus abouti. Chaque espace reprend **l'identité de son site public** (palette, polices, détails graphiques : regarde la page d'accueil de ta démo avant de commencer).

Trois agents travaillent en même temps, un par démo. Tu en es un.

## Ton périmètre

Tu ne modifies que :

- `src/components/<démo>/dashboard/**`, `src/components/<démo>/client/**`, `src/components/<démo>/ui/**` ;
- `src/layouts/<démo>/<Démo>DashboardLayout.astro` ;
- `src/pages/demo-<démo>/dashboard/**`, `src/pages/demo-<démo>/espace-client/**` (et pour Premium `src/pages/demo-premium/apercu/**`) ;
- `src/styles/<démo>.css` : **ce fichier sert aussi au site public**. Ajoute tes jetons et classes dans une section dédiée (par exemple `/* ===== Espaces connectés ===== */`, classes préfixées, ou portées par une classe posée sur le `<body>` du layout des espaces) ; ne modifie pas les règles existantes du site public.

Tu peux créer des fichiers dans ces dossiers (par exemple `src/components/<démo>/dashboard/kit/` pour tes primitives : carte, en-tête de page, squelette, état vide, pastille de statut, tableau).

Ne touche pas : `src/lib/**`, `src/config/**`, `src/data/**`, `src/pages/api/**`, `supabase/**`, `src/middleware.ts`, `src/styles/base.css`, `src/styles/motion.css`, `src/components/shared/**`, `package.json`, `scripts/**`, `tests/**`, ni les fichiers des autres démos, ni les composants du site public de ta démo (en-tête, pied de page, accueil, `auth/` hormis s'ils sont rendus dans tes pages… dans le doute, ne touche pas `auth/`).

Ne fais pas de `git commit`, `git push`, `git stash`, de changement de branche, de `npm install` ni de `npm run build`. Si tu as besoin de quelque chose hors périmètre, signale-le dans ton rapport.

## Ce qui ne doit pas changer (fonctionnement)

- Les requêtes (`@/lib/queries`, `useAuthedProfessional`, etc.), les props des îlots, les clés `localStorage` et leurs préfixes (`standard_…`, `premium_…`), les événements `window`, les redirections vers la connexion sans session, la logique des rôles et de la lecture seule (`isRoleReadOnly`, `my_pro_context`, bouton du compte de démonstration Diamant, aperçu Premium à données fictives).
- Chaque page garde son contenu et ses actions (onglets, filtres, modales, formulaires, boutons). Tu peux réorganiser leur présentation : un tableau devient une liste de cartes sur mobile, une modale devient un panneau latéral, une action secondaire passe dans un menu. Aucune fonctionnalité ne disparaît, aucune n'est inventée qui écrirait en base.
- Tu peux remplacer `alert()` par une notification `sonner` (même message). Tu peux ajouter des vues calculées à partir des données déjà chargées (par exemple un agenda de la semaine à partir des rendez-vous déjà récupérés, un compteur « à confirmer »), sans nouvelle requête.
- Les textes affichés que les tests lisent : le titre « Vue d'ensemble » (Diamant, rôle `heading`), les noms des clients et des prestations. Tant qu'une page charge, n'affiche pas un texte qui contient « chargement » une fois les données arrivées ; pendant le chargement, préfère des squelettes (tu peux leur donner `aria-busy` / un texte masqué « Chargement… »).

## Outils disponibles (déjà installés)

| Outil | Usage |
|---|---|
| `motion` (`import { motion, AnimatePresence } from 'motion/react'`) | entrées de listes, panneaux latéraux, indicateur d'onglet qui glisse (`layoutId`), transitions entre vues. Toujours respecter `useReducedMotion()` |
| `@number-flow/react` (`import NumberFlow from '@number-flow/react'`) | chiffres qui roulent quand ils changent (chiffre d'affaires, compteurs, points de fidélité). Premium et Diamant ; Standard au plus sur un ou deux chiffres |
| `sonner` (`import { Toaster, toast } from 'sonner'`) | confirmations d'action et messages de lecture seule. Monte un seul `<Toaster />` (îlot React) dans le layout des espaces, habillé aux couleurs de la démo |
| `cmdk` (`import { Command } from 'cmdk'`) | **Diamant seulement** : palette Ctrl+K (aller à une page, chercher un client parmi ceux déjà chargés par la recherche existante) |
| `recharts` | graphiques : soigne-les (axes discrets, pas de quadrillage chargé, dégradé léger sous la courbe, info-bulle maison aux couleurs de la démo) |
| `lucide-react`, shadcn / base-ui existants | icônes et composants de base : réhabille-les plutôt que de les remplacer |

Pas de GSAP ni de Lenis dans les espaces connectés. Pas de nouvelle dépendance. L'agenda se fait en CSS Grid maison (colonnes jours, lignes heures, blocs positionnés, ligne « maintenant »).

Contraintes : rien qui lise `window` / `localStorage` / `document` pendant le rendu d'un composant React (seulement dans `useEffect` ou des gestionnaires) ; pas de `lazy` + `Suspense` rendu côté serveur ; garde les directives `client:*` existantes sauf raison claire.

## Pistes de mise en page (à adapter au niveau de ta démo)

- **Coque** : barre latérale à l'identité de la démo (logo, navigation avec état actif net, repliable sur bureau si pertinent), en-tête de page cohérent (titre, sous-titre concret, actions à droite). Sur mobile, barre d'onglets en bas ou menu propre ; jamais de débordement horizontal.
- **Accueil du dashboard** : le statut avant le reste (ce qui demande une action : rendez-vous à confirmer, messages non lus), puis les chiffres. Grille « bento » : une carte dominante (rendez-vous du jour ou prochain client), des cartes secondaires de tailles différentes. Pas quatre cartes identiques alignées.
- **Un chiffre principal par carte**, grand, chiffres tabulaires (`font-variant-numeric: tabular-nums`), éventuellement une petite courbe.
- **Rendez-vous / disponibilités** : vue agenda (jour / semaine) quand la page s'y prête, en plus ou à la place de la liste, avec les mêmes actions.
- **Clients** : tableau dense et net (filets fins, survol de ligne, recherche instantanée côté client), fiche en panneau latéral glissant.
- **Pastilles de statut** cohérentes et sobres (pas d'arc-en-ciel Tailwind).
- **États vides dessinés** (petit SVG simple + action) et **squelettes** à la place de « Chargement… ».
- **Divulgation progressive** : actions secondaires dans des menus.
- **Espace client** façon application : carte « prochain rendez-vous » en tête (date en très grand, prestation, adresse, actions existantes), fidélité en carte à tampons ou jauge animée, messages en bulles, profil sobre.
- Focus visibles, contrastes suffisants, `aria-label` sur les boutons à icône, navigation clavier des onglets, menus et panneaux (Échap ferme).

## Vérifier ton travail

Un serveur de dev tourne sur `http://localhost:4321` (ne l'arrête pas ; s'il répond 500 « fetch failed » partout, signale-le). Pas de `sleep`.

Captures avec session simulée (faux backend Supabase des tests) :

```bash
CAPTURE_OUT="<ton dossier>" CAPTURE_DEMO=<démo> CAPTURE_ROLE=pro CAPTURE_PATHS="dashboard/,dashboard/clients" \
  npx playwright test tests/capture-espaces.spec.ts --project=bureau --retries=0
```

Options : `CAPTURE_ROLE=client` avec `CAPTURE_PATHS="espace-client/,espace-client/fidelite"`, `CAPTURE_MOBILE=1`, `CAPTURE_REDUCED=1`, `CAPTURE_FULL=1`, `CAPTURE_PROROLE=demo` (Diamant). Pour l'aperçu Premium, passe des chemins absolus (`/demo-premium/apercu/dashboard/`). La sortie console indique le débordement horizontal et les exceptions. **Ouvre chaque capture avec l'outil Read et regarde-la.** Les captures « avant » sont dans `C:/Users/cash31/AppData/Local/Temp/claude/6bad0d612d4c7427/3ed5adfd-7b8d-4fc7-b4a8-cb94f6e5981e/scratchpad/avant/<démo>/`.

Tests (doivent rester verts) :

```bash
npx playwright test tests/dashboards.spec.ts --project=bureau -g "<démo>"
```

(Pour Premium, ajoute `-g "aperçu Premium"` dans un second passage ; pour Diamant, le test « compte démo en lecture seule ».) Un test qui échoue une fois puis passe au second essai est toléré, signale-le.

Avant de rendre la main :

1. Toutes les pages du dashboard et de l'espace client de ta démo répondent 200, s'affichent avec données, sans exception (tests verts).
2. Captures bureau de **chaque** page des deux espaces, mobile des principales (pas de débordement), mouvement réduit d'une page animée. Regardées et corrigées.
3. `grep` dans ton périmètre : plus de `alert(` (sauf raison), plus de couleurs Tailwind en dur pour l'identité (`stone-`, `rose-`, `amber-`… remplacées par tes jetons ; le vert/rouge des statuts peut rester s'il est cohérent), plus de « Chargement... » en texte brut visible.
4. Le site public de ta démo n'a pas bougé : capture de sa page d'accueil (`node scripts/capture.mjs demo-<démo>/ "<dossier>/accueil.png"`) comparée à l'avant.

## Rapport final

Ton dernier message est lu par le coordinateur. Sans remplissage :

- fichiers créés, modifiés, supprimés ;
- pour chaque page : ce qui a changé (mise en page, composants, animations, outil utilisé) ;
- jetons CSS ajoutés (couleurs en hexadécimal, polices, rayons) ;
- résultats des vérifications (ce qui passe, ce qui ne passe pas, tests instables) ;
- ce que tu n'as pas pu faire, et ce qui demande une action hors de ton périmètre.

Si tu reçois l'instruction de t'arrêter (quota), arrête-toi proprement : laisse le code dans un état qui compile, et rends un rapport de ce qui est fait et de ce qui reste.

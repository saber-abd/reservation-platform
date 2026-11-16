# Prochain chantier : refonte des espaces pro et clients (notes, rien de commencé)

Demande du propriétaire (16/11/2026) : refonte graphique des tableaux de bord (espaces pro) et des espaces clients des trois démos, « que ça ait de la gueule ». **Garder exactement les mêmes catégories et les mêmes pages**, la même logique, les mêmes données. Seulement le rendu, la mise en page et les interactions. À lancer à la prochaine session, avec son accord.

## Pages concernées (inchangées)

| Démo | Tableau de bord | Espace client |
|---|---|---|
| Standard | index (rendez-vous), services, disponibilites, clients, statistiques, profil | index, fidelite, messages, profil |
| Premium | idem Standard + aperçu à données fictives `apercu/dashboard/*` | index, fidelite, messages, profil |
| Diamant | index (vue d'ensemble), disponibilites (planning), clients, messages, services, statistiques, recherche, profil, droits | index, historique, fidelite, messages, profil |

Règles à préserver : redirection vers la connexion sans session, bouton du compte de démonstration Diamant (lecture seule), lien d'aperçu Premium, rôles Admin / Employé / Démo de Diamant, préfixes `standard_` / `premium_` des clés `localStorage` et des événements, échelles `deep-teal` / `jasmine` inversées de Diamant. Tests : `tests/dashboards.spec.ts` doit rester vert.

## Crescendo à garder

- **Standard** : propre et lisible, palette du site (papier, bleu nuit, bleu franc), Instrument Sans. Peu d'animation (transitions CSS, chiffres qui défilent).
- **Premium** : carbone / blanc cassé / rouge signal en accents, Archivo, chiffres en jauges comme sur le site, transitions Motion.
- **Diamant** : ivoire / brun / terre cuite, Fraunces pour les titres et les grands chiffres, Hanken Grotesk ; le plus riche (palette de commandes, panneaux latéraux animés, graphiques soignés).

Chaque espace reprend l'identité de son site public : aujourd'hui les dashboards sont des copies génériques (cartes blanches, `rounded-2xl`, icônes dans des carrés colorés).

## Styles de mise en page à retenir (recherche du 16/11)

- **Grille « bento »** pour la page d'accueil du dashboard : une carte dominante (rendez-vous du jour / prochain client), des cartes secondaires de tailles différentes (chiffre d'affaires de la semaine, taux de remplissage, prochains créneaux libres), pas trois cartes identiques.
- **Le statut avant le reste** : en haut, ce qui demande une action (rendez-vous à confirmer, messages non lus), puis les chiffres.
- **Un chiffre principal par carte** (style Stripe / Vercel), en grand, chiffres tabulaires, avec une petite courbe (sparkline) plutôt qu'un graphique plein.
- **Agenda visuel** pour les rendez-vous et disponibilités : vue jour / semaine en colonnes horaires, blocs colorés par prestation, ligne « maintenant ».
- **Tableaux denses et nets** pour les clients (filets, survol de ligne, tri, recherche instantanée), fiche client en panneau latéral glissant plutôt qu'en page.
- **Divulgation progressive** : actions secondaires dans des menus contextuels ou des popovers, pas tous les boutons affichés.
- **États vides dessinés** (illustration SVG simple + action) et **squelettes de chargement** à la place des « Chargement… ».
- **Navigation** : barre latérale fine avec icônes et libellés, repliable ; sur mobile, barre d'onglets en bas (espace client surtout).
- **Espace client** façon application mobile : carte « prochain rendez-vous » en tête (date en très grand, adresse, bouton itinéraire / annuler), fidélité en carte à tampons ou jauge animée, messagerie en bulles.

## Outils envisagés (à valider, rien n'est installé)

| Besoin | Outil | Remarque |
|---|---|---|
| Graphiques | **Recharts** (déjà installé) | rester dessus ; soigner le style (axes discrets, dégradé léger sous la courbe, info-bulles maison) plutôt qu'ajouter Tremor ou visx |
| Chiffres animés | `@number-flow/react` | chiffres qui roulent au changement (chiffre d'affaires, compteurs) ; léger |
| Palette de commandes (Diamant, éventuellement Premium) | `cmdk` | Ctrl+K : aller à une page, chercher un client, créer un rendez-vous ; s'appuie sur la recherche existante |
| Notifications | `sonner` | confirmations d'action (rendez-vous confirmé, prestation enregistrée) au lieu d'alertes ou de textes statiques |
| Panneau du bas sur mobile | `vaul` | fiche client, détail d'un rendez-vous sur téléphone |
| Agenda | à décider : **Schedule-X** (moderne, léger, React) ou une grille maison en CSS Grid | FullCalendar est lourd ; react-big-calendar vieillit. Une grille maison suffit peut-être pour jour / semaine |
| Animations | **Motion** (déjà installé) : `AnimatePresence`, `layout` pour les listes, onglets à indicateur glissant | pas de GSAP dans les dashboards (pas de défilement scénarisé) |
| Composants de base | shadcn / base-ui déjà présents | réhabiller plutôt que remplacer |

Contraintes : machines modestes (pas d'animation lourde, `client:visible` / `client:idle` quand possible), rien qui lise `window` au rendu serveur, pas de `lazy` + Suspense rendu côté serveur.

## Ordre proposé

1. Profiter du chantier pour **factoriser** (voir « Duplication mesurée » dans `REPRISE.md`) : un seul composant par panneau, recevant la démo et son thème, au lieu de trois copies. Sinon la refonte serait à faire trois fois.
2. Définir les jetons de thème des espaces par démo (couleurs, polices, rayons, ombres) dans chaque `<démo>.css`.
3. Refaire la coque (barre latérale, en-tête, navigation mobile), puis l'accueil du dashboard (bento), puis l'agenda, les clients, les statistiques, le profil.
4. Espace client : accueil (prochain rendez-vous), fidélité, messages, profil.
5. Vérifier : `npx playwright test tests/dashboards.spec.ts`, captures avec le faux backend (session simulée), mouvement réduit, mobile.
6. Refaire ensuite les captures de `public/images/galerie/` (elles montrent les anciens dashboards).

## Sources consultées

- https://www.saasframe.io/blog/the-anatomy-of-high-performance-saas-dashboard-design-2026-trends-patterns
- https://saasui.design/blog/7-saas-ui-design-trends-2026
- https://925studios.co/blog/saas-dashboard-design-examples-2026
- https://dev.to/logrocket/best-react-scheduler-component-libraries-4gaa
- https://www.pkgpulse.com/guides/recharts-v3-vs-tremor-vs-nivo-react-charting-2026
- https://www.npmjs.com/package/cmdk

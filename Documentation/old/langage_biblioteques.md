# Stack front-end moderne — Recommandations techniques

Objectif : obtenir un rendu "premium" façon Squarespace (grandes sections animées au scroll, transitions fluides, typographie soignée) tout en restant cohérent avec la stack déjà choisie pour le projet (Cloudflare + Supabase).

---

## Langage / Framework

- **TypeScript** partout — autocomplétion, moins de bugs, s'intègre nativement avec les types générés par Supabase.

- **Partie vitrine (site public)** : **Astro**
  Framework le plus adapté à ce type de site : génère du HTML quasi statique par défaut (ultra rapide, excellent SEO), et permet d'injecter des composants React/Vue uniquement là où il y a besoin d'interactivité (ex: le formulaire de réservation). C'est la stack typique des landing pages à fort impact visuel.

- **Partie dashboard/admin (espace client connecté)** : **Next.js** (React)
  Plus adapté à une application avec état, routes protégées, logique métier — utile pour l'espace professionnel de la Version 1 (comptes utilisateurs).

- **Alternative simplifiée** : si un seul framework est préféré pour tout le projet plutôt que deux, partir directement sur **Next.js** — le plus utilisé, le mieux documenté, avec un adaptateur officiel pour Cloudflare (OpenNext).

Astro et Next.js se déploient tous les deux sans friction sur Cloudflare Pages.

---

## Bibliothèques par catégorie

### CSS / Design system
| Librairie | Utilité |
|---|---|
| **Tailwind CSS** | Standard actuel pour construire un design sur-mesure rapidement, sans CSS classique. Quasi indispensable pour ce style de site. |
| **shadcn/ui** | Générateur de composants (boutons, modales, menus...) copiés dans le projet et entièrement personnalisables. Look très moderne, extrêmement répandu. |
| **Radix UI** | Primitives accessibles (dropdown, dialog, tooltip...) sur lesquelles shadcn/ui est construit — utile pour repartir de zéro. |

### Animations & effets de scroll (cœur du style "Squarespace")
| Librairie | Utilité |
|---|---|
| **Motion** (anciennement *Framer Motion*, renommé en 2024) | Librairie d'animation React la plus utilisée. Transitions de page, apparitions au scroll (`whileInView`), animations de layout. |
| **GSAP** (GreenSock) + plugin **ScrollTrigger** | Référence historique pour animations complexes et très performantes ; ScrollTrigger lie précisément les animations à la position de scroll (parallax, textes révélés, sections épinglées). |
| **Lenis** | Scroll fluide "inertiel" (effet velouté des sites premium), se combine bien avec GSAP ou Motion. |
| **AOS (Animate On Scroll)** | Solution simple et légère pour des animations basiques d'apparition au scroll. |
| **Aceternity UI** / **Magic UI** | Composants déjà animés, pensés pour le style "landing page SaaS moderne" (halos, bordures lumineuses, textes défilants...). Permettent d'aller vite avec un rendu soigné. |

### Effets 3D / visuels immersifs (optionnel)
| Librairie | Utilité |
|---|---|
| **Three.js** | Moteur 3D/WebGL pour arrière-plans immersifs en hero section. |
| **React Three Fiber** | Wrapper React de Three.js, plus simple à intégrer dans un projet React/Next.js. |
| **Vanta.js** | Arrière-plans animés (vagues, particules, brouillard...) clé en main, sans connaissances 3D. |

### Formulaires & validation
| Librairie | Utilité |
|---|---|
| **React Hook Form** | Librairie de formulaires la plus utilisée en React, performante et légère. |
| **Zod** | Validation de schéma, s'utilise avec React Hook Form et avec Supabase (types partagés). |

### Icônes & polices
| Librairie | Utilité |
|---|---|
| **Lucide** | Set d'icônes moderne et complet, utilisé par défaut avec shadcn/ui. |
| **Fontsource** (ou `next/font` sous Next.js) | Auto-hébergement des polices Google Fonts pour gagner en performance. |

### Carrousels / sliders
| Librairie | Utilité |
|---|---|
| **Embla Carousel** | Léger, très personnalisable, celui utilisé par shadcn/ui. |
| **Swiper** | Plus complet, très répandu, avec de nombreux effets prêts à l'emploi (fade, cube, coverflow...). |

### Cartes / localisation
| Librairie | Utilité |
|---|---|
| **Mapbox GL JS** | Cartes très personnalisables visuellement, pour matcher un design premium. |
| **Leaflet** | Alternative open-source plus simple, gratuite sans limite d'usage. |

---

## Combo recommandé pour le projet

**Astro + Tailwind CSS + Motion (ou GSAP/ScrollTrigger pour les effets de scroll avancés) + shadcn/ui + React Hook Form/Zod + Embla Carousel**, avec `supabase-js` branché directement pour le formulaire de réservation.

C'est la stack typique des sites "modernes" actuels, et elle se déploie sans friction sur Cloudflare Pages.
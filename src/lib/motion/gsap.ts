// Point d'entrée GSAP (Diamant et page commerciale uniquement).
// Navigateur uniquement : à importer depuis un <script> de fichier .astro, jamais
// depuis le frontmatter ni depuis un composant React rendu côté serveur.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

// La barre d'adresse mobile change la hauteur de fenêtre pendant le défilement :
// sans ce réglage, les sections épinglées sautent.
ScrollTrigger.config({ ignoreMobileResize: true });

/** Conditions à passer à gsap.matchMedia() : épinglage sur bureau seulement, rien si mouvement réduit. */
export const MQ = {
	desktop: '(min-width: 992px) and (prefers-reduced-motion: no-preference)',
	mobile: '(max-width: 991.98px) and (prefers-reduced-motion: no-preference)',
	motion: '(prefers-reduced-motion: no-preference)',
	reduced: '(prefers-reduced-motion: reduce)',
} as const;

let wired = false;

/**
 * À appeler une fois par page, après la création des ScrollTrigger :
 * relie Lenis (s'il est actif) et recalcule les positions quand les polices
 * et les images ont fini de charger.
 */
export function wireScroll() {
	if (wired) return;
	wired = true;
	const link = () => {
		const lenis = (window as any).lenis;
		if (lenis?.on) lenis.on('scroll', ScrollTrigger.update);
	};
	link();
	window.addEventListener('lenis:ready', link, { once: true });
	document.fonts?.ready.then(() => ScrollTrigger.refresh());
	if (document.readyState !== 'complete') {
		window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
	}
}

/**
 * Titre révélé ligne par ligne (masque), au défilement.
 * autoSplit redécoupe quand la police arrive ou que la largeur change.
 */
export function splitLines(target: string | Element, vars: gsap.TweenVars = {}) {
	return SplitText.create(target, {
		type: 'lines',
		mask: 'lines',
		autoSplit: true,
		onSplit: (self) =>
			gsap.from(self.lines, {
				yPercent: 110,
				duration: 1.1,
				ease: 'power4.out',
				stagger: 0.09,
				scrollTrigger: { trigger: self.elements[0], start: 'top 85%', once: true },
				...vars,
			}),
	});
}

export { gsap, ScrollTrigger, SplitText };

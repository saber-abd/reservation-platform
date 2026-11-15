// Apparitions au défilement, sans dépendance (~0,5 Ko). Styles : src/styles/motion.css.
// Navigateur uniquement : à importer depuis un <script> de fichier .astro.

export const prefersReducedMotion = () =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Révèle les éléments [data-reveal] et [data-reveal-group] à leur entrée dans l'écran. */
export function initReveal(root: ParentNode = document) {
	const items = root.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-group]');
	const show = (el: HTMLElement) => el.classList.add('is-revealed');

	items.forEach((el) => {
		const delay = el.dataset.revealDelay;
		if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
		if (el.hasAttribute('data-reveal-group')) {
			Array.from(el.children).forEach((child, i) =>
				(child as HTMLElement).style.setProperty('--i', String(i)),
			);
		}
	});

	if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
		items.forEach(show);
		return;
	}
	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				show(entry.target as HTMLElement);
				io.unobserve(entry.target);
			}
		},
		{ rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
	);
	items.forEach((el) => io.observe(el));
}

/** Met en pause les animations continues (bandeaux, fonds) hors de l'écran : pose .is-offscreen. */
export function pauseOffscreen(selector: string) {
	if (!('IntersectionObserver' in window)) return;
	const io = new IntersectionObserver((entries) => {
		for (const e of entries) e.target.classList.toggle('is-offscreen', !e.isIntersecting);
	});
	document.querySelectorAll(selector).forEach((el) => io.observe(el));
}

/** Compteur animé : <span data-count="3500" data-count-suffix="+">3500+</span>. */
export function initCounters(root: ParentNode = document, duration = 1600) {
	const els = root.querySelectorAll<HTMLElement>('[data-count]');
	if (!els.length || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
	const fmt = new Intl.NumberFormat('fr-FR');
	const render = (el: HTMLElement, v: number) =>
		(el.textContent = fmt.format(Math.round(v)) + (el.dataset.countSuffix ?? ''));
	els.forEach((el) => render(el, 0));
	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const el = entry.target as HTMLElement;
				io.unobserve(el);
				const target = Number(el.dataset.count);
				const start = performance.now();
				const tick = (now: number) => {
					const t = Math.min((now - start) / duration, 1);
					render(el, target * (1 - Math.pow(1 - t, 4)));
					if (t < 1) requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			}
		},
		{ threshold: 0.6 },
	);
	els.forEach((el) => io.observe(el));
}

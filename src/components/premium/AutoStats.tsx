import { useEffect, useRef, useState } from 'react';

const stats = [
	{ label: "Véhicules Réparés", value: 3500, suffix: "+" },
	{ label: "Clients Fidèles", value: 98, suffix: "%" },
	{ label: "Points de Contrôle", value: 120, suffix: "" },
	{ label: "Années d'Expertise", value: 15, suffix: "" },
];

const DURATION = 2000;
// Équivalent de l'easing "power2.out" de GSAP.
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

export default function AutoStats() {
	const containerRef = useRef<HTMLElement>(null);
	const numbersRef = useRef<(HTMLSpanElement | null)[]>([]);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let frame = 0;
		const animate = () => {
			const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			const start = performance.now();
			const tick = (now: number) => {
				const progress = reduceMotion ? 1 : Math.min((now - start) / DURATION, 1);
				numbersRef.current.forEach((el, index) => {
					if (el) el.textContent = Math.round(stats[index].value * easeOut(progress)) + stats[index].suffix;
				});
				if (progress < 1) frame = requestAnimationFrame(tick);
			};
			frame = requestAnimationFrame(tick);
		};

		// Déclenche une seule fois quand le haut de la section atteint 80 % de la hauteur d'écran.
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				setVisible(true);
				animate();
			},
			{ rootMargin: '0px 0px -20% 0px' },
		);
		observer.observe(container);

		return () => {
			observer.disconnect();
			cancelAnimationFrame(frame);
		};
	}, []);

	return (
		<section ref={containerRef} className="py-24 bg-stone-900 border-y border-stone-800">
			<div className="max-w-6xl mx-auto px-6">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
					{stats.map((stat, i) => (
						<div
							key={i}
							className={`stat-card flex flex-col items-center text-center transition-all duration-700 ease-out motion-reduce:transition-none ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
							style={{ transitionDelay: `${i * 100}ms` }}
						>
							<div className="text-4xl md:text-5xl lg:text-6xl font-black text-white font-[var(--font-heading)] mb-2">
								<span ref={(el) => { numbersRef.current[i] = el; }}>0</span>
							</div>
							<div className="text-sm md:text-base font-medium text-stone-400 uppercase tracking-wider">
								{stat.label}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

if (typeof window !== 'undefined') {
	gsap.registerPlugin(ScrollTrigger);
}

const stats = [
	{ label: "Véhicules Réparés", value: 3500, suffix: "+" },
	{ label: "Clients Fidèles", value: 98, suffix: "%" },
	{ label: "Points de Contrôle", value: 120, suffix: "" },
	{ label: "Années d'Expertise", value: 15, suffix: "" },
];

export default function AutoStats() {
	const containerRef = useRef<HTMLDivElement>(null);
	const numbersRef = useRef<(HTMLSpanElement | null)[]>([]);

	useEffect(() => {
		if (!containerRef.current) return;
		
		const ctx = gsap.context(() => {
			numbersRef.current.forEach((el, index) => {
				if (!el) return;
				const target = stats[index].value;
				
				gsap.fromTo(el, 
					{ innerHTML: 0 },
					{
						innerHTML: target,
						duration: 2,
						ease: "power2.out",
						scrollTrigger: {
							trigger: containerRef.current,
							start: "top 80%",
							once: true
						},
						snap: { innerHTML: 1 },
						onUpdate: function() {
							el.innerHTML = Math.round(Number(this.targets()[0].innerHTML)).toString() + stats[index].suffix;
						}
					}
				);
			});
			
			gsap.from(".stat-card", {
				y: 50,
				opacity: 0,
				duration: 0.8,
				stagger: 0.1,
				scrollTrigger: {
					trigger: containerRef.current,
					start: "top 80%",
					once: true
				}
			});
		}, containerRef);

		return () => ctx.revert();
	}, []);

	return (
		<section ref={containerRef} className="py-24 bg-stone-900 border-y border-stone-800">
			<div className="max-w-6xl mx-auto px-6">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
					{stats.map((stat, i) => (
						<div key={i} className="stat-card flex flex-col items-center text-center">
							<div className="text-4xl md:text-5xl lg:text-6xl font-black text-white font-[var(--font-heading)] mb-2">
								<span ref={(el) => numbersRef.current[i] = el}>0</span>
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

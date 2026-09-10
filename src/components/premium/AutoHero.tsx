import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function AutoHero({ basePath }: { basePath: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start start", "end start"]
	});

	const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
	const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

	return (
		<section ref={ref} className="relative min-h-screen w-full overflow-hidden bg-stone-950 flex flex-col items-center justify-center pb-24">
			{/* Background Parallax Image */}
			<motion.div 
				style={{ y, opacity }}
				className="absolute inset-0 z-0 will-change-transform"
			>
				{/* Darker overlay instead of bright white */}
				<div className="absolute inset-0 bg-stone-950/70 z-10" />
				<img 
					src="https://images.unsplash.com/photo-1611016186353-9af58c69a533?q=80&w=2071&auto=format&fit=crop" 
					alt="Premium Garage" 
					className="w-full h-full object-cover object-center grayscale-[0.2]"
				/>
			</motion.div>

			<div className="relative z-20 flex flex-col items-center text-center px-6 max-w-5xl mx-auto mt-20">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, ease: "easeOut" }}
				>
					<span className="inline-block py-1 px-3 rounded-full bg-stone-900 border border-stone-800 text-primary text-sm font-semibold tracking-widest uppercase mb-6 shadow-sm">
						Excellence Mécanique
					</span>
				</motion.div>
				
				<motion.h1 
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
					className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter uppercase leading-[0.9]"
					style={{ fontFamily: 'var(--font-heading)' }}
				>
					Performances <br/>
					<span className="text-primary">
						Sans Limite
					</span>
				</motion.h1>

				<motion.p 
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 1, delay: 0.6 }}
					className="mt-8 max-w-2xl text-lg text-stone-300 md:text-xl font-medium"
				>
					Diagnostic de précision, entretien sur-mesure et réparation haute performance. Confiez votre véhicule à nos experts passionnés.
				</motion.p>

				<motion.div 
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.8 }}
					className="mt-12 flex flex-col sm:flex-row gap-4 mb-8"
				>
					<a 
						href={`${basePath}/reservation`} 
						className="relative overflow-hidden group rounded-xl bg-primary px-8 py-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 uppercase tracking-wider"
					>
						<div className="absolute inset-0 w-full h-full bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-[shine_1s_ease-out_forwards]"></div>
						Réserver un diagnostic
					</a>
					<a 
						href={`${basePath}/services`} 
						className="rounded-xl border border-stone-800 bg-stone-900/80 backdrop-blur-sm px-8 py-4 text-sm font-bold text-white transition-colors hover:bg-stone-800 hover:border-stone-600 uppercase tracking-wider shadow-sm"
					>
						Découvrir nos services
					</a>
				</motion.div>
			</div>
			
			<motion.div 
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1.5, duration: 1 }}
				className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
			>
				<span className="text-xs font-medium uppercase tracking-widest text-stone-500">Scroll</span>
				<div className="w-[2px] h-12 bg-stone-800 overflow-hidden">
					<div className="w-full h-1/2 bg-primary animate-[scroll_2s_ease-in-out_infinite]" />
				</div>
			</motion.div>
		</section>
	);
}

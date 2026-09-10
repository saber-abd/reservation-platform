import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Wrench, CheckCircle, Car, Settings, Droplets, Sparkles } from 'lucide-react';

const services = [
	{
		title: 'Diagnostic Avancé',
		description: 'Analyse électronique complète avec valise constructeur dernière génération.',
		icon: Settings,
		price: 'À partir de 49€'
	},
	{
		title: 'Bilan de Santé',
		description: 'Vérification de 50 points de contrôle vitaux pour la sécurité de votre véhicule.',
		icon: CheckCircle,
		price: 'Forfait 79€'
	},
	{
		title: 'Réparation Moteur',
		description: 'Intervention experte sur toutes mécaniques, de la courroie de distribution à la culasse.',
		icon: Wrench,
		price: 'Sur devis'
	},
	{
		title: 'Changement de Pneus',
		description: 'Montage, équilibrage et parallélisme 3D pour une tenue de route optimale.',
		icon: Car,
		price: 'Dès 15€ / pneu'
	},
	{
		title: 'Lavage Extérieur',
		description: 'Nettoyage haute pression, canon à mousse et traitement déperlant céramique.',
		icon: Droplets,
		price: 'À partir de 25€'
	},
	{
		title: 'Détailing Intérieur',
		description: 'Shampoing des sièges, pressing moquettes et soin des cuirs.',
		icon: Sparkles,
		price: 'Forfait 89€'
	},
];

export default function AutoServicesGrid({ basePath }: { basePath: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, margin: "-100px" });

	return (
		<section className="py-24 bg-background relative overflow-hidden" id="services">
			{/* Decorative background grid */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
			
			<div className="max-w-6xl mx-auto px-6 relative z-10" ref={ref}>
				<div className="text-center max-w-2xl mx-auto mb-16">
					<motion.h2 
						initial={{ opacity: 0, y: 20 }}
						animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
						transition={{ duration: 0.6 }}
						className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight font-[var(--font-heading)]"
					>
						L'Arsenal <span className="text-primary">Mécanique</span>
					</motion.h2>
					<motion.p 
						initial={{ opacity: 0 }}
						animate={isInView ? { opacity: 1 } : { opacity: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="mt-4 text-stone-400 font-medium"
					>
						Une gamme complète de services pour sublimer et entretenir la puissance de votre machine.
					</motion.p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{services.map((service, index) => {
						const Icon = service.icon;
						return (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 30 }}
								animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
								whileHover={{ y: -5, scale: 1.02 }}
								className="group relative overflow-hidden rounded-2xl bg-stone-900 border border-stone-800 p-8 hover:border-primary/50 transition-all duration-300"
							>
								{/* Hover gradient effect */}
								<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
								
								<div className="relative z-10">
									<div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-[0_0_0_rgba(255,50,50,0)] group-hover:shadow-[0_0_20px_rgba(255,50,50,0.4)]">
										<Icon size={24} />
									</div>
									<h3 className="text-xl font-bold text-white mb-3 uppercase tracking-wide font-[var(--font-heading)]">{service.title}</h3>
									<p className="text-sm text-stone-400 leading-relaxed mb-6">
										{service.description}
									</p>
									<div className="flex items-center justify-between border-t border-stone-800 pt-4 mt-auto">
										<span className="text-sm font-semibold text-primary">{service.price}</span>
										<a 
											href={`${basePath}/reservation`} 
											className="text-xs font-bold text-white uppercase tracking-wider hover:text-primary transition-colors flex items-center gap-1"
										>
											Réserver <span className="text-lg leading-none">→</span>
										</a>
									</div>
								</div>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

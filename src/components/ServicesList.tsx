import { useEffect, useState } from 'react';
import { getPrimaryProfessional, getServices, type Service } from '@/lib/queries';
import { getServiceImageFallback } from '@/lib/serviceImages';
import ServiceModal from '@/components/ui/ServiceModal';

interface Props {
	limit?: number;
	showCta?: boolean;
}


const CATEGORIES = ['Toutes', 'Femmes', 'Hommes', 'Enfants'];

export default function ServicesList({ limit, showCta = true }: Props) {
	const [services, setServices] = useState<Service[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedService, setSelectedService] = useState<Service | null>(null);
	const [activeCategory, setActiveCategory] = useState('Toutes');

	useEffect(() => {
		async function load() {
			const pro = await getPrimaryProfessional();
			if (pro) {
				const data = await getServices(pro.id);
				setServices(limit ? data.slice(0, limit) : data);
			}
			setLoading(false);
		}
		load();
	}, [limit]);

	if (loading) {
		return <p className="text-sm text-stone-500">Chargement des prestations...</p>;
	}

	if (services.length === 0) {
		return <p className="text-sm text-stone-500">Aucune prestation disponible pour le moment.</p>;
	}

	const filteredServices = services.filter((service) => {
		if (activeCategory === 'Toutes') return true;
		return (service.category || 'Femmes') === activeCategory;
	});

	return (
		<>
			<div className="mb-8 flex flex-wrap justify-center gap-2">
				{CATEGORIES.map((category) => (
					<button
						key={category}
						onClick={() => setActiveCategory(category)}
						className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
							activeCategory === category
								? 'bg-stone-900 text-white shadow-sm'
								: 'bg-stone-100 text-stone-600 hover:bg-stone-200'
						}`}
					>
						{category}
					</button>
				))}
			</div>

			{filteredServices.length === 0 ? (
				<p className="text-sm text-stone-500 text-center py-8 bg-stone-50 rounded-xl">Aucune prestation trouvée dans cette catégorie.</p>
			) : (
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{filteredServices.map((service) => (
						<div 
							key={service.id} 
							onClick={() => setSelectedService(service)}
							className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all hover:border-rose-300 hover:shadow-md"
						>
							<div className="aspect-square w-full overflow-hidden bg-stone-50">
								<img 
									src={service.image_url || getServiceImageFallback(service.name)} 
									alt={service.name} 
									className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
								/>
							</div>
							<div className="flex flex-1 flex-col p-6">
								<p className="text-lg font-semibold text-stone-900">{service.name}</p>
								<p className="mt-2 flex-1 text-sm text-stone-500">{service.description}</p>
								<div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
									<span className="text-stone-400">{service.duration_minutes} min</span>
									<span className="font-semibold text-stone-900">{service.price} €</span>
								</div>
								<a
									href={`/reservation?service=${service.id}`}
									hidden={!showCta}
									className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-rose-700"
									onClick={(e) => e.stopPropagation()}
								>
									Réserver
								</a>
							</div>
						</div>
					))}
				</div>
			)}
			
			<ServiceModal 
				service={selectedService} 
				onClose={() => setSelectedService(null)} 
			/>
		</>
	);
}

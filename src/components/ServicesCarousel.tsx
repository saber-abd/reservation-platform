import { useEffect, useRef, useState } from 'react';
import { getPrimaryProfessional, getServices, type Service } from '@/lib/queries';

interface Props {
	limit?: number;
}

export default function ServicesCarousel({ limit }: Props) {
	const [services, setServices] = useState<Service[]>([]);
	const [loading, setLoading] = useState(true);
	const trackRef = useRef<HTMLDivElement>(null);

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

	function scrollByCard(direction: 1 | -1) {
		const track = trackRef.current;
		if (!track) return;
		const card = track.querySelector<HTMLElement>('[data-card]');
		const amount = (card?.offsetWidth ?? 280) + 24;
		track.scrollBy({ left: direction * amount, behavior: 'smooth' });
	}

	if (loading) {
		return <p className="text-sm text-stone-500">Chargement des prestations...</p>;
	}

	if (services.length === 0) {
		return <p className="text-sm text-stone-500">Aucune prestation disponible pour le moment.</p>;
	}

	return (
		<div className="relative">
			<div
				ref={trackRef}
				className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				{services.map((service) => (
					<div
						key={service.id}
						data-card
						className="flex w-72 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm sm:w-80"
					>
						{service.image_url ? (
							<img src={service.image_url} alt={service.name} className="h-36 w-full object-cover" />
						) : (
							<div className="h-36 w-full bg-stone-100" />
						)}
						<div className="flex flex-1 flex-col p-6">
							<p className="text-lg font-semibold text-stone-900">{service.name}</p>
							<p className="mt-2 flex-1 text-sm text-stone-500">{service.description}</p>
							<div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
								<span className="text-stone-400">{service.duration_minutes} min</span>
								<span className="font-semibold text-stone-900">{service.price} €</span>
							</div>
						</div>
					</div>
				))}
			</div>

			{services.length > 1 && (
				<>
					<button
						type="button"
						aria-label="Prestations précédentes"
						onClick={() => scrollByCard(-1)}
						className="absolute top-1/2 left-0 hidden -translate-x-4 -translate-y-1/2 rounded-full border border-border bg-white p-2 text-stone-600 shadow-sm transition-colors hover:border-rose-300 hover:text-rose-600 sm:block"
					>
						‹
					</button>
					<button
						type="button"
						aria-label="Prestations suivantes"
						onClick={() => scrollByCard(1)}
						className="absolute top-1/2 right-0 hidden -translate-y-1/2 translate-x-4 rounded-full border border-border bg-white p-2 text-stone-600 shadow-sm transition-colors hover:border-rose-300 hover:text-rose-600 sm:block"
					>
						›
					</button>
				</>
			)}
		</div>
	);
}

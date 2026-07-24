import { useEffect, useState } from 'react';
import { getPrimaryProfessional, getServices, type Service } from '@/lib/queries';

interface Props {
	limit?: number;
	showCta?: boolean;
}

export default function ServicesList({ limit, showCta = true }: Props) {
	const [services, setServices] = useState<Service[]>([]);
	const [loading, setLoading] = useState(true);

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

	return (
		<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{services.map((service) => (
				<div key={service.id} className="flex flex-col rounded-xl border border-border bg-white p-6 shadow-sm">
					<p className="text-lg font-semibold text-stone-900">{service.name}</p>
					<p className="mt-2 flex-1 text-sm text-stone-500">{service.description}</p>
					<div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
						<span className="text-stone-400">{service.duration_minutes} min</span>
						<span className="font-semibold text-stone-900">{service.price} €</span>
					</div>
					<a
						href="/reservation"
						hidden={!showCta}
						className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-rose-700"
					>
						Réserver
					</a>
				</div>
			))}
		</div>
	);
}

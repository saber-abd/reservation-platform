import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { getAppointmentsForProfessional, getAllServices, type Appointment, type Service } from '@/lib/queries';

const PremiumStatsCharts = lazy(() => import('./PremiumStatsCharts'));

function formatDate(iso: string) {
	return new Date(iso).toLocaleString('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	});
}

function isoDaysAgo(days: number) {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d.toISOString().slice(0, 10);
}

export default function PremiumStatsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [services, setServices] = useState<Service[]>([]);
	const [daysPreset, setDaysPreset] = useState(30);

	useEffect(() => {
		if (!professional) return;
		Promise.all([getAppointmentsForProfessional(professional.id), getAllServices(professional.id)]).then(
			([appointmentsData, servicesData]) => {
				setAppointments(appointmentsData);
				setServices(servicesData);
			},
		);
	}, [professional]);

	const { stats, revenueData, serviceData } = useMemo(() => {
		const now = new Date();
		const rangeStart = new Date(isoDaysAgo(daysPreset) + 'T00:00:00');
		
		const priceByService = new Map(services.map((s) => [s.id, s.price]));
		const nameByService = new Map(services.map((s) => [s.id, s.name]));
		
		const activeAppointments = appointments.filter((a) => a.status !== 'cancelled');

		const inRange = activeAppointments.filter((a) => {
			const start = new Date(a.start_time);
			return start >= rangeStart && start <= now;
		});

		const revenueInRange = inRange.reduce((sum, a) => sum + (priceByService.get(a.service_id) ?? 0), 0);

		// Group by day for the chart
		const revByDay = new Map<string, number>();
		for (let i = daysPreset; i >= 0; i--) {
			revByDay.set(isoDaysAgo(i), 0);
		}

		inRange.forEach(a => {
			const day = a.start_time.slice(0, 10);
			if (revByDay.has(day)) {
				revByDay.set(day, (revByDay.get(day) ?? 0) + (priceByService.get(a.service_id) ?? 0));
			}
		});

		const revenueChartData = Array.from(revByDay.entries()).map(([date, revenue]) => ({
			date: formatDate(date),
			revenue,
		}));

		// Group by service
		const countByService = new Map<string, number>();
		inRange.forEach(a => {
			countByService.set(a.service_id, (countByService.get(a.service_id) ?? 0) + 1);
		});

		const serviceChartData = Array.from(countByService.entries()).map(([id, count]) => ({
			name: nameByService.get(id) || 'Inconnu',
			count,
			revenue: count * (priceByService.get(id) ?? 0)
		})).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

		return {
			stats: {
				appointmentsCount: inRange.length,
				revenue: revenueInRange,
				avgTicket: inRange.length ? Math.round(revenueInRange / inRange.length) : 0,
			},
			revenueData: revenueChartData,
			serviceData: serviceChartData
		};
	}, [appointments, services, daysPreset]);

	if (loading) return <div className="animate-pulse h-64 bg-muted rounded-xl"></div>;
	if (error) return <p className="text-sm text-destructive">{error}</p>;

	return (
		<div className="space-y-8 animate-[fade-in_0.5s_ease-out]">
			<div>
				<h1 className="text-3xl font-black text-stone-900 uppercase tracking-widest font-[var(--font-heading)]">Télémétrie</h1>
				<p className="mt-2 text-stone-500 font-medium">Analyse des performances et statistiques d'activité.</p>
			</div>

			<div className="flex gap-2">
				{[7, 30, 90].map(days => (
					<button
						key={days}
						onClick={() => setDaysPreset(days)}
						className={`px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
							daysPreset === days 
							? 'bg-primary text-white shadow-sm border border-primary shadow-primary/20' 
							: 'bg-white text-stone-500 hover:text-primary hover:border-primary border border-stone-200'
						}`}
					>
						{days} Jours
					</button>
				))}
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white border border-stone-200 rounded-3xl p-8 relative overflow-hidden group shadow-sm transition-all hover:shadow-md hover:border-primary/30">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
					<p className="text-stone-500 text-sm font-bold uppercase tracking-wider mb-2">Chiffre d'affaires</p>
					<p className="text-4xl font-black text-stone-900 font-[var(--font-heading)]">{stats.revenue} €</p>
				</div>
				<div className="bg-white border border-stone-200 rounded-3xl p-8 relative overflow-hidden group shadow-sm transition-all hover:shadow-md hover:border-primary/30">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
					<p className="text-stone-500 text-sm font-bold uppercase tracking-wider mb-2">Interventions</p>
					<p className="text-4xl font-black text-stone-900 font-[var(--font-heading)]">{stats.appointmentsCount}</p>
				</div>
				<div className="bg-white border border-stone-200 rounded-3xl p-8 relative overflow-hidden group shadow-sm transition-all hover:shadow-md hover:border-primary/30">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
					<p className="text-stone-500 text-sm font-bold uppercase tracking-wider mb-2">Panier Moyen</p>
					<p className="text-4xl font-black text-stone-900 font-[var(--font-heading)]">{stats.avgTicket} €</p>
				</div>
			</div>

			{/* Charts : recharts chargé à la demande */}
			<Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="animate-pulse h-[380px] bg-muted rounded-3xl"></div><div className="animate-pulse h-[380px] bg-muted rounded-3xl"></div></div>}>
				<PremiumStatsCharts revenueData={revenueData} serviceData={serviceData} />
			</Suspense>
		</div>
	);
}

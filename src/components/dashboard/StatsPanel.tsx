import { useEffect, useMemo, useState } from 'react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { getAppointmentsForProfessional, getAllServices, type Appointment, type Service } from '@/lib/queries';

function startOfWeek(date: Date) {
	const d = new Date(date);
	const day = (d.getDay() + 6) % 7; // lundi = 0
	d.setDate(d.getDate() - day);
	d.setHours(0, 0, 0, 0);
	return d;
}

function startOfMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function StatsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [services, setServices] = useState<Service[]>([]);

	useEffect(() => {
		if (!professional) return;
		Promise.all([getAppointmentsForProfessional(professional.id), getAllServices(professional.id)]).then(
			([appointmentsData, servicesData]) => {
				setAppointments(appointmentsData);
				setServices(servicesData);
			},
		);
	}, [professional]);

	const stats = useMemo(() => {
		const now = new Date();
		const weekStart = startOfWeek(now);
		const monthStart = startOfMonth(now);
		const priceByService = new Map(services.map((s) => [s.id, s.price]));
		const activeAppointments = appointments.filter((a) => a.status !== 'cancelled');

		const thisWeek = activeAppointments.filter((a) => new Date(a.start_time) >= weekStart);
		const thisMonth = activeAppointments.filter((a) => new Date(a.start_time) >= monthStart);
		const upcoming = activeAppointments.filter((a) => new Date(a.start_time) >= now && a.status === 'confirmed');
		const revenueThisMonth = thisMonth.reduce((sum, a) => sum + (priceByService.get(a.service_id) ?? 0), 0);
		const cancelled = appointments.filter((a) => a.status === 'cancelled').length;

		const countByService = new Map<string, number>();
		for (const a of activeAppointments) {
			countByService.set(a.service_id, (countByService.get(a.service_id) ?? 0) + 1);
		}
		let topServiceId: string | null = null;
		let topCount = 0;
		for (const [id, count] of countByService) {
			if (count > topCount) {
				topCount = count;
				topServiceId = id;
			}
		}
		const topService = services.find((s) => s.id === topServiceId);

		return {
			totalAppointments: activeAppointments.length,
			thisWeekCount: thisWeek.length,
			upcomingCount: upcoming.length,
			revenueThisMonth,
			cancelled,
			topService,
			topCount,
		};
	}, [appointments, services]);

	if (loading) return <p className="text-sm text-stone-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	const cards = [
		{ label: 'Rendez-vous cette semaine', value: stats.thisWeekCount },
		{ label: 'Rendez-vous à venir', value: stats.upcomingCount },
		{ label: 'Chiffre d\'affaires estimé (ce mois-ci)', value: `${stats.revenueThisMonth} €` },
		{ label: 'Total rendez-vous', value: stats.totalAppointments },
		{ label: 'Annulations', value: stats.cancelled },
		{
			label: 'Prestation la plus demandée',
			value: stats.topService ? `${stats.topService.name} (${stats.topCount})` : '—',
		},
	];

	return (
		<div>
			<h1 className="text-2xl font-bold text-stone-900">Statistiques</h1>
			<p className="mt-1 text-sm text-stone-500">Un suivi rapide de votre activité.</p>

			<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{cards.map((card) => (
					<div key={card.label} className="rounded-xl border border-border bg-white p-6 shadow-sm">
						<p className="text-xs font-medium uppercase tracking-wide text-stone-500">{card.label}</p>
						<p className="mt-2 text-2xl font-bold text-stone-900">{card.value}</p>
					</div>
				))}
			</div>
		</div>
	);
}

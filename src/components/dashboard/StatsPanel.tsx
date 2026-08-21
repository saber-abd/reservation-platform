import { useEffect, useMemo, useState } from 'react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { getAppointmentsForProfessional, getAllServices, type Appointment, type Service } from '@/lib/queries';

type PeriodPreset = '7d' | '30d' | '365d' | 'custom';

const presetLabels: Record<PeriodPreset, string> = {
	'7d': '1 semaine',
	'30d': '1 mois',
	'365d': '1 an',
	custom: 'Personnalisée',
};

function formatDate(iso: string) {
	return new Date(iso).toLocaleString('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function todayISO() {
	return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number) {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d.toISOString().slice(0, 10);
}

/** Liste détaillée en modale, réutilisée pour les différents "voir le détail" des cartes stats. */
function DetailModal({
	title,
	appointments,
	onClose,
}: {
	title: string;
	appointments: Appointment[];
	onClose: () => void;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
			<div
				className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-white p-6 shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-start justify-between">
					<h2 className="text-lg font-semibold text-stone-900">{title}</h2>
					<button onClick={onClose} className="text-sm text-stone-400 hover:text-stone-600">
						✕
					</button>
				</div>
				<div className="mt-4 space-y-2">
					{appointments.length === 0 && <p className="text-sm text-stone-500">Aucun rendez-vous.</p>}
					{appointments.map((a) => (
						<div key={a.id} className="rounded-lg border border-border p-3 text-sm">
							<p className="font-medium text-stone-900">{a.client_name}</p>
							<p className="text-stone-500">{formatDate(a.start_time)}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default function StatsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [services, setServices] = useState<Service[]>([]);
	const [preset, setPreset] = useState<PeriodPreset>('30d');
	const [customStart, setCustomStart] = useState(isoDaysAgo(30));
	const [customEnd, setCustomEnd] = useState(todayISO());
	const [detail, setDetail] = useState<{ title: string; appointments: Appointment[] } | null>(null);

	useEffect(() => {
		if (!professional) return;
		Promise.all([getAppointmentsForProfessional(professional.id), getAllServices(professional.id)]).then(
			([appointmentsData, servicesData]) => {
				setAppointments(appointmentsData);
				setServices(servicesData);
			},
		);
	}, [professional]);

	const { rangeStart, rangeEnd } = useMemo(() => {
		if (preset === 'custom') {
			return { rangeStart: new Date(`${customStart}T00:00:00`), rangeEnd: new Date(`${customEnd}T23:59:59`) };
		}
		const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 365;
		return { rangeStart: new Date(isoDaysAgo(days) + 'T00:00:00'), rangeEnd: new Date() };
	}, [preset, customStart, customEnd]);

	const stats = useMemo(() => {
		const now = new Date();
		const priceByService = new Map(services.map((s) => [s.id, s.price]));
		const activeAppointments = appointments.filter((a) => a.status !== 'cancelled');

		const inRange = activeAppointments.filter((a) => {
			const start = new Date(a.start_time);
			return start >= rangeStart && start <= rangeEnd;
		});
		const upcoming = activeAppointments.filter((a) => new Date(a.start_time) >= now && a.status === 'confirmed');
		const cancelledInRange = appointments.filter((a) => {
			const start = new Date(a.start_time);
			return a.status === 'cancelled' && start >= rangeStart && start <= rangeEnd;
		});
		const revenueInRange = inRange.reduce((sum, a) => sum + (priceByService.get(a.service_id) ?? 0), 0);

		const countByService = new Map<string, number>();
		for (const a of inRange) {
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
			inRange,
			upcoming,
			cancelledInRange,
			revenueInRange,
			topService,
			topCount,
		};
	}, [appointments, services, rangeStart, rangeEnd]);

	if (loading) return <p className="text-sm text-stone-500">Chargement...</p>;
	if (error) return <p className="text-sm text-red-600">{error}</p>;

	const cards = [
		{
			label: `Rendez-vous (${presetLabels[preset].toLowerCase()})`,
			value: stats.inRange.length,
			onClick: () => setDetail({ title: 'Rendez-vous sur la période', appointments: stats.inRange }),
		},
		{
			label: 'Rendez-vous à venir',
			value: stats.upcoming.length,
			onClick: () => setDetail({ title: 'Clients avec un rendez-vous à venir', appointments: stats.upcoming }),
		},
		{
			label: `Chiffre d'affaires estimé (${presetLabels[preset].toLowerCase()})`,
			value: `${stats.revenueInRange} €`,
		},
		{
			label: `Annulations (${presetLabels[preset].toLowerCase()})`,
			value: stats.cancelledInRange.length,
			onClick: () => setDetail({ title: 'Rendez-vous annulés sur la période', appointments: stats.cancelledInRange }),
		},
		{
			label: 'Prestation la plus demandée',
			value: stats.topService ? `${stats.topService.name} (${stats.topCount})` : '—',
		},
	];

	return (
		<div>
			<h1 className="text-2xl font-bold text-stone-900">Statistiques</h1>
			<p className="mt-1 text-sm text-stone-500">Un suivi rapide de votre activité. Cliquez sur une carte pour voir le détail.</p>

			<div className="mt-6 flex flex-wrap items-end gap-3">
				<div className="flex flex-wrap gap-2">
					{(Object.keys(presetLabels) as PeriodPreset[])
						.filter((p) => p !== 'custom')
						.map((p) => (
							<button
								key={p}
								type="button"
								onClick={() => setPreset(p)}
								className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
									preset === p
										? 'border-rose-600 bg-rose-600 text-white'
										: 'border-border bg-white text-stone-600 hover:border-rose-300'
								}`}
							>
								{presetLabels[p]}
							</button>
						))}
				</div>
				<div className="flex flex-wrap items-end gap-2">
					<div>
						<label className="text-xs text-stone-500">Du</label>
						<input
							type="date"
							value={customStart}
							onChange={(e) => {
								setCustomStart(e.target.value);
								setPreset('custom');
							}}
							className="mt-1 block rounded-lg border border-border bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
						/>
					</div>
					<div>
						<label className="text-xs text-stone-500">Au</label>
						<input
							type="date"
							value={customEnd}
							onChange={(e) => {
								setCustomEnd(e.target.value);
								setPreset('custom');
							}}
							className="mt-1 block rounded-lg border border-border bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600"
						/>
					</div>
				</div>
			</div>

			<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{cards.map((card) => (
					<button
						key={card.label}
						type="button"
						onClick={card.onClick}
						disabled={!card.onClick}
						className={`rounded-xl border border-border bg-white p-6 text-left shadow-sm ${
							card.onClick ? 'transition-colors hover:border-rose-300 cursor-pointer' : 'cursor-default'
						}`}
					>
						<p className="text-xs font-medium uppercase tracking-wide text-stone-500">{card.label}</p>
						<p className="mt-2 text-2xl font-bold text-stone-900">{card.value}</p>
						{card.onClick && <p className="mt-1 text-xs text-rose-600">Voir le détail →</p>}
					</button>
				))}
			</div>

			{detail && <DetailModal title={detail.title} appointments={detail.appointments} onClose={() => setDetail(null)} />}
		</div>
	);
}


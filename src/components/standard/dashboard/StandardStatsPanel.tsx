import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { getAppointmentsForProfessional, getAllServices, type Appointment, type Service } from '@/lib/queries';
import { formatEuros, roundMoney } from '@/lib/money';
import { Busy, EmptyState, PageHeader, PageSkeleton, Panel, Sheet, Skeleton, Tabs, useLastDefined } from '@/components/standard/ui/StandardKit';

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

/** Liste détaillée en panneau latéral, réutilisée pour les différents « voir le détail » des chiffres. */
function DetailSheet({
	detail,
	onClose,
}: {
	detail: { title: string; appointments: Appointment[] } | null;
	onClose: () => void;
}) {
	const d = useLastDefined(detail);
	return (
		<Sheet
			open={detail !== null}
			onClose={onClose}
			title={d?.title ?? ''}
			description={d ? `${d.appointments.length} rendez-vous` : undefined}
		>
			{d && d.appointments.length === 0 && <EmptyState kind="calendar" title="Aucun rendez-vous." />}
			{d && d.appointments.length > 0 && (
				<ul className="border-t border-[var(--sa-line-soft)]">
					{d.appointments.map((a) => (
						<li key={a.id} className="flex items-center justify-between gap-4 border-b border-[var(--sa-line-soft)] py-3">
							<span className="font-semibold text-ink">{a.client_name}</span>
							<span className="sa-num text-sm text-ink-soft">{formatDate(a.start_time)}</span>
						</li>
					))}
				</ul>
			)}
		</Sheet>
	);
}

export default function StatsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [services, setServices] = useState<Service[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [preset, setPreset] = useState<PeriodPreset>('30d');
	const [customStart, setCustomStart] = useState(isoDaysAgo(30));
	const [customEnd, setCustomEnd] = useState(todayISO());
	const [detail, setDetail] = useState<{ title: string; appointments: Appointment[] } | null>(null);

	useEffect(() => {
		if (!professional) return;
		Promise.all([getAppointmentsForProfessional(professional.id), getAllServices(professional.id)])
			.then(([appointmentsData, servicesData]) => {
				setAppointments(appointmentsData);
				setServices(servicesData);
			})
			.finally(() => setLoadingData(false));
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
		const revenueInRange = roundMoney(inRange.reduce((sum, a) => sum + (priceByService.get(a.service_id) ?? 0), 0));

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

		// Répartition par prestation sur la période (vue calculée, sans requête supplémentaire).
		const breakdown = services
			.map((s) => ({ service: s, count: countByService.get(s.id) ?? 0 }))
			.filter((row) => row.count > 0)
			.sort((a, b) => b.count - a.count);

		return {
			inRange,
			upcoming,
			cancelledInRange,
			revenueInRange,
			topService,
			topCount,
			breakdown,
		};
	}, [appointments, services, rangeStart, rangeEnd]);

	if (loading) return <PageSkeleton rows={2} />;
	if (error) return <p className="sa-alert">{error}</p>;

	const periodLabel = presetLabels[preset].toLowerCase();
	const rangeText =
		preset === 'custom'
			? `du ${rangeStart.toLocaleDateString('fr-FR')} au ${rangeEnd.toLocaleDateString('fr-FR')}`
			: `sur ${periodLabel}`;

	const cards = [
		{
			label: `Rendez-vous (${periodLabel})`,
			value: stats.inRange.length,
			onClick: () => setDetail({ title: 'Rendez-vous sur la période', appointments: stats.inRange }),
		},
		{
			label: 'Rendez-vous à venir',
			value: stats.upcoming.length,
			onClick: () => setDetail({ title: 'Clients avec un rendez-vous à venir', appointments: stats.upcoming }),
		},
		{
			label: `Annulations (${periodLabel})`,
			value: stats.cancelledInRange.length,
			onClick: () => setDetail({ title: 'Rendez-vous annulés sur la période', appointments: stats.cancelledInRange }),
		},
	];
	const maxCount = Math.max(1, ...stats.breakdown.map((r) => r.count));

	return (
		<div>
			<PageHeader title="Statistiques" subtitle="Un suivi rapide de votre activité. Cliquez sur un chiffre pour voir le détail des rendez-vous." />

			<div className="mb-8 flex flex-wrap items-end gap-x-6 gap-y-4">
				<div>
					<span className="sa-label">Période</span>
					<Tabs
						variant="segmented"
						label="Période"
						value={preset}
						onChange={setPreset}
						items={(['7d', '30d', '365d'] as PeriodPreset[]).map((p) => ({ value: p, label: presetLabels[p] }))}
					/>
				</div>
				<div className="flex flex-wrap items-end gap-2">
					<div>
						<label className="sa-label" htmlFor="sa-stats-from">
							Du
						</label>
						<input
							id="sa-stats-from"
							type="date"
							value={customStart}
							onChange={(e) => {
								setCustomStart(e.target.value);
								setPreset('custom');
							}}
							className="sa-input sa-num w-auto"
						/>
					</div>
					<div>
						<label className="sa-label" htmlFor="sa-stats-to">
							Au
						</label>
						<input
							id="sa-stats-to"
							type="date"
							value={customEnd}
							onChange={(e) => {
								setCustomEnd(e.target.value);
								setPreset('custom');
							}}
							className="sa-input sa-num w-auto"
						/>
					</div>
					{preset === 'custom' && <span className="pb-2.5 text-sm font-semibold text-brand">Période personnalisée</span>}
				</div>
			</div>

			{loadingData ? (
				<Busy>
					<div className="grid gap-6 lg:grid-cols-3">
						<Skeleton className="h-44 lg:col-span-2" />
						<Skeleton className="h-44" />
						<Skeleton className="h-28 lg:col-span-3" />
					</div>
				</Busy>
			) : (
				<div className="grid gap-6 lg:grid-cols-3">
					{/* Chiffre principal */}
					<section className="sa-panel flex flex-col justify-between gap-6 p-6 lg:col-span-2">
						<div>
							<h2 className="sa-fig-label">Chiffre d'affaires estimé ({periodLabel})</h2>
							<p className="sa-num mt-3 text-[clamp(2.75rem,2rem+3vw,4.25rem)] font-semibold leading-none tracking-[-0.045em] text-ink">
								{formatEuros(stats.revenueInRange)}
							</p>
						</div>
						<p className="text-sm text-ink-mute">
							Somme des tarifs des {stats.inRange.length} rendez-vous non annulés {rangeText}.
						</p>
					</section>

					<section className="sa-panel flex flex-col justify-between gap-4 p-6">
						<h2 className="sa-fig-label">Prestation la plus demandée</h2>
						{stats.topService ? (
							<div>
								<p className="text-xl font-semibold leading-tight tracking-tight text-ink">{stats.topService.name}</p>
								<p className="sa-num mt-1 text-sm text-ink-mute">
									{stats.topCount} rendez-vous {rangeText}
								</p>
							</div>
						) : (
							<p className="text-2xl font-semibold text-ink-mute">—</p>
						)}
					</section>

					{/* Chiffres cliquables */}
					<div className="sa-panel sa-figs overflow-hidden lg:col-span-3">
						{cards.map((card) => (
							<button
								key={card.label}
								type="button"
								onClick={card.onClick}
								className="group text-left transition-colors hover:bg-[var(--sa-hover)]"
							>
								<span className="sa-fig-label block">{card.label}</span>
								<span className="sa-fig-value">{card.value}</span>
								<span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
									Voir le détail
									<ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
								</span>
							</button>
						))}
					</div>

					{/* Répartition par prestation */}
					<Panel title="Répartition par prestation" description={`Rendez-vous non annulés ${rangeText}.`} className="lg:col-span-3">
						{stats.breakdown.length === 0 ? (
							<p className="text-sm text-ink-mute">Aucun rendez-vous sur cette période.</p>
						) : (
							<ul className="grid gap-4">
								{stats.breakdown.map((row, i) => (
									<li key={row.service.id} className="grid gap-1.5 sm:grid-cols-[14rem_minmax(0,1fr)_3rem] sm:items-center sm:gap-4">
										<span className="truncate text-sm font-medium text-ink">{row.service.name}</span>
										<span className="sa-hbar" aria-hidden="true">
											<i style={{ width: `${(row.count / maxCount) * 100}%`, animationDelay: `${i * 60}ms` }} />
										</span>
										<span className="sa-num text-sm font-semibold text-ink-soft sm:text-right">{row.count}</span>
									</li>
								))}
							</ul>
						)}
					</Panel>
				</div>
			)}

			<DetailSheet detail={detail} onClose={() => setDetail(null)} />
		</div>
	);
}

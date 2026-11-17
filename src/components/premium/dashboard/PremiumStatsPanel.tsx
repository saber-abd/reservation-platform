import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useReducedMotion } from 'motion/react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { getAppointmentsForProfessional, getAllServices, type Appointment, type Service } from '@/lib/queries';
import { roundMoney } from '@/lib/money';
import { EmptyState, EUROS, EUROS_CENTS, PageHead, PageSkeleton, Rolling } from './kit/Base';
import { Gauge, Tabs } from './kit/Interactive';

type ChartsProps = { revenueData: { date: string; revenue: number }[]; animate?: boolean };

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

type Periode = '7' | '30' | '90';

export default function PremiumStatsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [services, setServices] = useState<Service[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [daysPreset, setDaysPreset] = useState(30);
	// recharts est chargé à part, après le montage (pas de lazy + Suspense rendu côté serveur).
	const [Charts, setCharts] = useState<ComponentType<ChartsProps> | null>(null);
	const reduce = useReducedMotion();

	useEffect(() => {
		let actif = true;
		import('./PremiumStatsCharts').then((m) => {
			if (actif) setCharts(() => m.default);
		});
		return () => {
			actif = false;
		};
	}, []);

	useEffect(() => {
		if (!professional) return;
		Promise.all([getAppointmentsForProfessional(professional.id), getAllServices(professional.id)])
			.then(([appointmentsData, servicesData]) => {
				setAppointments(appointmentsData);
				setServices(servicesData);
			})
			.finally(() => setLoadingData(false));
	}, [professional]);

	const { stats, revenueData, serviceData, precedent } = useMemo(() => {
		const now = new Date();
		const rangeStart = new Date(isoDaysAgo(daysPreset) + 'T00:00:00');
		const prevStart = new Date(isoDaysAgo(daysPreset * 2) + 'T00:00:00');

		const priceByService = new Map(services.map((s) => [s.id, s.price]));
		const nameByService = new Map(services.map((s) => [s.id, s.name]));

		const activeAppointments = appointments.filter((a) => a.status !== 'cancelled');

		const inRange = activeAppointments.filter((a) => {
			const start = new Date(a.start_time);
			return start >= rangeStart && start <= now;
		});
		const inPrev = activeAppointments.filter((a) => {
			const start = new Date(a.start_time);
			return start >= prevStart && start < rangeStart;
		});

		const revenueInRange = roundMoney(inRange.reduce((sum, a) => sum + (priceByService.get(a.service_id) ?? 0), 0));
		const revenuePrev = roundMoney(inPrev.reduce((sum, a) => sum + (priceByService.get(a.service_id) ?? 0), 0));

		// Regroupement par jour pour la courbe
		const revByDay = new Map<string, number>();
		for (let i = daysPreset; i >= 0; i--) {
			revByDay.set(isoDaysAgo(i), 0);
		}

		inRange.forEach((a) => {
			const day = a.start_time.slice(0, 10);
			if (revByDay.has(day)) {
				revByDay.set(day, (revByDay.get(day) ?? 0) + (priceByService.get(a.service_id) ?? 0));
			}
		});

		const revenueChartData = Array.from(revByDay.entries()).map(([date, revenue]) => ({
			date: formatDate(date),
			revenue: roundMoney(revenue),
		}));

		// Regroupement par prestation
		const countByService = new Map<string, number>();
		inRange.forEach((a) => {
			countByService.set(a.service_id, (countByService.get(a.service_id) ?? 0) + 1);
		});

		const serviceChartData = Array.from(countByService.entries())
			.map(([id, count]) => ({
				name: nameByService.get(id) || 'Inconnu',
				count,
				revenue: roundMoney(count * (priceByService.get(id) ?? 0)),
			}))
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 5);

		return {
			stats: {
				appointmentsCount: inRange.length,
				revenue: revenueInRange,
				avgTicket: inRange.length ? roundMoney(revenueInRange / inRange.length) : 0,
			},
			precedent: { revenue: revenuePrev, count: inPrev.length },
			revenueData: revenueChartData,
			serviceData: serviceChartData,
		};
	}, [appointments, services, daysPreset]);

	if (loading) return <PageSkeleton />;
	if (error) return <p className="pe-erreur">{error}</p>;

	const evolution = precedent.revenue > 0 ? Math.round(((stats.revenue - precedent.revenue) / precedent.revenue) * 100) : null;
	const maxService = Math.max(1, ...serviceData.map((s) => s.revenue));
	const partTop = stats.revenue > 0 && serviceData[0] ? serviceData[0].revenue / stats.revenue : 0;

	return (
		<div className="pe-entree">
			<PageHead
				title="Statistiques"
				sub="Analyse des performances et statistiques d'activité, hors rendez-vous annulés."
				actions={
					<Tabs<Periode>
						variant="boite"
						label="Période"
						value={String(daysPreset) as Periode}
						onChange={(v) => setDaysPreset(Number(v))}
						items={[
							{ value: '7', label: '7 Jours' },
							{ value: '30', label: '30 Jours' },
							{ value: '90', label: '90 Jours' },
						]}
					/>
				}
			/>

			<section className="pe-bento" aria-label="Indicateurs">
				{/* Chiffre d'affaires + courbe */}
				<article className="pe-card pe-card--sombre pe-b-8 pe-b-haut flex flex-col">
					<div className="pe-card__tete">
						<h2 className="pe-tech">Chiffre d'affaires · {daysPreset} jours</h2>
						{evolution !== null && (
							<span className={`pe-tech !text-[0.8rem] ${evolution >= 0 ? '!text-[#8fd0a7]' : '!text-[#ff7a6e]'}`}>
								{evolution >= 0 ? '+' : ''}
								{evolution} % vs {daysPreset} j précédents
							</span>
						)}
					</div>
					<div className="pe-card__corps flex flex-1 flex-col gap-4">
						<p className="pe-chiffre !text-[clamp(2.8rem,5.4vw,4.6rem)] text-pe-blanc">
							<Rolling value={stats.revenue} format={EUROS_CENTS} />
						</p>
						<div className="mt-auto">
							{loadingData || !Charts ? (
								<div aria-busy="true">
									<span className="sr-only">Chargement…</span>
									<span className="pe-skel" style={{ height: 260 }} />
								</div>
							) : (
								<Charts revenueData={revenueData} animate={!reduce} />
							)}
						</div>
					</div>
				</article>

				<article className="pe-card pe-b-4">
					<div className="pe-card__corps grid gap-3">
						<h2 className="pe-tech">Interventions</h2>
						<p className="pe-chiffre">
							<Rolling value={stats.appointmentsCount} />
							<small>sur {daysPreset} j</small>
						</p>
						<p className="text-sm text-pe-acier">
							{precedent.count} sur la période précédente.
						</p>
					</div>
				</article>

				<article className="pe-card pe-b-4">
					<div className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-4 p-[18px] md:p-[22px]">
						<div className="grid gap-3">
							<h2 className="pe-tech">Panier Moyen</h2>
							<p className="pe-chiffre !text-[clamp(1.9rem,3vw,2.6rem)]">
								<Rolling value={stats.avgTicket} format={EUROS_CENTS} />
							</p>
							<p className="text-sm text-pe-acier">par intervention</p>
						</div>
						<div>
							<Gauge value={partTop} ariaLabel={`Part de la première prestation dans le chiffre d'affaires : ${Math.round(partTop * 100)} %`}>
								<span className="text-base">{Math.round(partTop * 100)} %</span>
							</Gauge>
							<p className="pe-tech mt-1 text-center !text-[0.65rem]">Part n° 1</p>
						</div>
					</div>
				</article>

				{/* Top prestations */}
				<article className="pe-card pe-b-12">
					<div className="pe-card__tete">
						<h2 className="pe-h2">Top Prestations (CA)</h2>
						<span className="pe-tech">{daysPreset} derniers jours</span>
					</div>
					{loadingData ? (
						<div className="grid gap-4 p-5" aria-busy="true">
							{[0, 1, 2].map((i) => (
								<span key={i} className="pe-skel" style={{ height: 28 }} />
							))}
						</div>
					) : serviceData.length === 0 ? (
						<EmptyState kind="liste" title="Aucune intervention sur cette période." text="Choisissez une période plus longue pour voir le classement." />
					) : (
						<ol className="pe-rows">
							{serviceData.map((s, i) => (
								<li key={s.name} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-[18px] py-3.5 md:grid-cols-[40px_minmax(0,2fr)_minmax(0,3fr)_110px] md:px-[22px]">
									<span className={`text-xl font-extrabold tabular-nums [font-stretch:115%] ${i === 0 ? 'text-pe-rouge' : 'text-pe-acier'}`}>
										{String(i + 1).padStart(2, '0')}
									</span>
									<span className="min-w-0">
										<span className="block truncate font-bold">{s.name}</span>
										<span className="pe-tech">
											{s.count} intervention{s.count > 1 ? 's' : ''}
										</span>
									</span>
									<Barre v={s.revenue / maxService} rouge={i === 0} delay={i * 70} />
									<span className="text-right text-lg font-extrabold tabular-nums [font-stretch:112%]">
										<Rolling value={s.revenue} format={EUROS} />
									</span>
								</li>
							))}
						</ol>
					)}
				</article>
			</section>
		</div>
	);
}

/** Barre proportionnelle qui s'allonge depuis 0 au premier affichage (transition CSS sur transform). */
function Barre({ v, rouge, delay }: { v: number; rouge: boolean; delay: number }) {
	const [shown, setShown] = useState(0);
	useEffect(() => {
		const id = requestAnimationFrame(() => setShown(v));
		return () => cancelAnimationFrame(id);
	}, [v]);
	return (
		<span className={`pe-barre col-span-3 row-start-2 md:col-span-1 md:row-start-auto ${rouge ? 'pe-barre--rouge' : ''}`} aria-hidden="true">
			<i style={{ ['--v' as string]: shown, transitionDelay: `${delay}ms` }} />
		</span>
	);
}

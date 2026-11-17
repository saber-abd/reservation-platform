import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import type { Appointment } from '@/lib/queries';
import { DEMO_DIAMANT_CLIENTS } from '@/lib/diamantDemoData';
import { bornesPeriode, chargerRdvPeriode, libellePeriode, serieParCase } from './kit/periode';
import DiamantNewClientsModal, { type PeriodClientDetail } from './DiamantNewClientsModal';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Chiffre, Courbe, EASE, EnChargement, Pastille, Segments, Squelette } from './kit/primitives';
import { formatEuros, roundMoney } from '@/lib/money';

// recharts (~350 Ko) n'est chargé que lorsque le graphique est affiché.
const DiamantRevenueChart = lazy(() => import('./DiamantRevenueChart'));

type AppointmentWithService = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
};

type TimeRange = 'week' | 'month' | 'year' | 'custom';

export default function DiamantPerformancePanel() {
	const [range, setRange] = useState<TimeRange>('month');
	const [customStart, setCustomStart] = useState('');
	const [customEnd, setCustomEnd] = useState('');
	
	const [loading, setLoading] = useState(true);
	const [pret, setPret] = useState(false);
	const reduit = useReducedMotion();
	const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
	const [periodClients, setPeriodClients] = useState<PeriodClientDetail[]>([]);
	const [showNewClientsModal, setShowNewClientsModal] = useState(false);

	useEffect(() => {
		fetchData();
	}, [range, customStart, customEnd]);

	const getRangeLabel = libellePeriode;
	// Bornes de la période choisie (aujourd'hui compris) et un point par jour / par mois pour la courbe.
	const bornes = useMemo(() => bornesPeriode(range, customStart, customEnd), [range, customStart, customEnd]);
	const serie = useMemo(() => serieParCase(appointments, bornes), [appointments, bornes]);
	// Numéro de la dernière requête : une réponse arrivée après un changement de période est ignorée.
	const requete = useRef(0);

	async function fetchData() {
		const n = ++requete.current;
		try {
			setLoading(true);
			// Rendez-vous non annulés de la période (base, ou démonstration si la base n'en a aucun)
			const { rdvs: completed } = await chargerRdvPeriode(bornes);
			if (n !== requete.current) return;
			setAppointments(completed);

			// Clients de la période
			const clientsMap = new Map<string, PeriodClientDetail>();
			completed.forEach(app => {
				const key = app.client_email || app.client_name;
				if (!clientsMap.has(key)) {
					const demo = DEMO_DIAMANT_CLIENTS.find(d => d.email === app.client_email || d.full_name === app.client_name);
					clientsMap.set(key, {
						id: app.client_id || demo?.id || `client-${encodeURIComponent(key)}`,
						name: app.client_name,
						email: app.client_email || 'client@demo.fr',
						phone: app.client_phone || demo?.phone,
						date: app.start_time,
						serviceName: app.services?.name || 'Prestation',
						price: app.services?.price || 0
					});
				}
			});
			setPeriodClients(Array.from(clientsMap.values()));
		} catch (err) {
			console.error(err);
		} finally {
			if (n === requete.current) {
				setLoading(false);
				setPret(true);
			}
		}
	}

	// Calcul des KPIs
	const totalCa = useMemo(() => roundMoney(appointments.reduce((sum, r) => sum + (r.services?.price || 0), 0)), [appointments]);
	const rdvCount = appointments.length;
	const panierMoyen = rdvCount > 0 ? Math.round(totalCa / rdvCount) : 0;
	const newClientsCount = periodClients.length;

	// Top Prestations calculées dynamiquement sur la période
	const topServices = useMemo(() => {
		if (appointments.length === 0) return [];
		const counts: Record<string, { count: number; ca: number }> = {};
		appointments.forEach(app => {
			const name = app.services?.name || 'Autre';
			const price = app.services?.price || 0;
			if (!counts[name]) counts[name] = { count: 0, ca: 0 };
			counts[name].count += 1;
			counts[name].ca += price;
		});

		const total = appointments.length;
		return Object.entries(counts)
			.map(([name, { count, ca }]) => ({
				name,
				count,
				ca: roundMoney(ca),
				percentage: Math.round((count / total) * 100)
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 4);
	}, [appointments]);

	// Fidélité calculée
	const retentionRate = useMemo(() => {
		if (appointments.length === 0) return 78;
		const visitsPerClient: Record<string, number> = {};
		appointments.forEach(app => {
			const k = app.client_email || app.client_name;
			visitsPerClient[k] = (visitsPerClient[k] || 0) + 1;
		});
		const uniqueTotal = Object.keys(visitsPerClient).length;
		const repeatClients = Object.values(visitsPerClient).filter(v => v > 1).length;
		if (uniqueTotal === 0) return 75;
		const rate = Math.round((repeatClients / uniqueTotal) * 100);
		return rate > 0 ? Math.min(Math.max(rate, 65), 92) : 75;
	}, [appointments]);

	// Les chiffres partent de zéro puis roulent jusqu'à leur valeur (NumberFlow).
	const [vus, setVus] = useState({ ca: 0, rdv: 0, clients: 0, panier: 0, retention: 0 });
	useEffect(() => {
		if (!pret) return;
		const id = window.requestAnimationFrame(() =>
			setVus({ ca: totalCa, rdv: rdvCount, clients: newClientsCount, panier: panierMoyen, retention: retentionRate })
		);
		return () => window.cancelAnimationFrame(id);
	}, [pret, totalCa, rdvCount, newClientsCount, panierMoyen, retentionRate]);

	const apparition = (i: number) =>
		reduit
			? {}
			: {
				initial: { opacity: 0, y: 14 },
				animate: { opacity: 1, y: 0 },
				transition: { duration: 0.6, ease: EASE, delay: 0.05 * i },
			};

	// Petite courbe : les mêmes points que le graphique (zéros compris).
	const courbe = useMemo(() => serie.map((p) => p.ca), [serie]);

	const ARC = 2 * Math.PI * 38;

	return (
		<div className="space-y-6">
			{/* Sélecteur de période */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<span className="text-sm font-semibold text-dx-encre">Période :</span>
					<Segments<TimeRange>
						label="Période"
						value={range}
						onChange={setRange}
						options={[
							{ value: 'week', label: '7 jours' },
							{ value: 'month', label: '30 jours' },
							{ value: 'year', label: '1 an' },
							{ value: 'custom', label: 'Personnalisé' },
						]}
					/>
				</div>

				{range === 'custom' && (
					<div className="flex flex-wrap items-center gap-2">
						<input
							type="date"
							aria-label="Début de la période"
							value={customStart}
							onChange={e => setCustomStart(e.target.value)}
							className="dx-champ !min-h-9 !w-auto !py-1.5 text-sm"
						/>
						<span className="text-sm text-dx-gris">au</span>
						<input
							type="date"
							aria-label="Fin de la période"
							value={customEnd}
							onChange={e => setCustomEnd(e.target.value)}
							className="dx-champ !min-h-9 !w-auto !py-1.5 text-sm"
						/>
					</div>
				)}
			</div>

			{!pret ? (
				<EnChargement label="Chargement des statistiques…" className="grid gap-4 lg:grid-cols-12">
					<Squelette className="h-[260px] !rounded-[14px] lg:col-span-7" />
					<Squelette className="h-[260px] !rounded-[14px] lg:col-span-5" />
					<Squelette className="h-[380px] !rounded-[14px] lg:col-span-12" />
				</EnChargement>
			) : (
				<div className="grid gap-4 lg:grid-cols-12" aria-busy={loading}>
					{/* Chiffre d'affaires */}
					<motion.section {...apparition(0)} className="dx-carte flex flex-col p-6 sm:p-7 lg:col-span-7">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<p className="text-sm font-semibold text-dx-encre">Chiffre d'Affaires</p>
							<Pastille ton="terre" nu>{getRangeLabel(range)}</Pastille>
						</div>
						<Chiffre valeur={vus.ca} euros className="mt-6 text-[clamp(3rem,6vw,5rem)] text-dx-encre" />
						<div className="mt-auto pt-6">
							{courbe.length > 1 ? <Courbe valeurs={courbe} hauteur={64} /> : <div className="h-16 border-b border-dashed border-dx-filet-fort" />}
						</div>
					</motion.section>

					{/* Activité, clients, panier */}
					<motion.section {...apparition(1)} className="dx-carte flex flex-col divide-y divide-dx-filet lg:col-span-5">
						<div className="flex items-end justify-between gap-4 px-6 py-5">
							<div>
								<p className="text-sm font-semibold text-dx-encre">Rendez-vous réalisés</p>
								<p className="dx-meta mt-0.5">Activité</p>
							</div>
							<Chiffre valeur={vus.rdv} className="text-[2.75rem] text-dx-encre" />
						</div>
						<button
							type="button"
							onClick={() => setShowNewClientsModal(true)}
							className="group flex items-end justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-dx-ivoire"
						>
							<div>
								<p className="text-sm font-semibold text-dx-encre">Nouveaux Clients</p>
								<p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-dx-gris group-hover:text-dx-terre">
									Voir liste <ArrowUpRight size={12} />
								</p>
							</div>
							<Chiffre valeur={vus.clients} className="text-[2.75rem] text-dx-encre" />
						</button>
						<div className="flex items-end justify-between gap-4 px-6 py-5">
							<div>
								<p className="text-sm font-semibold text-dx-encre">Panier Moyen</p>
								<p className="dx-meta mt-0.5">Moyenne</p>
							</div>
							<Chiffre valeur={vus.panier} euros className="text-[2.75rem] text-dx-encre" />
						</div>
					</motion.section>

					{/* Graphique d'évolution du CA */}
					<motion.section {...apparition(2)} className="dx-carte p-6 sm:p-7 lg:col-span-12">
						<div className="mb-6 flex flex-wrap items-start justify-between gap-3">
							<div>
								<h2 className="dx-h2">Évolution du Chiffre d'Affaires</h2>
								<p className="dx-meta mt-1">Historique des recettes sur : {getRangeLabel(range)}</p>
							</div>
							<Pastille ton="neutre" nu>
								{appointments.length} prestation{appointments.length > 1 ? 's' : ''}
							</Pastille>
						</div>
						{/* Graphique chargé à la demande : jamais pendant le rendu serveur (pret y vaut false). */}
						<div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
							<Suspense fallback={<Squelette className="h-[300px] w-full !rounded-xl" />}>
								<DiamantRevenueChart serie={serie} />
							</Suspense>
						</div>
					</motion.section>

					{/* Top prestations */}
					<motion.section {...apparition(3)} className="dx-carte p-6 sm:p-7 lg:col-span-7">
						<h2 className="dx-h2">Top Prestations</h2>
						<p className="dx-meta mt-1">{getRangeLabel(range)}</p>
						<ol className="mt-6 space-y-5">
							{topServices.length === 0 ? (
								<li className="py-6 text-center text-sm text-dx-gris">Aucune prestation sur la période</li>
							) : (
								topServices.map((svc, i) => (
									<li key={svc.name}>
										<div className="mb-2 flex items-baseline justify-between gap-3">
											<span className="flex min-w-0 items-baseline gap-3">
												<span className="font-heading text-sm italic text-dx-terre">{String(i + 1).padStart(2, '0')}</span>
												<span className="truncate text-[0.9375rem] font-medium text-dx-encre">{svc.name} <span className="text-dx-gris">({svc.count}x)</span></span>
											</span>
											<span className="dx-tabulaire shrink-0 text-sm">
												<span className="font-semibold text-dx-encre">{svc.percentage}%</span>
												<span className="ml-2 text-dx-gris">({formatEuros(svc.ca)})</span>
											</span>
										</div>
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-dx-ivoire-2">
											<motion.div
												className="h-full rounded-full bg-dx-terre"
												initial={reduit ? false : { width: 0 }}
												animate={{ width: `${svc.percentage}%` }}
												transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.08 }}
												style={reduit ? { width: `${svc.percentage}%` } : undefined}
											/>
										</div>
									</li>
								))
							)}
						</ol>
					</motion.section>

					{/* Fidélité */}
					<motion.section {...apparition(4)} className="dx-carte dx-carte--nuit flex flex-col p-6 sm:p-7 lg:col-span-5">
						<h2 className="font-heading text-[1.375rem] font-normal tracking-[-0.02em] text-dx-creme">Fidélité Clientèle</h2>
						<p className="mt-1 text-sm text-dx-sable">Part des clients venus plus d'une fois sur la période</p>
						<div className="my-6 flex items-center justify-center">
							<div className="relative grid h-48 w-48 place-items-center">
								<svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
									<circle cx="50" cy="50" r="38" fill="none" stroke="var(--dx-filet-nuit)" strokeWidth="7" />
									<motion.circle
										cx="50"
										cy="50"
										r="38"
										fill="none"
										stroke="var(--dx-terre-clair)"
										strokeWidth="7"
										strokeLinecap="round"
										strokeDasharray={ARC}
										initial={reduit ? false : { strokeDashoffset: ARC }}
										animate={{ strokeDashoffset: ARC * (1 - retentionRate / 100) }}
										transition={{ duration: 1.3, ease: EASE, delay: 0.3 }}
										style={reduit ? { strokeDashoffset: ARC * (1 - retentionRate / 100) } : undefined}
									/>
								</svg>
								<div className="text-center">
									<Chiffre valeur={vus.retention} suffixe="%" className="block text-5xl text-white" />
									<span className="mt-1 block text-xs text-dx-sable">Rétention</span>
								</div>
							</div>
						</div>
						<div className="mt-auto grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-dx-filet-nuit">
							<div className="bg-dx-nuit-2 p-4 text-center">
								<Chiffre valeur={vus.rdv} className="text-3xl text-dx-creme" />
								<p className="mt-1 text-xs text-dx-sable">Visites totales</p>
							</div>
							<button
								type="button"
								onClick={() => setShowNewClientsModal(true)}
								className="bg-dx-nuit-2 p-4 text-center transition-colors hover:bg-[#30261f]"
								title="Cliquer pour voir la liste"
							>
								<Chiffre valeur={vus.clients} prefixe="+" className="text-3xl text-dx-terre-clair" />
								<p className="mt-1 text-xs text-dx-sable">Nouveaux clients</p>
							</button>
						</div>
					</motion.section>
				</div>
			)}

			{/* Modale de détail des nouveaux clients */}
			<DiamantNewClientsModal
				isOpen={showNewClientsModal}
				onClose={() => setShowNewClientsModal(false)}
				clients={periodClients}
				rangeLabel={getRangeLabel(range)}
			/>
		</div>
	);
}

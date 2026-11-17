import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { getPrimaryProfessional, getDemoTag, type Appointment } from '@/lib/queries';
import { generateDiamantDemoAppointments, DEMO_DIAMANT_CLIENTS } from '@/lib/diamantDemoData';
import { bornesPeriode, chargerRdvPeriode, libellePeriode, serieParCase } from './kit/periode';
import DiamantNewClientsModal, { type PeriodClientDetail } from './DiamantNewClientsModal';
import { ArrowRight, ArrowUpRight, MessageSquare, CalendarClock, Check } from 'lucide-react';
import { roundMoney } from '@/lib/money';
import { Avatar, Chiffre, Courbe, EASE, EnChargement, Pastille, Segments, Squelette, PastilleStatut } from './kit/primitives';

// recharts (~350 Ko) n'est chargé que lorsque le graphique est affiché.
const DiamantRevenueChart = lazy(() => import('./DiamantRevenueChart'));

type AppointmentWithService = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
};

type TimeRange = 'week' | 'month' | 'year' | 'custom';

export default function DiamantDashboardOverview() {
	const [range, setRange] = useState<TimeRange>('month');
	const [customStart, setCustomStart] = useState('');
	const [customEnd, setCustomEnd] = useState('');

	const [loading, setLoading] = useState(true);
	const [pret, setPret] = useState(false);
	const [stats, setStats] = useState({ ca: 0, rdv: 0, newClients: 0, panier: 0 });
	const [vus, setVus] = useState({ ca: 0, rdv: 0, newClients: 0, panier: 0 });
	const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
	const [periodClients, setPeriodClients] = useState<PeriodClientDetail[]>([]);
	const [showNewClientsModal, setShowNewClientsModal] = useState(false);
	const [nonLus, setNonLus] = useState(0);
	const [aujourdhui, setAujourdhui] = useState('');
	const reduit = useReducedMotion();

	// Pour afficher les RDV "Prochains" ou "Derniers" si aucun prochain
	const [displayAppointments, setDisplayAppointments] = useState<{ type: 'prochains' | 'derniers', list: AppointmentWithService[] }>({ type: 'prochains', list: [] });

	useEffect(() => {
		fetchDashboardData();
	}, [range, customStart, customEnd]);

	// Les chiffres partent de zéro puis roulent jusqu'à leur valeur (NumberFlow).
	useEffect(() => {
		if (!pret) return;
		const id = window.requestAnimationFrame(() => setVus(stats));
		return () => window.cancelAnimationFrame(id);
	}, [stats, pret]);

	// Messages non lus (même source que la navigation : métadonnées locales des conversations).
	useEffect(() => {
		const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
		setAujourdhui(d.charAt(0).toUpperCase() + d.slice(1));
		function compter() {
			try {
				let total = 0;
				const saved = localStorage.getItem('diamant_conversations_meta');
				if (saved) {
					const parsed = JSON.parse(saved);
					for (const k in parsed) {
						if (parsed[k]?.unread_by_pro) total += parsed[k].unread_by_pro;
					}
				}
				setNonLus(total);
			} catch (e) {}
		}
		compter();
		window.addEventListener('diamant:new-message', compter);
		window.addEventListener('diamant:messages-read', compter);
		window.addEventListener('storage', compter);
		return () => {
			window.removeEventListener('diamant:new-message', compter);
			window.removeEventListener('diamant:messages-read', compter);
			window.removeEventListener('storage', compter);
		};
	}, []);

	const getRangeLabel = libellePeriode;
	// Bornes de la période choisie (aujourd'hui compris) et un point par jour / par mois pour la courbe.
	const bornes = useMemo(() => bornesPeriode(range, customStart, customEnd), [range, customStart, customEnd]);
	const serie = useMemo(() => serieParCase(appointments, bornes), [appointments, bornes]);

	// Numéro de la dernière requête : une réponse arrivée après un changement de période est ignorée.
	const requete = useRef(0);

	async function fetchDashboardData() {
		const n = ++requete.current;
		try {
			setLoading(true);
			const tag = getDemoTag();
			const now = new Date();

			// 1. Rendez-vous non annulés de la période (base, ou démonstration si la base n'en a aucun)
			const { pro, rdvs: completed, source } = await chargerRdvPeriode(bornes);
			if (n !== requete.current) return;
			const allDemoAppointments = source === 'demo' ? generateDiamantDemoAppointments() : [];

			// Fix : stocker les rendez-vous dans le state pour alimenter DiamantRevenueChart
			setAppointments(completed);

			const totalCa = roundMoney(completed.reduce((sum, r) => sum + (r.services?.price || 0), 0));
			const panierMoyen = completed.length > 0 ? totalCa / completed.length : 0;

			// Détail des nouveaux clients
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
			const uniqueClientsList = Array.from(clientsMap.values());
			setPeriodClients(uniqueClientsList);

			setStats({
				ca: totalCa,
				rdv: completed.length,
				newClients: uniqueClientsList.length,
				panier: Math.round(panierMoyen)
			});

			// 2. Prochains RDV
			let nextAppointments: AppointmentWithService[] = [];
			if (pro) {
				const { data: nextData } = await supabase
					.from('appointments')
					.select('*, services(name, duration_minutes, price)')
					.eq('professional_id', pro.id)
					.eq('tag_bd', tag)
					.gte('start_time', now.toISOString())
					.order('start_time', { ascending: true })
					.limit(3);
				if (nextData && nextData.length > 0) {
					nextAppointments = nextData as AppointmentWithService[];
				}
			}

			if (nextAppointments.length > 0) {
				setDisplayAppointments({ type: 'prochains', list: nextAppointments });
			} else {
				// Fallback : derniers RDV passés
				let pastAppointments: AppointmentWithService[] = [];
				if (pro) {
					const { data: pastData } = await supabase
						.from('appointments')
						.select('*, services(name, duration_minutes, price)')
						.eq('professional_id', pro.id)
						.eq('tag_bd', tag)
						.lt('start_time', now.toISOString())
						.order('start_time', { ascending: false })
						.limit(3);
					if (pastData && pastData.length > 0) {
						pastAppointments = pastData as AppointmentWithService[];
					}
				}

				if (pastAppointments.length === 0) {
					// Prendre les 3 derniers depuis les rendez-vous de démo
					pastAppointments = [...allDemoAppointments].reverse().slice(0, 3);
				}

				setDisplayAppointments({ type: 'derniers', list: pastAppointments });
			}

		} catch (err) {
			console.error(err);
		} finally {
			if (n === requete.current) {
				setLoading(false);
				setPret(true);
			}
		}
	}

	function formatDateShort(iso: string) {
		const d = new Date(iso);
		if (d.toDateString() === new Date().toDateString()) return "Aujourd'hui";
		const tmrw = new Date();
		tmrw.setDate(tmrw.getDate() + 1);
		if (d.toDateString() === tmrw.toDateString()) return "Demain";
		return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
	}

	function formatTime(iso: string) {
		return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}

	// Petite courbe : les mêmes points que le graphique (zéros compris).
	const courbe = useMemo(() => serie.map((p) => p.ca), [serie]);

	const aConfirmer = displayAppointments.type === 'prochains' ? displayAppointments.list.filter((a) => a.status === 'pending').length : 0;

	const apparition = (i: number) =>
		reduit
			? {}
			: {
				initial: { opacity: 0, y: 14 },
				animate: { opacity: 1, y: 0 },
				transition: { duration: 0.6, ease: EASE, delay: 0.05 * i },
			};

	return (
		<div className="space-y-6">
			{/* Ce qui demande une action, puis le choix de la période */}
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex flex-wrap items-center gap-2" aria-live="polite">
					<span className="mr-1 text-sm font-semibold text-dx-encre">À traiter</span>
					{nonLus > 0 && (
						<a href="/demo-diamant/dashboard/messages" className="dx-btn dx-btn--sm dx-btn--ligne gap-2">
							<MessageSquare size={14} className="text-dx-terre" />
							{nonLus} message{nonLus > 1 ? 's' : ''} non lu{nonLus > 1 ? 's' : ''}
						</a>
					)}
					{aConfirmer > 0 && (
						<a href="/demo-diamant/dashboard/disponibilites" className="dx-btn dx-btn--sm dx-btn--ligne gap-2">
							<CalendarClock size={14} className="text-dx-attente" />
							{aConfirmer} rendez-vous à confirmer
						</a>
					)}
					{pret && nonLus === 0 && aConfirmer === 0 && (
						<span className="inline-flex items-center gap-2 text-sm text-dx-gris">
							<Check size={15} className="text-dx-ok" /> Rien n'attend de réponse.
						</span>
					)}
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<Segments<TimeRange>
						label="Période"
						value={range}
						onChange={setRange}
						options={[
							{ value: 'week', label: '7 derniers jours' },
							{ value: 'month', label: '30 derniers jours' },
							{ value: 'year', label: '1 an' },
							{ value: 'custom', label: 'Personnalisé' },
						]}
					/>
					{range === 'custom' && (
						<div className="flex items-center gap-2">
							<input type="date" aria-label="Début de la période" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="dx-champ !min-h-9 !w-auto !py-1.5 text-sm" />
							<span className="text-sm text-dx-gris">à</span>
							<input type="date" aria-label="Fin de la période" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="dx-champ !min-h-9 !w-auto !py-1.5 text-sm" />
						</div>
					)}
				</div>
			</div>

			{!pret ? (
				<EnChargement label="Chargement des données…" className="grid gap-4 lg:grid-cols-12">
					<Squelette className="h-[420px] !rounded-[14px] lg:col-span-7 lg:row-span-2" />
					<Squelette className="h-[220px] !rounded-[14px] lg:col-span-5" />
					<div className="grid grid-cols-2 gap-4 lg:col-span-5">
						<Squelette className="h-[184px] !rounded-[14px]" />
						<Squelette className="h-[184px] !rounded-[14px]" />
					</div>
					<Squelette className="h-[380px] !rounded-[14px] lg:col-span-8" />
					<Squelette className="h-[380px] !rounded-[14px] lg:col-span-4" />
				</EnChargement>
			) : (
				<div className="grid gap-4 lg:grid-cols-12" aria-busy={loading}>
					{/* Carte dominante : aujourd'hui et prochains rendez-vous */}
					<motion.section {...apparition(0)} className="dx-carte dx-carte--nuit flex flex-col overflow-hidden p-6 sm:p-8 lg:col-span-7 lg:row-span-2">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-sm text-dx-sable">Aujourd'hui</p>
								<p className="mt-1 font-heading text-[clamp(1.9rem,3.2vw,2.75rem)] font-light leading-none tracking-[-0.035em] text-dx-creme">{aujourdhui || ' '}</p>
							</div>
							{displayAppointments.type === 'derniers' && (
								<span className="rounded-full border border-dx-filet-nuit px-3 py-1 text-xs font-semibold text-dx-sable">Aucun RDV à venir</span>
							)}
						</div>

						<div className="mt-8 flex items-baseline justify-between gap-4 border-b border-dx-filet-nuit pb-3">
							<h2 className="font-heading text-xl font-normal text-dx-creme">
								{displayAppointments.type === 'prochains' ? 'Prochains RDV' : 'Derniers RDV'}
							</h2>
							<span className="text-xs text-dx-sable">{displayAppointments.list.length} affiché{displayAppointments.list.length > 1 ? 's' : ''}</span>
						</div>

						<ol className="flex-1">
							{displayAppointments.list.length === 0 ? (
								<li className="py-10 text-center text-sm text-dx-sable">Aucun rendez-vous trouvé.</li>
							) : (
								displayAppointments.list.map((rdv, i) => (
									<motion.li
										key={rdv.id}
										initial={reduit ? false : { opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.08 }}
										className={`grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 border-b border-dx-filet-nuit py-4 last:border-b-0 sm:grid-cols-[5.5rem_1fr_auto] ${displayAppointments.type === 'derniers' ? 'opacity-75' : ''}`}
									>
										<div>
											<p className="dx-chiffre text-[1.9rem] text-dx-creme sm:text-[2.2rem]">{formatTime(rdv.start_time)}</p>
											<p className="mt-1 text-xs text-dx-sable">{formatDateShort(rdv.start_time)}</p>
										</div>
										<div className="flex min-w-0 items-center gap-3">
											<Avatar nom={rdv.client_name} taille={38} ton="terre" className="hidden sm:inline-grid" />
											<div className="min-w-0">
												<p className="truncate font-semibold text-dx-creme">{rdv.client_name}</p>
												<p className="truncate text-sm text-dx-sable">
													{rdv.services?.name || 'Prestation'}
													{rdv.services?.duration_minutes ? ` · ${rdv.services.duration_minutes} min` : ''}
												</p>
											</div>
										</div>
										<div className="text-right">
											{rdv.status === 'pending' ? (
												<Pastille ton="attente">À confirmer</Pastille>
											) : (
												<PastilleStatut statut={rdv.status} />
											)}
										</div>
									</motion.li>
								))
							)}
						</ol>

						<a href="/demo-diamant/dashboard/disponibilites" className="dx-lien mt-6 self-start">
							Voir l'agenda complet <ArrowRight size={15} />
						</a>
					</motion.section>

					{/* Chiffre d'affaires */}
					<motion.a {...apparition(1)} href="/demo-diamant/dashboard/statistiques" className="dx-carte group flex flex-col p-6 lg:col-span-5">
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm font-semibold text-dx-encre">Chiffre d'affaires</p>
							<span className="inline-flex items-center gap-1 text-xs font-semibold text-dx-gris transition-colors group-hover:text-dx-terre">
								Détails <ArrowUpRight size={13} />
							</span>
						</div>
						<p className="dx-meta mt-0.5">{getRangeLabel(range)}</p>
						<Chiffre valeur={vus.ca} euros className="mt-5 text-[clamp(2.8rem,5vw,4.25rem)] text-dx-encre" />
						<div className="mt-auto pt-5">
							{courbe.length > 1 ? (
								<Courbe valeurs={courbe} hauteur={56} />
							) : (
								<div className="h-14 border-b border-dashed border-dx-filet-fort" />
							)}
						</div>
					</motion.a>

					{/* Rendez-vous et panier moyen */}
					<div className="grid grid-cols-2 gap-4 lg:col-span-5">
						<motion.a {...apparition(2)} href="/demo-diamant/dashboard/disponibilites" className="dx-carte group flex flex-col p-5">
							<p className="text-sm font-semibold text-dx-encre">RDV de la période</p>
							<Chiffre valeur={vus.rdv} className="mt-4 text-[clamp(2.4rem,4vw,3.25rem)] text-dx-encre" />
							<span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-dx-gris transition-colors group-hover:text-dx-terre">
								Agenda <ArrowUpRight size={13} />
							</span>
						</motion.a>
						<motion.a {...apparition(3)} href="/demo-diamant/dashboard/statistiques" className="dx-carte group flex flex-col p-5">
							<p className="text-sm font-semibold text-dx-encre">Panier moyen</p>
							<Chiffre valeur={vus.panier} euros className="mt-4 text-[clamp(2.4rem,4vw,3.25rem)] text-dx-encre" />
							<span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-dx-gris transition-colors group-hover:text-dx-terre">
								Détails <ArrowUpRight size={13} />
							</span>
						</motion.a>
					</div>

					{/* Graphique */}
					<motion.section {...apparition(4)} className="dx-carte p-6 lg:col-span-8">
						<div className="mb-5 flex items-start justify-between gap-4">
							<div>
								<h2 className="dx-h2">Évolution du CA</h2>
								<p className="dx-meta mt-1">{getRangeLabel(range)}</p>
							</div>
							<a href="/demo-diamant/dashboard/statistiques" className="dx-lien shrink-0">Rapport complet <ArrowRight size={14} /></a>
						</div>
						{/* Graphique chargé à la demande : jamais pendant le rendu serveur (pret y vaut false). */}
						<div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
							<Suspense fallback={<Squelette className="h-[300px] w-full !rounded-xl" />}>
								<DiamantRevenueChart serie={serie} />
							</Suspense>
						</div>
					</motion.section>

					{/* Nouveaux clients */}
					<motion.button
						{...apparition(5)}
						type="button"
						onClick={() => setShowNewClientsModal(true)}
						className="dx-carte group flex flex-col p-6 text-left lg:col-span-4"
					>
						<div className="flex w-full items-center justify-between gap-3">
							<p className="text-sm font-semibold text-dx-encre">Nouveaux clients</p>
							<span className="inline-flex items-center gap-1 text-xs font-semibold text-dx-gris transition-colors group-hover:text-dx-terre">
								Voir liste <ArrowUpRight size={13} />
							</span>
						</div>
						<p className="dx-meta mt-0.5">{getRangeLabel(range)}</p>
						<Chiffre valeur={vus.newClients} className="mt-5 text-[clamp(2.8rem,5vw,4rem)] text-dx-encre" />
						<div className="mt-6 flex -space-x-2">
							{periodClients.slice(0, 6).map((c) => (
								<Avatar key={c.id} nom={c.name} taille={34} ton="terre" className="ring-2 ring-dx-carte" />
							))}
						</div>
						<ul className="mt-6 w-full divide-y divide-dx-filet border-t border-dx-filet">
							{periodClients.slice(0, 4).map((c) => (
								<li key={c.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
									<span className="truncate font-medium text-dx-encre">{c.name}</span>
									<span className="shrink-0 text-xs text-dx-gris">{c.serviceName}</span>
								</li>
							))}
							{periodClients.length === 0 && <li className="py-3 text-sm text-dx-gris">Aucun client sur la période.</li>}
						</ul>
					</motion.button>
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

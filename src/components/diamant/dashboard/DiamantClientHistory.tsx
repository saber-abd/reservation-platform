import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, Star, Search, Download, RefreshCw, Receipt } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Chiffre, EASE, EnChargement, EtatVide, Fenetre, Pastille, Segments, Squelette } from './kit/primitives';
import { confirmer } from './kit/notifier';

interface PastAppointment {
	id: string;
	serviceName: string;
	stylistName: string;
	date: string;
	time: string;
	rawDate: string;
	duration: string;
	price: number;
	status: 'completed' | 'cancelled';
	rating?: number;
	notes?: string;
	pointsEarned: number;
	receiptNumber: string;
}

const DEMO_PAST_APPOINTMENTS: PastAppointment[] = [
	{
		id: 'past-1',
		serviceName: 'Balayage Signature & Gloss Diamant',
		stylistName: 'Sarah Delorme',
		date: 'Vendredi 16 Janvier 2026',
		time: '14:30',
		rawDate: '2026-01-16T14:30:00Z',
		duration: '2h 30min',
		price: 185,
		status: 'completed',
		rating: 5,
		notes: 'Éclaircissement naturel fondu avec soin thermo-protecteur à la kératine pure.',
		pointsEarned: 185,
		receiptNumber: 'REC-2026-0042'
	},
	{
		id: 'past-2',
		serviceName: 'Coupe Couture & Brushing Haute Coiffure',
		stylistName: 'Thomas Mercier',
		date: 'Samedi 29 Novembre 2025',
		time: '11:00',
		rawDate: '2025-11-29T11:00:00Z',
		duration: '1h 15min',
		price: 95,
		status: 'completed',
		rating: 5,
		notes: 'Coupe dégradée texturisée et brushing souple wavy longue durée.',
		pointsEarned: 95,
		receiptNumber: 'REC-2025-0891'
	},
	{
		id: 'past-3',
		serviceName: 'Rituel Tokio Inkarami & Massage Crânien',
		stylistName: 'Julie Bertrand',
		date: 'Mardi 14 Octobre 2025',
		time: '16:00',
		rawDate: '2025-10-14T16:00:00Z',
		duration: '1h 45min',
		price: 140,
		status: 'completed',
		rating: 5,
		notes: 'Traitement multi-étapes régénérant les liaisons cellulaires du cheveu.',
		pointsEarned: 140,
		receiptNumber: 'REC-2025-0724'
	},
	{
		id: 'past-4',
		serviceName: 'Soin Renaissance Cheveux d\'Exception',
		stylistName: 'Sarah Delorme',
		date: 'Vendredi 22 Août 2025',
		time: '10:30',
		rawDate: '2025-08-22T10:30:00Z',
		duration: '1h 30min',
		price: 120,
		status: 'completed',
		rating: 5,
		notes: 'Bain aux extraits de camélia précieux et nutrition intense des pointes.',
		pointsEarned: 120,
		receiptNumber: 'REC-2025-0553'
	}
];

export default function DiamantClientHistory() {
	const [appointments, setAppointments] = useState<PastAppointment[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedPeriod, setSelectedPeriod] = useState<'all' | '3months' | '2025'>('all');
	const [selectedReceipt, setSelectedReceipt] = useState<PastAppointment | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	// Notification : sonner (îlot DiamantToaster du layout)
	function showToast(msg: string) {
		confirmer(msg);
	}
	const reduit = useReducedMotion();

	useEffect(() => {
		async function fetchClientPastAppointments() {
			try {
				const { data: { session } } = await supabase.auth.getSession();
				if (!session?.user) {
					setLoading(false);
					return;
				}

				const { data, error } = await supabase
					.from('appointments')
					.select('*, services(name, duration_minutes, price), professionals(business_name)')
					.eq('client_id', session.user.id)
					.lt('start_time', new Date().toISOString())
					.order('start_time', { ascending: false });

				if (error) {
					console.warn('Could not load appointments from Supabase:', error);
					setAppointments([]);
				} else if (data && data.length > 0) {
					const mapped: PastAppointment[] = data.map((appt: any, idx: number) => {
						const dateObj = new Date(appt.start_time);
						const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
						const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

						return {
							id: appt.id || `db-${idx}`,
							serviceName: appt.services?.name || 'Prestation Personnalisée',
							stylistName: appt.professionals?.business_name || 'Diamant Prestige',
							date: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
							time: timeStr,
							rawDate: appt.start_time,
							duration: appt.services?.duration_minutes ? `${appt.services.duration_minutes} min` : '45 min',
							price: appt.services?.price || 0,
							status: (appt.status === 'cancelled' ? 'cancelled' : 'completed') as any,
							rating: 5,
							pointsEarned: Math.floor(appt.services?.price || 50),
							receiptNumber: `REC-${dateObj.getFullYear()}-${String(idx + 1).padStart(4, '0')}`
						};
					});

					// Uniquement les vraies données de la base de données
					setAppointments(mapped);
				} else {
					setAppointments([]);
				}
			} catch (e) {
				console.error(e);
				setAppointments([]);
			} finally {
				setLoading(false);
			}
		}

		fetchClientPastAppointments();
	}, []);

	// Filtrage
	const filtered = useMemo(() => {
		return appointments.filter(appt => {
			// Filtre période
			if (selectedPeriod === '3months') {
				const threeMonthsAgo = new Date();
				threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
				if (new Date(appt.rawDate) < threeMonthsAgo) return false;
			} else if (selectedPeriod === '2025') {
				if (!appt.rawDate.startsWith('2025')) return false;
			}

			// Filtre recherche
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				return (
					appt.serviceName.toLowerCase().includes(q) ||
					appt.stylistName.toLowerCase().includes(q) ||
					appt.date.toLowerCase().includes(q) ||
					appt.receiptNumber.toLowerCase().includes(q)
				);
			}

			return true;
		});
	}, [appointments, selectedPeriod, searchQuery]);

	// Statistiques cumulées réelles
	const totalPrestations = appointments.filter(a => a.status === 'completed').length;
	const totalPointsEarned = appointments.reduce((acc, a) => acc + (a.status === 'completed' ? a.pointsEarned : 0), 0);
	const favoriteStylist = useMemo(() => {
		if (appointments.length === 0) return 'Diamant Prestige';
		const counts: Record<string, number> = {};
		for (const a of appointments) {
			counts[a.stylistName] = (counts[a.stylistName] || 0) + 1;
		}
		return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || 'Diamant Prestige';
	}, [appointments]);

	// Les chiffres roulent jusqu'à leur valeur une fois l'historique chargé.
	const [vus, setVus] = useState({ prestations: 0, points: 0 });
	useEffect(() => {
		if (loading) return;
		const id = window.requestAnimationFrame(() => setVus({ prestations: totalPrestations, points: totalPointsEarned }));
		return () => window.cancelAnimationFrame(id);
	}, [loading, totalPrestations, totalPointsEarned]);

	// Frise : regroupement par année (vue calculée sur les rendez-vous chargés)
	const parAnnee = useMemo(() => {
		const groupes: { annee: string; liste: PastAppointment[] }[] = [];
		for (const a of filtered) {
			const annee = String(new Date(a.rawDate).getFullYear());
			const g = groupes.find((x) => x.annee === annee);
			if (g) g.liste.push(a);
			else groupes.push({ annee, liste: [a] });
		}
		return groupes;
	}, [filtered]);

	return (
		<div className="space-y-8">
			{/* Chiffres du client */}
			<div className="dx-carte grid grid-cols-1 divide-y divide-dx-filet sm:grid-cols-3 sm:divide-x sm:divide-y-0">
				<div className="p-6">
					<p className="text-sm font-semibold text-dx-encre">Prestations honorées</p>
					<p className="mt-3 flex items-baseline gap-2">
						<Chiffre valeur={vus.prestations} className="text-5xl text-dx-encre" />
						<span className="text-sm text-dx-gris">visite{totalPrestations > 1 ? 's' : ''}</span>
					</p>
				</div>
				<div className="p-6">
					<p className="text-sm font-semibold text-dx-encre">Points fidélité cumulés</p>
					<p className="mt-3 flex items-baseline gap-2">
						<Chiffre valeur={vus.points} prefixe="+" className="text-5xl text-dx-terre" />
						<span className="text-sm text-dx-gris">pts</span>
					</p>
				</div>
				<div className="p-6">
					<p className="text-sm font-semibold text-dx-encre">Établissement & Coiffeur</p>
					<p className="mt-3 font-heading text-[1.75rem] font-light leading-tight tracking-[-0.02em] text-dx-encre">{favoriteStylist}</p>
				</div>
			</div>

			{/* Barre d'outils : Recherche & Filtres */}
			<div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
				<div className="dx-recherche w-full max-w-md">
					<Search size={16} />
					<input
						type="search"
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						placeholder="Rechercher par soin, coiffeur, date..."
						aria-label="Rechercher dans l'historique"
						className="dx-champ"
					/>
				</div>
				<Segments<'all' | '3months' | '2025'>
					label="Période"
					value={selectedPeriod}
					onChange={setSelectedPeriod}
					taille="sm"
					options={[
						{ value: 'all', label: `Toutes (${appointments.length})` },
						{ value: '3months', label: '3 derniers mois' },
						{ value: '2025', label: 'Année 2025' },
					]}
				/>
			</div>

			{/* Frise des rendez-vous passés */}
			{loading ? (
				<EnChargement label="Chargement de votre historique de prestations..." className="space-y-3">
					<Squelette className="h-32 w-full !rounded-[14px]" />
					<Squelette className="h-32 w-full !rounded-[14px]" />
				</EnChargement>
			) : filtered.length === 0 ? (
				<div className="dx-carte">
					<EtatVide
						dessin="agenda"
						titre="Aucun rendez-vous trouvé"
						texte="Aucune prestation ne correspond à vos filtres de recherche."
						action={searchQuery ? (
							<button type="button" onClick={() => { setSearchQuery(''); setSelectedPeriod('all'); }} className="dx-btn dx-btn--sm dx-btn--ligne">
								Réinitialiser les filtres
							</button>
						) : undefined}
					/>
				</div>
			) : (
				<div className="space-y-10">
					{parAnnee.map((groupe) => (
						<section key={groupe.annee} aria-label={`Année ${groupe.annee}`}>
							<p className="mb-4 flex items-baseline gap-3">
								<span className="dx-chiffre text-4xl text-dx-encre">{groupe.annee}</span>
								<span className="text-sm text-dx-gris">{groupe.liste.length} prestation{groupe.liste.length > 1 ? 's' : ''}</span>
							</p>
							<ol className="dx-frise space-y-4">
								{groupe.liste.map((appt, i) => {
									const d = new Date(appt.rawDate);
									return (
										<motion.li
											key={appt.id}
											className="relative"
											initial={reduit ? false : { opacity: 0, x: -8 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.06, 0.4) }}
										>
											<span className="dx-frise__point" data-ton={appt.status === 'cancelled' ? 'annule' : undefined} aria-hidden="true" />
											<article className="dx-carte grid gap-4 p-5 sm:grid-cols-[5rem_1fr] sm:p-6">
												<div className="flex items-baseline gap-2 sm:block sm:text-center">
													<p className="dx-chiffre text-4xl text-dx-encre">{d.getDate()}</p>
													<p className="text-sm text-dx-gris sm:mt-1">{d.toLocaleDateString('fr-FR', { month: 'short' })} · {appt.time}</p>
												</div>
												<div className="min-w-0 sm:border-l sm:border-dx-filet sm:pl-6">
													<div className="flex flex-wrap items-center gap-2">
														<h3 className="dx-h3 !text-lg">{appt.serviceName}</h3>
														<Pastille ton="ok">Effectué</Pastille>
													</div>
													<p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-dx-gris">
														<span className="font-medium text-dx-encre-2">Artisan : {appt.stylistName}</span>
														<span aria-hidden="true">·</span>
														<span className="inline-flex items-center gap-1"><Clock size={12} /> {appt.duration}</span>
														<span aria-hidden="true">·</span>
														<span className="dx-tabulaire font-semibold text-dx-encre">{appt.price} €</span>
													</p>
													<p className="mt-0.5 text-xs text-dx-gris">{appt.date}</p>

													{appt.notes && (
														<p className="mt-3 border-l-2 border-dx-terre-clair pl-3 font-heading text-[0.9375rem] italic leading-relaxed text-dx-encre-2">
															{appt.notes}
														</p>
													)}

													<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
														<div className="flex items-center gap-0.5" aria-label={`Note ${appt.rating || 5} sur 5`}>
															{[...Array(appt.rating || 5)].map((_, k) => (
																<Star key={k} size={13} className="fill-current text-dx-terre" />
															))}
															<span className="ml-2 text-xs text-dx-gris">Note maximale (5/5)</span>
														</div>
														<div className="flex items-center gap-2">
															<button
																type="button"
																onClick={() => setSelectedReceipt(appt)}
																className="dx-btn dx-btn--sm dx-btn--ligne"
																title="Voir le reçu de la prestation"
															>
																<Receipt size={14} />
																<span>Reçu</span>
															</button>
															<a href={`/demo-diamant/reservation?service=${encodeURIComponent(appt.serviceName)}`} className="dx-btn dx-btn--sm">
																<RefreshCw size={13} />
																<span>Reprendre ce rendez-vous</span>
															</a>
														</div>
													</div>
												</div>
											</article>
										</motion.li>
									);
								})}
							</ol>
						</section>
					))}
				</div>
			)}

			{/* Reçu de prestation */}
			<Fenetre
				ouvert={!!selectedReceipt}
				onClose={() => setSelectedReceipt(null)}
				largeur={440}
				icone={<Receipt size={18} />}
				titre="Reçu de Prestation"
				sousTitre={selectedReceipt?.receiptNumber}
				pied={
					<>
						<button type="button" onClick={() => setSelectedReceipt(null)} className="dx-btn dx-btn--sm dx-btn--ligne">
							Fermer
						</button>
						<button
							type="button"
							onClick={() => {
								showToast("Téléchargement du reçu PDF démarré.");
								setSelectedReceipt(null);
							}}
							className="dx-btn dx-btn--sm dx-btn--encre"
						>
							<Download size={14} />
							<span>Télécharger PDF</span>
						</button>
					</>
				}
			>
				{selectedReceipt && (
					<div className="rounded-xl border border-dashed border-dx-filet-fort bg-dx-ivoire px-5 py-4">
						<dl className="divide-y divide-dashed divide-dx-filet-fort text-sm">
							{[
								['Établissement', 'Maison Prestige Diamant'],
								['Date & Heure', `${selectedReceipt.date} à ${selectedReceipt.time}`],
								['Prestation', selectedReceipt.serviceName],
								['Coiffeur(se) artisan', selectedReceipt.stylistName],
								['Points fidélité gagnés', `+${selectedReceipt.pointsEarned} points VIP`],
							].map(([k, v]) => (
								<div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
									<dt className="text-dx-gris">{k}</dt>
									<dd className={`text-right font-medium ${k.startsWith('Points') ? 'text-dx-terre' : 'text-dx-encre'}`}>{v}</dd>
								</div>
							))}
						</dl>
						<div className="mt-2 flex items-baseline justify-between border-t border-dx-encre pt-3">
							<span className="font-semibold text-dx-encre">Total réglé (TTC)</span>
							<span className="dx-chiffre text-3xl text-dx-encre">{selectedReceipt.price} €</span>
						</div>
					</div>
				)}
			</Fenetre>
		</div>
	);
}

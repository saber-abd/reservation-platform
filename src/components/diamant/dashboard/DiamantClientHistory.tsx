import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
	Calendar, 
	Clock, 
	CheckCircle2, 
	Star, 
	Search, 
	Scissors, 
	Download, 
	RefreshCw, 
	Sparkles, 
	ChevronRight, 
	Filter, 
	Receipt,
	User,
	Eye,
	X
} from 'lucide-react';

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
	const [appointments, setAppointments] = useState<PastAppointment[]>(DEMO_PAST_APPOINTMENTS);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedPeriod, setSelectedPeriod] = useState<'all' | '3months' | '2025'>('all');
	const [selectedReceipt, setSelectedReceipt] = useState<PastAppointment | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	function showToast(msg: string) {
		setToast(msg);
		setTimeout(() => setToast(null), 3000);
	}

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
				} else if (data && data.length > 0) {
					const mapped: PastAppointment[] = data.map((appt: any, idx: number) => {
						const dateObj = new Date(appt.start_time);
						const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
						const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

						return {
							id: appt.id || `db-${idx}`,
							serviceName: appt.services?.name || 'Prestation Personnalisée',
							stylistName: appt.professionals?.business_name || 'Équipe Diamant',
							date: dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
							time: timeStr,
							rawDate: appt.start_time,
							duration: appt.services?.duration_minutes ? `${appt.services.duration_minutes} min` : '1h',
							price: appt.services?.price || 90,
							status: (appt.status === 'cancelled' ? 'cancelled' : 'completed') as any,
							rating: 5,
							pointsEarned: Math.floor(appt.services?.price || 90),
							receiptNumber: `REC-${dateObj.getFullYear()}-${String(idx + 1).padStart(4, '0')}`
						};
					});

					// Combiner avec les données de démo s'il y a peu de rendez-vous
					setAppointments([...mapped, ...DEMO_PAST_APPOINTMENTS]);
				}
			} catch (e) {
				console.error(e);
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

	// Statistiques cumulées
	const totalPrestations = appointments.filter(a => a.status === 'completed').length;
	const totalPointsEarned = appointments.reduce((acc, a) => acc + (a.status === 'completed' ? a.pointsEarned : 0), 0);

	return (
		<div className="space-y-8">
			{/* Toast */}
			{toast && (
				<div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold border border-stone-800 animate-in fade-in slide-in-from-bottom-4">
					<Sparkles size={16} className="text-jasmine-400" />
					<span>{toast}</span>
				</div>
			)}

			{/* En-tête des Statistiques Client */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-deep-teal-50 border border-deep-teal-200 flex items-center justify-center text-deep-teal-700">
							<CheckCircle2 size={20} />
						</div>
						<div>
							<p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Prestations honorées</p>
							<p className="text-2xl font-black text-stone-900 mt-0.5 font-coolvetica">{totalPrestations} visites</p>
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-jasmine-200 bg-gradient-to-br from-jasmine-50/70 to-white p-5 shadow-xs">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-jasmine-100 border border-jasmine-300 flex items-center justify-center text-jasmine-700">
							<Star size={20} className="fill-current" />
						</div>
						<div>
							<p className="text-xs text-jasmine-800 font-bold uppercase tracking-wider">Points fidélité cumulés</p>
							<p className="text-2xl font-black text-jasmine-700 mt-0.5 font-coolvetica">+{totalPointsEarned} pts</p>
						</div>
					</div>
				</div>

				<div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700">
							<Scissors size={20} />
						</div>
						<div>
							<p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Artisan Coiffeur Favori</p>
							<p className="text-base font-black text-stone-900 mt-0.5 font-coolvetica">Sarah Delorme</p>
						</div>
					</div>
				</div>
			</div>

			{/* Barre d'outils : Recherche & Filtres */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
				<div className="relative flex-1 max-w-md">
					<Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
					<input
						type="text"
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						placeholder="Rechercher par soin, coiffeur, date..."
						className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-stone-200 focus:border-deep-teal-500 focus:ring-2 focus:ring-deep-teal-500/20 focus:outline-none text-sm transition-all shadow-xs"
					/>
				</div>

				<div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200 self-start sm:self-auto">
					<button
						type="button"
						onClick={() => setSelectedPeriod('all')}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							selectedPeriod === 'all' 
								? 'bg-white text-stone-900 shadow-xs' 
								: 'text-stone-500 hover:text-stone-900'
						}`}
					>
						Toutes ({appointments.length})
					</button>
					<button
						type="button"
						onClick={() => setSelectedPeriod('3months')}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							selectedPeriod === '3months' 
								? 'bg-white text-stone-900 shadow-xs' 
								: 'text-stone-500 hover:text-stone-900'
						}`}
					>
						3 derniers mois
					</button>
					<button
						type="button"
						onClick={() => setSelectedPeriod('2025')}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							selectedPeriod === '2025' 
								? 'bg-white text-stone-900 shadow-xs' 
								: 'text-stone-500 hover:text-stone-900'
						}`}
					>
						Année 2025
					</button>
				</div>
			</div>

			{/* Liste des Rendez-vous Passés */}
			<div className="space-y-4">
				{loading ? (
					<div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500 text-sm">
						Chargement de votre historique de prestations...
					</div>
				) : filtered.length === 0 ? (
					<div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-xs">
						<div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
							<Calendar size={22} />
						</div>
						<p className="font-bold text-stone-900 text-base">Aucun rendez-vous trouvé</p>
						<p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
							Aucune prestation ne correspond à vos filtres de recherche.
						</p>
						{searchQuery && (
							<button
								type="button"
								onClick={() => { setSearchQuery(''); setSelectedPeriod('all'); }}
								className="mt-4 px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 transition-colors"
							>
								Réinitialiser les filtres
							</button>
						)}
					</div>
				) : (
					filtered.map((appt) => (
						<div 
							key={appt.id} 
							className="rounded-2xl border border-stone-200 bg-white p-5 md:p-6 shadow-xs hover:border-stone-300 hover:shadow-sm transition-all"
						>
							<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
								<div className="flex items-start gap-3.5">
									<div className="w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 shrink-0">
										<Scissors size={20} />
									</div>
									<div>
										<div className="flex flex-wrap items-center gap-2">
											<h3 className="font-bold text-stone-900 text-base md:text-lg font-coolvetica">
												{appt.serviceName}
											</h3>
											<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
												<CheckCircle2 size={12} className="text-emerald-600" />
												<span>Effectué</span>
											</span>
										</div>
										<p className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-3">
											<span className="font-semibold text-stone-700">Artisan : {appt.stylistName}</span>
											<span>•</span>
											<span className="flex items-center gap-1">
												<Clock size={12} className="text-stone-400" />
												{appt.duration}
											</span>
											<span>•</span>
											<span className="font-black text-stone-900">{appt.price} €</span>
										</p>
									</div>
								</div>

								<div className="text-left md:text-right shrink-0">
									<p className="text-sm font-bold text-stone-900">{appt.date}</p>
									<p className="text-xs text-stone-400 mt-0.5">à {appt.time}</p>
								</div>
							</div>

							{appt.notes && (
								<p className="text-xs text-stone-600 mt-3.5 leading-relaxed bg-stone-50/80 p-3 rounded-xl border border-stone-100">
									{appt.notes}
								</p>
							)}

							<div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-1">
								<div className="flex items-center gap-1">
									{[...Array(appt.rating || 5)].map((_, i) => (
										<Star key={i} size={14} className="text-jasmine-500 fill-current" />
									))}
									<span className="text-xs text-stone-400 font-bold ml-1.5">Note maximale (5/5)</span>
								</div>

								<div className="flex items-center gap-2.5">
									<button
										type="button"
										onClick={() => setSelectedReceipt(appt)}
										className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors cursor-pointer"
										title="Voir le reçu de la prestation"
									>
										<Receipt size={14} className="text-stone-500" />
										<span>Reçu</span>
									</button>

									<a
										href={`/demo-diamant/reservation?service=${encodeURIComponent(appt.serviceName)}`}
										className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-deep-teal-600 text-white text-xs font-bold hover:bg-deep-teal-700 transition-all shadow-xs cursor-pointer"
									>
										<RefreshCw size={13} />
										<span>Reprendre ce rendez-vous</span>
									</a>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{/* Modal Reçu de Prestation */}
			{selectedReceipt && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
						<div className="flex items-center justify-between pb-4 border-b border-stone-100">
							<div className="flex items-center gap-2.5">
								<div className="w-10 h-10 rounded-xl bg-jasmine-100 text-jasmine-700 flex items-center justify-center">
									<Receipt size={20} />
								</div>
								<div>
									<h4 className="font-bold text-stone-900 text-base">Reçu de Prestation</h4>
									<p className="text-xs text-stone-400">{selectedReceipt.receiptNumber}</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setSelectedReceipt(null)}
								className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg cursor-pointer"
							>
								<X size={18} />
							</button>
						</div>

						<div className="my-5 space-y-3.5 text-xs text-stone-600">
							<div className="flex items-center justify-between py-1.5 border-b border-stone-100">
								<span className="text-stone-400">Établissement</span>
								<span className="font-bold text-stone-900">Maison Prestige Diamant</span>
							</div>
							<div className="flex items-center justify-between py-1.5 border-b border-stone-100">
								<span className="text-stone-400">Date & Heure</span>
								<span className="font-bold text-stone-900">{selectedReceipt.date} à {selectedReceipt.time}</span>
							</div>
							<div className="flex items-center justify-between py-1.5 border-b border-stone-100">
								<span className="text-stone-400">Prestation</span>
								<span className="font-bold text-stone-900 text-right">{selectedReceipt.serviceName}</span>
							</div>
							<div className="flex items-center justify-between py-1.5 border-b border-stone-100">
								<span className="text-stone-400">Coiffeur(se) artisan</span>
								<span className="font-bold text-stone-900">{selectedReceipt.stylistName}</span>
							</div>
							<div className="flex items-center justify-between py-1.5 border-b border-stone-100">
								<span className="text-stone-400">Points fidélité gagnés</span>
								<span className="font-bold text-jasmine-600">+{selectedReceipt.pointsEarned} points VIP</span>
							</div>
							<div className="flex items-center justify-between pt-2 text-sm">
								<span className="font-bold text-stone-900">Total réglé (TTC)</span>
								<span className="text-lg font-black text-stone-900">{selectedReceipt.price} €</span>
							</div>
						</div>

						<div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
							<button
								type="button"
								onClick={() => setSelectedReceipt(null)}
								className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50"
							>
								Fermer
							</button>
							<button
								type="button"
								onClick={() => {
									showToast("Téléchargement du reçu PDF démarré.");
									setSelectedReceipt(null);
								}}
								className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-all shadow-xs cursor-pointer"
							>
								<Download size={14} />
								<span>Télécharger PDF</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

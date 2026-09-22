import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrimaryProfessional, getDemoTag, type Appointment } from '@/lib/queries';
import { generateDiamantDemoAppointments, DEMO_DIAMANT_CLIENTS } from '@/lib/diamantDemoData';
import DiamantNewClientsModal, { type PeriodClientDetail } from './DiamantNewClientsModal';
import { ArrowUpRight, Users, Calendar, TrendingUp, Clock, MapPin, ChevronDown } from 'lucide-react';
import DiamantRevenueChart from './DiamantRevenueChart';

type AppointmentWithService = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
};

type TimeRange = 'week' | 'month' | 'year' | 'custom';

export default function DiamantDashboardOverview() {
	const [range, setRange] = useState<TimeRange>('month');
	const [customStart, setCustomStart] = useState('');
	const [customEnd, setCustomEnd] = useState('');
	
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({ ca: 0, rdv: 0, newClients: 0, panier: 0 });
	const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
	const [periodClients, setPeriodClients] = useState<PeriodClientDetail[]>([]);
	const [showNewClientsModal, setShowNewClientsModal] = useState(false);
	
	// Pour afficher les RDV "Prochains" ou "Derniers" si aucun prochain
	const [displayAppointments, setDisplayAppointments] = useState<{ type: 'prochains' | 'derniers', list: AppointmentWithService[] }>({ type: 'prochains', list: [] });

	useEffect(() => {
		fetchDashboardData();
	}, [range, customStart, customEnd]);

	function getRangeLabel(r: TimeRange): string {
		switch (r) {
			case 'week': return '7 derniers jours';
			case 'month': return '30 derniers jours';
			case 'year': return '1 an';
			case 'custom': return 'Période personnalisée';
		}
	}

	async function fetchDashboardData() {
		try {
			setLoading(true);
			const tag = getDemoTag();
			const pro = await getPrimaryProfessional(tag);

			// Définir la plage de dates
			let startDate = new Date();
			let endDate = new Date();
			const now = new Date();

			if (range === 'week') {
				startDate.setDate(now.getDate() - 7);
			} else if (range === 'month') {
				startDate.setMonth(now.getMonth() - 1);
			} else if (range === 'year') {
				startDate.setFullYear(now.getFullYear() - 1);
			} else if (range === 'custom' && customStart && customEnd) {
				startDate = new Date(customStart);
				endDate = new Date(customEnd);
			}
			startDate.setHours(0, 0, 0, 0);
			endDate.setHours(23, 59, 59, 999);

			let periodData: AppointmentWithService[] | null = null;

			// 1. Récupérer tous les RDV de la période pour les stats depuis Supabase
			if (pro) {
				const { data, error } = await supabase
					.from('appointments')
					.select('*, services(name, duration_minutes, price)')
					.eq('professional_id', pro.id)
					.eq('tag_bd', tag)
					.gte('start_time', startDate.toISOString())
					.lte('start_time', endDate.toISOString());
				if (!error && data && data.length > 0) {
					periodData = data as AppointmentWithService[];
				}
			}

			// Fallback démo réaliste si aucune donnée en base (mode démo public)
			const allDemoAppointments = generateDiamantDemoAppointments();
			const rdvs = (periodData && periodData.length > 0)
				? periodData
				: allDemoAppointments.filter(app => {
					const t = new Date(app.start_time).getTime();
					return t >= startDate.getTime() && t <= endDate.getTime();
				});

			const completed = rdvs.filter(r => r.status !== 'cancelled');
			
			// Fix : stocker les rendez-vous dans le state pour alimenter DiamantRevenueChart
			setAppointments(completed);

			const totalCa = completed.reduce((sum, r) => sum + (r.services?.price || 0), 0);
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
			setLoading(false);
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

	return (
		<div className="space-y-8">
			{/* Filtres de date */}
			<div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-sm w-fit">
				<button 
					onClick={() => setRange('week')}
					className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${range === 'week' ? 'bg-deep-teal-50 text-deep-teal-600 border border-deep-teal-200' : 'text-stone-500 hover:bg-stone-50 border border-transparent'}`}
				>
					7 derniers jours
				</button>
				<button 
					onClick={() => setRange('month')}
					className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${range === 'month' ? 'bg-deep-teal-50 text-deep-teal-600 border border-deep-teal-200' : 'text-stone-500 hover:bg-stone-50 border border-transparent'}`}
				>
					30 derniers jours
				</button>
				<button 
					onClick={() => setRange('year')}
					className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${range === 'year' ? 'bg-deep-teal-50 text-deep-teal-600 border border-deep-teal-200' : 'text-stone-500 hover:bg-stone-50 border border-transparent'}`}
				>
					1 an
				</button>
				<div className="h-6 w-px bg-stone-200 mx-1"></div>
				<button 
					onClick={() => setRange('custom')}
					className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${range === 'custom' ? 'bg-deep-teal-50 text-deep-teal-600 border border-deep-teal-200' : 'text-stone-500 hover:bg-stone-50 border border-transparent'}`}
				>
					Personnalisé
				</button>
				
				{range === 'custom' && (
					<div className="flex items-center gap-2 ml-2">
						<input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-2 py-1 text-stone-600 outline-none focus:border-deep-teal-400" />
						<span className="text-stone-400">à</span>
						<input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-2 py-1 text-stone-600 outline-none focus:border-deep-teal-400" />
					</div>
				)}
			</div>

			{loading ? (
				<div className="py-12 text-center text-stone-400 font-medium">Chargement des données...</div>
			) : (
				<>
					{/* KPIs */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
						<a href="/demo-diamant/dashboard/statistiques" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-deep-teal-200 hover:shadow-md transition-all card-hover group">
							<div className="flex items-center justify-between mb-3">
								<div className="w-9 h-9 rounded-xl bg-deep-teal-50 border border-deep-teal-100 flex items-center justify-center text-deep-teal-500">
									<TrendingUp size={18} />
								</div>
								<span className="text-xs font-bold text-stone-400 group-hover:text-deep-teal-500 transition-colors flex items-center gap-1">Détails <ArrowUpRight size={12}/></span>
							</div>
							<p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Chiffre d'Affaires</p>
							<p className="text-2xl font-black text-stone-800 font-coolvetica">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.ca)}</p>
						</a>

						<a href="/demo-diamant/dashboard/disponibilites" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-jasmine-200 hover:shadow-md transition-all card-hover group">
							<div className="flex items-center justify-between mb-3">
								<div className="w-9 h-9 rounded-xl bg-jasmine-50 border border-jasmine-100 flex items-center justify-center text-jasmine-600">
									<Calendar size={18} />
								</div>
								<span className="text-xs font-bold text-stone-400 group-hover:text-jasmine-600 transition-colors flex items-center gap-1">Détails <ArrowUpRight size={12}/></span>
							</div>
							<p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">RDV de la période</p>
							<p className="text-2xl font-black text-stone-800 font-coolvetica">{stats.rdv}</p>
						</a>

						<button 
							type="button"
							onClick={() => setShowNewClientsModal(true)} 
							className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-deep-teal-300 hover:shadow-md transition-all card-hover group text-left cursor-pointer"
						>
							<div className="flex items-center justify-between mb-3">
								<div className="w-9 h-9 rounded-xl bg-deep-teal-50 border border-deep-teal-100 flex items-center justify-center text-deep-teal-500 group-hover:scale-105 group-hover:bg-deep-teal-500 group-hover:text-white transition-all">
									<Users size={18} />
								</div>
								<span className="text-xs font-bold text-stone-400 group-hover:text-deep-teal-600 transition-colors flex items-center gap-1">Voir liste <ArrowUpRight size={12}/></span>
							</div>
							<p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Nouveaux Clients</p>
							<p className="text-2xl font-black text-stone-800 font-coolvetica">{stats.newClients}</p>
						</button>

						<a href="/demo-diamant/dashboard/statistiques" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-jasmine-200 hover:shadow-md transition-all card-hover group">
							<div className="flex items-center justify-between mb-3">
								<div className="w-9 h-9 rounded-xl bg-jasmine-50 border border-jasmine-100 flex items-center justify-center text-jasmine-600">
									<span className="font-black text-base">€</span>
								</div>
								<span className="text-xs font-bold text-stone-400 group-hover:text-jasmine-600 transition-colors flex items-center gap-1">Détails <ArrowUpRight size={12}/></span>
							</div>
							<p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Panier Moyen</p>
							<p className="text-2xl font-black text-stone-800 font-coolvetica">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.panier)}</p>
						</a>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Chart */}
						<div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
							<div className="flex items-center justify-between mb-5">
								<h2 className="text-base font-bold text-stone-800 font-coolvetica">Évolution du CA</h2>
								<a href="/demo-diamant/dashboard/statistiques" className="text-xs font-bold uppercase tracking-widest text-deep-teal-500 hover:text-deep-teal-400">Rapport complet →</a>
							</div>
							{/* On utilise les données dynamiques */}
							<DiamantRevenueChart appointments={appointments} range={range} />
						</div>

						{/* Prochains RDV / Derniers RDV */}
						<div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
							<div className="flex items-center justify-between mb-5">
								<h2 className="text-base font-bold text-stone-800 font-coolvetica">
									{displayAppointments.type === 'prochains' ? 'Prochains RDV' : 'Derniers RDV'}
								</h2>
								{displayAppointments.type === 'derniers' && (
									<span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 bg-stone-100 px-2 py-1 rounded-full">Aucun RDV à venir</span>
								)}
							</div>
							
							<div className="space-y-3">
								{displayAppointments.list.length === 0 ? (
									<p className="text-sm text-stone-500 italic text-center py-4">Aucun rendez-vous trouvé.</p>
								) : (
									displayAppointments.list.map((rdv) => (
										<div key={rdv.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${displayAppointments.type === 'prochains' ? 'border-stone-100 bg-stone-50 hover:border-deep-teal-200' : 'border-stone-100 bg-white opacity-70 hover:opacity-100'}`}>
											<div className="w-10 h-10 rounded-full bg-stone-200 border border-stone-300 overflow-hidden shrink-0 flex items-center justify-center font-bold text-stone-500">
												{/* Simple Initial Avatar */}
												{rdv.client_name?.charAt(0).toUpperCase()}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-stone-800 font-bold text-sm truncate">{rdv.client_name}</p>
												<p className="text-stone-500 text-xs truncate">{rdv.services?.name || 'Prestation'}</p>
											</div>
											<div className="text-right shrink-0">
												<p className={`font-bold text-sm ${displayAppointments.type === 'prochains' ? 'text-deep-teal-600' : 'text-stone-500'}`}>{formatTime(rdv.start_time)}</p>
												<p className="text-stone-400 text-xs">{formatDateShort(rdv.start_time)}</p>
											</div>
										</div>
									))
								)}
							</div>
							
							<a href="/demo-diamant/dashboard/disponibilites" className="block w-full text-center mt-5 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-deep-teal-500 transition-colors pt-4 border-t border-stone-100">
								Voir l'agenda complet →
							</a>
						</div>
					</div>
				</>
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

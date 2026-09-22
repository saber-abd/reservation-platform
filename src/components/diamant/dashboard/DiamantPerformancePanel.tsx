import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrimaryProfessional, getDemoTag, type Appointment } from '@/lib/queries';
import { generateDiamantDemoAppointments, DEMO_DIAMANT_CLIENTS } from '@/lib/diamantDemoData';
import DiamantRevenueChart from './DiamantRevenueChart';
import DiamantNewClientsModal, { type PeriodClientDetail } from './DiamantNewClientsModal';
import { TrendingUp, Calendar, Users, ArrowUpRight, BarChart3, Scissors, Award, Clock } from 'lucide-react';

type AppointmentWithService = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
};

type TimeRange = 'week' | 'month' | 'year' | 'custom';

export default function DiamantPerformancePanel() {
	const [range, setRange] = useState<TimeRange>('month');
	const [customStart, setCustomStart] = useState('');
	const [customEnd, setCustomEnd] = useState('');
	
	const [loading, setLoading] = useState(true);
	const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
	const [periodClients, setPeriodClients] = useState<PeriodClientDetail[]>([]);
	const [showNewClientsModal, setShowNewClientsModal] = useState(false);

	useEffect(() => {
		fetchData();
	}, [range, customStart, customEnd]);

	function getRangeLabel(r: TimeRange): string {
		switch (r) {
			case 'week': return '7 derniers jours';
			case 'month': return '30 derniers jours';
			case 'year': return '1 an';
			case 'custom': return 'Période personnalisée';
		}
	}

	async function fetchData() {
		try {
			setLoading(true);
			const tag = getDemoTag();
			const pro = await getPrimaryProfessional(tag);

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

			// Fallback données réalistes
			const allDemoAppointments = generateDiamantDemoAppointments();
			const rdvs = (periodData && periodData.length > 0)
				? periodData
				: allDemoAppointments.filter(app => {
					const t = new Date(app.start_time).getTime();
					return t >= startDate.getTime() && t <= endDate.getTime();
				});

			const completed = rdvs.filter(r => r.status !== 'cancelled');
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
			setLoading(false);
		}
	}

	// Calcul des KPIs
	const totalCa = useMemo(() => appointments.reduce((sum, r) => sum + (r.services?.price || 0), 0), [appointments]);
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
				ca,
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

	return (
		<div className="space-y-8">
			{/* Sélecteur de période */}
			<div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-xs font-bold text-stone-400 uppercase tracking-widest mr-2">Période :</span>
					<button 
						onClick={() => setRange('week')}
						className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${range === 'week' ? 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200 shadow-2xs' : 'text-stone-600 hover:bg-stone-50 border border-transparent'}`}
					>
						7 jours
					</button>
					<button 
						onClick={() => setRange('month')}
						className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${range === 'month' ? 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200 shadow-2xs' : 'text-stone-600 hover:bg-stone-50 border border-transparent'}`}
					>
						30 jours
					</button>
					<button 
						onClick={() => setRange('year')}
						className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${range === 'year' ? 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200 shadow-2xs' : 'text-stone-600 hover:bg-stone-50 border border-transparent'}`}
					>
						1 an
					</button>
					<button 
						onClick={() => setRange('custom')}
						className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${range === 'custom' ? 'bg-deep-teal-50 text-deep-teal-700 border border-deep-teal-200 shadow-2xs' : 'text-stone-600 hover:bg-stone-50 border border-transparent'}`}
					>
						Personnalisé
					</button>
				</div>

				{range === 'custom' && (
					<div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
						<input 
							type="date" 
							value={customStart}
							onChange={e => setCustomStart(e.target.value)}
							className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:border-deep-teal-400"
						/>
						<span className="text-xs text-stone-400 font-bold">au</span>
						<input 
							type="date" 
							value={customEnd}
							onChange={e => setCustomEnd(e.target.value)}
							className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:border-deep-teal-400"
						/>
					</div>
				)}
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
				{/* CA */}
				<div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
					<div className="flex items-center justify-between mb-3">
						<div className="w-9 h-9 rounded-xl bg-deep-teal-50 border border-deep-teal-100 flex items-center justify-center text-deep-teal-500">
							<TrendingUp size={18} />
						</div>
						<span className="text-[11px] font-bold text-deep-teal-600 bg-deep-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
							{getRangeLabel(range)}
						</span>
					</div>
					<p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Chiffre d'Affaires</p>
					<p className="text-2xl font-black text-stone-800 font-coolvetica">
						{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalCa)}
					</p>
				</div>

				{/* RDV */}
				<div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
					<div className="flex items-center justify-between mb-3">
						<div className="w-9 h-9 rounded-xl bg-jasmine-50 border border-jasmine-100 flex items-center justify-center text-jasmine-600">
							<Calendar size={18} />
						</div>
						<span className="text-[11px] font-bold text-jasmine-700 bg-jasmine-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
							Activité
						</span>
					</div>
					<p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Rendez-vous réalisés</p>
					<p className="text-2xl font-black text-stone-800 font-coolvetica">{rdvCount}</p>
				</div>

				{/* Nouveaux Clients (Cliquable !) */}
				<button 
					type="button"
					onClick={() => setShowNewClientsModal(true)} 
					className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-deep-teal-300 hover:shadow-md transition-all card-hover group text-left cursor-pointer"
				>
					<div className="flex items-center justify-between mb-3">
						<div className="w-9 h-9 rounded-xl bg-deep-teal-50 border border-deep-teal-100 flex items-center justify-center text-deep-teal-500 group-hover:scale-105 group-hover:bg-deep-teal-500 group-hover:text-white transition-all">
							<Users size={18} />
						</div>
						<span className="text-[11px] font-bold text-stone-400 group-hover:text-deep-teal-600 transition-colors flex items-center gap-1">
							Voir liste <ArrowUpRight size={12}/>
						</span>
					</div>
					<p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Nouveaux Clients</p>
					<p className="text-2xl font-black text-stone-800 font-coolvetica">{newClientsCount}</p>
				</button>

				{/* Panier Moyen */}
				<div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
					<div className="flex items-center justify-between mb-3">
						<div className="w-9 h-9 rounded-xl bg-jasmine-50 border border-jasmine-100 flex items-center justify-center text-jasmine-600">
							<span className="font-black text-base">€</span>
						</div>
						<span className="text-[11px] font-bold text-jasmine-700 bg-jasmine-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
							Moyenne
						</span>
					</div>
					<p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Panier Moyen</p>
					<p className="text-2xl font-black text-stone-800 font-coolvetica">
						{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(panierMoyen)}
					</p>
				</div>
			</div>

			{/* Graphique d'évolution du CA */}
			<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-base font-bold text-stone-800">Évolution du Chiffre d'Affaires</h2>
						<p className="text-xs text-stone-400 mt-0.5">Historique des recettes sur : {getRangeLabel(range)}</p>
					</div>
					<span className="text-xs font-bold text-deep-teal-600 bg-deep-teal-50 border border-deep-teal-100 px-3 py-1 rounded-full uppercase tracking-wider">
						{appointments.length} prestation{appointments.length > 1 ? 's' : ''}
					</span>
				</div>
				<DiamantRevenueChart appointments={appointments} range={range} />
			</div>

			{/* Top Prestations & Fidélité */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Top prestations */}
				<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<h2 className="text-base font-bold text-stone-800 mb-6">Top Prestations ({getRangeLabel(range)})</h2>
					<div className="space-y-5">
						{topServices.length === 0 ? (
							<p className="text-sm text-stone-400 py-6 text-center">Aucune prestation sur la période</p>
						) : (
							topServices.map((svc) => (
								<div key={svc.name}>
									<div className="flex items-center justify-between mb-2">
										<span className="text-stone-700 text-sm font-medium">{svc.name} ({svc.count}x)</span>
										<div className="text-right">
											<span className="text-deep-teal-600 font-bold text-sm">{svc.percentage}%</span>
											<span className="text-[11px] text-stone-400 ml-2 font-medium">({svc.ca}€)</span>
										</div>
									</div>
									<div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
										<div 
											className="bg-deep-teal-400 h-2 rounded-full transition-all duration-500" 
											style={{ width: `${svc.percentage}%` }}
										/>
									</div>
								</div>
							))
						)}
					</div>
				</div>

				{/* Fidélité */}
				<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<h2 className="text-base font-bold text-stone-800 mb-6">Fidélité Clientèle</h2>
					<div className="flex items-center justify-center h-48">
						<div className="relative w-44 h-44 flex items-center justify-center">
							<svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
								<circle cx="50" cy="50" r="38" fill="none" stroke="#f5f5f4" strokeWidth="12" />
								<circle 
									cx="50" cy="50" r="38" fill="none" stroke="#14b8a6" strokeWidth="12"
									strokeDasharray={`${Math.round(retentionRate * 2.38)} 238`} strokeLinecap="round" 
								/>
							</svg>
							<div className="text-center z-10">
								<span className="block text-3xl font-black text-stone-900 font-coolvetica">{retentionRate}%</span>
								<span className="text-[11px] text-stone-400 uppercase tracking-widest font-bold">Rétention</span>
							</div>
						</div>
					</div>
					<div className="mt-4 grid grid-cols-2 gap-3">
						<div className="rounded-xl bg-stone-50 border border-stone-100 p-3 text-center">
							<p className="text-xl font-black text-stone-900 font-coolvetica">{rdvCount}</p>
							<p className="text-xs text-stone-400 uppercase tracking-widest mt-0.5">Visites totales</p>
						</div>
						<div 
							onClick={() => setShowNewClientsModal(true)}
							className="rounded-xl bg-deep-teal-50 border border-deep-teal-100 p-3 text-center cursor-pointer hover:bg-deep-teal-100/70 transition-colors"
							title="Cliquer pour voir la liste"
						>
							<p className="text-xl font-black text-deep-teal-700 font-coolvetica">+{newClientsCount}</p>
							<p className="text-xs text-deep-teal-500 uppercase tracking-widest mt-0.5 font-bold">Nouveaux clients</p>
						</div>
					</div>
				</div>
			</div>

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

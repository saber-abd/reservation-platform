import { useEffect, useMemo, useState } from 'react';
import { useAuthedProfessional } from '@/lib/useAuthedProfessional';
import { getAppointmentsForProfessional, getAllServices, type Appointment, type Service } from '@/lib/queries';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

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

export default function PremiumStatsPanel() {
	const { loading, professional, error } = useAuthedProfessional();
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [services, setServices] = useState<Service[]>([]);
	const [daysPreset, setDaysPreset] = useState(30);

	useEffect(() => {
		if (!professional) return;
		Promise.all([getAppointmentsForProfessional(professional.id), getAllServices(professional.id)]).then(
			([appointmentsData, servicesData]) => {
				setAppointments(appointmentsData);
				setServices(servicesData);
			},
		);
	}, [professional]);

	const { stats, revenueData, serviceData } = useMemo(() => {
		const now = new Date();
		const rangeStart = new Date(isoDaysAgo(daysPreset) + 'T00:00:00');
		
		const priceByService = new Map(services.map((s) => [s.id, s.price]));
		const nameByService = new Map(services.map((s) => [s.id, s.name]));
		
		const activeAppointments = appointments.filter((a) => a.status !== 'cancelled');

		const inRange = activeAppointments.filter((a) => {
			const start = new Date(a.start_time);
			return start >= rangeStart && start <= now;
		});

		const revenueInRange = inRange.reduce((sum, a) => sum + (priceByService.get(a.service_id) ?? 0), 0);

		// Group by day for the chart
		const revByDay = new Map<string, number>();
		for (let i = daysPreset; i >= 0; i--) {
			revByDay.set(isoDaysAgo(i), 0);
		}

		inRange.forEach(a => {
			const day = a.start_time.slice(0, 10);
			if (revByDay.has(day)) {
				revByDay.set(day, (revByDay.get(day) ?? 0) + (priceByService.get(a.service_id) ?? 0));
			}
		});

		const revenueChartData = Array.from(revByDay.entries()).map(([date, revenue]) => ({
			date: formatDate(date),
			revenue,
		}));

		// Group by service
		const countByService = new Map<string, number>();
		inRange.forEach(a => {
			countByService.set(a.service_id, (countByService.get(a.service_id) ?? 0) + 1);
		});

		const serviceChartData = Array.from(countByService.entries()).map(([id, count]) => ({
			name: nameByService.get(id) || 'Inconnu',
			count,
			revenue: count * (priceByService.get(id) ?? 0)
		})).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

		return {
			stats: {
				appointmentsCount: inRange.length,
				revenue: revenueInRange,
				avgTicket: inRange.length ? Math.round(revenueInRange / inRange.length) : 0,
			},
			revenueData: revenueChartData,
			serviceData: serviceChartData
		};
	}, [appointments, services, daysPreset]);

	if (loading) return <div className="animate-pulse h-64 bg-stone-900 rounded-xl"></div>;
	if (error) return <p className="text-sm text-red-500">{error}</p>;

	return (
		<div className="space-y-8 animate-[fade-in_0.5s_ease-out]">
			<div>
				<h1 className="text-3xl font-black text-white uppercase tracking-widest font-[var(--font-heading)]">Télémétrie</h1>
				<p className="mt-2 text-stone-400 font-medium">Analyse des performances et statistiques d'activité.</p>
			</div>

			<div className="flex gap-2">
				{[7, 30, 90].map(days => (
					<button
						key={days}
						onClick={() => setDaysPreset(days)}
						className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
							daysPreset === days 
							? 'bg-primary text-white shadow-[0_0_15px_rgba(255,50,50,0.3)]' 
							: 'bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800'
						}`}
					>
						{days} Jours
					</button>
				))}
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6 relative overflow-hidden group">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
					<p className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-2">Chiffre d'affaires</p>
					<p className="text-4xl font-black text-white font-[var(--font-heading)]">{stats.revenue} €</p>
				</div>
				<div className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6 relative overflow-hidden group">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
					<p className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-2">Interventions</p>
					<p className="text-4xl font-black text-white font-[var(--font-heading)]">{stats.appointmentsCount}</p>
				</div>
				<div className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6 relative overflow-hidden group">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
					<p className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-2">Panier Moyen</p>
					<p className="text-4xl font-black text-white font-[var(--font-heading)]">{stats.avgTicket} €</p>
				</div>
			</div>

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6">
					<h3 className="text-white font-bold uppercase tracking-wider mb-6">Évolution CA</h3>
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={revenueData}>
								<defs>
									<linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#e11d48" stopOpacity={0.3}/>
										<stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
								<XAxis dataKey="date" stroke="#78716c" fontSize={12} tickLine={false} axisLine={false} />
								<YAxis stroke="#78716c" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}€`} />
								<Tooltip 
									contentStyle={{ backgroundColor: '#1c1917', borderColor: '#292524', color: '#fff', borderRadius: '8px' }}
									itemStyle={{ color: '#e11d48' }}
								/>
								<Area type="monotone" dataKey="revenue" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6">
					<h3 className="text-white font-bold uppercase tracking-wider mb-6">Top Prestations (CA)</h3>
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={serviceData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="#292524" horizontal={true} vertical={false} />
								<XAxis type="number" stroke="#78716c" fontSize={12} tickLine={false} axisLine={false} />
								<YAxis dataKey="name" type="category" stroke="#78716c" fontSize={12} tickLine={false} axisLine={false} width={100} />
								<Tooltip 
									contentStyle={{ backgroundColor: '#1c1917', borderColor: '#292524', color: '#fff', borderRadius: '8px' }}
									cursor={{ fill: '#292524' }}
								/>
								<Bar dataKey="revenue" fill="#e11d48" radius={[0, 4, 4, 0]} barSize={20} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</div>
	);
}

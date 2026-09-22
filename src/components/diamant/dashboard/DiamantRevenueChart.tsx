import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Appointment } from '@/lib/queries';

type AppointmentWithService = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
};

interface Props {
	appointments?: AppointmentWithService[];
	range?: 'week' | 'month' | 'year' | 'custom';
}

const CustomTooltip = ({ active, payload, label }: any) => {
	if (active && payload && payload.length) {
		return (
			<div className="bg-white border border-stone-200 p-4 rounded-xl shadow-lg">
				<p className="text-stone-900 font-bold mb-2">{label}</p>
				<p className="text-stone-700 text-sm">
					Chiffre d'affaires : <span className="font-bold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(payload[0].value)}</span>
				</p>
				<p className="text-stone-500 text-sm mt-1">
					Rendez-vous : <span className="font-bold text-stone-600">{payload[1].value}</span>
				</p>
			</div>
		);
	}
	return null;
};

export default function DiamantRevenueChart({ appointments = [], range = 'month' }: Props) {
	const data = useMemo(() => {
		if (appointments.length === 0) return [];

		// Sort base appointments chronologically
		const sortedAppointments = [...appointments].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
		
		const orderedGrouped: Record<string, { ca: number; rdv: number }> = {};
		sortedAppointments.forEach(app => {
			const date = new Date(app.start_time);
			let key = '';
			if (range === 'year') {
				key = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
			} else {
				key = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
			}
			if (!orderedGrouped[key]) {
				orderedGrouped[key] = { ca: 0, rdv: 0 };
			}
			orderedGrouped[key].rdv += 1;
			orderedGrouped[key].ca += app.services?.price || 0;
		});

		return Object.entries(orderedGrouped).map(([name, values]) => ({
			name,
			ca: values.ca,
			rdv: values.rdv
		}));
	}, [appointments, range]);

	if (data.length === 0) {
		return (
			<div className="h-[300px] w-full flex items-center justify-center bg-stone-50 rounded-xl border border-stone-100">
				<p className="text-stone-400 text-sm font-bold uppercase tracking-widest">Aucune donnée sur la période</p>
			</div>
		);
	}

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart
					data={data}
					margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
				>
					<defs>
						<linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
							<stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
					<XAxis 
						dataKey="name" 
						stroke="#a8a29e" 
						tick={{ fill: '#78716c', fontSize: 12, fontWeight: 600 }} 
						axisLine={false}
						tickLine={false}
						dy={10}
					/>
					<YAxis 
						stroke="#a8a29e" 
						tick={{ fill: '#78716c', fontSize: 12, fontWeight: 600 }}
						axisLine={false}
						tickLine={false}
						tickFormatter={(value) => `${value}€`}
					/>
					<Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f0fdfa', strokeWidth: 2 }} />
					<Area 
						type="monotone" 
						dataKey="ca" 
						stroke="#14b8a6" 
						strokeWidth={3}
						fillOpacity={1} 
						fill="url(#colorCa)" 
						activeDot={{ r: 6, fill: '#14b8a6', stroke: '#ffffff', strokeWidth: 2 }}
					/>
					{/* Donnée invisible juste pour le tooltip */}
					<Area type="monotone" dataKey="rdv" stroke="none" fill="none" />
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

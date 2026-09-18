import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
	{ name: 'Jan', ca: 45000, rdv: 120 },
	{ name: 'Fév', ca: 52000, rdv: 140 },
	{ name: 'Mar', ca: 48000, rdv: 130 },
	{ name: 'Avr', ca: 61000, rdv: 165 },
	{ name: 'Mai', ca: 59000, rdv: 155 },
	{ name: 'Juin', ca: 75000, rdv: 190 },
	{ name: 'Juil', ca: 82000, rdv: 210 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
	if (active && payload && payload.length) {
		return (
			<div className="bg-stone-900 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
				<p className="text-jasmine-400 font-bold mb-2">{label}</p>
				<p className="text-white text-sm">
					Chiffre d'affaires : <span className="font-bold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(payload[0].value)}</span>
				</p>
				<p className="text-stone-400 text-sm mt-1">
					Rendez-vous : <span className="font-bold text-stone-300">{payload[1].value}</span>
				</p>
			</div>
		);
	}
	return null;
};

export default function DiamantRevenueChart() {
	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart
					data={data}
					margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
				>
					<defs>
						<linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#ebbc66" stopOpacity={0.3} />
							<stop offset="95%" stopColor="#ebbc66" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
					<XAxis 
						dataKey="name" 
						stroke="rgba(255,255,255,0.3)" 
						tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} 
						axisLine={false}
						tickLine={false}
						dy={10}
					/>
					<YAxis 
						stroke="rgba(255,255,255,0.3)" 
						tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
						axisLine={false}
						tickLine={false}
						tickFormatter={(value) => `${value / 1000}k€`}
					/>
					<Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(235,188,102,0.2)', strokeWidth: 2 }} />
					<Area 
						type="monotone" 
						dataKey="ca" 
						stroke="#ebbc66" 
						strokeWidth={3}
						fillOpacity={1} 
						fill="url(#colorCa)" 
						activeDot={{ r: 6, fill: '#ebbc66', stroke: '#1c1917', strokeWidth: 2 }}
					/>
					{/* Donnée invisible juste pour le tooltip */}
					<Area type="monotone" dataKey="rdv" stroke="none" fill="none" />
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

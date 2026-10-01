import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Graphiques séparés du panneau pour que recharts (~350 Ko) soit chargé à part (React.lazy).
interface Props {
	revenueData: { date: string; revenue: number }[];
	serviceData: { name: string; revenue: number }[];
}

export default function PremiumStatsCharts({ revenueData, serviceData }: Props) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm transition-all hover:shadow-md">
				<h3 className="text-stone-900 font-bold uppercase tracking-wider mb-6">Évolution CA</h3>
				<div className="h-[300px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={revenueData}>
							<defs>
								<linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#e11d48" stopOpacity={0.3}/>
									<stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
							<XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
							<YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}€`} />
							<Tooltip 
								contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }}
								itemStyle={{ color: '#e11d48' }}
							/>
							<Area type="monotone" dataKey="revenue" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</div>

			<div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm transition-all hover:shadow-md">
				<h3 className="text-stone-900 font-bold uppercase tracking-wider mb-6">Top Prestations (CA)</h3>
				<div className="h-[300px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={serviceData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
							<XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
							<YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={100} />
							<Tooltip 
								contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }}
								cursor={{ fill: '#f1f5f9' }}
							/>
							<Bar dataKey="revenue" fill="#e11d48" radius={[0, 4, 4, 0]} barSize={20} />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	);
}

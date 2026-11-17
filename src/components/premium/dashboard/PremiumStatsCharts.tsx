import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatEuros } from '@/lib/money';

// Graphique séparé du panneau pour que recharts (~350 Ko) soit chargé à part (import dynamique après montage).
// Habillage : sur la carte carbone, courbe blanc cassé, dégradé rouge très léger, info-bulle maison.
interface Props {
	revenueData: { date: string; revenue: number }[];
	animate?: boolean;
}

function Bulle({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-[2px] border-l-[3px] border-pe-rouge bg-pe-blanc px-3 py-2 text-pe-encre shadow-[0_10px_24px_-12px_rgb(0_0_0/0.6)]">
			<p className="pe-tech !text-pe-acier">{label}</p>
			<p className="mt-0.5 text-lg font-extrabold tabular-nums [font-stretch:112%]">{formatEuros(Number(payload[0].value))}</p>
		</div>
	);
}

export default function PremiumStatsCharts({ revenueData, animate = true }: Props) {
	return (
		<div className="h-[260px] w-full md:h-[300px]">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={revenueData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
					<defs>
						<linearGradient id="pe-ca" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="#d02a1f" stopOpacity={0.35} />
							<stop offset="100%" stopColor="#d02a1f" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid stroke="#24272b" vertical={false} />
					<XAxis
						dataKey="date"
						stroke="#9aa0a6"
						fontSize={11}
						tickLine={false}
						axisLine={{ stroke: '#33373c' }}
						minTickGap={28}
						tickMargin={8}
					/>
					<YAxis
						stroke="#9aa0a6"
						fontSize={11}
						tickLine={false}
						axisLine={false}
						width={56}
						tickFormatter={(value) => formatEuros(value)}
					/>
					<Tooltip content={<Bulle />} cursor={{ stroke: '#ecebe6', strokeWidth: 1, strokeDasharray: '3 3' }} />
					<Area
						type="monotone"
						dataKey="revenue"
						stroke="#ecebe6"
						strokeWidth={2}
						fill="url(#pe-ca)"
						activeDot={{ r: 4, fill: '#d02a1f', stroke: '#121315', strokeWidth: 2 }}
						isAnimationActive={animate}
						animationDuration={900}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

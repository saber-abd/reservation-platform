import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatEuros } from '@/lib/money';
import { useReducedMotion } from 'motion/react';
import { EtatVide } from './kit/primitives';

import type { PointSerie } from './kit/periode';

interface Props {
	/** Un point par jour (ou par mois) de la période, zéros compris : voir kit/periode.ts. */
	serie?: PointSerie[];
}

// Couleurs de l'espace Diamant (voir diamant.css, section « Espaces connectés »)
const TERRE = '#a84b25';
const GRIS = '#6e6157';
const FILET = '#e2d8cb';

const CustomTooltip = ({ active, payload, label }: any) => {
	if (active && payload && payload.length) {
		return (
			<div className="min-w-[170px] rounded-xl bg-dx-nuit px-4 py-3 text-dx-creme shadow-[0_20px_40px_-20px_rgb(26_20_17/0.7)]">
				<p className="text-xs text-dx-sable">{label}</p>
				<p className="dx-chiffre mt-1 text-2xl text-white">{formatEuros(payload[0].value)}</p>
				<p className="mt-1 text-xs text-dx-sable">
					Chiffre d'affaires · <span className="font-semibold text-dx-creme">{payload[1]?.value ?? 0} rendez-vous</span>
				</p>
			</div>
		);
	}
	return null;
};

export default function DiamantRevenueChart({ serie = [] }: Props) {
	const reduit = useReducedMotion();
	const data = serie;
	const vide = data.every((p) => p.rdv === 0);

	if (data.length === 0 || vide) {
		return (
			<div className="flex h-[300px] w-full items-center justify-center rounded-xl border border-dashed border-dx-filet-fort">
				<EtatVide dessin="releve" titre="Aucune donnée sur la période" texte="Les recettes apparaîtront ici dès qu'un rendez-vous sera enregistré." />
			</div>
		);
	}

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart
					data={data}
					margin={{ top: 10, right: 22, left: -12, bottom: 0 }}
				>
					<defs>
						<linearGradient id="dxCaDegrade" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={TERRE} stopOpacity={0.22} />
							<stop offset="100%" stopColor={TERRE} stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid stroke={FILET} strokeDasharray="2 6" vertical={false} />
					<XAxis
						dataKey="name"
						tick={{ fill: GRIS, fontSize: 11, fontWeight: 500 }}
						axisLine={false}
						tickLine={false}
						dy={10}
						minTickGap={18}
						interval="preserveStartEnd"
					/>
					<YAxis
						tick={{ fill: GRIS, fontSize: 11, fontWeight: 500 }}
						axisLine={false}
						tickLine={false}
						width={64}
						tickFormatter={(value) => formatEuros(value)}
					/>
					<Tooltip content={<CustomTooltip />} cursor={{ stroke: TERRE, strokeOpacity: 0.35, strokeWidth: 1, strokeDasharray: '3 3' }} />
					<Area
						type="monotone"
						dataKey="ca"
						stroke={TERRE}
						strokeWidth={2}
						fillOpacity={1}
						fill="url(#dxCaDegrade)"
						dot={data.length <= 12 ? { r: 3, fill: '#fffdf9', stroke: TERRE, strokeWidth: 1.5 } : false}
						activeDot={{ r: 5, fill: TERRE, stroke: '#fffdf9', strokeWidth: 2 }}
						animationDuration={900}
						isAnimationActive={!reduit}
					/>
					{/* Donnée invisible juste pour le tooltip */}
					<Area type="monotone" dataKey="rdv" stroke="none" fill="none" />
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

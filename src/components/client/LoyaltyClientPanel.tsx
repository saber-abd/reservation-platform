import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getLoyaltyData, type LoyaltyData } from '@/lib/loyalty';

export default function LoyaltyClientPanel() {
	const [data, setData] = useState<LoyaltyData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function load() {
			try {
				const { data: authData } = await supabase.auth.getUser();
				if (!authData.user) {
					setError('Non connecté');
					return;
				}
				const loyalty = await getLoyaltyData(authData.user.id);
				setData(loyalty);
			} catch (err) {
				setError("Impossible de charger les données de fidélité.");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	if (loading) return <p className="text-sm text-stone-500">Chargement de votre programme de fidélité...</p>;
	if (error || !data) return <p className="text-sm text-red-600">{error}</p>;

	const radius = 60;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (data.progressPercent / 100) * circumference;

	const tierColors = {
		Bronze: 'from-amber-600 to-amber-800 text-amber-700 bg-amber-50',
		Argent: 'from-slate-400 to-slate-600 text-slate-600 bg-slate-50',
		Or: 'from-yellow-400 to-yellow-600 text-yellow-600 bg-yellow-50',
	};

	return (
		<div className="max-w-3xl space-y-8">
			<div className="flex flex-col sm:flex-row items-center gap-8 rounded-2xl bg-emerald-50 p-8 shadow-sm">
				<div className="relative flex h-40 w-40 items-center justify-center">
					<svg className="absolute inset-0 h-full w-full -rotate-90 transform">
						<circle
							cx="80"
							cy="80"
							r={radius}
							stroke="currentColor"
							strokeWidth="12"
							fill="transparent"
							className="text-emerald-100"
						/>
						<circle
							cx="80"
							cy="80"
							r={radius}
							stroke="currentColor"
							strokeWidth="12"
							fill="transparent"
							strokeDasharray={circumference}
							strokeDashoffset={offset}
							strokeLinecap="round"
							className="text-emerald-500 transition-all duration-1000 ease-out"
							style={{ strokeDashoffset: offset }}
						/>
					</svg>
					<div className="text-center">
						<span className="block text-3xl font-bold text-emerald-700">{data.points}</span>
						<span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Points</span>
					</div>
				</div>

				<div className="flex-1 text-center sm:text-left">
					<h2 className="text-2xl font-bold text-stone-900">
						Grade actuel : <span className={`bg-gradient-to-r bg-clip-text text-transparent ${tierColors[data.tier].split(' ')[0]}`}>{data.tier}</span>
					</h2>
					<p className="mt-2 text-sm text-stone-600">
						Vous avez cumulé <strong className="text-emerald-700">{data.passages} passages</strong>.
					</p>
					{data.nextTierPoints && (
						<p className="mt-1 text-sm text-stone-500">
							Encore {data.nextTierPoints - data.points} points pour atteindre le niveau supérieur !
						</p>
					)}
				</div>
			</div>

			{data.activeBonuses.length > 0 && (
				<div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
					<h3 className="text-lg font-bold text-emerald-800">Cadeaux & Avantages en cours</h3>
					<ul className="mt-4 space-y-3">
						{data.activeBonuses.map((bonus, i) => (
							<li key={i} className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
								<span>{bonus}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{data.perks.length > 0 && (
				<div className="rounded-xl border border-border bg-white p-6 shadow-sm">
					<h3 className="text-lg font-bold text-stone-900">Avantages permanents</h3>
					<ul className="mt-4 space-y-2 text-sm text-stone-600">
						{data.perks.map((perk, i) => (
							<li key={i} className="flex items-center gap-2">
								<span className="text-emerald-500">✓</span> {perk}
							</li>
						))}
					</ul>
				</div>
			)}

			<div>
				<h3 className="text-xl font-bold text-stone-900">Vos Badges</h3>
				<p className="mt-1 text-sm text-stone-500">Débloquez de nouveaux badges pour obtenir des réductions exclusives.</p>
				
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{data.badges.map((badge) => {
						const isUnlocked = badge.unlockedAt !== null;
						return (
							<div
								key={badge.id}
								className={`relative flex flex-col items-center rounded-xl border p-6 text-center transition-all ${
									isUnlocked
										? 'border-emerald-200 bg-emerald-50/50 shadow-sm hover:-translate-y-1 hover:shadow-md'
										: 'border-stone-200 bg-stone-50 opacity-60 grayscale'
								}`}
							>
								<div className={`text-5xl ${isUnlocked ? 'animate-bounce' : ''}`} style={{ animationDuration: '2s' }}>
									{badge.icon}
								</div>
								<h4 className={`mt-4 font-bold ${isUnlocked ? 'text-emerald-800' : 'text-stone-600'}`}>{badge.name}</h4>
								<p className="mt-2 text-xs text-stone-500">{badge.description}</p>
								
								{isUnlocked && (
									<span className="mt-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
										Débloqué
									</span>
								)}
								{!isUnlocked && (
									<span className="mt-4 inline-block rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-500">
										Verrouillé
									</span>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

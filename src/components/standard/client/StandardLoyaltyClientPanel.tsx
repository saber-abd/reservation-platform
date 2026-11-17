import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLoyaltyData, type LoyaltyData, type LoyaltyRewards } from '@/lib/loyalty';
import { Busy, PageHeader, Panel, Skeleton, StatusPill } from '@/components/standard/ui/StandardKit';

// Récompenses fidélité du dépanneur informatique.
const LOYALTY_REWARDS: LoyaltyRewards = {
	everyThird: { perk: 'Nettoyage logiciel offert tous les 3 passages', ready: 'un nettoyage logiciel offert', next: 'votre nettoyage logiciel offert' },
	everySecond: { perk: 'Diagnostic complet offert tous les 2 passages', ready: 'un diagnostic complet offert', next: 'votre diagnostic offert' },
};

/** Paliers du programme (300 points = Argent, 600 = Or, 100 points par passage). */
const TIERS: { name: LoyaltyData['tier']; from: number }[] = [
	{ name: 'Bronze', from: 0 },
	{ name: 'Argent', from: 300 },
	{ name: 'Or', from: 600 },
];

/** Retire un éventuel emoji en tête des textes calculés par la bibliothèque. */
const clean = (text: string) => text.replace(/^[^\p{L}\p{N}]+/u, '').trim();

/** Pictogrammes dessinés des badges (à la place des emoji). */
function BadgeArt({ id, unlocked }: { id: string; unlocked: boolean }) {
	const stroke = unlocked ? 'var(--color-brand)' : '#8a90a0';
	const common = { width: 40, height: 40, viewBox: '0 0 40 40', fill: 'none', stroke, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
	if (id === 'regulier') {
		return (
			<svg {...common}>
				<rect x="7" y="9" width="26" height="24" rx="3" />
				<path d="M7 16h26M14 6v6M26 6v6" />
				<path d="M13 22h3M18.5 22h3M24 22h3M13 27h3M18.5 27h3" />
			</svg>
		);
	}
	if (id === 'vip') {
		return (
			<svg {...common}>
				<path d="M8 28l-2-14 8 6 6-10 6 10 8-6-2 14z" />
				<path d="M8 32h24" />
			</svg>
		);
	}
	return (
		<svg {...common}>
			<path d="M20 6l3.6 8.6 9.4.8-7.1 6.2 2.1 9.2L20 26l-8 4.8 2.1-9.2L7 15.4l9.4-.8z" />
		</svg>
	);
}

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
				const loyalty = await getLoyaltyData(authData.user.id, LOYALTY_REWARDS);
				setData(loyalty);
			} catch (err) {
				setError('Impossible de charger les données de fidélité.');
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	if (loading) {
		return (
			<Busy label="Chargement de votre programme de fidélité…">
				<div className="sa-pagehead">
					<div className="grid gap-3">
						<Skeleton className="h-9 w-48" />
						<Skeleton className="h-4 w-72" />
					</div>
				</div>
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
					<Skeleton className="h-64" />
					<Skeleton className="h-64" />
				</div>
			</Busy>
		);
	}
	if (error || !data) return <p className="sa-alert">{error}</p>;

	const nextTier = TIERS.find((t) => t.from === data.nextTierPoints);
	const stamps = Math.min(data.passages, 6);
	// Jauge sur l'échelle complète 0 → 600 points, alignée sur les repères Bronze / Argent / Or.
	const gaugePercent = Math.min(100, (data.points / 600) * 100);

	return (
		<div>
			<PageHeader
				title="Ma fidélité"
				subtitle="Chaque intervention terminée rapporte 100 points. Les avantages se débloquent à 300 points (Argent) puis à 600 points (Or)."
			/>

			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
				{/* Points et palier */}
				<section className="sa-panel p-6" aria-label="Vos points">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<p className="sa-fig-label">Vos points</p>
							<p className="mt-2 flex items-baseline gap-2 text-[clamp(3rem,2.3rem+2.5vw,4.5rem)] font-semibold leading-none tracking-[-0.05em] text-ink">
								<NumberFlow value={data.points} locales="fr-FR" />
								<span className="text-base font-medium tracking-normal text-ink-mute">points</span>
							</p>
						</div>
						<div className="text-right">
							<p className="sa-fig-label">Grade actuel</p>
							<p className="mt-1 text-2xl font-semibold tracking-tight text-brand">{data.tier}</p>
						</div>
					</div>

					<div className="mt-7">
						<div
							className="sa-gauge"
							role="progressbar"
							aria-label={nextTier ? `Progression vers le grade ${nextTier.name}` : 'Grade maximal atteint'}
							aria-valuemin={0}
							aria-valuemax={600}
							aria-valuenow={Math.min(600, data.points)}
							aria-valuetext={`${data.points} points sur 600`}
						>
							<i style={{ width: `${gaugePercent}%` }} />
						</div>
						<div className="mt-2 flex justify-between text-xs font-semibold text-ink-mute">
							{TIERS.map((t) => (
								<span key={t.name} className={t.name === data.tier ? 'text-ink' : undefined}>
									{t.name} <span className="sa-num font-medium">· {t.from}</span>
								</span>
							))}
						</div>
						<p className="mt-4 text-sm text-ink-soft">
							Vous avez cumulé <strong className="font-semibold text-ink">{data.passages} passages</strong>.
							{data.nextTierPoints && <> Encore {data.nextTierPoints - data.points} points pour atteindre le niveau supérieur.</>}
						</p>
					</div>
				</section>

				{/* Carte à tampons : un tampon par passage, paliers à 3 et 6 */}
				<Panel title="Carte de passages" description="Un tampon par intervention terminée.">
					<div className="sa-stamps">
						{Array.from({ length: 6 }).map((_, i) => {
							const on = i < stamps;
							const milestone = i === 2 || i === 5;
							return (
								<span
									key={i}
									className="sa-stamp"
									data-on={on ? '' : undefined}
									data-milestone={milestone ? '' : undefined}
									style={{ '--i': i } as React.CSSProperties}
									aria-hidden="true"
								>
									{on ? <Check size={18} strokeWidth={2.2} /> : milestone ? (i === 2 ? 'Ag' : 'Or') : i + 1}
								</span>
							);
						})}
					</div>
					<p className="sr-only">
						{stamps} passage{stamps > 1 ? 's' : ''} sur 6 tamponné{stamps > 1 ? 's' : ''}.
					</p>
					<p className="mt-4 text-sm text-ink-mute">3e passage : grade Argent. 6e passage : grade Or.</p>
				</Panel>
			</div>

			{(data.activeBonuses.length > 0 || data.perks.length > 0) && (
				<div className="mt-6 grid gap-6 md:grid-cols-2">
					{data.activeBonuses.length > 0 && (
						<Panel title="Cadeaux et avantages en cours">
							<ul className="grid gap-2">
								{data.activeBonuses.map((bonus, i) => (
									<li key={i} className="border-l-2 border-brand bg-[var(--color-brand-tint)] px-3 py-2.5 text-sm font-medium text-ink">
										{clean(bonus)}
									</li>
								))}
							</ul>
						</Panel>
					)}
					{data.perks.length > 0 && (
						<Panel title="Avantages permanents">
							<ul className="grid gap-2.5 text-sm text-ink-soft">
								{data.perks.map((perk, i) => (
									<li key={i} className="flex items-start gap-2.5">
										<Check size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
										{perk}
									</li>
								))}
							</ul>
						</Panel>
					)}
				</div>
			)}

			<section className="mt-10">
				<h2 className="sa-h2">Vos badges</h2>
				<p className="mt-1 text-sm text-ink-mute">Débloquez de nouveaux badges pour obtenir des réductions.</p>
				<ul className="sa-panel mt-4">
					{data.badges.map((badge) => {
						const isUnlocked = badge.unlockedAt !== null;
						return (
							<li key={badge.id} className="flex items-center gap-4 border-b border-[var(--sa-line-soft)] px-5 py-4 last:border-b-0">
								<span className={`grid h-14 w-14 shrink-0 place-items-center rounded-[6px] ${isUnlocked ? 'bg-[var(--color-brand-tint)]' : 'bg-[var(--sa-side)]'}`}>
									<BadgeArt id={badge.id} unlocked={isUnlocked} />
								</span>
								<div className="min-w-0 flex-1">
									<p className={`font-semibold ${isUnlocked ? 'text-ink' : 'text-ink-soft'}`}>{badge.name}</p>
									<p className="mt-0.5 text-sm text-ink-mute">{badge.description}</p>
								</div>
								{isUnlocked ? (
									<StatusPill tone="confirmed">
										Débloqué
										<span className="sr-only"> le {new Date(badge.unlockedAt as string).toLocaleDateString('fr-FR')}</span>
									</StatusPill>
								) : (
									<StatusPill tone="muted">Verrouillé</StatusPill>
								)}
							</li>
						);
					})}
				</ul>
			</section>
		</div>
	);
}

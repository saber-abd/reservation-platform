import { useEffect, useState, type ReactNode } from 'react';
import { CalendarCheck, Crown, Flag, Check, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLoyaltyData, type LoyaltyData, type LoyaltyRewards } from '@/lib/loyalty';
import { PageHead, PageSkeleton, Rolling } from '@/components/premium/dashboard/kit/Base';
import { Gauge } from '@/components/premium/dashboard/kit/Interactive';

// Récompenses fidélité du garage.
const LOYALTY_REWARDS: LoyaltyRewards = {
	everyThird: { perk: 'Lavage extérieur offert tous les 3 passages', ready: 'un lavage extérieur offert', next: 'votre lavage extérieur offert' },
	everySecond: { perk: 'Contrôle des niveaux et de la pression des pneus offert tous les 2 passages', ready: 'un contrôle des niveaux et des pneus offert', next: 'votre contrôle des niveaux offert' },
};

const PALIERS = [
	{ nom: 'Bronze', points: 0 },
	{ nom: 'Argent', points: 300 },
	{ nom: 'Or', points: 600 },
] as const;

// Pictogrammes des badges (au trait, à la place des emoji fournis par la logique commune).
const ICONES: Record<string, ReactNode> = {
	nouveau: <Flag />,
	regulier: <CalendarCheck />,
	vip: <Crown />,
};

/** Les textes de bonus viennent de la logique commune et peuvent commencer par un emoji : on l'ôte à l'affichage. */
const sansEmoji = (t: string) => t.replace(/^[^\p{L}\p{N}]+/u, '');

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

	if (loading) return <PageSkeleton cards={2} />;
	if (error || !data) return <p className="pe-erreur">{error}</p>;

	const tampons = Math.min(6, data.passages);
	const restant = data.nextTierPoints ? data.nextTierPoints - data.points : 0;

	return (
		<div className="pe-entree">
			<PageHead
				title="Ma fidélité"
				sub="100 points par passage terminé à l'atelier. Grade Argent à 300 points, Or à 600 : chaque grade débloque ses avantages."
			/>

			<section className="pe-bento" aria-label="Programme de fidélité">
				{/* Jauge et grade */}
				<article className="pe-card pe-card--sombre pe-b-7">
					<div className="grid items-center gap-6 p-5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:p-8">
						<div className="mx-auto w-full max-w-[240px]">
							<Gauge value={data.progressPercent / 100} ariaLabel={`${data.points} points, ${Math.round(data.progressPercent)} % du grade suivant`}>
								<span className="block text-[2.6rem]">
									<Rolling value={data.points} />
								</span>
								<span className="pe-tech">Points</span>
							</Gauge>
						</div>
						<div className="grid gap-4">
							<div>
								<p className="pe-tech">Grade actuel</p>
								<p className="mt-1 text-[clamp(2.6rem,5vw,3.8rem)] font-extrabold uppercase leading-none tracking-[-0.02em] [font-stretch:125%]">
									{data.tier}
								</p>
							</div>
							<p className="text-pe-acier-clair">
								Vous avez cumulé <strong className="text-pe-blanc">{data.passages} passages</strong>.
								{data.nextTierPoints ? (
									<> Encore {restant} points pour atteindre le niveau supérieur !</>
								) : (
									<> Vous avez atteint le grade le plus élevé.</>
								)}
							</p>
							{/* Échelle des grades */}
							<ol className="grid grid-cols-3 border-t border-pe-filet-sombre" aria-label="Grades">
								{PALIERS.map((p) => {
									const atteint = data.points >= p.points;
									const courant = data.tier === p.nom;
									return (
										<li key={p.nom} className={`relative pt-3 ${courant ? 'text-pe-blanc' : atteint ? 'text-pe-acier-clair' : 'text-[#6c7278]'}`}>
											<span
												className={`absolute -top-px left-0 h-[3px] w-full ${atteint ? (courant ? 'bg-pe-rouge' : 'bg-pe-blanc') : 'bg-transparent'}`}
												aria-hidden="true"
											/>
											<span className="block text-sm font-bold [font-stretch:110%]">
												{p.nom}
												{courant && <span className="sr-only"> (grade actuel)</span>}
											</span>
											<span className="pe-tech !text-inherit">{p.points} pts</span>
										</li>
									);
								})}
							</ol>
						</div>
					</div>
				</article>

				{/* Carte à tampons : un tampon par passage, paliers à 3 (Argent) et 6 (Or) */}
				<article className="pe-card pe-b-5">
					<div className="pe-card__tete">
						<h2 className="pe-tech">Carte de passages</h2>
						<span className="pe-tech">
							{data.passages} passage{data.passages > 1 ? 's' : ''}
						</span>
					</div>
					<div className="pe-card__corps grid gap-4">
						<ol className="grid grid-cols-6 gap-2" aria-label={`${tampons} tampons sur 6`}>
							{Array.from({ length: 6 }, (_, i) => {
								const plein = i < tampons;
								const palier = i === 2 ? 'Argent' : i === 5 ? 'Or' : null;
								return (
									<li key={i} className="grid justify-items-center gap-1.5">
										<span
											className={`flex aspect-square w-full max-w-[48px] items-center justify-center rounded-[2px] border-2 transition-colors ${
												plein ? 'border-pe-encre bg-pe-encre text-pe-blanc' : 'border-dashed border-pe-filet-fort text-pe-filet-fort'
											} ${palier && plein ? '!border-pe-rouge !bg-pe-rouge' : ''} ${plein ? 'pe-tampon' : ''}`}
											style={plein ? { animationDelay: `${0.3 + i * 0.08}s` } : undefined}
										>
											{plein ? <Check size={18} strokeWidth={3} aria-hidden="true" /> : <span className="text-xs font-bold tabular-nums">{i + 1}</span>}
										</span>
										<span className="pe-tech !text-[0.62rem]">{palier ?? ' '}</span>
									</li>
								);
							})}
						</ol>
						{data.activeBonuses.length > 0 ? (
							<div className="border-t border-pe-filet pt-4">
								<h3 className="pe-h3 flex items-center gap-2">
									<Gift size={16} className="text-pe-rouge" aria-hidden="true" />
									Cadeaux & Avantages en cours
								</h3>
								<ul className="mt-2 grid gap-2 text-[0.9375rem]">
									{data.activeBonuses.map((bonus, i) => (
										<li key={i} className="border-l-2 border-pe-rouge pl-3">
											{sansEmoji(bonus)}
										</li>
									))}
								</ul>
							</div>
						) : (
							<p className="border-t border-pe-filet pt-4 text-sm text-pe-acier">
								Les cadeaux se débloquent au grade Argent : lavage extérieur offert tous les 3 passages.
							</p>
						)}
					</div>
				</article>

				{data.perks.length > 0 && (
					<article className="pe-card pe-b-12">
						<div className="pe-card__tete">
							<h2 className="pe-h2">Avantages permanents</h2>
						</div>
						<ul className="pe-rows">
							{data.perks.map((perk, i) => (
								<li key={i} className="flex items-center gap-3 px-[18px] py-3 md:px-[22px]">
									<Check size={16} className="shrink-0 text-pe-vert" aria-hidden="true" />
									{perk}
								</li>
							))}
						</ul>
					</article>
				)}
			</section>

			{/* Badges */}
			<section className="mt-8" aria-labelledby="badges-titre">
				<h2 id="badges-titre" className="pe-h2">
					Vos Badges
				</h2>
				<p className="mt-2 text-sm text-pe-acier">Débloquez de nouveaux badges pour obtenir des réductions exclusives.</p>

				<div className="mt-4 grid gap-3 sm:grid-cols-3">
					{data.badges.map((badge) => {
						const isUnlocked = badge.unlockedAt !== null;
						return (
							<div key={badge.id} className={`pe-card grid content-start gap-3 p-5 ${isUnlocked ? '' : 'opacity-70'}`}>
								<div className="flex items-start justify-between">
									<span
										className={`flex h-12 w-12 items-center justify-center rounded-[2px] [&_svg]:h-6 [&_svg]:w-6 ${
											isUnlocked ? 'bg-pe-encre text-pe-blanc' : 'border border-dashed border-pe-filet-fort text-pe-acier'
										}`}
										aria-hidden="true"
									>
										{ICONES[badge.id] ?? <Flag />}
									</span>
									{isUnlocked ? (
										<span className="pe-tag" data-s="completed">
											Débloqué
										</span>
									) : (
										<span className="pe-tag" data-s="cancelled">
											Verrouillé
										</span>
									)}
								</div>
								<h3 className="pe-h3">{badge.name}</h3>
								<p className="text-sm text-pe-acier">{badge.description}</p>
								{isUnlocked && badge.unlockedAt && (
									<p className="pe-tech">Le {new Date(badge.unlockedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
								)}
							</div>
						);
					})}
				</div>
			</section>
		</div>
	);
}

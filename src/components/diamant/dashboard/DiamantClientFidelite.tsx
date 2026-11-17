import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
	Crown, 
	Star, 
	Gift, 
	Sparkles, 
	Lock, 
	CheckCircle2, 
	ShieldCheck, 
	Award, 
	Heart, 
	Zap, 
	Scissors,
	ChevronRight
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Chiffre, EASE, EnChargement, Pastille, Squelette } from './kit/primitives';

interface LoyaltyBadge {
	id: string;
	title: string;
	description: string;
	requiredPoints: number;
	requiredVisits?: number;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	tier: 'cristal' | 'argent' | 'or' | 'diamant';
}

const LOYALTY_BADGES: LoyaltyBadge[] = [
	{
		id: 'welcome',
		title: 'Membre Privilège Diamant',
		description: 'Accès exclusif à la réservation prioritaire en ligne (rappels automatiques à venir).',
		requiredPoints: 0,
		requiredVisits: 0,
		icon: Sparkles,
		tier: 'cristal'
	},
	{
		id: 'first_visit',
		title: 'Diagnostic Capillaire Haute Définition',
		description: 'Bilan complet de votre cuir chevelu et conseils d’experts sur-mesure offerts lors de votre venue.',
		requiredPoints: 50,
		requiredVisits: 1,
		icon: Scissors,
		tier: 'cristal'
	},
	{
		id: 'care_gift',
		title: 'Rituel Soin Signature Offert',
		description: 'Profitez d’un soin profond thermo-protecteur à la kératine pure offert avec votre prestation.',
		requiredPoints: 150,
		requiredVisits: 2,
		icon: Gift,
		tier: 'argent'
	},
	{
		id: 'vip_discount',
		title: '-20% sur la Gamme Prestige Maison',
		description: 'Remise permanente sur l’ensemble des shampoings, masques et sérums professionnels en salon.',
		requiredPoints: 350,
		requiredVisits: 4,
		icon: Star,
		tier: 'or'
	},
	{
		id: 'birthday',
		title: 'Cadeau Anniversaire VIP',
		description: 'Un brushing d’exception ou un soin éclat offert durant tout le mois de votre anniversaire.',
		requiredPoints: 500,
		requiredVisits: 5,
		icon: Heart,
		tier: 'or'
	},
	{
		id: 'ambassador',
		title: 'Cercle Diamant Noir Ambassadeur',
		description: 'Accès aux ventes privées en avant-première, coupe-file réservé et invitation aux cocktails du salon.',
		requiredPoints: 700,
		requiredVisits: 7,
		icon: Crown,
		tier: 'diamant'
	}
];

export default function DiamantClientFidelite() {
	const [points, setPoints] = useState<number>(0);
	const [visitsCount, setVisitsCount] = useState<number>(0);
	const [memberSince, setMemberSince] = useState<string>('');
	const [loading, setLoading] = useState(true);
	const reduit = useReducedMotion();

	useEffect(() => {
		async function fetchLoyaltyData() {
			try {
				const { data: { session } } = await supabase.auth.getSession();
				if (!session?.user) {
					setLoading(false);
					return;
				}

				const user = session.user;

				// Date d'inscription
				const createdAt = user.created_at;
				if (createdAt) {
					const d = new Date(createdAt);
					const formatted = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
					setMemberSince(formatted.charAt(0).toUpperCase() + formatted.slice(1));
				}

				// Vrais rendez-vous dans la base de données
				const { data: apts, error } = await supabase
					.from('appointments')
					.select('id, start_time, status, services(name, price)')
					.eq('client_id', user.id);

				if (!error && apts) {
					const now = new Date();
					const pastApts = apts.filter((a: any) => a.status === 'completed' || new Date(a.start_time) < now);
					setVisitsCount(pastApts.length);

					// Calcul réel des points : 1€ = 1 pt (avec un forfait minimum de 50 pts par rdv passé)
					let earned = 0;
					for (const a of pastApts) {
						const price = a.services?.price;
						earned += typeof price === 'number' && price > 0 ? Math.floor(price) : 50;
					}
					setPoints(earned);
				}
			} catch (e) {
				console.error('Erreur chargement fidélité:', e);
			} finally {
				setLoading(false);
			}
		}

		fetchLoyaltyData();
	}, []);

	// Détermination du palier courant
	let currentTier = 'Cristal';
	let nextTier = 'Argent';
	let nextTierPoints = 150;

	if (points >= 700) {
		currentTier = 'Diamant';
		nextTier = 'Ambassadeur Ultime';
		nextTierPoints = 1000;
	} else if (points >= 350) {
		currentTier = 'Or';
		nextTier = 'Diamant';
		nextTierPoints = 700;
	} else if (points >= 150) {
		currentTier = 'Argent';
		nextTier = 'Or';
		nextTierPoints = 350;
	}

	const progressPercent = Math.min(100, Math.round((points / nextTierPoints) * 100));

	// Le solde roule jusqu'à sa valeur une fois les données chargées (NumberFlow).
	const [vus, setVus] = useState(0);
	useEffect(() => {
		if (loading) return;
		const id = window.requestAnimationFrame(() => setVus(points));
		return () => window.cancelAnimationFrame(id);
	}, [loading, points]);

	if (loading) {
		return (
			<EnChargement label="Chargement de vos privilèges..." className="space-y-6">
				<Squelette className="h-[300px] w-full !rounded-[22px]" />
				<Squelette className="h-24 w-full !rounded-[14px]" />
				<Squelette className="h-24 w-full !rounded-[14px]" />
			</EnChargement>
		);
	}

	// Carte à tampons : un tampon par visite, par carte de 10
	const TAMPONS = 10;
	const tamponsPleins = visitsCount === 0 ? 0 : ((visitsCount - 1) % TAMPONS) + 1;
	const paliers = [
		{ nom: 'Cristal', seuil: 0 },
		{ nom: 'Argent', seuil: 150 },
		{ nom: 'Or', seuil: 350 },
		{ nom: 'Diamant', seuil: 700 },
	];

	return (
		<div className="space-y-10">
			{/* Carte de fidélité et statut réel */}
			<motion.section
				initial={reduit ? false : { opacity: 0, y: 16, rotateX: 6 }}
				animate={{ opacity: 1, y: 0, rotateX: 0 }}
				transition={{ duration: 0.8, ease: EASE }}
				className="dx-carte dx-carte--nuit overflow-hidden !rounded-[22px]"
				aria-label="Carte de fidélité"
			>
				<div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
					<div className="flex flex-col">
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm text-dx-sable">Statut Fidélité</p>
							<Crown size={20} className="text-dx-terre-clair" />
						</div>
						<h2 className="mt-4 font-heading text-[clamp(2.4rem,5vw,3.6rem)] font-light leading-none tracking-[-0.035em] text-dx-creme">
							Niveau <em className="text-dx-terre-clair">{currentTier}</em>
						</h2>
						<p className="mt-3 text-sm text-dx-sable">
							{memberSince ? `Membre depuis ${memberSince}` : 'Compte Privilège'} • {visitsCount} prestation{visitsCount > 1 ? 's' : ''} réalisée{visitsCount > 1 ? 's' : ''}
						</p>

						{/* Tampons */}
						<div className="mt-8">
							<p className="mb-3 text-xs text-dx-sable">Carte de passage · {tamponsPleins} / {TAMPONS}</p>
							<ol className="grid max-w-sm grid-cols-5 gap-2.5" aria-label={`${tamponsPleins} tampons sur ${TAMPONS}`}>
								{Array.from({ length: TAMPONS }, (_, i) => {
									const plein = i < tamponsPleins;
									return (
										<motion.li
											key={i}
											initial={reduit ? false : { scale: plein ? 0.4 : 1, opacity: plein ? 0 : 1 }}
											animate={{ scale: 1, opacity: 1 }}
											transition={{ duration: 0.45, ease: EASE, delay: 0.4 + i * 0.08 }}
											className={`grid aspect-square place-items-center rounded-full border ${plein ? 'border-dx-terre-clair bg-dx-terre text-white' : 'border-dashed border-dx-filet-nuit text-dx-filet-nuit'}`}
										>
											{plein ? <Scissors size={16} className="-rotate-45" /> : <span className="dx-tabulaire text-xs">{i + 1}</span>}
										</motion.li>
									);
								})}
							</ol>
						</div>
					</div>

					{/* Solde et jauge vers le palier suivant */}
					<div className="flex flex-col rounded-2xl bg-dx-nuit-2 p-6">
						<div className="flex items-baseline justify-between gap-3">
							<span className="text-sm text-dx-sable">Solde Points</span>
							<span className="text-xs font-semibold text-dx-terre-clair">Palier suivant : {nextTierPoints} pts</span>
						</div>
						<p className="mt-3 flex items-baseline gap-2">
							<Chiffre valeur={vus} className="text-[clamp(3.5rem,7vw,5rem)] text-white" />
							<span className="text-sm text-dx-sable">points</span>
						</p>

						<div className="mt-6">
							<div className="h-2 w-full overflow-hidden rounded-full bg-dx-filet-nuit" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} aria-label="Progression vers le palier suivant">
								<motion.div
									className="h-full rounded-full bg-dx-terre-clair"
									initial={reduit ? false : { width: 0 }}
									animate={{ width: `${progressPercent}%` }}
									transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
									style={reduit ? { width: `${progressPercent}%` } : undefined}
								/>
							</div>
							<ol className="mt-3 grid grid-cols-4 text-[11px] text-dx-sable">
								{paliers.map((p) => (
									<li key={p.nom} className={points >= p.seuil ? 'font-semibold text-dx-creme' : ''}>
										{p.nom}
										<span className="dx-tabulaire block opacity-70">{p.seuil}</span>
									</li>
								))}
							</ol>
						</div>

						<p className="mt-auto pt-6 text-sm text-dx-sable">
							{points >= nextTierPoints ? 'Palier atteint !' : `Encore ${nextTierPoints - points} points pour le statut ${nextTier}`}
						</p>
					</div>
				</div>
			</motion.section>

			{/* Privilèges et badges */}
			<section>
				<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
					<div>
						<h3 className="dx-h2">Vos Privilèges & Badges</h3>
						<p className="dx-meta mt-1">Débloquez de nouveaux privilèges à mesure de vos visites en salon.</p>
					</div>
					<div className="flex items-center gap-4 text-xs">
						<span className="flex items-center gap-1.5 font-semibold text-dx-ok">
							<CheckCircle2 size={14} />
							<span>Débloqué</span>
						</span>
						<span className="flex items-center gap-1.5 font-semibold text-dx-gris">
							<Lock size={13} />
							<span>Verrouillé</span>
						</span>
					</div>
				</div>

				<ol className="dx-carte divide-y divide-dx-filet overflow-hidden">
					{LOYALTY_BADGES.map((badge, i) => {
						const isUnlocked = points >= badge.requiredPoints || (badge.requiredVisits !== undefined && visitsCount >= badge.requiredVisits);
						const IconComponent = badge.icon;
						const remainingPoints = Math.max(0, badge.requiredPoints - points);

						return (
							<motion.li
								key={badge.id}
								initial={reduit ? false : { opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.45, ease: EASE, delay: Math.min(i * 0.06, 0.4) }}
								className={`grid grid-cols-[2.5rem_1fr] items-start gap-4 px-5 py-5 sm:grid-cols-[3rem_2.75rem_1fr_auto] sm:items-center sm:px-6 ${isUnlocked ? '' : 'bg-dx-papier'}`}
							>
								<span className="hidden font-heading text-lg italic text-dx-terre sm:block">{String(i + 1).padStart(2, '0')}</span>
								<span className={`grid h-11 w-11 place-items-center rounded-full ${isUnlocked ? 'bg-dx-terre-pale text-dx-terre' : 'bg-dx-ivoire-2 text-dx-sable'}`}>
									{isUnlocked ? <IconComponent size={19} /> : <Lock size={17} />}
								</span>
								<div className="min-w-0">
									<h4 className={`dx-h3 ${isUnlocked ? '' : '!text-dx-encre-2'}`}>{badge.title}</h4>
									<p className={`mt-0.5 text-sm leading-relaxed ${isUnlocked ? 'text-dx-encre-2' : 'text-dx-gris'}`}>{badge.description}</p>
									{!isUnlocked && (
										<p className="mt-1.5 text-xs font-semibold text-dx-terre">
											Plus que {remainingPoints} point{remainingPoints > 1 ? 's' : ''} pour débloquer
										</p>
									)}
								</div>
								<div className="col-start-2 sm:col-start-auto">
									{isUnlocked ? (
										<Pastille ton="ok">Disponible</Pastille>
									) : (
										<Pastille ton="neutre" nu><Lock size={10} /> {badge.requiredPoints} pts</Pastille>
									)}
								</div>
							</motion.li>
						);
					})}
				</ol>
			</section>
		</div>
	);
}

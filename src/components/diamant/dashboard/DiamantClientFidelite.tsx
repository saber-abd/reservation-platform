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
		description: 'Accès exclusif à la réservation prioritaire en ligne et rappels SMS automatisés.',
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
	let tierGradient = 'from-stone-500 to-stone-700';

	if (points >= 700) {
		currentTier = 'Diamant';
		nextTier = 'Ambassadeur Ultime';
		nextTierPoints = 1000;
		tierGradient = 'from-amber-500 via-rose-500 to-purple-600';
	} else if (points >= 350) {
		currentTier = 'Or';
		nextTier = 'Diamant';
		nextTierPoints = 700;
		tierGradient = 'from-amber-500 to-amber-700';
	} else if (points >= 150) {
		currentTier = 'Argent';
		nextTier = 'Or';
		nextTierPoints = 350;
		tierGradient = 'from-teal-600 to-deep-teal-700';
	}

	const progressPercent = Math.min(100, Math.round((points / nextTierPoints) * 100));

	if (loading) {
		return (
			<div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-400">
				Chargement de vos privilèges...
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Carte de Fidélité & Statut Réel */}
			<div className="rounded-3xl border border-stone-200 bg-gradient-to-br from-white via-stone-50/80 to-amber-50/30 p-7 md:p-9 shadow-sm relative overflow-hidden">
				<div className="absolute top-0 right-0 w-80 h-80 bg-amber-100/40 blur-[90px] pointer-events-none rounded-full"></div>
				<div className="absolute -bottom-10 -left-10 w-64 h-64 bg-deep-teal-100/30 blur-[80px] pointer-events-none rounded-full"></div>

				<div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
					<div className="flex items-center gap-5">
						<div className="w-18 h-18 rounded-2xl border border-amber-200/80 bg-white p-1 shadow-xs flex items-center justify-center shrink-0">
							<div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/80 flex items-center justify-center">
								<Crown size={32} className="text-amber-600" />
							</div>
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
									Statut Fidélité
								</span>
							</div>
							<h2 className="text-3xl md:text-4xl font-black text-stone-900 tracking-tight mt-1">
								Niveau {currentTier}
							</h2>
							<p className="text-stone-500 text-xs mt-1">
								{memberSince ? `Membre depuis ${memberSince}` : 'Compte Privilège'} • {visitsCount} prestation{visitsCount > 1 ? 's' : ''} réalisée{visitsCount > 1 ? 's' : ''}
							</p>
						</div>
					</div>

					<div className="bg-white/90 p-5 rounded-2xl border border-stone-200/80 shadow-2xs backdrop-blur-xs min-w-[240px]">
						<div className="flex items-center justify-between text-xs mb-1.5">
							<span className="text-stone-500 font-bold uppercase tracking-wider">Solde Points</span>
							<span className="text-amber-700 font-black text-xs">Palier suivant : {nextTierPoints} pts</span>
						</div>
						<div className="flex items-baseline gap-2">
							<p className="text-3xl font-black text-stone-900">
								{points}
							</p>
							<span className="text-xs font-bold text-amber-600 uppercase tracking-wider">points</span>
						</div>

						{/* Barre de progression réelle vers le prochain palier */}
						<div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden mt-3 border border-stone-200">
							<div 
								className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-700"
								style={{ width: `${progressPercent}%` }}
							></div>
						</div>
						<p className="text-[11px] text-stone-400 mt-2 text-right">
							{points >= nextTierPoints ? 'Palier atteint !' : `Encore ${nextTierPoints - points} points pour le statut ${nextTier}`}
						</p>
					</div>
				</div>
			</div>

			{/* Section Badges & Avantages */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-xl font-bold text-stone-900 tracking-tight">Vos Privilèges & Badges</h3>
						<p className="text-xs text-stone-500 mt-0.5">
							Débloquez de nouveaux privilèges exclusifs à mesure de vos visites en salon.
						</p>
					</div>
					<div className="flex items-center gap-3 text-xs">
						<span className="flex items-center gap-1.5 font-bold text-emerald-700">
							<CheckCircle2 size={14} className="text-emerald-600" />
							<span>Débloqué</span>
						</span>
						<span className="flex items-center gap-1.5 font-bold text-stone-400">
							<Lock size={13} className="text-stone-400" />
							<span>Verrouillé</span>
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{LOYALTY_BADGES.map((badge) => {
						const isUnlocked = points >= badge.requiredPoints || (badge.requiredVisits !== undefined && visitsCount >= badge.requiredVisits);
						const IconComponent = badge.icon;
						const remainingPoints = Math.max(0, badge.requiredPoints - points);

						if (isUnlocked) {
							// Badge DÉBLOQUÉ : Lumineux, éclatant, statut vérifié
							return (
								<div 
									key={badge.id}
									className="rounded-2xl border border-amber-200/90 bg-white p-5 shadow-xs flex items-start gap-4 transition-all hover:shadow-md relative overflow-hidden group"
								>
									<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
										<IconComponent size={22} />
									</div>

									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between gap-2 mb-1">
											<h4 className="font-bold text-stone-900 text-sm leading-snug">{badge.title}</h4>
											<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
												<CheckCircle2 size={11} />
												<span>Disponible</span>
											</span>
										</div>
										<p className="text-xs text-stone-600 leading-relaxed">{badge.description}</p>
									</div>
								</div>
							);
						}

						// Badge VERROUILLÉ : Grisé, transparent, avec cadenas et indicateur de progression (standard mondial)
						return (
							<div 
								key={badge.id}
								className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-5 opacity-45 grayscale hover:opacity-70 hover:grayscale-0 transition-all flex items-start gap-4 relative"
							>
								<div className="w-12 h-12 rounded-xl bg-stone-200/70 text-stone-500 flex items-center justify-center shrink-0 border border-stone-200">
									<Lock size={20} className="text-stone-500" />
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2 mb-1">
										<h4 className="font-bold text-stone-700 text-sm leading-snug">{badge.title}</h4>
										<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-200/60 text-stone-600 shrink-0">
											<Lock size={10} />
											<span>{badge.requiredPoints} pts</span>
										</span>
									</div>
									<p className="text-xs text-stone-500 leading-relaxed">{badge.description}</p>
									<p className="text-[11px] text-amber-700/80 font-bold mt-2">
										🔒 Plus que {remainingPoints} point{remainingPoints > 1 ? 's' : ''} pour débloquer
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

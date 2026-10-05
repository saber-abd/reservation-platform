import { getAppointmentsForClient } from './queries';

export interface Badge {
	id: string;
	name: string;
	icon: string;
	description: string;
	unlockedAt: string | null;
}

export interface LoyaltyData {
	passages: number;
	points: number;
	tier: 'Bronze' | 'Argent' | 'Or';
	nextTierPoints: number | null;
	progressPercent: number;
	badges: Badge[];
	activeBonuses: string[];
	perks: string[];
}

/** Récompense propre à chaque démo (les textes métier restent dans les composants de la démo). */
export interface LoyaltyReward {
	/** Avantage permanent, ex. « Lavage extérieur offert tous les 3 passages » */
	perk: string;
	/** Complément de « Vous avez droit à … », ex. « un lavage extérieur offert » */
	ready: string;
	/** Complément de « Plus que N passage(s) avant … », ex. « votre lavage extérieur offert » */
	next: string;
}

export interface LoyaltyRewards {
	/** Grade Argent et Or : tous les 3 passages */
	everyThird: LoyaltyReward;
	/** Grade Or : tous les 2 passages */
	everySecond: LoyaltyReward;
}

export async function getLoyaltyData(clientId: string, rewards: LoyaltyRewards): Promise<LoyaltyData> {
	const appointments = await getAppointmentsForClient(clientId);

	// On ne compte que les rendez-vous terminés
	const completed = appointments.filter((a) => a.status === 'completed');

	// Tri du plus ancien au plus récent pour calculer les dates de déblocage
	const sorted = [...completed].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

	const passages = completed.length;
	const points = passages * 100;

	let tier: 'Bronze' | 'Argent' | 'Or' = 'Bronze';
	if (points >= 600) tier = 'Or';
	else if (points >= 300) tier = 'Argent';

	let nextTierPoints: number | null = null;
	let progressPercent = 0;

	if (tier === 'Bronze') {
		nextTierPoints = 300;
		progressPercent = (points / 300) * 100;
	} else if (tier === 'Argent') {
		nextTierPoints = 600;
		progressPercent = ((points - 300) / 300) * 100;
	} else {
		progressPercent = 100;
	}

	// Calcul des avantages permanents (Perks)
	const perks: string[] = [];
	if (tier === 'Argent' || tier === 'Or') {
		perks.push(rewards.everyThird.perk);
	}
	if (tier === 'Or') {
		perks.push(rewards.everySecond.perk);
	}

	// Calcul des bonus débloqués immédiatement pour le prochain RDV
	const activeBonuses: string[] = [];
	if (tier === 'Or' || tier === 'Argent') {
		if (passages % 3 === 0 && passages > 0) {
			activeBonuses.push(`✨ Vous avez droit à ${rewards.everyThird.ready} lors de votre prochain passage !`);
		} else {
			const left = 3 - (passages % 3);
			activeBonuses.push(`Plus que ${left} passage(s) avant ${rewards.everyThird.next}.`);
		}
	}
	if (tier === 'Or') {
		if (passages % 2 === 0 && passages > 0) {
			activeBonuses.push(`✨ Vous avez droit à ${rewards.everySecond.ready} lors de votre prochain passage !`);
		} else {
			const left = 2 - (passages % 2);
			activeBonuses.push(`Plus que ${left} passage(s) avant ${rewards.everySecond.next}.`);
		}
	}

	// Calcul des badges
	const nouveauUnlockedAt = sorted.length > 0 ? sorted[0].start_time : null;

	let vipUnlockedAt = null;
	if (sorted.length >= 6) {
		vipUnlockedAt = sorted[5].start_time; // Grade Or atteint au 6ème passage
	}

	// Client Régulier: venu au moins 1 fois par mois sur 3 mois différents
	let regulierUnlockedAt = null;
	const months = new Set<string>();
	for (const app of sorted) {
		const monthKey = new Date(app.start_time).toISOString().substring(0, 7); // YYYY-MM
		months.add(monthKey);
		if (months.size >= 3 && !regulierUnlockedAt) {
			regulierUnlockedAt = app.start_time;
		}
	}
	if (regulierUnlockedAt) {
		perks.push('Réduction permanente : -2€ sur chaque passage (Badge Régulier)');
	}

	const badges: Badge[] = [
		{
			id: 'nouveau',
			name: 'Nouveau',
			icon: '🌟',
			description: 'Bienvenue ! Vous avez effectué votre première prestation.',
			unlockedAt: nouveauUnlockedAt,
		},
		{
			id: 'regulier',
			name: 'Régulier',
			icon: '🔥',
			description: 'Fidélité récompensée : vous êtes venu au moins 3 mois différents. Offre 2€ de rabais par passage !',
			unlockedAt: regulierUnlockedAt,
		},
		{
			id: 'vip',
			name: 'VIP',
			icon: '👑',
			description: "Le summum de la fidélité. Vous avez atteint le grade Or !",
			unlockedAt: vipUnlockedAt,
		},
	];

	return {
		passages,
		points,
		tier,
		nextTierPoints,
		progressPercent: Math.min(100, Math.max(0, progressPercent)),
		badges,
		activeBonuses,
		perks,
	};
}

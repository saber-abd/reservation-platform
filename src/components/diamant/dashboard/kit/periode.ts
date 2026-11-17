// Périodes des statistiques Diamant (vue d'ensemble et Performances) : bornes des dates,
// chargement des rendez-vous de la période et série de la courbe (un point par jour ou par mois,
// avec des zéros les jours sans rendez-vous).
//
// Règle de source : la base est interrogée une fois ; si l'établissement a au moins un rendez-vous
// enregistré (toutes dates confondues), toutes les périodes lisent la base, même vides. Les données
// de démonstration ne servent que si la base n'a aucun rendez-vous. Avant, le repli se faisait
// période par période : une période vide en base (7 jours) affichait les données de démonstration
// pendant qu'une période plus longue (30 jours) affichait les vrais rendez-vous, d'où des montants
// incohérents et une courbe qui démarrait au premier vrai rendez-vous.
import { supabase } from '@/lib/supabase';
import { getPrimaryProfessional, getDemoTag, type Appointment, type Professional } from '@/lib/queries';
import { generateDiamantDemoAppointments } from '@/lib/diamantDemoData';
import { roundMoney } from '@/lib/money';

export type Periode = 'week' | 'month' | 'year' | 'custom';

export type RdvAvecPrestation = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
};

export interface CasePeriode {
	/** Clé locale : AAAA-MM-JJ (jour) ou AAAA-MM (mois). */
	cle: string;
	/** Libellé court de l'axe (« 12 nov. », « nov. 26 »). */
	libelle: string;
}

export interface BornesPeriode {
	debut: Date;
	fin: Date;
	parMois: boolean;
	cases: CasePeriode[];
	/** Période personnalisée incomplète : on affiche les 30 derniers jours en attendant. */
	provisoire: boolean;
}

export interface PointSerie {
	name: string;
	ca: number;
	rdv: number;
}

const cleJour = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const cleMois = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** « 2026-11-03 » lu en heure locale (new Date('2026-11-03') le lirait en UTC). */
function dateLocale(valeur: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur);
	if (!m) return null;
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	return Number.isNaN(d.getTime()) ? null : d;
}

function casesJours(debut: Date, fin: Date): CasePeriode[] {
	const out: CasePeriode[] = [];
	const d = new Date(debut);
	while (d <= fin) {
		out.push({ cle: cleJour(d), libelle: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) });
		d.setDate(d.getDate() + 1);
	}
	return out;
}

function casesMois(debut: Date, fin: Date): CasePeriode[] {
	const out: CasePeriode[] = [];
	const d = new Date(debut.getFullYear(), debut.getMonth(), 1);
	while (d <= fin) {
		out.push({ cle: cleMois(d), libelle: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) });
		d.setMonth(d.getMonth() + 1);
	}
	return out;
}

/**
 * Bornes d'une période, aujourd'hui compris :
 * 7 jours = aujourd'hui et les 6 jours précédents (7 points), 30 jours = 30 points,
 * 1 an = les 12 derniers mois civils, mois en cours compris (12 points).
 * Chaque période contient donc toujours la plus courte.
 */
export function bornesPeriode(periode: Periode, debutPerso = '', finPerso = '', maintenant = new Date()): BornesPeriode {
	const finJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate(), 23, 59, 59, 999);
	const joursAvant = (n: number) => new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - n);

	if (periode === 'week') {
		const debut = joursAvant(6);
		return { debut, fin: finJour, parMois: false, cases: casesJours(debut, finJour), provisoire: false };
	}
	if (periode === 'year') {
		const debut = new Date(maintenant.getFullYear(), maintenant.getMonth() - 11, 1);
		return { debut, fin: finJour, parMois: true, cases: casesMois(debut, finJour), provisoire: false };
	}
	if (periode === 'custom') {
		let a = dateLocale(debutPerso);
		let b = dateLocale(finPerso);
		if (a && b) {
			if (a > b) [a, b] = [b, a];
			const fin = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 23, 59, 59, 999);
			// Au-delà de trois mois, un point par mois reste lisible ; en deçà, un point par jour.
			const jours = Math.round((fin.getTime() - a.getTime()) / 86400000);
			const parMois = jours > 92;
			return { debut: a, fin, parMois, cases: parMois ? casesMois(a, fin) : casesJours(a, fin), provisoire: false };
		}
		const debut = joursAvant(29);
		return { debut, fin: finJour, parMois: false, cases: casesJours(debut, finJour), provisoire: true };
	}
	const debut = joursAvant(29);
	return { debut, fin: finJour, parMois: false, cases: casesJours(debut, finJour), provisoire: false };
}

/** Série de la courbe : une valeur par case de la période, zéro quand il n'y a rien. */
export function serieParCase(rdvs: RdvAvecPrestation[], bornes: BornesPeriode): PointSerie[] {
	const index = new Map<string, PointSerie>();
	const serie = bornes.cases.map((c) => {
		const p = { name: c.libelle, ca: 0, rdv: 0 };
		index.set(c.cle, p);
		return p;
	});
	for (const r of rdvs) {
		const d = new Date(r.start_time);
		const p = index.get(bornes.parMois ? cleMois(d) : cleJour(d));
		if (!p) continue;
		p.ca += r.services?.price || 0;
		p.rdv += 1;
	}
	for (const p of serie) p.ca = roundMoney(p.ca);
	return serie;
}

export interface ResultatPeriode {
	pro: Professional | null;
	/** Rendez-vous non annulés de la période. */
	rdvs: RdvAvecPrestation[];
	source: 'base' | 'demo';
}

/** Rendez-vous de la période (hors annulés), depuis la base ou, si elle n'a aucun rendez-vous, la démonstration. */
export async function chargerRdvPeriode(bornes: BornesPeriode): Promise<ResultatPeriode> {
	const tag = getDemoTag();
	const pro = await getPrimaryProfessional(tag);
	let rdvs: RdvAvecPrestation[] | null = null;

	if (pro) {
		const { data, error } = await supabase
			.from('appointments')
			.select('*, services(name, duration_minutes, price)')
			.eq('professional_id', pro.id)
			.eq('tag_bd', tag)
			.gte('start_time', bornes.debut.toISOString())
			.lte('start_time', bornes.fin.toISOString());
		if (!error && data) {
			if (data.length > 0) {
				rdvs = data as RdvAvecPrestation[];
			} else {
				// Période vide : est-ce que la base a des rendez-vous ailleurs dans le temps ?
				const { data: un, error: e2 } = await supabase
					.from('appointments')
					.select('id')
					.eq('professional_id', pro.id)
					.eq('tag_bd', tag)
					.limit(1);
				if (!e2 && un && un.length > 0) rdvs = [];
			}
		}
	}

	const source: 'base' | 'demo' = rdvs ? 'base' : 'demo';
	const liste = rdvs ?? generateDiamantDemoAppointments().filter((a) => {
		const t = new Date(a.start_time).getTime();
		return t >= bornes.debut.getTime() && t <= bornes.fin.getTime();
	});

	return { pro, rdvs: liste.filter((r) => r.status !== 'cancelled'), source };
}

export function libellePeriode(p: Periode): string {
	switch (p) {
		case 'week': return '7 derniers jours';
		case 'month': return '30 derniers jours';
		case 'year': return '12 derniers mois';
		case 'custom': return 'Période personnalisée';
	}
}

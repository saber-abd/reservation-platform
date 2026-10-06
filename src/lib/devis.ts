// Calcul du simulateur de devis (/devis). Module pur : aucune dépendance au DOM ni à React.
// Source des données : src/data/devis.json.

export type FormuleId = 'standard' | 'premium' | 'diamant';
export type Statut = 'inclus' | 'option';

export interface Fourchette {
	min: number;
	max: number;
}

export interface TarifParUnite {
	prix: number;
	unite: string;
	volumeMin: number;
	volumeMax: number;
}

/** Conditions d'un service dans une formule donnée. */
export interface Tarif {
	statut: Statut;
	jours: number;
	fraisUniques?: number;
	mensuel?: Fourchette;
	annuel?: Fourchette;
	parUnite?: TarifParUnite;
	note?: string;
}

export interface Service {
	id: string;
	nom: string;
	categorie: string;
	description: string;
	outils: string[];
	fiabilite?: string;
	/** Formule absente = service non disponible dans cette formule. */
	formules: Partial<Record<FormuleId, Tarif>>;
}

export interface Formule {
	id: FormuleId;
	nom: string;
	accroche: string;
	description: string;
}

export interface Categorie {
	id: string;
	nom: string;
}

export interface DevisMeta {
	dateTarifs: string;
	tjm: number;
	devise: string;
	mentionTva: string;
	noteTjm?: string;
	noteFrais?: string;
}

export interface DevisData {
	meta: DevisMeta;
	formules: Formule[];
	categories: Categorie[];
	services: Service[];
}

export interface LigneDevis {
	service: Service;
	tarif: Tarif;
	mainOeuvre: number;
	fraisMensuels: Fourchette;
}

export interface TotauxDevis {
	lignes: LigneDevis[];
	/** Nombre d'options (statut « option ») cochées et disponibles dans la formule. */
	nbOptions: number;
	jours: number;
	mainOeuvre: number;
	fraisMensuels: Fourchette;
	premiereAnnee: Fourchette;
}

export const FORMULE_PAR_DEFAUT: FormuleId = 'premium';

export function estFormuleId(value: unknown, data: DevisData): value is FormuleId {
	return typeof value === 'string' && data.formules.some((f) => f.id === value);
}

/** Tarif du service dans la formule, ou undefined s'il n'y est pas disponible. */
export function tarifDe(service: Service, formule: FormuleId): Tarif | undefined {
	return service.formules[formule];
}

/** Main d'œuvre (HT) : jours × taux journalier, plus les frais uniques éventuels. */
export function mainOeuvre(tarif: Tarif, tjm: number): number {
	return tarif.jours * tjm + (tarif.fraisUniques ?? 0);
}

/** Frais de fonctionnement mensuels estimés (abonnements, coûts à l'usage). */
export function fraisMensuels(tarif: Tarif): Fourchette {
	let min = 0;
	let max = 0;
	if (tarif.mensuel) {
		min += tarif.mensuel.min;
		max += tarif.mensuel.max;
	}
	if (tarif.annuel) {
		min += tarif.annuel.min / 12;
		max += tarif.annuel.max / 12;
	}
	if (tarif.parUnite) {
		min += tarif.parUnite.prix * tarif.parUnite.volumeMin;
		max += tarif.parUnite.prix * tarif.parUnite.volumeMax;
	}
	return { min, max };
}

export function aDesFrais(tarif: Tarif): boolean {
	return Boolean(tarif.mensuel || tarif.annuel || tarif.parUnite);
}

/** Services inclus + options cochées, disponibles dans la formule. */
export function lignesRetenues(data: DevisData, formule: FormuleId, options: Iterable<string>): LigneDevis[] {
	const coches = new Set(options);
	const lignes: LigneDevis[] = [];
	for (const service of data.services) {
		const tarif = tarifDe(service, formule);
		if (!tarif) continue;
		if (tarif.statut === 'option' && !coches.has(service.id)) continue;
		lignes.push({ service, tarif, mainOeuvre: mainOeuvre(tarif, data.meta.tjm), fraisMensuels: fraisMensuels(tarif) });
	}
	return lignes;
}

export function calculerDevis(data: DevisData, formule: FormuleId, options: Iterable<string>): TotauxDevis {
	const lignes = lignesRetenues(data, formule, options);
	let jours = 0;
	let mo = 0;
	const frais: Fourchette = { min: 0, max: 0 };
	let nbOptions = 0;
	for (const l of lignes) {
		jours += l.tarif.jours;
		mo += l.mainOeuvre;
		frais.min += l.fraisMensuels.min;
		frais.max += l.fraisMensuels.max;
		if (l.tarif.statut === 'option') nbOptions++;
	}
	return {
		lignes,
		nbOptions,
		jours,
		mainOeuvre: mo,
		fraisMensuels: frais,
		premiereAnnee: { min: mo + 12 * frais.min, max: mo + 12 * frais.max },
	};
}

/** Formules (autres que `formule`) qui proposent ce service. */
export function formulesProposant(data: DevisData, service: Service, sauf?: FormuleId): Formule[] {
	return data.formules.filter((f) => f.id !== sauf && service.formules[f.id]);
}

// --- Formatage (fr-FR) ---

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eurosPrecis = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Montant arrondi à l'euro : « 1 350 € ». */
export function formatEuros(value: number): string {
	return euros.format(Math.round(value));
}

/** Prix unitaire (peut avoir des centimes) : « 0,07 € ». */
export function formatPrixUnitaire(value: number): string {
	return eurosPrecis.format(value);
}

export function formatNombre(value: number): string {
	return nombre.format(value);
}

/** « 1,5 jour », « 3 jours ». */
export function formatJours(value: number): string {
	return `${nombre.format(value)} ${value >= 2 ? 'jours' : 'jour'}`;
}

/** « 30 € » si min = max (après arrondi), sinon « 0 à 5 € ». */
export function formatFourchette(f: Fourchette): string {
	const min = Math.round(f.min);
	const max = Math.round(f.max);
	if (min === max) return euros.format(min);
	return `${nombre.format(min)} à ${euros.format(max)}`;
}

/** Libellés des frais récurrents d'un tarif : « 0 à 5 € / mois », « 10 à 20 € / an »… */
export function libellesFrais(tarif: Tarif): string[] {
	const out: string[] = [];
	if (tarif.mensuel) out.push(`${formatFourchette(tarif.mensuel)} / mois`);
	if (tarif.annuel) out.push(`${formatFourchette(tarif.annuel)} / an`);
	if (tarif.parUnite) {
		const u = tarif.parUnite;
		const vol = u.volumeMin === u.volumeMax ? formatNombre(u.volumeMin) : `${formatNombre(u.volumeMin)} à ${formatNombre(u.volumeMax)}`;
		out.push(`${formatPrixUnitaire(u.prix)} / ${u.unite} (${vol} ${u.unite} / mois, soit ${formatFourchette(fraisMensuels({ statut: tarif.statut, jours: 0, parUnite: u }))} / mois)`);
	}
	return out;
}

/** Date ISO (AAAA-MM-JJ) → « 6 octobre 2026 ». */
export function formatDate(iso: string): string {
	const d = new Date(`${iso}T12:00:00Z`);
	if (Number.isNaN(d.getTime())) return iso;
	return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

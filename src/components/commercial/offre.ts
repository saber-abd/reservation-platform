// Contenu des trois formules pour la page commerciale (accueil, pages galerie, pied de page).
// Tout est calculé depuis src/data/devis.json : aucun prix, aucune durée n'est écrit à la main ici.
import devisJson from '@/data/devis.json';
import {
	type DevisData,
	type FormuleId,
	type Service,
	type Tarif,
	calculerDevis,
	formatEuros,
	formatFourchette,
	formatJours,
	tarifDe,
} from '@/lib/devis';

export const devis = devisJson as DevisData;
export const IDS: FormuleId[] = ['standard', 'premium', 'diamant'];

/** Prestations présentes dans toutes les formules (cadrage, maquette, mentions, mise en ligne) :
 *  on ne les répète pas dans « ce que la formule contient ». */
const COMMUNES = new Set(['cadrage', 'design', 'pages-legales', 'hebergement', 'domaine', 'recette']);

const service = (id: string) => devis.services.find((s) => s.id === id);
export const estInclus = (s: Service, f: FormuleId) => tarifDe(s, f)?.statut === 'inclus';
/** Première formule (0, 1, 2) qui inclut le service, ou -1. */
const premierPalier = (s: Service) => IDS.findIndex((f) => estInclus(s, f));

export interface LigneContenu {
	service: Service;
	/** Le service apparaît à ce palier (pas hérité de la formule précédente). */
	nouveau: boolean;
}

export interface Palier {
	id: FormuleId;
	index: number;
	nom: string;
	accroche: string;
	description: string;
	/** Main d'œuvre des prestations incluses, sans option : « 2 775 € ». */
	prixBase: string;
	/** Frais de fonctionnement estimés : « 1 à 32 € / mois ». */
	frais: string;
	jours: string;
	maintenance?: string;
	demo: string;
	detail: string;
	devisHref: string;
	/** Contenu cumulé : d'abord ce qui vient des formules précédentes, puis les ajouts. */
	contenu: LigneContenu[];
	ajouts: Service[];
}

// Ordre d'affichage stable d'un palier à l'autre : par palier d'apparition, puis ceux qui
// restent inclus dans les formules suivantes avant ceux qui disparaissent (la réservation
// Google Agenda de Standard est remplacée en Premium par le moteur de réservation en base).
const affichables = devis.services
	.filter((s) => !COMMUNES.has(s.id) && premierPalier(s) >= 0)
	.map((s, ordre) => ({ s, ordre, palier: premierPalier(s), duree: IDS.filter((f) => estInclus(s, f)).length }))
	.sort((a, b) => a.palier - b.palier || b.duree - a.duree || a.ordre - b.ordre)
	.map((x) => x.s);

export const paliers: Palier[] = IDS.map((id, index) => {
	const f = devis.formules.find((x) => x.id === id)!;
	const totaux = calculerDevis(devis, id, []);
	const contenu = affichables
		.filter((s) => estInclus(s, id))
		.map((s) => ({ service: s, nouveau: premierPalier(s) === index }));
	const maintenance = service('maintenance');
	const tarifMaintenance: Tarif | undefined = maintenance ? tarifDe(maintenance, id) : undefined;
	return {
		id,
		index,
		nom: f.nom,
		accroche: f.accroche,
		description: f.description,
		prixBase: formatEuros(totaux.mainOeuvre),
		frais: `${formatFourchette(totaux.fraisMensuels)} / mois`,
		jours: formatJours(totaux.jours),
		maintenance: tarifMaintenance?.mensuel ? `${formatFourchette(tarifMaintenance.mensuel)} / mois` : undefined,
		demo: `/demo-${id}/`,
		detail: `/galerie/${id}`,
		devisHref: `/devis?formule=${id}`,
		contenu,
		ajouts: contenu.filter((c) => c.nouveau).map((c) => c.service),
	};
});

/** Noms des formules qui incluent le service : « Premium et Diamant ». */
export function formulesIncluant(id: string): string {
	const s = service(id);
	if (!s) return '';
	const noms = paliers.filter((p) => estInclus(s, p.id)).map((p) => p.nom);
	if (noms.length === 3) return 'Toutes les formules';
	return noms.length > 1 ? `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}` : `${noms[0] ?? ''} uniquement`;
}

/** Espace insécable avant « : ; ? ! » (typographie française). */
export const fr = (texte: string) => texte.replace(/ ([:;?!])/g, ' $1');

export const descriptionService = (id: string) => fr(service(id)?.description ?? '');
export const nomService = (id: string) => service(id)?.nom ?? '';

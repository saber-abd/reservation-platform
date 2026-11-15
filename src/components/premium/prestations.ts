// Prestations affichées sur la vitrine Premium (accueil et page Services).
// Chargées depuis Supabase côté serveur quand la base répond ; sinon, repli sur
// la liste ci-dessous (mêmes prestations que la démo d'origine).
import { getPrimaryProfessional, getServices } from '@/lib/queries';

export interface Prestation {
	/** Identifiant Supabase : présélectionne la prestation dans le formulaire de réservation. */
	id: string | null;
	nom: string;
	description: string;
	duree: string;
	prix: string;
	image: PrestationImage;
}

export interface PrestationImage {
	fichier: string;
	largeurs: number[];
	ratio: [number, number];
	alt: string;
}

const IMAGES: Record<string, PrestationImage> = {
	moteur: { fichier: 'atelier-moteur', largeurs: [800, 1400, 2000], ratio: [4, 3], alt: 'Mains d’un mécanicien serrant une pièce moteur à la clé plate' },
	courroie: { fichier: 'courroie', largeurs: [600, 1000, 1600], ratio: [16, 9], alt: 'Courroie d’accessoires et galets tendeurs d’un moteur' },
	chassis: { fichier: 'chassis', largeurs: [600, 1000, 1600], ratio: [3, 2], alt: 'Contrôle du soubassement d’un véhicule sur le pont' },
	pneus: { fichier: 'pneus', largeurs: [600, 1000, 1600], ratio: [3, 2], alt: 'Piles de pneus en stock à l’atelier' },
	lavage: { fichier: 'lavage', largeurs: [600, 1000, 1500], ratio: [5, 6], alt: 'Carrosserie noire rincée à haute pression' },
	outils: { fichier: 'outils', largeurs: [600, 1000, 1600], ratio: [3, 2], alt: 'Panneau d’outillage de l’atelier, clés rangées par taille' },
};

/** Choisit la photo d'atelier qui correspond le mieux au nom de la prestation. */
export function imagePourPrestation(nom: string): PrestationImage {
	const n = nom.toLowerCase();
	if (/pneu|roue|jante|géométrie|geometrie|parall/.test(n)) return IMAGES.pneus;
	if (/lavage|detailing|détailing|nettoyage|polissage|céramique|ceramique|intérieur|interieur/.test(n)) return IMAGES.lavage;
	if (/diagnostic|électronique|electronique|distribution|courroie/.test(n)) return IMAGES.courroie;
	if (/bilan|contrôle|controle|révision|revision|vidange|entretien|frein/.test(n)) return IMAGES.chassis;
	if (/moteur|réparation|reparation|mécanique|mecanique|embrayage/.test(n)) return IMAGES.moteur;
	return IMAGES.outils;
}

export const images = IMAGES;

const REPLI: Omit<Prestation, 'image' | 'id'>[] = [
	{
		nom: 'Diagnostic avancé',
		description: 'Lecture des calculateurs à la valise, relevé des codes défaut et essai routier. Vous repartez avec un compte rendu écrit.',
		duree: '45 min',
		prix: 'À partir de 49 €',
	},
	{
		nom: 'Bilan de santé',
		description: 'Cinquante points vérifiés sur le pont : freinage, trains roulants, fluides, éclairage, batterie.',
		duree: '1 h',
		prix: 'Forfait 79 €',
	},
	{
		nom: 'Réparation moteur',
		description: 'De la courroie de distribution à la culasse. Devis chiffré après diagnostic, pièces remplacées montrées à la restitution.',
		duree: 'Selon devis',
		prix: 'Sur devis',
	},
	{
		nom: 'Changement de pneus',
		description: 'Montage, équilibrage et contrôle de géométrie. Valves neuves et serrage au couple.',
		duree: '40 min',
		prix: 'Dès 15 € / pneu',
	},
	{
		nom: 'Lavage extérieur',
		description: 'Prélavage à la mousse, lavage à la main, séchage microfibre et protection déperlante.',
		duree: '30 min',
		prix: 'À partir de 25 €',
	},
	{
		nom: 'Detailing intérieur',
		description: 'Shampoing des sièges et moquettes, nettoyage des plastiques, soin des cuirs.',
		duree: '2 h',
		prix: 'Forfait 89 €',
	},
];

function formatDuree(minutes: number): string {
	if (!minutes) return 'Selon devis';
	if (minutes < 60) return `${minutes} min`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

function formatPrix(prix: number): string {
	if (!prix) return 'Sur devis';
	return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(prix)} €`;
}

function delai<T>(promesse: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promesse,
		new Promise<T>((_, rejet) => setTimeout(() => rejet(new Error('délai dépassé')), ms)),
	]);
}

/** Prestations actives de la démo Premium ; repli statique si Supabase ne répond pas ou n'en contient aucune. */
export async function chargerPrestations(): Promise<Prestation[]> {
	try {
		const services = await delai(
			(async () => {
				const pro = await getPrimaryProfessional('premium');
				return pro ? await getServices(pro.id, 'premium') : [];
			})(),
			2500,
		);
		if (services.length > 0) {
			return services.map((s) => ({
				id: s.id,
				nom: s.name,
				description: s.description ?? '',
				duree: formatDuree(s.duration_minutes),
				prix: formatPrix(s.price),
				image: imagePourPrestation(s.name),
			}));
		}
	} catch {
		// Base injoignable : on affiche la liste de repli.
	}
	return REPLI.map((p) => ({ ...p, id: null, image: imagePourPrestation(p.nom) }));
}

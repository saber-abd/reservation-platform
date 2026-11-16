// Prestations affichées sur la vitrine Diamant (accueil et page Prestations).
// Chargées depuis Supabase côté serveur (prestations actives du salon, table services, tag « diamant ») ;
// si la base ne répond pas ou n'en contient aucune, repli sur la liste de src/config/site.ts.
import { getPrimaryProfessional, getServices } from '@/lib/queries';
import { siteConfig } from '@/config/site';
import { images, type CleImage, type DiamantImage } from '@/components/diamant/images';

export interface Prestation {
	/** Identifiant Supabase : présélectionne la prestation dans le formulaire de réservation (?service=). */
	id: string | null;
	nom: string;
	description: string;
	duree: string;
	prix: string;
	cleImage: CleImage;
	image: DiamantImage;
}

/** Choisit la photo qui correspond le mieux au nom de la prestation. */
export function cleImagePourPrestation(nom: string): CleImage {
	const n = nom.toLowerCase();
	if (/chignon|mariage|cérémonie|ceremonie|attache/.test(n)) return 'chignon';
	if (/brushing|mise en forme|séchage|sechage/.test(n)) return 'brushing';
	if (/permanente|boucle|frisage|ondulation/.test(n)) return 'boucles';
	if (/balayage|mèche|meche|coloration|couleur|ombré|ombre|patine/.test(n)) return 'diagnostic';
	if (/lissage|kératine|keratine/.test(n)) return 'finition';
	if (/soin|masque|shampoing/.test(n)) return 'bac';
	if (/enfant/.test(n)) return 'peignes';
	if (/homme|barbe|mullet|dégradé|degrade|tondeuse/.test(n)) return 'outils';
	if (/coupe/.test(n)) return 'coupe';
	return 'ciseaux';
}

function formatDuree(minutes: number): string {
	if (!minutes) return 'Durée variable';
	if (minutes < 60) return `${minutes} min`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

function formatPrix(prix: number | string): string {
	const valeur = Number(prix);
	if (!valeur) return 'Sur devis';
	return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(valeur)} €`;
}

function delai<T>(promesse: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promesse,
		new Promise<T>((_, rejet) => setTimeout(() => rejet(new Error('délai dépassé')), ms)),
	]);
}

function versPrestation(id: string | null, nom: string, description: string | null, minutes: number, prix: number | string): Prestation {
	const cleImage = cleImagePourPrestation(nom);
	return {
		id,
		nom,
		description: description ?? '',
		duree: formatDuree(minutes),
		prix: formatPrix(prix),
		cleImage,
		image: images[cleImage],
	};
}

/** Prestations actives de la démo Diamant ; repli statique si Supabase ne répond pas ou n'en contient aucune. */
export async function chargerPrestations(): Promise<Prestation[]> {
	try {
		const services = await delai(
			(async () => {
				const pro = await getPrimaryProfessional('diamant');
				return pro ? await getServices(pro.id, 'diamant') : [];
			})(),
			2500,
		);
		if (services.length > 0) {
			return services.map((s) => versPrestation(s.id, s.name, s.description, s.duration_minutes, s.price));
		}
	} catch {
		// Base injoignable : on affiche la liste de repli.
	}
	return siteConfig.services.map((s) => versPrestation(null, s.name, s.description, s.durationMinutes, s.price));
}

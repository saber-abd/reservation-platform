// Catégories des prestations de dépannage informatique (démo Standard).
// La colonne `category` est un texte libre en base : une ancienne valeur absente de cette liste
// (par exemple « Femmes », reprise de l’ancienne démo coiffure) reste affichée telle quelle et reste
// sélectionnable quand on modifie la prestation.
// Mêmes catégories que l'aperçu à données fictives (src/lib/preview.ts).

export const CATEGORIES = ['Diagnostic', 'Dépannage', 'Réparation', 'Installation', 'Données', 'Autre'] as const;

export const CATEGORIE_PAR_DEFAUT = 'Dépannage';

/** Libellé affiché d'une catégorie enregistrée (vide : « Autre »). */
export function libelleCategorie(categorie: string | null | undefined): string {
	return categorie?.trim() || 'Autre';
}

/** Options du menu : la liste du dépanneur, plus la valeur actuelle si elle n'en fait pas partie. */
export function optionsCategorie(actuelle?: string | null): string[] {
	const valeur = actuelle?.trim();
	const liste: string[] = [...CATEGORIES];
	return valeur && !liste.includes(valeur) ? [valeur, ...liste] : liste;
}

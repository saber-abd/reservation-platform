/** Longueur maximale d'un nom de personne (client, invité) saisi dans les formulaires et enregistré en base. */
export const MAX_NAME_LENGTH = 60;

/** Nettoie un nom saisi : espaces superflus retirés, longueur ramenée à MAX_NAME_LENGTH. */
export function clampName(name: string): string;
export function clampName(name: string | null | undefined): string | null;
export function clampName(name: string | null | undefined): string | null {
	if (name == null) return null;
	return name.trim().slice(0, MAX_NAME_LENGTH);
}

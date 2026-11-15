import type { Demo } from './supabase-mock';

export const DEMOS: Demo[] = ['standard', 'premium', 'diamant'];

/** Pages publiques de chaque démo (mêmes chemins pour les trois). */
export const PUBLIC_PAGES = [
	'',
	'services',
	'reservation',
	'a-propos',
	'contact',
	'connexion',
	'inscription',
	'mot-de-passe-oublie',
	'mentions-legales',
	'politique-de-confidentialite',
	'conditions-utilisation',
];

/** Pages de la partie commerciale. */
export const COMMERCIAL_PAGES = [
	'/',
	'/devis',
	'/contact',
	'/notre-histoire',
	'/galerie/standard',
	'/galerie/premium',
	'/galerie/diamant',
	'/mentions-legales',
	'/cgu',
	'/confidentialite',
	'/cookies',
	'/connexion',
	'/inscription',
];

const DASH_COMMON = ['', 'services', 'disponibilites', 'clients', 'statistiques', 'profil'];

/** Pages du tableau de bord professionnel. */
export const DASHBOARD_PAGES: Record<Demo, string[]> = {
	standard: DASH_COMMON,
	premium: DASH_COMMON,
	diamant: [...DASH_COMMON, 'messages', 'recherche', 'droits'],
};

/** Pages de l'espace client. */
export const CLIENT_PAGES: Record<Demo, string[]> = {
	standard: ['', 'fidelite', 'messages', 'profil'],
	premium: ['', 'fidelite', 'messages', 'profil'],
	diamant: ['', 'historique', 'fidelite', 'messages', 'profil'],
};

/** Aperçu du dashboard Premium : données fictives, sans compte. */
export const PREVIEW_PAGES = DASH_COMMON.map((p) => `/demo-premium/apercu/dashboard/${p}`);

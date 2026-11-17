import type { Demo } from './supabase-mock';

export const DEMOS: Demo[] = ['standard', 'premium', 'diamant'];

/** Pages publiques communes aux trois démos. */
const PUBLIC_COMMON = [
	'',
	'services',
	'reservation',
	'a-propos',
	'contact',
	'connexion',
	'mot-de-passe-oublie',
	'mentions-legales',
	'politique-de-confidentialite',
	'conditions-utilisation',
];

/**
 * Pages publiques de chaque démo. Standard n'a pas d'inscription : pas de comptes clients
 * (/demo-standard/inscription redirige vers la connexion).
 */
export const PUBLIC_PAGES: Record<Demo, string[]> = {
	standard: PUBLIC_COMMON,
	premium: [...PUBLIC_COMMON, 'inscription'],
	diamant: [...PUBLIC_COMMON, 'inscription'],
};

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

/** Pages du tableau de bord professionnel. Standard : prestations et profil seulement. */
export const DASHBOARD_PAGES: Record<Demo, string[]> = {
	standard: ['services', 'profil'],
	premium: DASH_COMMON,
	diamant: [...DASH_COMMON, 'messages', 'recherche', 'droits'],
};

/** Pages de l'espace client. Standard n'en a pas (formule sans comptes clients). */
export const CLIENT_PAGES: Record<Demo, string[]> = {
	standard: [],
	premium: ['', 'fidelite', 'messages', 'profil'],
	diamant: ['', 'historique', 'fidelite', 'messages', 'profil'],
};

/** Aperçus des tableaux de bord : données fictives, sans compte (Premium et Standard). */
export const PREVIEW_PAGES = [
	...DASH_COMMON.map((p) => `/demo-premium/apercu/dashboard/${p}`),
	...['services', 'profil'].map((p) => `/demo-standard/apercu/dashboard/${p}`),
];

/** Anciennes pages Standard retirées et leur destination (redirection serveur). */
export const STANDARD_REDIRECTS: [string, string][] = [
	['/demo-standard/dashboard/', '/demo-standard/dashboard/services'],
	['/demo-standard/dashboard/clients', '/demo-standard/dashboard/services'],
	['/demo-standard/dashboard/disponibilites', '/demo-standard/dashboard/services'],
	['/demo-standard/dashboard/statistiques', '/demo-standard/dashboard/services'],
	['/demo-standard/espace-client/', '/demo-standard/'],
	['/demo-standard/espace-client/fidelite', '/demo-standard/'],
	['/demo-standard/espace-client/messages', '/demo-standard/'],
	['/demo-standard/espace-client/profil', '/demo-standard/'],
	['/demo-standard/inscription', '/demo-standard/connexion'],
	['/demo-standard/apercu/dashboard/', '/demo-standard/apercu/dashboard/services'],
];

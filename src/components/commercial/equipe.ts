// Profils de l'équipe, affichés sur la page commerciale (aperçu) et sur /notre-histoire.
// Volontairement généraux : pas d'établissement exact, d'employeur, de date ni de coordonnées.
// `photo` : chemin sous /public (ex. '/images/equipe/saber.webp'). Vide = initiales.

export interface Membre {
	id: string;
	prenom: string;
	initiales: string;
	role: string;
	accroche: string;
	photo: string;
	parcours: string[];
	competences: string[];
	linkedin: string;
}

// TEXTES PROVISOIRES : à remplacer par les parcours validés par Saber et Nadir.
export const membres: Membre[] = [
	{
		id: 'saber',
		prenom: 'Saber',
		initiales: 'SA',
		role: 'Développeur full-stack & réseaux',
		accroche: "Élève ingénieur en cursus orienté informatique, réseau et sécurité à l'Université Paul Sabatier.",
		photo: '',
		parcours: [
			"École d'ingénieur à Toulouse, cursus orienté informatique, réseau et sécurité.",
			'[Provisoire] Expériences et projets à compléter depuis le parcours LinkedIn.',
		],
		competences: ['Astro & React', 'TypeScript', 'PostgreSQL / Supabase', 'Réseaux & télécoms', 'Sécurité applicative'],
		linkedin: 'https://www.linkedin.com/in/saber-abbadi',
	},
	{
		id: 'nadir',
		prenom: 'Nadir',
		initiales: 'NS',
		role: '[Provisoire] Rôle à compléter',
		accroche: '[Provisoire] Formation et domaine à compléter depuis le parcours LinkedIn.',
		photo: '',
		parcours: ['[Provisoire] Formation à compléter.', '[Provisoire] Expériences et projets à compléter.'],
		competences: ['[Provisoire]', 'Compétences à compléter'],
		linkedin: 'https://www.linkedin.com/in/nadir-sana/',
	},
];

// Projets mis en avant sur /notre-histoire.
export const projets = [
	{
		titre: 'Plateforme de réservation en trois formules',
		texte:
			"Ce site : trois démos complètes (Standard, Premium, Diamant), de l'agenda Google synchronisé à la suite de gestion d'équipe avec rôles et modération.",
		tags: ['Astro', 'React', 'Supabase', 'Cloudflare'],
	},
	{
		titre: 'Sécurité des données clients',
		texte:
			'Accès aux données verrouillés côté base (Row Level Security), sessions révoquées à la volée et purge RGPD en cascade.',
		tags: ['PostgreSQL', 'RLS', 'RGPD'],
	},
	{
		titre: 'Performance avant tout',
		texte:
			'Pages légères, styles isolés par démo et animations sobres pour un site rapide même sur un matériel modeste.',
		tags: ['Tailwind', 'Lighthouse', 'Accessibilité'],
	},
];

export const valeurs = [
	{ titre: 'Sur mesure', texte: 'Chaque outil part de votre métier, pas d’un modèle générique.' },
	{ titre: 'Transparence', texte: 'Coûts détaillés, choix techniques expliqués, pas de surprise.' },
	{ titre: 'Proximité', texte: 'Deux interlocuteurs directs, du cahier des charges à la mise en ligne.' },
];

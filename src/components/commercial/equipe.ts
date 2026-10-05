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

export const membres: Membre[] = [
	{
		id: 'saber',
		prenom: 'Saber',
		initiales: 'SA',
		role: 'Réseaux, sécurité & développement',
		accroche:
			"Élève ingénieur en cursus orienté informatique, réseau et sécurité à l'Université Paul Sabatier, en alternance chez un grand opérateur télécom.",
		photo: '/images/equipe/saber.webp',
		parcours: [
			"Licence d'informatique, puis école d'ingénieur à l'Université Paul Sabatier, cursus orienté informatique, réseau et sécurité.",
			'Alternance au sein des équipes réseau d’un grand opérateur télécom : conception et analyse de liaisons radio.',
			'Projets universitaires en administration système et réseau, et en développement web et logiciel.',
		],
		// Niveau « bases » volontairement : grandes lignes maîtrisées, pas d'expertise revendiquée.
		competences: [
			'Bases en développement logiciel',
			'Programmation orientée objet',
			'Bases en développement web',
			'Bases en réseaux et interconnexion',
			'Bases en conteneurisation',
			'Bases en sécurité informatique',
			'Notions de bases de données',
			'Gestion de projet',
			'Anglais et italien',
		],
		linkedin: 'https://www.linkedin.com/in/saber-abbadi',
	},
	{
		id: 'nadir',
		prenom: 'Nadir',
		initiales: 'NS',
		role: 'Ingénierie d’affaires & relation client',
		accroche:
			"En master d'ingénierie d'affaires, technico-commercial dans l'industrie après une formation en génie industriel et maintenance.",
		photo: '/images/equipe/nadir.webp',
		parcours: [
			'Diplôme universitaire de technologie en génie industriel et maintenance.',
			"Technicien de maintenance dans l'industrie : maintenance préventive et corrective, mise en place d'une GMAO et intégration à l'ERP.",
			"Technico-commercial chez un distributeur industriel (analyse des besoins, devis, suivi des commandes), en parallèle d'un master d'ingénierie d'affaires.",
		],
		competences: [
			'Analyse du besoin client',
			'Ingénierie d’affaires',
			'Devis & suivi commercial',
			'ERP & GMAO',
			'Maintenance industrielle',
			'Travail en équipe',
		],
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

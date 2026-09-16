import { getPrimaryProfessional } from '../lib/queries';

// Configuration de contenu du site vitrine — démo "coiffeur".
// Objectif : ne jamais coder les textes/services en dur dans les composants
// (voir Documentation/phase1_cadrage.md). Ce fichier sera remplacé plus tard
// par des données venant de Supabase (tables `professionals` / `services`).

export interface Service {
	name: string;
	description: string;
	durationMinutes: number;
	price: number;
}

export interface Testimonial {
	name: string;
	rating: number;
	comment: string;
}

export interface Diploma {
	title: string;
	institution: string;
	year: string;
}

export const siteConfig = {
	url: 'https://reservation-platform.demonstration-pro.workers.dev',
	business: {
		name: 'Salon Coiffure',
		activity: 'Coiffeur',
		tagline: 'Révélez votre style, sans compromis.',
		description:
			"Salon de coiffure mixte au cœur de la ville, spécialisé dans les coupes tendances, les colorations sur-mesure et les soins capillaires haut de gamme. Une équipe passionnée à votre écoute pour un moment de détente et de transformation.",
		address: '12 rue des Lilas, 75011 Paris',
		lat: 48.8566,
		lng: 2.3522,
		phone: '01 23 45 67 89',
		email: 'contact@salon-coiffure.fr',
		openingHours: [
			{ day: 'Mardi - Vendredi', hours: '9h30 - 19h00' },
			{ day: 'Samedi', hours: '9h00 - 18h00' },
			{ day: 'Dimanche - Lundi', hours: 'Fermé' },
		],
	},

	about: {
		story:
			"Tout a commencé en 2014, quand notre fondatrice a ouvert un premier petit salon de deux fauteuils avec l'envie de proposer une coiffure sur-mesure, loin des enseignes standardisées. Au fil des années et grâce au bouche-à-oreille, l'équipe s'est agrandie et le salon a déménagé dans son écrin actuel au cœur de la ville. Aujourd'hui, ce sont plusieurs coiffeurs passionnés qui partagent le même goût du détail et la même envie de faire de chaque rendez-vous un moment de bien-être.",
		objectives: [
			{
				title: 'Un service sur-mesure',
				description: "Chaque prestation est adaptée à la nature de vos cheveux, votre morphologie et vos envies du moment.",
			},
			{
				title: 'Une formation continue',
				description: 'Notre équipe se forme chaque année aux dernières techniques de coupe et de coloration pour rester à la pointe.',
			},
			{
				title: 'Des produits responsables',
				description: 'Nous privilégions des marques engagées, respectueuses du cheveu et de l\'environnement.',
			},
		],
		diplomas: [
			{ title: 'CAP Coiffure', institution: 'CFA Coiffure Paris', year: '2011' },
			{ title: 'Brevet Professionnel (BP) Coiffure', institution: 'Académie de Coiffure', year: '2013' },
			{ title: 'Brevet de Maîtrise Coiffure', institution: 'Chambre des Métiers et de l\'Artisanat', year: '2017' },
			{ title: 'Certification Coloriste Expert', institution: "L'Oréal Professionnel", year: '2020' },
		] satisfies Diploma[],
	},

	services: [
		{
			name: 'Coupe femme',
			description: 'Coupe personnalisée, shampoing et brushing inclus.',
			durationMinutes: 45,
			price: 45,
		},
		{
			name: 'Coupe homme',
			description: 'Coupe précise aux ciseaux et à la tondeuse, finition soignée.',
			durationMinutes: 30,
			price: 30,
		},
		{
			name: 'Coloration',
			description: 'Coloration sur-mesure adaptée à votre carnation et vos envies.',
			durationMinutes: 90,
			price: 75,
		},
		{
			name: 'Balayage',
			description: 'Technique de mèches pour un effet naturel et lumineux.',
			durationMinutes: 120,
			price: 95,
		},
		{
			name: 'Soin capillaire',
			description: 'Soin profond réparateur pour cheveux abîmés ou secs.',
			durationMinutes: 30,
			price: 35,
		},
		{
			name: 'Chignon événementiel',
			description: 'Coiffure sur-mesure pour vos grandes occasions (mariage, soirée...).',
			durationMinutes: 60,
			price: 65,
		},
	] satisfies Service[],

	testimonials: [
		{
			name: 'Camille D.',
			rating: 5,
			comment:
				"Un accueil chaleureux et un résultat qui dépasse mes attentes à chaque fois. Je recommande les yeux fermés !",
		},
		{
			name: 'Sofiane B.',
			rating: 5,
			comment: 'Équipe très professionnelle, à l\'écoute et de bon conseil. Le salon est magnifique.',
		},
		{
			name: 'Elodie M.',
			rating: 4,
			comment: "Très bonne expérience, coloration parfaite. J'ai adoré le moment de détente pendant le soin.",
		},
		{
			name: 'Julien P.',
			rating: 5,
			comment: 'Réservation en ligne super simple et rappel par email très pratique. Résultat impeccable !',
		},
		{
			name: 'Nadia R.',
			rating: 5,
			comment: "Le balayage est magnifique, exactement ce que je voulais. Un vrai coup de cœur pour ce salon.",
		},
	] satisfies Testimonial[],

	nav: [
		{ label: 'Accueil', href: '/' },
		{ label: 'Services', href: '/services' },
		{ label: 'Réserver', href: '/reservation' },
		{ label: 'À propos', href: '/a-propos' },
		{ label: 'Contact', href: '/contact' },
	],
};

export const itRepairConfig = {
	url: 'https://reservation-platform.demonstration-pro.workers.dev',
	business: {
		name: 'TechDom',
		activity: 'Dépannage Informatique',
		tagline: 'Vos problèmes informatiques résolus, directement chez vous.',
		description:
			"Spécialiste du dépannage informatique à domicile et en atelier. Nous intervenons rapidement pour réparer tous types d'appareils : ordinateurs (PC/Mac), smartphones, tablettes, télévisions et imprimantes. Transparence, efficacité et professionnalisme.",
		address: '45 Avenue de la République, 75011 Paris',
		lat: 48.864716,
		lng: 2.379014,
		phone: '01 99 88 77 66',
		email: 'contact@techdom-reparation.fr',
		openingHours: [
			{ day: 'Lundi - Vendredi', hours: '9h00 - 19h00' },
			{ day: 'Samedi', hours: '10h00 - 18h00' },
			{ day: 'Dimanche', hours: 'Fermé' },
		],
	},

	about: {
		story:
			"Passionnés par l'informatique depuis toujours, nous avons constaté que la technologie, bien qu'essentielle, pouvait vite devenir un casse-tête au quotidien. TechDom est né de cette volonté de simplifier la vie de nos clients en apportant une assistance technique humaine, claire et efficace directement chez eux.",
		objectives: [
			{
				title: 'Transparence des prix',
				description: "Aucune mauvaise surprise : nos forfaits sont clairs, et un devis gratuit est toujours réalisé avant toute réparation complexe.",
			},
			{
				title: 'Intervention Rapide',
				description: 'Parce qu\'un appareil en panne ne peut pas attendre, nous garantissons une intervention sous 24h à 48h.',
			},
			{
				title: 'Pièces de Qualité',
				description: 'Nous utilisons exclusivement des pièces certifiées ou d\'origine constructeur pour garantir la pérennité de nos réparations.',
			},
		],
		diplomas: [
			{ title: 'BTS Services Informatiques aux Organisations', institution: 'Lycée Tech', year: '2016' },
			{ title: 'Certification Apple (ACMT)', institution: 'Apple', year: '2018' },
			{ title: 'Technicien Réseau & Télécom', institution: 'Institut Tech', year: '2019' },
		] satisfies Diploma[],
	},

	services: [
		{
			name: 'Diagnostic Complet',
			description: 'Recherche de panne sur ordinateur, tablette ou smartphone.',
			durationMinutes: 30,
			price: 39,
		},
		{
			name: 'Changement Écran Smartphone/Tablette',
			description: 'Remplacement de l\'écran par une pièce d\'origine ou compatible AAA. (Sur devis)',
			durationMinutes: 60,
			price: 0, // 0 can signify "Sur devis" in UI
		},
		{
			name: 'Remplacement Batterie',
			description: 'Changement de la batterie (Smartphone, Tablette, PC portable). À partir de 49€ selon modèle.',
			durationMinutes: 30,
			price: 49,
		},
		{
			name: 'Connecteur de Charge',
			description: 'Remplacement du port de charge défectueux (Micro-USB, USB-C, Lightning).',
			durationMinutes: 60,
			price: 59,
		},
		{
			name: 'Mise à niveau Composants PC',
			description: 'Ajout de mémoire RAM, passage au disque dur SSD pour accélérer votre ordinateur.',
			durationMinutes: 60,
			price: 79,
		},
		{
			name: 'Réparation TV (Changement Dalle)',
			description: 'Diagnostic et remplacement de la dalle de votre téléviseur. (Sur devis selon résolution)',
			durationMinutes: 120,
			price: 0,
		},
		{
			name: 'Dépannage Imprimante',
			description: 'Résolution des problèmes de connexion, bourrages papier ou configuration réseau.',
			durationMinutes: 45,
			price: 49,
		},
		{
			name: 'Nettoyage Logiciel & Virus',
			description: 'Éradication des malwares, optimisation du système et nettoyage du registre.',
			durationMinutes: 60,
			price: 59,
		},
		{
			name: 'Installation Pack Office',
			description: 'Installation et configuration de la suite bureautique (Word, Excel...) et autres logiciels.',
			durationMinutes: 30,
			price: 49,
		},
	] satisfies Service[],

	testimonials: [
		{
			name: 'Laurent D.',
			rating: 5,
			comment: "Intervention très rapide ! Mon PC ne démarrait plus, le problème a été réglé en une heure à domicile. Très professionnel.",
		},
		{
			name: 'Sophie M.',
			rating: 5,
			comment: "J'ai fait changer l'écran de mon iPhone 13. Service impeccable, tarif annoncé à l'avance et travail soigné.",
		},
		{
			name: 'Bernard P.',
			rating: 4,
			comment: "Très bon technicien qui a su configurer mon imprimante récalcitrante et m'expliquer le fonctionnement.",
		},
		{
			name: 'Amélie T.',
			rating: 5,
			comment: "Mon ordinateur ramait énormément. Le passage au SSD a tout changé, c'est comme s'il était neuf !",
		},
	] satisfies Testimonial[],

	nav: [
		{ label: 'Accueil', href: '/' },
		{ label: 'Services', href: '/services' },
		{ label: 'Réserver', href: '/reservation' },
		{ label: 'À propos', href: '/a-propos' },
		{ label: 'Contact', href: '/contact' },
	],
};

export async function getSiteConfig(currentPath?: string) {
	try {
		const tag = currentPath ? (currentPath.match(/^\/demo-([^/]+)/)?.[1] || 'diamant') : 'diamant';
		
		let baseConfig = siteConfig;
		if (tag === 'standard') {
			baseConfig = itRepairConfig;
		}

		const pro = await getPrimaryProfessional(tag);
		if (pro) {
			return {
				...baseConfig,
				business: {
					...baseConfig.business,
					name: pro.business_name || baseConfig.business.name,
					activity: pro.activity || baseConfig.business.activity,
					description: pro.description || baseConfig.business.description,
					phone: pro.phone || baseConfig.business.phone,
					email: pro.email || baseConfig.business.email,
					address: pro.address || baseConfig.business.address,
				}
			};
		}
		
		return baseConfig;
	} catch (e) {
		console.error("Error fetching primary professional", e);
	}
	
	const tag = currentPath ? (currentPath.match(/^\/demo-([^/]+)/)?.[1] || 'diamant') : 'diamant';
	return tag === 'standard' ? itRepairConfig : siteConfig;
}

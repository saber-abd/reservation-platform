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

export const siteConfig = {
	url: 'https://reservation-platform.demonstration-pro.workers.dev',
	business: {
		name: 'Salon Éclat',
		activity: 'Coiffeur',
		tagline: 'Révélez votre style, sans compromis.',
		description:
			"Salon de coiffure mixte au cœur de la ville, spécialisé dans les coupes tendances, les colorations sur-mesure et les soins capillaires haut de gamme. Une équipe passionnée à votre écoute pour un moment de détente et de transformation.",
		address: '12 rue des Lilas, 75011 Paris',
		phone: '01 23 45 67 89',
		email: 'contact@salon-eclat.fr',
		openingHours: [
			{ day: 'Mardi - Vendredi', hours: '9h30 - 19h00' },
			{ day: 'Samedi', hours: '9h00 - 18h00' },
			{ day: 'Dimanche - Lundi', hours: 'Fermé' },
		],
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
	] satisfies Testimonial[],

	nav: [
		{ label: 'Accueil', href: '/' },
		{ label: 'Services', href: '/services' },
		{ label: 'À propos', href: '/a-propos' },
		{ label: 'Contact', href: '/contact' },
	],
};

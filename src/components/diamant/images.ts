// Photos locales du site public Diamant (public/images/diamant), servies en AVIF avec repli WebP
// par DiamantPicture.astro. Sources et licences : public/images/diamant/SOURCES.md.

export interface DiamantImage {
	fichier: string;
	largeurs: number[];
	ratio: [number, number];
	alt: string;
}

export const images = {
	hero: { fichier: 'hero', largeurs: [768, 1280, 1920], ratio: [3, 2], alt: 'Miroir rond et flacons de soin sur la console, fauteuils de coupe vides en arrière-plan' },
	salon: { fichier: 'salon', largeurs: [768, 1280, 1920], ratio: [3, 2], alt: 'Le salon : fauteuils noirs face aux miroirs ronds éclairés, sol en marbre sombre' },
	diagnostic: { fichier: 'etape-diagnostic', largeurs: [640, 960], ratio: [2, 3], alt: 'La main de la coiffeuse soulève des cheveux blonds ondulés pour en juger la matière' },
	bac: { fichier: 'etape-bac', largeurs: [640, 960], ratio: [3, 2], alt: 'Shampoing au bac, la nuque de la cliente posée sur la vasque' },
	coupe: { fichier: 'etape-coupe', largeurs: [640, 960], ratio: [2, 3], alt: 'Une mèche tenue entre deux doigts et coupée aux ciseaux, peigne en main' },
	finition: { fichier: 'etape-finition', largeurs: [640, 960], ratio: [2, 3], alt: 'Brushing à la brosse ronde sous le séchoir' },
	ciseaux: { fichier: 'ciseaux', largeurs: [640, 960], ratio: [3, 2], alt: 'Paires de ciseaux de coupe suspendues à une barre murale' },
	peignes: { fichier: 'peignes', largeurs: [640, 960], ratio: [2, 3], alt: 'Peignes, tondeuse et pinces alignés sur un plan de travail en bois' },
	chignon: { fichier: 'chignon', largeurs: [640, 960], ratio: [3, 2], alt: 'Chignon torsadé fixé à la main avec des épingles' },
	boucles: { fichier: 'boucles', largeurs: [640, 960], ratio: [3, 2], alt: 'Boucles réalisées au fer sur des cheveux blond vénitien' },
	outils: { fichier: 'outils', largeurs: [768, 1280], ratio: [2, 3], alt: 'Brosses et ciseaux rangés dans un support en bois' },
	brushing: { fichier: 'brushing', largeurs: [768, 1280], ratio: [3, 2], alt: 'Brushing en cours : séchoir et brosse ronde sur des cheveux mi-longs' },
} satisfies Record<string, DiamantImage>;

export type CleImage = keyof typeof images;

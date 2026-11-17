import type { Professional, Service, Client, Appointment, AvailabilityRule, Message } from './queries';

/**
 * Mode « aperçu » : les pages /demo-<démo>/apercu/** affichent le dashboard avec des données
 * fictives générées ici, sans compte, sans base de données et en lecture seule.
 * Les fonctions de lecture de queries.ts renvoient ces données (via getPreviewData()) ;
 * les écritures sont refusées.
 *
 * Le jeu de données dépend de la démo lue dans l'URL :
 * - Premium (garage) : profil, prestations, clients, rendez-vous, disponibilités, messages ;
 * - Standard (dépannage informatique, sans base de données) : profil et prestations seulement,
 *   les rendez-vous de cette formule arrivant dans Google Agenda.
 */

const PREVIEW_PATH = /^\/demo-([^/]+)\/apercu(\/|$)/;

export function isPreviewMode(): boolean {
	return typeof window !== 'undefined' && PREVIEW_PATH.test(window.location.pathname);
}

/** À appeler en tête de chaque fonction d'écriture. */
export function assertNotPreview(): void {
	if (isPreviewMode()) {
		throw new Error("Aperçu en lecture seule : les modifications sont désactivées dans cette démonstration.");
	}
}

type PreviewAppointment = Appointment & { services: { name: string; duration_minutes: number; price: number } | null };

export interface PreviewData {
	professional: Professional;
	services: Service[];
	appointments: PreviewAppointment[];
	availabilityRules: AvailabilityRule[];
	clients: Client[];
	messagesFor: (clientId: string) => Message[];
}

type PreviewDemo = 'premium' | 'standard';

const PRO_ID = 'preview-pro';

// Générateur pseudo-aléatoire déterministe : les mêmes chiffres à chaque affichage.
function rng(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function startOfDay(offsetDays: number): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + offsetDays);
	return d;
}

interface ServiceDef {
	name: string;
	category: string;
	duration: number;
	price: number;
	description?: string;
}

function buildServices(defs: ServiceDef[], tag: PreviewDemo): Service[] {
	return defs.map((s, i) => ({
		id: `preview-service-${i + 1}`,
		professional_id: PRO_ID,
		name: s.name,
		category: s.category,
		description: s.description ?? null,
		duration_minutes: s.duration,
		price: s.price,
		is_active: true,
		is_deleted: false,
		image_url: null,
		created_at: startOfDay(-120).toISOString(),
		tag_bd: tag,
	}));
}

/* ───────────────────────────── Premium : garage ───────────────────────────── */

// Catégories alignées sur celles du formulaire de prestation Premium
// (src/components/premium/dashboard/categories.ts).
const PREMIUM_SERVICES: ServiceDef[] = [
	{ name: 'Vidange + filtre à huile', category: 'Entretien', duration: 60, price: 89 },
	{ name: 'Remplacement plaquettes de frein', category: 'Freinage', duration: 90, price: 129 },
	{ name: 'Diagnostic électronique', category: 'Diagnostic', duration: 45, price: 59 },
	{ name: 'Montage et équilibrage de pneus', category: 'Pneus', duration: 60, price: 79 },
	{ name: 'Recharge de climatisation', category: 'Entretien', duration: 60, price: 99 },
	{ name: 'Courroie de distribution', category: 'Entretien', duration: 240, price: 480 },
	{ name: 'Contrôle pré-contrôle technique', category: 'Diagnostic', duration: 45, price: 49 },
	{ name: 'Géométrie / parallélisme', category: 'Pneus', duration: 60, price: 75 },
	{ name: 'Lustrage et protection céramique', category: 'Esthétique', duration: 180, price: 290 },
	{ name: 'Débosselage sans peinture', category: 'Carrosserie', duration: 120, price: 150 },
];

const CLIENT_NAMES = [
	['Camille Martin', 'camille.martin'],
	['Lucas Bernard', 'lucas.bernard'],
	['Inès Dubois', 'ines.dubois'],
	['Hugo Moreau', 'hugo.moreau'],
	['Léa Laurent', 'lea.laurent'],
	['Nathan Petit', 'nathan.petit'],
	['Manon Roux', 'manon.roux'],
	['Théo Girard', 'theo.girard'],
	['Sarah Lefèvre', 'sarah.lefevre'],
	['Maxime Fontaine', 'maxime.fontaine'],
];

function buildPremium(): PreviewData {
	const TAG = 'premium';

	const professional: Professional = {
		id: PRO_ID,
		user_id: 'preview-user',
		business_name: 'Arsenal Mécanique',
		activity: 'Garage Automobile',
		description: "Entretien, réparation et diagnostic toutes marques. Atelier fictif présenté à titre de démonstration.",
		phone: '01 23 45 67 89',
		email: 'contact@arsenal-mecanique.example',
		address: "12 rue de l'Atelier, 75000 Paris",
		logo_url: null,
		avatar_url: null,
		opening_hours: null,
		tag_bd: TAG,
	};

	const services = buildServices(PREMIUM_SERVICES, TAG);

	const clients: Client[] = CLIENT_NAMES.map(([name, mail], i) => ({
		id: `preview-client-${i + 1}`,
		full_name: name,
		phone: `06 ${String(10 + i * 7).padStart(2, '0')} ${String(20 + i * 5).padStart(2, '0')} ${String(30 + i * 3).padStart(2, '0')} ${String(40 + i).padStart(2, '0')}`,
		avatar_url: null,
		created_at: startOfDay(-90 + i * 6).toISOString(),
		tag_bd: TAG,
		email: `${mail}@exemple.fr`,
		is_banned: false,
		ban: 'non',
		ban_reason: null,
		banned_at: null,
	}));

	const rand = rng(20261019);
	const appointments: PreviewAppointment[] = [];
	let n = 0;
	// Quatre mois d'historique, jusqu'à dix jours dans le futur
	for (let day = -120; day <= 10; day++) {
		const date = startOfDay(day);
		const weekday = date.getDay();
		if (weekday === 0) continue; // fermé le dimanche
		const count = weekday === 6 ? 1 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 3);
		for (let k = 0; k < count; k++) {
			const service = services[Math.floor(rand() * services.length)];
			const client = clients[Math.floor(rand() * clients.length)];
			const hour = 8 + Math.floor(rand() * 8);
			const start = new Date(date);
			start.setHours(hour, rand() > 0.5 ? 30 : 0, 0, 0);
			const end = new Date(start.getTime() + service.duration_minutes * 60_000);

			let status: Appointment['status'];
			if (day < 0) status = rand() < 0.08 ? 'cancelled' : 'completed';
			else if (day === 0) status = start.getTime() < Date.now() ? 'completed' : 'confirmed';
			else status = rand() < 0.35 ? 'pending' : 'confirmed';

			n += 1;
			appointments.push({
				id: `preview-appointment-${n}`,
				professional_id: PRO_ID,
				service_id: service.id,
				availability_id: null,
				client_id: client.id,
				client_name: client.full_name ?? 'Client',
				client_email: client.email ?? '',
				client_phone: client.phone,
				start_time: start.toISOString(),
				end_time: end.toISOString(),
				status,
				created_at: new Date(start.getTime() - 3 * 86_400_000).toISOString(),
				tag_bd: TAG,
				services: { name: service.name, duration_minutes: service.duration_minutes, price: service.price },
			});
		}
	}
	// Plus récents d'abord, comme la requête réelle
	appointments.sort((a, b) => b.start_time.localeCompare(a.start_time));

	const availabilityRules: AvailabilityRule[] = [
		{ id: 'preview-rule-1', professional_id: PRO_ID, days_of_week: [1, 2, 3, 4, 5], start_time: '08:00', end_time: '12:00', slot_duration_minutes: 60, is_exception: false, exception_date: null, created_at: startOfDay(-120).toISOString(), tag_bd: TAG },
		{ id: 'preview-rule-2', professional_id: PRO_ID, days_of_week: [1, 2, 3, 4, 5], start_time: '14:00', end_time: '18:00', slot_duration_minutes: 60, is_exception: false, exception_date: null, created_at: startOfDay(-120).toISOString(), tag_bd: TAG },
		{ id: 'preview-rule-3', professional_id: PRO_ID, days_of_week: [6], start_time: '09:00', end_time: '13:00', slot_duration_minutes: 60, is_exception: false, exception_date: null, created_at: startOfDay(-120).toISOString(), tag_bd: TAG },
	];

	function messagesFor(clientId: string): Message[] {
		const client = clients.find((c) => c.id === clientId);
		if (!client) return [];
		const first = (client.full_name ?? 'Client').split(' ')[0];
		const base = startOfDay(-2);
		return [
			{ id: `${clientId}-m1`, professional_id: PRO_ID, client_id: clientId, sender: 'client', body: `Bonjour, est-il possible de décaler mon rendez-vous de jeudi ? — ${first}`, created_at: new Date(base.getTime() + 9 * 3_600_000).toISOString(), read_at: new Date(base.getTime() + 10 * 3_600_000).toISOString(), tag_bd: TAG },
			{ id: `${clientId}-m2`, professional_id: PRO_ID, client_id: clientId, sender: 'professional', body: 'Bonjour, oui sans problème : je vous propose vendredi à 10 h 30.', created_at: new Date(base.getTime() + 10.5 * 3_600_000).toISOString(), read_at: new Date(base.getTime() + 11 * 3_600_000).toISOString(), tag_bd: TAG },
			{ id: `${clientId}-m3`, professional_id: PRO_ID, client_id: clientId, sender: 'client', body: 'Parfait, merci beaucoup !', created_at: new Date(base.getTime() + 11.5 * 3_600_000).toISOString(), read_at: new Date(base.getTime() + 12 * 3_600_000).toISOString(), tag_bd: TAG },
		];
	}

	return { professional, services, appointments, availabilityRules, clients, messagesFor };
}

/* ─────────────────────── Standard : dépannage informatique ─────────────────────── */

// Catégories alignées sur celles du formulaire de prestation Standard
// (src/components/standard/dashboard/categories.ts).
const STANDARD_SERVICES: ServiceDef[] = [
	{ name: 'Diagnostic complet', category: 'Diagnostic', duration: 30, price: 39, description: 'Recherche de panne sur ordinateur, tablette ou smartphone.' },
	{ name: 'Remplacement écran smartphone', category: 'Réparation', duration: 60, price: 129, description: "Écran d'origine ou compatible, posé en atelier." },
	{ name: 'Remplacement batterie', category: 'Réparation', duration: 30, price: 49, description: 'Smartphone, tablette ou PC portable.' },
	{ name: 'Ordinateur lent ou bloqué', category: 'Dépannage', duration: 60, price: 59, description: 'Nettoyage des logiciels indésirables et des virus.' },
	{ name: 'Dépannage imprimante', category: 'Dépannage', duration: 45, price: 49, description: 'Connexion, bourrage papier, configuration réseau.' },
	{ name: 'Installation box et Wi-Fi', category: 'Installation', duration: 60, price: 69, description: 'Mise en service et sécurisation du réseau à domicile.' },
	{ name: 'Installation de logiciels', category: 'Installation', duration: 30, price: 39, description: 'Suite bureautique, antivirus, logiciels du quotidien.' },
	{ name: 'Récupération de données', category: 'Données', duration: 90, price: 89, description: 'Disque dur, clé USB ou carte mémoire endommagés.' },
	{ name: 'Transfert vers un nouvel appareil', category: 'Données', duration: 60, price: 59, description: 'Photos, contacts et documents copiés sans perte.' },
];

function buildStandard(): PreviewData {
	const TAG = 'standard';
	const professional: Professional = {
		id: PRO_ID,
		user_id: 'preview-user',
		business_name: 'TechDom',
		activity: 'Dépannage informatique',
		description:
			'Dépannage informatique à domicile et en atelier : ordinateurs, smartphones, tablettes et imprimantes. Entreprise fictive présentée à titre de démonstration.',
		phone: '01 99 88 77 66',
		email: 'contact@techdom.example',
		address: '45 avenue de la République, 75011 Paris',
		logo_url: null,
		avatar_url: null,
		opening_hours: null,
		tag_bd: TAG,
	};
	// Formule sans base de données : pas de clients ni de rendez-vous à afficher.
	return {
		professional,
		services: buildServices(STANDARD_SERVICES, TAG),
		appointments: [],
		availabilityRules: [],
		clients: [],
		messagesFor: () => [],
	};
}

/* ───────────────────────────── Sélection par démo ───────────────────────────── */

const cache: Partial<Record<PreviewDemo, PreviewData>> = {};

function previewDemo(): PreviewDemo {
	const match = typeof window !== 'undefined' ? window.location.pathname.match(PREVIEW_PATH) : null;
	return match?.[1] === 'standard' ? 'standard' : 'premium';
}

/** Données fictives de l'aperçu de la démo courante (construites une fois, puis mises en cache). */
export function getPreviewData(): PreviewData {
	const demo = previewDemo();
	return (cache[demo] ??= demo === 'standard' ? buildStandard() : buildPremium());
}

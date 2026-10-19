import type { Professional, Service, Client, Appointment, AvailabilityRule, Message } from './queries';

/**
 * Mode « aperçu » : les pages /demo-premium/apercu/** affichent le dashboard avec des données
 * fictives générées ici, sans compte, sans base de données et en lecture seule.
 * Les fonctions de lecture de queries.ts renvoient ces données ; les écritures sont refusées.
 */

const PREVIEW_SEGMENT = '/apercu';

export function isPreviewMode(): boolean {
	return typeof window !== 'undefined' && new RegExp(`^/demo-[^/]+${PREVIEW_SEGMENT}(/|$)`).test(window.location.pathname);
}

/** À appeler en tête de chaque fonction d'écriture. */
export function assertNotPreview(): void {
	if (isPreviewMode()) {
		throw new Error("Aperçu en lecture seule : les modifications sont désactivées dans cette démonstration.");
	}
}

const TAG = 'premium';
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

export const previewProfessional: Professional = {
	id: PRO_ID,
	user_id: 'preview-user',
	business_name: 'Arsenal Mécanique',
	activity: 'Garage Automobile',
	description: "Entretien, réparation et diagnostic toutes marques. Atelier fictif présenté à titre de démonstration.",
	phone: '01 23 45 67 89',
	email: 'contact@arsenal-mecanique.example',
	address: '12 rue de l\'Atelier, 75000 Paris',
	logo_url: null,
	avatar_url: null,
	opening_hours: null,
	tag_bd: TAG,
};

const SERVICE_DEFS = [
	{ name: 'Vidange + filtre à huile', category: 'Entretien', duration: 60, price: 89 },
	{ name: 'Remplacement plaquettes de frein', category: 'Freinage', duration: 90, price: 129 },
	{ name: 'Diagnostic électronique', category: 'Diagnostic', duration: 45, price: 59 },
	{ name: 'Montage et équilibrage de pneus', category: 'Pneumatiques', duration: 60, price: 79 },
	{ name: 'Recharge de climatisation', category: 'Confort', duration: 60, price: 99 },
	{ name: 'Courroie de distribution', category: 'Moteur', duration: 240, price: 480 },
	{ name: 'Contrôle pré-contrôle technique', category: 'Contrôle', duration: 45, price: 49 },
	{ name: 'Géométrie / parallélisme', category: 'Pneumatiques', duration: 60, price: 75 },
];

export const previewServices: Service[] = SERVICE_DEFS.map((s, i) => ({
	id: `preview-service-${i + 1}`,
	professional_id: PRO_ID,
	name: s.name,
	category: s.category,
	description: null,
	duration_minutes: s.duration,
	price: s.price,
	is_active: true,
	is_deleted: false,
	image_url: null,
	created_at: startOfDay(-120).toISOString(),
	tag_bd: TAG,
}));

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

export const previewClients: Client[] = CLIENT_NAMES.map(([name, mail], i) => ({
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

function buildAppointments(): (Appointment & { services: { name: string; duration_minutes: number; price: number } | null })[] {
	const rand = rng(20261019);
	const list: (Appointment & { services: { name: string; duration_minutes: number; price: number } | null })[] = [];
	let n = 0;
	// Quatre mois d'historique, jusqu'à dix jours dans le futur
	for (let day = -120; day <= 10; day++) {
		const date = startOfDay(day);
		const weekday = date.getDay();
		if (weekday === 0) continue; // fermé le dimanche
		const count = weekday === 6 ? 1 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 3);
		for (let k = 0; k < count; k++) {
			const service = previewServices[Math.floor(rand() * previewServices.length)];
			const client = previewClients[Math.floor(rand() * previewClients.length)];
			const hour = 8 + Math.floor(rand() * 8);
			const start = new Date(date);
			start.setHours(hour, rand() > 0.5 ? 30 : 0, 0, 0);
			const end = new Date(start.getTime() + service.duration_minutes * 60_000);

			let status: Appointment['status'];
			if (day < 0) status = rand() < 0.08 ? 'cancelled' : 'completed';
			else if (day === 0) status = start.getTime() < Date.now() ? 'completed' : 'confirmed';
			else status = rand() < 0.35 ? 'pending' : 'confirmed';

			n += 1;
			list.push({
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
	return list.sort((a, b) => b.start_time.localeCompare(a.start_time));
}

export const previewAppointments = buildAppointments();

export const previewAvailabilityRules: AvailabilityRule[] = [
	{ id: 'preview-rule-1', professional_id: PRO_ID, days_of_week: [1, 2, 3, 4, 5], start_time: '08:00', end_time: '12:00', slot_duration_minutes: 60, is_exception: false, exception_date: null, created_at: startOfDay(-120).toISOString(), tag_bd: TAG },
	{ id: 'preview-rule-2', professional_id: PRO_ID, days_of_week: [1, 2, 3, 4, 5], start_time: '14:00', end_time: '18:00', slot_duration_minutes: 60, is_exception: false, exception_date: null, created_at: startOfDay(-120).toISOString(), tag_bd: TAG },
	{ id: 'preview-rule-3', professional_id: PRO_ID, days_of_week: [6], start_time: '09:00', end_time: '13:00', slot_duration_minutes: 60, is_exception: false, exception_date: null, created_at: startOfDay(-120).toISOString(), tag_bd: TAG },
];

export function previewMessagesFor(clientId: string): Message[] {
	const client = previewClients.find((c) => c.id === clientId);
	if (!client) return [];
	const first = (client.full_name ?? 'Client').split(' ')[0];
	const base = startOfDay(-2);
	return [
		{ id: `${clientId}-m1`, professional_id: PRO_ID, client_id: clientId, sender: 'client', body: `Bonjour, est-il possible de décaler mon rendez-vous de jeudi ? — ${first}`, created_at: new Date(base.getTime() + 9 * 3_600_000).toISOString(), read_at: new Date(base.getTime() + 10 * 3_600_000).toISOString(), tag_bd: TAG },
		{ id: `${clientId}-m2`, professional_id: PRO_ID, client_id: clientId, sender: 'professional', body: 'Bonjour, oui sans problème : je vous propose vendredi à 10 h 30.', created_at: new Date(base.getTime() + 10.5 * 3_600_000).toISOString(), read_at: new Date(base.getTime() + 11 * 3_600_000).toISOString(), tag_bd: TAG },
		{ id: `${clientId}-m3`, professional_id: PRO_ID, client_id: clientId, sender: 'client', body: 'Parfait, merci beaucoup !', created_at: new Date(base.getTime() + 11.5 * 3_600_000).toISOString(), read_at: new Date(base.getTime() + 12 * 3_600_000).toISOString(), tag_bd: TAG },
	];
}

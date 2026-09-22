import type { Appointment, Client } from './queries';

export type AppointmentWithService = Appointment & {
	services: { name: string; duration_minutes: number; price: number } | null;
};

export const DEMO_DIAMANT_CLIENTS: (Client & { email?: string })[] = [
	{
		id: 'demo-client-123',
		full_name: 'Victoria Belmont',
		phone: '06 12 34 56 78',
		email: 'victoria.b@email.com',
		avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria%20Belmont&backgroundColor=f08080,f8ad9d,ffdab9',
		created_at: new Date(Date.now() - 320 * 86400000).toISOString(),
		tag_bd: 'diamant'
	},
	{
		id: 'demo-client-101',
		full_name: 'Sophie Martin',
		phone: '06 23 45 67 89',
		email: 'sophie.martin@demo.fr',
		avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie&backgroundColor=f08080,f8ad9d,ffdab9',
		created_at: new Date(Date.now() - 280 * 86400000).toISOString(),
		tag_bd: 'diamant'
	},
	{
		id: 'demo-client-102',
		full_name: 'Camille Bernard',
		phone: '06 34 56 78 90',
		email: 'camille.b@demo.fr',
		avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Camille&backgroundColor=f08080,f8ad9d,ffdab9',
		created_at: new Date(Date.now() - 210 * 86400000).toISOString(),
		tag_bd: 'diamant'
	},
	{
		id: 'demo-client-103',
		full_name: 'Lucas Moreau',
		phone: '07 45 67 89 01',
		email: 'lucas.moreau@demo.fr',
		avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=f08080,f8ad9d,ffdab9',
		created_at: new Date(Date.now() - 170 * 86400000).toISOString(),
		tag_bd: 'diamant'
	},
	{
		id: 'demo-client-104',
		full_name: 'Emma Petit',
		phone: '06 56 78 90 12',
		email: 'emma.petit@demo.fr',
		avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=f08080,f8ad9d,ffdab9',
		created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
		tag_bd: 'diamant'
	},
	{
		id: 'demo-client-105',
		full_name: 'Jade Lefebvre',
		phone: '06 67 89 01 23',
		email: 'jade.lefebvre@demo.fr',
		avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jade&backgroundColor=f08080,f8ad9d,ffdab9',
		created_at: new Date(Date.now() - 85 * 86400000).toISOString(),
		tag_bd: 'diamant'
	},
	{
		id: 'demo-client-106',
		full_name: 'Nathan Rousseau',
		phone: '07 78 90 12 34',
		email: 'nathan.rousseau@demo.fr',
		avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nathan&backgroundColor=f08080,f8ad9d,ffdab9',
		created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
		tag_bd: 'diamant'
	},
	{
		id: 'demo-client-107',
		full_name: 'Élodie Fontaine',
		phone: '06 89 01 23 45',
		email: 'elodie.f@demo.fr',
		avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elodie&backgroundColor=f08080,f8ad9d,ffdab9',
		created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
		tag_bd: 'diamant'
	},
	{
		id: 'demo-client-108',
		full_name: 'Clara Delacroix',
		phone: '06 90 12 34 56',
		email: 'clara.delacroix@demo.fr',
		avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Clara&backgroundColor=f08080,f8ad9d,ffdab9',
		created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
		tag_bd: 'diamant'
	},
	{
		id: 'demo-client-109',
		full_name: 'Alexandre Dumas',
		phone: '07 01 23 45 67',
		email: 'alex.dumas@demo.fr',
		avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alexandre&backgroundColor=f08080,f8ad9d,ffdab9',
		created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
		tag_bd: 'diamant'
	}
];

const SERVICES_CATALOG = [
	{ id: 'srv-balayage', name: 'Balayage Signature', price: 90, duration_minutes: 120 },
	{ id: 'srv-coupe-f', name: 'Coupe femme', price: 45, duration_minutes: 45 },
	{ id: 'srv-lissage', name: 'Lissage brésilien', price: 180, duration_minutes: 150 },
	{ id: 'srv-coloration', name: 'Coloration complète', price: 75, duration_minutes: 90 },
	{ id: 'srv-soin', name: 'Soin profond Kératine', price: 55, duration_minutes: 40 },
	{ id: 'srv-coupe-h', name: 'Coupe homme & Barbe Soin', price: 38, duration_minutes: 35 },
	{ id: 'srv-brushing', name: 'Brushing Couture', price: 32, duration_minutes: 30 },
	{ id: 'srv-chignon', name: 'Chignon de Cérémonie', price: 70, duration_minutes: 60 }
];

/**
 * Génère 75 rendez-vous réalistes étalés sur les 365 derniers jours (dont cette semaine et ce mois-ci).
 */
export function generateDiamantDemoAppointments(): AppointmentWithService[] {
	const appointments: AppointmentWithService[] = [];
	const proId = 'eff1f7ef-33ee-49a2-9e4f-52ab675a4dc7';
	const now = Date.now();

	// Répartition réaliste des rendez-vous par jour dans le passé
	// Beaucoup de rendez-vous sur les 7 derniers jours, le dernier mois, et tout au long de l'année
	const daysAgoList = [
		// 7 derniers jours (récent)
		1, 2, 2, 3, 4, 5, 5, 6, 7,
		// 8 à 30 jours (ce mois-ci)
		8, 10, 11, 13, 14, 16, 17, 18, 20, 21, 23, 25, 26, 28, 29, 30,
		// 1 à 3 mois
		35, 38, 42, 45, 48, 52, 55, 60, 65, 70, 75, 80, 85, 90,
		// 3 à 6 mois
		98, 105, 112, 120, 130, 140, 150, 160, 170, 180,
		// 6 à 9 mois
		190, 200, 215, 225, 240, 250, 260, 270,
		// 9 à 12 mois
		280, 295, 305, 315, 325, 335, 345, 355, 360
	];

	daysAgoList.forEach((daysAgo, idx) => {
		const client = DEMO_DIAMANT_CLIENTS[idx % DEMO_DIAMANT_CLIENTS.length];
		const srv = SERVICES_CATALOG[idx % SERVICES_CATALOG.length];

		const date = new Date(now - daysAgo * 86400000);
		// Heures typiques de salon : 9h, 11h, 14h, 16h
		const hour = 9 + ((idx * 2) % 9);
		date.setHours(hour, (idx % 2 === 0 ? 0 : 30), 0, 0);

		const endDate = new Date(date.getTime() + srv.duration_minutes * 60000);

		appointments.push({
			id: `demo-app-${idx + 1}`,
			professional_id: proId,
			service_id: srv.id,
			availability_id: null as any,
			client_id: client.id,
			client_name: client.full_name,
			client_email: client.email || 'client@demo.fr',
			client_phone: client.phone || '06 00 00 00 00',
			start_time: date.toISOString(),
			end_time: endDate.toISOString(),
			status: 'completed',
			created_at: date.toISOString(),
			tag_bd: 'diamant',
			services: {
				name: srv.name,
				duration_minutes: srv.duration_minutes,
				price: srv.price
			}
		});
	});

	// Trier par ordre chronologique
	return appointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

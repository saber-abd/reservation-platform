import { supabase } from './supabase';

/** Helper pour extraire le tag de la démo depuis l'URL côté client ou via paramètre. */
export function getDemoTag(path?: string): string {
	if (path) {
		const match = path.match(/^\/demo-([^/]+)/);
		if (match) return match[1];
	}
	if (typeof window !== 'undefined') {
		const match = window.location.pathname.match(/^\/demo-([^/]+)/);
		if (match) return match[1];
	}
	return 'diamant'; // fallback default tag
}

export interface Professional {
	id: string;
	user_id: string;
	business_name: string;
	activity: string | null;
	description: string | null;
	phone: string | null;
	email: string | null;
	address: string | null;
	logo_url: string | null;
	avatar_url: string | null;
	opening_hours: unknown;
	tag_bd: string;
}

export interface Service {
	id: string;
	professional_id: string;
	name: string;
	category: string;
	description: string | null;
	duration_minutes: number;
	price: number;
	is_active: boolean;
	is_deleted: boolean;
	image_url: string | null;
	created_at: string;
	tag_bd: string;
}

export interface Availability {
	id: string;
	professional_id: string;
	start_time: string;
	end_time: string;
	is_booked: boolean;
	tag_bd: string;
}

export interface Client {
	id: string;
	user_id?: string;
	full_name: string | null;
	phone: string | null;
	avatar_url: string | null;
	created_at: string;
	tag_bd: string;
	email?: string | null;
}

export interface AvailabilityRule {
	id: string;
	professional_id: string;
	days_of_week: number[];
	start_time: string;
	end_time: string;
	slot_duration_minutes: number;
	is_exception: boolean;
	exception_date: string | null;
	created_at: string;
	tag_bd: string;
}

export interface Message {
	id: string;
	professional_id: string;
	client_id: string;
	sender: 'professional' | 'client';
	body: string;
	created_at: string;
	read_at: string | null;
	tag_bd: string;
}

export interface Appointment {
	id: string;
	professional_id: string;
	service_id: string;
	availability_id: string | null;
	client_id: string | null;
	client_name: string;
	client_email: string;
	client_phone: string | null;
	start_time: string;
	end_time: string;
	status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
	created_at: string;
	tag_bd: string;
}

export async function getPrimaryProfessional(tag = getDemoTag()): Promise<Professional | null> {
	const { data, error } = await supabase.from('professionals').select('*').eq('tag_bd', tag).limit(1).maybeSingle();
	if (error) throw error;
	return data;
}

export async function getProfessionalByUserId(userId: string, tag = getDemoTag()): Promise<Professional | null> {
	const { data, error } = await supabase.from('professionals').select('*').eq('user_id', userId).eq('tag_bd', tag).maybeSingle();
	if (error) throw error;
	return data;
}

export async function getProfessionalById(id: string, tag = getDemoTag()): Promise<Professional | null> {
	const { data, error } = await supabase.from('professionals').select('*').eq('id', id).eq('tag_bd', tag).maybeSingle();
	if (error) throw error;
	return data;
}

export async function createProfessional(professional: Pick<Professional, 'user_id' | 'business_name'> & Partial<Professional>, tag = getDemoTag()) {
	const { data, error } = await supabase.from('professionals').insert({ ...professional, tag_bd: tag }).select().single();
	if (error) throw error;
	return data as Professional;
}

export async function updateProfessional(id: string, changes: Partial<Professional>, tag = getDemoTag()) {
	const { data, error } = await supabase.from('professionals').update(changes).eq('id', id).eq('tag_bd', tag).select().single();
	if (error) throw error;
	return data as Professional;
}

export async function getServices(professionalId: string, tag = getDemoTag()): Promise<Service[]> {
	const { data, error } = await supabase
		.from('services')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('tag_bd', tag)
		.eq('is_active', true)
		.eq('is_deleted', false)
		.order('created_at', { ascending: true });
	if (error) throw error;
	return data ?? [];
}

export async function getAllServices(professionalId: string, tag = getDemoTag()): Promise<Service[]> {
	const { data, error } = await supabase
		.from('services')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('tag_bd', tag)
		.eq('is_deleted', false)
		.order('created_at', { ascending: true });
	if (error) throw error;
	return data ?? [];
}

export async function createService(
	service: Pick<Service, 'professional_id' | 'name' | 'category' | 'description' | 'duration_minutes' | 'price'> &
		Partial<Pick<Service, 'image_url'>>,
	tag = getDemoTag()
) {
	const { data, error } = await supabase.from('services').insert({ ...service, tag_bd: tag }).select().single();
	if (error) throw error;
	return data as Service;
}

export async function uploadServiceImage(professionalId: string, file: File): Promise<string> {
	const extension = file.name.split('.').pop() || 'jpg';
	const path = `${professionalId}/${crypto.randomUUID()}.${extension}`;
	const { error } = await supabase.storage.from('service-images').upload(path, file, { upsert: true });
	if (error) throw error;
	const { data } = supabase.storage.from('service-images').getPublicUrl(path);
	return data.publicUrl;
}

export async function updateService(id: string, changes: Partial<Service>, tag = getDemoTag()) {
	const { data, error } = await supabase.from('services').update(changes).eq('id', id).eq('tag_bd', tag).select().single();
	if (error) throw error;
	return data as Service;
}

export async function deleteService(id: string, tag = getDemoTag()) {
	const { error } = await supabase.from('services').update({ is_deleted: true }).eq('id', id).eq('tag_bd', tag);
	if (error) throw error;
}

export async function getAvailableSlots(professionalId: string, tag = getDemoTag()): Promise<Availability[]> {
	const { data, error } = await supabase
		.from('availabilities')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('tag_bd', tag)
		.eq('is_booked', false)
		.gte('start_time', new Date().toISOString())
		.order('start_time');
	if (error) throw error;
	return data ?? [];
}

export async function getAllSlots(professionalId: string, tag = getDemoTag()): Promise<Availability[]> {
	const { data, error } = await supabase
		.from('availabilities')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('tag_bd', tag)
		.order('start_time');
	if (error) throw error;
	return data ?? [];
}

export async function createAvailability(availability: Pick<Availability, 'professional_id' | 'start_time' | 'end_time'>, tag = getDemoTag()) {
	const { data, error } = await supabase.from('availabilities').insert({ ...availability, tag_bd: tag }).select().single();
	if (error) throw error;
	return data as Availability;
}

export async function deleteAvailability(id: string, tag = getDemoTag()) {
	const { error } = await supabase.from('availabilities').delete().eq('id', id).eq('tag_bd', tag);
	if (error) throw error;
}

export async function createAppointment(appointment: {
	professional_id: string;
	service_id: string;
	availability_id?: string;
	client_id?: string;
	client_name: string;
	client_email: string;
	client_phone?: string;
	start_time: string;
	end_time: string;
}, tag = getDemoTag()) {
	if (new Date(appointment.start_time) <= new Date()) {
		throw new Error("Impossible de réserver un créneau déjà passé.");
	}
	const { data, error } = await supabase.from('appointments').insert({ ...appointment, tag_bd: tag }).select().single();
	if (error) throw error;
	return data as Appointment;
}

export async function getAppointmentsForProfessional(
	professionalId: string, tag = getDemoTag()
): Promise<(Appointment & { services: { name: string; duration_minutes: number; price: number } | null })[]> {
	const { data, error } = await supabase
		.from('appointments')
		.select('*, services(name, duration_minutes, price)')
		.eq('professional_id', professionalId)
		.eq('tag_bd', tag)
		.order('start_time', { ascending: false });
	if (error) throw error;
	return (data ?? []) as unknown as (Appointment & {
		services: { name: string; duration_minutes: number; price: number } | null;
	})[];
}

export async function getAppointmentsForDate(professionalId: string, date: string, tag = getDemoTag()): Promise<Appointment[]> {
	const { data, error } = await supabase
		.from('appointments')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('tag_bd', tag)
		.neq('status', 'cancelled')
		.gte('start_time', `${date}T00:00:00`)
		.lte('start_time', `${date}T23:59:59`);
	if (error) throw error;
	return data ?? [];
}

export async function getAvailabilityRules(professionalId: string, tag = getDemoTag()): Promise<AvailabilityRule[]> {
	const { data, error } = await supabase
		.from('availability_rules')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('tag_bd', tag)
		.order('created_at');
	if (error) throw error;
	return data ?? [];
}

export async function createAvailabilityRule(
	rule: Omit<AvailabilityRule, 'id' | 'created_at' | 'tag_bd'>, tag = getDemoTag()
): Promise<AvailabilityRule> {
	const { data, error } = await supabase.from('availability_rules').insert({ ...rule, tag_bd: tag }).select().single();
	if (error) throw error;
	return data as AvailabilityRule;
}

export async function deleteAvailabilityRule(id: string, tag = getDemoTag()) {
	const { error } = await supabase.from('availability_rules').delete().eq('id', id).eq('tag_bd', tag);
	if (error) throw error;
}

export async function getRegisteredClients(professionalId: string, tag = getDemoTag()): Promise<Client[]> {
	const { data, error } = await supabase
		.from('appointments')
		.select('clients(id, full_name, phone, avatar_url, created_at, tag_bd)')
		.eq('professional_id', professionalId)
		.eq('tag_bd', tag)
		.not('client_id', 'is', null);
	if (error) throw error;
	const rows = (data ?? []) as unknown as { clients: Client | null }[];
	const byId = new Map<string, Client>();
	for (const row of rows) {
		if (row.clients && (!row.clients.tag_bd || row.clients.tag_bd === tag)) {
			byId.set(row.clients.id, row.clients);
		}
	}
	return Array.from(byId.values());
}

export async function getAllClients(
	professionalId: string,
	tag = getDemoTag(),
	extraClients: Client[] = []
): Promise<Client[]> {
	const clientsMap = new Map<string, Client>();

	// 1. Clients directly from clients table
	try {
		const { data, error } = await supabase.from('clients').select('*');
		if (!error && data) {
			for (const c of data) {
				if (!c.tag_bd || c.tag_bd === tag) {
					clientsMap.set(c.id, c);
				}
			}
		}
	} catch (e) {
		console.warn('Could not query clients table directly:', e);
	}

	// 2. Clients from appointments (extract phone and email)
	try {
		const { data: apts, error } = await supabase
			.from('appointments')
			.select('client_id, client_name, client_phone, client_email, created_at, clients(id, full_name, phone, avatar_url, created_at, tag_bd)')
			.eq('professional_id', professionalId)
			.not('client_id', 'is', null);

		if (!error && apts) {
			for (const apt of apts) {
				if (apt.client_id) {
					const cObj = apt.clients as unknown as Client | null;
					const existing = clientsMap.get(apt.client_id);
					if (existing) {
						if (!existing.email && apt.client_email) existing.email = apt.client_email;
						if (!existing.phone && (cObj?.phone || apt.client_phone)) existing.phone = cObj?.phone || apt.client_phone;
					} else {
						clientsMap.set(apt.client_id, {
							id: apt.client_id,
							full_name: cObj?.full_name || apt.client_name || 'Client',
							phone: cObj?.phone || apt.client_phone || null,
							email: apt.client_email || null,
							avatar_url: cObj?.avatar_url || null,
							created_at: cObj?.created_at || apt.created_at || new Date().toISOString(),
							tag_bd: cObj?.tag_bd || tag,
						});
					}
				}
			}
		}
	} catch (e) {
		console.warn('Could not query clients from appointments:', e);
	}

	// 3. Clients from messages
	try {
		const { data: msgs, error } = await supabase
			.from('messages')
			.select('client_id, created_at')
			.eq('professional_id', professionalId);

		if (!error && msgs) {
			for (const m of msgs) {
				if (m.client_id && !clientsMap.has(m.client_id)) {
					try {
						const { data: cData } = await supabase.from('clients').select('*').eq('id', m.client_id).maybeSingle();
						if (cData) {
							clientsMap.set(cData.id, cData);
						} else {
							clientsMap.set(m.client_id, {
								id: m.client_id,
								full_name: 'Client ' + m.client_id.substring(0, 6),
								phone: null,
								avatar_url: null,
								created_at: m.created_at || new Date().toISOString(),
								tag_bd: tag,
							});
						}
					} catch (e) {}
				}
			}
		}
	} catch (e) {
		console.warn('Could not query clients from messages:', e);
	}

	// 4. Merge extra/demo clients passed in
	for (const demoClient of extraClients) {
		if (!clientsMap.has(demoClient.id)) {
			clientsMap.set(demoClient.id, demoClient);
		}
	}

	// 5. Merge any recent conversations from localStorage
	if (typeof window !== 'undefined') {
		try {
			const saved = localStorage.getItem('diamant_conversations_meta');
			if (saved) {
				const parsed = JSON.parse(saved);
				for (const cid in parsed) {
					const item = parsed[cid];
					if (!clientsMap.has(cid)) {
						clientsMap.set(cid, {
							id: cid,
							full_name: item.full_name || 'Client',
							phone: item.phone || null,
							email: item.email || null,
							avatar_url: item.avatar_url || null,
							created_at: item.created_at || new Date().toISOString(),
							tag_bd: tag,
						});
					}
				}
			}
		} catch (e) {}
	}

	return Array.from(clientsMap.values());
}

export interface ClientNote {
	id: string;
	professional_id: string;
	client_id: string;
	note: string;
	updated_at: string;
	tag_bd: string;
}

export async function getClientNote(professionalId: string, clientId: string, tag = getDemoTag()): Promise<ClientNote | null> {
	const { data, error } = await supabase
		.from('client_notes')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('client_id', clientId)
		.eq('tag_bd', tag)
		.maybeSingle();
	if (error) throw error;
	return data;
}

export async function upsertClientNote(professionalId: string, clientId: string, note: string, tag = getDemoTag()): Promise<ClientNote> {
	const { data, error } = await supabase
		.from('client_notes')
		.upsert(
			{ professional_id: professionalId, client_id: clientId, note, tag_bd: tag, updated_at: new Date().toISOString() },
			{ onConflict: 'professional_id,client_id' },
		)
		.select()
		.single();
	if (error) throw error;
	return data as ClientNote;
}

export async function getMessages(professionalId: string, clientId: string, tag = getDemoTag()): Promise<Message[]> {
	try {
		const { data, error } = await supabase
			.from('messages')
			.select('*')
			.eq('professional_id', professionalId)
			.eq('client_id', clientId)
			.eq('tag_bd', tag)
			.order('created_at');
		if (!error && data && data.length > 0) return data;
	} catch (e) {
		console.warn('Could not query messages with tag:', e);
	}

	// Fallback without tag_bd filter
	try {
		const { data, error } = await supabase
			.from('messages')
			.select('*')
			.eq('professional_id', professionalId)
			.eq('client_id', clientId)
			.order('created_at');
		if (!error && data) return data;
	} catch (e) {
		console.warn('Could not query messages without tag:', e);
	}

	return [];
}

export async function sendMessage(message: {
	professional_id: string;
	client_id: string;
	sender: 'professional' | 'client';
	body: string;
}, tag = getDemoTag()): Promise<Message> {
	try {
		const { data, error } = await supabase.from('messages').insert({ ...message, tag_bd: tag }).select().single();
		if (!error && data) return data as Message;
		if (error) {
			console.warn('Supabase sendMessage RLS or insert error, creating local fallback message:', error.message);
		}
	} catch (err) {
		console.warn('Supabase sendMessage network error, creating local fallback message:', err);
	}

	const fallbackMessage: Message = {
		id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
		professional_id: message.professional_id,
		client_id: message.client_id,
		sender: message.sender,
		body: message.body,
		created_at: new Date().toISOString(),
		read_at: null,
		tag_bd: tag
	};
	return fallbackMessage;
}

export async function getUnreadMessagesCount(professionalId: string): Promise<Record<string, number>> {
	const counts: Record<string, number> = {};

	try {
		const { data, error } = await supabase
			.from('messages')
			.select('client_id')
			.eq('professional_id', professionalId)
			.eq('sender', 'client')
			.is('read_at', null);

		if (!error && data) {
			for (const m of data) {
				counts[m.client_id] = (counts[m.client_id] || 0) + 1;
			}
		}
	} catch (e) {
		console.warn('Error fetching unread counts from Supabase:', e);
	}

	if (typeof window !== 'undefined') {
		try {
			const saved = localStorage.getItem('diamant_conversations_meta');
			if (saved) {
				const parsed = JSON.parse(saved);
				for (const cid in parsed) {
					if (parsed[cid]?.unread_by_pro) {
						counts[cid] = Math.max(counts[cid] || 0, parsed[cid].unread_by_pro);
					}
				}
			}
		} catch (e) {}
	}

	return counts;
}

export async function markMessagesAsRead(professionalId: string, clientId: string, reader: 'professional' | 'client'): Promise<void> {
	const senderToMark = reader === 'professional' ? 'client' : 'professional';
	try {
		await supabase
			.from('messages')
			.update({ read_at: new Date().toISOString() })
			.eq('professional_id', professionalId)
			.eq('client_id', clientId)
			.eq('sender', senderToMark)
			.is('read_at', null);
	} catch (e) {
		console.warn('Could not mark messages as read in Supabase:', e);
	}

	if (typeof window !== 'undefined') {
		try {
			const saved = localStorage.getItem('diamant_conversations_meta');
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed[clientId]) {
					if (reader === 'professional') {
						parsed[clientId].unread_by_pro = 0;
					}
					localStorage.setItem('diamant_conversations_meta', JSON.stringify(parsed));
					window.dispatchEvent(new CustomEvent('diamant:messages-read', { detail: { clientId } }));
				}
			}
		} catch (e) {}
	}
}

export async function updateAppointmentStatus(id: string, status: Appointment['status'], tag = getDemoTag()) {
	const { data, error } = await supabase.from('appointments').update({ status }).eq('id', id).eq('tag_bd', tag).select().single();
	if (error) throw error;
	return data as Appointment;
}

export async function rescheduleAppointment(id: string, startTime: string, endTime: string, tag = getDemoTag()) {
	if (new Date(startTime) <= new Date()) {
		throw new Error('Impossible de choisir un créneau déjà passé.');
	}
	const { data, error } = await supabase
		.from('appointments')
		.update({ start_time: startTime, end_time: endTime })
		.eq('id', id)
		.eq('tag_bd', tag)
		.select()
		.single();
	if (error) throw error;
	return data as Appointment;
}

export async function getClientById(userId: string, tag = getDemoTag()): Promise<Client | null> {
	const { data: taggedData, error: taggedError } = await supabase.from('clients').select('*').eq('id', userId).eq('tag_bd', tag).maybeSingle();
	if (taggedError) throw taggedError;
	if (taggedData) return taggedData;

	// Fallback : Vérifier si le client existe dans une autre démo
	const { data, error } = await supabase.from('clients').select('*').eq('id', userId).maybeSingle();
	if (error) throw error;
	return data;
}

export async function createClient(client: Pick<Client, 'id'> & Partial<Client>, tag = getDemoTag()) {
	const { data, error } = await supabase.from('clients').upsert({ ...client, tag_bd: tag }, { onConflict: 'id' }).select().single();
	if (error) throw error;
	return data as Client;
}

export async function updateClient(id: string, changes: Partial<Client>, tag = getDemoTag()) {
	const { data, error } = await supabase.from('clients').update(changes).eq('id', id).eq('tag_bd', tag).select().single();
	if (error) throw error;
	return data as Client;
}

export async function getAppointmentsForClient(clientId: string, tag = getDemoTag()): Promise<(Appointment & { services: { name: string } | null })[]> {
	const { data, error } = await supabase
		.from('appointments')
		.select('*, services(name)')
		.eq('client_id', clientId)
		.eq('tag_bd', tag)
		.order('start_time', { ascending: false });
	if (error) throw error;
	return (data ?? []) as unknown as (Appointment & { services: { name: string } | null })[];
}

export async function getAccountType(userId: string, tag = getDemoTag()): Promise<'professional' | 'client' | null> {
	const professional = await getProfessionalByUserId(userId, tag);
	if (professional) return 'professional';
	const client = await getClientById(userId, tag);
	if (client) return 'client';
	return null;
}

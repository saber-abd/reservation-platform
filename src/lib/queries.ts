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
		const stored = sessionStorage.getItem('oauth_demo_redirect') || localStorage.getItem('preferred_demo');
		if (stored) {
			const m = stored.match(/^\/demo-([^/]+)/);
			if (m) return m[1];
		}
	}
	return 'diamant'; // fallback default tag
}

/**
 * Vérifie si un client appartient à une démo spécifique.
 * Gère le multi-taggage séparé par des virgules (ex: 'diamant,premium').
 * Pour rétrocompatibilité : si tag_bd est absent ou vide, il est considéré comme 'diamant'.
 */
export function hasDemoTag(tagBd: string | null | undefined, tag: string): boolean {
	if (!tagBd || !tagBd.trim()) {
		return tag.toLowerCase() === 'diamant';
	}
	const list = tagBd.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
	return list.includes(tag.toLowerCase()) || list.includes('*') || list.includes('all');
}

/**
 * Ajoute un tag de démo à une liste de tags existante sans doublon.
 * Permet à un même utilisateur d'appartenir à plusieurs démos sans écraser ses inscriptions.
 */
export function addDemoTag(existingTags: string | null | undefined, newTag: string): string {
	const cleanNew = newTag.trim().toLowerCase();
	if (!existingTags || !existingTags.trim()) return cleanNew;
	const list = existingTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
	if (!list.includes(cleanNew)) {
		list.push(cleanNew);
	}
	return list.join(',');
}

/**
 * Renvoie le tableau des tags de démo pour un client donné.
 */
export function getClientDemoTags(tagBd: string | null | undefined): string[] {
	if (!tagBd || !tagBd.trim()) return ['diamant'];
	return tagBd.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
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
	is_banned?: boolean;
	ban?: string;
	ban_reason?: string | null;
	banned_at?: string | null;
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
		if (row.clients && hasDemoTag(row.clients.tag_bd, tag)) {
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

	// 1. Clients directly from clients table (filtrés strictement pour cette démo)
	try {
		const { data, error } = await supabase.from('clients').select('*');
		if (!error && data) {
			for (const c of data) {
				if (hasDemoTag(c.tag_bd, tag)) {
					clientsMap.set(c.id, {
						...c,
						email: c.email || null,
						is_banned: c.is_banned === true || c.ban === 'oui',
						ban: c.ban || (c.is_banned ? 'oui' : 'non'),
						ban_reason: c.ban_reason || null,
						banned_at: c.banned_at || null
					});
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
			.eq('tag_bd', tag)
			.not('client_id', 'is', null);

		if (!error && apts) {
			for (const apt of apts) {
				if (apt.client_id) {
					const cObj = apt.clients as unknown as Client | null;
					if (cObj && !hasDemoTag(cObj.tag_bd, tag)) {
						continue; // Ne pas inclure de client d'une autre démo
					}
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
			.eq('professional_id', professionalId)
			.eq('tag_bd', tag);

		if (!error && msgs) {
			for (const m of msgs) {
				if (m.client_id && !clientsMap.has(m.client_id)) {
					try {
						const { data: cData } = await supabase.from('clients').select('*').eq('id', m.client_id).maybeSingle();
						if (cData && hasDemoTag(cData.tag_bd, tag)) {
							clientsMap.set(cData.id, cData);
						}
					} catch (e) {}
				}
			}
		}
	} catch (e) {
		console.warn('Could not query clients from messages:', e);
	}

	// 4. Merge extra/demo clients passed in (filtrés strictement pour cette démo)
	for (const demoClient of extraClients) {
		if (hasDemoTag(demoClient.tag_bd, tag) && !clientsMap.has(demoClient.id)) {
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

	// 6. Apply local client overrides (modifications by pro)
	if (typeof window !== 'undefined') {
		try {
			const overrides = getClientOverrides();
			for (const cid in overrides) {
				const ov = overrides[cid];
				if (clientsMap.has(cid)) {
					const existing = clientsMap.get(cid)!;
					clientsMap.set(cid, {
						...existing,
						...(ov.full_name !== undefined ? { full_name: ov.full_name } : {}),
						...(ov.phone !== undefined ? { phone: ov.phone } : {}),
						...(ov.email !== undefined ? { email: ov.email } : {}),
						...(ov.avatar_url !== undefined ? { avatar_url: ov.avatar_url } : {})
					});
				}
			}
		} catch (e) {}
	}

	// 7. Merge cached client emails from auth/login
	if (typeof window !== 'undefined') {
		try {
			const emailsMap = JSON.parse(localStorage.getItem('diamant_client_emails') || '{}');
			for (const cid in emailsMap) {
				const em = emailsMap[cid];
				if (em && clientsMap.has(cid)) {
					const existing = clientsMap.get(cid)!;
					if (!existing.email) {
						existing.email = em;
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

export async function getClientById(userId: string, tag?: string): Promise<Client | null> {
	const { data, error } = await supabase.from('clients').select('*').eq('id', userId).maybeSingle();
	if (error) throw error;
	if (!data) return null;
	const client = data as Client;
	if (tag && !hasDemoTag(client.tag_bd, tag)) {
		return null;
	}
	return client;
}

/**
 * Enrôle un client dans une démo spécifique sans écraser ses inscriptions précédentes.
 * Met à jour le tag_bd en mode multi-démos (ex: 'diamant' + 'premium' -> 'diamant,premium').
 */
export async function enrollClientInDemo(
	userId: string,
	tag = getDemoTag(),
	metadata?: { full_name?: string | null; email?: string | null; avatar_url?: string | null; phone?: string | null }
): Promise<Client> {
	// 1. Récupérer le client existant (si déjà présent en BDD)
	let existing: Client | null = null;
	try {
		const { data } = await supabase.from('clients').select('*').eq('id', userId).maybeSingle();
		if (data) existing = data as Client;
	} catch (e) {
		console.warn('Could not check existing client before enrollment:', e);
	}

	// Si le compte est marqué comme banni en BDD, refuser immédiatement l'inscription / connexion
	if (existing && (existing.is_banned === true || existing.ban === 'oui')) {
		throw new Error(`Ce compte a été suspendu par l'établissement : ${existing.ban_reason || 'Accès restreint par l’administrateur.'}`);
	}

	const mergedTag = addDemoTag(existing?.tag_bd, tag);
	const fullName = metadata?.full_name || existing?.full_name || 'Client';
	const email = metadata?.email || existing?.email || null;
	const avatarUrl = metadata?.avatar_url || existing?.avatar_url || null;
	const phone = metadata?.phone || existing?.phone || null;

	// Cache de l'email en local
	if (email && typeof window !== 'undefined') {
		try {
			const map = JSON.parse(localStorage.getItem('diamant_client_emails') || '{}');
			map[userId] = email;
			localStorage.setItem('diamant_client_emails', JSON.stringify(map));
		} catch (e) {}
	}

	// 2. Upsert dans Supabase (avec gestion de repli si la colonne email n'est pas encore migrée)
	let savedClient: Client | null = null;
	try {
		const { data, error } = await supabase
			.from('clients')
			.upsert(
				{
					id: userId,
					full_name: fullName,
					email: email,
					avatar_url: avatarUrl,
					phone: phone,
					tag_bd: mergedTag
				},
				{ onConflict: 'id' }
			)
			.select()
			.single();

		if (!error && data) {
			savedClient = data as Client;
		}
	} catch (err) {
		// Repli sans la colonne email si absente
		try {
			const { data, error } = await supabase
				.from('clients')
				.upsert(
					{
						id: userId,
						full_name: fullName,
						avatar_url: avatarUrl,
						phone: phone,
						tag_bd: mergedTag
					},
					{ onConflict: 'id' }
				)
				.select()
				.single();

			if (!error && data) {
				savedClient = { ...(data as Client), email };
			}
		} catch (fallbackErr) {
			console.warn('Could not upsert client into Supabase:', fallbackErr);
		}
	}

	const finalClient: Client = savedClient || {
		id: userId,
		full_name: fullName,
		email: email,
		avatar_url: avatarUrl,
		phone: phone,
		tag_bd: mergedTag,
		created_at: existing?.created_at || new Date().toISOString()
	};

	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('diamant:client-updated', { detail: { client: finalClient } }));
	}

	return finalClient;
}

export async function createClient(client: Pick<Client, 'id'> & Partial<Client>, tag = getDemoTag()): Promise<Client> {
	return enrollClientInDemo(client.id, tag, client);
}

export function getClientOverrides(): Record<string, Partial<Client>> {
	if (typeof window === 'undefined') return {};
	try {
		const raw = localStorage.getItem('diamant_clients_overrides');
		return raw ? JSON.parse(raw) : {};
	} catch (e) {
		return {};
	}
}

export function saveClientOverride(clientId: string, changes: Partial<Client>): void {
	if (typeof window === 'undefined') return;
	try {
		const overrides = getClientOverrides();
		overrides[clientId] = {
			...(overrides[clientId] || {}),
			...changes
		};
		localStorage.setItem('diamant_clients_overrides', JSON.stringify(overrides));
	} catch (e) {}
}

export async function updateClient(id: string, changes: Partial<Client>, tag = getDemoTag()): Promise<Client> {
	// 1. Sauvegarder immédiatement les surcharges locales pour persistance instantanée
	saveClientOverride(id, changes);

	// Mettre à jour les métadonnées de conversation si existantes
	if (typeof window !== 'undefined') {
		try {
			const metaRaw = localStorage.getItem('diamant_conversations_meta');
			if (metaRaw) {
				const meta = JSON.parse(metaRaw);
				if (meta[id]) {
					if (changes.full_name !== undefined) meta[id].full_name = changes.full_name;
					if (changes.phone !== undefined) meta[id].phone = changes.phone;
					if (changes.email !== undefined) meta[id].email = changes.email;
					localStorage.setItem('diamant_conversations_meta', JSON.stringify(meta));
				}
			}
		} catch (e) {}
	}

	// 2. Tenter la mise à jour dans la table clients de Supabase
	let updated: Client | null = null;
	try {
		const { data, error } = await supabase
			.from('clients')
			.update({
				...(changes.full_name !== undefined ? { full_name: changes.full_name } : {}),
				...(changes.phone !== undefined ? { phone: changes.phone } : {}),
			})
			.eq('id', id)
			.select()
			.maybeSingle();

		if (!error && data) {
			updated = {
				...data,
				email: changes.email !== undefined ? changes.email : (data as any).email
			};
		}
	} catch (e) {
		console.warn('Could not update client table in Supabase:', e);
	}

	// 3. Mettre à jour les rendez-vous associés à ce client (nom, email, téléphone)
	try {
		const aptUpdates: Record<string, any> = {};
		if (changes.full_name !== undefined) aptUpdates.client_name = changes.full_name;
		if (changes.phone !== undefined) aptUpdates.client_phone = changes.phone;
		if (changes.email !== undefined) aptUpdates.client_email = changes.email;
		if (Object.keys(aptUpdates).length > 0) {
			await supabase.from('appointments').update(aptUpdates).eq('client_id', id);
		}
	} catch (e) {
		console.warn('Could not update appointments for client:', e);
	}

	const result: Client = updated || {
		id,
		full_name: changes.full_name ?? null,
		phone: changes.phone ?? null,
		email: changes.email ?? null,
		avatar_url: changes.avatar_url ?? null,
		created_at: new Date().toISOString(),
		tag_bd: tag
	};

	// 4. Émettre un événement global pour que tous les composants React se synchronisent
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('diamant:client-updated', { detail: { client: result } }));
	}

	return result;
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

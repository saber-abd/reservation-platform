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
		.select('clients(id, full_name, phone, created_at, tag_bd)')
		.eq('professional_id', professionalId)
		.eq('tag_bd', tag)
		.not('client_id', 'is', null);
	if (error) throw error;
	const rows = (data ?? []) as unknown as { clients: Client | null }[];
	const byId = new Map<string, Client>();
	for (const row of rows) {
		if (row.clients && row.clients.tag_bd === tag) byId.set(row.clients.id, row.clients);
	}
	return Array.from(byId.values());
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
	const { data, error } = await supabase
		.from('messages')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('client_id', clientId)
		.eq('tag_bd', tag)
		.order('created_at');
	if (error) throw error;
	return data ?? [];
}

export async function sendMessage(message: {
	professional_id: string;
	client_id: string;
	sender: 'professional' | 'client';
	body: string;
}, tag = getDemoTag()): Promise<Message> {
	const { data, error } = await supabase.from('messages').insert({ ...message, tag_bd: tag }).select().single();
	if (error) throw error;
	return data as Message;
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
	const { data, error } = await supabase.from('clients').select('*').eq('id', userId).eq('tag_bd', tag).maybeSingle();
	if (error) throw error;
	return data;
}

export async function createClient(client: Pick<Client, 'id'> & Partial<Client>, tag = getDemoTag()) {
	const { data, error } = await supabase.from('clients').insert({ ...client, tag_bd: tag }).select().single();
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

import { supabase } from './supabase';

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
	opening_hours: unknown;
}

export interface Service {
	id: string;
	professional_id: string;
	name: string;
	description: string | null;
	duration_minutes: number;
	price: number;
	is_active: boolean;
}

export interface Availability {
	id: string;
	professional_id: string;
	start_time: string;
	end_time: string;
	is_booked: boolean;
}

export interface Client {
	id: string;
	full_name: string | null;
	phone: string | null;
	created_at: string;
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
}

export interface Message {
	id: string;
	professional_id: string;
	client_id: string;
	sender: 'professional' | 'client';
	body: string;
	created_at: string;
	read_at: string | null;
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
	status: 'confirmed' | 'cancelled' | 'completed';
	created_at: string;
}

/**
 * Le template est mono-professionnel pour l'instant : on récupère la première
 * ligne de la table `professionals`. En mode multi-tenant (Phase 9), on
 * filtrera plutôt par sous-domaine / slug.
 */
export async function getPrimaryProfessional(): Promise<Professional | null> {
	const { data, error } = await supabase.from('professionals').select('*').limit(1).maybeSingle();
	if (error) throw error;
	return data;
}

export async function getProfessionalByUserId(userId: string): Promise<Professional | null> {
	const { data, error } = await supabase.from('professionals').select('*').eq('user_id', userId).maybeSingle();
	if (error) throw error;
	return data;
}

export async function createProfessional(professional: Pick<Professional, 'user_id' | 'business_name'> & Partial<Professional>) {
	const { data, error } = await supabase.from('professionals').insert(professional).select().single();
	if (error) throw error;
	return data as Professional;
}

export async function updateProfessional(id: string, changes: Partial<Professional>) {
	const { data, error } = await supabase.from('professionals').update(changes).eq('id', id).select().single();
	if (error) throw error;
	return data as Professional;
}

export async function getServices(professionalId: string): Promise<Service[]> {
	const { data, error } = await supabase
		.from('services')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('is_active', true)
		.order('name');
	if (error) throw error;
	return data ?? [];
}

/** Toutes les prestations (actives ou non), pour la gestion côté dashboard. */
export async function getAllServices(professionalId: string): Promise<Service[]> {
	const { data, error } = await supabase
		.from('services')
		.select('*')
		.eq('professional_id', professionalId)
		.order('name');
	if (error) throw error;
	return data ?? [];
}

export async function createService(
	service: Pick<Service, 'professional_id' | 'name' | 'description' | 'duration_minutes' | 'price'>,
) {
	const { data, error } = await supabase.from('services').insert(service).select().single();
	if (error) throw error;
	return data as Service;
}

export async function updateService(id: string, changes: Partial<Service>) {
	const { data, error } = await supabase.from('services').update(changes).eq('id', id).select().single();
	if (error) throw error;
	return data as Service;
}

export async function deleteService(id: string) {
	const { error } = await supabase.from('services').delete().eq('id', id);
	if (error) throw error;
}

export async function getAvailableSlots(professionalId: string): Promise<Availability[]> {
	const { data, error } = await supabase
		.from('availabilities')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('is_booked', false)
		.gte('start_time', new Date().toISOString())
		.order('start_time');
	if (error) throw error;
	return data ?? [];
}

export async function getAllSlots(professionalId: string): Promise<Availability[]> {
	const { data, error } = await supabase
		.from('availabilities')
		.select('*')
		.eq('professional_id', professionalId)
		.order('start_time');
	if (error) throw error;
	return data ?? [];
}

export async function createAvailability(availability: Pick<Availability, 'professional_id' | 'start_time' | 'end_time'>) {
	const { data, error } = await supabase.from('availabilities').insert(availability).select().single();
	if (error) throw error;
	return data as Availability;
}

export async function deleteAvailability(id: string) {
	const { error } = await supabase.from('availabilities').delete().eq('id', id);
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
}) {
	const { data, error } = await supabase.from('appointments').insert(appointment).select().single();
	if (error) throw error;
	return data as Appointment;
}

export async function getAppointmentsForProfessional(professionalId: string): Promise<Appointment[]> {
	const { data, error } = await supabase
		.from('appointments')
		.select('*')
		.eq('professional_id', professionalId)
		.order('start_time', { ascending: false });
	if (error) throw error;
	return data ?? [];
}

/** Rendez-vous non annulés d'un professionnel pour une date précise (YYYY-MM-DD), pour calculer les créneaux libres. */
export async function getAppointmentsForDate(professionalId: string, date: string): Promise<Appointment[]> {
	const { data, error } = await supabase
		.from('appointments')
		.select('*')
		.eq('professional_id', professionalId)
		.neq('status', 'cancelled')
		.gte('start_time', `${date}T00:00:00`)
		.lte('start_time', `${date}T23:59:59`);
	if (error) throw error;
	return data ?? [];
}

/** Règles de disponibilité (récurrentes ou exceptionnelles) d'un professionnel. */
export async function getAvailabilityRules(professionalId: string): Promise<AvailabilityRule[]> {
	const { data, error } = await supabase
		.from('availability_rules')
		.select('*')
		.eq('professional_id', professionalId)
		.order('created_at');
	if (error) throw error;
	return data ?? [];
}

export async function createAvailabilityRule(
	rule: Omit<AvailabilityRule, 'id' | 'created_at'>,
): Promise<AvailabilityRule> {
	const { data, error } = await supabase.from('availability_rules').insert(rule).select().single();
	if (error) throw error;
	return data as AvailabilityRule;
}

export async function deleteAvailabilityRule(id: string) {
	const { error } = await supabase.from('availability_rules').delete().eq('id', id);
	if (error) throw error;
}

/** Clients ayant déjà réservé au moins un rendez-vous avec ce professionnel ("clients inscrits"). */
export async function getRegisteredClients(professionalId: string): Promise<Client[]> {
	const { data, error } = await supabase
		.from('appointments')
		.select('clients(id, full_name, phone, created_at)')
		.eq('professional_id', professionalId)
		.not('client_id', 'is', null);
	if (error) throw error;
	const rows = (data ?? []) as unknown as { clients: Client | null }[];
	const byId = new Map<string, Client>();
	for (const row of rows) {
		if (row.clients) byId.set(row.clients.id, row.clients);
	}
	return Array.from(byId.values());
}

/** Messages échangés entre un professionnel et un client précis, dans l'ordre chronologique. */
export async function getMessages(professionalId: string, clientId: string): Promise<Message[]> {
	const { data, error } = await supabase
		.from('messages')
		.select('*')
		.eq('professional_id', professionalId)
		.eq('client_id', clientId)
		.order('created_at');
	if (error) throw error;
	return data ?? [];
}

export async function sendMessage(message: {
	professional_id: string;
	client_id: string;
	sender: 'professional' | 'client';
	body: string;
}): Promise<Message> {
	const { data, error } = await supabase.from('messages').insert(message).select().single();
	if (error) throw error;
	return data as Message;
}

export async function updateAppointmentStatus(id: string, status: Appointment['status']) {
	const { data, error } = await supabase.from('appointments').update({ status }).eq('id', id).select().single();
	if (error) throw error;
	return data as Appointment;
}

/** Profil client (espace "mes rendez-vous"), id = auth.users.id. */
export async function getClientById(userId: string): Promise<Client | null> {
	const { data, error } = await supabase.from('clients').select('*').eq('id', userId).maybeSingle();
	if (error) throw error;
	return data;
}

export async function createClient(client: Pick<Client, 'id'> & Partial<Client>) {
	const { data, error } = await supabase.from('clients').insert(client).select().single();
	if (error) throw error;
	return data as Client;
}

export async function updateClient(id: string, changes: Partial<Client>) {
	const { data, error } = await supabase.from('clients').update(changes).eq('id', id).select().single();
	if (error) throw error;
	return data as Client;
}

export async function getAppointmentsForClient(clientId: string): Promise<(Appointment & { services: { name: string } | null })[]> {
	const { data, error } = await supabase
		.from('appointments')
		.select('*, services(name)')
		.eq('client_id', clientId)
		.order('start_time', { ascending: false });
	if (error) throw error;
	return (data ?? []) as unknown as (Appointment & { services: { name: string } | null })[];
}

/** Détermine le type de compte d'un utilisateur authentifié (pour rediriger après connexion/inscription). */
export async function getAccountType(userId: string): Promise<'professional' | 'client' | null> {
	const professional = await getProfessionalByUserId(userId);
	if (professional) return 'professional';
	const client = await getClientById(userId);
	if (client) return 'client';
	return null;
}

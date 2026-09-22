import { supabase } from './supabase';
import { getDemoTag } from './queries';

export type ProRole = 'admin' | 'employee';

export interface TeamMember {
	id: string;
	name: string;
	email: string;
	role: ProRole;
	specialty?: string;
	status: 'active' | 'suspended';
	created_at: string;
}

export interface BannedClientRecord {
	clientId: string;
	clientName: string;
	clientEmail?: string | null;
	reason: string;
	bannedAt: string;
}

const DEFAULT_TEAM_MEMBERS: TeamMember[] = [];

export function getActiveProRole(): ProRole {
	if (typeof window === 'undefined') return 'admin';
	const saved = localStorage.getItem('pro_active_role');
	if (saved === 'employee' || saved === 'admin') return saved;
	return 'admin';
}

export function setActiveProRole(role: ProRole): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem('pro_active_role', role);
	window.dispatchEvent(new CustomEvent('pro:role-changed', { detail: { role } }));
}

export function getTeamMembers(proId: string): TeamMember[] {
	if (typeof window === 'undefined') return DEFAULT_TEAM_MEMBERS;
	try {
		const key = `diamant_team_members_${proId}`;
		const saved = localStorage.getItem(key);
		if (saved) {
			const parsed = JSON.parse(saved);
			if (Array.isArray(parsed)) {
				// Purger les anciens comptes fictifs de démonstration
				const legacyMockIds = ['member-owner-1', 'member-emp-1', 'member-emp-2', 'member-emp-3'];
				const cleaned = parsed.filter(m => !legacyMockIds.includes(m.id));
				if (cleaned.length !== parsed.length) {
					localStorage.setItem(key, JSON.stringify(cleaned));
				}
				return cleaned;
			}
		}
		return DEFAULT_TEAM_MEMBERS;
	} catch (e) {
		return DEFAULT_TEAM_MEMBERS;
	}
}

export function addTeamMember(proId: string, member: Omit<TeamMember, 'id' | 'created_at'>): TeamMember {
	const current = getTeamMembers(proId);
	const newMember: TeamMember = {
		...member,
		id: 'emp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
		created_at: new Date().toISOString()
	};
	const updated = [...current, newMember];
	if (typeof window !== 'undefined') {
		localStorage.setItem(`diamant_team_members_${proId}`, JSON.stringify(updated));
		window.dispatchEvent(new CustomEvent('diamant:team-updated', { detail: { members: updated } }));
	}
	return newMember;
}

export function updateTeamMember(proId: string, id: string, changes: Partial<TeamMember>): void {
	const current = getTeamMembers(proId);
	const updated = current.map(m => m.id === id ? { ...m, ...changes } : m);
	if (typeof window !== 'undefined') {
		localStorage.setItem(`diamant_team_members_${proId}`, JSON.stringify(updated));
		window.dispatchEvent(new CustomEvent('diamant:team-updated', { detail: { members: updated } }));
	}
}

export function deleteTeamMember(proId: string, id: string): void {
	const current = getTeamMembers(proId);
	const updated = current.filter(m => m.id !== id);
	if (typeof window !== 'undefined') {
		localStorage.setItem(`diamant_team_members_${proId}`, JSON.stringify(updated));
		window.dispatchEvent(new CustomEvent('diamant:team-updated', { detail: { members: updated } }));
	}
}

export function getBannedClients(): Record<string, BannedClientRecord> {
	if (typeof window === 'undefined') return {};
	try {
		const saved = localStorage.getItem('diamant_banned_clients');
		if (saved) return JSON.parse(saved);
	} catch (e) {}
	return {};
}

export function isClientBanned(clientId: string, clientEmail?: string | null): boolean {
	const banned = getBannedClients();
	if (banned[clientId]) return true;
	if (clientEmail) {
		const lower = clientEmail.toLowerCase();
		for (const k in banned) {
			if (banned[k].clientEmail && banned[k].clientEmail!.toLowerCase() === lower) {
				return true;
			}
		}
	}
	return false;
}

export function banClient(clientId: string, clientName: string, reason: string, clientEmail?: string | null): void {
	if (typeof window === 'undefined') return;
	const banned = getBannedClients();
	banned[clientId] = {
		clientId,
		clientName,
		clientEmail,
		reason: reason.trim() || 'Comportement non conforme ou absences répétées',
		bannedAt: new Date().toISOString()
	};
	localStorage.setItem('diamant_banned_clients', JSON.stringify(banned));
	window.dispatchEvent(new CustomEvent('diamant:client-banned', { detail: { clientId, reason } }));
}

export function unbanClient(clientId: string): void {
	if (typeof window === 'undefined') return;
	const banned = getBannedClients();
	if (banned[clientId]) {
		delete banned[clientId];
		localStorage.setItem('diamant_banned_clients', JSON.stringify(banned));
		window.dispatchEvent(new CustomEvent('diamant:client-unbanned', { detail: { clientId } }));
	}
}

export async function deleteClientAccount(clientId: string): Promise<void> {
	// Supprimer de Supabase si possible
	try {
		await supabase.from('clients').delete().eq('id', clientId);
	} catch (e) {
		console.warn('Could not delete client from Supabase:', e);
	}

	// Nettoyer localement
	if (typeof window !== 'undefined') {
		try {
			unbanClient(clientId);
			const metaRaw = localStorage.getItem('diamant_conversations_meta');
			if (metaRaw) {
				const meta = JSON.parse(metaRaw);
				delete meta[clientId];
				localStorage.setItem('diamant_conversations_meta', JSON.stringify(meta));
			}
			window.dispatchEvent(new CustomEvent('diamant:client-deleted', { detail: { clientId } }));
		} catch (e) {}
	}
}

/**
 * Vérifie si une route donnée est accessible pour un rôle donné
 */
export function isTabAllowedForRole(pathname: string, role: ProRole): boolean {
	if (role === 'admin') return true;

	// Pour l'employé, seuls ces 4 onglets sont autorisés :
	// - Planning & RDV (/dashboard/disponibilites)
	// - Clientèle (/dashboard/clients)
	// - Messagerie (/dashboard/messages)
	// - Recherche (/dashboard/recherche)
	const allowedPaths = [
		'/dashboard/disponibilites',
		'/dashboard/clients',
		'/dashboard/messages',
		'/dashboard/recherche',
		'/dashboard/profil' // accessible en lecture seule uniquement
	];

	return allowedPaths.some(p => pathname.includes(p));
}

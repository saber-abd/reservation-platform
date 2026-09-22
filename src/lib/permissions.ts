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

	// Fallback cookie
	try {
		const match = document.cookie.match(/(?:^|;\s*)diamant_banned_clients=([^;]+)/);
		if (match) {
			const parsed = JSON.parse(decodeURIComponent(match[1]));
			if (parsed && typeof parsed === 'object') return parsed;
		}
	} catch (e) {}
	return {};
}

export function getBannedClientRecord(
	clientId?: string | null, 
	clientEmail?: string | null, 
	clientName?: string | null
): BannedClientRecord | null {
	const banned = getBannedClients();
	if (!banned || Object.keys(banned).length === 0) return null;

	// 1. Recherche directe par ID client
	if (clientId && banned[clientId]) {
		return banned[clientId];
	}

	const emailLower = clientEmail ? clientEmail.toLowerCase().trim() : null;
	const nameLower = clientName ? clientName.toLowerCase().trim() : null;

	for (const id in banned) {
		const rec = banned[id];
		// Correspondance par ID
		if (clientId && rec.clientId === clientId) {
			return rec;
		}
		// Correspondance par Email
		if (emailLower && rec.clientEmail && rec.clientEmail.toLowerCase().trim() === emailLower) {
			return rec;
		}
		// Correspondance par Nom
		if (nameLower && rec.clientName && rec.clientName.toLowerCase().trim() === nameLower) {
			return rec;
		}
	}

	// Recherche par email stocké dans la session client active
	if (typeof window !== 'undefined') {
		try {
			const savedEmail = localStorage.getItem('diamant_client_email') || sessionStorage.getItem('diamant_client_email');
			if (savedEmail) {
				const sLower = savedEmail.toLowerCase().trim();
				for (const id in banned) {
					if (banned[id].clientEmail && banned[id].clientEmail!.toLowerCase().trim() === sLower) {
						return banned[id];
					}
				}
			}
		} catch (e) {}
	}

	return null;
}

export function isClientBanned(clientId?: string | null, clientEmail?: string | null, clientName?: string | null): boolean {
	return getBannedClientRecord(clientId, clientEmail, clientName) !== null;
}

export function banClient(clientId: string, clientName: string, reason: string, clientEmail?: string | null): void {
	if (typeof window === 'undefined') return;
	const banned = getBannedClients();

	// Tenter de résoudre l'email si absent
	let resolvedEmail = clientEmail ? clientEmail.toLowerCase().trim() : null;
	if (!resolvedEmail) {
		try {
			const emailsMap = JSON.parse(localStorage.getItem('diamant_client_emails') || '{}');
			if (emailsMap[clientId]) resolvedEmail = emailsMap[clientId].toLowerCase().trim();
		} catch (e) {}
	}
	if (!resolvedEmail) {
		try {
			const overrides = JSON.parse(localStorage.getItem('diamant_clients_overrides') || '{}');
			if (overrides[clientId]?.email) resolvedEmail = overrides[clientId].email.toLowerCase().trim();
		} catch (e) {}
	}

	const record: BannedClientRecord = {
		clientId,
		clientName: clientName.trim(),
		clientEmail: resolvedEmail,
		reason: reason.trim() || 'Absences non prévenues ou non-respect des conditions du salon',
		bannedAt: new Date().toISOString()
	};

	banned[clientId] = record;
	const serialized = JSON.stringify(banned);
	localStorage.setItem('diamant_banned_clients', serialized);
	document.cookie = `diamant_banned_clients=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
	window.dispatchEvent(new CustomEvent('diamant:client-banned', { detail: { clientId, reason, record } }));
}

export function unbanClient(clientId: string): void {
	if (typeof window === 'undefined') return;
	const banned = getBannedClients();
	let modified = false;

	if (banned[clientId]) {
		delete banned[clientId];
		modified = true;
	} else {
		// Supprimer par correspondance
		for (const k in banned) {
			if (banned[k].clientId === clientId || banned[k].clientEmail === clientId.toLowerCase()) {
				delete banned[k];
				modified = true;
			}
		}
	}

	if (modified) {
		const serialized = JSON.stringify(banned);
		localStorage.setItem('diamant_banned_clients', serialized);
		document.cookie = `diamant_banned_clients=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
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

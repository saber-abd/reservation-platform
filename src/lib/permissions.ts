import { supabase } from './supabase';
import { getDemoTag } from './queries';

export type ProRole = 'admin' | 'employee' | 'demo';

export interface TeamMember {
	id: string;
	name: string;
	email: string;
	role: ProRole;
	specialty?: string;
	status: 'active' | 'suspended';
	created_at: string;
	password?: string;
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
	if (saved === 'employee' || saved === 'admin' || saved === 'demo') return saved;
	return 'admin';
}

export function isRoleReadOnly(role?: ProRole): boolean {
	const current = role || getActiveProRole();
	return current === 'demo';
}

export function setActiveProRole(role: ProRole): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem('pro_active_role', role);
	window.dispatchEvent(new CustomEvent('pro:role-changed', { detail: { role } }));
}

/**
 * Enregistre ou met à jour un compte pro dans le registre global de la démo
 */
export function saveProAccount(member: TeamMember): void {
	if (typeof window === 'undefined') return;
	try {
		const raw = localStorage.getItem('diamant_pro_accounts') || '[]';
		const list: TeamMember[] = JSON.parse(raw);
		const idx = list.findIndex(m => m.email.toLowerCase().trim() === member.email.toLowerCase().trim());
		if (idx >= 0) {
			list[idx] = { ...list[idx], ...member };
		} else {
			list.push(member);
		}
		localStorage.setItem('diamant_pro_accounts', JSON.stringify(list));
	} catch (e) {}
}

/**
 * Recherche un compte pro (collaborateur ou admin) par son adresse email
 */
export function findProAccount(email: string): TeamMember | null {
	if (typeof window === 'undefined' || !email) return null;
	const cleanEmail = email.toLowerCase().trim();

	// 1. Recherche dans le registre global des comptes créés
	try {
		const raw = localStorage.getItem('diamant_pro_accounts');
		if (raw) {
			const list: TeamMember[] = JSON.parse(raw);
			const found = list.find(m => m.email && m.email.toLowerCase().trim() === cleanEmail);
			if (found) return found;
		}
	} catch (e) {}

	// 2. Recherche dans toutes les clés diamant_team_members_* du localStorage
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith('diamant_team_members_')) {
				const raw = localStorage.getItem(key);
				if (raw) {
					const list: TeamMember[] = JSON.parse(raw);
					if (Array.isArray(list)) {
						const found = list.find(m => m.email && m.email.toLowerCase().trim() === cleanEmail);
						if (found) return found;
					}
				}
			}
		}
	} catch (e) {}

	return null;
}

export function setProSession(member: TeamMember): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem('diamant_pro_user', JSON.stringify({
		id: member.id,
		name: member.name,
		email: member.email,
		role: member.role,
		specialty: member.specialty
	}));
	localStorage.setItem('diamant_client_email', member.email);
	setActiveProRole(member.role);
}

export function getProSession(): { id: string; name: string; email: string; role: ProRole; specialty?: string } | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem('diamant_pro_user');
		if (raw) return JSON.parse(raw);
	} catch (e) {}
	return null;
}

export function clearProSession(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem('diamant_pro_user');
	localStorage.removeItem('pro_active_role');
	localStorage.removeItem('diamant_client_email');
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
		saveProAccount(newMember);
		window.dispatchEvent(new CustomEvent('diamant:team-updated', { detail: { members: updated } }));
	}
	return newMember;
}

export function updateTeamMember(proId: string, id: string, changes: Partial<TeamMember>): void {
	const current = getTeamMembers(proId);
	const updated = current.map(m => m.id === id ? { ...m, ...changes } : m);
	if (typeof window !== 'undefined') {
		localStorage.setItem(`diamant_team_members_${proId}`, JSON.stringify(updated));
		const modified = updated.find(m => m.id === id);
		if (modified) saveProAccount(modified);
		window.dispatchEvent(new CustomEvent('diamant:team-updated', { detail: { members: updated } }));
	}
}

export function deleteTeamMember(proId: string, id: string): void {
	const current = getTeamMembers(proId);
	const toDelete = current.find(m => m.id === id);
	const updated = current.filter(m => m.id !== id);
	if (typeof window !== 'undefined') {
		localStorage.setItem(`diamant_team_members_${proId}`, JSON.stringify(updated));
		if (toDelete?.email) {
			try {
				const raw = localStorage.getItem('diamant_pro_accounts');
				if (raw) {
					const list: TeamMember[] = JSON.parse(raw);
					const filtered = list.filter(m => m.email.toLowerCase().trim() !== toDelete.email.toLowerCase().trim());
					localStorage.setItem('diamant_pro_accounts', JSON.stringify(filtered));
				}
			} catch (e) {}
		}
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

/**
 * Vérifie en temps réel dans la base de données Supabase si un client est banni (par ID ou email)
 */
export async function checkIsClientBannedInDb(
	userId?: string | null, 
	userEmail?: string | null
): Promise<{ isBanned: boolean; reason: string | null } | null> {
	if (!userId && !userEmail) return null;

	try {
		let query = supabase.from('clients').select('id, email, is_banned, ban, ban_reason');
		const cleanEmail = userEmail ? userEmail.toLowerCase().trim() : null;

		if (userId && cleanEmail) {
			query = query.or(`id.eq.${userId},email.eq.${cleanEmail}`);
		} else if (userId) {
			query = query.eq('id', userId);
		} else if (cleanEmail) {
			query = query.eq('email', cleanEmail);
		}

		const { data, error } = await query;
		if (!error && data && data.length > 0) {
			const bannedRow = data.find(r => r.is_banned === true || r.ban === 'oui');
			if (bannedRow) {
				return {
					isBanned: true,
					reason: bannedRow.ban_reason || 'Non-respect des conditions de réservation'
				};
			}
		}
	} catch (e) {
		console.warn('Erreur vérification ban en base de données:', e);
	}

	return null;
}

/**
 * Bannit un client : applique la sanction en base de données (public.clients + auth.users) et en local
 */
export async function banClient(
	clientId: string, 
	clientName: string, 
	reason: string, 
	clientEmail?: string | null
): Promise<void> {
	const finalReason = reason.trim() || 'Absences non prévenues ou non-respect des conditions du salon';

	// 1. Tenter l'appel RPC de bannissement sécurisé (met à jour clients + verrouille auth.users)
	try {
		await supabase.rpc('ban_user_by_admin', {
			target_user_id: clientId,
			reason: finalReason
		});
	} catch (e) {
		console.warn('RPC ban_user_by_admin:', e);
	}

	// 2. Mise à jour directe de la table public.clients en BD
	try {
		await supabase
			.from('clients')
			.update({
				is_banned: true,
				ban: 'oui',
				ban_reason: finalReason,
				banned_at: new Date().toISOString()
			})
			.eq('id', clientId);
	} catch (e) {
		console.warn('Direct clients table ban update:', e);
	}

	// 3. Mise à jour du cache local pour réactivité instantanée
	if (typeof window !== 'undefined') {
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
			reason: finalReason,
			bannedAt: new Date().toISOString()
		};

		banned[clientId] = record;
		const serialized = JSON.stringify(banned);
		localStorage.setItem('diamant_banned_clients', serialized);
		document.cookie = `diamant_banned_clients=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
		window.dispatchEvent(new CustomEvent('diamant:client-banned', { detail: { clientId, reason: finalReason, record } }));
	}
}

/**
 * Lève le bannissement d'un client en base de données et en local
 */
export async function unbanClient(clientId: string): Promise<void> {
	// 1. Tenter le déverrouillage via RPC
	try {
		await supabase.rpc('unban_user_by_admin', {
			target_user_id: clientId
		});
	} catch (e) {
		console.warn('RPC unban_user_by_admin:', e);
	}

	// 2. Mise à jour directe de la table public.clients en BD
	try {
		await supabase
			.from('clients')
			.update({
				is_banned: false,
				ban: 'non',
				ban_reason: null,
				banned_at: null
			})
			.eq('id', clientId);
	} catch (e) {
		console.warn('Direct clients table unban update:', e);
	}

	// 3. Mise à jour du cache local
	if (typeof window !== 'undefined') {
		const banned = getBannedClients();
		let modified = false;

		if (banned[clientId]) {
			delete banned[clientId];
			modified = true;
		} else {
			for (const k in banned) {
				if (banned[k].clientId === clientId || (banned[k].clientEmail && banned[k].clientEmail === clientId.toLowerCase())) {
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
}

/**
 * Supprime définitivement un compte client en base de données (cascade tables + auth.users)
 */
export async function deleteClientAccount(clientId: string): Promise<void> {
	// 1. Suppression complète via fonction RPC sécurisée (supprime dans public.* ET dans auth.users)
	let rpcSuccess = false;
	try {
		const { data, error } = await supabase.rpc('delete_user_by_admin', { target_user_id: clientId });
		if (!error && data === true) {
			rpcSuccess = true;
		}
	} catch (e) {
		console.warn('RPC delete_user_by_admin error:', e);
	}

	// 2. Si le RPC n'est pas encore actif, suppression directe des tables en BD
	if (!rpcSuccess) {
		try {
			await supabase.from('appointments').delete().eq('client_id', clientId);
		} catch (e) {}
		try {
			await supabase.from('messages').delete().eq('client_id', clientId);
		} catch (e) {}
		try {
			await supabase.from('client_notes').delete().eq('client_id', clientId);
		} catch (e) {}
		try {
			await supabase.from('clients').delete().eq('id', clientId);
		} catch (e) {
			console.warn('Could not delete client from clients table:', e);
		}
	}

	// 3. Nettoyer les caches locaux et bannissements
	if (typeof window !== 'undefined') {
		try {
			await unbanClient(clientId);
			const metaRaw = localStorage.getItem('diamant_conversations_meta');
			if (metaRaw) {
				const meta = JSON.parse(metaRaw);
				delete meta[clientId];
				localStorage.setItem('diamant_conversations_meta', JSON.stringify(meta));
			}
			const emailsMapRaw = localStorage.getItem('diamant_client_emails');
			if (emailsMapRaw) {
				const map = JSON.parse(emailsMapRaw);
				delete map[clientId];
				localStorage.setItem('diamant_client_emails', JSON.stringify(map));
			}
			window.dispatchEvent(new CustomEvent('diamant:client-deleted', { detail: { clientId } }));
		} catch (e) {}
	}
}


/**
 * Vérifie si une route donnée est accessible pour un rôle donné
 */
export function isTabAllowedForRole(pathname: string, role: ProRole): boolean {
	if (role === 'admin' || role === 'demo') return true; // Le rôle Démo a accès à tous les onglets en consultation complète

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

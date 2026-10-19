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
}

export interface BannedClientRecord {
	clientId: string;
	clientName: string;
	clientEmail?: string | null;
	reason: string;
	bannedAt: string;
}

export interface ProContext {
	role: ProRole;
	owner: boolean;
	professional_id: string;
	name: string;
	email: string;
	tag_bd?: string;
	specialty?: string;
	member_id?: string;
}

const RANK: Record<ProRole, number> = { demo: 0, employee: 1, admin: 2 };
const SERVER_ROLE_KEY = 'pro_server_role';
const SESSION_KEY = 'diamant_pro_user';

function isRole(v: unknown): v is ProRole {
	return v === 'admin' || v === 'employee' || v === 'demo';
}

/**
 * Rôle réel de l'utilisateur, tel que renvoyé par la base à la connexion (cache de session).
 * ATTENTION : ceci ne sert qu'à l'affichage de l'interface. Les droits réels sont
 * appliqués par la base (RLS + fonctions SECURITY DEFINER) : modifier ce cache ne donne aucun accès.
 */
function getServerRole(): ProRole | null {
	if (typeof window === 'undefined') return null;
	try {
		const v = sessionStorage.getItem(SERVER_ROLE_KEY);
		return isRole(v) ? v : null;
	} catch (e) {
		return null;
	}
}

/**
 * Rôle effectif pour l'interface : le rôle serveur, éventuellement abaissé par un mode
 * "aperçu" (un admin peut prévisualiser la vue employé/démo, jamais l'inverse).
 */
export function getActiveProRole(): ProRole {
	// Les rôles (admin / employé / démo) n'existent que dans la démo Diamant : les autres démos restent en admin.
	if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/demo-diamant')) return 'admin';
	const server = getServerRole();
	if (!server) return 'demo';
	try {
		const preview = localStorage.getItem('pro_active_role');
		if (isRole(preview) && RANK[preview] < RANK[server]) return preview;
	} catch (e) {}
	return server;
}

export function isRoleReadOnly(role?: ProRole): boolean {
	const current = role || getActiveProRole();
	return current === 'demo';
}

/** Change le mode d'aperçu de l'interface (n'élève jamais les droits réels). */
export function setActiveProRole(role: ProRole): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem('pro_active_role', role);
	} catch (e) {}
	window.dispatchEvent(new CustomEvent('pro:role-changed', { detail: { role: getActiveProRole() } }));
}

/**
 * Charge le contexte professionnel depuis la base pour la session Supabase courante.
 * Renvoie null si l'utilisateur n'est ni propriétaire ni collaborateur actif.
 */
export async function loadProContext(): Promise<ProContext | null> {
	try {
		const { data, error } = await supabase.rpc('my_pro_context');
		if (error || !data || !isRole((data as any).role)) {
			clearProSession();
			return null;
		}
		const ctx = data as ProContext;
		const previousRole = getServerRole();
		if (typeof window !== 'undefined') {
			sessionStorage.setItem(SERVER_ROLE_KEY, ctx.role);
			if (previousRole !== ctx.role) {
				// Les composants déjà montés (navigation, garde) se mettent à jour.
				window.dispatchEvent(new CustomEvent('pro:role-changed', { detail: { role: getActiveProRole() } }));
			}
		}
		setProSession({
			id: ctx.member_id || ctx.professional_id,
			name: ctx.name,
			email: ctx.email,
			role: ctx.role,
			specialty: ctx.specialty,
		});
		return ctx;
	} catch (e) {
		return null;
	}
}

export function setProSession(member: { id: string; name: string; email: string; role: ProRole; specialty?: string }): void {
	if (typeof window === 'undefined') return;
	try {
		sessionStorage.setItem(SESSION_KEY, JSON.stringify({
			id: member.id,
			name: member.name,
			email: member.email,
			role: member.role,
			specialty: member.specialty
		}));
	} catch (e) {}
}

export function getProSession(): { id: string; name: string; email: string; role: ProRole; specialty?: string } | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = sessionStorage.getItem(SESSION_KEY);
		if (raw) return JSON.parse(raw);
	} catch (e) {}
	return null;
}

export function clearProSession(): void {
	if (typeof window === 'undefined') return;
	try {
		sessionStorage.removeItem(SESSION_KEY);
		sessionStorage.removeItem(SERVER_ROLE_KEY);
		localStorage.removeItem('pro_active_role');
		// Anciennes clés (versions précédentes qui stockaient comptes et mots de passe en local)
		localStorage.removeItem('diamant_pro_user');
		localStorage.removeItem('diamant_pro_accounts');
		for (let i = localStorage.length - 1; i >= 0; i--) {
			const key = localStorage.key(i);
			if (key && key.startsWith('diamant_team_members_')) localStorage.removeItem(key);
		}
	} catch (e) {}
}

// ---------------------------------------------------------------------------
// Équipe : stockée en base (table team_members), gérée via la route serveur /api/team
// ---------------------------------------------------------------------------
let teamCache: TeamMember[] = [];

function emitTeam(): void {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('diamant:team-updated', { detail: { members: teamCache } }));
	}
}

function rowToMember(r: any): TeamMember {
	return {
		id: r.id,
		name: r.name,
		email: r.email,
		role: r.role,
		specialty: r.specialty || undefined,
		status: r.status,
		created_at: r.created_at,
	};
}

/** Membres déjà chargés (synchrone). Appelez refreshTeamMembers() pour les rafraîchir. */
export function getTeamMembers(_proId?: string): TeamMember[] {
	return teamCache;
}

export async function refreshTeamMembers(): Promise<TeamMember[]> {
	const { data, error } = await supabase
		.from('team_members')
		.select('id, name, email, role, specialty, status, created_at')
		.order('created_at', { ascending: true });
	if (error) {
		console.warn('Chargement équipe:', error.message);
		return teamCache;
	}
	teamCache = (data || []).map(rowToMember);
	emitTeam();
	return teamCache;
}

async function callTeamApi(payload: Record<string, unknown>): Promise<any> {
	const { data: sessionData } = await supabase.auth.getSession();
	const token = sessionData.session?.access_token;
	if (!token) throw new Error('Session expirée, reconnectez-vous.');
	const res = await fetch('/api/team', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload),
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body.error || 'Opération impossible.');
	return body;
}

export async function addTeamMember(
	_proId: string,
	member: Pick<TeamMember, 'name' | 'email' | 'role' | 'specialty'> & { password: string }
): Promise<TeamMember> {
	const { member: row } = await callTeamApi({ action: 'create', ...member });
	const created = rowToMember(row);
	teamCache = [...teamCache, created];
	emitTeam();
	return created;
}

export async function updateTeamMember(
	_proId: string,
	id: string,
	changes: Partial<TeamMember> & { password?: string }
): Promise<void> {
	const { member: row } = await callTeamApi({ action: 'update', id, changes });
	const updated = rowToMember(row);
	teamCache = teamCache.map((m) => (m.id === id ? updated : m));
	emitTeam();
}

export async function deleteTeamMember(_proId: string, id: string): Promise<void> {
	await callTeamApi({ action: 'delete', id });
	teamCache = teamCache.filter((m) => m.id !== id);
	emitTeam();
}

// ---------------------------------------------------------------------------
// Bannissement : l'autorité est la base (colonne clients.is_banned + auth.users.banned_until).
// Le cache local ci-dessous n'est qu'un confort d'affichage.
// ---------------------------------------------------------------------------
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Vérifie dans la base si un client est banni (par ID ou email).
 * Les règles d'accès (RLS) limitent la lecture : un visiteur non connecté ne voit rien.
 * Pour un compte banni, la connexion elle-même est refusée par Supabase (banned_until).
 */
export async function checkIsClientBannedInDb(
	userId?: string | null,
	userEmail?: string | null
): Promise<{ isBanned: boolean; reason: string | null } | null> {
	if (!userId && !userEmail) return null;

	try {
		let query = supabase.from('clients').select('id, email, is_banned, ban, ban_reason');
		const validId = userId && UUID_RE.test(userId) ? userId : null;
		// Neutralise les caractères de syntaxe du filtre PostgREST
		const cleanEmail = userEmail ? userEmail.toLowerCase().trim().replace(/[,()"\\*]/g, '') : null;

		if (validId && cleanEmail) {
			query = query.or(`id.eq.${validId},email.eq.${cleanEmail}`);
		} else if (validId) {
			query = query.eq('id', validId);
		} else if (cleanEmail) {
			query = query.eq('email', cleanEmail);
		} else {
			return null;
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

function persistBannedCache(banned: Record<string, BannedClientRecord>): void {
	const serialized = JSON.stringify(banned);
	localStorage.setItem('diamant_banned_clients', serialized);
	document.cookie = `diamant_banned_clients=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Bannit un client via la fonction serveur ban_user_by_admin (réservée aux admins).
 * Lève une erreur si la base refuse l'action.
 */
export async function banClient(
	clientId: string,
	clientName: string,
	reason: string,
	clientEmail?: string | null
): Promise<void> {
	const finalReason = reason.trim() || 'Absences non prévenues ou non-respect des conditions du salon';

	const { error } = await supabase.rpc('ban_user_by_admin', {
		target_user_id: clientId,
		reason: finalReason
	});
	if (error) {
		throw new Error("Action refusée : seuls les administrateurs de l'établissement peuvent bannir un client.");
	}

	// Cache local pour la réactivité de l'interface
	if (typeof window !== 'undefined') {
		const banned = getBannedClients();

		let resolvedEmail = clientEmail ? clientEmail.toLowerCase().trim() : null;
		if (!resolvedEmail) {
			try {
				const emailsMap = JSON.parse(localStorage.getItem('diamant_client_emails') || '{}');
				if (emailsMap[clientId]) resolvedEmail = emailsMap[clientId].toLowerCase().trim();
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
		persistBannedCache(banned);
		window.dispatchEvent(new CustomEvent('diamant:client-banned', { detail: { clientId, reason: finalReason, record } }));
	}
}

/**
 * Lève le bannissement d'un client via la fonction serveur unban_user_by_admin.
 */
export async function unbanClient(clientId: string): Promise<void> {
	const { error } = await supabase.rpc('unban_user_by_admin', {
		target_user_id: clientId
	});
	if (error) {
		throw new Error("Action refusée : seuls les administrateurs de l'établissement peuvent lever un bannissement.");
	}

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
			persistBannedCache(banned);
			window.dispatchEvent(new CustomEvent('diamant:client-unbanned', { detail: { clientId } }));
		}
	}
}

/**
 * Supprime définitivement un compte client (cascade tables + auth.users) via delete_user_by_admin.
 */
export async function deleteClientAccount(clientId: string): Promise<void> {
	const { data, error } = await supabase.rpc('delete_user_by_admin', { target_user_id: clientId });
	if (error || data !== true) {
		throw new Error("Action refusée : seuls les administrateurs de l'établissement peuvent supprimer un compte client.");
	}

	// Nettoyer les caches locaux
	if (typeof window !== 'undefined') {
		try {
			const banned = getBannedClients();
			if (banned[clientId]) {
				delete banned[clientId];
				persistBannedCache(banned);
			}
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
 * Vérifie si une route donnée est accessible pour un rôle donné (affichage de l'interface).
 * Les données elles-mêmes sont protégées par la base, pas par cette fonction.
 */
export function isTabAllowedForRole(pathname: string, role: ProRole): boolean {
	if (role === 'admin' || role === 'demo') return true; // Le rôle Démo a accès à tous les onglets en consultation complète

	// Pour l'employé, seuls ces onglets sont autorisés :
	const allowedPaths = [
		'/dashboard/disponibilites',
		'/dashboard/clients',
		'/dashboard/messages',
		'/dashboard/recherche',
		'/dashboard/profil' // accessible en lecture seule uniquement
	];

	return allowedPaths.some(p => pathname.includes(p));
}

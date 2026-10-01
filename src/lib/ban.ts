import { supabase } from './supabase';
import { getBannedClientRecord, checkIsClientBannedInDb } from './permissions';

/** Informations affichées à un compte banni qui tente de se connecter. */
export interface BanNotice {
	reason: string | null;
	bannedAt: string | null;
	/** null = pas de date de fin connue ou suspension illimitée. */
	bannedUntil: string | null;
}

const NOTICE_KEY = 'ban_notice';
// Au-delà, la suspension est considérée comme illimitée (ban_user_by_admin pose 2999-01-01).
const INDEFINITE_YEAR = 2100;

/** Erreur Supabase Auth renvoyée pour un compte dont auth.users.banned_until est dans le futur. */
export function isBannedAuthError(err: unknown): boolean {
	if (!err || typeof err !== 'object') return false;
	const e = err as { code?: string; message?: string };
	return e.code === 'user_banned' || /banned/i.test(e.message || '');
}

/**
 * Supabase redirige un compte banni après Google avec l'erreur dans l'URL
 * (`#error=...&error_code=user_banned&error_description=User+is+banned`, ou en query string).
 * Retourne true si c'est le cas, et retire ces paramètres de l'URL.
 */
export function consumeBanErrorFromUrl(): boolean {
	if (typeof window === 'undefined') return false;
	const url = new URL(window.location.href);
	const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
	const read = (k: string) => url.searchParams.get(k) || hash.get(k) || '';
	const banned =
		read('error_code') === 'user_banned' ||
		/banned/i.test(read('error_description')) ||
		read('error') === 'banned';
	if (banned) {
		['error', 'error_code', 'error_description'].forEach((k) => url.searchParams.delete(k));
		window.history.replaceState(null, '', url.pathname + url.search);
	}
	return banned;
}

function normalizeUntil(value: string | null | undefined): string | null {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime()) || d.getFullYear() >= INDEFINITE_YEAR) return null;
	return value;
}

/**
 * Cherche le motif et les dates de la sanction (RPC get_ban_status, puis table clients, puis cache local).
 * Retourne null si aucun bannissement n'est trouvé.
 */
export async function fetchBanNotice(email?: string | null, userId?: string | null): Promise<BanNotice | null> {
	if (!email && !userId) return null;

	let rpcAnswered = false;
	try {
		const { data, error } = await supabase.rpc('get_ban_status', {
			p_email: email ?? null,
			p_user_id: userId ?? null,
		});
		const row = Array.isArray(data) ? data[0] : data;
		if (!error && row?.is_banned) {
			return { reason: row.reason ?? null, bannedAt: row.banned_at ?? null, bannedUntil: normalizeUntil(row.banned_until) };
		}
		rpcAnswered = !error;
	} catch {}

	// Migration 0011 non appliquée : repli sur la table clients.
	const db = rpcAnswered ? null : await checkIsClientBannedInDb(userId ?? null, email ?? null);
	if (db) {
		let bannedAt: string | null = null;
		try {
			const q = supabase.from('clients').select('banned_at').or('is_banned.eq.true,ban.eq.oui');
			const { data } = await (userId ? q.eq('id', userId) : q.eq('email', email!.toLowerCase().trim())).limit(1);
			bannedAt = data?.[0]?.banned_at ?? null;
		} catch {}
		return { reason: db.reason, bannedAt, bannedUntil: null };
	}

	const local = getBannedClientRecord(userId ?? null, email ?? null);
	if (local) return { reason: local.reason, bannedAt: local.bannedAt, bannedUntil: null };

	return null;
}

/** Ferme la session locale et efface les données client mises en cache par la démo. */
export async function clearRejectedSession(demoPrefix: string) {
	try {
		// scope local : aucune requête réseau, la session est retirée même si le serveur refuse.
		await supabase.auth.signOut({ scope: 'local' });
	} catch {}
	if (typeof window === 'undefined') return;
	localStorage.removeItem(`${demoPrefix}_client_avatar`);
	localStorage.removeItem(`${demoPrefix}_client_email`);
}

/** Transmet le message à la page de connexion de la démo (après un retour OAuth). */
export function storeBanNotice(notice: BanNotice | null) {
	if (typeof window === 'undefined') return;
	sessionStorage.setItem(NOTICE_KEY, JSON.stringify(notice ?? { reason: null, bannedAt: null, bannedUntil: null }));
}

/** Lit (et efface) le message transmis par storeBanNotice. */
export function takeStoredBanNotice(): BanNotice | null {
	if (typeof window === 'undefined') return null;
	const raw = sessionStorage.getItem(NOTICE_KEY);
	if (!raw) return null;
	sessionStorage.removeItem(NOTICE_KEY);
	try {
		return JSON.parse(raw) as BanNotice;
	} catch {
		return { reason: null, bannedAt: null, bannedUntil: null };
	}
}

export function formatBanDate(value: string): string {
	return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

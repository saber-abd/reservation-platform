// Faux backend Supabase pour les tests : intercepte dans le navigateur les appels
// REST / Auth / RPC et répond avec des données fictives tenues en mémoire.
// Permet de tester dashboards et espaces clients sans base de données.
import { readFileSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';

export type Demo = 'standard' | 'premium' | 'diamant';
export type Role = 'pro' | 'client' | 'anonyme';

const PRO_USER = 'user-pro-0001';
const CLIENT_USER = 'user-client-0001';
const PRO_ID = 'pro-0001';

/** Référence du projet Supabase (premier libellé de l'hôte), lue dans .env : sert de clé de session. */
function projectRef(): string {
	try {
		const env = readFileSync('.env', 'utf8');
		const url = env.match(/^PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
		if (url) return new URL(url).hostname.split('.')[0];
	} catch {}
	return 'placeholder';
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

function fakeSession(role: Exclude<Role, 'anonyme'>) {
	const id = role === 'pro' ? PRO_USER : CLIENT_USER;
	const email = role === 'pro' ? 'gerante@exemple.fr' : 'camille.durand@exemple.fr';
	const exp = Math.floor(Date.now() / 1000) + 3600 * 24 * 365;
	const user = {
		id,
		aud: 'authenticated',
		role: 'authenticated',
		email,
		app_metadata: { provider: 'email' },
		user_metadata: { full_name: role === 'pro' ? 'Hélène Marchand' : 'Camille Durand' },
		created_at: '2026-01-10T09:00:00.000Z',
	};
	return {
		access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, email, role: 'authenticated', aud: 'authenticated', exp })}.signature`,
		token_type: 'bearer',
		expires_in: 3600 * 24 * 365,
		expires_at: exp,
		refresh_token: 'jeton-de-test',
		user,
	};
}

const day = (offset: number, hour: number, minutes = 0) => {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	d.setHours(hour, minutes, 0, 0);
	return d;
};

const CATALOGUE: Record<Demo, { business: string; activity: string; services: [string, string, number, number][] }> = {
	standard: {
		business: 'TechDom',
		activity: 'Dépannage Informatique',
		services: [
			['Diagnostic complet', 'Diagnostic', 30, 39],
			['Remplacement batterie', 'Réparation', 30, 49],
			['Nettoyage logiciel et virus', 'Logiciel', 60, 59],
			['Mise à niveau composants PC', 'Matériel', 60, 79],
		],
	},
	premium: {
		business: 'Premium Auto',
		activity: 'Garage automobile',
		services: [
			['Vidange et filtre à huile', 'Entretien', 60, 89],
			['Plaquettes de frein', 'Freinage', 90, 129],
			['Diagnostic électronique', 'Diagnostic', 45, 59],
			['Recharge de climatisation', 'Confort', 60, 99],
		],
	},
	diamant: {
		business: 'Maison Prestige',
		activity: 'Coiffeur',
		services: [
			['Coupe femme', 'Coupe', 45, 45],
			['Coupe homme', 'Coupe', 30, 30],
			['Coloration', 'Couleur', 90, 75],
			['Balayage', 'Couleur', 120, 95],
			['Soin capillaire', 'Soin', 30, 35],
		],
	},
};

const CLIENTS = [
	[CLIENT_USER, 'Camille Durand', '06 00 00 00 01', 'camille.durand@exemple.fr'],
	['client-0002', 'Sofiane Benali', '06 00 00 00 02', 'sofiane.benali@exemple.fr'],
	['client-0003', 'Élodie Martin', '06 00 00 00 03', 'elodie.martin@exemple.fr'],
	['client-0004', 'Julien Perrin', '06 00 00 00 04', 'julien.perrin@exemple.fr'],
] as const;

type Row = Record<string, any>;

/** Jeu de données fictif d'une démo. */
export function buildFixtures(demo: Demo): Record<string, Row[]> {
	const cat = CATALOGUE[demo];
	const created = '2026-02-01T09:00:00.000Z';

	const professionals: Row[] = [{
		id: PRO_ID, user_id: PRO_USER, business_name: cat.business, activity: cat.activity,
		description: 'Établissement fictif utilisé pour les tests automatiques.',
		phone: '01 00 00 00 00', email: 'contact@exemple.fr', address: '1 rue de Test, 75000 Paris',
		logo_url: null, avatar_url: null, opening_hours: null, tag_bd: demo,
	}];

	const services: Row[] = cat.services.map(([name, category, duration_minutes, price], i) => ({
		id: `service-000${i + 1}`, professional_id: PRO_ID, name, category, description: `${name} (donnée de test).`,
		duration_minutes, price, is_active: true, is_deleted: false, image_url: null, created_at: created, tag_bd: demo,
	}));

	const clients: Row[] = CLIENTS.map(([id, full_name, phone, email]) => ({
		id, user_id: id, full_name, phone, email, avatar_url: null, created_at: created, tag_bd: demo,
		is_banned: false, ban: 'non', ban_reason: null, banned_at: null,
	}));

	// Rendez-vous répartis avant et après aujourd'hui, dans tous les statuts.
	const plan: [number, number, number, number, string][] = [
		[-40, 10, 0, 0, 'completed'], [-26, 14, 1, 0, 'completed'], [-12, 9, 2, 0, 'completed'],
		[-9, 11, 0, 1, 'completed'], [-5, 15, 1, 2, 'completed'], [-3, 10, 2, 3, 'cancelled'],
		[1, 10, 0, 0, 'confirmed'], [2, 14, 1, 1, 'pending'], [4, 9, 2, 2, 'pending'], [6, 16, 0, 3, 'confirmed'],
	];
	const appointments: Row[] = plan.map(([offset, hour, s, c, status], i) => {
		const service = services[s % services.length];
		const client = clients[c];
		const start = day(offset, hour);
		const end = new Date(start.getTime() + service.duration_minutes * 60000);
		return {
			id: `rdv-00${String(i + 1).padStart(2, '0')}`, professional_id: PRO_ID, service_id: service.id, availability_id: null,
			client_id: client.id, client_name: client.full_name, client_email: client.email, client_phone: client.phone,
			start_time: start.toISOString(), end_time: end.toISOString(), status,
			created_at: day(offset - 3, 12).toISOString(), tag_bd: demo,
			// Jointures demandées par certaines requêtes (services(...), clients(...))
			services: { name: service.name, duration_minutes: service.duration_minutes, price: service.price },
			clients: { id: client.id, full_name: client.full_name, phone: client.phone, avatar_url: null, created_at: created, tag_bd: demo },
		};
	});

	const availability_rules: Row[] = [{
		id: 'regle-0001', professional_id: PRO_ID, days_of_week: [1, 2, 3, 4, 5, 6], start_time: '09:00:00', end_time: '18:00:00',
		slot_duration_minutes: 30, is_exception: false, exception_date: null, created_at: created, tag_bd: demo,
	}];

	const messages: Row[] = [
		{ id: 'msg-0001', professional_id: PRO_ID, client_id: CLIENT_USER, sender: 'client', body: 'Bonjour, puis-je décaler mon rendez-vous ?', created_at: day(-1, 9).toISOString(), read_at: null, tag_bd: demo },
		{ id: 'msg-0002', professional_id: PRO_ID, client_id: CLIENT_USER, sender: 'professional', body: 'Bonjour, oui bien sûr. Quel créneau vous arrange ?', created_at: day(-1, 10).toISOString(), read_at: null, tag_bd: demo },
	];

	const client_notes: Row[] = [{
		id: 'note-0001', professional_id: PRO_ID, client_id: CLIENT_USER, content: 'Note de test.', note: 'Note de test.', updated_at: created, created_at: created, tag_bd: demo,
	}];

	const team_members: Row[] = [
		{ id: 'membre-0001', name: 'Hélène Marchand', email: 'gerante@exemple.fr', role: 'admin', specialty: 'Gérante', status: 'active', created_at: created },
		{ id: 'membre-0002', name: 'Thomas Leroy', email: 'thomas.leroy@exemple.fr', role: 'employee', specialty: 'Coloriste', status: 'active', created_at: created },
	];

	return { professionals, services, clients, appointments, availability_rules, availabilities: [], messages, client_notes, team_members };
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns', 'or', 'and', 'not']);

/** Applique les filtres PostgREST simples (eq, neq, in, is, gt(e), lt(e), like) ; ignore le reste. */
function applyFilters(rows: Row[], params: URLSearchParams): Row[] {
	let out = rows;
	for (const [col, raw] of params) {
		if (RESERVED.has(col) || col.includes('.')) continue;
		const dot = raw.indexOf('.');
		if (dot < 0) continue;
		const op = raw.slice(0, dot);
		const val = raw.slice(dot + 1);
		const has = (r: Row) => col in r;
		const str = (v: unknown) => (v === null || v === undefined ? 'null' : String(v));
		switch (op) {
			case 'eq': out = out.filter((r) => !has(r) || str(r[col]) === val); break;
			case 'neq': out = out.filter((r) => !has(r) || str(r[col]) !== val); break;
			case 'in': {
				const list = val.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/^"|"$/g, ''));
				out = out.filter((r) => !has(r) || list.includes(str(r[col])));
				break;
			}
			case 'is': out = out.filter((r) => !has(r) || str(r[col]) === val); break;
			case 'gte': out = out.filter((r) => !has(r) || str(r[col]) >= val); break;
			case 'gt': out = out.filter((r) => !has(r) || str(r[col]) > val); break;
			case 'lte': out = out.filter((r) => !has(r) || str(r[col]) <= val); break;
			case 'lt': out = out.filter((r) => !has(r) || str(r[col]) < val); break;
			case 'like':
			case 'ilike': {
				const needle = val.replace(/[%*]/g, '').toLowerCase();
				out = out.filter((r) => !has(r) || str(r[col]).toLowerCase().includes(needle));
				break;
			}
		}
	}
	const order = params.get('order');
	if (order) {
		const [col, dir] = order.split(',')[0].split('.');
		out = [...out].sort((a, b) => (str2(a[col]) < str2(b[col]) ? -1 : str2(a[col]) > str2(b[col]) ? 1 : 0));
		if (dir === 'desc') out.reverse();
	}
	const limit = params.get('limit');
	return limit ? out.slice(0, Number(limit)) : out;
}
const str2 = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export interface MockOptions {
	demo: Demo;
	role?: Role;
	/** Rôle professionnel renvoyé par my_pro_context (Diamant : admin, employee, demo). */
	proRole?: 'admin' | 'employee' | 'demo';
}

/**
 * Installe le faux backend sur la page. À appeler avant page.goto().
 * Renvoie les écritures reçues (méthode, table, corps) pour les assertions.
 */
export async function mockSupabase(page: Page, { demo, role = 'anonyme', proRole = 'admin' }: MockOptions) {
	const db = buildFixtures(demo);
	const writes: { method: string; table: string; body: unknown }[] = [];
	const json = (route: Route, body: unknown, status = 200, headers: Record<string, string> = {}) =>
		route.fulfill({
			status,
			contentType: 'application/json',
			headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...headers },
			body: JSON.stringify(body),
		});

	if (role !== 'anonyme') {
		const session = fakeSession(role);
		await page.addInitScript(
			([key, value]) => {
				try { localStorage.setItem(key, value); } catch {}
			},
			[`sb-${projectRef()}-auth-token`, JSON.stringify(session)] as const,
		);
	}

	await page.route(/supabase\.co\/(rest|auth|storage|realtime|functions)\/v1\//, async (route) => {
		const req = route.request();
		const url = new URL(req.url());
		const method = req.method();
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
		}

		// --- Auth ---
		if (url.pathname.includes('/auth/v1/')) {
			if (role === 'anonyme') return json(route, { code: 401, error_code: 'no_session', msg: 'Aucune session' }, 401);
			const session = fakeSession(role);
			if (url.pathname.endsWith('/user')) return json(route, session.user);
			if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
			return json(route, session);
		}

		// --- Fonctions RPC ---
		const rpc = url.pathname.match(/\/rest\/v1\/rpc\/([a-z_]+)/)?.[1];
		if (rpc) {
			if (rpc === 'my_pro_context') {
				return json(route, role === 'pro'
					? { role: proRole, owner: proRole === 'admin', professional_id: PRO_ID, name: 'Hélène Marchand', email: 'gerante@exemple.fr', tag_bd: demo, specialty: 'Gérante' }
					: null);
			}
			if (rpc === 'get_ban_status') return json(route, null);
			writes.push({ method: 'RPC', table: rpc, body: req.postDataJSON?.() ?? null });
			return json(route, null);
		}

		// --- Tables ---
		const table = url.pathname.match(/\/rest\/v1\/([a-z_]+)/)?.[1];
		if (!table) return json(route, []);
		const rows = (db[table] ??= []);
		const wantsObject = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
		const reply = (list: Row[]) => {
			if (!wantsObject) return json(route, list, 200, { 'content-range': `0-${Math.max(list.length - 1, 0)}/${list.length}` });
			if (!list.length) return json(route, { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'Aucune ligne' }, 406);
			return json(route, list[0]);
		};

		if (method === 'GET' || method === 'HEAD') return reply(applyFilters(rows, url.searchParams));

		const body = (() => { try { return req.postDataJSON(); } catch { return null; } })();
		writes.push({ method, table, body });
		if (method === 'POST') {
			const created = (Array.isArray(body) ? body : [body ?? {}]).map((b: Row, i: number) => ({
				id: `${table}-nouveau-${rows.length + i + 1}`, created_at: new Date().toISOString(), ...b,
			}));
			rows.push(...created);
			return reply(created);
		}
		const matched = applyFilters(rows, url.searchParams);
		if (method === 'PATCH') {
			matched.forEach((r) => Object.assign(r, body ?? {}));
			return reply(matched);
		}
		if (method === 'DELETE') {
			matched.forEach((r) => rows.splice(rows.indexOf(r), 1));
			return reply(matched);
		}
		return json(route, []);
	});

	return { db, writes };
}

/** Erreurs console à ignorer : le rendu serveur et les pages sans mock appellent le vrai Supabase. */
export const isNoise = (text: string) =>
	/supabase|ERR_NAME_NOT_RESOLVED|Failed to load resource|tile\.openstreetmap|favicon/i.test(text);

import type { APIRoute } from 'astro';
import { getServerEnv } from '@/lib/server/env';

// Gestion des comptes collaborateurs. Seul endroit qui utilise la clé service_role :
// l'appelant doit être connecté (JWT Supabase) ET propriétaire/admin de l'établissement.

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;
const ROLES = ['admin', 'employee', 'demo'];

export const POST: APIRoute = async ({ request }) => {
	const SUPABASE_URL = getServerEnv('PUBLIC_SUPABASE_URL');
	const ANON_KEY = getServerEnv('PUBLIC_SUPABASE_ANON_KEY');
	const SERVICE_KEY = getServerEnv('SUPABASE_SECRET_KEY') || getServerEnv('SUPABASE_SERVICE_ROLE_KEY');

	if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
		console.error('SUPABASE_SERVICE_ROLE_KEY ou variables Supabase manquantes côté serveur');
		return json({ error: 'Service unavailable' }, 500);
	}

	const origin = request.headers.get('origin');
	if (!origin || new URL(origin).host !== new URL(request.url).host) {
		return json({ error: 'Forbidden' }, 403);
	}

	const service = (path: string, init: RequestInit = {}) =>
		fetch(`${SUPABASE_URL}${path}`, {
			...init,
			headers: {
				apikey: SERVICE_KEY,
				// Les nouvelles clés "sb_secret_..." ne sont pas des JWT : l'en-tête apikey suffit.
				// L'ancienne clé service_role (JWT) doit aussi être envoyée en Authorization.
				...(SERVICE_KEY.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${SERVICE_KEY}` }),
				'Content-Type': 'application/json',
				...(init.headers || {}),
			},
		});

	try {
		// 1. Qui appelle ? (vérification du JWT auprès de Supabase)
		const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
		if (!token) return json({ error: 'Unauthorized' }, 401);
		const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
			headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
		});
		if (!who.ok) return json({ error: 'Unauthorized' }, 401);
		const caller = await who.json();

		// 2. L'appelant est-il propriétaire ou admin actif d'un établissement ?
		let professionalId: string | null = null;
		let tagBd = 'diamant';
		const owned = await (await service(`/rest/v1/professionals?user_id=eq.${caller.id}&select=id,tag_bd&limit=1`)).json();
		if (Array.isArray(owned) && owned[0]) {
			professionalId = owned[0].id;
			tagBd = owned[0].tag_bd || tagBd;
		} else {
			const adm = await (
				await service(`/rest/v1/team_members?user_id=eq.${caller.id}&role=eq.admin&status=eq.active&select=professional_id,tag_bd&limit=1`)
			).json();
			if (Array.isArray(adm) && adm[0]) {
				professionalId = adm[0].professional_id;
				tagBd = adm[0].tag_bd || tagBd;
			}
		}
		if (!professionalId) return json({ error: 'Forbidden' }, 403);

		const body = await request.json();
		const action = body?.action;

		// 3. Actions
		if (action === 'create') {
			const { name, email, password, role, specialty } = body;
			if (
				typeof name !== 'string' || name.trim().length < 2 ||
				typeof email !== 'string' || !EMAIL_RE.test(email) ||
				typeof password !== 'string' || password.length < 8 ||
				!ROLES.includes(role)
			) {
				return json({ error: 'Invalid request' }, 400);
			}
			const created = await service('/auth/v1/admin/users', {
				method: 'POST',
				body: JSON.stringify({
					email: email.trim().toLowerCase(),
					password,
					email_confirm: true,
					user_metadata: { account_role: 'pro', full_name: name.trim(), demo_tag: tagBd },
				}),
			});
			if (!created.ok) {
				console.error('Création utilisateur:', created.status, await created.text());
				return json({ error: 'Account could not be created (email already used?)' }, 400);
			}
			const user = await created.json();
			// Le trigger d'inscription a créé une fiche "client" : un collaborateur n'est pas un client.
			await service(`/rest/v1/clients?id=eq.${user.id}`, { method: 'DELETE' });

			const inserted = await service('/rest/v1/team_members', {
				method: 'POST',
				headers: { Prefer: 'return=representation' },
				body: JSON.stringify({
					professional_id: professionalId,
					user_id: user.id,
					name: name.trim(),
					email: email.trim().toLowerCase(),
					role,
					specialty: typeof specialty === 'string' ? specialty.trim().slice(0, 120) : null,
					tag_bd: tagBd,
				}),
			});
			if (!inserted.ok) {
				console.error('Insertion team_members:', inserted.status, await inserted.text());
				await service(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' });
				return json({ error: 'Account could not be created' }, 500);
			}
			const [row] = await inserted.json();
			return json({ member: row });
		}

		// update / delete : la cible doit appartenir au même établissement
		const id = body?.id;
		if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Invalid request' }, 400);
		const targetRes = await (
			await service(`/rest/v1/team_members?id=eq.${id}&professional_id=eq.${professionalId}&select=*&limit=1`)
		).json();
		const target = Array.isArray(targetRes) ? targetRes[0] : null;
		if (!target) return json({ error: 'Not found' }, 404);

		if (action === 'update') {
			const changes = body.changes || {};
			const patch: Record<string, unknown> = {};
			if (typeof changes.name === 'string' && changes.name.trim().length >= 2) patch.name = changes.name.trim();
			if (typeof changes.specialty === 'string') patch.specialty = changes.specialty.trim().slice(0, 120);
			if (changes.role !== undefined) {
				if (!ROLES.includes(changes.role)) return json({ error: 'Invalid request' }, 400);
				patch.role = changes.role;
			}
			if (changes.status !== undefined) {
				if (!['active', 'suspended'].includes(changes.status)) return json({ error: 'Invalid request' }, 400);
				patch.status = changes.status;
			}

			const authPatch: Record<string, unknown> = {};
			if (changes.email !== undefined) {
				if (typeof changes.email !== 'string' || !EMAIL_RE.test(changes.email)) return json({ error: 'Invalid request' }, 400);
				patch.email = changes.email.trim().toLowerCase();
				authPatch.email = patch.email;
				authPatch.email_confirm = true;
			}
			if (changes.password) {
				if (typeof changes.password !== 'string' || changes.password.length < 8) return json({ error: 'Invalid request' }, 400);
				authPatch.password = changes.password;
			}
			if (patch.status) authPatch.ban_duration = patch.status === 'suspended' ? '876000h' : 'none';

			if (Object.keys(authPatch).length > 0) {
				const r = await service(`/auth/v1/admin/users/${target.user_id}`, { method: 'PUT', body: JSON.stringify(authPatch) });
				if (!r.ok) {
					console.error('Mise à jour utilisateur:', r.status, await r.text());
					return json({ error: 'Update failed' }, 400);
				}
			}
			if (Object.keys(patch).length > 0) {
				const r = await service(`/rest/v1/team_members?id=eq.${id}`, {
					method: 'PATCH',
					headers: { Prefer: 'return=representation' },
					body: JSON.stringify(patch),
				});
				if (!r.ok) {
					console.error('Mise à jour team_members:', r.status, await r.text());
					return json({ error: 'Update failed' }, 500);
				}
				const [row] = await r.json();
				return json({ member: row });
			}
			return json({ member: target });
		}

		if (action === 'delete') {
			if (target.user_id === caller.id) return json({ error: 'You cannot delete your own account' }, 400);
			await service(`/rest/v1/team_members?id=eq.${id}`, { method: 'DELETE' });
			await service(`/auth/v1/admin/users/${target.user_id}`, { method: 'DELETE' });
			return json({ success: true });
		}

		return json({ error: 'Invalid request' }, 400);
	} catch (error) {
		console.error('Erreur /api/team:', error);
		return json({ error: 'Internal error' }, 500);
	}
};

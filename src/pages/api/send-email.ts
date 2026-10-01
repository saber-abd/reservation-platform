import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/server/env';

/**
 * Envoi d'emails transactionnels via l'API REST d'EmailJS (appelée côté serveur).
 *
 * L'endpoint n'accepte plus de `to` / `subject` / `html` libres (relais ouvert) :
 * le client envoie un `type` et des données, le serveur construit le mail
 * à partir d'un modèle, échappe toutes les valeurs et choisit lui-même les destinataires.
 *
 * - `reservation_request` / `intervention_request` : possible sans compte (réservation invité),
 *   mais uniquement vers l'email saisi dans le formulaire et l'email du pro lu en base.
 * - `new_message` : session Supabase obligatoire (header `Authorization: Bearer <access_token>`),
 *   l'expéditeur doit faire partie de la conversation ; le destinataire est résolu côté serveur.
 */

// Identifiants publics déjà utilisés par les formulaires de contact (src/pages/demo-*/contact.astro).
const DEFAULT_EMAILJS_SERVICE_ID = 'service_7pvm3br';
const DEFAULT_EMAILJS_PUBLIC_KEY = '5Jjd71i9EWOeYyzsG';

const MAX_FIELD = 200;
const MAX_MESSAGE = 2000;
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

type EmailPayload =
	| {
			type: 'reservation_request';
			professionalId: string;
			clientName: string;
			clientEmail: string;
			serviceName: string;
			dateLabel: string;
	  }
	| {
			type: 'intervention_request';
			clientName: string;
			clientEmail: string;
			serviceName: string;
			dateLabel: string;
	  }
	| {
			type: 'new_message';
			professionalId: string;
			clientId: string;
			text: string;
	  };

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Retire les retours à la ligne (évite l'injection d'en-têtes dans le sujet). */
function oneLine(value: string): string {
	return value.replace(/[\r\n]+/g, ' ').trim();
}

function str(value: unknown, max = MAX_FIELD): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed || trimmed.length > max) return null;
	return trimmed;
}

function parsePayload(data: any): EmailPayload | null {
	if (!data || typeof data !== 'object') return null;
	switch (data.type) {
		case 'reservation_request':
		case 'intervention_request': {
			const clientName = str(data.clientName);
			const clientEmail = str(data.clientEmail);
			const serviceName = str(data.serviceName);
			const dateLabel = str(data.dateLabel);
			if (!clientName || !clientEmail || !EMAIL_RE.test(clientEmail) || !serviceName || !dateLabel) return null;
			if (data.type === 'intervention_request') {
				return { type: data.type, clientName, clientEmail, serviceName, dateLabel };
			}
			const professionalId = str(data.professionalId);
			if (!professionalId) return null;
			return { type: data.type, professionalId, clientName, clientEmail, serviceName, dateLabel };
		}
		case 'new_message': {
			const professionalId = str(data.professionalId);
			const clientId = str(data.clientId);
			const text = str(data.text, MAX_MESSAGE);
			if (!professionalId || !clientId || !text) return null;
			return { type: data.type, professionalId, clientId, text };
		}
		default:
			return null;
	}
}

/** Refuse les appels venant d'un autre site (le formulaire est toujours sur le même domaine). */
function isSameOrigin(request: Request): boolean {
	const origin = request.headers.get('origin');
	if (!origin) return false;
	try {
		return new URL(origin).host === new URL(request.url).host;
	} catch {
		return false;
	}
}

function supabaseFor(accessToken?: string) {
	const url = getServerEnv('PUBLIC_SUPABASE_URL');
	const anonKey = getServerEnv('PUBLIC_SUPABASE_ANON_KEY');
	if (!url || !anonKey) throw new Error('Supabase is not configured on the server');
	return createClient(url, anonKey, {
		auth: { persistSession: false, autoRefreshToken: false },
		global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
	});
}

function bearerToken(request: Request): string | null {
	const header = request.headers.get('authorization') || '';
	const match = header.match(/^Bearer\s+(.+)$/i);
	return match ? match[1].trim() : null;
}

interface BuiltEmail {
	to: string[];
	subject: string;
	html: string;
}

class HttpError extends Error {
	constructor(public status: number, message: string) {
		super(message);
	}
}

async function buildEmail(payload: EmailPayload, request: Request): Promise<BuiltEmail> {
	if (payload.type === 'intervention_request') {
		const name = escapeHtml(payload.clientName);
		const service = escapeHtml(payload.serviceName);
		const date = escapeHtml(payload.dateLabel);
		return {
			to: [payload.clientEmail],
			subject: oneLine(`Demande d'intervention reçue - ${payload.serviceName}`),
			html: `<p>Bonjour ${name},</p>
<p>Votre demande d'intervention pour <strong>${service}</strong> a bien été enregistrée dans notre agenda.</p>
<p><strong>Date :</strong> ${date}</p>
<p>Notre technicien vous contactera prochainement.</p>`,
		};
	}

	if (payload.type === 'reservation_request') {
		const { data: professional, error } = await supabaseFor()
			.from('professionals')
			.select('email')
			.eq('id', payload.professionalId)
			.maybeSingle();
		if (error) throw error;
		if (!professional) throw new HttpError(404, 'Professionnel introuvable');

		const to = [payload.clientEmail];
		if (professional.email && professional.email !== payload.clientEmail) to.push(professional.email);

		const name = escapeHtml(payload.clientName);
		const service = escapeHtml(payload.serviceName);
		const date = escapeHtml(payload.dateLabel);
		return {
			to,
			subject: oneLine(`Demande de réservation reçue - ${payload.serviceName}`),
			html: `<p>Bonjour ${name},</p>
<p>Votre demande de réservation pour <strong>${service}</strong> a bien été reçue.</p>
<p><strong>Date :</strong> ${date}</p>
<p>Elle sera confirmée prochainement par le professionnel.</p>`,
		};
	}

	// new_message : session obligatoire
	const token = bearerToken(request);
	if (!token) throw new HttpError(401, 'Authentification requise');
	const db = supabaseFor(token);
	const { data: userData, error: userError } = await db.auth.getUser(token);
	if (userError || !userData.user) throw new HttpError(401, 'Session invalide');
	const userId = userData.user.id;

	const { data: professional, error: proError } = await db
		.from('professionals')
		.select('email, user_id')
		.eq('id', payload.professionalId)
		.maybeSingle();
	if (proError) throw proError;
	if (!professional) throw new HttpError(404, 'Professionnel introuvable');

	let recipient: string | null = null;
	if (userId === payload.clientId) {
		// Le client écrit au pro.
		recipient = professional.email ?? null;
	} else if (professional.user_id === userId) {
		// Le pro écrit au client : email déduit de ses réservations (RLS appliquées avec la session du pro).
		const { data: appointment, error: aptError } = await db
			.from('appointments')
			.select('client_email')
			.eq('professional_id', payload.professionalId)
			.eq('client_id', payload.clientId)
			.order('start_time', { ascending: false })
			.limit(1)
			.maybeSingle();
		if (aptError) throw aptError;
		recipient = appointment?.client_email ?? null;
	} else {
		throw new HttpError(403, 'Vous ne faites pas partie de cette conversation');
	}

	if (!recipient) throw new HttpError(404, 'Destinataire introuvable');

	const text = escapeHtml(payload.text).replace(/\n/g, '<br>');
	return {
		to: [recipient],
		subject: 'Nouveau message reçu',
		html: `<p>Vous avez reçu un nouveau message :</p><p><em>"${text}"</em></p><p>Connectez-vous pour répondre.</p>`,
	};
}

export const POST: APIRoute = async ({ request }) => {
	try {
		if (!isSameOrigin(request)) {
			return json({ error: 'Origine non autorisée' }, 403);
		}

		const payload = parsePayload(await request.json().catch(() => null));
		if (!payload) {
			return json({ error: 'Requête invalide' }, 400);
		}

		const serviceId = getServerEnv('EMAILJS_SERVICE_ID') || DEFAULT_EMAILJS_SERVICE_ID;
		const publicKey = getServerEnv('EMAILJS_PUBLIC_KEY') || DEFAULT_EMAILJS_PUBLIC_KEY;
		const templateId = getServerEnv('EMAILJS_TEMPLATE_ID');
		const privateKey = getServerEnv('EMAILJS_PRIVATE_KEY');

		if (!templateId || !privateKey) {
			console.error("EMAILJS_TEMPLATE_ID ou EMAILJS_PRIVATE_KEY absente de l'environnement serveur");
			return json({ error: 'EmailJS is not configured' }, 500);
		}

		const email = await buildEmail(payload, request);

		// Optionnel : force tous les envois vers une seule adresse (tests).
		const overrideTo = getServerEnv('EMAIL_OVERRIDE_TO');
		const recipients = overrideTo ? [overrideTo] : email.to;

		// Un envoi par destinataire : le modèle EmailJS utilise {{to_email}} comme destinataire.
		for (const to of recipients) {
			const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					service_id: serviceId,
					template_id: templateId,
					user_id: publicKey,
					accessToken: privateKey,
					template_params: {
						to_email: to,
						subject: email.subject,
						html: email.html,
					},
				}),
			});

			if (!response.ok) {
				// Cause fréquente : "API calls are disabled for non-browser applications"
				// → activer l'option dans EmailJS > Account > Security.
				console.error('Erreur EmailJS:', response.status, await response.text());
				return json({ error: 'Envoi refusé par le fournisseur email' }, 502);
			}
		}

		return json({ success: true }, 200);
	} catch (error: any) {
		if (error instanceof HttpError) {
			return json({ error: error.message }, error.status);
		}
		console.error('Erreur envoi email:', error);
		return json({ error: "Erreur lors de l'envoi de l'email" }, 500);
	}
};

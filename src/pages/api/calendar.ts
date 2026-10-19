import type { APIRoute } from 'astro';
import { SignJWT, importPKCS8 } from 'jose';
import { getServerEnv } from '@/lib/server/env';

const jsonResponse = (body: unknown, status: number) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Limite par IP (par instance Worker) en plus du cookie ci-dessous, qu'un client peut supprimer.
// Une vraie limite globale se règle dans Cloudflare : Security > WAF > Rate limiting rules.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
	const now = Date.now();
	const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
	recent.push(now);
	hits.set(ip, recent);
	if (hits.size > 5000) hits.clear();
	return recent.length > MAX_PER_WINDOW;
}

function validEvent(b: any): boolean {
	if (!b || typeof b !== 'object') return false;
	if (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 200) return false;
	if (b.description !== undefined && (typeof b.description !== 'string' || b.description.length > 2000)) return false;
	const start = typeof b.start_time === 'string' ? new Date(b.start_time) : null;
	const end = typeof b.end_time === 'string' ? new Date(b.end_time) : null;
	if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
	const now = Date.now();
	if (end <= start || end.getTime() - start.getTime() > 8 * 3600_000) return false;
	// Entre hier et dans un an
	return start.getTime() > now - 24 * 3600_000 && start.getTime() < now + 366 * 24 * 3600_000;
}

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
	try {
		// Même origine uniquement
		const origin = request.headers.get('origin');
		if (!origin || new URL(origin).host !== new URL(request.url).host) {
			return jsonResponse({ error: 'Forbidden' }, 403);
		}
		const ip = request.headers.get('cf-connecting-ip') || clientAddress || 'unknown';
		if (rateLimited(ip)) {
			return jsonResponse({ error: 'Trop de requêtes, réessayez dans quelques minutes.' }, 429);
		}

		// --- Rate Limiting Logic ---
		const historyCookie = cookies.get('calendar_sync_history');
		let history: number[] = [];
		
		if (historyCookie && historyCookie.value) {
			try {
				history = JSON.parse(historyCookie.value);
			} catch (e) {
				history = [];
			}
		}

		const now = Date.now();
		// Max 3 reservations
		if (history.length >= 3) {
			return new Response(JSON.stringify({ error: 'Vous avez atteint la limite de 3 réservations pour cette session.' }), {
				status: 429,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// 5 minutes interval
		if (history.length > 0) {
			const lastBooking = history[history.length - 1];
			const fiveMinutes = 5 * 60 * 1000;
			if (now - lastBooking < fiveMinutes) {
				const waitTime = Math.ceil((fiveMinutes - (now - lastBooking)) / 60000);
				return new Response(JSON.stringify({ error: `Veuillez patienter encore ${waitTime} minute(s) avant votre prochaine réservation.` }), {
					status: 429,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		// Update history
		history.push(now);
		cookies.set('calendar_sync_history', JSON.stringify(history), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 // 24 hours
		});
		// ---------------------------

		const body = await request.json();
		if (!validEvent(body)) {
			return jsonResponse({ error: 'Données de réservation invalides.' }, 400);
		}
		const { title, description, start_time, end_time } = body;

		const clientEmail = getServerEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
		const rawPrivateKey = getServerEnv('GOOGLE_PRIVATE_KEY');
		const calendarId = getServerEnv('GOOGLE_CALENDAR_ID');

		if (!clientEmail || !rawPrivateKey || !calendarId) {
			return new Response(JSON.stringify({ error: 'Google Calendar credentials are not configured on the server' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Gérer les retours à la ligne échappés dans la clé privée
		const privateKeyStr = rawPrivateKey.replace(/\\n/g, '\n');
		
		// Importer la clé privée
		const privateKey = await importPKCS8(privateKeyStr, 'RS256');

		// Créer un JWT pour demander un Access Token à Google OAuth2
		const jwt = await new SignJWT({
			iss: clientEmail,
			scope: 'https://www.googleapis.com/auth/calendar.events',
			aud: 'https://oauth2.googleapis.com/token',
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000),
		})
			.setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
			.sign(privateKey);

		// Echanger le JWT contre un Access Token
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: jwt,
			}),
		});

		const tokenData = await tokenResponse.json();
		if (!tokenResponse.ok) {
			console.error('Erreur authentification Google:', tokenResponse.status, JSON.stringify(tokenData));
			throw new Error('calendar_auth');
		}

		const accessToken = tokenData.access_token;

		// Créer l'événement dans Google Calendar
		const eventResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				summary: title,
				description: description,
				start: {
					dateTime: start_time,
					timeZone: 'Europe/Paris',
				},
				end: {
					dateTime: end_time,
					timeZone: 'Europe/Paris',
				},
			}),
		});

		const eventData = await eventResponse.json();
		if (!eventResponse.ok) {
			console.error('Erreur Google Calendar:', eventResponse.status, JSON.stringify(eventData));
			throw new Error('calendar_event');
		}

		return new Response(JSON.stringify({ success: true, id: eventData.id }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Erreur intégration Calendar:', error);
		return new Response(JSON.stringify({ error: 'Synchronisation du calendrier impossible, réessayez plus tard.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

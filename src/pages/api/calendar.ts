import type { APIRoute } from 'astro';
import { SignJWT, importPKCS8 } from 'jose';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
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
		const { title, description, start_time, end_time } = body;

		const clientEmail = import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
		const rawPrivateKey = import.meta.env.GOOGLE_PRIVATE_KEY;
		const calendarId = import.meta.env.GOOGLE_CALENDAR_ID;

		if (!clientEmail || !rawPrivateKey || !calendarId) {
			return new Response(JSON.stringify({ error: 'Google Calendar credentials are not configured in .env' }), {
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
			throw new Error(`Erreur d'authentification Google: ${JSON.stringify(tokenData)}`);
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
			throw new Error(`Erreur Google Calendar: ${JSON.stringify(eventData)}`);
		}

		return new Response(JSON.stringify({ success: true, event: eventData }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Erreur intégration Calendar:', error);
		return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

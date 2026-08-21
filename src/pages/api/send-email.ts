import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
	try {
		const data = await request.json();
		const { to, subject, html, replyTo } = data;

		if (!to || !subject || !html) {
			return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
		}

		const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;

		if (!RESEND_API_KEY) {
			console.error("RESEND_API_KEY absente de l'environnement serveur (secret runtime Cloudflare non configuré ?)");
			return new Response(JSON.stringify({ error: 'Resend API key is not configured' }), { status: 500 });
		}

		const resendResponse = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${RESEND_API_KEY}`,
			},
			body: JSON.stringify({
				from: import.meta.env.RESEND_FROM_EMAIL || 'Plateforme <onboarding@resend.dev>',
				to: Array.isArray(to) ? to : [to],
				...(replyTo ? { reply_to: replyTo } : {}),
				subject: subject,
				html: html,
			}),
		});

		const result = await resendResponse.json();

		if (!resendResponse.ok) {
			// Cause la plus fréquente en mode "sandbox" Resend (pas de domaine vérifié) :
			// l'API refuse d'envoyer à toute adresse autre que celle du compte Resend lui-même.
			console.error('Erreur Resend:', resendResponse.status, result);
			return new Response(JSON.stringify({ error: result }), { status: resendResponse.status });
		}

		return new Response(JSON.stringify({ success: true, id: result.id }), { status: 200 });
	} catch (error: any) {
		console.error('Erreur envoi email:', error);
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}
};

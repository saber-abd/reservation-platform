import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
	try {
		const data = await request.json();
		const { to, subject, html } = data;

		if (!to || !subject || !html) {
			return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
		}

		const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;

		if (!RESEND_API_KEY) {
			return new Response(JSON.stringify({ error: 'Resend API key is not configured' }), { status: 500 });
		}

		const resendResponse = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${RESEND_API_KEY}`,
			},
			body: JSON.stringify({
				from: 'Plateforme <onboarding@resend.dev>', // Par défaut sur Resend gratuit
				to: [to],
				subject: subject,
				html: html,
			}),
		});

		const result = await resendResponse.json();

		if (!resendResponse.ok) {
			console.error('Erreur Resend:', result);
			return new Response(JSON.stringify({ error: result }), { status: resendResponse.status });
		}

		return new Response(JSON.stringify({ success: true, id: result.id }), { status: 200 });
	} catch (error: any) {
		console.error('Erreur envoi email:', error);
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}
};

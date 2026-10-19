import { defineMiddleware } from 'astro:middleware';

// En-têtes de sécurité appliqués à toutes les réponses SSR.
// Pas de CSP stricte ici : les pages utilisent des scripts inline (AOS, thèmes) ;
// à introduire avec des nonces dans un second temps.
export const onRequest = defineMiddleware(async (_context, next) => {
	const response = await next();
	const headers = new Headers(response.headers);
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	headers.set('Content-Security-Policy', "frame-ancestors 'none'");
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});

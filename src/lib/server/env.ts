import { env as cloudflareEnv } from 'cloudflare:workers';

/**
 * Lit une variable d'environnement serveur.
 *
 * En production sur Cloudflare Workers, les secrets définis dans le dashboard
 * (ou via `wrangler secret put`) ne sont PAS injectés dans `import.meta.env` :
 * ils sont exposés à l'exécution par `env` de `cloudflare:workers`.
 * On garde `import.meta.env` en repli pour le développement local (`.env`).
 */
export function getServerEnv(name: string): string | undefined {
	const runtimeValue = (cloudflareEnv as unknown as Record<string, unknown> | undefined)?.[name];
	if (typeof runtimeValue === 'string' && runtimeValue !== '') return runtimeValue;
	const buildValue = (import.meta.env as Record<string, unknown>)[name];
	return typeof buildValue === 'string' && buildValue !== '' ? buildValue : undefined;
}

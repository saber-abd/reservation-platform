import { execSync } from 'node:child_process';

// Vérifie que le serveur répond ; sinon lance « astro dev » (qui tourne en tâche de fond
// et rend la main) puis attend qu'il soit prêt.
export default async function globalSetup() {
	const base = process.env.BASE_URL ?? 'http://localhost:4321';
	const up = async () => {
		try {
			const res = await fetch(base, { signal: AbortSignal.timeout(20_000) });
			return res.ok;
		} catch {
			return false;
		}
	};
	if (await up()) return;
	if (process.env.BASE_URL) throw new Error(`Le serveur ${base} ne répond pas.`);
	try {
		execSync('npx astro dev --port 4321', { stdio: 'ignore', timeout: 120_000 });
	} catch {
		// Le premier démarrage peut dépasser le délai interne d'Astro : on continue d'attendre.
	}
	for (let i = 0; i < 40; i++) {
		if (await up()) return;
		await new Promise((r) => setTimeout(r, 3000));
	}
	throw new Error(`Impossible de démarrer le serveur de dev sur ${base}.`);
}

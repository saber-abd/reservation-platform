// Captures d'écran des espaces connectés (dashboard pro, espace client) sur le faux backend.
// Inactif dans `npm test` : ne tourne que si CAPTURE_OUT est défini.
//
//   CAPTURE_OUT=dossier CAPTURE_DEMO=diamant CAPTURE_ROLE=pro CAPTURE_PATHS="dashboard/,dashboard/clients" \
//     npx playwright test tests/capture-espaces.spec.ts --project=bureau
//
// Options : CAPTURE_MOBILE=1 (390×844), CAPTURE_REDUCED=1 (mouvement réduit), CAPTURE_FULL=1 (page entière),
// CAPTURE_PROROLE=admin|employee|demo (Diamant). Les fichiers s'appellent <rôle>-<chemin>[-mobile].png.
import { test } from '@playwright/test';
import { mockSupabase, type Demo, type Role } from './support/supabase-mock';

const out = process.env.CAPTURE_OUT;
const demo = (process.env.CAPTURE_DEMO ?? 'diamant') as Demo;
const role = (process.env.CAPTURE_ROLE ?? 'pro') as Role;
const proRole = (process.env.CAPTURE_PROROLE ?? 'admin') as 'admin' | 'employee' | 'demo';
const paths = (process.env.CAPTURE_PATHS ?? '').split(',').map((p) => p.trim()).filter(Boolean);
const mobile = process.env.CAPTURE_MOBILE === '1';

test.describe('captures des espaces', () => {
	test.skip(!out, 'CAPTURE_OUT non défini');
	for (const p of paths) {
		test(`${demo} ${role} ${p}`, async ({ page }) => {
			if (mobile) await page.setViewportSize({ width: 390, height: 844 });
			if (process.env.CAPTURE_REDUCED === '1') await page.emulateMedia({ reducedMotion: 'reduce' });
			const errors: string[] = [];
			page.on('pageerror', (e) => errors.push(e.message));
			await mockSupabase(page, { demo, role, proRole } as never);
			const url = p.startsWith('/') ? p : `/demo-${demo}/${p}`;
			await page.goto(url, { waitUntil: 'load' });
			await page.getByText(/chargement/i).first().waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
			await page.waitForTimeout(1200);
			const name = `${role}-${p.replace(/^\/|\/$/g, '').replace(/[/]/g, '_') || 'index'}${mobile ? '-mobile' : ''}.png`;
			await page.screenshot({ path: `${out}/${name}`, fullPage: process.env.CAPTURE_FULL === '1' });
			const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
			console.log(`${url} → ${name}${overflow > 0 ? ` | débordement horizontal ${overflow}px` : ''}${errors.length ? ` | erreurs : ${errors.join(' / ')}` : ''}`);
		});
	}
});

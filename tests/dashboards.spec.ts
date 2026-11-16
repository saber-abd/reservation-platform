// Tableaux de bord et espaces clients, sur un faux backend Supabase (tests/support/supabase-mock.ts).
// Vérifie que chaque page se charge avec une session, affiche les données, et ne lève aucune erreur.
import { test, expect, type Page } from '@playwright/test';
import { CLIENT_PAGES, DASHBOARD_PAGES, DEMOS, PREVIEW_PAGES } from './support/routes';
import { isNoise, mockSupabase } from './support/supabase-mock';

function watchErrors(page: Page) {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(`exception : ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error' && !isNoise(m.text())) errors.push(`console : ${m.text()}`);
	});
	return errors;
}

/** Attend la fin des chargements (indicateurs « Chargement… ») puis renvoie le texte de la page. */
async function settledText(page: Page) {
	await expect(page.getByText(/chargement/i).first()).toBeHidden({ timeout: 20_000 }).catch(() => {});
	await page.waitForTimeout(800);
	return (await page.locator('body').innerText()).replace(/\s+/g, ' ');
}

for (const demo of DEMOS) {
	test.describe(`démo ${demo} : tableau de bord pro`, () => {
		for (const p of DASHBOARD_PAGES[demo]) {
			const path = `/demo-${demo}/dashboard/${p}`;
			test(path, async ({ page }) => {
				const errors = watchErrors(page);
				await mockSupabase(page, { demo, role: 'pro' });
				const res = await page.goto(path, { waitUntil: 'load' });
				expect(res?.status()).toBe(200);
				const text = await settledText(page);
				// La session est reconnue : pas de renvoi vers la connexion.
				expect(page.url()).toContain(`/demo-${demo}/dashboard`);
				expect(text.length, 'contenu du tableau de bord').toBeGreaterThan(200);
				expect(text).not.toMatch(/Établissement introuvable|Erreur inconnue/);
				expect(errors).toEqual([]);
			});
		}

		test(`/demo-${demo}/dashboard/ affiche les rendez-vous`, async ({ page }) => {
			await mockSupabase(page, { demo, role: 'pro' });
			await page.goto(`/demo-${demo}/dashboard/`, { waitUntil: 'load' });
			if (demo !== 'diamant') {
				// Le premier onglet (en attente, confirmés…) ne montre qu'une partie des clients fictifs.
				await expect(page.getByText(/Camille Durand|Sofiane Benali|Élodie Martin|Julien Perrin/).first()).toBeVisible();
			} else {
				await expect(page.getByRole('heading', { name: /vue d'ensemble/i })).toBeVisible();
			}
		});

		test(`/demo-${demo}/dashboard/services liste les prestations`, async ({ page }) => {
			const { db } = await mockSupabase(page, { demo, role: 'pro' });
			await page.goto(`/demo-${demo}/dashboard/services`, { waitUntil: 'load' });
			await expect(page.getByText(db.services[0].name).first()).toBeVisible();
		});

		test(`/demo-${demo}/dashboard/clients liste les clients`, async ({ page }) => {
			await mockSupabase(page, { demo, role: 'pro' });
			await page.goto(`/demo-${demo}/dashboard/clients`, { waitUntil: 'load' });
			await expect(page.getByText('Sofiane Benali').first()).toBeVisible();
		});

		test(`/demo-${demo}/dashboard/ sans session renvoie à la connexion`, async ({ page }) => {
			await mockSupabase(page, { demo, role: 'anonyme' });
			await page.goto(`/demo-${demo}/dashboard/`, { waitUntil: 'load' });
			await page.waitForURL(new RegExp(`/demo-${demo}/connexion`), { timeout: 20_000 });
		});
	});

	test.describe(`démo ${demo} : espace client`, () => {
		for (const p of CLIENT_PAGES[demo]) {
			const path = `/demo-${demo}/espace-client/${p}`;
			test(path, async ({ page }) => {
				const errors = watchErrors(page);
				await mockSupabase(page, { demo, role: 'client' });
				const res = await page.goto(path, { waitUntil: 'load' });
				expect(res?.status()).toBe(200);
				const text = await settledText(page);
				expect(page.url()).toContain(`/demo-${demo}/espace-client`);
				expect(text.length, "contenu de l'espace client").toBeGreaterThan(150);
				expect(errors).toEqual([]);
			});
		}
	});

	test(`démo ${demo} : la réservation propose les prestations`, async ({ page }) => {
		const errors = watchErrors(page);
		const { db } = await mockSupabase(page, { demo });
		await page.goto(`/demo-${demo}/reservation`, { waitUntil: 'load' });
		await expect(page.locator('form, [data-reservation], main').first()).toBeVisible();
		if (demo !== 'standard') {
			// Premium et Diamant lisent les prestations en base (options d'une liste déroulante).
			await expect(page.locator('option', { hasText: db.services[0].name }).first()).toBeAttached();
		}
		expect(errors).toEqual([]);
	});
}

test.describe('aperçu Premium (données fictives, sans compte)', () => {
	for (const path of PREVIEW_PAGES) {
		test(path, async ({ page }) => {
			const errors = watchErrors(page);
			const res = await page.goto(path, { waitUntil: 'load' });
			expect(res?.status()).toBe(200);
			const text = await settledText(page);
			expect(page.url()).toContain('/apercu/dashboard');
			expect(text.length).toBeGreaterThan(200);
			expect(errors).toEqual([]);
		});
	}
});

// Accès visiteur depuis la page de connexion : Premium (aperçu à données fictives) et Diamant
// (compte de démonstration en lecture seule). Standard n'a pas d'accès visiteur.
test('Premium : la connexion propose l’aperçu du tableau de bord', async ({ page }) => {
	await mockSupabase(page, { demo: 'premium' });
	await page.goto('/demo-premium/connexion', { waitUntil: 'load' });
	await expect(page.locator('a[href^="/demo-premium/apercu/dashboard"]').first()).toBeVisible();
});

test('Diamant : la connexion propose le compte de démonstration', async ({ page }) => {
	await mockSupabase(page, { demo: 'diamant' });
	await page.goto('/demo-diamant/connexion', { waitUntil: 'load' });
	await expect(page.getByRole('button', { name: /démonstration|visiteur|démo/i }).first()).toBeVisible();
});

test('Standard : pas d’accès visiteur au tableau de bord', async ({ page }) => {
	await mockSupabase(page, { demo: 'standard' });
	await page.goto('/demo-standard/connexion', { waitUntil: 'load' });
	await expect(page.locator('a[href*="/apercu/"]')).toHaveCount(0);
	await expect(page.getByRole('button', { name: /démonstration|visiteur/i })).toHaveCount(0);
});

test('Diamant : un compte « démo » est en lecture seule', async ({ page }) => {
	const { writes } = await mockSupabase(page, { demo: 'diamant', role: 'pro', proRole: 'demo' });
	await page.goto('/demo-diamant/dashboard/services', { waitUntil: 'load' });
	await settledText(page);
	expect(page.url()).toContain('/demo-diamant/dashboard');
	expect(writes.filter((w) => w.method !== 'RPC')).toEqual([]);
});

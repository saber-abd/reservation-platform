// Pages publiques : chaque page répond, a un titre, ne lève aucune erreur, ne déborde pas
// en largeur, et tout son contenu finit visible une fois la page parcourue (aucun élément
// d'animation resté transparent), y compris en mouvement réduit.
import { test, expect, type Page } from '@playwright/test';
import { COMMERCIAL_PAGES, DEMOS, PUBLIC_PAGES } from './support/routes';
import { isNoise, mockSupabase } from './support/supabase-mock';

function watchErrors(page: Page) {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(`exception : ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error' && !isNoise(m.text())) errors.push(`console : ${m.text()}`);
	});
	return errors;
}

/** Fait défiler toute la page comme un visiteur, puis revient en haut. */
async function scrollThrough(page: Page) {
	const height = await page.evaluate(() => document.documentElement.scrollHeight);
	for (let y = 0; y < height; y += 600) {
		await page.evaluate((top) => window.scrollTo(0, top), y);
		await page.waitForTimeout(80);
	}
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await page.waitForTimeout(700);
}

/** Éléments du socle d'animation restés invisibles alors qu'ils ont été vus. */
const hiddenReveals = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-group] > *'))
			.filter((el) => el.offsetParent !== null && Number(getComputedStyle(el).opacity) < 0.95)
			.map((el) => el.outerHTML.slice(0, 90)),
	);

async function checkPage(page: Page, path: string) {
	const errors = watchErrors(page);
	const res = await page.goto(path, { waitUntil: 'load' });
	expect(res?.status(), `statut HTTP de ${path}`).toBe(200);
	await expect(page.locator('h1').first()).toBeVisible();
	expect((await page.title()).length).toBeGreaterThan(3);

	await scrollThrough(page);
	expect(await hiddenReveals(page), 'éléments restés invisibles après défilement').toEqual([]);

	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
	expect(overflow, 'débordement horizontal (px)').toBeLessThanOrEqual(1);

	// Aucune image cassée
	const broken = await page.evaluate(() =>
		Array.from(document.images)
			.filter((img) => img.complete && img.naturalWidth === 0 && img.currentSrc)
			.map((img) => img.currentSrc),
	);
	expect(broken, 'images cassées').toEqual([]);
	expect(errors, 'erreurs JavaScript').toEqual([]);
}

test.describe('page commerciale', () => {
	for (const path of COMMERCIAL_PAGES) {
		test(`${path}`, async ({ page }) => {
			await checkPage(page, path);
		});
	}
});

for (const demo of DEMOS) {
	test.describe(`démo ${demo} : site public`, () => {
		test.beforeEach(async ({ page }) => {
			await mockSupabase(page, { demo });
		});
		for (const p of PUBLIC_PAGES) {
			test(`/demo-${demo}/${p}`, async ({ page }) => {
				await checkPage(page, `/demo-${demo}/${p}`);
			});
		}
	});
}

test.describe('mouvement réduit', () => {
	test.use({ reducedMotion: 'reduce' });
	for (const path of ['/', '/demo-standard/', '/demo-premium/', '/demo-diamant/']) {
		test(`${path} reste complet sans animation`, async ({ page }) => {
			await mockSupabase(page, { demo: 'diamant' });
			await page.goto(path, { waitUntil: 'load' });
			await page.waitForTimeout(800);
			// Sans défilement préalable : rien ne doit attendre une animation pour apparaître.
			expect(await hiddenReveals(page)).toEqual([]);
			await expect(page.locator('h1').first()).toBeVisible();
		});
	}
});

test.describe('anciennes dépendances retirées', () => {
	for (const path of ['/', '/demo-standard/', '/demo-premium/', '/demo-diamant/']) {
		test(`${path} n'utilise plus AOS ni les polices sous licence`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'load' });
			expect(await page.locator('[data-aos]').count()).toBe(0);
			const fonts = await page.evaluate(() => Array.from(document.fonts).map((f) => f.family.replace(/["']/g, '')));
			for (const banned of ['Coolvetica', 'Cocogoose', 'Monimer Serif', 'Type Machine', 'Recoleta']) {
				expect(fonts, `police ${banned}`).not.toContain(banned);
			}
		});
	}
});

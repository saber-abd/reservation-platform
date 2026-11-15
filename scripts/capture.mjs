// Capture d'écran d'une page du serveur local, pour vérifier un rendu.
//   node scripts/capture.mjs /demo-diamant/ sortie.png [--mobile] [--full] [--scroll=1800] [--reduced] [--wait=1500]
// Affiche aussi les erreurs console et les requêtes en échec.
import { chromium } from '@playwright/test';

const [rawPath = '/', out = 'capture.png', ...flags] = process.argv.slice(2);
// Git Bash (Windows) réécrit « /demo-x/ » en « C:/Program Files/Git/demo-x/ » : on retire ce préfixe.
// Le chemin peut aussi être donné sans barre initiale (« demo-x/ »), ou « home » pour la racine.
const cleaned = rawPath.replace(/^[A-Za-z]:[\\/].*?[\\/]Git[\\/]?/, '/').replace(/^home$/, '/');
const path = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
const flag = (name) => flags.find((f) => f === `--${name}` || f.startsWith(`--${name}=`));
const value = (name, d) => {
	const f = flag(name);
	return f && f.includes('=') ? Number(f.split('=')[1]) : d;
};
const base = process.env.BASE_URL ?? 'http://localhost:4321';

const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: flag('mobile') ? { width: 390, height: 844 } : { width: 1440, height: 900 },
	deviceScaleFactor: 1,
	isMobile: Boolean(flag('mobile')),
	hasTouch: Boolean(flag('mobile')),
	reducedMotion: flag('reduced') ? 'reduce' : 'no-preference',
});
const page = await context.newPage();
const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 200)}`));
page.on('pageerror', (e) => problems.push(`exception: ${String(e).slice(0, 200)}`));
page.on('requestfailed', (r) => problems.push(`requête échouée: ${r.url().slice(0, 120)}`));

const res = await page.goto(base + path, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(value('wait', 1500));

// Défilement progressif, pour déclencher les animations comme un vrai visiteur.
const wheelTo = async (target, step) => {
	for (let pos = 0; pos < target; pos += step) {
		await page.evaluate((s) => window.scrollBy(0, s), step);
		await page.waitForTimeout(60);
	}
};
const y = value('scroll', 0);
if (y) {
	await wheelTo(y, 300);
	await page.waitForTimeout(900);
}
if (flag('full')) {
	const h = await page.evaluate(() => document.documentElement.scrollHeight);
	await wheelTo(h, 500);
	await page.waitForTimeout(600);
}
await page.screenshot({ path: out, fullPage: Boolean(flag('full')) });
const info = await page.evaluate(() => ({
	hauteur: document.documentElement.scrollHeight,
	debordementHorizontal: document.documentElement.scrollWidth > window.innerWidth,
}));
console.log(JSON.stringify({ statut: res?.status(), ...info, problemes: problems.slice(0, 12) }, null, 1));
await browser.close();

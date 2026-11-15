import { defineConfig, devices } from '@playwright/test';

// Tests de bout en bout (npm test). Le serveur de dev est démarré par tests/support/global-setup.ts
// s'il ne tourne pas déjà. BASE_URL permet de viser un autre serveur (aperçu de build, préproduction).
export default defineConfig({
	testDir: './tests',
	globalSetup: './tests/support/global-setup.ts',
	timeout: 90_000,
	expect: { timeout: 15_000 },
	fullyParallel: true,
	workers: 3,
	retries: 1,
	reporter: [['list']],
	use: {
		baseURL: process.env.BASE_URL ?? 'http://localhost:4321',
		locale: 'fr-FR',
		timezoneId: 'Europe/Paris',
		navigationTimeout: 60_000,
		trace: 'retain-on-failure',
	},
	projects: [
		{ name: 'bureau', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /pages\.spec\.ts/ },
	],
});

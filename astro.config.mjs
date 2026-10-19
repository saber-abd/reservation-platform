// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

import cloudflare from '@astrojs/cloudflare';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'server',
  site: 'https://reservation-platform.demonstration-pro.workers.dev',
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/dashboard') &&
        !page.includes('/connexion') &&
        !page.includes('/inscription') &&
        !page.includes('/espace-client') &&
        !page.includes('/mot-de-passe-oublie') &&
        !page.includes('/reinitialiser-mot-de-passe'),
    }),
  ],
  adapter: cloudflare({
    imageService: 'compile',
    platformProxy: {
      enabled: false
    }
  })
});
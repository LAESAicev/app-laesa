// @ts-check
import { defineConfig, envField } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import { resolve, sep } from 'node:path';

// O painel (/keystatic) roda só em `astro dev` nesta fase: o site publicado continua 100% estático.
// Na Fase 5 ele passa a rodar em produção (modo GitHub), conforme a hospedagem do iCEV (ADR 0001).
const isDev = process.argv.includes('dev');
const { SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

/** Em dev, recarrega a página quando o painel (ou alguém) altera content/: src/lib/content.ts lê o YAML só ao carregar. */
function contentReload() {
  const dir = resolve('content') + sep;
  return {
    name: 'laesa-content-reload',
    /** @param {import('vite').ViteDevServer} server */
    configureServer(server) {
      server.watcher.add(dir);
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(dir)) return;
        for (const env of Object.values(server.environments ?? {})) env.moduleGraph.invalidateAll();
        server.moduleGraph?.invalidateAll();
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

export default defineConfig({
  // Domínio definitivo pendente de resposta do iCEV (ADR 0001): defina SITE_URL no ambiente.
  site: SITE_URL || 'http://localhost:4321',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: isDev ? [react(), keystatic()] : [],
  vite: {
    plugins: isDev ? [contentReload()] : [],
    // O painel só é aberto depois que o servidor já está de pé; sem isto o Vite descobre essas
    // dependências tarde, reotimiza e a página do painel fica em branco ("504 Outdated Optimize Dep").
    optimizeDeps: isDev
      ? { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@keystatic/core', '@keystatic/core/ui', '@keystatic/astro/ui'] }
      : undefined,
  },
  // Contatos e redes da LAESA: valores em .env (modelo em .env.example). São públicos e entram no HTML no build.
  env: {
    schema: {
      PUBLIC_CONTACT_EMAIL: envField.string({ context: 'client', access: 'public' }),
      PUBLIC_LINKEDIN_URL: envField.string({ context: 'client', access: 'public', optional: true, url: true }),
      PUBLIC_GITHUB_URL: envField.string({ context: 'client', access: 'public', optional: true, url: true }),
      PUBLIC_INSTAGRAM_URL: envField.string({ context: 'client', access: 'public', optional: true, url: true }),
    },
    validateSecrets: true,
  },
});

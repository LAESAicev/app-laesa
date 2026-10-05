// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import { resolve, sep } from 'node:path';

// O painel (/keystatic) roda só em `astro dev` nesta fase: o site publicado continua 100% estático.
// Na Fase 5 ele passa a rodar em produção (modo GitHub), conforme a hospedagem do iCEV (ADR 0001).
const isDev = process.argv.includes('dev');

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

// Domínio definitivo pendente de resposta do iCEV (ADR 0001).
export default defineConfig({
  site: 'https://laesa.icev.edu.br',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: isDev ? [react(), keystatic()] : [],
  vite: { plugins: isDev ? [contentReload()] : [] },
});

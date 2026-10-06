// @ts-check
import { defineConfig, envField } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import { resolve, sep } from 'node:path';

// Páginas pré-geradas no build; só as rotas /api/* (contato, inscrição) rodam no servidor Node
// (plano A do ADR 0001: contêiner na VM do iCEV). O painel (/keystatic) roda só em `astro dev` por enquanto;
// na Fase 5 passa a rodar em produção (modo GitHub).
const isDev = process.argv.includes('dev');
const { SITE_URL, TRUST_PROXY } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

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
  build: { format: 'directory' },
  // 64 KB bastam para os formulários; o padrão do adaptador (1 GiB) deixaria o contêiner cair fácil.
  adapter: node({ mode: 'standalone', bodySizeLimit: 64 * 1024 }),
  security: {
    // X-Forwarded-For só é confiável atrás de um proxy que o SOBRESCREVE com o IP real
    // (proxy_set_header X-Forwarded-For $remote_addr) e com o contêiner sem porta exposta. Ligue TRUST_PROXY=1
    // no build só nesse cenário (Fase 5); sem isso o limite usa o IP da conexão.
    allowedDomains: SITE_URL && TRUST_PROXY === '1' ? [{ hostname: new URL(SITE_URL).hostname, protocol: 'https' }] : [],
    // Desligado de propósito: o descadastro de um clique (RFC 8058) chega do Gmail sem Origin e é autorizado pelo
    // token assinado. As APIs se protegem sozinhas (src/lib/http.ts: só application/json + Sec-Fetch-Site).
    // ATENÇÃO: qualquer rota nova que aceite formulário precisa da própria verificação de origem.
    checkOrigin: false,
  },
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

      // Envio de e-mail (conta Google Workspace da LAESA). Sem SMTP_USER/SMTP_PASS o formulário
      // responde "envio indisponível" em vez de quebrar. Lidos em tempo de execução no servidor.
      SMTP_HOST: envField.string({ context: 'server', access: 'secret', default: 'smtp.gmail.com' }),
      SMTP_PORT: envField.number({ context: 'server', access: 'secret', default: 465 }),
      SMTP_USER: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMTP_PASS: envField.string({ context: 'server', access: 'secret', optional: true }),
      MAIL_TO: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Inscrição em avisos: segredo que assina os links de confirmação e descadastro, e onde guardar
      // os inscritos (pendente, ADR 0001 P2). "memoria" serve só para desenvolvimento e testes.
      INSCRICAO_SECRET: envField.string({ context: 'server', access: 'secret', optional: true, min: 32 }),
      INSCRITOS_STORE: envField.enum({ context: 'server', access: 'secret', values: ['memoria'], optional: true }),
    },
    validateSecrets: true,
  },
});

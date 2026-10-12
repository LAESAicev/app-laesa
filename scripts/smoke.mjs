// Smoke test do build (rode depois de `astro build`): node scripts/smoke.mjs
// 1. HTML de dist/client: nenhum <script> inline (a CSP do site é script-src 'self') e todo link interno
//    aponta para um arquivo gerado. 2. Sobe dist/server/entry.mjs sem SMTP e confere algumas rotas, uma vez com a
//    tela de avisos desligada (padrão) e outra ligada, com banco temporário.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const raiz = 'dist/client';
const origem = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : null;
// Rotas que só existem no servidor (não viram arquivo no build)
const soNoServidor = /^\/(api|avisos|keystatic)(\/|$)/;
const falhas = [];

const html = (dir) =>
  readdirSync(dir, { recursive: true }).map((f) => join(dir, f)).filter((f) => f.endsWith('.html'));

const existe = (caminho) =>
  [caminho, join(caminho, 'index.html'), `${caminho}.html`].some((c) => existsSync(c) && statSync(c).isFile());

for (const arquivo of html(raiz)) {
  const texto = readFileSync(arquivo, 'utf8');
  for (const [, attrs] of texto.matchAll(/<script\b([^>]*)>/gi)) {
    if (!/\ssrc=/i.test(attrs) && !/type=["']?application\/(ld\+)?json/i.test(attrs)) {
      falhas.push(`${arquivo}: <script> inline (bloqueado pela CSP)`);
    }
  }
  for (const [, attr, valor] of texto.matchAll(/\s(href|src|srcset|action)="([^"]*)"/gi)) {
    const urls = attr.toLowerCase() === 'srcset' ? valor.split(',').map((s) => s.trim().split(/\s+/)[0]) : [valor];
    for (let url of urls) {
      if (origem && url.startsWith(origem)) url = url.slice(origem.length) || '/';
      if (!url.startsWith('/') || url.startsWith('//')) continue; // externo, mailto:, #âncora
      const caminho = decodeURI(url.split(/[?#]/)[0]);
      if (soNoServidor.test(caminho)) continue;
      if (!existe(join(raiz, caminho))) falhas.push(`${arquivo}: link quebrado ${url}`);
    }
  }
}

// Servidor: sem nenhuma variável SMTP_*, o envio fica indisponível e nenhum e-mail sai daqui.
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('SMTP_')));

/** Sobe dist/server/entry.mjs com `extra` no ambiente, confere as rotas e derruba o servidor. */
async function conferir(porta, extra, checagens) {
  const servidor = spawn('node', ['dist/server/entry.mjs'], {
    env: { ...env, HOST: '127.0.0.1', PORT: porta, INSCRITOS_STORE: 'memoria', PAINEL_AVISOS: 'false', ...extra },
    stdio: 'inherit',
  });
  const base = `http://127.0.0.1:${porta}`;
  try {
    await esperarServidor(base);
    for (const [metodo, rota, esperado, headers, body] of checagens) {
      const { status } = await fetch(base + rota, { method: metodo, headers, body, redirect: 'manual' });
      if (status !== esperado) falhas.push(`${metodo} ${rota} (${extra.PAINEL_AVISOS === 'true' ? 'tela ligada' : 'padrão'}): ${status}, esperado ${esperado}`);
    }
  } catch (e) {
    falhas.push(String(e));
  } finally {
    servidor.kill();
  }
}

async function esperarServidor(base) {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(base);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error('o servidor não subiu em 10 s');
}

const form = { 'content-type': 'application/x-www-form-urlencoded' };

// Padrão: tela de avisos desligada, /mesa não existe.
await conferir('4329', {}, [
  ['GET', '/', 200],
  ['GET', '/atividades', 200],
  ['GET', '/processos-seletivos/2026-2', 200],
  ['GET', '/nao-existe', 404],
  ['GET', '/avisos/confirmar?t=lixo', 200],
  ['POST', '/api/contato', 415, { 'content-type': 'text/plain' }, 'oi'],
  ['GET', '/mesa/avisos', 404],
]);

// Tela ligada (banco SQLite temporário): sem sessão vai para a entrada; POST sem Origin é recusado antes de
// qualquer efeito (nenhum link é pedido, nenhum e-mail sai).
const tmp = mkdtempSync(join(tmpdir(), 'laesa-smoke-'));
try {
  await conferir('4330', { PAINEL_AVISOS: 'true', INSCRITOS_STORE: 'sqlite', INSCRITOS_DB: join(tmp, 'laesa.db'), AVISOS_LOG: join(tmp, 'avisos.log') }, [
    ['GET', '/mesa/avisos', 303],
    ['POST', '/mesa/entrar', 403, form, 'acao=pedir'],
  ]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (falhas.length) {
  console.error(`smoke: ${falhas.length} falha(s)\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}
console.log('smoke: ok');

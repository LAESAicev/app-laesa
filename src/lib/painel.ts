// Login da tela de avisos (/mesa): link de uso único mandado para a caixa da LAESA e sessão guardada no servidor.
// Tabelas painel_* no mesmo SQLite dos inscritos (INSCRITOS_DB). O banco guarda só o sha256 do token do link, do
// nonce da pré-sessão e do id da sessão: quem lê o arquivo (ou um backup) não consegue entrar com o que está lá.
// Módulo puro (sem astro:env): serve ao site (src/middleware.ts e páginas /mesa) e ao comando (avisar.ts sair-todos).
// O nome guardado na sessão é o que a pessoa digitou ao entrar: declarado, não autenticado (a caixa é compartilhada).
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { transacao as emTransacao } from './inscritos-sqlite.ts';

const MIN = 60_000;
export const LINK_MS = 15 * MIN;
export const OCIOSA_MS = 30 * MIN;
export const ABSOLUTA_MS = 2 * 60 * MIN;
/** Links ainda válidos ao mesmo tempo. Passou disso, o pedido é recusado em silêncio (os anteriores continuam valendo). */
const MAX_LINKS = 5;

/** Nonce do navegador que pediu o link: o link só entra no mesmo navegador. */
export const COOKIE_PRE = '__Host-laesa_pre';
export const COOKIE_SESSAO = '__Host-laesa_mesa';
/** Atributos dos dois cookies (formato do Astro), sem a validade: também servem para apagá-los. __Host- exige Secure, Path=/ e nenhum Domain. */
export const ATRIBUTOS_COOKIE = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' };
export const opcoesCookie = (validadeMs: number) => ({ ...ATRIBUTOS_COOKIE, maxAge: validadeMs / 1000 });
export const COOKIE_PRE_OPCOES = opcoesCookie(LINK_MS);
export const COOKIE_SESSAO_OPCOES = opcoesCookie(ABSOLUTA_MS);

/** 32 bytes aleatórios em base64url: token do link, nonce da pré-sessão e id da sessão. */
export const aleatorio = () => randomBytes(32).toString('base64url');
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

/** Nome de quem está usando a tela, como foi digitado (espaços normalizados). undefined se vazio, longo ou com controle. */
export function nomeValido(nome: unknown): string | undefined {
  if (typeof nome !== 'string') return undefined;
  const n = nome.replace(/\s+/g, ' ').trim();
  if (!n || n.length > 60 || /[\p{Cc}\p{Cf}]/u.test(n)) return undefined;
  return n;
}

export type Sessao = { nome: string; criada_em: string };
export type Painel = ReturnType<typeof criarPainel>;

export function criarPainel(caminho: string, relogio: () => Date = () => new Date()) {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA secure_delete = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS painel_links (
      hash TEXT PRIMARY KEY,
      pre TEXT NOT NULL,
      expira_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS painel_sessoes (
      hash TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      criada_em TEXT NOT NULL,
      ultimo_uso TEXT NOT NULL
    );
  `);

  const agora = () => relogio().toISOString();
  const em = (ms: number) => new Date(relogio().getTime() + ms).toISOString();

  const transacao = <T>(fn: () => T): T => emTransacao(db, fn);

  const api = {
    /**
     * Token de um link novo, preso ao nonce da pré-sessão deste navegador, válido por 15 min. undefined se já há
     * 5 links valendo: quem chama responde igual (neutro) e não manda e-mail.
     */
    pedirLink(nonce: string): string | undefined {
      if (!nonce) return undefined;
      return transacao(() => {
        db.prepare('DELETE FROM painel_links WHERE expira_em <= ?').run(agora());
        const { n } = db.prepare('SELECT count(*) AS n FROM painel_links').get() as { n: number };
        if (n >= MAX_LINKS) return undefined;
        const token = aleatorio();
        db.prepare('INSERT INTO painel_links (hash, pre, expira_em) VALUES (?, ?, ?)').run(hash(token), hash(nonce), em(LINK_MS));
        return token;
      });
    },

    /**
     * Consome o link (uma vez só) e abre uma sessão com id novo; devolve o id para o cookie. undefined se o token
     * não existe, venceu ou o nonce não é o do navegador que pediu: nesses casos o link não é consumido.
     * `anterior`: sessão que o navegador já tinha, encerrada no login.
     */
    entrar(token: string, nonce: string, nome: string, anterior?: string): string | undefined {
      const quem = nomeValido(nome);
      if (!token || !nonce || !quem) return undefined;
      return transacao(() => {
        const usado = db.prepare('DELETE FROM painel_links WHERE hash = ? AND pre = ? AND expira_em > ?').run(hash(token), hash(nonce), agora());
        if (usado.changes !== 1) return undefined;
        if (anterior) db.prepare('DELETE FROM painel_sessoes WHERE hash = ?').run(hash(anterior));
        const id = aleatorio();
        db.prepare('INSERT INTO painel_sessoes (hash, nome, criada_em, ultimo_uso) VALUES (?, ?, ?, ?)').run(hash(id), quem, agora(), agora());
        return id;
      });
    },

    /**
     * Sessão válida (30 min sem uso, 2 h no total) e renovada; vencida é apagada. `renovar: false` (recarga
     * automática da página de um envio): confere sem contar como uso, senão a aba aberta nunca venceria.
     */
    sessao(id: string | undefined, { renovar = true } = {}): Sessao | undefined {
      if (!id) return undefined;
      const h = hash(id);
      const s = db.prepare('SELECT nome, criada_em, ultimo_uso FROM painel_sessoes WHERE hash = ?').get(h) as (Sessao & { ultimo_uso: string }) | undefined;
      if (!s) return undefined;
      if (s.ultimo_uso <= em(-OCIOSA_MS) || s.criada_em <= em(-ABSOLUTA_MS)) {
        db.prepare('DELETE FROM painel_sessoes WHERE hash = ?').run(h);
        return undefined;
      }
      if (renovar) db.prepare('UPDATE painel_sessoes SET ultimo_uso = ? WHERE hash = ?').run(agora(), h);
      return { nome: s.nome, criada_em: s.criada_em };
    },

    sair(id: string | undefined): void {
      if (id) db.prepare('DELETE FROM painel_sessoes WHERE hash = ?').run(hash(id));
    },

    /** Encerra todas as sessões e invalida os links pendentes (saída de membro, suspeita de acesso). */
    sairTodos(): { sessoes: number; links: number } {
      return transacao(() => ({
        sessoes: Number(db.prepare('DELETE FROM painel_sessoes').run().changes),
        links: Number(db.prepare('DELETE FROM painel_links').run().changes),
      }));
    },

    /** Apaga links e sessões vencidos. pedirLink já limpa os links; o cron diário (avisar.ts limpar) cobre o resto. */
    limpar(): { sessoes: number; links: number } {
      return transacao(() => ({
        sessoes: Number(db.prepare('DELETE FROM painel_sessoes WHERE ultimo_uso <= ? OR criada_em <= ?').run(em(-OCIOSA_MS), em(-ABSOLUTA_MS)).changes),
        links: Number(db.prepare('DELETE FROM painel_links WHERE expira_em <= ?').run(agora()).changes),
      }));
    },
  };
  return api;
}

const abertos = new Map<string, Painel>();

/** Um painel (uma conexão) por arquivo, por processo: o site abre com INSCRITOS_DB. */
export function painelEm(caminho: string): Painel {
  let p = abertos.get(caminho);
  if (!p) abertos.set(caminho, (p = criarPainel(caminho)));
  return p;
}

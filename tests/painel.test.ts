import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ABSOLUTA_MS, COOKIE_PRE, COOKIE_PRE_OPCOES, COOKIE_SESSAO, COOKIE_SESSAO_OPCOES, LINK_MS, OCIOSA_MS, aleatorio, criarPainel, nomeValido, painelEm } from '../src/lib/painel';

let dir: string;
let n = 0;
let agora = Date.parse('2026-10-15T12:00:00Z');
const relogio = () => new Date(agora);

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'laesa-painel-'));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function cenario() {
  const caminho = join(dir, `painel-${++n}.db`);
  const painel = criarPainel(caminho, relogio);
  const nonce = aleatorio();
  return { caminho, painel, nonce, token: painel.pedirLink(nonce)! };
}

describe('painel: link de entrada', () => {
  it('link certo, no navegador que pediu, entra uma vez só', () => {
    const { painel, nonce, token } = cenario();
    const id = painel.entrar(token, nonce, 'Ana');
    expect(id).toMatch(/^[\w-]{43}$/);
    expect(painel.sessao(id)).toMatchObject({ nome: 'Ana' });
    expect(painel.entrar(token, nonce, 'Ana')).toBeUndefined();
  });

  it('sem o cookie de pré-sessão ou com o de outro navegador falha e não consome o link', () => {
    const { painel, nonce, token } = cenario();
    expect(painel.entrar(token, '', 'Ana')).toBeUndefined();
    expect(painel.entrar(token, aleatorio(), 'Ana')).toBeUndefined();
    expect(painel.entrar(token, nonce, 'Ana')).toBeDefined(); // o dono do link ainda entra
  });

  it('nome vazio ou inválido não entra e não consome o link', () => {
    const { painel, nonce, token } = cenario();
    expect(painel.entrar(token, nonce, '   ')).toBeUndefined();
    expect(painel.entrar(token, nonce, 'Ana\u202e')).toBeUndefined();
    expect(painel.entrar(token, nonce, '  Ana   Souza ')).toBeDefined();
    expect(nomeValido('  Ana \n Souza ')).toBe('Ana Souza');
    expect(nomeValido('x'.repeat(61))).toBeUndefined();
    expect(nomeValido(42)).toBeUndefined();
  });

  it('link vencido (15 min) falha', () => {
    const { painel, nonce, token } = cenario();
    agora += LINK_MS;
    expect(painel.entrar(token, nonce, 'Ana')).toBeUndefined();
  });

  it('token adulterado falha', () => {
    const { painel, nonce, token } = cenario();
    const trocado = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(painel.entrar(trocado, nonce, 'Ana')).toBeUndefined();
    expect(painel.entrar('', nonce, 'Ana')).toBeUndefined();
  });

  it('no máximo 5 links valendo: o 6º é recusado sem invalidar os anteriores', () => {
    const { painel, nonce, token } = cenario();
    const outros = Array.from({ length: 4 }, () => painel.pedirLink(nonce));
    expect(outros.every(Boolean)).toBe(true);
    expect(painel.pedirLink(nonce)).toBeUndefined();
    expect(painel.entrar(token, nonce, 'Ana')).toBeDefined();
    expect(painel.pedirLink(nonce)).toBeDefined(); // um foi usado: abriu vaga
    agora += LINK_MS;
    expect(painel.pedirLink(nonce)).toBeDefined(); // os vencidos não contam
  });

  it('o banco não guarda token, nonce nem id de sessão em claro', () => {
    const { caminho, painel, nonce, token } = cenario();
    const outro = painel.pedirLink(nonce)!;
    const id = painel.entrar(token, nonce, 'Ana')!;
    const db = new DatabaseSync(caminho);
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    const texto = JSON.stringify([db.prepare('SELECT * FROM painel_links').all(), db.prepare('SELECT * FROM painel_sessoes').all()]);
    db.close();
    for (const segredo of [token, outro, nonce, id]) {
      expect(texto).not.toContain(segredo);
      expect(['', '-wal'].some((s) => existsSync(caminho + s) && readFileSync(caminho + s).includes(segredo))).toBe(false);
    }
  });
});

describe('painel: sessão', () => {
  it('cookies __Host-: HttpOnly, Secure, SameSite=Lax, Path=/, sem Domain; pré-sessão 15 min, sessão 2 h', () => {
    expect(COOKIE_PRE).toBe('__Host-laesa_pre');
    expect(COOKIE_SESSAO).toBe('__Host-laesa_mesa');
    expect(COOKIE_PRE_OPCOES).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 900 });
    expect(COOKIE_SESSAO_OPCOES).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 7200 });
  });

  it('vence com 30 min sem uso; o uso renova', () => {
    const { painel, nonce, token } = cenario();
    const id = painel.entrar(token, nonce, 'Ana')!;
    agora += OCIOSA_MS - 1000;
    expect(painel.sessao(id)).toBeDefined(); // renovou aqui
    agora += OCIOSA_MS - 1000;
    expect(painel.sessao(id)).toBeDefined();
    agora += OCIOSA_MS;
    expect(painel.sessao(id)).toBeUndefined();
  });

  it('vence com 2 h no total, mesmo em uso', () => {
    const { painel, nonce, token } = cenario();
    const id = painel.entrar(token, nonce, 'Ana')!;
    for (let t = 0; t < ABSOLUTA_MS - 20 * 60_000; t += 20 * 60_000) {
      agora += 20 * 60_000;
      expect(painel.sessao(id)).toBeDefined();
    }
    agora += 20 * 60_000;
    expect(painel.sessao(id)).toBeUndefined();
  });

  it('sair encerra só a própria sessão; sair de todos encerra todas e os links pendentes', () => {
    const { painel, nonce, token } = cenario();
    const a = painel.entrar(token, nonce, 'Ana')!;
    const b = painel.entrar(painel.pedirLink(nonce)!, nonce, 'Bia')!;
    const pendente = painel.pedirLink(nonce)!;
    painel.sair(a);
    expect(painel.sessao(a)).toBeUndefined();
    expect(painel.sessao(b)).toBeDefined();
    expect(painel.sairTodos()).toEqual({ sessoes: 1, links: 1 });
    expect(painel.sessao(b)).toBeUndefined();
    expect(painel.entrar(pendente, nonce, 'Caio')).toBeUndefined();
  });

  it('o login dá id novo e encerra a sessão anterior do navegador', () => {
    const { painel, nonce, token } = cenario();
    const antigo = painel.entrar(token, nonce, 'Ana')!;
    const novo = painel.entrar(painel.pedirLink(nonce)!, nonce, 'Ana', antigo)!;
    expect(novo).not.toBe(antigo);
    expect(painel.sessao(antigo)).toBeUndefined();
    expect(painel.sessao(novo)).toBeDefined();
  });

  it('id inventado ou vazio não é sessão', () => {
    const { painel } = cenario();
    expect(painel.sessao(undefined)).toBeUndefined();
    expect(painel.sessao('')).toBeUndefined();
    expect(painel.sessao(aleatorio())).toBeUndefined();
  });

  it('limpar apaga sessões e links vencidos', () => {
    const { painel, nonce, token } = cenario();
    painel.entrar(token, nonce, 'Ana');
    painel.pedirLink(nonce);
    expect(painel.limpar()).toEqual({ sessoes: 0, links: 0 });
    agora += OCIOSA_MS;
    expect(painel.limpar()).toEqual({ sessoes: 1, links: 1 });
  });

  it('painelEm: uma conexão por arquivo no processo', () => {
    const caminho = join(dir, 'singleton.db');
    expect(painelEm(caminho)).toBe(painelEm(caminho));
  });
});

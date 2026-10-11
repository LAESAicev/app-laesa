import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mesmaOrigem } from '../src/lib/http';
import { COOKIE_SESSAO, aleatorio, criarPainel } from '../src/lib/painel';

const SITE = 'https://laesa.icev.edu.br';
let dir: string;
let db: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'laesa-mesa-'));
  db = join(dir, 'laesa.db');
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});
afterEach(() => {
  vi.doUnmock('astro:env/server');
});

/** Middleware carregado de novo com as variáveis do caso (o astro:env é lido ao importar). */
async function carregar(env: { PAINEL_AVISOS?: boolean; INSCRITOS_STORE?: string } = {}) {
  vi.resetModules();
  vi.doMock('astro:env/server', () => ({ PAINEL_AVISOS: true, INSCRITOS_STORE: 'sqlite', INSCRITOS_DB: db, ...env }));
  const { onRequest } = await import('../src/middleware');
  return async (caminho: string, { method = 'GET', headers = {}, sessao }: { method?: string; headers?: Record<string, string>; sessao?: string } = {}) => {
    const url = new URL(SITE + caminho); // sem resolver: "//mesa" continua caminho, não vira host
    const locals: App.Locals = {};
    const next = vi.fn(async () => new Response('conteúdo da tela'));
    const context = {
      url,
      site: new URL(SITE),
      request: new Request(url, { method, headers }),
      cookies: { get: (nome: string) => (nome === COOKIE_SESSAO && sessao ? { value: sessao } : undefined) },
      locals,
    };
    const res = (await onRequest(context as never, next)) as Response;
    return { res, next, locals };
  };
}

function sessaoValida() {
  const painel = criarPainel(db);
  const nonce = aleatorio();
  return painel.entrar(painel.pedirLink(nonce)!, nonce, 'Ana')!;
}

const privado = (res: Response) => ({ cache: res.headers.get('cache-control'), robots: res.headers.get('x-robots-tag') });

describe('mesmaOrigem', () => {
  const pedido = (headers: Record<string, string>) => new Request(`${SITE}/mesa/entrar`, { method: 'POST', headers });
  it('exige Origin igual e, se vier, Sec-Fetch-Site same-origin', () => {
    expect(mesmaOrigem(pedido({ origin: SITE }), SITE)).toBe(true);
    expect(mesmaOrigem(pedido({ origin: SITE, 'sec-fetch-site': 'same-origin' }), SITE)).toBe(true);
    expect(mesmaOrigem(pedido({}), SITE)).toBe(false);
    expect(mesmaOrigem(pedido({ origin: 'null' }), SITE)).toBe(false);
    expect(mesmaOrigem(pedido({ origin: 'https://evil.example' }), SITE)).toBe(false);
    expect(mesmaOrigem(pedido({ origin: 'http://laesa.icev.edu.br' }), SITE)).toBe(false);
    expect(mesmaOrigem(pedido({ origin: SITE, 'sec-fetch-site': 'cross-site' }), SITE)).toBe(false);
    expect(mesmaOrigem(pedido({ origin: SITE, 'sec-fetch-site': 'same-site' }), SITE)).toBe(false);
    expect(mesmaOrigem(pedido({ origin: SITE, 'sec-fetch-site': 'none' }), SITE)).toBe(false);
  });
});

describe('middleware da tela de avisos (/mesa)', () => {
  it('flag desligada: /mesa/* é 404 (GET e POST), sem chegar à página', async () => {
    const pedir = await carregar({ PAINEL_AVISOS: false });
    for (const [caminho, method] of [['/mesa', 'GET'], ['/mesa/entrar', 'GET'], ['/mesa/avisos', 'GET'], ['/mesa/entrar', 'POST']]) {
      const { res, next } = await pedir(caminho, { method, headers: { origin: SITE } });
      expect(res.status).toBe(404);
      expect(next).not.toHaveBeenCalled();
      expect(privado(res)).toEqual({ cache: 'no-store', robots: 'noindex, nofollow' });
    }
  });

  it('flag ligada sem INSCRITOS_STORE=sqlite: continua 404', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pedir = await carregar({ INSCRITOS_STORE: 'memoria' });
    expect((await pedir('/mesa/entrar')).res.status).toBe(404);
    vi.mocked(console.warn).mockRestore();
  });

  it('outras rotas passam direto, mesmo com prefixo parecido', async () => {
    const pedir = await carregar({ PAINEL_AVISOS: false });
    for (const caminho of ['/', '/mesas', '/avisos/confirmar', '/api/inscricao']) {
      const { next } = await pedir(caminho, { method: caminho.startsWith('/api') ? 'POST' : 'GET' });
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it.each([
    ['sem Origin', {}],
    ['Origin de outro site', { origin: 'https://evil.example' }],
    ['Sec-Fetch-Site cross-site', { origin: SITE, 'sec-fetch-site': 'cross-site' }],
  ])('POST %s: 403 sem efeito, com ou sem sessão', async (_, headers) => {
    const pedir = await carregar();
    for (const [caminho, sessao] of [['/mesa/entrar', undefined], ['/mesa/sair', sessaoValida()]]) {
      const { res, next } = await pedir(caminho!, { method: 'POST', headers, sessao });
      expect(res.status).toBe(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('POST da mesma origem segue', async () => {
    const pedir = await carregar();
    const { res, next } = await pedir('/mesa/entrar', { method: 'POST', headers: { origin: SITE, 'sec-fetch-site': 'same-origin' } });
    expect(next).toHaveBeenCalledOnce();
    expect(privado(res)).toEqual({ cache: 'no-store', robots: 'noindex, nofollow' });
  });

  it('sem sessão (ou com sessão inventada): 303 para /mesa/entrar, sem dado da tela', async () => {
    const pedir = await carregar();
    for (const caminho of ['/mesa', '/mesa/avisos', '/MESA/Avisos/', '/mesa/entrar/outra', '/mesa/rascunhos/1']) {
      for (const sessao of [undefined, aleatorio()]) {
        const { res, next } = await pedir(caminho, { sessao });
        expect(res.status).toBe(303);
        expect(res.headers.get('location')).toBe('/mesa/entrar');
        expect(await res.text()).toBe('');
        expect(next).not.toHaveBeenCalled();
      }
    }
  });

  it('caminho codificado, com barras dobradas ou em outra caixa também é /mesa: 303 sem sessão', async () => {
    const pedir = await carregar();
    for (const caminho of ['/m%65sa/avisos', '/MESA/avisos', '/mesa//avisos', '//mesa/avisos', '/mesa/%61visos', '/%6D%65%73%61/avisos', '/m%2565sa/avisos', '/mesa/%zz/avisos', '/mesa%2Favisos']) {
      const { res, next } = await pedir(caminho);
      expect(res.status, caminho).toBe(303);
      expect(next, caminho).not.toHaveBeenCalled();
    }
    // e /m%65sa/entrar continua sendo a entrada (sem sessão)
    expect((await pedir('/m%65sa/entrar')).next).toHaveBeenCalledOnce();
  });

  it('recarga automática (GET ?auto=1) não conta como uso: com a aba aberta a sessão vence em 30 min; navegação normal renova', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const pedir = await carregar();
      const passar = (ms: number) => vi.setSystemTime(new Date(Date.now() + ms));
      const aba = sessaoValida();
      for (let i = 0; i < 29; i++) {
        passar(60_000);
        expect((await pedir('/mesa/envios/1?auto=1', { sessao: aba })).next).toHaveBeenCalledOnce();
      }
      passar(61_000);
      expect((await pedir('/mesa/envios/1?auto=1', { sessao: aba })).res.status).toBe(303);

      const navegando = sessaoValida();
      for (let i = 0; i < 3; i++) {
        passar(20 * 60_000);
        expect((await pedir('/mesa/envios/1', { sessao: navegando })).next).toHaveBeenCalledOnce();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('/mesa/entrar abre sem sessão; com sessão válida, a tela recebe o nome e sai com no-store e noindex', async () => {
    const pedir = await carregar();
    expect((await pedir('/mesa/entrar')).next).toHaveBeenCalledOnce();
    const { res, next, locals } = await pedir('/mesa/avisos', { sessao: sessaoValida() });
    expect(next).toHaveBeenCalledOnce();
    expect(locals.mesa).toEqual({ nome: 'Ana' });
    expect(privado(res)).toEqual({ cache: 'no-store', robots: 'noindex, nofollow' });
  });
});

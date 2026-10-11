// Entrada da tela de avisos (/mesa/entrar e /mesa/sair), renderizada pelo AstroContainer com o e-mail mockado.
// O middleware (origem, sessão, flag) tem os próprios testes em mesa-middleware.test.ts; aqui, o que as páginas fazem.
import { App } from 'astro/app';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rmSync } from 'node:fs';

const h = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'laesa-mesa-entrar-'));
  return { dir, db: join(dir, 'laesa.db') };
});
vi.mock('astro:env/server', async (orig) => ({ ...(await orig<object>()), PAINEL_AVISOS: true, INSCRITOS_STORE: 'sqlite', INSCRITOS_DB: h.db }));
const enviar = vi.fn();
vi.mock('../src/lib/mailer', async (orig) => ({ ...(await orig<typeof import('../src/lib/mailer')>()), enviar }));

const { default: Entrar } = await import('../src/pages/mesa/entrar.astro');
const { default: Sair } = await import('../src/pages/mesa/sair.astro');
const { COOKIE_PRE, COOKIE_SESSAO, painelEm } = await import('../src/lib/painel');

const MIN = 60_000;
const CAIXA = 'laesa@somosicev.com'; // PUBLIC_CONTACT_EMAIL do vitest.config.ts
let container: AstroContainer;
let adiantado = 0;

beforeAll(async () => {
  container = await AstroContainer.create({ astroConfig: { site: 'http://localhost' } });
});
afterAll(() => rmSync(h.dir, { recursive: true, force: true }));
beforeEach(() => {
  enviar.mockReset();
  // relógio adiantado 25 h a cada teste: janelas dos limites (inclusive a diária) e links anteriores já venceram
  adiantado += 25 * 60 * MIN;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(Date.now() + adiantado));
});
afterEach(() => vi.useRealTimers());

type Pedido = { method?: string; form?: Record<string, string>; cookies?: Record<string, string> };

async function chamar(pagina: typeof Entrar, caminho: string, { method = 'GET', form, cookies = {} }: Pedido = {}) {
  const headers = new Headers({ origin: 'http://localhost' });
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  if (cookie) headers.set('cookie', cookie);
  const request = new Request(`http://localhost${caminho}`, { method, headers, body: form ? new URLSearchParams(form) : undefined });
  const res = await container.renderToResponse(pagina, { request, partial: false });
  // o servidor de verdade põe os cookies do Astro.cookies no Set-Cookie; o container só os prende à resposta
  return { res, html: await res.text(), setCookies: [...App.getSetCookieFromResponse(res)] };
}

const valorDo = (setCookies: string[], nome: string) => setCookies.find((c) => c.startsWith(`${nome}=`))?.split(';')[0].slice(nome.length + 1);

/** Pede o link como o navegador: devolve o nonce (cookie de pré-sessão) e o token que chegou no e-mail. */
async function pedirLink(form: Record<string, string> = {}) {
  const { res, setCookies } = await chamar(Entrar, '/mesa/entrar', { method: 'POST', form: { acao: 'pedir', ...form } });
  const nonce = valorDo(setCookies, COOKIE_PRE)!;
  const texto: string = enviar.mock.calls.at(-1)?.[0].text ?? '';
  const token = texto.match(/\/mesa\/entrar\?t=([\w-]+)/)?.[1];
  return { res, setCookies, nonce, token };
}

const entrarCom = (token: string, nonce: string | undefined, nome = 'Ana', extra: Record<string, string> = {}) =>
  chamar(Entrar, '/mesa/entrar', { method: 'POST', form: { t: token, nome }, cookies: { ...(nonce ? { [COOKIE_PRE]: nonce } : {}), ...extra } });

describe('/mesa/entrar: pedir o link', () => {
  it('GET mostra só o botão de pedir, sem mandar nada', async () => {
    const { res, html } = await chamar(Entrar, '/mesa/entrar');
    expect(res.status).toBe(200);
    expect(html).toContain('<form method="post" action="/mesa/entrar"');
    expect(html).toContain('name="acao" value="pedir"');
    expect(html).toContain('Enviar link de acesso para a caixa da LAESA');
    expect(enviar).not.toHaveBeenCalled();
  });

  it('POST pedir: 303 neutro, cookie de pré-sessão e e-mail texto puro para a caixa da LAESA', async () => {
    const { res, setCookies, token } = await pedirLink();
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/mesa/entrar?enviado=1');
    const pre = setCookies.find((c) => c.startsWith(`${COOKIE_PRE}=`))!;
    expect(pre).toMatch(/HttpOnly/i);
    expect(pre).toMatch(/Secure/i);
    expect(pre).toMatch(/SameSite=Lax/i);
    expect(pre).toMatch(/Path=\//);
    expect(pre).toMatch(/Max-Age=900/);
    expect(enviar).toHaveBeenCalledOnce();
    const email = enviar.mock.calls[0][0];
    expect(email.to).toBe(CAIXA);
    expect(email.html).toBeUndefined();
    expect(email.text).toContain('horário de Teresina');
    expect(email.text).toContain('Se não foi alguém da Mesa, ignore este e-mail e avise a coordenação.');
    expect(token).toBeTruthy();
  });

  it('destino fixo: campo email (ou to) no corpo não muda para quem vai', async () => {
    await pedirLink({ email: 'atacante@exemplo.test', to: 'atacante@exemplo.test' });
    expect(enviar).toHaveBeenCalledOnce();
    expect(enviar.mock.calls[0][0].to).toBe(CAIXA);
    expect(JSON.stringify(enviar.mock.calls)).not.toContain('atacante');
  });

  it('4º pedido em 15 min do mesmo IP: mesma resposta, sem e-mail', async () => {
    for (let i = 0; i < 3; i++) await pedirLink();
    expect(enviar).toHaveBeenCalledTimes(3);
    const { res } = await pedirLink();
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/mesa/entrar?enviado=1');
    expect(enviar).toHaveBeenCalledTimes(3);
  });

  it('teto diário global: o 21º pedido do dia não manda e-mail, mesmo de IPs diferentes', async () => {
    const { pedirLinkDeEntrada } = await import('../src/lib/mesa');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (let i = 0; i < 21; i++) {
      if (i % 5 === 0) vi.setSystemTime(new Date(Date.now() + 16 * MIN)); // máx. 5 links valendo: deixa os anteriores vencerem
      await pedirLinkDeEntrada(`10.9.0.${i}`, `nonce-${i}`, new URL('http://localhost'));
    }
    expect(enviar).toHaveBeenCalledTimes(20);
    vi.mocked(console.warn).mockRestore();
  });

  it('SMTP fora do ar: resposta continua neutra', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    enviar.mockRejectedValueOnce(new Error('smtp caiu para laesa@somosicev.com'));
    const { res } = await pedirLink();
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/mesa/entrar?enviado=1');
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('@');
    vi.mocked(console.error).mockRestore();
  });

  it('?enviado=1 mostra a mensagem neutra', async () => {
    const { html } = await chamar(Entrar, '/mesa/entrar?enviado=1');
    expect(html).toContain('Se ele foi aceito, o link chega');
  });
});

describe('/mesa/entrar: usar o link', () => {
  it('GET ?t não consome: mostra nome + Entrar com o token oculto, e o link continua valendo', async () => {
    const { nonce, token } = await pedirLink();
    const { html } = await chamar(Entrar, `/mesa/entrar?t=${token}`, { cookies: { [COOKIE_PRE]: nonce } });
    expect(html).toContain(`<input type="hidden" name="t" value="${token}"`);
    expect(html).toContain('Seu nome');
    expect(html).toContain('mesmo navegador');
    await chamar(Entrar, `/mesa/entrar?t=${token}`, { cookies: { [COOKIE_PRE]: nonce } });
    expect((await entrarCom(token!, nonce)).res.status).toBe(303);
  });

  it('POST com o cookie certo entra: sessão com os atributos certos, pré-sessão apagada; 2º uso falha', async () => {
    const { nonce, token } = await pedirLink();
    const { res, setCookies } = await entrarCom(token!, nonce, '  Ana   Clara ');
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/mesa/avisos');
    const sessao = setCookies.find((c) => c.startsWith(`${COOKIE_SESSAO}=`))!;
    expect(sessao).toMatch(/HttpOnly/i);
    expect(sessao).toMatch(/Secure/i);
    expect(sessao).toMatch(/SameSite=Lax/i);
    expect(sessao).toMatch(/Path=\//);
    expect(sessao).toMatch(/Max-Age=7200/);
    expect(setCookies.find((c) => c.startsWith(`${COOKIE_PRE}=`))).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
    expect(painelEm(h.db).sessao(valorDo(setCookies, COOKIE_SESSAO))).toMatchObject({ nome: 'Ana Clara' });

    const de_novo = await entrarCom(token!, nonce);
    expect(de_novo.res.status).toBe(200);
    expect(de_novo.html).toContain('Não deu para entrar.');
    expect(valorDo(de_novo.setCookies, COOKIE_SESSAO)).toBeUndefined();
  });

  it('sem o cookie de pré-sessão (ou com outro) falha sem consumir o link', async () => {
    const { nonce, token } = await pedirLink();
    for (const outro of [undefined, 'x'.repeat(43)]) {
      const { res, html } = await entrarCom(token!, outro);
      expect(res.status).toBe(200);
      expect(html).toContain('Não deu para entrar.');
    }
    expect((await entrarCom(token!, nonce)).res.status).toBe(303);
  });

  it('token adulterado falha', async () => {
    const { nonce, token } = await pedirLink();
    const { html } = await entrarCom(`${token}x`, nonce);
    expect(html).toContain('Não deu para entrar.');
  });

  it('sem nome pede o nome e não consome o link', async () => {
    const { nonce, token } = await pedirLink();
    const { res, html } = await entrarCom(token!, nonce, '   ');
    expect(res.status).toBe(200);
    expect(html).toContain('Escreva seu nome');
    expect(html).toContain(`value="${token}"`);
    expect((await entrarCom(token!, nonce)).res.status).toBe(303);
  });

  it('entrar de novo no mesmo navegador encerra a sessão anterior (id novo)', async () => {
    const a = await pedirLink();
    const primeira = valorDo((await entrarCom(a.token!, a.nonce)).setCookies, COOKIE_SESSAO)!;
    const b = await pedirLink();
    const segunda = valorDo((await entrarCom(b.token!, b.nonce, 'Ana', { [COOKIE_SESSAO]: primeira })).setCookies, COOKIE_SESSAO)!;
    expect(segunda).not.toBe(primeira);
    expect(painelEm(h.db).sessao(primeira)).toBeUndefined();
    expect(painelEm(h.db).sessao(segunda)).toBeDefined();
  });

  it('11ª tentativa de entrar em 15 min do mesmo IP é barrada, mesmo com link bom', async () => {
    const { nonce, token } = await pedirLink();
    for (let i = 0; i < 10; i++) await entrarCom('inventado', nonce);
    const { html } = await entrarCom(token!, nonce);
    expect(html).toContain('Muitas tentativas de entrar');
  });
});

describe('/mesa/sair', () => {
  async function sessaoNova() {
    const { nonce, token } = await pedirLink();
    return valorDo((await entrarCom(token!, nonce)).setCookies, COOKIE_SESSAO)!;
  }

  it('POST sair encerra esta sessão, apaga o cookie e volta para a entrada', async () => {
    const id = await sessaoNova();
    const { res, setCookies } = await chamar(Sair, '/mesa/sair', { method: 'POST', form: { acao: 'sair' }, cookies: { [COOKIE_SESSAO]: id } });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/mesa/entrar');
    expect(setCookies.find((c) => c.startsWith(`${COOKIE_SESSAO}=`))).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
    expect(painelEm(h.db).sessao(id)).toBeUndefined();
  });

  it('POST sair-todos encerra todas as sessões', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const a = await sessaoNova();
    const b = await sessaoNova();
    const { res } = await chamar(Sair, '/mesa/sair', { method: 'POST', form: { acao: 'sair-todos' }, cookies: { [COOKIE_SESSAO]: a } });
    expect(res.status).toBe(303);
    expect(painelEm(h.db).sessao(a)).toBeUndefined();
    expect(painelEm(h.db).sessao(b)).toBeUndefined();
    vi.mocked(console.info).mockRestore();
  });

  it('GET não sai', async () => {
    const id = await sessaoNova();
    const { res } = await chamar(Sair, '/mesa/sair', { cookies: { [COOKIE_SESSAO]: id } });
    expect(res.status).toBe(303);
    expect(painelEm(h.db).sessao(id)).toBeDefined();
  });
});

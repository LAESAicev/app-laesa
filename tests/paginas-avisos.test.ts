// Propriedade de segurança das páginas de aviso: GET (o que scanners de link fazem) nunca confirma nem
// descadastra, só mostra o botão; a ação acontece no POST, autorizada pelo token assinado.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import { gerarToken, inscritos } from '../src/lib/inscricao';
import Confirmar from '../src/pages/avisos/confirmar.astro';
import Descadastro from '../src/pages/avisos/descadastro.astro';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create({ astroConfig: { site: 'http://localhost' } });
});

const BASE = 'http://localhost/avisos';
const inscrito = async (email: string) => (await inscritos().listar()).includes(email);
const form = (campos: Record<string, string>) => new URLSearchParams(campos);

describe('/avisos/confirmar', () => {
  it('GET com token válido não confirma e mostra o formulário POST', async () => {
    const email = 'scanner.confirma@exemplo.com';
    const t = gerarToken(email, 'confirmar');
    const html = await container.renderToString(Confirmar, { request: new Request(`${BASE}/confirmar?t=${t}`) });
    expect(html).toContain('<form method="post" action="/avisos/confirmar"');
    expect(html).toContain(`<input type="hidden" name="t" value="${t}"`);
    expect(await inscrito(email)).toBe(false);
  });

  it('POST com o token confirma', async () => {
    const email = 'clicou.confirma@exemplo.com';
    const request = new Request(`${BASE}/confirmar`, { method: 'POST', body: form({ t: gerarToken(email, 'confirmar') }) });
    const html = await container.renderToString(Confirmar, { request });
    expect(html).toContain('confirmada.');
    expect(await inscrito(email)).toBe(true);
  });

  it('POST com token inválido não confirma', async () => {
    const request = new Request(`${BASE}/confirmar`, { method: 'POST', body: form({ t: 'forjado.token' }) });
    expect(await container.renderToString(Confirmar, { request })).toContain('inválido ou expirado.');
  });
});

describe('/avisos/descadastro', () => {
  it('GET com token válido não descadastra e mostra o formulário POST', async () => {
    const email = 'scanner.sai@exemplo.com';
    await inscritos().adicionar(email, new Date());
    const t = gerarToken(email, 'sair');
    const html = await container.renderToString(Descadastro, { request: new Request(`${BASE}/descadastro?t=${t}`) });
    expect(html).toContain(`<form method="post" action="/avisos/descadastro?t=${t}"`);
    expect(await inscrito(email)).toBe(true);
  });

  it('POST pelo botão descadastra', async () => {
    const email = 'clicou.sai@exemplo.com';
    await inscritos().adicionar(email, new Date());
    const request = new Request(`${BASE}/descadastro?t=${gerarToken(email, 'sair')}`, { method: 'POST', headers: { origin: 'http://localhost' } });
    expect(await container.renderToString(Descadastro, { request })).toContain('cancelada.');
    expect(await inscrito(email)).toBe(false);
  });

  it('um clique do Gmail (RFC 8058): POST sem Origin, só com o token, descadastra', async () => {
    const email = 'gmail.sai@exemplo.com';
    await inscritos().adicionar(email, new Date());
    const request = new Request(`${BASE}/descadastro?t=${gerarToken(email, 'sair')}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    });
    expect(request.headers.get('origin')).toBeNull();
    expect(await container.renderToString(Descadastro, { request })).toContain('cancelada.');
    expect(await inscrito(email)).toBe(false);
  });

  it('POST sem token válido não descadastra ninguém', async () => {
    const email = 'fica@exemplo.com';
    await inscritos().adicionar(email, new Date());
    const request = new Request(`${BASE}/descadastro?t=forjado.token`, { method: 'POST', body: 'List-Unsubscribe=One-Click' });
    expect(await container.renderToString(Descadastro, { request })).toContain('inválido.');
    expect(await inscrito(email)).toBe(true);
  });
});

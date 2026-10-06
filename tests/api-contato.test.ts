import { beforeEach, describe, expect, it, vi } from 'vitest';

const enviar = vi.fn();
vi.mock('../src/lib/mailer', async (orig) => ({ ...(await orig<typeof import('../src/lib/mailer')>()), enviar }));

const { POST } = await import('../src/pages/api/contato');
const { EnvioIndisponivel } = await import('../src/lib/mailer');

let ip = 0;
const chamar = (body: unknown, endereco = `10.0.0.${++ip}`) =>
  POST({
    request: new Request('http://localhost/api/contato', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    clientAddress: endereco,
  } as never) as Promise<Response>;

const valido = { assunto: 'projeto', nome: 'Ana', email: 'ana@org.org', organizacao: 'Bairro Vivo', tipoProjeto: 'sistema-web', mensagem: 'Precisamos de um cadastro.' };

describe('POST /api/contato', () => {
  beforeEach(() => enviar.mockReset());

  it('201 e envia para a caixa da LAESA com assunto identificado e resposta para quem escreveu', async () => {
    const res = await chamar(valido);
    expect(res.status).toBe(201);
    expect(enviar).toHaveBeenCalledOnce();
    expect(enviar.mock.calls[0][0]).toMatchObject({ to: 'laesa@somosicev.com', subject: '[Projeto] Bairro Vivo', replyTo: 'ana@org.org' });
    expect(enviar.mock.calls[0][0].text).toContain('Tipo de projeto: Sistema web');
  });

  it('422 com erros por campo', async () => {
    const res = await chamar({ assunto: 'duvida', nome: 'A', email: 'x', mensagem: 'oi' });
    expect(res.status).toBe(422);
    expect(Object.keys((await res.json()).erros).sort()).toEqual(['email', 'mensagem', 'nome']);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('honeypot finge sucesso e não envia', async () => {
    const res = await chamar({ ...valido, nao_preencher: 'http://spam' });
    expect(res.status).toBe(201);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('503 quando o SMTP não está configurado', async () => {
    enviar.mockRejectedValueOnce(new EnvioIndisponivel());
    const res = await chamar(valido);
    expect(res.status).toBe(503);
    expect((await res.json()).erro).toContain('laesa@somosicev.com');
  });

  it('429 depois de 5 envios do mesmo IP em 10 minutos', async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await chamar(valido, '192.168.0.9')).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });
});

describe('POST /api/contato: formato do pedido', () => {
  const cru = (body: string, tipo: string) =>
    POST({ request: new Request('http://localhost/api/contato', { method: 'POST', headers: { 'content-type': tipo }, body }), clientAddress: `10.9.0.${++ip}` } as never) as Promise<Response>;

  it('415 para formulário fora de JSON (CSRF exige preflight)', async () => {
    expect((await cru('assunto=duvida', 'application/x-www-form-urlencoded')).status).toBe(415);
  });
  it('400 para JSON malformado, null ou array', async () => {
    expect((await cru('{', 'application/json')).status).toBe(400);
    expect((await cru('null', 'application/json')).status).toBe(400);
    expect((await cru('[]', 'application/json')).status).toBe(400);
  });
  it('422 quando um campo vem com tipo errado', async () => {
    expect((await chamar({ ...valido, nome: ['Ana'] })).status).toBe(422);
  });
});

describe('POST /api/contato: proteção contra CSRF', () => {
  const comCabecalhos = (headers: Record<string, string>) =>
    POST({ request: new Request('http://localhost/api/contato', { method: 'POST', headers, body: JSON.stringify(valido) }), clientAddress: `10.8.0.${++ip}` } as never) as Promise<Response>;

  it('415 para text/plain disfarçado de JSON (simple request sem preflight)', async () => {
    expect((await comCabecalhos({ 'content-type': 'text/plain; x=application/json' })).status).toBe(415);
  });
  it('403 para pedido de outro site (Sec-Fetch-Site: cross-site)', async () => {
    expect((await comCabecalhos({ 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' })).status).toBe(403);
  });
  it('aceita same-origin', async () => {
    expect((await comCabecalhos({ 'content-type': 'application/json; charset=utf-8', 'sec-fetch-site': 'same-origin' })).status).toBe(201);
  });
});

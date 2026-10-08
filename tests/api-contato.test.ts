import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('POST /api/contato: teto diário global', () => {
  // Módulo novo: a cota global é estado do módulo e não pode vazar para os outros testes.
  const rotaNova = async () => {
    vi.resetModules();
    const { POST: post } = await import('../src/pages/api/contato');
    let n = 0;
    return (endereco = `10.50.${Math.floor(n / 250)}.${n++ % 250}`, body: unknown = valido) =>
      post({
        request: new Request('http://localhost/api/contato', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
        clientAddress: endereco,
      } as never) as Promise<Response>;
  };
  beforeEach(() => enviar.mockReset());

  it('429 com o e-mail da LAESA depois de 100 mensagens em 24h, de IPs diferentes', async () => {
    const enviarPara = await rotaNova();
    for (let i = 0; i < 100; i++) expect((await enviarPara()).status).toBe(201);
    const res = await enviarPara();
    expect(res.status).toBe(429);
    expect((await res.json()).erro).toContain('laesa@somosicev.com');
    expect(enviar).toHaveBeenCalledTimes(100);
  });

  it('IP barrado pelo limite próprio não gasta a cota global', async () => {
    const enviarPara = await rotaNova();
    for (let i = 0; i < 150; i++) await enviarPara('192.168.7.7');
    for (let i = 0; i < 95; i++) expect((await enviarPara()).status).toBe(201);
  });

  it('pedido inválido não gasta a cota global', async () => {
    const enviarPara = await rotaNova();
    for (let i = 0; i < 150; i++) await enviarPara(undefined, { assunto: 'duvida' });
    expect((await enviarPara()).status).toBe(201);
    for (let i = 0; i < 99; i++) await enviarPara();
    expect((await enviarPara()).status).toBe(429);
  });
});

describe('POST /api/contato: limite diário por IP', () => {
  const MIN = 60 * 1000;
  const rotaNova = async () => {
    vi.resetModules();
    const { POST: post } = await import('../src/pages/api/contato');
    let n = 0;
    return (endereco = `10.60.${Math.floor(n / 250)}.${n++ % 250}`) =>
      post({
        request: new Request('http://localhost/api/contato', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valido) }),
        clientAddress: endereco,
      } as never) as Promise<Response>;
  };
  /** n envios do mesmo IP, pulando a janela de 10 minutos a cada 5 para só o limite diário contar. */
  async function espalhados(enviarPara: (ip?: string) => Promise<Response>, ip: string, n: number) {
    const statuses: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i > 0 && i % 5 === 0) vi.advanceTimersByTime(11 * MIN);
      statuses.push((await enviarPara(ip)).status);
    }
    return statuses;
  }
  beforeEach(() => {
    enviar.mockReset();
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('429 com o e-mail da LAESA depois de 10 mensagens do mesmo IP no dia', async () => {
    const enviarPara = await rotaNova();
    const statuses = await espalhados(enviarPara, '192.168.1.1', 10);
    expect(statuses).toEqual(Array(10).fill(201));
    vi.advanceTimersByTime(11 * MIN);
    const res = await enviarPara('192.168.1.1');
    expect(res.status).toBe(429);
    expect((await res.json()).erro).toContain('laesa@somosicev.com');
    vi.advanceTimersByTime(24 * 60 * MIN);
    expect((await enviarPara('192.168.1.1')).status).toBe(201); // no dia seguinte volta a valer
  });

  it('IP no limite diário não gasta a cota global e os outros IPs continuam passando', async () => {
    const enviarPara = await rotaNova();
    await espalhados(enviarPara, '192.168.1.2', 60); // 10 passam, 50 barradas pelo limite diário
    expect(enviar).toHaveBeenCalledTimes(10);
    for (let i = 0; i < 90; i++) expect((await enviarPara()).status).toBe(201);
    expect((await enviarPara()).status).toBe(429); // 10 + 90 = teto global de 100
  });

  it('IPv6 do mesmo /64 conta como um só IP', async () => {
    const enviarPara = await rotaNova();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      if (i > 0 && i % 5 === 0) vi.advanceTimersByTime(11 * MIN);
      statuses.push((await enviarPara(`2001:db8:1:2::${i + 1}`)).status);
    }
    expect(statuses).toEqual([...Array(10).fill(201), 429]);
  });

  it('envio que falhou não gasta a vaga do dia', async () => {
    const enviarPara = await rotaNova();
    enviar.mockRejectedValueOnce(new EnvioIndisponivel()).mockRejectedValueOnce(new Error('smtp caiu'));
    const statuses = await espalhados(enviarPara, '192.168.1.3', 12);
    expect(statuses).toEqual([503, 500, ...Array(10).fill(201)]);
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

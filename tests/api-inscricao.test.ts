import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const enviar = vi.fn();
vi.mock('../src/lib/mailer', async (orig) => ({ ...(await orig<typeof import('../src/lib/mailer')>()), enviar }));

const { POST } = await import('../src/pages/api/inscricao');

let ip = 0;
const chamar = (body: unknown, endereco = `10.1.0.${++ip}`) =>
  POST({
    request: new Request('http://localhost/api/inscricao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    clientAddress: endereco,
    url: new URL('http://localhost/api/inscricao'),
    site: new URL('https://laesa.icev.edu.br'),
  } as never) as Promise<Response>;

describe('POST /api/inscricao', () => {
  beforeEach(() => enviar.mockReset());

  it('202 e envia confirmação com link assinado', async () => {
    const res = await chamar({ email: 'Nova@Exemplo.com', consentimento: true });
    expect(res.status).toBe(202);
    expect(enviar).toHaveBeenCalledOnce();
    expect(enviar.mock.calls[0][0].to).toBe('nova@exemplo.com');
    expect(enviar.mock.calls[0][0].text).toMatch(/\/avisos\/confirmar\?t=[\w-]+\.[\w-]+/);
  });

  it('não manda a segunda confirmação para o mesmo e-mail em 24h, mas responde igual', async () => {
    await chamar({ email: 'repete@exemplo.com', consentimento: true });
    const res = await chamar({ email: 'repete@exemplo.com', consentimento: true });
    expect(res.status).toBe(202);
    expect(enviar).toHaveBeenCalledOnce();
  });

  it('repetir o mesmo e-mail não consome a cota global (teto de 300/24h)', async () => {
    // Módulo novo: a cota global é estado do módulo e não pode vazar para os outros testes.
    vi.resetModules();
    const { POST: post } = await import('../src/pages/api/inscricao');
    const pedir = (email: string, n: number) =>
      post({
        request: new Request('http://localhost/api/inscricao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, consentimento: true }) }),
        clientAddress: `10.2.${Math.floor(n / 250)}.${n % 250}`,
        url: new URL('http://localhost/api/inscricao'),
        site: new URL('https://laesa.icev.edu.br'),
      } as never) as Promise<Response>;
    for (let i = 0; i < 301; i++) await pedir('insistente@exemplo.com', i);
    enviar.mockReset();
    expect((await pedir('outra.pessoa@exemplo.com', 400)).status).toBe(202);
    expect(enviar).toHaveBeenCalledOnce();
  });

  it('falha no envio devolve a cota: 500 e a nova tentativa envia de novo', async () => {
    enviar.mockRejectedValueOnce(new Error('smtp caiu'));
    expect((await chamar({ email: 'tenta.de.novo@exemplo.com', consentimento: true })).status).toBe(500);
    expect((await chamar({ email: 'tenta.de.novo@exemplo.com', consentimento: true })).status).toBe(202);
    expect(enviar).toHaveBeenCalledTimes(2);
  });

  it('422 sem consentimento ou com e-mail inválido', async () => {
    const sem = await chamar({ email: 'a@b.com' });
    expect(sem.status).toBe(422);
    expect((await sem.json()).erros.consentimento).toBeTruthy();
    expect((await chamar({ email: 'x', consentimento: true })).status).toBe(422);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('honeypot finge sucesso e não envia', async () => {
    expect((await chamar({ email: 'bot@spam.com', consentimento: true, nao_preencher: 'x' })).status).toBe(202);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('400 com corpo null (não quebra com 500)', async () => {
    expect((await chamar(null)).status).toBe(400);
  });
});

describe('POST /api/inscricao: limite diário por IP', () => {
  const MIN = 60 * 1000;
  const rotaNova = async () => {
    vi.resetModules();
    const { POST: post } = await import('../src/pages/api/inscricao');
    let n = 0;
    return (email = `p${n}@exemplo.com`, endereco = `10.70.${Math.floor(n / 250)}.${n++ % 250}`) =>
      post({
        request: new Request('http://localhost/api/inscricao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, consentimento: true }) }),
        clientAddress: endereco,
        url: new URL('http://localhost/api/inscricao'),
        site: new URL('https://laesa.icev.edu.br'),
      } as never) as Promise<Response>;
  };
  /** Pedidos do mesmo IP, pulando a janela de 10 minutos a cada 5 para só o limite diário contar. */
  async function espalhados(pedir: (email?: string, ip?: string) => Promise<Response>, ip: string, emails: string[]) {
    const statuses: number[] = [];
    for (const [i, email] of emails.entries()) {
      if (i > 0 && i % 5 === 0) vi.advanceTimersByTime(11 * MIN);
      statuses.push((await pedir(email, ip)).status);
    }
    return statuses;
  }
  const emails = (prefixo: string, n: number) => Array.from({ length: n }, (_, i) => `${prefixo}${i}@exemplo.com`);
  beforeEach(() => {
    enviar.mockReset();
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('429 depois de 20 pedidos do mesmo IP no dia', async () => {
    const pedir = await rotaNova();
    const statuses = await espalhados(pedir, '192.168.2.1', emails('a', 21));
    expect(statuses).toEqual([...Array(20).fill(202), 429]);
    expect(enviar).toHaveBeenCalledTimes(20);
  });

  it('IP no limite diário não gasta a cota global e os outros IPs continuam passando', async () => {
    const pedir = await rotaNova();
    await espalhados(pedir, '192.168.2.2', emails('b', 100)); // 20 passam, 80 barrados
    enviar.mockReset();
    for (let i = 0; i < 280; i++) expect((await pedir()).status).toBe(202);
    expect(enviar).toHaveBeenCalledTimes(280); // 20 + 280 = teto global de 300
    expect((await pedir()).status).toBe(202);
    expect(enviar).toHaveBeenCalledTimes(280); // teto global: responde igual, sem enviar
  });

  it('pedido que não envia (e-mail repetido ou falha) não gasta a vaga do dia', async () => {
    const pedir = await rotaNova();
    enviar.mockRejectedValueOnce(new Error('smtp caiu'));
    const lista = ['falha@exemplo.com', ...Array(10).fill('repete@exemplo.com'), ...emails('c', 18), 'ultimo@exemplo.com', 'sobra@exemplo.com'];
    const statuses = await espalhados(pedir, '192.168.2.3', lista);
    // Só 19 confirmações saíram (o primeiro "repete" e os 18 novos): "ultimo" ainda cabe, "sobra" já não.
    expect(statuses).toEqual([500, ...Array(29).fill(202), 429]);
    expect(enviar).toHaveBeenCalledTimes(1 + 1 + 18 + 1);
  });
});

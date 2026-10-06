import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('repetir o mesmo e-mail não consome a cota global', async () => {
    for (let i = 0; i < 20; i++) await chamar({ email: 'insistente@exemplo.com', consentimento: true }, `10.2.${i}.1`);
    enviar.mockReset();
    expect((await chamar({ email: 'outra.pessoa@exemplo.com', consentimento: true })).status).toBe(202);
    expect(enviar).toHaveBeenCalledOnce();
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

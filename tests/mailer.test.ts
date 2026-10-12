import { afterEach, describe, expect, it, vi } from 'vitest';

// Cada caso carrega o mailer de novo com outras variáveis (o astro:env é lido ao importar).
async function carregar(env: { SMTP_HOST?: string; SMTP_USER?: string; SMTP_PASS?: string; ENVIO_REAL?: boolean }) {
  vi.resetModules();
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  vi.doMock('nodemailer', () => ({ default: { createTransport } }));
  vi.doMock('astro:env/server', () => ({ SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: 465, SMTP_USER: 'laesa@somosicev.com', SMTP_PASS: 'x', ENVIO_REAL: undefined, ...env }));
  const mailer = await import('../src/lib/mailer');
  return { ...mailer, createTransport, sendMail };
}

const email = { to: 'a@b.com', subject: 'oi', text: 'oi' };

describe('mailer: trava de envio real fora de produção', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('nodemailer');
    vi.doUnmock('astro:env/server');
  });

  it('recusa SMTP que não é local em testes, sem criar o transporte', async () => {
    const { enviar, EnvioIndisponivel, createTransport } = await carregar({ SMTP_HOST: 'smtp.gmail.com' });
    await expect(enviar(email)).rejects.toBeInstanceOf(EnvioIndisponivel);
    await expect(enviar(email)).rejects.toThrow(/bloqueado/);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('aceita SMTP local (Mailpit)', async () => {
    for (const host of ['localhost', '127.0.0.1', '::1', 'mailpit', 'LOCALHOST']) {
      const { enviar, createTransport, sendMail } = await carregar({ SMTP_HOST: host });
      await enviar(email);
      expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host }));
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com' }));
    }
  });

  it('ENVIO_REAL=true libera SMTP real de propósito', async () => {
    const { enviar, createTransport } = await carregar({ SMTP_HOST: 'smtp.gmail.com', ENVIO_REAL: true });
    await enviar(email);
    expect(createTransport).toHaveBeenCalledOnce();
  });

  it('recusa SMTP real sem NODE_ENV (npm run preview, node dist/server/entry.mjs com .env copiado)', async () => {
    vi.stubEnv('NODE_ENV', undefined);
    const { enviar, createTransport } = await carregar({ SMTP_HOST: 'smtp.gmail.com' });
    await expect(enviar(email)).rejects.toThrow(/bloqueado em development/);
    vi.stubEnv('NODE_ENV', 'development');
    await expect(enviar(email)).rejects.toThrow(/bloqueado/);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('NODE_ENV=production em tempo de execução libera SMTP real', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { enviar, createTransport } = await carregar({ SMTP_HOST: 'smtp.gmail.com' });
    await enviar(email);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.gmail.com' }));
  });

  it('EnvioIndisponivel sem SMTP_USER ou SMTP_PASS', async () => {
    for (const falta of [{ SMTP_USER: undefined }, { SMTP_PASS: undefined }]) {
      const { enviar, EnvioIndisponivel, createTransport } = await carregar({ SMTP_HOST: 'localhost', ...falta });
      await expect(enviar(email)).rejects.toBeInstanceOf(EnvioIndisponivel);
      await expect(enviar(email)).rejects.toThrow(/SMTP não configurado/);
      expect(createTransport).not.toHaveBeenCalled();
    }
  });
});

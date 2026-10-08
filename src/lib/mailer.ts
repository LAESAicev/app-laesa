// Envio de e-mail pela conta Google Workspace da LAESA (SMTP). Credenciais só em variáveis de ambiente.
import nodemailer, { type Transporter } from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ENVIO_REAL } from 'astro:env/server';
import { PUBLIC_CONTACT_EMAIL } from 'astro:env/client';

export class EnvioIndisponivel extends Error {
  constructor(mensagem = 'SMTP não configurado: defina SMTP_USER e SMTP_PASS (ver .env.example).') {
    super(mensagem);
  }
}

const SMTP_LOCAL = new Set(['localhost', '127.0.0.1', '::1', 'mailpit']);

/** Em dev e testes, só SMTP local (Mailpit): um .env de produção copiado não manda e-mail de verdade sem querer. */
function bloqueiaEnvioReal() {
  const devOuTeste = import.meta.env.DEV || import.meta.env.MODE === 'test';
  if (devOuTeste && !SMTP_LOCAL.has(SMTP_HOST.toLowerCase()) && !ENVIO_REAL) {
    throw new EnvioIndisponivel(`Envio real bloqueado em ${import.meta.env.MODE}: SMTP_HOST=${SMTP_HOST} não é local. Use o Mailpit ou ENVIO_REAL=true.`);
  }
}

let transporter: Transporter | undefined;

function transporte(): Transporter {
  if (!SMTP_USER || !SMTP_PASS) throw new EnvioIndisponivel();
  bloqueiaEnvioReal();
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // 465 = TLS direto (Gmail); 587/1025 = STARTTLS ou texto (Mailpit)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Redes que bloqueiam SMTP deixariam o formulário "Enviando" por ~2 min (padrão do nodemailer).
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export type Email = { to: string; subject: string; text: string; replyTo?: string; headers?: Record<string, string> };

export async function enviar(email: Email): Promise<void> {
  await transporte().sendMail({
    // O Gmail exige que o remetente seja a conta autenticada; em dev (Mailpit) o usuário pode não ser um e-mail.
    from: { name: 'Site LAESA', address: SMTP_USER?.includes('@') ? SMTP_USER : PUBLIC_CONTACT_EMAIL },
    ...email,
  });
}

// Envio de e-mail pela conta Google Workspace da LAESA (SMTP). Credenciais só em variáveis de ambiente.
import nodemailer, { type Transporter } from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } from 'astro:env/server';
import { PUBLIC_CONTACT_EMAIL } from 'astro:env/client';

export class EnvioIndisponivel extends Error {
  constructor() {
    super('SMTP não configurado: defina SMTP_USER e SMTP_PASS (ver .env.example).');
  }
}

let transporter: Transporter | undefined;

function transporte(): Transporter {
  if (!SMTP_USER || !SMTP_PASS) throw new EnvioIndisponivel();
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // 465 = TLS direto (Gmail); 587/1025 = STARTTLS ou texto (Mailpit)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
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

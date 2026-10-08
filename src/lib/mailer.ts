// Envio de e-mail pela conta Google Workspace da LAESA (SMTP). Credenciais só em variáveis de ambiente.
import type { Transporter } from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ENVIO_REAL } from 'astro:env/server';
import { PUBLIC_CONTACT_EMAIL } from 'astro:env/client';
import { EnvioIndisponivel, ambienteAtual, bloqueiaEnvioReal, criarTransporte, envioRealLiberado } from './smtp';

export { EnvioIndisponivel };

let transporter: Transporter | undefined;

function transporte(): Transporter {
  if (!SMTP_USER || !SMTP_PASS) throw new EnvioIndisponivel();
  bloqueiaEnvioReal(SMTP_HOST, envioRealLiberado(ENVIO_REAL), ambienteAtual());
  transporter ??= criarTransporte({ host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER, pass: SMTP_PASS });
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

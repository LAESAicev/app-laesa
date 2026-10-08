// Transporte SMTP e trava contra envio real sem querer. Módulo puro (sem astro:env): usado pelo site
// (src/lib/mailer.ts) e pelo comando dos avisos (scripts/avisar.ts), cada um com a sua configuração.
import nodemailer, { type Transporter } from 'nodemailer';

export class EnvioIndisponivel extends Error {
  constructor(mensagem = 'SMTP não configurado: defina SMTP_USER e SMTP_PASS (ver .env.example).') {
    super(mensagem);
  }
}

const SMTP_LOCAL = new Set(['localhost', '127.0.0.1', '::1', 'mailpit']);

export const smtpLocal = (host: string) => SMTP_LOCAL.has(host.toLowerCase());

/**
 * Fora de produção, só SMTP local (Mailpit): um .env de produção copiado não manda e-mail de verdade sem querer.
 * `liberado`: produção ou ENVIO_REAL=true. `ambiente` só entra na mensagem.
 */
export function bloqueiaEnvioReal(host: string, liberado: boolean, ambiente: string): void {
  if (!liberado && !smtpLocal(host)) {
    throw new EnvioIndisponivel(`Envio real bloqueado em ${ambiente}: SMTP_HOST=${host} não é local. Use o Mailpit ou ENVIO_REAL=true.`);
  }
}

export type ConfigSmtp = { host: string; port: number; user: string; pass: string };

export function criarTransporte({ host, port, user, pass }: ConfigSmtp): Transporter {
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = TLS direto (Gmail); 587/1025 = STARTTLS ou texto (Mailpit)
    auth: { user, pass },
    // Redes que bloqueiam SMTP deixariam o formulário "Enviando" por ~2 min (padrão do nodemailer).
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

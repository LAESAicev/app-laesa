// Remetente dos avisos: transporte SMTP a partir de uma configuração simples, com a mesma trava do site
// (src/lib/smtp.ts): fora de produção, só SMTP local, a não ser que ENVIO_REAL=true.
import { EnvioIndisponivel, bloqueiaEnvioReal, criarTransporte, type ConfigSmtp } from '../smtp.ts';
import type { Mensagem } from './templates.ts';

export type ConfigRemetente = Partial<ConfigSmtp> & {
  host: string;
  port: number;
  /** NODE_ENV=production (a imagem Docker define) ou ENVIO_REAL=true. */
  liberado: boolean;
  ambiente: string;
  /** Endereço de quem envia quando SMTP_USER não é um e-mail (Mailpit). */
  contato: string;
};

export function criarRemetente(c: ConfigRemetente): (m: Mensagem) => Promise<void> {
  if (!c.user || !c.pass) throw new EnvioIndisponivel();
  bloqueiaEnvioReal(c.host, c.liberado, c.ambiente);
  const transporte = criarTransporte({ host: c.host, port: c.port, user: c.user, pass: c.pass });
  // O Gmail exige que o remetente seja a conta autenticada.
  const from = { name: 'LAESA', address: c.user.includes('@') ? c.user : c.contato };
  return async (m) => {
    await transporte.sendMail({ from, ...m });
  };
}

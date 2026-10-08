// Links assinados (HMAC) de confirmação e descadastro. Módulo puro: o segredo chega por parâmetro, então serve
// ao site (src/lib/inscricao.ts, com astro:env) e ao comando dos avisos (scripts/avisar.ts, rodado direto no Node).
import { createHmac, timingSafeEqual } from 'node:crypto';

export type Acao = 'confirmar' | 'sair';
export type Token = { email: string; emitidoEm: number };

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;
const b64 = (s: string) => Buffer.from(s).toString('base64url');
const assinatura = (segredo: string, payload: string) => createHmac('sha256', segredo).update(payload).digest('base64url');

export function gerarToken(segredo: string, email: string, acao: Acao, agora = Date.now()): string {
  const payload = b64(JSON.stringify({ e: email, a: acao, i: agora }));
  return `${payload}.${assinatura(segredo, payload)}`;
}

export function lerToken(segredo: string, token: string, acao: Acao, agora = Date.now()): Token | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const esperado = Buffer.from(assinatura(segredo, payload));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  try {
    const { e, a, i } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { e: string; a: Acao; i: number };
    if (a !== acao || typeof e !== 'string' || typeof i !== 'number') return null;
    if (acao === 'confirmar' && agora - i > SETE_DIAS) return null;
    return { email: e, emitidoEm: i };
  } catch {
    return null;
  }
}

/** Para os avisos enviados pela Mesa: link de descadastro e cabeçalhos de um clique (RFC 8058). */
export function linkDescadastro(segredo: string, email: string, site: URL | string) {
  const link = new URL(`/avisos/descadastro?t=${gerarToken(segredo, email, 'sair')}`, site).toString();
  return { link, headers: { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
}

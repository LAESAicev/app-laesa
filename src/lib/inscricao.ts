// Inscrição em avisos (confirmação dupla). Links de confirmação e descadastro são assinados (HMAC),
// então validá-los não exige guardar tokens. A ação só acontece por POST (botão na página ou o
// descadastro de um clique do Gmail, RFC 8058): scanners de link fazem GET e não podem confirmar nada.
// Inscritos: SQLite no volume /data do contêiner (INSCRITOS_STORE=sqlite, arquivo em INSCRITOS_DB) ou SQLite
// em memória (INSCRITOS_STORE=memoria, só dev e testes).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { INSCRICAO_SECRET, INSCRITOS_DB, INSCRITOS_STORE } from 'astro:env/server';
import { criarInscritosSqlite } from './inscritos-sqlite';
import { criarLimite } from './rate-limit';

export { inscricaoSchemaCliente as inscricaoSchema } from './inscricao.schema';

// ---- links assinados
type Acao = 'confirmar' | 'sair';
type Token = { email: string; emitidoEm: number };
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;
const b64 = (s: string) => Buffer.from(s).toString('base64url');

export class InscricaoIndisponivel extends Error {}

function assinatura(payload: string): string {
  if (!INSCRICAO_SECRET) throw new InscricaoIndisponivel('INSCRICAO_SECRET não definido.');
  return createHmac('sha256', INSCRICAO_SECRET).update(payload).digest('base64url');
}

export function gerarToken(email: string, acao: Acao, agora = Date.now()): string {
  const payload = b64(JSON.stringify({ e: email, a: acao, i: agora }));
  return `${payload}.${assinatura(payload)}`;
}

export function lerToken(token: string, acao: Acao, agora = Date.now()): Token | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const esperado = Buffer.from(assinatura(payload));
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

// ---- armazenamento
export interface Inscritos {
  adicionar(email: string, consentimentoEm: Date): Promise<void>;
  remover(email: string, em: Date): Promise<void>;
  /** Quando o e-mail saiu da lista pela última vez (links de confirmação anteriores deixam de valer). */
  removidoEm(email: string): Promise<Date | undefined>;
  listar(): Promise<string[]>;
}

let ativo: Inscritos | undefined;

/** Armazenamento ativo. Lança InscricaoIndisponivel sem segredo ou sem INSCRITOS_STORE definido. */
export function inscritos(): Inscritos {
  if (!INSCRICAO_SECRET) throw new InscricaoIndisponivel('INSCRICAO_SECRET não definido.');
  // "memoria" usa o mesmo SQLite, num banco que some ao reiniciar: dev e testes passam pelo SQL de produção.
  if (INSCRITOS_STORE === 'sqlite') return (ativo ??= criarInscritosSqlite(INSCRITOS_DB, INSCRICAO_SECRET));
  if (INSCRITOS_STORE === 'memoria') return (ativo ??= criarInscritosSqlite(':memory:', INSCRICAO_SECRET));
  throw new InscricaoIndisponivel('INSCRITOS_STORE não definido (use "sqlite" ou "memoria").');
}

export async function confirmar(token: string): Promise<boolean> {
  const t = lerToken(token, 'confirmar');
  if (!t) return false;
  const store = inscritos();
  const saiu = await store.removidoEm(t.email);
  if (saiu && saiu.getTime() >= t.emitidoEm) return false; // link anterior a um descadastro
  await store.adicionar(t.email, new Date());
  return true;
}

export async function descadastrar(token: string): Promise<boolean> {
  const t = lerToken(token, 'sair');
  if (!t) return false;
  await inscritos().remover(t.email, new Date());
  return true;
}

// ---- limites contra bombardeio de terceiros
const porDestinatario = criarLimite(1, 24 * 60 * 60 * 1000); // 1 confirmação por e-mail a cada 24h
const global = criarLimite(300, 24 * 60 * 60 * 1000); // teto diário de confirmações (cota do Workspace ~2.000/dia)
const hash = (email: string) => createHash('sha256').update(email).digest('hex');

/** true se pode mandar confirmação para este e-mail agora. Consome a cota. */
export function podeEnviarConfirmacao(email: string): boolean {
  // destinatário primeiro: repetir o mesmo e-mail não pode consumir a cota global de todo mundo
  return porDestinatario(hash(email)) && global('todos');
}

/** Devolve a cota de uma confirmação que não chegou a sair (o envio falhou): a nova tentativa envia de novo. */
export function devolverConfirmacao(email: string): void {
  porDestinatario.devolver(hash(email));
  global.devolver('todos');
}

export function emailConfirmacao(email: string, site: URL) {
  const link = new URL(`/avisos/confirmar?t=${gerarToken(email, 'confirmar')}`, site);
  return {
    to: email,
    subject: 'Confirme sua inscrição nas novidades da LAESA',
    text: [
      'Oi! Recebemos um pedido para enviar as novidades da LAESA (editais, eventos, oficinas e projetos) para este e-mail.',
      '',
      `Para confirmar, abra o link e clique em "Confirmar inscrição" (vale por 7 dias): ${link}`,
      '',
      'Se não foi você, ignore este e-mail: sem confirmação, nada acontece.',
      '',
      '— LAESA · Liga Acadêmica de Engenharia de Software Aplicada (iCEV)',
    ].join('\n'),
  };
}

/** Para os avisos enviados pela Mesa: link de descadastro e cabeçalhos de um clique (RFC 8058). */
export function descadastro(email: string, site: URL) {
  const link = new URL(`/avisos/descadastro?t=${gerarToken(email, 'sair')}`, site).toString();
  return { link, headers: { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
}

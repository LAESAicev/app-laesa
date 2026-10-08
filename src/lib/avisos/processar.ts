// Processa a fila: um e-mail por vez, no ritmo do Gmail, até não sobrar nada "enviando"; depois sai.
// Não existe serviço rodando o tempo todo: o comando "enviar" (ou "retomar") inicia este processo em segundo plano.
import { randomUUID } from 'node:crypto';
import type { Fila } from './fila.ts';
import { mensagemPara, type Mensagem } from './templates.ts';

/** Teto de avisos em 24h. A conta do Workspace aguenta ~2.000/dia; sobram 300 para confirmações e 100 para contato. */
export const TETO_DIARIO = 1500;
/** ~1 e-mail a cada 2,5 s: 1.500 avisos levam ~1 hora. */
export const INTERVALO_MS = 2500;
/** Esperas depois de uma falha passageira do SMTP (1, 5 e 15 min). Esgotou: pausa o envio. */
export const ESPERAS_MS = [60_000, 5 * 60_000, 15 * 60_000];
/** Falhas definitivas seguidas (recusa ou falha ambígua): mais que isso é problema da conta, não de endereços. Pausa. */
const RECUSAS_SEGUIDAS = 3;
const VEZ_MS = 2 * 60_000;

type ErroSmtp = { code?: string; responseCode?: number; response?: string; syscall?: string; message?: string };

/** Recusa do próprio destinatário (endereço que não existe), que não adianta tentar de novo. */
function recusaDoDestinatario(e: unknown): boolean {
  const err = e as ErroSmtp;
  return err?.code === 'EENVELOPE' && [550, 551, 553].includes(err.responseCode ?? 0) && !/5\.4\.5|quota|limit/i.test(err.response ?? '');
}

/**
 * A mensagem com certeza não foi aceita, então dá para tentar de novo: o servidor respondeu com erro, ou a falha
 * foi antes da sessão (DNS, conexão recusada, TLS, login). No nodemailer 10, timeout e queda de conexão no meio
 * da sessão também vêm com command "CONN": sem resposta do servidor, só as mensagens de antes da saudação contam.
 */
function antesDoAceite(e: unknown): boolean {
  const err = e as ErroSmtp;
  if (err?.responseCode) return true;
  if (['EDNS', 'ETLS', 'EAUTH', 'ENOAUTH', 'EENVELOPE', 'EMESSAGE'].includes(err?.code ?? '')) return true;
  if (err?.syscall === 'connect' || err?.syscall === 'getaddrinfo') return true;
  return /^(Connection timeout|Greeting never received)/.test(err?.message ?? '');
}

/** Descrição curta do erro, sem o endereço (o log não guarda e-mails). */
const resumo = (e: unknown) => {
  const err = e as { code?: string; responseCode?: number; message?: string };
  return [err?.code, err?.responseCode].filter(Boolean).join(' ') || 'erro desconhecido';
};

export type Opcoes = {
  fila: Fila;
  segredo: string;
  enviar: (m: Mensagem) => Promise<void>;
  dono?: string;
  intervaloMs?: number;
  esperasMs?: number[];
  tetoDiario?: number;
  dormir?: (ms: number) => Promise<void>;
  log?: (linha: string) => void;
};

/** "sem-vez": outro processador já está cuidando da fila. "fim": não sobrou nada para enviar agora. */
export async function processar(o: Opcoes): Promise<'sem-vez' | 'fim'> {
  const { fila, segredo, enviar } = o;
  const dono = o.dono ?? randomUUID();
  const intervalo = o.intervaloMs ?? INTERVALO_MS;
  const esperas = o.esperasMs ?? ESPERAS_MS;
  const teto = o.tetoDiario ?? TETO_DIARIO;
  const dormir = o.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = o.log ?? ((l: string) => console.log(`[avisos] ${new Date().toISOString()} ${l}`));

  if (!fila.pegarVez(dono, VEZ_MS)) {
    log('outro processador já está enviando; nada a fazer aqui');
    return 'sem-vez';
  }
  let tentativa = 0;
  let recusas = 0;
  try {
    for (;;) {
      fila.renovarVez(dono, VEZ_MS);
      const envio = fila.proximoEnvio();
      if (!envio) {
        if (fila.liberarSeVazio(dono)) break;
        continue; // um envio novo entrou entre a busca e a saída
      }
      if (fila.enviadosUltimas24h() >= teto) {
        fila.pausar(envio.id, `teto de ${teto} avisos em 24 horas atingido; retome amanhã`);
        log(`envio ${envio.id} pausado: teto diário`);
        continue;
      }
      const email = await fila.proximoDestinatario(envio.id);
      if (!email) {
        fila.concluir(envio.id);
        log(`envio ${envio.id} concluído`);
        tentativa = 0;
        continue;
      }
      const rascunho = fila.rascunho(envio.rascunho_id)!;
      const c = fila.reservar(envio.id, email);
      try {
        await enviar(mensagemPara(rascunho, email, segredo));
        fila.registrar(envio.id, c, true);
        tentativa = 0;
        recusas = 0;
      } catch (e) {
        // recusa do destinatário, ou falha que pode ter acontecido depois do aceite (timeout depois do DATA):
        // conta como falha e segue. Reenviar arriscaria e-mail duplicado; ninguém recebe duas vezes vale mais.
        if (recusaDoDestinatario(e) || !antesDoAceite(e)) {
          fila.registrar(envio.id, c, false);
          log(`envio ${envio.id}: ${recusaDoDestinatario(e) ? 'destinatário recusado' : 'falha sem saber se saiu, não reenvia'} (${resumo(e)})`);
          if (++recusas >= RECUSAS_SEGUIDAS) {
            fila.pausar(envio.id, `${recusas} falhas seguidas (${resumo(e)}); confira a conta e o SMTP antes de retomar`);
            recusas = 0;
          }
        } else {
          fila.desfazer(envio.id, c);
          if (tentativa < esperas.length) {
            const espera = esperas[tentativa++];
            log(`envio ${envio.id}: falha passageira (${resumo(e)}); nova tentativa em ${Math.round(espera / 1000)} s`);
            fila.renovarVez(dono, espera + VEZ_MS);
            await dormir(espera);
            continue;
          }
          fila.pausar(envio.id, `SMTP falhou ${tentativa + 1} vezes seguidas (${resumo(e)}); retome quando o problema passar`);
          log(`envio ${envio.id} pausado: ${resumo(e)}`);
          tentativa = 0;
          continue;
        }
      }
      await dormir(intervalo);
    }
  } finally {
    fila.liberar(dono);
  }
  return 'fim';
}

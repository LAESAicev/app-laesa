// O que a Mesa faz com os avisos (ver itens, preparar, testar, conferir antes de enviar), sem terminal nem tela:
// o comando (scripts/avisar.ts) e a tela de avisos usam estas funções, então as travas são as mesmas nos dois.
// Nada aqui lê o ambiente nem escreve no console: manifesto, segredo, destino do teste e remetente chegam por
// parâmetro. Erros para quem está na Mesa saem como ErroAviso.
import { randomInt } from 'node:crypto';
import { hojeEm } from '../atividades.ts';
import { bloqueios } from './bloqueios.ts';
import { ErroAviso, type Fila, type Rascunho } from './fila.ts';
import { nomeDo, type Item, type Manifesto } from './manifesto.ts';
import { estadoDa, eventoSugerido, mensagemPara, renderizar, type Conteudo, type Evento, type Mensagem } from './templates.ts';

/** "2026-2", "edital:2026-2" ou o slug de uma atividade. */
export function acharItem(m: Manifesto, chave: string | undefined): Item | undefined {
  if (!chave) return undefined;
  return m.itens.find((i) => i.id === chave) ?? m.itens.find((i) => i.id.endsWith(`:${chave}`));
}

/** Lança ErroAviso com todos os bloqueios, se houver. */
export function conferir(evento: Evento, item: Item | undefined, m: Manifesto, conteudo: Conteudo): void {
  const motivos = bloqueios({ evento, item, manifesto: m, conteudo });
  if (!motivos.length) return;
  throw new ErroAviso(`Bloqueado:\n${motivos.map((x) => `  - ${x}`).join('\n')}`);
}

/** Revalida o rascunho com o site publicado agora (o item pode ter mudado desde o preparar). */
export function revalidar(r: Rascunho, m: Manifesto): void {
  const item = r.item ? acharItem(m, r.item) : undefined;
  conferir(r.evento, item, m, r);
}

export type ResumoItem = {
  item: Item;
  nome: string;
  /** "seleção: aberto" (edital) ou o estado da atividade hoje. */
  situacao: string;
  /** Evento sugerido para hoje; sem ele, nada a avisar agora (e os outros campos ficam vazios). */
  evento?: Evento;
  antes: { envio_id: number; criado_em: string; por: string }[];
  motivos: string[];
};

/** O que está publicado e o aviso sugerido para cada item, com os bloqueios e os envios anteriores. */
export function resumoItens(fila: Fila, m: Manifesto, hoje = hojeEm()): ResumoItem[] {
  return m.itens.map((item) => {
    const evento = eventoSugerido(item, hoje);
    const situacao = item.tipo === 'edital' ? `seleção: ${item.status}` : estadoDa(item, hoje);
    const base = { item, nome: nomeDo(item), situacao, evento, antes: [], motivos: [] };
    if (!evento) return base;
    return { ...base, antes: fila.notificacoes(item.id, evento), motivos: bloqueios({ evento, item, manifesto: m, conteudo: renderizar(evento, item), hoje }) };
  });
}

/**
 * Monta o aviso, confere os bloqueios e salva o rascunho. `extra` (assunto e texto) é do evento "livre";
 * nos outros, só substitui o modelo se vier. Quem chama confere antes que o item existe (e, no livre, que veio texto).
 */
export async function preparar(fila: Fila, m: Manifesto, evento: Evento, item: Item | undefined, extra: Partial<Conteudo> = {}) {
  const conteudo = renderizar(evento, item, extra);
  conferir(evento, item, m, conteudo);
  const rascunho = fila.salvarRascunho({ item: item?.id ?? null, evento, ...conteudo, site: m.site, contato: m.contato });
  const total = (await fila.inscritos()).length;
  const antes = item ? fila.notificacoes(item.id, evento) : [];
  return { rascunho, total, antes };
}

// Sem 0/O e 1/I: o código é lido no e-mail e digitado na tela.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const normalizarCodigo = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Bloco que só a cópia de teste leva, acima do texto. */
const blocoTeste = (codigo: string) =>
  [
    `CÓPIA DE TESTE. Código para enviar este aviso pela tela de avisos: ${codigo} (vale 24 horas).`,
    'Só o teste tem este bloco: quem está inscrito recebe a partir da linha abaixo.',
    '----------------------------------------',
    '',
    '',
  ].join('\n');

/**
 * Manda o teste do rascunho para `para` (a caixa da LAESA). Revalida antes; só depois do envio aceito marca o
 * teste e guarda o código (só o HMAC). Devolve o código para quem chamou decidir; não o escreva em log.
 */
export async function testar(opcoes: { fila: Fila; manifesto: Manifesto; rascunho: Rascunho; para: string; segredo: string; enviar: (m: Mensagem) => Promise<void> }): Promise<{ para: string; codigo: string }> {
  const { fila, rascunho: r, para } = opcoes;
  revalidar(r, opcoes.manifesto);
  const bruto = Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
  const codigo = `${bruto.slice(0, 4)}-${bruto.slice(4)}`;
  const m = mensagemPara(r, para, opcoes.segredo);
  await opcoes.enviar({ ...m, text: blocoTeste(codigo) + m.text });
  fila.marcarTeste(r.id);
  fila.guardarCodigoTeste(r, bruto);
  return { para, codigo };
}

/** Recusa (ErroAviso) código que não é o do último teste deste conteúdo ou que venceu. Aceita minúsculas e sem hífen. */
export function conferirCodigo(fila: Fila, rascunhoId: number, codigo: string): void {
  const r = fila.rascunho(rascunhoId);
  if (!r) throw new ErroAviso(`Rascunho ${rascunhoId} não existe.`);
  const c = normalizarCodigo(codigo);
  if (c.length !== 8 || !fila.codigoTesteValido(r, c)) {
    throw new ErroAviso('O código não confere com o do último teste deste aviso, ou já venceu (vale 24 horas). Mande um teste novo e use o código dele.');
  }
}

/**
 * Tudo que precisa valer antes de pedir a confirmação: site publicado sem bloqueio, teste deste conteúdo, sem
 * repetição (a não ser com `reenviar`) e alguém inscrito. `total` é o número que a confirmação exige.
 * O criarEnvio confere de novo na hora de criar.
 */
export async function conferirAntesDeEnviar(fila: Fila, m: Manifesto, r: Rascunho, reenviar: boolean): Promise<{ rascunho: Rascunho; total: number }> {
  revalidar(r, m);
  fila.conferirEnvio(r, reenviar);
  const total = (await fila.inscritos()).length;
  if (!total) throw new ErroAviso('Ninguém inscrito: não há para quem enviar.');
  return { rascunho: r, total };
}

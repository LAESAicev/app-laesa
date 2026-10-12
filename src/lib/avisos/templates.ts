// Texto dos avisos: assunto e corpo a partir do item publicado e do evento. Texto puro, sem HTML, e só com
// links para páginas do próprio site (Instagram, formulários etc. ficam na página, não no e-mail).
// Dado que falta vira "[data]": os bloqueios (bloqueios.ts) recusam qualquer colchete desses no texto final.
import { classificar, diaMes, diaMesAno, hojeEm, type Estado } from '../atividades.ts';
import { linkDescadastro } from '../tokens.ts';
import type { Item, ItemAtividade, ItemEdital } from './manifesto.ts';

export const EVENTOS = ['edital-aberto', 'edital-prorrogado', 'atividade-inscricoes', 'atividade-breve', 'projeto', 'livre'] as const;
export type Evento = (typeof EVENTOS)[number];
export const eventoValido = (v: string): v is Evento => (EVENTOS as readonly string[]).includes(v);

export type Conteudo = { assunto: string; texto: string };

const FALTA = '[data]';
/** "23 out" no assunto, "23 out 2026" no corpo; data que falta vira [data]. */
const dataCurta = (iso: string | undefined) => (iso ? diaMes(iso) : FALTA);
const dataLonga = (iso: string | undefined) => (iso ? diaMesAno(iso) : FALTA);

/** Assunto vai num cabeçalho: quebra de linha ali permitiria injetar outros cabeçalhos. */
const limparAssunto = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Fim das inscrições que vale agora: a prorrogação, se houver. */
export const fimInscricoes = (e: ItemEdital) => e.prorrogadasAte ?? e.inscricoesAte;

export const estadoDa = (a: ItemAtividade, hoje = hojeEm()): Estado => classificar(a, hoje);

const quandoAssunto = (a: ItemAtividade) => (a.fim ? `${dataCurta(a.inicio)} a ${dataCurta(a.fim)}` : dataCurta(a.inicio));
const quandoTexto = (a: ItemAtividade) => (a.fim ? `de ${dataLonga(a.inicio)} a ${dataLonga(a.fim)}` : `em ${dataLonga(a.inicio)}`);
const DUVIDAS = 'Dúvidas? É só responder este e-mail.';

/** Evento que faz sentido para o item hoje, ou undefined se não há o que avisar. */
export function eventoSugerido(item: Item, hoje = hojeEm()): Evento | undefined {
  if (item.tipo === 'edital') {
    if (item.status !== 'aberto') return undefined;
    return item.prorrogadasAte ? 'edital-prorrogado' : 'edital-aberto';
  }
  const estado = estadoDa(item, hoje);
  if (estado === 'aberto') return 'atividade-inscricoes';
  if (estado === 'breve') return 'atividade-breve';
  if (item.eixos.includes('projetos') && (estado === 'andamento' || estado === 'acontecendo')) return 'projeto';
  return undefined;
}

/** Assunto e corpo do evento para o item. `livre` não tem modelo: assunto e texto vêm de quem prepara. */
export function renderizar(evento: Evento, item: Item | undefined, extra: Partial<Conteudo> = {}): Conteudo {
  const base = modelo(evento, item);
  return { assunto: limparAssunto(extra.assunto ?? base.assunto), texto: (extra.texto ?? base.texto).replace(/\r\n?/g, '\n').trim() };
}

function modelo(evento: Evento, item: Item | undefined): Conteudo {
  if (evento === 'livre' || !item) return { assunto: '', texto: '' };
  if (item.tipo === 'edital') {
    const vagas = item.vagas ? `São ${item.vagas} vagas. ` : '';
    const pagina = `Na página do edital estão as etapas, o cronograma e o link para se inscrever: ${item.url}`;
    if (evento === 'edital-prorrogado') {
      return {
        assunto: `${item.titulo}: inscrições prorrogadas até ${dataCurta(item.prorrogadasAte)}`,
        texto: [
          `Oi! As inscrições do ${item.titulo} da LAESA foram prorrogadas e agora vão até ${dataLonga(item.prorrogadasAte)}.`,
          '',
          `Se você ainda não se inscreveu, dá tempo. ${vagas}${pagina}`,
          '',
          DUVIDAS,
        ].join('\n'),
      };
    }
    return {
      assunto: `${item.titulo} aberto: inscrições até ${dataCurta(fimInscricoes(item))}`,
      texto: [
        `Oi! Estão abertas as inscrições do ${item.titulo} da LAESA, até ${dataLonga(fimInscricoes(item))}.`,
        '',
        `${vagas}${pagina}`,
        '',
        DUVIDAS,
      ].join('\n'),
    };
  }
  const a = item;
  if (evento === 'atividade-inscricoes') {
    return {
      assunto: `Inscrições abertas: ${a.nome}, ${quandoAssunto(a)}`,
      texto: [
        `Oi! Estão abertas as inscrições para ${a.nome}, ${quandoTexto(a)}.`,
        '',
        a.descricao,
        '',
        `Os detalhes e o link para se inscrever estão na página de atividades do site: ${a.url}`,
        '',
        DUVIDAS,
      ].join('\n'),
    };
  }
  if (evento === 'atividade-breve') {
    return {
      assunto: `Em breve na LAESA: ${a.nome}, ${quandoAssunto(a)}`,
      texto: [`Oi! Vem aí ${a.nome}, ${quandoTexto(a)}.`, '', a.descricao, '', `Mais detalhes na página de atividades do site: ${a.url}`, '', DUVIDAS].join('\n'),
    };
  }
  return {
    assunto: `Saiu do papel: ${a.nome}`,
    texto: [`Oi! Um projeto da LAESA saiu do papel: ${a.nome}.`, '', a.descricao, '', `Veja mais na página de atividades do site: ${a.url}`, '', DUVIDAS].join('\n'),
  };
}

/** Rodapé de todo aviso: por que a pessoa recebe e como sair (link dela, assinado). */
export function rodape(site: string, linkSair: string): string {
  return [
    '— LAESA · Liga Acadêmica de Engenharia de Software Aplicada (iCEV)',
    '',
    `Você recebe este e-mail porque se inscreveu nas novidades da LAESA em ${new URL(site).host}.`,
    `Para não receber mais, abra este link e confirme: ${linkSair}`,
  ].join('\n');
}

export type Rascunho = { assunto: string; texto: string; site: string; contato: string };

export type Mensagem = { to: string; subject: string; text: string; replyTo: string; headers: Record<string, string> };

/** O e-mail de um destinatário: um por mensagem, com o link de descadastro dele e o cabeçalho de um clique. */
export function mensagemPara(rascunho: Rascunho, email: string, segredo: string): Mensagem {
  const sair = linkDescadastro(segredo, email, rascunho.site);
  return {
    to: email,
    subject: limparAssunto(rascunho.assunto),
    text: `${rascunho.texto}\n\n${rodape(rascunho.site, sair.link)}\n`,
    replyTo: rascunho.contato,
    headers: sair.headers,
  };
}

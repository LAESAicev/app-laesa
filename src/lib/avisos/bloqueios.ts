// O que impede um aviso de sair. Devolve todos os motivos de uma vez, em frases para quem está na Mesa:
// cada uma diz o que está errado e onde corrigir. Lista vazia = pode seguir.
import { hojeEm } from '../atividades.ts';
import type { Item, Manifesto } from './manifesto.ts';
import { estadoDa, fimInscricoes, rodape, type Conteudo, type Evento } from './templates.ts';

const ROTULO_STATUS = { aberto: 'Inscrições abertas', 'em-andamento': 'Seleção em andamento', finalizado: 'Finalizado' } as const;
const ROTULO_ESTADO = { aberto: 'inscrições abertas', breve: 'em breve', acontecendo: 'acontecendo agora', andamento: 'em andamento', concluido: 'concluído' } as const;

const nomeDo = (item: Item) => (item.tipo === 'edital' ? item.titulo : item.nome);
const dataBr = (iso: string) => iso.split('-').reverse().join('/');

/** Domínios soltos (sem http) que costumam aparecer em texto: instagram.com/…, forms.gle/…, bit.ly/… */
const DOMINIO_SOLTO = /(?<![@\w.\/-])(?:[a-z0-9-]+\.)+(?:com|br|net|org|io|app|me|dev|gle|ly|gl|link|site)(?:\/[^\s]*)?(?![\w@-])/gi;
const URL_COMPLETA = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/** Endereços no texto que não são do site. Pontuação no fim ("…/2026-2.") não faz parte do link. */
export function linksDeFora(texto: string, site: string): string[] {
  const origem = new URL(site).origin;
  const host = new URL(site).host;
  const fora = new Set<string>();
  for (const bruto of texto.match(URL_COMPLETA) ?? []) {
    const u = bruto.replace(/[.,;:!?)\]]+$/, '');
    try {
      if (new URL(u.startsWith('www.') ? `https://${u}` : u).origin !== origem) fora.add(u);
    } catch {
      fora.add(u);
    }
  }
  const semUrls = texto.replace(URL_COMPLETA, ' ');
  for (const d of semUrls.match(DOMINIO_SOLTO) ?? []) if (d.toLowerCase().split('/')[0] !== host) fora.add(d.replace(/[.,;:!?)\]]+$/, ''));
  return [...fora];
}

type Entrada = { evento: Evento; item: Item | undefined; manifesto: Manifesto; conteudo: Conteudo; hoje?: string };

export function bloqueios({ evento, item, manifesto, conteudo, hoje = hojeEm() }: Entrada): string[] {
  const motivos: string[] = [];

  if (evento !== 'livre') {
    if (!item) return ['Item não encontrado no site publicado. Confira o código com o comando "itens" (o site foi publicado depois do cadastro?).'];
    motivos.push(...doItem(evento, item, hoje));
  }

  const { assunto, texto } = conteudo;
  if (!assunto.trim()) motivos.push('O assunto está vazio.');
  if (/[\r\n]/.test(assunto)) motivos.push('O assunto tem quebra de linha.');
  if (!texto.trim()) motivos.push('O texto está vazio.');

  // o texto como vai sair, com o rodapé: o link de descadastro também precisa ser do site
  const final = `${assunto}\n${texto}\n\n${rodape(manifesto.site, new URL('/avisos/descadastro?t=exemplo', manifesto.site).toString())}`;
  const marcadores = final.match(/\[[^\]\n]{0,40}\]/g);
  if (marcadores) motivos.push(`Faltam dados: o texto tem ${[...new Set(marcadores)].join(', ')}. Preencha o campo no painel e publique de novo.`);
  const vazios = final.match(/\b(undefined|null|NaN)\b/g);
  if (vazios) motivos.push(`O texto tem "${vazios[0]}", sinal de um campo vazio no painel.`);
  const fora = linksDeFora(final, manifesto.site);
  if (fora.length) {
    motivos.push(`Só pode ter links do site (${new URL(manifesto.site).origin}). Tire do texto: ${fora.join(', ')}. Links de Instagram ou formulários ficam na página do site.`);
  }
  return motivos;
}

function doItem(evento: Evento, item: Item, hoje: string): string[] {
  const motivos: string[] = [];
  const nome = nomeDo(item);
  if (item.exemplo) motivos.push(`"${nome}" está marcado como conteúdo provisório (exemplo) no painel. Desmarque quando o conteúdo for o real e publique de novo.`);

  if (evento === 'edital-aberto' || evento === 'edital-prorrogado') {
    if (item.tipo !== 'edital') return [...motivos, `O evento ${evento} é para editais, e "${nome}" é uma atividade.`];
    if (item.status !== 'aberto') {
      motivos.push(`No site, a seleção aparece como "${ROTULO_STATUS[item.status]}", não como "Inscrições abertas" (painel: Configurações e status da seleção).`);
    }
    if (!item.linkInscricao) motivos.push(`O ${nome} não tem "Link de inscrição" no painel: o botão Inscrever-se do site não levaria a lugar nenhum.`);
    if (!item.inscricoesAte) motivos.push(`O ${nome} não tem a data "Inscrições até" no painel.`);
    if (evento === 'edital-prorrogado' && !item.prorrogadasAte) {
      motivos.push(`O ${nome} não tem prorrogação: preencha "Inscrições prorrogadas até" no painel com uma data depois de "Inscrições até".`);
    }
    const fim = fimInscricoes(item);
    if (fim && fim < hoje) motivos.push(`As inscrições do ${nome} terminaram em ${dataBr(fim)}.`);
    return motivos;
  }

  if (item.tipo !== 'atividade') return [...motivos, `O evento ${evento} é para atividades, e "${nome}" é um edital.`];
  const estado = estadoDa(item, hoje);
  const agora = `No site, "${nome}" aparece como "${ROTULO_ESTADO[estado]}"`;
  if (evento === 'atividade-inscricoes' || evento === 'atividade-breve') {
    if (!item.inicio) motivos.push(`"${nome}" não tem "Data (ou início)" no painel.`);
    else if (evento === 'atividade-inscricoes' && estado !== 'aberto') {
      motivos.push(!item.inscricao && estado === 'breve' ? `"${nome}" não tem "Link de inscrição" no painel.` : `${agora}, não com inscrições abertas.`);
    } else if (evento === 'atividade-breve' && estado !== 'aberto' && estado !== 'breve') motivos.push(`${agora}: já não é "em breve".`);
  }
  if (evento === 'projeto' && (estado === 'aberto' || estado === 'breve')) motivos.push(`${agora}: ainda não começou.`);
  return motivos;
}

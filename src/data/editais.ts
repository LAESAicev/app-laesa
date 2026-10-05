import type { StatusSelecao } from './site';
import { selecao, editalAtual } from '../lib/content';

/**
 * Cada edital usa o mesmo template (/processos-seletivos/[slug]).
 * Os dados de cada edital vêm de content/editais/*.yaml; as etapas e regras fixas vêm do estatuto (Cap. V).
 */
export type Edital = {
  slug: string; // ex.: "2026-2" → /processos-seletivos/2026-2
  titulo: string; // ex.: "Edital 2026.2"
  inscricoesAte?: string; // data legível, ex.: "30 out 2026"
  analise?: string;
  vagas?: number;
  linkInscricao?: string;
  pdfEdital?: string;
  modeloCarta?: string;
  resultado?: string; // link do resultado, quando publicado
  exemplo?: boolean;
};

/** Status de um edital: o atual segue o site; os demais já foram encerrados. */
export function statusDo(edital: Edital): StatusSelecao {
  return edital.slug === editalAtual.slug ? selecao.status : 'finalizado';
}

export type Etapa = { titulo: string; texto: string; quando: string };

export function etapasDo(edital: Edital): Etapa[] {
  return [
    { titulo: 'Inscrição', quando: edital.inscricoesAte ? `até ${edital.inscricoesAte}` : 'até [data]', texto: 'Envie a carta de apresentação no modelo do edital e, se quiser, comprovantes e recomendações.' },
    { titulo: 'Análise da comissão', quando: edital.analise ?? '[data]', texto: 'A comissão de seleção avalia as inscrições. Passam os candidatos com maior aprovação.' },
    { titulo: 'Resultado', quando: 'em até 48h', texto: 'Divulgado em até 48 horas depois do fim do processo seletivo.' },
    { titulo: 'Aceite por e-mail', quando: 'em até 24h', texto: 'Responda ao e-mail aceitando ou recusando a vaga. Sem resposta, a vaga é considerada recusada.' },
    { titulo: 'Integração', quando: 'início da Sprint', texto: 'Você assina o termo de compromisso e é alocado em um Squad.' },
  ];
}

/** Índice da etapa atual (HEAD) conforme o status; -1 quando tudo já terminou. */
export function etapaAtual(status: StatusSelecao): number {
  if (status === 'aberto') return 0;
  if (status === 'em-andamento') return 1;
  return -1;
}

export const rotuloStatus: Record<StatusSelecao, string> = {
  aberto: 'inscrições abertas',
  'em-andamento': 'seleção em andamento',
  finalizado: 'encerrado',
};

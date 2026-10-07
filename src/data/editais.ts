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
  /** Período legível: "12 a 23 out 2026" (com início) ou "até 23 out 2026". */
  inscricoes?: string;
  /** Novo período das inscrições, se prorrogadas: "12 a 30 out 2026". O original continua visível, riscado. */
  inscricoesProrrogadas?: string;
  analise?: string;
  integracao?: string; // data legível da assinatura do termo e boas-vindas
  cronograma: { etapa: string; quando: string; ref?: string; prorrogadoPara?: string }[];
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

/** "Edital 2026.2" ou "edital 2026.2" → "2026.2" (o painel aceita qualquer título). */
export function numeroDo(edital: Edital): string {
  return edital.titulo.replace(/^edital\s*/i, '').trim() || edital.titulo;
}

export type Etapa = { titulo: string; texto: string; quando: string; prorrogado?: string };

export function etapasDo(edital: Edital): Etapa[] {
  return [
    { titulo: 'Inscrição', quando: edital.inscricoes ?? 'até [data]', prorrogado: edital.inscricoesProrrogadas, texto: 'Envie a carta de apresentação no modelo do edital e, se quiser, comprovantes e recomendações.' },
    { titulo: 'Análise e entrevistas', quando: edital.analise ?? '[data]', texto: 'A comissão de seleção analisa os documentos e entrevista os candidatos. Passam os de maior aprovação.' },
    { titulo: 'Resultado', quando: 'em até 48h', texto: 'Resultado preliminar em até 48 horas depois das entrevistas, com prazo para recurso, e depois o resultado final.' },
    { titulo: 'Aceite por e-mail', quando: 'em até 24h', texto: 'Responda ao e-mail aceitando ou recusando a vaga. Sem resposta, a vaga é considerada recusada.' },
    { titulo: 'Integração', quando: edital.integracao ?? 'início da Sprint', texto: 'Você assina o termo de compromisso, participa da reunião de boas-vindas e é alocado em um Squad.' },
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

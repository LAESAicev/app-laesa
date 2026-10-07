// Ordem e estado das atividades (oficinas, cursos, eventos, pesquisas, projetos) a partir da data.
// Funções puras, usadas no build (src/lib/content.ts) e no navegador (src/scripts/atividades.ts): as páginas
// são pré-geradas, então o navegador recalcula com a data de hoje e os dois lados nunca discordam (ADR 0002).
// Datas são sempre strings "AAAA-MM-DD" no fuso de Teresina: new Date('2026-10-02') seria meia-noite UTC.

export const EIXOS = [
  { valor: 'ensino', rotulo: 'Ensino' },
  { valor: 'pesquisa', rotulo: 'Pesquisa' },
  { valor: 'extensao', rotulo: 'Extensão' },
  { valor: 'projetos', rotulo: 'Projetos' },
] as const;

export type Eixo = (typeof EIXOS)[number]['valor'];
/** Status escolhido no painel: "auto" deriva da data; os outros servem para projetos longos, sem data de fim. */
export type StatusManual = 'auto' | 'em-andamento' | 'concluido';
export type Estado = 'acontecendo' | 'andamento' | 'aberto' | 'breve' | 'concluido';

export interface Datas {
  inicio?: string;
  fim?: string;
  ano?: number;
  status: StatusManual;
  /** Tem link de inscrição: um evento futuro aparece como "inscrições abertas". */
  inscricao?: boolean;
  ordem?: number;
  nome: string;
}

export const TIMEZONE = 'America/Fortaleza';

/** Hoje em Teresina, "AAAA-MM-DD". */
export function hojeEm(agora = new Date(), timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

export function classificar(a: Datas, hoje: string): Estado {
  if (a.status === 'em-andamento') return 'andamento';
  if (a.status === 'concluido' || !a.inicio) return 'concluido';
  if (hoje < a.inicio) return a.inscricao ? 'aberto' : 'breve';
  if (hoje <= (a.fim ?? a.inicio)) return 'acontecendo';
  return 'concluido';
}

/** 0: acontecendo agora · 1: em breve · 2: já aconteceu. */
export function grupo(estado: Estado): 0 | 1 | 2 {
  return estado === 'acontecendo' || estado === 'andamento' ? 0 : estado === 'aberto' || estado === 'breve' ? 1 : 2;
}

/** Data que representa a atividade quando já passou (o fim, se houver). */
const referencia = (a: Datas) => a.fim ?? a.inicio ?? (a.ano ? `${a.ano}-00-00` : '');

/**
 * Mais perto de hoje primeiro, sem misturar passado e futuro: o que está acontecendo, depois o que vem
 * (o mais próximo antes) e por fim o que já aconteceu (o mais recente antes). Itens sem data vão para o fim.
 */
export function comparar(hoje: string) {
  return (a: Datas, b: Datas): number => {
    const ga = grupo(classificar(a, hoje));
    const gb = grupo(classificar(b, hoje));
    if (ga !== gb) return ga - gb;
    const porData =
      ga === 1 ? (a.inicio ?? '').localeCompare(b.inicio ?? '') : referencia(b).localeCompare(referencia(a));
    return porData || (a.ordem ?? 10) - (b.ordem ?? 10) || a.nome.localeCompare(b.nome, 'pt-BR');
  };
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const diaMesAno = (iso: string) => `${Number(iso.slice(8, 10))} ${MESES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const mesAno = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

export function rotulo(estado: Estado, a: Datas): string {
  switch (estado) {
    case 'aberto':
      return `inscrições abertas · ${diaMesAno(a.inicio!)}`;
    case 'breve':
      return `em breve · ${diaMesAno(a.inicio!)}`;
    case 'acontecendo':
      return 'acontecendo agora';
    case 'andamento':
      return 'em andamento';
    case 'concluido': {
      const data = a.fim ?? a.inicio;
      return data ? `concluído · ${mesAno(data)}` : a.ano ? `concluído · ${a.ano}` : 'concluído';
    }
  }
}

/** Classe do marcador de status (global.css): menta só para o que está aberto ou acontecendo. */
export function classeStatus(estado: Estado): string {
  return estado === 'concluido' ? 'merged' : estado === 'breve' ? 'soon' : 'active';
}

/** Grupo na página de atividades: "proximos" (acontecendo e em breve) ou o ano em que aconteceu. */
export function chaveGrupo(a: Datas, hoje: string): string {
  if (grupo(classificar(a, hoje)) < 2) return 'proximos';
  return referencia(a).slice(0, 4) || 'sem-data';
}

/** Texto para busca: minúsculo e sem acento ("Extensão" → "extensao"). */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function nomeGrupo(chave: string): string {
  return chave === 'proximos' ? 'Agora e em breve' : chave === 'sem-data' ? 'Sem data' : chave;
}

/**
 * Candidatas da home: tudo o que ainda não aconteceu, mais as `limite` passadas mais recentes, na ordem de
 * `hoje`. Com o tempo um item só passa de "em breve" para "já aconteceu" (e vira o passado mais recente),
 * então esse conjunto sempre contém as `limite` certas quando o navegador reordena com a data do dia.
 */
export function candidatasHome<T extends Datas>(ordenadas: T[], hoje: string, limite: number): T[] {
  const futuras = ordenadas.filter((a) => grupo(classificar(a, hoje)) < 2);
  const passadas = ordenadas.filter((a) => grupo(classificar(a, hoje)) === 2).slice(0, limite);
  return [...futuras, ...passadas];
}

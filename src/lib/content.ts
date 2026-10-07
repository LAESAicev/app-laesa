// Lê o conteúdo editável (content/*.yaml) com o schema do painel (keystatic.config.ts).
// Roda no build: o site continua estático. Os tipos expostos são os mesmos que os componentes já usam.
import { parse } from 'yaml';
import { PUBLIC_CONTACT_EMAIL, PUBLIC_LINKEDIN_URL, PUBLIC_GITHUB_URL, PUBLIC_INSTAGRAM_URL } from 'astro:env/client';
import type { Canal, StatusSelecao } from '../data/site';
import type { Atividade, Commit, Pessoa } from '../data/home';
import { EIXOS, candidatasHome, comparar, hojeEm, type StatusManual } from './atividades';
import type { Edital } from '../data/editais';

// O conteúdo (content/*.yaml, escrito pelo painel) entra NO BUILD via import.meta.glob: o servidor de
// produção (rotas /avisos/* renderizadas sob demanda) não precisa da pasta content/ nem do Keystatic.
// Os nomes de campo espelham keystatic.config.ts (fonte do schema, usado pelo painel ao salvar).
const arquivos = import.meta.glob<string>('/content/**/*.yaml', { query: '?raw', import: 'default', eager: true });

type Yaml = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const ler = (caminho: string): Yaml | null => (arquivos[caminho] ? (parse(arquivos[caminho]) ?? {}) : null);
const colecao = (pasta: string) =>
  Object.entries(arquivos)
    .filter(([k]) => k.startsWith(`/content/${pasta}/`))
    .map(([k, raw]) => ({ slug: k.slice(`/content/${pasta}/`.length, -'.yaml'.length), entry: (parse(raw) ?? {}) as Yaml }));

function required<T>(value: T | null | undefined, what: string): T {
  if (value == null) throw new Error(`Conteúdo ausente: ${what}. Abra o painel (/keystatic) e preencha.`);
  return value;
}

/** Links vindos do painel: só http(s), mailto e caminhos do próprio site (nada de javascript:). */
function linkSeguro(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  const url = v.trim();
  return /^(https?:\/\/|mailto:|\/(?!\/))/i.test(url) ? url : undefined;
}

const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-10-30" → "30 out 2026" */
export function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return `${dia} ${meses[mes - 1]} ${ano}`;
}

// ---- configurações
const siteRaw = required(ler('/content/site.yaml'), 'Configurações');

export const selecao: { status: StatusSelecao; editalAtual: string } = {
  status: (siteRaw.statusSelecao ?? 'finalizado') as StatusSelecao,
  editalAtual: required(siteRaw.editalAtual, 'Edital atual'),
};

/** "https://www.linkedin.com/company/laesaicev/" → "linkedin.com/company/laesaicev" */
function urlCurta(url: string): string {
  const u = new URL(url);
  return (u.host.replace(/^www\./, '') + u.pathname).replace(/\/$/, '');
}

// Contato e redes vêm de variáveis de ambiente (astro.config.mjs → env.schema; modelo em .env.example).
// Uma rede sem variável definida simplesmente não aparece.
export const canais: Canal[] = [
  { icon: 'mail', rotulo: 'E-mail', valor: PUBLIC_CONTACT_EMAIL, href: `mailto:${PUBLIC_CONTACT_EMAIL}` },
  ...(PUBLIC_INSTAGRAM_URL ? [{ icon: 'instagram', rotulo: 'Instagram', valor: urlCurta(PUBLIC_INSTAGRAM_URL), href: PUBLIC_INSTAGRAM_URL } as const] : []),
  ...(PUBLIC_LINKEDIN_URL ? [{ icon: 'linkedin', rotulo: 'LinkedIn', valor: urlCurta(PUBLIC_LINKEDIN_URL), href: PUBLIC_LINKEDIN_URL } as const] : []),
  ...(PUBLIC_GITHUB_URL ? [{ icon: 'github', rotulo: 'GitHub', valor: urlCurta(PUBLIC_GITHUB_URL), href: PUBLIC_GITHUB_URL } as const] : []),
];

export const estatutoUrl = linkSeguro(siteRaw.estatutoUrl) ?? '#';

// ---- hero
export const heroLog: Commit[] = (required(ler('/content/hero.yaml'), 'Hero').commits ?? []).map((c: Yaml) => ({
  mensagem: c.mensagem,
  hash: c.hash,
  meta: c.meta || undefined,
}));

// ---- mesa diretora (ordem fixa dos cargos)
const mesaRaw = required(ler('/content/mesa.yaml'), 'Mesa Diretora');
const cargos = [
  ['presidente', 'Presidente'],
  ['vicePresidente', 'Vice-Presidente'],
  ['diretorProjetos', 'Diretor(a) de Projetos'],
  ['diretorMarketing', 'Diretor(a) de Marketing'],
  ['orientador', 'Professor(a) Orientador(a)'],
] as const;

export const mesa: Pessoa[] = cargos.map(([key, cargo]) => {
  const p: Yaml = mesaRaw[key] ?? {};
  return { nome: p.nome ?? 'Nome a confirmar', cargo, foto: p.foto ?? undefined, orientacao: key === 'orientador', exemplo: Boolean(p.exemplo) };
});

// ---- FAQ
export type Pergunta = { pergunta: string; resposta: string; ref?: string };

export const faq: Pergunta[] = (required(ler('/content/faq.yaml'), 'Perguntas frequentes').perguntas ?? []).map((q: Yaml) => ({
  pergunta: q.pergunta,
  resposta: q.resposta,
  ref: q.ref || undefined,
}));

/** Data do painel ("2026-10-02", ou Date se o YAML vier sem aspas) → "2026-10-02" */
function dataIso(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

const eixosValidos = new Set<string>(EIXOS.map((e) => e.valor));
const statusValidos = new Set<StatusManual>(['auto', 'em-andamento', 'concluido']);

// ---- atividades e projetos (content/projetos): ordem e estado pela data, ver src/lib/atividades.ts
/** Data do build em Teresina. O navegador recalcula com a data do dia (src/scripts/atividades.ts). */
export const hojeBuild = hojeEm();

export const atividades: Atividade[] = colecao('projetos')
  .map(({ slug, entry }) => {
    const inicio = dataIso(entry.data);
    const fim = dataIso(entry.dataFim);
    const linkInscricao = linkSeguro(entry.linkInscricao);
    return {
      slug,
      nome: String(entry.nome),
      descricao: entry.descricao,
      tags: [...(entry.tags ?? [])],
      eixos: (entry.eixos ?? []).filter((e: string) => eixosValidos.has(e)),
      status: statusValidos.has(entry.status) ? entry.status : 'auto',
      inicio,
      fim: fim && inicio && fim > inicio ? fim : undefined,
      ano: inicio ? Number(inicio.slice(0, 4)) : (entry.ano ?? undefined),
      inscricao: Boolean(linkInscricao),
      ordem: entry.ordem ?? 10,
      link: linkSeguro(entry.link),
      linkInscricao,
      destaque: entry.destaque ?? true,
      exemplo: Boolean(entry.exemplo),
    } satisfies Atividade;
  })
  .sort(comparar(hojeBuild));

/** Quantas atividades a home mostra. */
export const LIMITE_HOME = 5;

/** Candidatas da home (ver candidatasHome): o navegador reordena com a data do dia e mostra as LIMITE_HOME primeiras. */
export const atividadesHome: Atividade[] = candidatasHome(atividades.filter((a) => a.destaque), hojeBuild, LIMITE_HOME);

// ---- editais (mais recente primeiro, pelo endereço: 2026-2 > 2026-1 > 2025-2 …)
export const editais: Edital[] = colecao('editais')
  .map(({ slug, entry }) => ({
    slug,
    titulo: entry.titulo,
    inscricoesAte: entry.inscricoesAte ? dataCurta(String(entry.inscricoesAte)) : undefined,
    analise: entry.analise || undefined,
    vagas: entry.vagas ?? undefined,
    linkInscricao: linkSeguro(entry.linkInscricao),
    pdfEdital: linkSeguro(entry.pdfEdital),
    modeloCarta: linkSeguro(entry.modeloCarta),
    resultado: linkSeguro(entry.resultado),
    exemplo: Boolean(entry.exemplo),
  }))
  .sort((a, b) => b.slug.localeCompare(a.slug, 'pt-BR', { numeric: true }));

const atual = editais.find((e) => e.slug === selecao.editalAtual);
if (!atual) throw new Error(`O edital atual "${selecao.editalAtual}" não existe em content/editais.`);
export const editalAtual: Edital = atual;

// Lê o conteúdo editável (content/*.yaml) com o schema do painel (keystatic.config.ts).
// Roda no build: o site continua estático. Os tipos expostos são os mesmos que os componentes já usam.
import { createReader } from '@keystatic/core/reader';
import { PUBLIC_CONTACT_EMAIL, PUBLIC_LINKEDIN_URL, PUBLIC_GITHUB_URL, PUBLIC_INSTAGRAM_URL } from 'astro:env/client';
import keystaticConfig from '../../keystatic.config';
import type { Canal, StatusSelecao } from '../data/site';
import type { Commit, Pessoa, Projeto } from '../data/home';
import type { Edital } from '../data/editais';

const reader = createReader(process.cwd(), keystaticConfig);

function required<T>(value: T | null, what: string): T {
  if (value === null) throw new Error(`Conteúdo ausente: ${what}. Abra o painel (/keystatic) e preencha.`);
  return value;
}

const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-10-30" → "30 out 2026" */
export function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return `${dia} ${meses[mes - 1]} ${ano}`;
}

// ---- configurações
const siteRaw = required(await reader.singletons.configuracoes.read(), 'Configurações');

export const selecao: { status: StatusSelecao; editalAtual: string } = {
  status: siteRaw.statusSelecao,
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

export const estatutoUrl = siteRaw.estatutoUrl || '#';

// ---- hero
export const heroLog: Commit[] = required(await reader.singletons.hero.read(), 'Hero').commits.map((c) => ({
  mensagem: c.mensagem,
  hash: c.hash,
  meta: c.meta || undefined,
}));

// ---- mesa diretora (ordem fixa dos cargos)
const mesaRaw = required(await reader.singletons.mesa.read(), 'Mesa Diretora');
const cargos = [
  ['presidente', 'Presidente'],
  ['vicePresidente', 'Vice-Presidente'],
  ['diretorProjetos', 'Diretor(a) de Projetos'],
  ['orientador', 'Professor(a) Orientador(a)'],
] as const;

export const mesa: Pessoa[] = cargos.map(([key, cargo]) => {
  const p = mesaRaw[key];
  return { nome: p.nome, cargo, foto: p.foto ?? undefined, orientacao: key === 'orientador', exemplo: p.exemplo };
});

// ---- FAQ
export type Pergunta = { pergunta: string; resposta: string; ref?: string };

export const faq: Pergunta[] = required(await reader.singletons.faq.read(), 'Perguntas frequentes').perguntas.map((q) => ({
  pergunta: q.pergunta,
  resposta: q.resposta,
  ref: q.ref || undefined,
}));

// ---- projetos (só os marcados para a home, pela ordem)
export const projetos: Projeto[] = (await reader.collections.projetos.all())
  .filter(({ entry }) => entry.destaque)
  .sort((a, b) => (a.entry.ordem ?? 10) - (b.entry.ordem ?? 10) || a.entry.nome.localeCompare(b.entry.nome))
  .map(({ entry }) => ({
    nome: entry.nome,
    descricao: entry.descricao,
    tags: [...entry.tags],
    status: entry.status,
    ano: entry.ano ?? undefined,
    link: entry.link ?? undefined,
    imagem: entry.imagem ?? undefined,
    exemplo: entry.exemplo,
  }));

// ---- editais (mais recente primeiro, pelo endereço: 2026-2 > 2026-1 > 2025-2 …)
export const editais: Edital[] = (await reader.collections.editais.all())
  .map(({ slug, entry }) => ({
    slug,
    titulo: entry.titulo,
    inscricoesAte: entry.inscricoesAte ? dataCurta(entry.inscricoesAte) : undefined,
    analise: entry.analise || undefined,
    vagas: entry.vagas ?? undefined,
    linkInscricao: entry.linkInscricao ?? undefined,
    pdfEdital: entry.pdfEdital ?? undefined,
    modeloCarta: entry.modeloCarta ?? undefined,
    resultado: entry.resultado ?? undefined,
    exemplo: entry.exemplo,
  }))
  .sort((a, b) => b.slug.localeCompare(a.slug, 'pt-BR', { numeric: true }));

const atual = editais.find((e) => e.slug === selecao.editalAtual);
if (!atual) throw new Error(`O edital atual "${selecao.editalAtual}" não existe em content/editais.`);
export const editalAtual: Edital = atual;

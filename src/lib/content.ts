// Lê o conteúdo editável (content/*.yaml) com o schema do painel (keystatic.config.ts).
// Roda no build: o site continua estático. Os tipos expostos são os mesmos que os componentes já usam.
import { parse } from 'yaml';
import { z } from 'astro/zod';
import { PUBLIC_CONTACT_EMAIL, PUBLIC_LINKEDIN_URL, PUBLIC_GITHUB_URL, PUBLIC_INSTAGRAM_URL } from 'astro:env/client';
import type { Canal, StatusSelecao } from '../data/site';
import type { Atividade, Commit, Historia, Mandato, Pessoa } from '../data/home';
import { EIXOS, candidatasHome, comparar, hojeEm } from './atividades';
import { anoDoMandato, dataCurta, dataIso, estatutoPdf, linkedinPerfil, linkSeguro, mandatosPorAno, paragrafos, periodo, prorrogacao, validar } from './content-helpers';
import type { Edital } from '../data/editais';

// O conteúdo (content/*.yaml, escrito pelo painel) entra NO BUILD via import.meta.glob: o servidor de
// produção (rotas /avisos/* renderizadas sob demanda) não precisa da pasta content/ nem do Keystatic.
// Os nomes de campo espelham keystatic.config.ts (fonte do schema, usado pelo painel ao salvar). Cada YAML é
// validado com o schema ao lado da leitura: campo renomeado, faltando ou com tipo errado derruba o build
// com o arquivo e o campo (src/lib/content-helpers.ts, validar).
const arquivos = import.meta.glob<string>('/content/**/*.yaml', { query: '?raw', import: 'default', eager: true });

function required<T>(value: T | null | undefined, what: string): T {
  if (value == null) throw new Error(`Conteúdo ausente: ${what}. Abra o painel (/keystatic) e preencha.`);
  return value;
}

const ler = <S extends z.ZodType>(caminho: string, schema: S, what: string): z.infer<S> =>
  validar(schema, caminho, parse(required(arquivos[caminho], what)) ?? {});
const colecao = <S extends z.ZodType>(pasta: string, schema: S) =>
  Object.entries(arquivos)
    .filter(([k]) => k.startsWith(`/content/${pasta}/`))
    .map(([k, raw]) => ({ slug: k.slice(`/content/${pasta}/`.length, -'.yaml'.length), entry: validar(schema, k, parse(raw) ?? {}) }));

// Campos opcionais: o painel grava null (ou '') quando ficam vazios.
const texto = z.string().nullish();
const data = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data no formato AAAA-MM-DD'), z.date()]).nullish();
const exemplo = z.boolean().nullish();

// ---- configurações
const siteRaw = ler(
  '/content/site.yaml',
  z.strictObject({ statusSelecao: z.enum(['aberto', 'em-andamento', 'finalizado']).nullish(), editalAtual: z.string(), estatutoUrl: texto }),
  'Configurações',
);

export const selecao: { status: StatusSelecao; editalAtual: string } = {
  status: siteRaw.statusSelecao ?? 'finalizado',
  editalAtual: siteRaw.editalAtual,
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

/** undefined sem link válido no painel: quem usa esconde o link. */
export const estatutoUrl = linkSeguro(siteRaw.estatutoUrl);

// ---- hero
const heroRaw = ler('/content/hero.yaml', z.strictObject({ commits: z.array(z.strictObject({ mensagem: z.string(), hash: z.string(), meta: texto })).nullish() }), 'Hero');
export const heroLog: Commit[] = (heroRaw.commits ?? []).map((c) => ({
  mensagem: c.mensagem,
  hash: c.hash,
  meta: c.meta || undefined,
}));

// ---- mandatos da Mesa Diretora (content/mandatos/<ano>.yaml, ADR 0005): mais recente primeiro; o atual é o de maior ano
// ?utm_..., #..., br.linkedin.com e afins são limpos (linkedinPerfil); o HTML recebe o endereço normalizado.
const linkedin = texto
  .refine(
    (v) => !v || linkedinPerfil(v),
    'LinkedIn precisa ser um perfil pessoal em https, como https://www.linkedin.com/in/seu-perfil (outro site ou outra página do LinkedIn não servem)',
  )
  .transform((v) => (v ? linkedinPerfil(v) : undefined));
const pessoa = { nome: texto, foto: texto, linkedin, exemplo };
const mandato = z.strictObject({
  titulo: z.string(),
  periodo: texto,
  estatuto: texto.refine((v) => !v || estatutoPdf(v), 'o estatuto da época precisa ser um PDF enviado pelo painel, não um link (ex.: /uploads/mandatos/2027/estatuto.pdf)'),
  membros: z.array(z.strictObject({ cargo: z.string(), ...pessoa })).nullish(),
  orientador: z.strictObject(pessoa).nullish(),
});

const paraPessoa = (p: { nome?: string | null; foto?: string | null; linkedin?: string | null; exemplo?: boolean | null }, cargo: string, orientacao: boolean): Pessoa => ({
  nome: p.nome ?? 'Nome a confirmar',
  cargo,
  foto: p.foto || undefined,
  linkedin: p.linkedin || undefined,
  orientacao,
  exemplo: Boolean(p.exemplo),
});

export const mandatos: Mandato[] = mandatosPorAno(
  colecao('mandatos', mandato).map(({ slug, entry }) => {
    const membros = (entry.membros ?? []).map((p) => paraPessoa(p, p.cargo, false));
    const orientador = entry.orientador?.nome ? paraPessoa(entry.orientador, 'Professor(a) Orientador(a)', true) : undefined;
    const pessoas = orientador ? [...membros, orientador] : membros;
    return {
      ano: anoDoMandato(slug),
      titulo: entry.titulo,
      periodo: entry.periodo || undefined,
      estatuto: entry.estatuto || undefined,
      // selo no cabeçalho do mandato quando todo mundo é provisório; misturado, o selo vai por pessoa
      exemplo: pessoas.length > 0 && pessoas.every((p) => p.exemplo),
      membros,
      orientador,
    };
  }),
);

/** A Mesa da home: o mandato atual, na ordem, com o(a) orientador(a) no fim. */
export const mesa: Pessoa[] = mandatos[0].orientador ? [...mandatos[0].membros, mandatos[0].orientador] : mandatos[0].membros;

// ---- história da liga (página /historia)
const historiaRaw = ler(
  '/content/historia.yaml',
  z.strictObject({ texto, fundadores: z.array(z.strictObject({ nome: z.string(), papel: texto })).nullish(), exemplo }),
  'História da liga',
);
export const historia: Historia = {
  paragrafos: paragrafos(historiaRaw.texto),
  fundadores: (historiaRaw.fundadores ?? []).map((f) => ({ nome: f.nome, papel: f.papel || undefined })),
  exemplo: Boolean(historiaRaw.exemplo),
};

// ---- FAQ
export type Pergunta = { pergunta: string; resposta: string; ref?: string };

const faqRaw = ler('/content/faq.yaml', z.strictObject({ perguntas: z.array(z.strictObject({ pergunta: z.string(), resposta: z.string(), ref: texto })).nullish() }), 'Perguntas frequentes');
export const faq: Pergunta[] = (faqRaw.perguntas ?? []).map((q) => ({
  pergunta: q.pergunta,
  resposta: q.resposta,
  ref: q.ref || undefined,
}));

// ---- atividades e projetos (content/projetos): ordem e estado pela data, ver src/lib/atividades.ts
/** Data do build em Teresina. O navegador recalcula com a data do dia (src/scripts/atividades.ts). */
export const hojeBuild = hojeEm();

const projeto = z.strictObject({
  nome: z.string(),
  descricao: z.string(),
  eixos: z.array(z.enum(EIXOS.map((e) => e.valor))).nullish(),
  tags: z.array(z.string()).nullish(),
  data,
  dataFim: data,
  status: z.enum(['auto', 'em-andamento', 'concluido']).nullish(),
  linkInscricao: texto,
  link: texto,
  ano: z.number().int().nullish(),
  imagem: texto, // está no painel, mas o site ainda não mostra
  destaque: z.boolean().nullish(),
  ordem: z.number().nullish(),
  exemplo,
});

export const atividades: Atividade[] = colecao('projetos', projeto)
  .map(({ slug, entry }) => {
    const inicio = dataIso(entry.data);
    const fim = dataIso(entry.dataFim);
    const linkInscricao = linkSeguro(entry.linkInscricao);
    return {
      slug,
      nome: String(entry.nome),
      descricao: entry.descricao,
      tags: [...(entry.tags ?? [])],
      eixos: entry.eixos ?? [],
      status: entry.status ?? 'auto',
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
const edital = z.strictObject({
  titulo: z.string(),
  inscricoesInicio: data,
  inscricoesAte: data,
  inscricoesProrrogadasAte: data,
  analise: texto,
  integracao: data,
  cronograma: z.array(z.strictObject({ etapa: texto, quando: texto, ref: texto, prorrogadoPara: texto })).nullish(),
  vagas: z.number().int().nullish(),
  linkInscricao: texto,
  pdfEdital: texto,
  modeloCarta: texto,
  resultado: texto,
  exemplo,
});

export const editais: Edital[] = colecao('editais', edital)
  .map(({ slug, entry }) => {
    const inicio = dataIso(entry.inscricoesInicio);
    const ate = dataIso(entry.inscricoesAte);
    const prorrogadasAte = prorrogacao(ate, dataIso(entry.inscricoesProrrogadasAte));
    return {
      slug,
      titulo: entry.titulo,
      inscricoesAte: ate ? dataCurta(ate) : undefined,
      inscricoes: periodo(inicio, ate),
      inscricoesProrrogadas: prorrogadasAte ? periodo(inicio, prorrogadasAte) : undefined,
      datas: { inscricoesInicio: inicio, inscricoesAte: ate, prorrogadasAte },
      analise: entry.analise || undefined,
      integracao: dataIso(entry.integracao) ? dataCurta(dataIso(entry.integracao)!) : undefined,
      cronograma: (entry.cronograma ?? [])
        .filter((l) => l.etapa && l.quando)
        .map((l) => ({ etapa: String(l.etapa), quando: String(l.quando), ref: l.ref || undefined, prorrogadoPara: l.prorrogadoPara || undefined })),
      vagas: entry.vagas ?? undefined,
      linkInscricao: linkSeguro(entry.linkInscricao),
      pdfEdital: linkSeguro(entry.pdfEdital),
      modeloCarta: linkSeguro(entry.modeloCarta),
      resultado: linkSeguro(entry.resultado),
      exemplo: Boolean(entry.exemplo),
    };
  })
  .sort((a, b) => b.slug.localeCompare(a.slug, 'pt-BR', { numeric: true }));

const atual = editais.find((e) => e.slug === selecao.editalAtual);
if (!atual) throw new Error(`O edital atual "${selecao.editalAtual}" não existe em content/editais.`);
export const editalAtual: Edital = atual;

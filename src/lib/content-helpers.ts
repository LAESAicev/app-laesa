// Funções puras usadas por src/lib/content.ts para tratar o que vem do painel (testes em tests/content-helpers.test.ts).
import type { z } from 'astro/zod';

/**
 * Links vindos do painel: só http(s), mailto e caminhos do próprio site (nada de javascript:).
 * Barra invertida e caracteres de controle são recusados: o navegador lê "/\x.com" como "//x.com" e
 * remove tab e quebra de linha ("/<tab>/x.com"), o que levaria a outro domínio.
 */
export function linkSeguro(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  const url = v.trim();
  if (/[\\\x00-\x1f\x7f]/.test(url)) return undefined;
  return /^(https?:\/\/|mailto:|\/(?!\/))/i.test(url) ? url : undefined;
}

const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-10-30" → "30 out 2026" */
export function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return `${dia} ${meses[mes - 1]} ${ano}`;
}

/** Período de inscrições: "12 a 23 out 2026", "28 set a 3 out 2026" ou "até 23 out 2026". */
export function periodo(inicio: string | undefined, fim: string | undefined): string | undefined {
  if (!fim) return undefined;
  if (!inicio || inicio >= fim) return `até ${dataCurta(fim)}`;
  const [ai, mi, di] = inicio.split('-').map(Number);
  const [af, mf] = fim.split('-').map(Number);
  if (ai === af && mi === mf) return `${di} a ${dataCurta(fim)}`;
  return `${di} ${meses[mi - 1]}${ai === af ? '' : ` ${ai}`} a ${dataCurta(fim)}`;
}

/** Data do painel ("2026-10-02", ou Date se o YAML vier sem aspas) → "2026-10-02" */
export function dataIso(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

/** A prorrogação só vale se for depois do fim original. */
export function prorrogacao(ate: string | undefined, prorrogada: string | undefined): string | undefined {
  return prorrogada && prorrogada > (ate ?? '') ? prorrogada : undefined;
}

/**
 * Valida um YAML do painel no build. Campo faltando, renomeado ou com tipo errado derruba o build com o
 * arquivo e o campo, em vez de virar um buraco silencioso na página.
 */
export function validar<S extends z.ZodType>(schema: S, caminho: string, dados: unknown): z.infer<S> {
  const r = schema.safeParse(dados, {
    error: (i) =>
      i.code === 'unrecognized_keys'
        ? `campo desconhecido ${i.keys.map((k) => `"${k}"`).join(', ')} (foi renomeado em keystatic.config.ts?)`
        : i.input === undefined
          ? 'campo obrigatório ausente'
          : undefined,
  });
  if (r.success) return r.data;
  const erros = r.error.issues.map((i) => `  - ${i.path.join('.') || '(arquivo)'}: ${i.message}`).join('\n');
  throw new Error(`Conteúdo inválido em ${caminho.replace(/^\//, '')}:\n${erros}\nCorrija pelo painel (/keystatic) ou no arquivo.`);
}

/**
 * LinkedIn de quem foi da Mesa: só perfil pessoal, https://linkedin.com/in/<perfil> (com ou sem www, barra
 * final opcional). Qualquer outro esquema, host, página ou sobra (?utm=..., #...) é recusado: o link vai
 * para um botão do site, então não pode levar a outro lugar.
 */
export function linkedinPerfil(v: string): boolean {
  return /^https:\/\/(www\.)?linkedin\.com\/in\/([\w-]|%[0-9a-f]{2})+\/?$/i.test(v);
}

/**
 * Estatuto em vigor na época de um mandato: só PDF enviado pelo painel, caminho do próprio site em /uploads/
 * terminado em .pdf. Link externo, outra extensão ou ".." no caminho são recusados.
 */
export function estatutoPdf(v: string): boolean {
  return linkSeguro(v) === v && /^\/uploads\/(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.pdf$/i.test(v);
}

/** content/mandatos/<ano>.yaml: o nome do arquivo (endereço no painel) é o ano do mandato. */
export function anoDoMandato(slug: string): string {
  if (!/^\d{4}$/.test(slug)) throw new Error(`content/mandatos/${slug}.yaml: o nome do arquivo precisa ser o ano do mandato (ex.: 2027.yaml). Corrija o campo "Ano" no painel (/keystatic).`);
  return slug;
}

/** Mais recente primeiro. O atual é o de maior ano: trocar a Mesa é criar o mandato novo na posse. */
export function mandatosPorAno<T extends { ano: string }>(lista: T[]): (T & { atual: boolean })[] {
  if (!lista.length) throw new Error('Nenhum mandato em content/mandatos. Abra o painel (/keystatic) e crie o mandato atual.');
  return [...lista].sort((a, b) => b.ano.localeCompare(a.ano)).map((m, i) => ({ ...m, atual: i === 0 }));
}

/** Texto longo do painel → parágrafos (separados por linha em branco). */
export function paragrafos(texto: string | null | undefined): string[] {
  return (texto ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

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

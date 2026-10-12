// Utilitários comuns aos formulários (contato e inscrição), no navegador e no servidor.
// Só importa o tipo do zod: os componentes usam isto sem baixar o zod antes do envio.
import type { z } from 'astro/zod';

export type Erros = Partial<Record<string, string>>;

/** Primeiro erro de cada campo, no formato da resposta 422 do contrato. */
export function errosPorCampo(error: z.ZodError): Erros {
  const erros: Erros = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? 'assunto');
    erros[campo] ??= issue.message;
  }
  return erros;
}

/** FormData → objeto simples (checkbox marcado = "true"; campos desabilitados não vêm). */
export function formParaObjeto(data: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of data.entries()) if (typeof v === 'string') obj[k] = v;
  return obj;
}

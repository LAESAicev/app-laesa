// Contrato do formulário de contato (docs/contrato-contato.md). O mesmo schema valida no navegador
// (ContactForm) e no servidor (/api/contato). Mensagens dizem o problema e como corrigir.
import { z } from 'astro/zod';

export const ASSUNTOS = ['duvida', 'feedback', 'projeto', 'colaborar'] as const;
export type Assunto = (typeof ASSUNTOS)[number];

export const rotuloAssunto: Record<Assunto, string> = {
  duvida: 'Dúvida',
  feedback: 'Feedback',
  projeto: 'Projeto',
  colaborar: 'Colaboração',
};

const texto = (min: number, max: number, vazio: string, curto: string) =>
  z
    .string({ error: vazio })
    .trim()
    .min(1, vazio)
    .min(min, curto)
    .max(max, `Use no máximo ${max} caracteres.`);

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .optional()
    .transform((v) => v || undefined);

const nome = texto(2, 120, 'Diga seu nome para sabermos com quem falar.', 'Escreva o nome completo, com pelo menos 2 letras.');
const email = z
  .string({ error: 'Informe seu e-mail para receber a resposta.' })
  .trim()
  .min(1, 'Informe seu e-mail para receber a resposta.')
  .pipe(z.email('Esse e-mail parece incompleto. Use o formato nome@exemplo.com.'));

const comum = {
  mensagem: texto(10, 4000, 'Escreva sua mensagem antes de enviar.', 'Conte um pouco mais: pelo menos 10 caracteres.'),
  /** honeypot: campo invisível; robôs preenchem, pessoas não (nome sem sentido para o autofill não tocar) */
  nao_preencher: z.string().max(0).optional(),
};

const identificado = { nome, email };

const duvida = z.object({ assunto: z.literal('duvida'), ...identificado, ...comum });

const feedback = z
  .object({
    assunto: z.literal('feedback'),
    atividade: z.preprocess((v) => v || undefined, z.enum(['evento', 'oficina', 'processo-seletivo', 'site', 'outro'], { error: 'Escolha uma atividade da lista.' }).optional()),
    anonimo: z.preprocess((v) => v === true || v === 'true' || v === 'on', z.boolean()),
    nome: z.string().trim().optional(),
    email: z.string().trim().optional(),
    ...comum,
  })
  .superRefine((v, ctx) => {
    if (v.anonimo) return; // anônimo: nome e e-mail são descartados
    const n = nome.safeParse(v.nome ?? '');
    if (!n.success) ctx.addIssue({ code: 'custom', path: ['nome'], message: n.error.issues[0].message });
    const e = email.safeParse(v.email ?? '');
    if (!e.success) ctx.addIssue({ code: 'custom', path: ['email'], message: e.error.issues[0].message });
  })
  .transform((v) => (v.anonimo ? { ...v, nome: undefined, email: undefined } : v));

const projeto = z.object({
  assunto: z.literal('projeto'),
  ...identificado,
  organizacao: texto(2, 160, 'Diga o nome da organização.', 'O nome da organização precisa de pelo menos 2 letras.'),
  tipoProjeto: z.enum(['sistema-web', 'aplicativo', 'pesquisa', 'oficina-curso', 'outro'], {
    error: 'Escolha o tipo de projeto.',
  }),
  prazo: opcional(60),
  ...comum,
});

const colaborar = z.object({
  assunto: z.literal('colaborar'),
  ...identificado,
  formaColaboracao: z.enum(['palestra', 'mentoria', 'oficina', 'apoio-evento', 'outro'], {
    error: 'Escolha como você quer colaborar.',
  }),
  area: texto(2, 120, 'Diga sua área de atuação.', 'Descreva a área com pelo menos 2 letras.'),
  link: z
    .string()
    .trim()
    .optional()
    // "linkedin.com/in/fulano" vira "https://linkedin.com/in/fulano"
    .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : undefined))
    .pipe(z.url('Esse link não parece válido. Exemplo: https://linkedin.com/in/seu-nome').optional()),
  ...comum,
});

export const contatoSchema = z.discriminatedUnion('assunto', [duvida, feedback, projeto, colaborar], {
  error: 'Escolha um assunto para continuar.',
});

export type Contato = z.output<typeof contatoSchema>;

// Sem assunto válido o zod para no discriminador; validamos os campos comuns à parte para
// apontar tudo o que falta de uma vez.
const camposComuns = z.object({ nome, email, mensagem: comum.mensagem });

export function validarContato(dados: unknown): { ok: true; data: Contato } | { ok: false; erros: Erros } {
  const r = contatoSchema.safeParse(dados);
  if (r.success) return { ok: true, data: r.data };
  const erros = errosPorCampo(r.error);
  if (erros.assunto) {
    const c = camposComuns.safeParse(dados ?? {});
    if (!c.success) Object.assign(erros, errosPorCampo(c.error), { assunto: erros.assunto });
  }
  return { ok: false, erros };
}

export const rotuloValor: Record<string, string> = {
  evento: 'Evento', oficina: 'Oficina', 'processo-seletivo': 'Processo seletivo', site: 'Site', outro: 'Outro',
  'sistema-web': 'Sistema web', aplicativo: 'Aplicativo', pesquisa: 'Pesquisa', 'oficina-curso': 'Oficina ou curso',
  palestra: 'Palestra', mentoria: 'Mentoria', 'apoio-evento': 'Apoio em evento',
};
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

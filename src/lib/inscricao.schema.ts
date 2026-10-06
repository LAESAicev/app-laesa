// Validação da inscrição em avisos, compartilhada entre navegador e servidor (sem dependências de servidor).
import { z } from 'astro/zod';

export const inscricaoSchemaCliente = z.object({
  email: z
    .string({ error: 'Informe seu e-mail.' })
    .trim()
    .toLowerCase()
    .min(1, 'Informe seu e-mail.')
    .pipe(z.email('Esse e-mail parece incompleto. Use o formato nome@exemplo.com.')),
  consentimento: z.preprocess(
    (v) => v === true || v === 'true' || v === 'on',
    z.literal(true, { error: 'Marque a caixa para autorizar o envio dos avisos.' }),
  ),
  nao_preencher: z.string().max(0).optional(),
});

// POST /api/contato — contrato em docs/contrato-contato.md.
import type { APIRoute } from 'astro';
import { MAIL_TO } from 'astro:env/server';
import { PUBLIC_CONTACT_EMAIL } from 'astro:env/client';
import { validarContato } from '../../lib/contato.schema';
import { montarEmailContato } from '../../lib/contato.email';
import { enviar, EnvioIndisponivel } from '../../lib/mailer';
import { criarLimite, chaveIp, isentoLocal } from '../../lib/rate-limit';
import { json, lerJson, resumoErro } from '../../lib/http';

export const prerender = false;

const permitido = criarLimite(5, 10 * 60 * 1000); // 5 mensagens a cada 10 minutos por IP

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!isentoLocal(clientAddress) && !permitido(chaveIp(clientAddress))) {
    return json(429, { erro: 'Muitas mensagens em pouco tempo. Tente de novo em alguns minutos.' });
  }
  const dados = await lerJson(request);
  if (dados instanceof Response) return dados;

  // Honeypot preenchido: finge sucesso para não ensinar o robô, mas não envia nada.
  if (dados.nao_preencher) return json(201, { id: crypto.randomUUID() });

  const resultado = validarContato(dados);
  if (!resultado.ok) return json(422, { erros: resultado.erros });

  try {
    await enviar(montarEmailContato(resultado.data, MAIL_TO || PUBLIC_CONTACT_EMAIL));
  } catch (e) {
    if (e instanceof EnvioIndisponivel) {
      console.warn('[contato] envio indisponível: SMTP não configurado');
      return json(503, { erro: `O envio está temporariamente indisponível. Escreva direto para ${PUBLIC_CONTACT_EMAIL}.` });
    }
    console.error('[contato] falha ao enviar', resumoErro(e));
    return json(500, { erro: `Não foi possível enviar agora. Tente de novo ou escreva para ${PUBLIC_CONTACT_EMAIL}.` });
  }
  return json(201, { id: crypto.randomUUID() });
};

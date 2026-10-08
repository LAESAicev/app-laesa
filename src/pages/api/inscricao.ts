// POST /api/inscricao — pede a inscrição e envia o e-mail de confirmação (confirmação dupla).
import type { APIRoute } from 'astro';
import { errosPorCampo } from '../../lib/formulario';
import { inscricaoSchema, inscritos, emailConfirmacao, podeEnviarConfirmacao, devolverConfirmacao, InscricaoIndisponivel } from '../../lib/inscricao';
import { enviar, EnvioIndisponivel } from '../../lib/mailer';
import { criarLimite, chaveIp, isentoLocal } from '../../lib/rate-limit';
import { json, lerJson, resumoErro } from '../../lib/http';

export const prerender = false;

const permitido = criarLimite(5, 10 * 60 * 1000);
const emBreve = { erro: 'As inscrições nas novidades abrem em breve. Enquanto isso, acompanhe a LAESA no Instagram.' };

export const POST: APIRoute = async ({ request, clientAddress, site, url }) => {
  if (!isentoLocal(clientAddress) && !permitido(chaveIp(clientAddress))) return json(429, { erro: 'Muitas tentativas. Tente de novo em alguns minutos.' });
  const dados = await lerJson(request);
  if (dados instanceof Response) return dados;
  if (dados.nao_preencher) return json(202, { ok: true }); // honeypot

  const r = inscricaoSchema.safeParse(dados);
  if (!r.success) return json(422, { erros: errosPorCampo(r.error) });

  let reservou = false;
  try {
    inscritos(); // falha cedo se o armazenamento ainda não existe: não mandamos confirmação que não leva a lugar nenhum
    // Mesma resposta (202) mesmo sem enviar: não revela se o e-mail já pediu inscrição.
    if (!podeEnviarConfirmacao(r.data.email)) return json(202, { ok: true });
    reservou = true;
    // Em dev o link aponta para o servidor local; em produção, para SITE_URL.
    await enviar(emailConfirmacao(r.data.email, import.meta.env.DEV || !site ? url : site));
  } catch (e) {
    // Nada saiu: devolve a cota, senão a nova tentativa responderia 202 sem enviar por 24h.
    if (reservou) devolverConfirmacao(r.data.email);
    if (e instanceof InscricaoIndisponivel || e instanceof EnvioIndisponivel) {
      console.warn('[inscricao] indisponível:', e.message);
      return json(503, emBreve);
    }
    console.error('[inscricao] falha ao enviar confirmação', resumoErro(e));
    return json(500, { erro: 'Não foi possível enviar a confirmação agora. Tente de novo em instantes.' });
  }
  return json(202, { ok: true });
};

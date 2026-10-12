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

const DIA = 24 * 60 * 60 * 1000;
const permitido = criarLimite(5, 10 * 60 * 1000); // 5 mensagens a cada 10 minutos por IP
// Teto diário por IP: sem ele, um só IP (5 a cada 10 min) fecharia o formulário de todo mundo em ~3,5 h.
const porIpNoDia = criarLimite(10, DIA);
// Teto diário de todo o formulário: IPs trocados não esgotam a cota do Workspace (~2.000/dia).
// ponytail: em memória por processo, o reinício zera; trocar por contador persistente se houver mais de uma instância.
const global = criarLimite(100, DIA);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = chaveIp(clientAddress);
  const isento = isentoLocal(clientAddress);
  if (!isento && !permitido(ip)) {
    return json(429, { erro: 'Muitas mensagens em pouco tempo. Tente de novo em alguns minutos.' });
  }
  const dados = await lerJson(request);
  if (dados instanceof Response) return dados;

  // Honeypot preenchido: finge sucesso para não ensinar o robô, mas não envia nada.
  if (dados.nao_preencher) return json(201, { id: crypto.randomUUID() });

  const resultado = validarContato(dados);
  if (!resultado.ok) return json(422, { erros: resultado.erros });
  // Depois da validação: pedido inválido não gasta a vaga do dia. Antes do teto global: IP barrado não gasta a de todo mundo.
  if (!isento && !porIpNoDia(ip)) {
    return json(429, { erro: `Você já enviou muitas mensagens hoje. Escreva direto para ${PUBLIC_CONTACT_EMAIL}.` });
  }
  // Mensagem que não saiu devolve a vaga do dia da pessoa (o teto global segue como estava).
  const devolverIp = () => {
    if (!isento) porIpNoDia.devolver(ip);
  };
  if (!global('todos')) {
    devolverIp();
    return json(429, { erro: `Recebemos muitas mensagens hoje. Escreva direto para ${PUBLIC_CONTACT_EMAIL}.` });
  }

  try {
    await enviar(montarEmailContato(resultado.data, MAIL_TO || PUBLIC_CONTACT_EMAIL));
  } catch (e) {
    devolverIp();
    if (e instanceof EnvioIndisponivel) {
      console.warn('[contato] envio indisponível:', e.message);
      return json(503, { erro: `O envio está temporariamente indisponível. Escreva direto para ${PUBLIC_CONTACT_EMAIL}.` });
    }
    console.error('[contato] falha ao enviar', resumoErro(e));
    return json(500, { erro: `Não foi possível enviar agora. Tente de novo ou escreva para ${PUBLIC_CONTACT_EMAIL}.` });
  }
  return json(201, { id: crypto.randomUUID() });
};

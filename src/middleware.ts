// Portão da tela de avisos (/mesa/*). As outras rotas passam direto.
// - PAINEL_AVISOS desligado (ou INSCRITOS_STORE diferente de sqlite): 404, como se a tela não existisse.
// - Todo POST (e qualquer método que não seja GET/HEAD) confere a origem: checkOrigin está desligado no site.
// - Fora de /mesa/entrar, sem sessão válida: 303 para /mesa/entrar, sem dado nenhum da tela.
// - Toda resposta de /mesa sai com no-store e noindex (o Caddy também põe).
// As páginas /mesa não devem responder com Response.redirect(): os cabeçalhos dela são imutáveis e o set abaixo falharia.
import type { MiddlewareHandler } from 'astro';
import { INSCRITOS_DB, INSCRITOS_STORE, PAINEL_AVISOS } from 'astro:env/server';
import { mesmaOrigem } from './lib/http';
import { COOKIE_SESSAO, painelEm } from './lib/painel';

const PRIVADO = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

const resposta = (status: number, texto: string, extra: Record<string, string> = {}) =>
  new Response(texto, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...PRIVADO, ...extra } });

let avisou = false;

export const onRequest: MiddlewareHandler = async (context, next) => {
  const caminho = context.url.pathname.toLowerCase().replace(/\/+$/, '');
  if (caminho !== '/mesa' && !caminho.startsWith('/mesa/')) return next();

  if (!PAINEL_AVISOS || INSCRITOS_STORE !== 'sqlite') {
    if (PAINEL_AVISOS && !avisou) {
      avisou = true;
      console.warn('[mesa] PAINEL_AVISOS=true, mas a tela de avisos exige INSCRITOS_STORE=sqlite: /mesa continua 404.');
    }
    return resposta(404, 'Página não encontrada.');
  }

  // Origem esperada: a de SITE_URL; em dev, a do próprio servidor (mesma regra do link de confirmação).
  const origem = import.meta.env.DEV || !context.site ? context.url.origin : context.site.origin;
  const leitura = context.request.method === 'GET' || context.request.method === 'HEAD';
  if (!leitura && !mesmaOrigem(context.request, origem)) return resposta(403, 'Pedido recusado.');

  if (caminho !== '/mesa/entrar') {
    const sessao = painelEm(INSCRITOS_DB).sessao(context.cookies.get(COOKIE_SESSAO)?.value);
    if (!sessao) return resposta(303, '', { location: '/mesa/entrar' });
    context.locals.mesa = { nome: sessao.nome };
  }

  const r = await next();
  for (const [k, v] of Object.entries(PRIVADO)) r.headers.set(k, v);
  return r;
};

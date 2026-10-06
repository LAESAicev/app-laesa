// Utilidades das rotas de API.
export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

/** Só JSON: pedidos cross-site com JSON exigem preflight (CORS), o que protege contra CSRF sem checkOrigin. */
export async function lerJson(request: Request): Promise<Record<string, unknown> | Response> {
  // Tipo base exato: "text/plain; x=application/json" é CORS-safelisted (sem preflight) e abriria CSRF.
  const tipo = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (tipo !== 'application/json') {
    return json(415, { erro: 'Formato não suportado. Recarregue a página e tente de novo.' });
  }
  // Navegadores mandam Sec-Fetch-Site: pedido vindo de outro site é recusado (checkOrigin está desligado).
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return json(403, { erro: 'Pedido recusado.' });
  }
  try {
    const dados: unknown = await request.json();
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('corpo inválido');
    return dados as Record<string, unknown>;
  } catch {
    return json(400, { erro: 'Não conseguimos ler a mensagem. Recarregue a página e tente de novo.' });
  }
}

/** Para logs: só o código do erro, sem envelope/destinatários (dados pessoais). */
export function resumoErro(e: unknown) {
  const x = e as { code?: string; responseCode?: number; name?: string };
  return { code: x?.code, responseCode: x?.responseCode, name: x?.name };
}

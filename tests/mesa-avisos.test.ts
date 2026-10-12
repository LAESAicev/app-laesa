// Páginas da tela de avisos depois de entrar (/mesa/avisos, /mesa/rascunhos/[id], /mesa/envios/[id]), pelo
// AstroContainer. A sessão chega como Astro.locals.mesa (o middleware tem os próprios testes); o e-mail é mockado.
// Inscrito canário: canario@exemplo.test está no banco o tempo todo e não pode aparecer em HTML nenhum.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rmSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import type { ItemAtividade, ItemEdital, Manifesto } from '../src/lib/avisos/manifesto';
import type { Mensagem } from '../src/lib/avisos/templates';

const h = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'laesa-mesa-avisos-'));
  return { dir, db: join(dir, 'laesa.db'), manifesto: join(dir, 'itens.json'), log: join(dir, 'avisos.log') };
});
vi.mock('astro:env/server', async (orig) => ({
  ...(await orig<object>()),
  PAINEL_AVISOS: true,
  INSCRITOS_STORE: 'sqlite',
  INSCRITOS_DB: h.db,
  AVISOS_MANIFESTO: h.manifesto,
  AVISOS_LOG: h.log,
}));

// remetente dos avisos (teste e envio) e processamento: o real, sem as pausas entre e-mails
const m = vi.hoisted(() => ({ execucoes: [] as Promise<unknown>[] }));
const enviarAviso = vi.fn(async (_m: Mensagem) => {});
const criarRemetente = vi.fn(() => enviarAviso);
vi.mock('../src/lib/avisos/remetente', () => ({ criarRemetente: (...a: unknown[]) => criarRemetente(...(a as [])) }));
vi.mock('../src/lib/avisos/processar', async (orig) => {
  const real = await orig<typeof import('../src/lib/avisos/processar')>();
  return {
    processar: vi.fn((o: Parameters<typeof real.processar>[0]) => {
      const p = real.processar({ ...o, dormir: async () => {} });
      m.execucoes.push(p);
      return p;
    }),
  };
});

const { default: Avisos } = await import('../src/pages/mesa/avisos.astro');
const { default: Rascunho } = await import('../src/pages/mesa/rascunhos/[id].astro');
const { default: EnvioPagina } = await import('../src/pages/mesa/envios/[id].astro');
const { EnvioIndisponivel } = await import('../src/lib/smtp');
const { filaDaMesa } = await import('../src/lib/mesa');
const { criarInscritosSqlite } = await import('../src/lib/inscritos-sqlite');

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres'; // INSCRICAO_SECRET do vitest.config.ts
const SITE = 'https://laesa.exemplo.test';
const CANARIO = 'canario@exemplo.test';
const DIA = 24 * 60 * 60 * 1000;
const daqui = (dias: number) => new Date(Date.now() + dias * DIA).toISOString().slice(0, 10);

// itens como o build gera, com datas relativas a hoje (o sugerido depende do dia)
const edital: ItemEdital = {
  id: 'edital:2026-2',
  tipo: 'edital',
  titulo: 'Edital 2026.2',
  url: `${SITE}/processos-seletivos/2026-2`,
  status: 'aberto',
  inscricoesInicio: daqui(-2),
  inscricoesAte: daqui(10),
  vagas: 15,
  linkInscricao: true,
  exemplo: false,
};
const provisorio: ItemEdital = { ...edital, id: 'edital:2027-1', titulo: 'Edital 2027.1', url: `${SITE}/processos-seletivos/2027-1`, exemplo: true };
const passado: ItemAtividade = {
  id: 'atividade:mostra',
  tipo: 'atividade',
  nome: 'I Mostra Científica',
  descricao: 'Mostra de trabalhos.',
  url: `${SITE}/atividades?q=Mostra`,
  inicio: daqui(-300),
  status: 'auto',
  eixos: ['extensao'],
  inscricao: false,
  exemplo: false,
};
/** Editais extras, um por teste de envio: a proteção contra repetição não mistura os testes. */
const extra = (n: number): ItemEdital => ({ ...edital, id: `edital:t${n}`, titulo: `Edital T${n}`, url: `${SITE}/processos-seletivos/t${n}` });
const EXTRAS = Array.from({ length: 20 }, (_, i) => extra(i + 1));
const MANIFESTO: Manifesto = { versao: 1, geradoEm: new Date().toISOString(), site: SITE, contato: 'laesa@somosicev.com', itens: [edital, provisorio, passado, ...EXTRAS] };
const CAIXA = 'laesa@somosicev.com'; // PUBLIC_CONTACT_EMAIL do vitest.config.ts

let container: AstroContainer;
beforeAll(async () => {
  writeFileSync(h.manifesto, JSON.stringify(MANIFESTO));
  await criarInscritosSqlite(h.db, SEGREDO).adicionar(CANARIO, new Date());
  container = await AstroContainer.create({ astroConfig: { site: 'http://localhost' } });
});
afterAll(() => rmSync(h.dir, { recursive: true, force: true }));
beforeEach(() => {
  enviarAviso.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

type Pedido = { method?: string; form?: Record<string, string>; nome?: string | null; params?: Record<string, string> };
const htmls: string[] = [];

async function chamar(pagina: typeof Avisos, caminho: string, { method = 'GET', form, nome = 'Ana', params }: Pedido = {}) {
  const request = new Request(`http://localhost${caminho}`, { method, headers: { origin: 'http://localhost' }, body: form ? new URLSearchParams(form) : undefined });
  const locals: App.Locals = nome === null ? {} : { mesa: { nome } };
  const res = await container.renderToResponse(pagina, { request, locals, params, partial: false });
  const html = await res.text();
  htmls.push(html);
  return { res, html };
}

const fila = () => filaDaMesa();
/** Linhas de uma tabela do banco (conferir que uma recusa não criou nada). */
const contar = (tabela: string) => (new DatabaseSync(h.db).prepare(`SELECT count(*) AS n FROM ${tabela}`).get() as { n: number }).n;
/** Só o texto da página (as tags levam atributos de estilo e de origem em dev). */
const texto = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&quot;|&#34;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('/mesa/avisos', () => {
  it('sem sessão: 303 para a entrada, sem dado nenhum (GET e POST)', async () => {
    for (const method of ['GET', 'POST']) {
      const { res, html } = await chamar(Avisos, '/mesa/avisos', { method, nome: null, form: method === 'POST' ? { evento: 'edital-aberto', item: edital.id } : undefined });
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe('/mesa/entrar');
      expect(html).not.toContain('Inscritos');
    }
    expect(fila().envios()).toEqual([]);
  });

  it('mostra itens, sugerido, bloqueios, nº de inscritos (só a contagem) e o formulário só com eventos com modelo', async () => {
    const { res, html } = await chamar(Avisos, '/mesa/avisos');
    expect(res.status).toBe(200);
    const t = texto(html);
    expect(t).toContain('você entrou como Ana');
    expect(t).toContain('Inscritos nas novidades 1 ');
    expect(t).toContain('Edital 2026.2');
    expect(t).toContain('Aviso sugerido: Edital aberto');
    expect(t).toMatch(/provisório \(exemplo\)/);
    expect(t).toContain('Nada a avisar agora.');
    expect(html).not.toContain('value="livre"');
    expect(html).not.toMatch(/name="(assunto|texto)"/);
    expect(html).not.toContain(CANARIO);
  });

  it('POST preparar: 303 para o rascunho, com o conteúdo do modelo (assunto/texto do corpo ignorados)', async () => {
    const { res } = await chamar(Avisos, '/mesa/avisos', {
      method: 'POST',
      form: { evento: 'edital-aberto', item: edital.id, assunto: 'Assunto forjado', texto: 'Clique em https://evil.example' },
    });
    expect(res.status).toBe(303);
    const id = Number(res.headers.get('location')!.match(/^\/mesa\/rascunhos\/(\d+)$/)![1]);
    const r = fila().rascunho(id)!;
    expect(r.assunto).toMatch(/^Edital 2026\.2 aberto: inscrições até /);
    expect(r.texto).not.toContain('evil');
  });

  it('evento livre (ou inventado) é recusado pela web: 422, nada salvo', async () => {
    const antes = contar('avisos_rascunhos');
    for (const evento of ['livre', 'qualquer']) {
      const { res, html } = await chamar(Avisos, '/mesa/avisos', { method: 'POST', form: { evento, item: edital.id, assunto: 'Oi', texto: 'Oi' } });
      expect(res.status).toBe(422);
      expect(html).toContain('O aviso livre só sai pelo comando');
    }
    expect(contar('avisos_rascunhos')).toBe(antes);
  });

  it('item bloqueado: 422 com os motivos, sem rascunho', async () => {
    const antes = contar('avisos_rascunhos');
    const { res, html } = await chamar(Avisos, '/mesa/avisos', { method: 'POST', form: { evento: 'edital-aberto', item: provisorio.id } });
    expect(res.status).toBe(422);
    expect(contar('avisos_rascunhos')).toBe(antes);
    expect(texto(html)).toContain('Este aviso está bloqueado:');
    expect(texto(html)).toMatch(/"Edital 2027\.1" está marcado como conteúdo provisório/);
  });

  it('item que não existe: 422', async () => {
    const { res, html } = await chamar(Avisos, '/mesa/avisos', { method: 'POST', form: { evento: 'edital-aberto', item: 'edital:nao-existe' } });
    expect(res.status).toBe(422);
    expect(html).toContain('Item não encontrado');
  });
});

/** Prepara o aviso do item pela tela; devolve o id do rascunho. */
async function prepararPelaTela(item: ItemEdital) {
  const { res } = await chamar(Avisos, '/mesa/avisos', { method: 'POST', form: { evento: 'edital-aberto', item: item.id } });
  expect(res.status).toBe(303);
  return Number(res.headers.get('location')!.split('/').at(-1));
}

const naPagina = (id: number, form?: Record<string, string>) =>
  chamar(Rascunho, `/mesa/rascunhos/${id}`, { method: form ? 'POST' : 'GET', form, params: { id: String(id) } });

/** Manda o teste pela tela; devolve o código que chegou na cópia de teste. */
async function testarPelaTela(id: number) {
  const { res } = await naPagina(id, { acao: 'teste' });
  expect(res.status).toBe(303);
  return enviarAviso.mock.calls.at(-1)![0].text.match(/[A-Z2-9]{4}-[A-Z2-9]{4}/)![0];
}

const enviarPelaTela = (id: number, campos: Record<string, string>) => naPagina(id, { acao: 'enviar', ...campos });
const inscritosAgora = async () => (await fila().inscritos()).length;
/** Campo nunca volta preenchido depois de uma recusa. */
const semValor = (html: string, nome: string) => expect(html).not.toMatch(new RegExp(`name="${nome}"[^>]*value=`));

describe('/mesa/rascunhos/[id]', () => {
  it('sem sessão: 303 para a entrada (GET e POST), nada enviado', async () => {
    const id = await prepararPelaTela(EXTRAS[0]);
    for (const form of [undefined, { acao: 'teste' }]) {
      const { res } = await chamar(Rascunho, `/mesa/rascunhos/${id}`, { method: form ? 'POST' : 'GET', form, params: { id: String(id) }, nome: null });
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe('/mesa/entrar');
    }
    expect(enviarAviso).not.toHaveBeenCalled();
  });

  it('GET: prévia com o marcador do descadastro, sem teste, inscritos agora (contagem) e campos vazios', async () => {
    const id = await prepararPelaTela(EXTRAS[0]);
    const { res, html } = await naPagina(id);
    expect(res.status).toBe(200);
    const t = texto(html);
    expect(t).toContain('Edital T1 aberto: inscrições até');
    expect(t).toContain('Para não receber mais, abra este link e confirme: <link de descadastro de cada pessoa>');
    expect(t).toContain('Ainda sem teste');
    expect(t).toContain(`Inscritos agora ${await inscritosAgora()} `);
    semValor(html, 'confirmacao');
    semValor(html, 'codigo');
  });

  it('rascunho que não existe: 404', async () => {
    const { res } = await chamar(Rascunho, '/mesa/rascunhos/99999', { params: { id: '99999' } });
    expect(res.status).toBe(404);
  });

  it('POST teste: só para a caixa da LAESA (campo para/email do corpo ignorado), com código; 303 com a mensagem', async () => {
    const id = await prepararPelaTela(EXTRAS[1]);
    const { res } = await naPagina(id, { acao: 'teste', para: 'atacante@exemplo.test', email: 'atacante@exemplo.test' });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`/mesa/rascunhos/${id}?teste=1`);
    expect(enviarAviso).toHaveBeenCalledOnce();
    expect(enviarAviso.mock.calls[0][0].to).toBe(CAIXA);
    expect(enviarAviso.mock.calls[0][0].text).toMatch(/^CÓPIA DE TESTE\. Código para enviar/);
    const { html } = await chamar(Rascunho, `/mesa/rascunhos/${id}?teste=1`, { params: { id: String(id) } });
    expect(texto(html)).toContain('Teste enviado para a caixa da LAESA. O código para liberar o envio está no e-mail.');
    expect(texto(html)).toContain('Teste enviado em');
  });

  it('mesmo conteúdo em dois rascunhos: o segundo aparece testado pelo teste do primeiro, e o código dele envia', async () => {
    const primeiro = await prepararPelaTela(EXTRAS[12]);
    const codigo = await testarPelaTela(primeiro);
    const segundo = await prepararPelaTela(EXTRAS[12]);
    expect(fila().rascunho(segundo)!.hash).toBe(fila().rascunho(primeiro)!.hash);
    const t = texto((await naPagina(segundo)).html);
    expect(t).not.toContain('Ainda sem teste');
    expect(t).toContain(`pelo rascunho #${primeiro}`);
    expect(t).toContain('vale o código do último teste');
    expect((await enviarPelaTela(segundo, { codigo, confirmacao: String(await inscritosAgora()) })).res.status).toBe(303);
    await Promise.all(m.execucoes);
  });

  it('envio recusado (422, nada criado): sem teste, nº errado, sem código, código de outro rascunho, código já usado', async () => {
    const total = String(await inscritosAgora());
    const envios = () => contar('avisos_envios');

    const semTeste = await prepararPelaTela(EXTRAS[2]);
    let r = await enviarPelaTela(semTeste, { codigo: 'AAAA-AAAA', confirmacao: total });
    expect(r.res.status).toBe(422);
    expect(texto(r.html)).toContain('ainda não teve teste deste conteúdo. Mande o teste'); // texto da tela, sem os comandos da CLI
    expect(texto(r.html)).not.toContain('não confere'); // o motivo de verdade vem antes do código
    expect(texto(r.html)).not.toContain('Rode "teste');

    const id = await prepararPelaTela(EXTRAS[3]);
    const codigo = await testarPelaTela(id);
    const outro = await prepararPelaTela(EXTRAS[4]);
    const deOutro = await testarPelaTela(outro);
    const antes = envios();
    for (const [campos, motivo] of [
      [{ codigo, confirmacao: String(Number(total) + 1) }, /Número diferente/],
      [{ codigo, confirmacao: '' }, /Número diferente/],
      [{ confirmacao: total }, /não confere/],
      [{ codigo: deOutro, confirmacao: total }, /não confere/],
    ] as const) {
      r = await enviarPelaTela(id, campos);
      expect(r.res.status).toBe(422);
      expect(texto(r.html)).toMatch(motivo);
      semValor(r.html, 'confirmacao');
      semValor(r.html, 'codigo');
    }
    expect(envios()).toBe(antes);

    // o código certo envia uma vez; o mesmo código não serve para outro envio (nem com "Enviar de novo")
    expect((await enviarPelaTela(id, { codigo, confirmacao: total })).res.status).toBe(303);
    await Promise.all(m.execucoes);
    r = await enviarPelaTela(id, { codigo, confirmacao: total, reenviar: 'sim' });
    expect(r.res.status).toBe(422);
    expect(texto(r.html)).toMatch(/já foi usado/);
    expect(envios()).toBe(antes + 1);
  });

  it('sucesso: 303 para o envio, por = nome da sessão, total do servidor (campo total ignorado), processa em segundo plano', async () => {
    const id = await prepararPelaTela(EXTRAS[5]);
    const codigo = await testarPelaTela(id);
    const total = await inscritosAgora();
    enviarAviso.mockClear();
    const { res } = await enviarPelaTela(id, { codigo: codigo.toLowerCase(), confirmacao: ` ${total} `, total: '999', por: 'Outra Pessoa' });
    expect(res.status).toBe(303);
    const envioId = Number(res.headers.get('location')!.match(/^\/mesa\/envios\/(\d+)$/)![1]);
    expect(fila().envio(envioId)).toMatchObject({ por: 'Ana', total_previsto: total });
    await Promise.all(m.execucoes);
    expect(fila().envio(envioId)).toMatchObject({ status: 'concluido', enviados: total, falhas: 0 });
    expect(enviarAviso.mock.calls.map((c) => c[0].to)).toContain(CANARIO);
  });

  it('duplo POST enviar (com "Enviar de novo") vira um envio só', async () => {
    const id = await prepararPelaTela(EXTRAS[6]);
    const codigo = await testarPelaTela(id);
    const campos = { codigo, confirmacao: String(await inscritosAgora()), reenviar: 'sim' };
    const antes = contar('avisos_envios');
    const [a, b] = await Promise.all([enviarPelaTela(id, campos), enviarPelaTela(id, campos)]);
    expect([a.res.status, b.res.status].sort()).toEqual([303, 422]);
    expect(contar('avisos_envios')).toBe(antes + 1);
    await Promise.all(m.execucoes);
  });

  it('aviso já enviado: sem "Enviar de novo" é recusado; a página avisa e mostra a caixa', async () => {
    const id = await prepararPelaTela(EXTRAS[7]);
    const total = String(await inscritosAgora());
    expect((await enviarPelaTela(id, { codigo: await testarPelaTela(id), confirmacao: total })).res.status).toBe(303);
    await Promise.all(m.execucoes);
    const de_novo = await prepararPelaTela(EXTRAS[7]);
    const codigo = await testarPelaTela(de_novo);
    const comCodigoErrado = await enviarPelaTela(de_novo, { codigo: 'AAAA-AAAA', confirmacao: total });
    expect(comCodigoErrado.res.status).toBe(422);
    expect(texto(comCodigoErrado.html)).toContain('Este aviso já foi enviado');
    expect(texto(comCodigoErrado.html)).not.toContain('não confere');
    const r = await enviarPelaTela(de_novo, { codigo, confirmacao: total });
    expect(r.res.status).toBe(422);
    expect(texto(r.html)).toContain('Este aviso já foi enviado');
    expect(texto(r.html)).toContain('marque "Enviar de novo"');
    expect(texto(r.html)).not.toContain('--reenviar');
    expect(r.html).toContain('name="reenviar"');
    expect(r.html).not.toMatch(/name="reenviar"[^>]*checked/);
    expect((await enviarPelaTela(de_novo, { codigo, confirmacao: total, reenviar: 'sim' })).res.status).toBe(303);
    await Promise.all(m.execucoes);
  });

  it('bloqueio no site publicado vale no teste e no envio', async () => {
    const id = await prepararPelaTela(EXTRAS[8]);
    const codigo = await testarPelaTela(id);
    writeFileSync(h.manifesto, JSON.stringify({ ...MANIFESTO, itens: MANIFESTO.itens.map((i) => (i.id === EXTRAS[8].id ? { ...i, exemplo: true } : i)) }));
    try {
      const pedidos: Record<string, string>[] = [{ acao: 'teste' }, { acao: 'enviar', codigo, confirmacao: String(await inscritosAgora()) }];
      for (const form of pedidos) {
        const r = await naPagina(id, form);
        expect(r.res.status).toBe(422);
        expect(texto(r.html)).toMatch(/provisório/);
      }
    } finally {
      writeFileSync(h.manifesto, JSON.stringify(MANIFESTO));
    }
  });

  it('SMTP não configurado: 422 antes de criar o envio', async () => {
    const id = await prepararPelaTela(EXTRAS[9]);
    const codigo = await testarPelaTela(id);
    const antes = contar('avisos_envios');
    criarRemetente.mockImplementationOnce(() => {
      throw new EnvioIndisponivel();
    });
    const r = await enviarPelaTela(id, { codigo, confirmacao: String(await inscritosAgora()) });
    expect(r.res.status).toBe(422);
    expect(texto(r.html)).toContain('O envio de e-mail não está disponível');
    expect(contar('avisos_envios')).toBe(antes);
  });

  it('SMTP fora do ar ou recusando a conexão no teste: 503 com mensagem clara, sem endereço no log', async () => {
    const id = await prepararPelaTela(EXTRAS[17]);
    const erroSmtp = (msg: string, x: { code: string; syscall?: string; command?: string }) => Object.assign(new Error(`${msg} ${CAIXA}`), x);
    const casos = [
      erroSmtp('connect ECONNREFUSED 127.0.0.1:1025', { code: 'ESOCKET', syscall: 'connect', command: 'CONN' }),
      erroSmtp('Connection closed unexpectedly', { code: 'ECONNECTION', command: 'CONN' }),
      erroSmtp('Connection timeout', { code: 'ETIMEDOUT', command: 'CONN' }),
      erroSmtp('getaddrinfo ENOTFOUND smtp.exemplo.test', { code: 'EDNS', command: 'CONN' }),
      erroSmtp('connect ECONNREFUSED 127.0.0.1:1025', { code: 'ECONNREFUSED', syscall: 'connect' }),
    ];
    for (const e of casos) {
      enviarAviso.mockRejectedValueOnce(e);
      const r = await naPagina(id, { acao: 'teste' });
      expect(r.res.status, e.code).toBe(503);
      expect(texto(r.html)).toContain('Não consegui falar com o servidor de e-mail. Nada foi enviado. Tente de novo em alguns minutos; se continuar, avise quem cuida do servidor.');
    }
    const logs = [...vi.mocked(console.error).mock.calls, ...vi.mocked(console.warn).mock.calls].flat().map((x) => JSON.stringify(x));
    expect(logs.join(' ')).toContain('ESOCKET');
    expect(logs.join(' ')).not.toContain(CAIXA);
    expect(fila().ultimoTeste(fila().rascunho(id)!)).toBeUndefined();
  });

  it('SMTP recusa o login no teste: 503 dizendo que o problema é a credencial do SMTP', async () => {
    const id = await prepararPelaTela(EXTRAS[15]);
    enviarAviso.mockRejectedValueOnce(Object.assign(new Error('Invalid login: 535 5.7.8 bad'), { code: 'EAUTH', responseCode: 535, command: 'AUTH PLAIN' }));
    const r = await naPagina(id, { acao: 'teste' });
    expect(r.res.status).toBe(503);
    expect(texto(r.html)).toContain('O servidor de e-mail recusou o login');
  });

  it('erro inesperado continua genérico com 500', async () => {
    const id = await prepararPelaTela(EXTRAS[16]);
    enviarAviso.mockRejectedValueOnce(new Error('qualquer coisa'));
    const r = await naPagina(id, { acao: 'teste' });
    expect(r.res.status).toBe(500);
    expect(texto(r.html)).toContain('Algo deu errado do nosso lado.');
  });

  it('rascunho livre (do comando) não é testado nem enviado pela tela', async () => {
    const r = fila().salvarRascunho({ item: null, evento: 'livre', assunto: 'Reunião', texto: `Detalhes em ${SITE}/contato.`, site: SITE, contato: CAIXA });
    const { res, html } = await naPagina(r.id, { acao: 'teste' });
    expect(res.status).toBe(422);
    expect(texto(html)).toContain('Aviso livre só sai pelo comando');
    expect(enviarAviso).not.toHaveBeenCalled();
  });
});

/** Envio "enviando" criado direto na fila, sem processamento (como depois de o servidor cair). */
async function envioParado(item: ItemEdital) {
  const id = await prepararPelaTela(item);
  fila().marcarTeste(id);
  return fila().criarEnvio(id, 'Ana', await inscritosAgora(), { reenviar: true }).id; // o mesmo item serve a vários testes
}
const noEnvio = (id: number, acao?: string, extra: Record<string, string> = {}) =>
  chamar(EnvioPagina, `/mesa/envios/${id}`, { method: acao ? 'POST' : 'GET', form: acao ? { acao, ...extra } : undefined, params: { id: String(id) } });

describe('/mesa/envios/[id]', () => {
  it('sem sessão: 303 para a entrada (GET e POST), nada muda', async () => {
    const id = await envioParado(EXTRAS[10]);
    for (const acao of [undefined, 'cancelar']) {
      const { res } = await chamar(EnvioPagina, `/mesa/envios/${id}`, { method: acao ? 'POST' : 'GET', form: acao ? { acao } : undefined, params: { id: String(id) }, nome: null });
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe('/mesa/entrar');
    }
    expect(fila().envio(id)!.status).toBe('enviando');
  });

  it('enviando sem processador: totais, "sem processamento ativo", Retomar e recarga de 15 s', async () => {
    const id = await envioParado(EXTRAS[10]);
    const { res, html } = await noEnvio(id);
    expect(res.status).toBe(200);
    // a recarga vai para ?auto=1: o middleware não conta como uso (a sessão vence por ociosidade com a aba aberta)
    expect(html).toMatch(new RegExp(`<head>[\\s\\S]*<meta http-equiv="refresh" content="15; url=/mesa/envios/${id}\\?auto=1"[\\s\\S]*</head>`));
    const t = texto(html);
    expect(t).toContain('Situação enviando');
    expect(t).toMatch(/Enviados 0 de \d+/);
    expect(t).toContain('Sem processamento ativo');
    expect(html).toContain('value="retomar"');
    expect(html).toContain('value="pausar"');
    fila().cancelar(id);
  });

  it('processador ocupado com outro envio: "na fila, depois do envio #N", sem Retomar nem aviso de parado', async () => {
    const id = await envioParado(EXTRAS[14]);
    const primeiro = fila().proximoEnvio()!.id; // o processador pega sempre o "enviando" mais antigo
    expect(primeiro).toBeLessThan(id);
    const db = new DatabaseSync(h.db);
    db.prepare('UPDATE avisos_envios SET atualizado_em = ? WHERE id = ?').run(new Date(Date.now() - 5 * 60_000).toISOString(), id);
    db.close();
    expect(fila().pegarVez('outro-processo', 60_000)).toBe(true);
    try {
      const { html } = await noEnvio(id);
      const t = texto(html);
      expect(t).toContain(`Na fila, depois do envio #${primeiro}`);
      expect(t).not.toContain('Enviando, cerca de');
      expect(t).not.toContain('Nenhum e-mail saiu');
      expect(t).not.toContain('Sem processamento ativo');
      expect(html).not.toContain('value="retomar"');
      expect(html).toContain('value="pausar"');
      expect(html).toContain('http-equiv="refresh"');

      expect(texto((await noEnvio(primeiro)).html)).toContain('Enviando, cerca de');
    } finally {
      fila().liberar('outro-processo');
      fila().cancelar(id);
    }
  });

  it('pausar → 303 com o motivo e o nome; pausar de novo → 422; retomar processa até o fim; cancelar concluído → 422', async () => {
    const id = await envioParado(EXTRAS[11]);
    let r = await noEnvio(id, 'pausar');
    expect(r.res.status).toBe(303);
    expect(r.res.headers.get('location')).toBe(`/mesa/envios/${id}`);
    expect(fila().envio(id)).toMatchObject({ status: 'pausado', motivo: 'pausado pela Mesa por Ana' });
    r = await noEnvio(id, 'pausar');
    expect(r.res.status).toBe(422);
    expect(texto(r.html)).toContain('só dá para pausar');

    const { html } = await noEnvio(id);
    expect(html).not.toContain('http-equiv="refresh"');
    expect(html).toContain('value="retomar"');

    expect((await noEnvio(id, 'retomar')).res.status).toBe(303);
    await Promise.all(m.execucoes);
    expect(fila().envio(id)).toMatchObject({ status: 'concluido', falhas: 0 });

    for (const acao of ['cancelar', 'retomar', 'pausar', 'outra']) {
      r = await noEnvio(id, acao);
      expect(r.res.status, acao).toBe(422);
    }
    expect(fila().envio(id)!.status).toBe('concluido');
  });

  it('pausar quando o envio terminou no meio do pedido: 422 com o motivo, e nenhuma pausa registrada', async () => {
    const id = await envioParado(EXTRAS[13]);
    // o envio termina enquanto o corpo do POST é lido (o processador concluiu entre a leitura e a pausa)
    const body = new ReadableStream<Uint8Array>(
      { pull(c) { fila().concluir(id); c.enqueue(new TextEncoder().encode('acao=pausar')); c.close(); } },
      { highWaterMark: 0 },
    );
    const request = new Request(`http://localhost/mesa/envios/${id}`, {
      method: 'POST',
      headers: { origin: 'http://localhost', 'content-type': 'application/x-www-form-urlencoded' },
      body,
      duplex: 'half',
    } as RequestInit);
    const res = await container.renderToResponse(EnvioPagina, { request, locals: { mesa: { nome: 'Ana' } }, params: { id: String(id) }, partial: false });
    const html = await res.text();
    htmls.push(html);
    expect(res.status).toBe(422);
    expect(texto(html)).toContain('só dá para pausar');
    expect(fila().envio(id)!.status).toBe('concluido');
    expect(readFileSync(h.log, 'utf8')).not.toContain(`envio ${id} pausado pela tela`);
  });

  it('cancelar sem a caixa de confirmação → 422 e nada muda; com a caixa → 303 e cancelado', async () => {
    const id = await envioParado(EXTRAS[10]);
    const { html } = await noEnvio(id);
    expect(html).toMatch(/name="confirmar"[^>]*required/);
    expect(html).not.toMatch(/name="confirmar"[^>]*checked/);
    for (const extra of [{}, { confirmar: 'nao' }] as Record<string, string>[]) {
      const r = await noEnvio(id, 'cancelar', extra);
      expect(r.res.status).toBe(422);
      expect(texto(r.html)).toContain('Nada mudou');
      expect(fila().envio(id)!.status).toBe('enviando');
    }
    expect((await noEnvio(id, 'cancelar', { confirmar: 'sim' })).res.status).toBe(303);
    expect(fila().envio(id)!.status).toBe('cancelado');
  });

  it('envio que não existe: 404', async () => {
    expect((await noEnvio(99999)).res.status).toBe(404);
  });
});

describe('dados pessoais', () => {
  it('o inscrito canário não aparece em nenhum HTML da tela', () => {
    expect(htmls.length).toBeGreaterThan(5);
    for (const html of htmls) expect(html).not.toContain(CANARIO);
  });

  it('o registro dos avisos não tem e-mail de inscrito nem código de teste', () => {
    expect(existsSync(h.log)).toBe(true);
    const log = readFileSync(h.log, 'utf8');
    expect(log).toContain('criado pela tela de avisos');
    expect(log).not.toContain('@');
    expect(log).not.toMatch(/[A-Z2-9]{4}-[A-Z2-9]{4}/);
  });
});

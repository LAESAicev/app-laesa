// Páginas da tela de avisos depois de entrar (/mesa/avisos, /mesa/rascunhos/[id], /mesa/envios/[id]), pelo
// AstroContainer. A sessão chega como Astro.locals.mesa (o middleware tem os próprios testes); o e-mail é mockado.
// Inscrito canário: canario@exemplo.test está no banco o tempo todo e não pode aparecer em HTML nenhum.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rmSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { ItemAtividade, ItemEdital, Manifesto } from '../src/lib/avisos/manifesto';

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

const { default: Avisos } = await import('../src/pages/mesa/avisos.astro');
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
const MANIFESTO: Manifesto = { versao: 1, geradoEm: new Date().toISOString(), site: SITE, contato: 'laesa@somosicev.com', itens: [edital, provisorio, passado] };

let container: AstroContainer;
beforeAll(async () => {
  writeFileSync(h.manifesto, JSON.stringify(MANIFESTO));
  await criarInscritosSqlite(h.db, SEGREDO).adicionar(CANARIO, new Date());
  container = await AstroContainer.create({ astroConfig: { site: 'http://localhost' } });
});
afterAll(() => rmSync(h.dir, { recursive: true, force: true }));
beforeEach(() => {
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
  html.replace(/<[^>]+>/g, ' ').replace(/&quot;|&#34;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

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
    expect(t).toContain('Inscritos nas novidades: 1 .');
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

describe('dados pessoais', () => {
  it('o inscrito canário não aparece em nenhum HTML da tela', () => {
    expect(htmls.length).toBeGreaterThan(5);
    for (const html of htmls) expect(html).not.toContain(CANARIO);
  });
});

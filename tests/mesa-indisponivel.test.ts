// Tela de avisos com o servidor sem INSCRICAO_SECRET: a fila não abre (EnvioIndisponivel). As páginas mostram o
// erro da tela (503), sem 500 cru, e nada é feito.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { rmSync } from 'node:fs';

const h = await vi.hoisted(async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'laesa-mesa-indisponivel-'));
  return { dir, db: join(dir, 'laesa.db') };
});
vi.mock('astro:env/server', async (orig) => ({
  ...(await orig<object>()),
  PAINEL_AVISOS: true,
  INSCRITOS_STORE: 'sqlite',
  INSCRITOS_DB: h.db,
  INSCRICAO_SECRET: undefined,
}));

const { default: Avisos } = await import('../src/pages/mesa/avisos.astro');
const { default: Rascunho } = await import('../src/pages/mesa/rascunhos/[id].astro');
const { default: EnvioPagina } = await import('../src/pages/mesa/envios/[id].astro');

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create({ astroConfig: { site: 'http://localhost' } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => rmSync(h.dir, { recursive: true, force: true }));

describe('tela de avisos sem INSCRICAO_SECRET', () => {
  it.each([
    ['/mesa/avisos', Avisos, undefined, { evento: 'edital-aberto', item: 'edital:2026-2' }],
    ['/mesa/rascunhos/1', Rascunho, { id: '1' }, { acao: 'teste' }],
    ['/mesa/envios/1', EnvioPagina, { id: '1' }, { acao: 'cancelar', confirmar: 'sim' }],
  ] as const)('%s: 503 com a mensagem da tela (GET e POST)', async (caminho, pagina, params, form) => {
    for (const method of ['GET', 'POST']) {
      const request = new Request(`http://localhost${caminho}`, {
        method,
        headers: { origin: 'http://localhost' },
        body: method === 'POST' ? new URLSearchParams(form) : undefined,
      });
      const res = await container.renderToResponse(pagina, { request, locals: { mesa: { nome: 'Ana' } }, params, partial: false });
      const html = await res.text();
      expect(res.status, `${method} ${caminho}`).toBe(503);
      expect(html).toContain('role="alert"');
      expect(html).toContain('não está disponível no servidor');
      expect(html).not.toContain('INSCRICAO_SECRET');
    }
  });
});

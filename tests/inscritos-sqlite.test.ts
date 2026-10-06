import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarInscritosSqlite } from '../src/lib/inscritos-sqlite';

let dir: string;
let n = 0;
const novoBanco = () => join(dir, `banco-${++n}.db`);

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'laesa-inscritos-'));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('inscritos em SQLite', () => {
  it('adiciona e lista', async () => {
    const store = criarInscritosSqlite(novoBanco());
    expect(await store.listar()).toEqual([]);
    await store.adicionar('a@exemplo.com', new Date());
    await store.adicionar('b@exemplo.com', new Date());
    await store.adicionar('a@exemplo.com', new Date()); // repetir não duplica
    expect(await store.listar()).toEqual(['a@exemplo.com', 'b@exemplo.com']);
    expect(await store.removidoEm('a@exemplo.com')).toBeUndefined();
  });

  it('remover tira da lista e registra removidoEm', async () => {
    const store = criarInscritosSqlite(novoBanco());
    const em = new Date('2026-05-01T12:34:56.789Z');
    await store.adicionar('a@exemplo.com', new Date('2026-04-01T00:00:00Z'));
    await store.remover('a@exemplo.com', em);
    expect(await store.listar()).toEqual([]);
    expect((await store.removidoEm('a@exemplo.com'))?.getTime()).toBe(em.getTime());
    // descadastro de quem nunca se inscreveu também fica registrado
    await store.remover('nunca@exemplo.com', em);
    expect((await store.removidoEm('nunca@exemplo.com'))?.getTime()).toBe(em.getTime());
    expect(await store.listar()).toEqual([]);
  });

  it('readiciona depois de remover', async () => {
    const store = criarInscritosSqlite(novoBanco());
    await store.adicionar('a@exemplo.com', new Date());
    await store.remover('a@exemplo.com', new Date());
    await store.adicionar('a@exemplo.com', new Date());
    expect(await store.listar()).toEqual(['a@exemplo.com']);
    // a data do último descadastro fica: links de confirmação anteriores a ela seguem inválidos
    expect(await store.removidoEm('a@exemplo.com')).toBeInstanceOf(Date);
  });

  it('persiste ao reabrir o mesmo arquivo', async () => {
    const caminho = novoBanco();
    const primeira = criarInscritosSqlite(caminho);
    const saiu = new Date('2026-06-01T08:00:00.000Z');
    await primeira.adicionar('fica@exemplo.com', new Date());
    await primeira.adicionar('sai@exemplo.com', new Date());
    await primeira.remover('sai@exemplo.com', saiu);

    const segunda = criarInscritosSqlite(caminho);
    expect(await segunda.listar()).toEqual(['fica@exemplo.com']);
    expect((await segunda.removidoEm('sai@exemplo.com'))?.getTime()).toBe(saiu.getTime());
  });

  it('cria o diretório pai do arquivo', async () => {
    const pasta = join(dir, 'nao', 'existe');
    const caminho = join(pasta, 'laesa.db');
    const store = criarInscritosSqlite(caminho);
    expect(existsSync(pasta)).toBe(false); // abertura preguiçosa: nada acontece antes da primeira chamada
    await store.adicionar('a@exemplo.com', new Date());
    expect(existsSync(caminho)).toBe(true);
    expect(await store.listar()).toEqual(['a@exemplo.com']);
  });
});

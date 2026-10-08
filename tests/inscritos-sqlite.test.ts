import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { criarInscritosSqlite } from '../src/lib/inscritos-sqlite';

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres';
const DIA = 24 * 60 * 60 * 1000;
const diasAtras = (n: number) => new Date(Date.now() - n * DIA);

let dir: string;
let n = 0;
const novoBanco = () => join(dir, `banco-${++n}.db`);

/** Todo o conteúdo do banco como texto: para provar que um e-mail não ficou em lugar nenhum. */
function despejo(caminho: string): string {
  const db = new DatabaseSync(caminho);
  const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
  const texto = JSON.stringify(tabelas.map((t) => db.prepare(`SELECT * FROM "${t.name}"`).all()));
  db.close();
  return texto;
}

/** Os bytes do arquivo e do WAL: o SQLite deixa linhas apagadas no disco se não zerar (secure_delete). */
function noDisco(caminho: string, texto: string): boolean {
  return ['', '-wal'].some((s) => existsSync(caminho + s) && readFileSync(caminho + s).includes(texto));
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'laesa-inscritos-'));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('inscritos em SQLite', () => {
  it('adiciona e lista', async () => {
    const store = criarInscritosSqlite(novoBanco(), SEGREDO);
    expect(await store.listar()).toEqual([]);
    await store.adicionar('a@exemplo.com', new Date());
    await store.adicionar('b@exemplo.com', new Date());
    await store.adicionar('a@exemplo.com', new Date()); // repetir não duplica
    expect(await store.listar()).toEqual(['a@exemplo.com', 'b@exemplo.com']);
    expect(await store.removidoEm('a@exemplo.com')).toBeUndefined();
  });

  it('remover tira da lista, registra removidoEm e não guarda o e-mail', async () => {
    const caminho = novoBanco();
    const store = criarInscritosSqlite(caminho, SEGREDO);
    const em = diasAtras(1);
    await store.adicionar('a@exemplo.com', diasAtras(10));
    await store.remover('a@exemplo.com', em);
    expect(await store.listar()).toEqual([]);
    expect((await store.removidoEm('a@exemplo.com'))?.getTime()).toBe(em.getTime());
    // descadastro de quem nunca se inscreveu também fica registrado
    await store.remover('nunca@exemplo.com', em);
    expect((await store.removidoEm('nunca@exemplo.com'))?.getTime()).toBe(em.getTime());
    expect(await store.listar()).toEqual([]);
    expect(despejo(caminho)).not.toMatch(/a@exemplo\.com|nunca@exemplo\.com/);
    expect(noDisco(caminho, 'a@exemplo.com')).toBe(false);
  });

  it('o código do descadastro depende do segredo', async () => {
    const caminho = novoBanco();
    await criarInscritosSqlite(caminho, SEGREDO).remover('a@exemplo.com', new Date());
    const outroSegredo = criarInscritosSqlite(caminho, 'outro-segredo-com-mais-de-32-caracteres!!');
    expect(await outroSegredo.removidoEm('a@exemplo.com')).toBeUndefined();
  });

  it('apaga o registro do descadastro depois de 30 dias', async () => {
    const caminho = novoBanco();
    const store = criarInscritosSqlite(caminho, SEGREDO);
    await store.remover('velho@exemplo.com', diasAtras(31));
    await store.remover('recente@exemplo.com', diasAtras(29));
    expect(await store.removidoEm('velho@exemplo.com')).toBeUndefined();
    expect(await store.removidoEm('recente@exemplo.com')).toBeInstanceOf(Date);
    const db = new DatabaseSync(caminho);
    expect(db.prepare('SELECT count(*) AS n FROM descadastros').get()).toEqual({ n: 1 });
    db.close();
  });

  it('a primeira chamada depois de abrir já apaga códigos vencidos (o comando diário só precisa abrir e ler)', async () => {
    const caminho = novoBanco();
    await criarInscritosSqlite(caminho, SEGREDO).remover('velho@exemplo.com', diasAtras(10));
    const db = new DatabaseSync(caminho);
    db.prepare('UPDATE descadastros SET removido_em = ?').run(diasAtras(31).toISOString()); // o tempo passou
    db.close();
    await criarInscritosSqlite(caminho, SEGREDO).listar();
    const depois = new DatabaseSync(caminho);
    expect(depois.prepare('SELECT count(*) AS n FROM descadastros').get()).toEqual({ n: 0 });
    depois.close();
  });

  it('readiciona depois de remover', async () => {
    const store = criarInscritosSqlite(novoBanco(), SEGREDO);
    await store.adicionar('a@exemplo.com', new Date());
    await store.remover('a@exemplo.com', new Date());
    await store.adicionar('a@exemplo.com', new Date());
    expect(await store.listar()).toEqual(['a@exemplo.com']);
    // a data do último descadastro fica: links de confirmação anteriores a ela seguem inválidos
    expect(await store.removidoEm('a@exemplo.com')).toBeInstanceOf(Date);
  });

  it('persiste ao reabrir o mesmo arquivo', async () => {
    const caminho = novoBanco();
    const primeira = criarInscritosSqlite(caminho, SEGREDO);
    const saiu = diasAtras(2);
    await primeira.adicionar('fica@exemplo.com', new Date());
    await primeira.adicionar('sai@exemplo.com', new Date());
    await primeira.remover('sai@exemplo.com', saiu);

    const segunda = criarInscritosSqlite(caminho, SEGREDO);
    expect(await segunda.listar()).toEqual(['fica@exemplo.com']);
    expect((await segunda.removidoEm('sai@exemplo.com'))?.getTime()).toBe(saiu.getTime());
  });

  it('cria o diretório pai do arquivo', async () => {
    const pasta = join(dir, 'nao', 'existe');
    const caminho = join(pasta, 'laesa.db');
    const store = criarInscritosSqlite(caminho, SEGREDO);
    expect(existsSync(pasta)).toBe(false); // abertura preguiçosa: nada acontece antes da primeira chamada
    await store.adicionar('a@exemplo.com', new Date());
    expect(existsSync(caminho)).toBe(true);
    expect(await store.listar()).toEqual(['a@exemplo.com']);
  });
});

describe('migração do esquema antigo (e-mail em claro com removido_em)', () => {
  function bancoAntigo(): string {
    const caminho = novoBanco();
    const db = new DatabaseSync(caminho);
    db.exec(`CREATE TABLE inscritos (
      email TEXT PRIMARY KEY,
      consentimento_em TEXT,
      removido_em TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    const inserir = db.prepare('INSERT INTO inscritos (email, consentimento_em, removido_em) VALUES (?, ?, ?)');
    inserir.run('ativo@exemplo.com', diasAtras(40).toISOString(), null);
    inserir.run('saiu@exemplo.com', null, diasAtras(3).toISOString());
    inserir.run('voltou@exemplo.com', diasAtras(1).toISOString(), diasAtras(2).toISOString());
    inserir.run('saiu-faz-tempo@exemplo.com', null, diasAtras(90).toISOString());
    db.close();
    return caminho;
  }

  async function conferir(caminho: string) {
    const store = criarInscritosSqlite(caminho, SEGREDO);
    expect(await store.listar()).toEqual(['ativo@exemplo.com', 'voltou@exemplo.com']);
    expect(await store.removidoEm('ativo@exemplo.com')).toBeUndefined();
    expect(await store.removidoEm('saiu@exemplo.com')).toBeInstanceOf(Date);
    expect(await store.removidoEm('voltou@exemplo.com')).toBeInstanceOf(Date); // link antigo segue inválido
    expect(await store.removidoEm('saiu-faz-tempo@exemplo.com')).toBeUndefined();
    const texto = despejo(caminho);
    expect(texto).not.toMatch(/saiu@exemplo\.com|saiu-faz-tempo@exemplo\.com/);
    expect(noDisco(caminho, 'saiu@exemplo.com')).toBe(false);
    expect(noDisco(caminho, 'saiu-faz-tempo@exemplo.com')).toBe(false);
  }

  it('move quem saiu para o hash, apaga o e-mail em claro e tira a coluna', async () => {
    const caminho = bancoAntigo();
    await conferir(caminho);
    const db = new DatabaseSync(caminho);
    const colunas = (db.prepare('PRAGMA table_info(inscritos)').all() as { name: string }[]).map((c) => c.name);
    db.close();
    expect(colunas).not.toContain('removido_em');
  });

  it('pode rodar de novo a cada abertura sem mudar nada', async () => {
    const caminho = bancoAntigo();
    await conferir(caminho);
    await conferir(caminho);
  });
});

describe('limpeza do arquivo depois da migração', () => {
  afterEach(() => vi.restoreAllMocks());

  const pragma = (caminho: string, nome: string) => {
    const db = new DatabaseSync(caminho);
    const valor = Object.values(db.prepare(`PRAGMA ${nome}`).get() as object)[0];
    db.close();
    return valor;
  };

  /** Banco antigo com e-mails apagados ainda no disco (sem secure_delete) e páginas livres. */
  function bancoAntigoSujo(): string {
    const caminho = novoBanco();
    const db = new DatabaseSync(caminho);
    db.exec('CREATE TABLE inscritos (email TEXT PRIMARY KEY, consentimento_em TEXT, removido_em TEXT, criado_em TEXT)');
    const inserir = db.prepare('INSERT INTO inscritos (email, consentimento_em, removido_em) VALUES (?, ?, ?)');
    for (let i = 0; i < 300; i++) inserir.run(`apagado${i}@exemplo.com`, diasAtras(5).toISOString(), null);
    inserir.run('saiu@exemplo.com', null, diasAtras(3).toISOString());
    db.exec("DELETE FROM inscritos WHERE email LIKE 'apagado%'");
    db.close();
    return caminho;
  }

  it('VACUUM que falha não derruba a abertura, avisa no log e é tentado de novo na próxima abertura', async () => {
    const caminho = bancoAntigoSujo();
    expect(noDisco(caminho, 'apagado1@exemplo.com')).toBe(true);
    const exec = DatabaseSync.prototype.exec;
    const falha = vi.spyOn(DatabaseSync.prototype, 'exec').mockImplementation(function (this: DatabaseSync, sql: string) {
      if (sql === 'VACUUM') throw Object.assign(new Error('database is locked'), { code: 'ERR_SQLITE_ERROR', errcode: 5 });
      return exec.call(this, sql);
    });
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await criarInscritosSqlite(caminho, SEGREDO).listar()).toEqual([]);
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('VACUUM'), expect.anything());
    expect(aviso.mock.calls.flat().join(' ')).not.toMatch(/@exemplo\.com/);
    expect(pragma(caminho, 'user_version')).toBe(1); // limpeza pendente
    expect(noDisco(caminho, 'apagado1@exemplo.com')).toBe(true);

    falha.mockRestore();
    aviso.mockClear();
    expect(await criarInscritosSqlite(caminho, SEGREDO).listar()).toEqual([]);
    expect(aviso).not.toHaveBeenCalled();
    expect(pragma(caminho, 'user_version')).toBe(0);
    expect(pragma(caminho, 'freelist_count')).toBe(0);
    expect(noDisco(caminho, 'apagado1@exemplo.com')).toBe(false);
    expect(noDisco(caminho, 'saiu@exemplo.com')).toBe(false);
  });

  it('banco já migrado com páginas livres (VACUUM de uma versão anterior que falhou) é compactado ao abrir', async () => {
    const caminho = bancoAntigoSujo();
    const db = new DatabaseSync(caminho);
    db.exec('ALTER TABLE inscritos DROP COLUMN removido_em'); // como se migrado sem VACUUM, sem marca
    db.exec('CREATE TABLE descadastros (codigo TEXT PRIMARY KEY, removido_em TEXT NOT NULL)');
    db.close();
    expect(pragma(caminho, 'freelist_count')).toBeGreaterThan(0);
    await criarInscritosSqlite(caminho, SEGREDO).listar();
    expect(pragma(caminho, 'freelist_count')).toBe(0);
    expect(noDisco(caminho, 'apagado1@exemplo.com')).toBe(false);
  });
});

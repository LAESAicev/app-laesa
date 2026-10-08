// Inscritos das novidades da LAESA em SQLite (módulo nativo node:sqlite, Node 24), num arquivo do volume /data.
// LGPD: de quem está inscrito guardamos só o e-mail e a data do consentimento. Ao descadastrar, a linha com o
// e-mail é apagada e fica apenas um código irreversível dele (HMAC com INSCRICAO_SECRET) com a data, em
// `descadastros`, para invalidar links de confirmação emitidos antes. O link de confirmação vale 7 dias, então
// o código perde a utilidade depois disso; apagamos com 30 dias, por margem.
import { createHmac } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { Inscritos } from './inscricao';

const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

type Conexao = {
  db: DatabaseSync;
  adicionar: StatementSync;
  apagar: StatementSync;
  registrarSaida: StatementSync;
  removidoEm: StatementSync;
  expirar: StatementSync;
  listar: StatementSync;
};

function transacao(db: DatabaseSync, fn: () => void): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    fn();
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** PRAGMA user_version: 1 = migração feita, falta reescrever o arquivo (VACUUM). */
const LIMPEZA_PENDENTE = 1;

/**
 * Bancos criados antes desta versão guardavam quem saiu com o e-mail em claro (coluna removido_em).
 * Move essas saídas para `descadastros` (só o código), apaga as linhas sem consentimento e tira a coluna.
 * Roda a cada abertura e não faz nada se a coluna já não existe.
 */
function migrar(db: DatabaseSync, registrarSaida: StatementSync, codigo: (email: string) => string): void {
  transacao(db, () => {
    const colunas = db.prepare('PRAGMA table_info(inscritos)').all() as { name: string }[];
    if (!colunas.some((c) => c.name === 'removido_em')) return;
    const saidas = db.prepare('SELECT email, removido_em FROM inscritos WHERE removido_em IS NOT NULL').all() as {
      email: string;
      removido_em: string;
    }[];
    for (const s of saidas) registrarSaida.run(codigo(s.email), s.removido_em);
    db.exec('DELETE FROM inscritos WHERE consentimento_em IS NULL');
    db.exec('ALTER TABLE inscritos DROP COLUMN removido_em');
    db.exec(`PRAGMA user_version = ${LIMPEZA_PENDENTE}`); // na mesma transação: migrou => limpeza marcada
  });
}

/**
 * Reescreve o arquivo (VACUUM) para os restos do esquema antigo em páginas livres sumirem do disco também.
 * O que é garantido: enquanto o VACUUM não concluir, a marca de limpeza pendente fica no banco e cada abertura
 * tenta de novo, com aviso no log. Também roda em banco com páginas livres (ex.: migrado por uma versão anterior
 * cujo VACUUM falhou e que não deixava marca). Não é garantido que o disco fique limpo na mesma abertura da
 * migração: com o banco ocupado (SQLITE_BUSY), a limpeza espera a próxima.
 */
function limparArquivo(db: DatabaseSync): void {
  const pendente = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version === LIMPEZA_PENDENTE;
  const livres = (db.prepare('PRAGMA freelist_count').get() as { freelist_count: number }).freelist_count;
  if (!pendente && livres === 0) return;
  try {
    db.exec('VACUUM');
    db.exec('PRAGMA user_version = 0');
  } catch (e) {
    console.warn('[inscritos] VACUUM não concluiu; tenta de novo na próxima abertura:', (e as Error).message);
    return;
  }
  // O VACUUM passa pelo WAL: o checkpoint leva o arquivo limpo para o banco principal e zera o WAL.
  const r = db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get() as { busy: number } | undefined;
  if (r?.busy) console.warn('[inscritos] checkpoint do WAL não concluiu (banco em uso); o SQLite completa no próximo checkpoint.');
}

export function criarInscritosSqlite(caminho: string, segredo: string): Inscritos {
  let conexao: Conexao | undefined;
  // HMAC e não hash simples: sem o segredo, não dá para testar uma lista de e-mails contra a tabela.
  const codigo = (email: string) => createHmac('sha256', segredo).update(`descadastro:${email}`).digest('base64url');

  function abrir(): Conexao {
    if (!conexao) {
      if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
      const db = new DatabaseSync(caminho);
      db.exec('PRAGMA journal_mode = WAL');
      db.exec('PRAGMA busy_timeout = 5000');
      // Apagar zera o conteúdo no arquivo; sem isso o e-mail removido continuaria no disco (e nos backups).
      db.exec('PRAGMA secure_delete = ON');
      db.exec(`CREATE TABLE IF NOT EXISTS inscritos (
        email TEXT PRIMARY KEY,
        consentimento_em TEXT NOT NULL,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE TABLE IF NOT EXISTS descadastros (
        codigo TEXT PRIMARY KEY,
        removido_em TEXT NOT NULL
      )`);
      const registrarSaida = db.prepare(
        `INSERT INTO descadastros (codigo, removido_em) VALUES (?, ?)
         ON CONFLICT(codigo) DO UPDATE SET removido_em = max(removido_em, excluded.removido_em)`,
      );
      migrar(db, registrarSaida, codigo);
      limparArquivo(db);
      conexao = {
        db,
        adicionar: db.prepare(
          `INSERT INTO inscritos (email, consentimento_em) VALUES (?, ?)
           ON CONFLICT(email) DO UPDATE SET consentimento_em = excluded.consentimento_em`,
        ),
        apagar: db.prepare('DELETE FROM inscritos WHERE email = ?'),
        registrarSaida,
        removidoEm: db.prepare('SELECT removido_em FROM descadastros WHERE codigo = ?'),
        expirar: db.prepare('DELETE FROM descadastros WHERE removido_em < ?'),
        listar: db.prepare('SELECT email FROM inscritos ORDER BY email'),
      };
    }
    // ponytail: expira a cada acesso ao banco, inclusive o primeiro depois de abrir. Sem nenhum acesso, um código
    // vencido espera o próximo; uma rotina diária que chame qualquer método (ex.: listar()) cobre esse caso.
    conexao.expirar.run(new Date(Date.now() - TRINTA_DIAS).toISOString());
    return conexao;
  }

  return {
    async adicionar(email, em) {
      abrir().adicionar.run(email, em.toISOString());
    },
    async remover(email, em) {
      const c = abrir();
      transacao(c.db, () => {
        c.apagar.run(email);
        c.registrarSaida.run(codigo(email), em.toISOString());
      });
      // Leva a página zerada do WAL para o arquivo principal agora, e não só quando o WAL encher.
      c.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    },
    async removidoEm(email) {
      const linha = abrir().removidoEm.get(codigo(email)) as { removido_em: string } | undefined;
      return linha ? new Date(linha.removido_em) : undefined;
    },
    async listar() {
      return (abrir().listar.all() as { email: string }[]).map((l) => l.email);
    },
  };
}

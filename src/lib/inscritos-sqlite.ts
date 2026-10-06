// Inscritos das novidades da LAESA em SQLite (módulo nativo node:sqlite, Node 24), num arquivo do volume /data.
// LGPD: guardamos só o e-mail e as datas de consentimento/descadastro. Ao descadastrar, o consentimento é apagado
// e a linha fica apenas com removido_em, que serve para invalidar links de confirmação anteriores.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { Inscritos } from './inscricao';

type Conexao = {
  adicionar: StatementSync;
  remover: StatementSync;
  removidoEm: StatementSync;
  listar: StatementSync;
};

export function criarInscritosSqlite(caminho: string): Inscritos {
  let conexao: Conexao | undefined;

  function abrir(): Conexao {
    if (conexao) return conexao;
    if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
    const db = new DatabaseSync(caminho);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA busy_timeout = 5000');
    db.exec(`CREATE TABLE IF NOT EXISTS inscritos (
      email TEXT PRIMARY KEY,
      consentimento_em TEXT,
      removido_em TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    conexao = {
      adicionar: db.prepare(
        // removido_em é mantido: links de confirmação emitidos antes do último descadastro seguem inválidos
        `INSERT INTO inscritos (email, consentimento_em, removido_em) VALUES (?, ?, NULL)
         ON CONFLICT(email) DO UPDATE SET consentimento_em = excluded.consentimento_em`,
      ),
      remover: db.prepare(
        `INSERT INTO inscritos (email, consentimento_em, removido_em) VALUES (?, NULL, ?)
         ON CONFLICT(email) DO UPDATE SET consentimento_em = NULL, removido_em = excluded.removido_em`,
      ),
      removidoEm: db.prepare('SELECT removido_em FROM inscritos WHERE email = ?'),
      listar: db.prepare('SELECT email FROM inscritos WHERE consentimento_em IS NOT NULL ORDER BY email'),
    };
    return conexao;
  }

  return {
    async adicionar(email, em) {
      abrir().adicionar.run(email, em.toISOString());
    },
    async remover(email, em) {
      abrir().remover.run(email, em.toISOString());
    },
    async removidoEm(email) {
      const linha = abrir().removidoEm.get(email) as { removido_em: string | null } | undefined;
      return linha?.removido_em ? new Date(linha.removido_em) : undefined;
    },
    async listar() {
      return (abrir().listar.all() as { email: string }[]).map((l) => l.email);
    },
  };
}

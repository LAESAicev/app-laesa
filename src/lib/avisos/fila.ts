// Fila dos avisos, no mesmo SQLite dos inscritos (tabelas avisos_*). Ninguém recebe duas vezes: antes de cada
// envio a entrega fica registrada, e quem já tem entrega neste envio é pulado, mesmo se o processamento
// reiniciar. Os destinatários são lidos da tabela `inscritos` na hora de cada envio, então quem se descadastra
// no meio fica de fora sozinho.
// LGPD: as entregas guardam só um código do e-mail (HMAC com INSCRICAO_SECRET, diferente para cada envio),
// nunca o endereço, e são apagadas 30 dias depois do fim do envio. Ficam os totais (enviados, falhas).
import { createHash, createHmac } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { criarInscritosSqlite } from '../inscritos-sqlite.ts';
import type { Evento, Rascunho as Conteudo } from './templates.ts';

const DIA = 24 * 60 * 60 * 1000;

export class ErroAviso extends Error {}

export type Rascunho = Conteudo & {
  id: number;
  item: string | null;
  evento: Evento;
  hash: string;
  criado_em: string;
  teste_enviado_em: string | null;
};

export type StatusEnvio = 'enviando' | 'pausado' | 'concluido' | 'cancelado';

export type Envio = {
  id: number;
  rascunho_id: number;
  por: string;
  criado_em: string;
  total_previsto: number;
  enviados: number;
  falhas: number;
  status: StatusEnvio;
  motivo: string | null;
  atualizado_em: string;
  finalizado_em: string | null;
  item: string | null;
  evento: Evento;
  assunto: string;
};

/** Mesmo conteúdo = mesmo hash. É o que liga o teste ao envio: mudou uma vírgula, precisa testar de novo. */
export const hashDo = (r: Pick<Rascunho, 'item' | 'evento' | 'assunto' | 'texto' | 'site' | 'contato'>) =>
  createHash('sha256').update(JSON.stringify([r.item, r.evento, r.assunto, r.texto, r.site, r.contato])).digest('hex');

/** Chave da proteção contra repetição: item + evento; aviso livre conta pelo conteúdo. */
export const chaveDoItem = (r: Pick<Rascunho, 'item' | 'hash'>) => r.item ?? `livre:${r.hash.slice(0, 16)}`;

export type Fila = ReturnType<typeof criarFila>;

export function criarFila(caminho: string, segredo: string, relogio: () => Date = () => new Date()) {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
  const inscritos = criarInscritosSqlite(caminho, segredo);
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA secure_delete = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS avisos_rascunhos (
      id INTEGER PRIMARY KEY,
      item TEXT,
      evento TEXT NOT NULL,
      assunto TEXT NOT NULL,
      texto TEXT NOT NULL,
      site TEXT NOT NULL,
      contato TEXT NOT NULL,
      hash TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      teste_enviado_em TEXT
    );
    CREATE TABLE IF NOT EXISTS avisos_envios (
      id INTEGER PRIMARY KEY,
      rascunho_id INTEGER NOT NULL REFERENCES avisos_rascunhos(id),
      por TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      total_previsto INTEGER NOT NULL,
      enviados INTEGER NOT NULL DEFAULT 0,
      falhas INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('enviando', 'pausado', 'concluido', 'cancelado')),
      motivo TEXT,
      atualizado_em TEXT NOT NULL,
      finalizado_em TEXT
    );
    CREATE TABLE IF NOT EXISTS avisos_entregas (
      envio_id INTEGER NOT NULL REFERENCES avisos_envios(id),
      codigo TEXT NOT NULL,
      resultado TEXT NOT NULL CHECK (resultado IN ('enviando', 'ok', 'falha')),
      enviado_em TEXT NOT NULL,
      PRIMARY KEY (envio_id, codigo)
    );
    CREATE INDEX IF NOT EXISTS avisos_entregas_em ON avisos_entregas (enviado_em);
    CREATE TABLE IF NOT EXISTS avisos_itens_notificados (
      item TEXT NOT NULL,
      evento TEXT NOT NULL,
      envio_id INTEGER NOT NULL REFERENCES avisos_envios(id),
      PRIMARY KEY (item, evento, envio_id)
    );
    -- uma linha só: quem está processando a fila agora e até quando a vez dele vale
    CREATE TABLE IF NOT EXISTS avisos_processador (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      dono TEXT NOT NULL,
      expira_em TEXT NOT NULL
    );
  `);

  const agora = () => relogio().toISOString();
  const antes = (ms: number) => new Date(relogio().getTime() - ms).toISOString();
  const codigo = (envioId: number, email: string) => createHmac('sha256', segredo).update(`aviso:${envioId}:${email}`).digest('base64url');

  function transacao<T>(fn: () => T): T {
    db.exec('BEGIN IMMEDIATE');
    try {
      const r = fn();
      db.exec('COMMIT');
      return r;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }

  const SELECT_ENVIO = `SELECT e.*, r.item, r.evento, r.assunto FROM avisos_envios e JOIN avisos_rascunhos r ON r.id = e.rascunho_id`;
  const envio = (id: number) => db.prepare(`${SELECT_ENVIO} WHERE e.id = ?`).get(id) as Envio | undefined;
  const rascunho = (id: number) => db.prepare('SELECT * FROM avisos_rascunhos WHERE id = ?').get(id) as Rascunho | undefined;

  function mudarStatus(id: number, status: StatusEnvio, motivo: string | null, de: StatusEnvio[]): Envio {
    const atual = envio(id);
    if (!atual) throw new ErroAviso(`Envio ${id} não existe.`);
    if (!de.includes(atual.status)) throw new ErroAviso(`O envio ${id} está "${atual.status}": não dá para mudar para "${status}".`);
    const fim = status === 'concluido' || status === 'cancelado' ? agora() : null;
    db.prepare('UPDATE avisos_envios SET status = ?, motivo = ?, atualizado_em = ?, finalizado_em = ? WHERE id = ?').run(status, motivo, agora(), fim, id);
    return envio(id)!;
  }

  const api = {
    /** E-mails inscritos agora (confirmados). */
    inscritos: () => inscritos.listar(),

    salvarRascunho(r: Pick<Rascunho, 'item' | 'evento' | 'assunto' | 'texto' | 'site' | 'contato'>): Rascunho {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO avisos_rascunhos (item, evento, assunto, texto, site, contato, hash, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(r.item, r.evento, r.assunto, r.texto, r.site, r.contato, hashDo(r), agora());
      return rascunho(Number(lastInsertRowid))!;
    },

    rascunho,

    marcarTeste(id: number): void {
      db.prepare('UPDATE avisos_rascunhos SET teste_enviado_em = ? WHERE id = ?').run(agora(), id);
    },

    /** Houve teste de exatamente este conteúdo (em qualquer rascunho com o mesmo hash)? */
    testado(r: Rascunho): boolean {
      return Boolean(db.prepare('SELECT 1 FROM avisos_rascunhos WHERE hash = ? AND teste_enviado_em IS NOT NULL').get(r.hash));
    },

    /** Envios anteriores deste item com este evento (proteção contra repetir aviso). */
    notificacoes(item: string, evento: Evento): { envio_id: number; criado_em: string; por: string }[] {
      return db
        .prepare(
          `SELECT n.envio_id, e.criado_em, e.por FROM avisos_itens_notificados n JOIN avisos_envios e ON e.id = n.envio_id
           WHERE n.item = ? AND n.evento = ? ORDER BY e.criado_em`,
        )
        .all(item, evento) as { envio_id: number; criado_em: string; por: string }[];
    },

    /** Cria o envio para todos os inscritos. Recusa sem teste deste conteúdo e, sem `reenviar`, aviso repetido. */
    criarEnvio(rascunhoId: number, por: string, totalPrevisto: number, { reenviar = false } = {}): Envio {
      const r = rascunho(rascunhoId);
      if (!r) throw new ErroAviso(`Rascunho ${rascunhoId} não existe.`);
      const quem = por.trim();
      if (!quem) throw new ErroAviso('Diga quem está enviando: --por "Seu nome".');
      if (!api.testado(r)) throw new ErroAviso(`O rascunho ${r.id} ainda não teve teste deste conteúdo. Rode "teste ${r.id}" e confira a caixa da LAESA.`);
      const chave = chaveDoItem(r);
      const antes = api.notificacoes(chave, r.evento);
      if (antes.length && !reenviar) {
        const ultimo = antes[antes.length - 1];
        throw new ErroAviso(`Este aviso já foi enviado (envio ${ultimo.envio_id}, por ${ultimo.por}, em ${ultimo.criado_em}). Para mandar de novo, use --reenviar.`);
      }
      if (totalPrevisto < 1) throw new ErroAviso('Ninguém inscrito: não há para quem enviar.');
      return transacao(() => {
        const { lastInsertRowid } = db
          .prepare("INSERT INTO avisos_envios (rascunho_id, por, criado_em, total_previsto, status, atualizado_em) VALUES (?, ?, ?, ?, 'enviando', ?)")
          .run(r.id, quem, agora(), totalPrevisto, agora());
        const id = Number(lastInsertRowid);
        db.prepare('INSERT INTO avisos_itens_notificados (item, evento, envio_id) VALUES (?, ?, ?)').run(chave, r.evento, id);
        return envio(id)!;
      });
    },

    envio,
    envios: () => db.prepare(`${SELECT_ENVIO} ORDER BY e.id DESC`).all() as Envio[],
    proximoEnvio: () => db.prepare(`${SELECT_ENVIO} WHERE e.status = 'enviando' ORDER BY e.id LIMIT 1`).get() as Envio | undefined,

    retomar: (id: number) => mudarStatus(id, 'enviando', null, ['pausado', 'enviando']),
    cancelar: (id: number) => mudarStatus(id, 'cancelado', 'cancelado pela Mesa', ['enviando', 'pausado']),
    // usados pelo processador: só mexem em envio ainda "enviando" (a Mesa pode ter cancelado no meio)
    pausar(id: number, motivo: string): void {
      db.prepare("UPDATE avisos_envios SET status = 'pausado', motivo = ?, atualizado_em = ? WHERE id = ? AND status = 'enviando'").run(motivo, agora(), id);
    },
    concluir(id: number): void {
      db.prepare("UPDATE avisos_envios SET status = 'concluido', atualizado_em = ?, finalizado_em = ? WHERE id = ? AND status = 'enviando'").run(agora(), agora(), id);
    },

    /** Próximo inscrito sem entrega neste envio, ou undefined se acabou. */
    async proximoDestinatario(envioId: number): Promise<string | undefined> {
      const feitos = new Set((db.prepare('SELECT codigo FROM avisos_entregas WHERE envio_id = ?').all(envioId) as { codigo: string }[]).map((l) => l.codigo));
      // ponytail: relê a lista e calcula um HMAC por inscrito a cada e-mail (O(n) por envio, ~ms com milhares).
      // Se a lista chegar a dezenas de milhares, guardar o cursor do envio.
      return (await inscritos.listar()).find((email) => !feitos.has(codigo(envioId, email)));
    },

    /** Registra a entrega ANTES de enviar: se o processo cair no meio, ninguém recebe de novo. */
    reservar(envioId: number, email: string): string {
      const c = codigo(envioId, email);
      db.prepare("INSERT INTO avisos_entregas (envio_id, codigo, resultado, enviado_em) VALUES (?, ?, 'enviando', ?)").run(envioId, c, agora());
      return c;
    },

    registrar(envioId: number, c: string, ok: boolean): void {
      transacao(() => {
        db.prepare('UPDATE avisos_entregas SET resultado = ? WHERE envio_id = ? AND codigo = ?').run(ok ? 'ok' : 'falha', envioId, c);
        db.prepare(`UPDATE avisos_envios SET ${ok ? 'enviados = enviados + 1' : 'falhas = falhas + 1'}, atualizado_em = ? WHERE id = ?`).run(agora(), envioId);
      });
    },

    /** Falha passageira: tira a reserva, o mesmo destinatário é tentado de novo depois. */
    desfazer(envioId: number, c: string): void {
      db.prepare("DELETE FROM avisos_entregas WHERE envio_id = ? AND codigo = ? AND resultado = 'enviando'").run(envioId, c);
    },

    /** Entregas (ok ou não) nas últimas 24 horas, de todos os envios: é a janela do limite do Gmail. */
    enviadosUltimas24h: () => (db.prepare('SELECT count(*) AS n FROM avisos_entregas WHERE enviado_em >= ?').get(antes(DIA)) as { n: number }).n,

    // ---- vez do processador: um só por vez, senão o ritmo e o teto diário valeriam em dobro
    /** A vez vence sozinha: um processador que caiu sem soltar segura a fila só até `expira_em`. */
    pegarVez(dono: string, ms: number): boolean {
      return transacao(() => {
        const atual = db.prepare('SELECT dono, expira_em FROM avisos_processador WHERE id = 1').get() as { dono: string; expira_em: string } | undefined;
        if (atual && atual.dono !== dono && atual.expira_em > agora()) return false;
        db.prepare('INSERT INTO avisos_processador (id, dono, expira_em) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET dono = excluded.dono, expira_em = excluded.expira_em').run(
          dono,
          new Date(relogio().getTime() + ms).toISOString(),
        );
        // reserva de um processador que caiu entre reservar e registrar: não dá para saber se saiu, conta como falha
        const incertas = db.prepare("SELECT envio_id, codigo FROM avisos_entregas WHERE resultado = 'enviando'").all() as { envio_id: number; codigo: string }[];
        for (const i of incertas) {
          db.prepare("UPDATE avisos_entregas SET resultado = 'falha' WHERE envio_id = ? AND codigo = ?").run(i.envio_id, i.codigo);
          db.prepare('UPDATE avisos_envios SET falhas = falhas + 1 WHERE id = ?').run(i.envio_id);
        }
        return true;
      });
    },

    renovarVez(dono: string, ms: number): void {
      db.prepare('UPDATE avisos_processador SET expira_em = ? WHERE id = 1 AND dono = ?').run(new Date(relogio().getTime() + ms).toISOString(), dono);
    },

    /** Solta a vez só se não sobrou envio "enviando" (um envio criado agora não fica sem ninguém processando). */
    liberarSeVazio(dono: string): boolean {
      return transacao(() => {
        if (db.prepare("SELECT 1 FROM avisos_envios WHERE status = 'enviando'").get()) return false;
        db.prepare('DELETE FROM avisos_processador WHERE id = 1 AND dono = ?').run(dono);
        return true;
      });
    },

    liberar(dono: string): void {
      db.prepare('DELETE FROM avisos_processador WHERE id = 1 AND dono = ?').run(dono);
    },

    processador: () => db.prepare('SELECT dono, expira_em FROM avisos_processador WHERE id = 1 AND expira_em > ?').get(agora()) as { dono: string; expira_em: string } | undefined,

    /**
     * Retenção: apaga as entregas de envios terminados há mais de 30 dias. Envio pausado e esquecido por 30 dias
     * é cancelado (com fim na última atividade), para nenhum código ficar guardado sem prazo. Ficam os totais.
     */
    limpar(): void {
      transacao(() => {
        const limite = antes(30 * DIA);
        db.prepare(
          "UPDATE avisos_envios SET status = 'cancelado', motivo = 'pausado por mais de 30 dias', finalizado_em = atualizado_em WHERE status = 'pausado' AND atualizado_em < ?",
        ).run(limite);
        db.prepare('DELETE FROM avisos_entregas WHERE envio_id IN (SELECT id FROM avisos_envios WHERE finalizado_em < ?)').run(limite);
      });
    },

    fechar: () => db.close(),
  };
  api.limpar();
  return api;
}

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { bloqueios, linksDeFora } from '../src/lib/avisos/bloqueios';
import { criarFila, ErroAviso, type Fila } from '../src/lib/avisos/fila';
import type { ItemAtividade, ItemEdital, Manifesto } from '../src/lib/avisos/manifesto';
import { processar } from '../src/lib/avisos/processar';
import { eventoSugerido, mensagemPara, renderizar, type Mensagem } from '../src/lib/avisos/templates';
import { criarInscritosSqlite } from '../src/lib/inscritos-sqlite';
import { lerToken } from '../src/lib/tokens';

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres';
const SITE = 'https://laesa.exemplo.test';
const HOJE = '2026-10-15';
const DIA = 24 * 60 * 60 * 1000;

// ---- itens como o build gera (src/pages/avisos/itens.json.ts), com os dados do Edital 2026.2
const edital: ItemEdital = {
  id: 'edital:2026-2',
  tipo: 'edital',
  titulo: 'Edital 2026.2',
  url: `${SITE}/processos-seletivos/2026-2`,
  status: 'aberto',
  inscricoesInicio: '2026-10-12',
  inscricoesAte: '2026-10-23',
  vagas: 15,
  linkInscricao: true,
  exemplo: false,
};
const prorrogado: ItemEdital = { ...edital, prorrogadasAte: '2026-10-30' };
const oficina: ItemAtividade = {
  id: 'atividade:oficina-figma',
  tipo: 'atividade',
  nome: 'Oficina: Do clique à experiência, criando interfaces no Figma',
  descricao: 'Oficina prática: os participantes criam do zero o protótipo navegável de um aplicativo.',
  url: `${SITE}/atividades?q=Oficina`,
  inicio: '2026-11-12',
  status: 'auto',
  eixos: ['ensino', 'extensao'],
  inscricao: true,
  exemplo: false,
};
const workshop: ItemAtividade = { ...oficina, id: 'atividade:workshop', nome: 'Workshop: Introdução à Programação Web', inicio: '2026-11-20', inscricao: false };
const projeto: ItemAtividade = { ...oficina, id: 'atividade:sistema', nome: 'Sistema de monitoria', inicio: '2026-09-01', status: 'em-andamento', eixos: ['projetos'], inscricao: false };
const passado: ItemAtividade = { ...oficina, id: 'atividade:mostra', nome: 'I Mostra Científica do iCEV', inicio: '2025-11-26', inscricao: false };
const manifesto: Manifesto = { versao: 1, geradoEm: '2026-10-15T12:00:00Z', site: SITE, contato: 'laesa@example.test', itens: [edital, oficina, workshop, projeto, passado] };

const verificar = (evento: Parameters<typeof renderizar>[0], item: Parameters<typeof renderizar>[1], extra = {}) =>
  bloqueios({ evento, item, manifesto, conteudo: renderizar(evento, item, extra), hoje: HOJE });

describe('avisos: templates', () => {
  it('assunto de cada evento', () => {
    expect(renderizar('edital-aberto', edital).assunto).toBe('Edital 2026.2 aberto: inscrições até 23 out');
    expect(renderizar('edital-prorrogado', prorrogado).assunto).toBe('Edital 2026.2: inscrições prorrogadas até 30 out');
    expect(renderizar('atividade-inscricoes', oficina).assunto).toBe('Inscrições abertas: Oficina: Do clique à experiência, criando interfaces no Figma, 12 nov');
    expect(renderizar('atividade-breve', workshop).assunto).toBe('Em breve na LAESA: Workshop: Introdução à Programação Web, 20 nov');
    expect(renderizar('projeto', projeto).assunto).toBe('Saiu do papel: Sistema de monitoria');
    expect(renderizar('livre', undefined, { assunto: 'Reunião aberta', texto: 'Oi!' })).toEqual({ assunto: 'Reunião aberta', texto: 'Oi!' });
  });

  it('edital aberto já prorrogado anuncia a data que vale agora', () => {
    expect(renderizar('edital-aberto', prorrogado).assunto).toBe('Edital 2026.2 aberto: inscrições até 30 out');
  });

  it('corpo com a data por extenso, as vagas e a página do site', () => {
    const { texto } = renderizar('edital-aberto', edital);
    expect(texto).toContain('até 23 out 2026');
    expect(texto).toContain('São 15 vagas.');
    expect(texto).toContain(`${SITE}/processos-seletivos/2026-2`);
  });

  it('assunto nunca leva quebra de linha', () => {
    const { assunto } = renderizar('livre', undefined, { assunto: 'Oi\r\nBcc: alguem@example.test', texto: 'x' });
    expect(assunto).toBe('Oi Bcc: alguem@example.test');
    expect(mensagemPara({ assunto: 'a\nb', texto: 't', site: SITE, contato: 'c@example.test' }, 'p@example.test', SEGREDO).subject).toBe('a b');
  });

  it('cada destinatário recebe o próprio link de descadastro, com os cabeçalhos de um clique', () => {
    const m = mensagemPara({ ...renderizar('edital-aberto', edital), site: SITE, contato: 'laesa@example.test' }, 'pessoa@example.test', SEGREDO);
    expect(m.to).toBe('pessoa@example.test');
    expect(m.replyTo).toBe('laesa@example.test');
    const link = m.text.match(/https:\/\/\S+descadastro\?t=\S+/)![0];
    expect(m.headers).toEqual({ 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });
    expect(lerToken(SEGREDO, new URL(link).searchParams.get('t')!, 'sair')?.email).toBe('pessoa@example.test');
    expect(m.text).toContain('porque se inscreveu nas novidades da LAESA em laesa.exemplo.test');
    expect(linksDeFora(m.text, SITE)).toEqual([]);
  });

  it('evento sugerido pelo estado do item', () => {
    expect(eventoSugerido(edital, HOJE)).toBe('edital-aberto');
    expect(eventoSugerido(prorrogado, HOJE)).toBe('edital-prorrogado');
    expect(eventoSugerido({ ...edital, status: 'finalizado' }, HOJE)).toBeUndefined();
    expect(eventoSugerido(oficina, HOJE)).toBe('atividade-inscricoes');
    expect(eventoSugerido(workshop, HOJE)).toBe('atividade-breve');
    expect(eventoSugerido(projeto, HOJE)).toBe('projeto');
    expect(eventoSugerido(passado, HOJE)).toBeUndefined();
  });
});

describe('avisos: bloqueios', () => {
  it('nada bloqueia um aviso certo', () => {
    expect(verificar('edital-aberto', edital)).toEqual([]);
    expect(verificar('edital-prorrogado', prorrogado)).toEqual([]);
    expect(verificar('atividade-inscricoes', oficina)).toEqual([]);
    expect(verificar('atividade-breve', workshop)).toEqual([]);
    expect(verificar('projeto', projeto)).toEqual([]);
    expect(verificar('livre', undefined, { assunto: 'Reunião aberta', texto: `Detalhes em ${SITE}/contato.` })).toEqual([]);
  });

  it('conteúdo provisório (exemplo)', () => {
    expect(verificar('edital-aberto', { ...edital, exemplo: true }).join()).toMatch(/provisório/);
  });

  it('data faltando vira [data] e bloqueia', () => {
    const r = verificar('edital-aberto', { ...edital, inscricoesAte: undefined });
    expect(r.join('\n')).toMatch(/Faltam dados: o texto tem \[data\]/);
    expect(r.join('\n')).toMatch(/não tem a data "Inscrições até"/);
    expect(verificar('atividade-breve', { ...workshop, inicio: undefined }).join()).toMatch(/\[data\]/);
    expect(verificar('livre', undefined, { assunto: 'Oficina em [data]', texto: 'x' }).join()).toMatch(/\[data\]/);
  });

  it('edital aberto sem link de inscrição', () => {
    expect(verificar('edital-aberto', { ...edital, linkInscricao: false }).join()).toMatch(/não tem "Link de inscrição"/);
  });

  it('evento que não combina com o estado do item', () => {
    expect(verificar('edital-prorrogado', edital).join()).toMatch(/não tem prorrogação/);
    expect(verificar('edital-aberto', { ...edital, status: 'em-andamento' }).join()).toMatch(/Seleção em andamento/);
    expect(verificar('edital-aberto', { ...edital, inscricoesAte: '2026-10-10', inscricoesInicio: '2026-10-01' }).join()).toMatch(/terminaram em 10\/10\/2026/);
    expect(verificar('atividade-inscricoes', workshop).join()).toMatch(/não tem "Link de inscrição"/);
    expect(verificar('atividade-inscricoes', passado).join()).toMatch(/"concluído", não com inscrições abertas/);
    expect(verificar('atividade-breve', passado).join()).toMatch(/já não é "em breve"/);
    expect(verificar('projeto', workshop).join()).toMatch(/ainda não começou/);
    expect(verificar('edital-aberto', oficina).join()).toMatch(/é para editais/);
    expect(verificar('projeto', edital).join()).toMatch(/é para atividades/);
    expect(verificar('projeto', undefined)).toEqual([expect.stringMatching(/Item não encontrado/)]);
  });

  it('só links do site: Instagram, formulário ou outro domínio bloqueiam', () => {
    const texto = 'Veja https://www.instagram.com/laesa.icev/p/x e inscreva-se em forms.gle/abc ou www.google.com.';
    const r = verificar('livre', undefined, { assunto: 'Oi', texto }).join();
    expect(r).toMatch(/Só pode ter links do site/);
    expect(linksDeFora(texto, SITE)).toEqual(['https://www.instagram.com/laesa.icev/p/x', 'forms.gle/abc', 'www.google.com']);
    expect(linksDeFora(`${SITE}/atividades. Fale com laesa@somosicev.com`, SITE)).toEqual([]);
    expect(linksDeFora('http://laesa.exemplo.test/x', SITE)).toEqual(['http://laesa.exemplo.test/x']); // outra origem (http)
    expect(verificar('atividade-breve', { ...workshop, descricao: 'Inscrições: https://forms.gle/x' }).join()).toMatch(/forms\.gle/);
  });

  it.each([
    ['letra grudada antes do esquema', 'veja xhttps://evil.com'],
    ['sublinhado grudado antes do esquema', 'veja _https://evil.com'],
    ['número grudado antes do esquema', 'veja 1https://evil.com'],
    ['link do site emendado com barra vertical', `${SITE}/x|https://evil.com`],
    ['link do site emendado com crase', `${SITE}/x\`evil.com`],
    ['link do site emendado com chave', `${SITE}/x{https://evil.com}`],
    ['link do site emendado com barra invertida', `${SITE}/x\\evil.com`],
    ['domínio solto .xyz com caminho', 'entre em evil.xyz/login'],
    ['domínio solto .co', 'entre em evil.co'],
    ['domínio solto .ru', 'entre em evil.ru'],
    ['protocolo relativo', 'abra //evil.com/x'],
    ['ftp', 'baixe em ftp://evil.com/arquivo'],
    ['userinfo depois do host do site', `${SITE}@evil.com/x`],
    ['host do site como subdomínio de outro', `${SITE}.evil.com/x`],
    ['punycode', 'https://xn--laesa-exemplo-xyz.test/x'],
  ])('link de fora é pego: %s', (_, texto) => {
    expect(linksDeFora(texto, SITE)).not.toEqual([]);
  });

  it('caractere invisível ou de controle bloqueia (zero-width, bidi)', () => {
    expect(linksDeFora(`${SITE}/x\u200bhttps://evil.com`, SITE)).not.toEqual([]);
    for (const c of ['\u200b', '\u202e', '\u2066', '\ufeff', '\u0007']) {
      expect(verificar('livre', undefined, { assunto: 'Oi', texto: `Detalhes${c} no site.` }).join()).toMatch(/invisíve/);
    }
    expect(verificar('livre', undefined, { assunto: 'Oi\u200b', texto: 'x' }).join()).toMatch(/invisíve/);
  });

  it('não bloqueia o que é do site nem prosa comum', () => {
    expect(linksDeFora('HTTPS://LAESA.EXEMPLO.TEST/atividades', SITE)).toEqual([]);
    expect(linksDeFora(`${SITE}/atividades?q=Oficina%3A+Figma.`, SITE)).toEqual([]);
    expect(linksDeFora(`Veja (${SITE}/contato), e laesa.exemplo.test/editais.`, SITE)).toEqual([]);
    expect(linksDeFora('Versão v1.2 do edital 2026.2 sai no fim. Até lá!', SITE)).toEqual([]);
    expect(linksDeFora('Escreva para laesa@somosicev.com ou fulano@example.org.', SITE)).toEqual([]);
  });

  it('devolve todos os motivos de uma vez', () => {
    expect(verificar('edital-aberto', { ...edital, exemplo: true, linkInscricao: false, status: 'finalizado' })).toHaveLength(3);
  });
});

// ---- fila e processamento, num SQLite de verdade num diretório temporário
let dir: string;
let n = 0;
let agora = Date.parse('2026-10-15T12:00:00Z');
const relogio = () => new Date(agora);
const dormir = async (ms: number) => {
  agora += ms;
};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'laesa-avisos-'));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const PESSOAS = ['ana@example.test', 'bia@example.test', 'caio@example.test', 'davi@example.test', 'eva@example.test'];

async function cenario(pessoas = PESSOAS) {
  const caminho = join(dir, `fila-${++n}.db`);
  const store = criarInscritosSqlite(caminho, SEGREDO);
  for (const p of pessoas) await store.adicionar(p, new Date());
  const fila = criarFila(caminho, SEGREDO, relogio);
  const rascunho = fila.salvarRascunho({ item: edital.id, evento: 'edital-aberto', ...renderizar('edital-aberto', edital), site: SITE, contato: 'laesa@example.test' });
  return { caminho, store, fila, rascunho };
}

/** Envio pronto para processar: rascunho testado e envio criado. */
async function envioPronto(pessoas = PESSOAS) {
  const c = await cenario(pessoas);
  c.fila.marcarTeste(c.rascunho.id);
  const envio = c.fila.criarEnvio(c.rascunho.id, 'Ana (Presidência)', pessoas.length);
  return { ...c, envio };
}

function caixa() {
  const recebidos: Mensagem[] = [];
  return { recebidos, enviar: async (m: Mensagem) => void recebidos.push(m), para: () => recebidos.map((m) => m.to) };
}

const rodar = (fila: Fila, enviar: (m: Mensagem) => Promise<void>, extra = {}) => processar({ fila, segredo: SEGREDO, enviar, dormir, log: () => {}, ...extra });

describe('avisos: fila', () => {
  it('envia um e-mail para cada inscrito e conclui', async () => {
    const { fila, envio } = await envioPronto();
    const c = caixa();
    expect(await rodar(fila, c.enviar)).toBe('fim');
    expect(c.para()).toEqual(PESSOAS);
    expect(fila.envio(envio.id)).toMatchObject({ status: 'concluido', enviados: 5, falhas: 0, total_previsto: 5 });
    expect(fila.envio(envio.id)!.finalizado_em).toBeTruthy();
    expect(fila.processador()).toBeUndefined(); // soltou a vez
  });

  it('ninguém recebe duas vezes quando o processamento cai e reinicia', async () => {
    const { caminho, fila } = await envioPronto();
    const c = caixa();
    let enviados = 0;
    const cai = async () => {
      if (++enviados === 2) throw new Error('processo morreu');
    };
    await expect(rodar(fila, c.enviar, { dormir: cai })).rejects.toThrow('processo morreu');
    expect(c.para()).toHaveLength(2);
    // outro processo, outra conexão: continua de onde parou
    const outra = criarFila(caminho, SEGREDO, relogio);
    await rodar(outra, c.enviar);
    expect(c.para()).toEqual(PESSOAS);
  });

  it('reserva sem resultado (queda no meio do envio) conta como falha e não reenvia', async () => {
    const { fila, envio } = await envioPronto();
    fila.reservar(envio.id, 'ana@example.test'); // reservou e o processo caiu antes de registrar
    const c = caixa();
    await rodar(fila, c.enviar);
    expect(c.para()).toEqual(PESSOAS.slice(1));
    expect(fila.envio(envio.id)).toMatchObject({ status: 'concluido', enviados: 4, falhas: 1 });
  });

  it('quem se descadastra no meio do envio fica de fora', async () => {
    const { fila, store, envio } = await envioPronto();
    const c = caixa();
    const enviar = async (m: Mensagem) => {
      await c.enviar(m);
      if (m.to === 'ana@example.test') await store.remover('davi@example.test', new Date());
    };
    await rodar(fila, enviar);
    expect(c.para()).toEqual(['ana@example.test', 'bia@example.test', 'caio@example.test', 'eva@example.test']);
    expect(fila.envio(envio.id)).toMatchObject({ status: 'concluido', enviados: 4 });
  });

  it('exige teste deste conteúdo: mudar o texto pede teste de novo', async () => {
    const { fila, rascunho } = await cenario();
    expect(() => fila.criarEnvio(rascunho.id, 'Ana', 5)).toThrow(/ainda não teve teste/);
    fila.marcarTeste(rascunho.id);
    const editado = fila.salvarRascunho({ ...rascunho, texto: `${rascunho.texto}\nP.S.: até lá!` });
    expect(editado.hash).not.toBe(rascunho.hash);
    expect(() => fila.criarEnvio(editado.id, 'Ana', 5)).toThrow(ErroAviso);
    const igual = fila.salvarRascunho({ ...rascunho }); // mesmo conteúdo, rascunho novo: o teste vale
    expect(fila.criarEnvio(igual.id, 'Ana', 5).status).toBe('enviando');
  });

  it('não repete o aviso do mesmo item e evento, a não ser com --reenviar', async () => {
    const { fila, rascunho } = await envioPronto();
    expect(() => fila.criarEnvio(rascunho.id, 'Bia', 5)).toThrow(/já foi enviado .*--reenviar/);
    expect(fila.criarEnvio(rascunho.id, 'Bia', 5, { reenviar: true }).status).toBe('enviando');
    expect(fila.notificacoes(edital.id, 'edital-aberto')).toHaveLength(2);
    expect(() => fila.criarEnvio(rascunho.id, '  ', 5, { reenviar: true })).toThrow(/--por/);
  });

  it('um processador por vez', async () => {
    const { fila } = await envioPronto();
    expect(fila.pegarVez('outro', 60_000)).toBe(true);
    const c = caixa();
    expect(await rodar(fila, c.enviar)).toBe('sem-vez');
    expect(c.recebidos).toHaveLength(0);
    agora += 61_000; // a vez do outro venceu (ele caiu sem soltar)
    expect(await rodar(fila, c.enviar)).toBe('fim');
    expect(c.recebidos).toHaveLength(5);
  });

  it('processador que perde a vez para de enviar', async () => {
    const { fila } = await envioPronto();
    const c = caixa();
    const enviar = async (m: Mensagem) => {
      await c.enviar(m);
      if (c.recebidos.length === 2) {
        agora += 3 * 60_000; // ficou parado além do prazo da vez e outro processador assumiu
        expect(fila.pegarVez('outro', 60_000)).toBe(true);
      }
    };
    expect(await rodar(fila, enviar)).toBe('sem-vez');
    expect(c.recebidos).toHaveLength(2);
    expect(fila.processador()?.dono).toBe('outro'); // não soltou a vez de quem assumiu
    expect(fila.renovarVez('outro', 60_000)).toBe(true);
    expect(fila.renovarVez('quem-perdeu', 60_000)).toBe(false);
  });

  it('destinatário já reservado por outro processador é pulado, sem erro', async () => {
    const { fila, envio } = await envioPronto();
    let primeiro = true;
    const corrida: Fila = {
      ...fila,
      async proximoDestinatario(id) {
        const email = await fila.proximoDestinatario(id);
        if (email && primeiro) {
          primeiro = false;
          fila.reservar(id, email); // o outro reservou entre a busca e a reserva deste
        }
        return email;
      },
    };
    const c = caixa();
    expect(await rodar(corrida, c.enviar)).toBe('fim');
    expect(c.para()).toEqual(PESSOAS.slice(1));
    expect(fila.envio(envio.id)).toMatchObject({ status: 'concluido', enviados: 4 });
  });

  it('teto diário pausa o envio; retomar no dia seguinte termina', async () => {
    const { fila, envio } = await envioPronto();
    const c = caixa();
    await rodar(fila, c.enviar, { tetoDiario: 2 });
    expect(fila.envio(envio.id)).toMatchObject({ status: 'pausado', enviados: 2 });
    expect(fila.envio(envio.id)!.motivo).toMatch(/teto de 2 avisos em 24 horas/);
    agora += DIA;
    await fila.retomar(envio.id);
    await rodar(fila, c.enviar, { tetoDiario: 2 });
    expect(fila.envio(envio.id)).toMatchObject({ status: 'pausado', enviados: 4 });
    agora += DIA;
    await fila.retomar(envio.id);
    await rodar(fila, c.enviar, { tetoDiario: 2 });
    expect(fila.envio(envio.id)).toMatchObject({ status: 'concluido', enviados: 5 });
    expect(new Set(c.para()).size).toBe(5);
  });

  it('retomar recusa envio começado com outro INSCRICAO_SECRET (todos pareceriam pendentes)', async () => {
    const { caminho, fila, envio } = await envioPronto();
    await rodar(fila, caixa().enviar, { tetoDiario: 2 });
    agora += DIA;
    const trocado = criarFila(caminho, 'outro-segredo-com-mais-de-32-caracteres!!', relogio);
    await expect(trocado.retomar(envio.id)).rejects.toThrow(/segredo/);
    expect(trocado.envio(envio.id)!.status).toBe('pausado');
    expect((await fila.retomar(envio.id)).status).toBe('enviando'); // com o segredo do começo, segue
  });

  it('falha passageira do SMTP: espera crescente e depois pausa, sem perder ninguém', async () => {
    const { fila, envio } = await envioPronto();
    const esperas: number[] = [];
    const falha = async () => {
      throw Object.assign(new Error('connect ECONNREFUSED 1.2.3.4:465'), { code: 'ESOCKET', syscall: 'connect', command: 'CONN' });
    };
    await rodar(fila, falha, { esperasMs: [60_000, 300_000, 900_000], dormir: async (ms: number) => void esperas.push(ms) });
    expect(esperas).toEqual([60_000, 300_000, 900_000]);
    expect(fila.envio(envio.id)).toMatchObject({ status: 'pausado', enviados: 0, falhas: 0 });
    expect(fila.envio(envio.id)!.motivo).toMatch(/SMTP falhou 4 vezes seguidas \(ESOCKET\)/);
    await fila.retomar(envio.id);
    const c = caixa();
    await rodar(fila, c.enviar);
    expect(c.para()).toEqual(PESSOAS);
  });

  // campos como o nodemailer 10 monta (dist/esm/smtp-connection): command 'CONN' aparece em qualquer fase
  const erroSmtp = (message: string, campos: object) => Object.assign(new Error(message), campos);
  it.each([
    ['conexão recusada', erroSmtp('connect ECONNREFUSED', { code: 'ESOCKET', syscall: 'connect', command: 'CONN' })],
    ['DNS', erroSmtp('getaddrinfo ENOTFOUND', { code: 'EDNS', command: 'CONN' })],
    ['tempo de conexão', erroSmtp('Connection timeout', { code: 'ETIMEDOUT', command: 'CONN' })],
    ['sem saudação', erroSmtp('Greeting never received', { code: 'ETIMEDOUT', command: 'CONN' })],
    ['login', erroSmtp('Invalid login: 535', { code: 'EAUTH', response: '535 5.7.8 bad', responseCode: 535, command: 'AUTH PLAIN' })],
    ['recusa temporária com resposta', erroSmtp('421', { code: 'EENVELOPE', response: '421 4.7.0 try later', responseCode: 421, command: 'DATA' })],
  ])('falha antes do aceite (%s): tenta a mesma pessoa de novo', async (_, erro) => {
    const { fila, envio } = await envioPronto(['ana@example.test']);
    const c = caixa();
    let primeira = true;
    const enviar = async (m: Mensagem) => {
      if (primeira) {
        primeira = false;
        throw erro;
      }
      await c.enviar(m);
    };
    await rodar(fila, enviar, { esperasMs: [1] });
    expect(c.para()).toEqual(['ana@example.test']);
    expect(fila.envio(envio.id)).toMatchObject({ status: 'concluido', enviados: 1, falhas: 0 });
  });

  it.each([
    ['tempo esgotado no meio da sessão', erroSmtp('Timeout', { code: 'ETIMEDOUT', command: 'CONN' })],
    ['conexão caiu no meio', erroSmtp('Connection closed unexpectedly', { code: 'ECONNECTION', command: 'CONN' })],
    ['socket quebrou depois do DATA', erroSmtp('read ECONNRESET', { code: 'ESOCKET', syscall: 'read', command: 'CONN' })],
    ['erro sem campos', new Error('???')],
  ])('falha ambígua (%s): conta como falha e não reenvia', async (_, erro) => {
    const { fila, envio } = await envioPronto(['ana@example.test', 'bia@example.test']);
    const tentativas: string[] = [];
    const enviar = async (m: Mensagem) => {
      tentativas.push(m.to);
      if (m.to === 'ana@example.test') throw erro;
    };
    await rodar(fila, enviar, { esperasMs: [1] });
    expect(tentativas).toEqual(['ana@example.test', 'bia@example.test']);
    expect(fila.envio(envio.id)).toMatchObject({ status: 'concluido', enviados: 1, falhas: 1 });
  });

  it('falhas ambíguas seguidas pausam o envio', async () => {
    const { fila, envio } = await envioPronto();
    const enviar = async () => {
      throw erroSmtp('Timeout', { code: 'ETIMEDOUT', command: 'CONN' });
    };
    await rodar(fila, enviar);
    expect(fila.envio(envio.id)).toMatchObject({ status: 'pausado', enviados: 0, falhas: 3 });
  });

  it('endereço recusado pelo servidor conta como falha e o envio segue', async () => {
    const { fila, envio } = await envioPronto();
    const c = caixa();
    const enviar = async (m: Mensagem) => {
      if (m.to === 'bia@example.test') throw Object.assign(new Error('não existe'), { code: 'EENVELOPE', responseCode: 550, response: '550 5.1.1 user unknown' });
      await c.enviar(m);
    };
    await rodar(fila, enviar);
    expect(fila.envio(envio.id)).toMatchObject({ status: 'concluido', enviados: 4, falhas: 1 });
  });

  it('cota do Gmail esgotada (550 5.4.5) não queima a lista: pausa', async () => {
    const { fila, envio } = await envioPronto();
    const cota = async () => {
      throw Object.assign(new Error('quota'), { code: 'EENVELOPE', responseCode: 550, response: '550 5.4.5 Daily user sending limit exceeded' });
    };
    await rodar(fila, cota, { esperasMs: [1] });
    expect(fila.envio(envio.id)).toMatchObject({ status: 'pausado', enviados: 0, falhas: 0 });
  });

  it('cancelar para o envio', async () => {
    const { fila, envio } = await envioPronto();
    const c = caixa();
    const enviar = async (m: Mensagem) => {
      await c.enviar(m);
      if (c.recebidos.length === 2) fila.cancelar(envio.id);
    };
    await rodar(fila, enviar);
    expect(c.recebidos).toHaveLength(2);
    expect(fila.envio(envio.id)).toMatchObject({ status: 'cancelado', enviados: 2 });
    await expect(fila.retomar(envio.id)).rejects.toThrow(/cancelado/);
  });

  it('apaga as entregas 30 dias depois do fim e mantém os totais', async () => {
    const { caminho, fila, envio } = await envioPronto();
    await rodar(fila, caixa().enviar);
    const entregas = () => {
      const db = new DatabaseSync(caminho);
      const r = db.prepare('SELECT count(*) AS n FROM avisos_entregas WHERE envio_id = ?').get(envio.id);
      db.close();
      return r;
    };
    agora += 29 * DIA;
    criarFila(caminho, SEGREDO, relogio); // cada execução do comando limpa
    expect(entregas()).toEqual({ n: 5 });
    agora += 2 * DIA;
    const depois = criarFila(caminho, SEGREDO, relogio);
    expect(entregas()).toEqual({ n: 0 });
    expect(depois.envio(envio.id)).toMatchObject({ status: 'concluido', enviados: 5, total_previsto: 5 });
  });

  it('envio pausado e esquecido por 30 dias é cancelado e apagado', async () => {
    const { caminho, fila, envio } = await envioPronto();
    await rodar(fila, caixa().enviar, { tetoDiario: 1 });
    expect(fila.envio(envio.id)!.status).toBe('pausado');
    agora += 31 * DIA;
    const depois = criarFila(caminho, SEGREDO, relogio);
    expect(depois.envio(envio.id)).toMatchObject({ status: 'cancelado', enviados: 1 });
    expect(depois.enviadosUltimas24h()).toBe(0);
    const db = new DatabaseSync(caminho);
    expect(db.prepare('SELECT count(*) AS n FROM avisos_entregas').get()).toEqual({ n: 0 });
    db.close();
  });

  it('as entregas nunca guardam o e-mail', async () => {
    const { caminho, fila, store } = await envioPronto();
    await rodar(fila, caixa().enviar);
    for (const p of PESSOAS) await store.remover(p, new Date()); // sai da tabela inscritos (secure_delete)
    const db = new DatabaseSync(caminho);
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'avisos_%'").all() as { name: string }[];
    const texto = JSON.stringify(tabelas.map((t) => db.prepare(`SELECT * FROM "${t.name}"`).all()));
    db.close();
    for (const p of PESSOAS) {
      expect(texto).not.toContain(p);
      expect(['', '-wal'].some((s) => existsSync(caminho + s) && readFileSync(caminho + s).includes(p))).toBe(false);
    }
  });
});

describe('avisos: remetente', () => {
  afterEach(() => {
    vi.doUnmock('nodemailer');
  });

  async function carregar() {
    vi.resetModules();
    const sendMail = vi.fn();
    const createTransport = vi.fn(() => ({ sendMail }));
    vi.doMock('nodemailer', () => ({ default: { createTransport } }));
    const { criarRemetente } = await import('../src/lib/avisos/remetente');
    const smtp = await import('../src/lib/smtp');
    return { criarRemetente, createTransport, sendMail, EnvioIndisponivel: smtp.EnvioIndisponivel };
  }
  const base = { port: 465, user: 'laesa@example.test', pass: 'x', ambiente: 'development', contato: 'laesa@example.test' };

  it('recusa SMTP real fora de produção, sem criar transporte', async () => {
    const { criarRemetente, createTransport, EnvioIndisponivel: Erro } = await carregar();
    expect(() => criarRemetente({ ...base, host: 'smtp.gmail.com', liberado: false })).toThrow(Erro);
    expect(() => criarRemetente({ ...base, host: 'smtp.gmail.com', liberado: false })).toThrow(/bloqueado em development/);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('SMTP local ou liberado cria o transporte e envia com o remetente da conta', async () => {
    const { criarRemetente, createTransport, sendMail } = await carregar();
    const enviar = criarRemetente({ ...base, host: 'localhost', port: 1025, liberado: false });
    await enviar({ to: 'p@example.test', subject: 's', text: 't', replyTo: 'r@example.test', headers: {} });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'localhost', port: 1025, secure: false }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: { name: 'LAESA', address: 'laesa@example.test' }, to: 'p@example.test' }));
    criarRemetente({ ...base, host: 'smtp.gmail.com', liberado: true });
    expect(createTransport).toHaveBeenCalledTimes(2);
  });

  it('sem usuário ou senha: indisponível', async () => {
    const { criarRemetente } = await carregar();
    expect(() => criarRemetente({ ...base, host: 'localhost', pass: undefined, liberado: false })).toThrow(/SMTP não configurado/);
  });
});


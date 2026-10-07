import { describe, expect, it } from 'vitest';
import { candidatasHome, chaveGrupo, classificar, comparar, hojeEm, normalizar, rotulo, type Datas } from '../src/lib/atividades';

const item = (nome: string, extra: Partial<Datas> = {}): Datas => ({ nome, status: 'auto', ...extra });
const hoje = '2026-10-06';

describe('estado pela data', () => {
  it('futuro é "em breve", ou "inscrições abertas" com link', () => {
    expect(classificar(item('a', { inicio: '2026-10-14' }), hoje)).toBe('breve');
    expect(classificar(item('a', { inicio: '2026-10-14', inscricao: true }), hoje)).toBe('aberto');
  });
  it('no dia e dentro do intervalo é "acontecendo"; depois, concluído', () => {
    expect(classificar(item('a', { inicio: hoje }), hoje)).toBe('acontecendo');
    expect(classificar(item('a', { inicio: '2026-10-01', fim: '2026-10-10' }), hoje)).toBe('acontecendo');
    expect(classificar(item('a', { inicio: '2026-10-02', inscricao: true }), hoje)).toBe('concluido');
  });
  it('status manual vence a data; sem data é concluído', () => {
    expect(classificar(item('a', { status: 'em-andamento', inicio: '2025-01-01' }), hoje)).toBe('andamento');
    expect(classificar(item('a', { status: 'concluido', inicio: '2026-12-01' }), hoje)).toBe('concluido');
    expect(classificar(item('a'), hoje)).toBe('concluido');
  });
});

describe('ordem: mais perto de hoje primeiro, sem misturar passado e futuro', () => {
  it('acontecendo, depois em breve (mais próximo antes), depois passado (mais recente antes), sem data no fim', () => {
    const itens = [
      item('passado antigo', { inicio: '2025-05-25' }),
      item('sem data', { ano: 2024 }),
      item('futuro distante', { inicio: '2026-12-01' }),
      item('passado recente', { inicio: '2026-10-02' }),
      item('projeto', { status: 'em-andamento', inicio: '2026-03-01' }),
      item('futuro próximo', { inicio: '2026-10-08' }),
    ];
    expect(itens.sort(comparar(hoje)).map((i) => i.nome)).toEqual([
      'projeto',
      'futuro próximo',
      'futuro distante',
      'passado recente',
      'passado antigo',
      'sem data',
    ]);
  });
  it('um evento de ontem fica abaixo dos futuros, mesmo mais perto de hoje', () => {
    const itens = [item('ontem', { inicio: '2026-10-05' }), item('daqui a 10 dias', { inicio: '2026-10-16' })];
    expect(itens.sort(comparar(hoje)).map((i) => i.nome)).toEqual(['daqui a 10 dias', 'ontem']);
  });
});

describe('rótulos e grupos', () => {
  it('mostra dia no futuro e mês e ano no passado', () => {
    expect(rotulo('breve', item('a', { inicio: '2026-10-14' }))).toBe('em breve · 14 out 2026');
    expect(rotulo('aberto', item('a', { inicio: '2026-10-14' }))).toBe('inscrições abertas · 14 out 2026');
    expect(rotulo('concluido', item('a', { inicio: '2025-05-25' }))).toBe('concluído · mai 2025');
    expect(rotulo('concluido', item('a', { ano: 2024 }))).toBe('concluído · 2024');
  });
  it('agrupa o que vem em "proximos" e o resto pelo ano', () => {
    expect(chaveGrupo(item('a', { inicio: '2026-11-01' }), hoje)).toBe('proximos');
    expect(chaveGrupo(item('a', { inicio: '2025-11-26' }), hoje)).toBe('2025');
    expect(chaveGrupo(item('a', { inicio: '2025-12-20', fim: '2026-01-10' }), hoje)).toBe('2026');
  });
});

describe('utilitários', () => {
  it('hoje em Teresina, não em UTC', () => {
    // 01:00 UTC do dia 7 ainda é 22:00 do dia 6 em Teresina (UTC-3)
    expect(hojeEm(new Date('2026-10-07T01:00:00Z'))).toBe('2026-10-06');
  });
  it('busca ignora acento e maiúscula', () => {
    expect(normalizar('Extensão em SEGURANÇA')).toBe('extensao em seguranca');
  });
});

describe('candidatas da home', () => {
  it('continuam certas quando o navegador reordena dias depois do build', () => {
    const itens = [
      ...['2026-10-08', '2026-10-20', '2026-11-15'].map((d, i) => item(`futuro ${i}`, { inicio: d })),
      ...['2026-09-01', '2026-08-01', '2026-07-01', '2026-06-01', '2026-05-01', '2026-04-01', '2026-03-01'].map((d, i) =>
        item(`passado ${i}`, { inicio: d }),
      ),
      item('sem data', { ano: 2024 }),
    ];
    const build = '2026-10-06';
    const candidatas = candidatasHome([...itens].sort(comparar(build)), build, 5);
    for (const depois of ['2026-10-07', '2026-10-09', '2026-10-25', '2026-12-31', '2027-06-01']) {
      const certas = [...itens].sort(comparar(depois)).slice(0, 5).map((i) => i.nome);
      const naTela = [...candidatas].sort(comparar(depois)).slice(0, 5).map((i) => i.nome);
      expect(naTela).toEqual(certas);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { dataIso, linkSeguro, periodo, prorrogacao } from '../src/lib/content-helpers';

describe('linkSeguro (links vindos do painel)', () => {
  it('recusa javascript: e endereços que o navegador leva para outro domínio', () => {
    for (const ruim of ['javascript:alert(1)', ' JavaScript:alert(1)', '//x.com', '/\\x.com', '\\\\x.com', '/\t/x.com', '/\n/x.com', 'https:\\\\x.com', 'x.com', 'data:text/html,oi']) {
      expect(linkSeguro(ruim), ruim).toBeUndefined();
    }
  });

  it('aceita caminhos do site, http(s) e mailto', () => {
    expect(linkSeguro('/uploads/a.pdf')).toBe('/uploads/a.pdf');
    expect(linkSeguro(' https://drive.google.com/file/d/1/view?usp=sharing ')).toBe('https://drive.google.com/file/d/1/view?usp=sharing');
    expect(linkSeguro('http://exemplo.com')).toBe('http://exemplo.com');
    expect(linkSeguro('mailto:laesa@exemplo.com')).toBe('mailto:laesa@exemplo.com');
  });

  it('vazio ou não texto vira undefined', () => {
    for (const v of [undefined, null, '', '   ', 42]) expect(linkSeguro(v)).toBeUndefined();
  });
});

describe('periodo (inscrições dos editais)', () => {
  it('mesmo mês, meses diferentes e anos diferentes', () => {
    expect(periodo('2026-10-12', '2026-10-23')).toBe('12 a 23 out 2026');
    expect(periodo('2026-09-28', '2026-10-03')).toBe('28 set a 3 out 2026');
    expect(periodo('2026-12-20', '2027-01-05')).toBe('20 dez 2026 a 5 jan 2027');
  });

  it('sem início (ou início depois do fim) vira "até"; sem fim, nada', () => {
    expect(periodo(undefined, '2026-10-23')).toBe('até 23 out 2026');
    expect(periodo('2026-10-23', '2026-10-23')).toBe('até 23 out 2026');
    expect(periodo('2026-10-12', undefined)).toBeUndefined();
  });
});

describe('dataIso (datas do painel)', () => {
  it('aceita AAAA-MM-DD em texto ou Date (YAML sem aspas)', () => {
    expect(dataIso('2026-10-02')).toBe('2026-10-02');
    expect(dataIso(new Date('2026-10-02T00:00:00Z'))).toBe('2026-10-02');
  });
  it('recusa o resto', () => {
    for (const v of ['02/10/2026', '2026-10-2', '', undefined, 20261002]) expect(dataIso(v)).toBeUndefined();
  });
});

describe('prorrogacao', () => {
  it('só vale se for depois do fim original', () => {
    expect(prorrogacao('2026-10-23', '2026-10-30')).toBe('2026-10-30');
    expect(prorrogacao('2026-10-23', '2026-10-23')).toBeUndefined();
    expect(prorrogacao('2026-10-23', '2026-10-20')).toBeUndefined();
    expect(prorrogacao(undefined, '2026-10-30')).toBe('2026-10-30');
    expect(prorrogacao('2026-10-23', undefined)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { anoDoMandato, dataIso, estatutoPdf, linkedinPerfil, linkSeguro, mandatosPorAno, paragrafos, periodo, prorrogacao, validar } from '../src/lib/content-helpers';

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

describe('linkedinPerfil (LinkedIn de quem foi da Mesa)', () => {
  it('aceita só perfil pessoal em https://(www.)linkedin.com/in/<perfil>', () => {
    for (const bom of [
      'https://www.linkedin.com/in/fulana',
      'https://linkedin.com/in/fulana-silva-123',
      'https://www.linkedin.com/in/fulana/',
      'https://www.linkedin.com/in/jo%C3%A3o-silva',
    ]) {
      expect(linkedinPerfil(bom), bom).toBe(true);
    }
  });

  it('recusa outro esquema, outro host, outra página do LinkedIn e sobras na URL', () => {
    for (const ruim of [
      'http://www.linkedin.com/in/fulana', // sem https
      'javascript:alert(1)//linkedin.com/in/x',
      'https://linkedin.com.evil.com/in/fulana',
      'https://evil.com/linkedin.com/in/fulana',
      'https://www.linkedin.com.br/in/fulana',
      'https://br.linkedin.com/in/fulana',
      'https://user@www.linkedin.com/in/fulana',
      'https://www.linkedin.com/company/laesaicev',
      'https://www.linkedin.com/in/',
      'https://www.linkedin.com/in/fulana/detalhes',
      'https://www.linkedin.com/in/fulana?utm_source=share',
      'https://www.linkedin.com/in/fulana#x',
      'https://www.linkedin.com/in/ful ana',
      ' https://www.linkedin.com/in/fulana',
      'www.linkedin.com/in/fulana',
      '',
    ]) {
      expect(linkedinPerfil(ruim), ruim).toBe(false);
    }
  });
});

describe('estatutoPdf (estatuto em vigor na época do mandato)', () => {
  it('aceita só PDF enviado pelo painel, em /uploads/', () => {
    for (const bom of ['/uploads/mandatos/2027/estatuto.pdf', '/uploads/mandatos/2025/estatuto.PDF', '/uploads/estatuto-2019.pdf']) {
      expect(estatutoPdf(bom), bom).toBe(true);
    }
  });

  it('recusa link externo, outra extensão, caminho fora de /uploads/ e ".."', () => {
    for (const ruim of [
      'https://exemplo.com/estatuto.pdf',
      '//exemplo.com/uploads/estatuto.pdf',
      'javascript:alert(1)//uploads/a.pdf',
      '/uploads/mandatos/2027/estatuto.docx',
      '/uploads/mandatos/2027/estatuto.pdf.html',
      '/uploads/mandatos/2027/estatuto.pdf?x=1',
      '/estatuto.pdf',
      '/editais/estatuto.pdf',
      '/uploads/../keystatic/a.pdf',
      '/uploads/mandatos/../../a.pdf',
      '/uploads/.pdf',
      '/uploads\\mandatos\\a.pdf',
      ' /uploads/mandatos/2027/estatuto.pdf',
      '',
    ]) {
      expect(estatutoPdf(ruim), ruim).toBe(false);
    }
  });
});

describe('mandatos da Mesa', () => {
  it('o nome do arquivo é o ano do mandato', () => {
    expect(anoDoMandato('2026')).toBe('2026');
    for (const ruim of ['mandato-2026', '26', '2026-1', '20266']) {
      expect(() => anoDoMandato(ruim), ruim).toThrow(/content\/mandatos\/.*\.yaml.*ano/);
    }
  });

  it('mais recente primeiro; o atual é o de maior ano', () => {
    const r = mandatosPorAno([{ ano: '2024' }, { ano: '2026' }, { ano: '2025' }]);
    expect(r).toEqual([
      { ano: '2026', atual: true },
      { ano: '2025', atual: false },
      { ano: '2024', atual: false },
    ]);
  });

  it('um mandato só é o atual; nenhum mandato é erro', () => {
    expect(mandatosPorAno([{ ano: '2026' }])).toEqual([{ ano: '2026', atual: true }]);
    expect(() => mandatosPorAno([])).toThrow(/content\/mandatos/);
  });
});

describe('paragrafos (texto da história)', () => {
  it('linha em branco separa parágrafos; quebra simples e espaços sobrando não', () => {
    expect(paragrafos('Primeiro\ncontinua.\n\n  \nSegundo. \n')).toEqual(['Primeiro\ncontinua.', 'Segundo.']);
    expect(paragrafos('')).toEqual([]);
    expect(paragrafos(null)).toEqual([]);
  });
});

describe('validar (YAML do painel no build)', () => {
  const schema = z.strictObject({ titulo: z.string(), cronograma: z.array(z.strictObject({ etapa: z.string(), quando: z.string() })).nullish() });

  it('devolve os dados quando estão certos', () => {
    expect(validar(schema, '/content/editais/x.yaml', { titulo: 'Edital', cronograma: null })).toEqual({ titulo: 'Edital', cronograma: null });
  });

  it('campo faltando ou renomeado: erro com o arquivo e o campo', () => {
    const erro = () => validar(schema, '/content/editais/x.yaml', { tituloNovo: 'Edital', cronograma: [{ etapa: 'Entrevistas', quando: 3 }] });
    expect(erro).toThrow(/content\/editais\/x\.yaml/);
    expect(erro).toThrow(/titulo: campo obrigatório ausente/);
    expect(erro).toThrow(/campo desconhecido "tituloNovo"/);
    expect(erro).toThrow(/cronograma\.0\.quando: /);
  });
});

it('o conteúdo atual (content/) passa na validação', async () => {
  await expect(import('../src/lib/content')).resolves.toBeTruthy();
});

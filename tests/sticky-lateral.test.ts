import { describe, expect, it } from 'vitest';
import { topoSticky } from '../src/scripts/sticky-lateral';

describe('topoSticky', () => {
  it('elemento que cabe na janela fica a 24px do topo', () => {
    expect(topoSticky(1080, 600)).toBe(24);
  });

  it('elemento que cabe no limite (com 24px em cima e embaixo) continua a 24px', () => {
    expect(topoSticky(800, 752)).toBe(24);
  });

  it('elemento mais alto que a janela fica preso pela base, 24px acima do fim', () => {
    // formulário de propor projeto com erros (~941px) numa janela de notebook (800px)
    expect(topoSticky(800, 941)).toBe(800 - 941 - 24);
  });

  it('com header fixo, o elemento que cabe fica 24px abaixo do header', () => {
    expect(topoSticky(1080, 600, 80)).toBe(80 + 24);
  });

  it('com header fixo, o elemento que só cabe sem o header fica preso pela base', () => {
    // 900 - 800 - 24 = 76: acima de 104 (header + 24), então quem manda é a base
    expect(topoSticky(900, 800, 80)).toBe(900 - 800 - 24);
  });
});

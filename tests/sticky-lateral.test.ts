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
});

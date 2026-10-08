import { describe, expect, it } from 'vitest';
import { gerarToken, lerToken, inscricaoSchema, confirmar, descadastrar, inscritos } from '../src/lib/inscricao';
import { criarLimite, chaveIp } from '../src/lib/rate-limit';

describe('links assinados da inscrição', () => {
  it('ida e volta', () => {
    expect(lerToken(gerarToken('a@b.com', 'confirmar'), 'confirmar')?.email).toBe('a@b.com');
    expect(lerToken(gerarToken('a@b.com', 'sair'), 'sair')?.email).toBe('a@b.com');
  });
  it('recusa assinatura adulterada, ação trocada e link vencido', () => {
    const t = gerarToken('a@b.com', 'confirmar');
    expect(lerToken(t.slice(0, -2) + 'xx', 'confirmar')).toBeNull();
    expect(lerToken(t, 'sair')).toBeNull();
    const oito = 8 * 24 * 60 * 60 * 1000;
    expect(lerToken(gerarToken('a@b.com', 'confirmar', 0), 'confirmar', oito)).toBeNull();
  });
  it('exige consentimento e normaliza o e-mail', () => {
    expect(inscricaoSchema.safeParse({ email: 'A@B.com' }).success).toBe(false);
    expect(inscricaoSchema.parse({ email: ' A@B.com ', consentimento: 'true' }).email).toBe('a@b.com');
  });
});

describe('confirmar e descadastrar', () => {
  it('confirma, descadastra e não reinscreve com o link antigo', async () => {
    const email = 'fluxo@exemplo.com';
    const linkAntigo = gerarToken(email, 'confirmar', Date.now() - 1000);
    expect(await confirmar(linkAntigo)).toBe(true);
    expect(await inscritos().listar()).toContain(email);
    expect(await descadastrar(gerarToken(email, 'sair'))).toBe(true);
    expect(await inscritos().listar()).not.toContain(email);
    expect(await confirmar(linkAntigo)).toBe(false);
    expect(await confirmar(gerarToken(email, 'confirmar', Date.now() + 1))).toBe(true);
  });
});

describe('limite por IP', () => {
  it('libera até o máximo e reabre depois da janela', () => {
    const ok = criarLimite(2, 1000);
    expect([ok('ip', 0), ok('ip', 10), ok('ip', 20)]).toEqual([true, true, false]);
    expect(ok('outro', 20)).toBe(true);
    expect(ok('ip', 1500)).toBe(true);
  });
  it('devolver libera de novo a última vaga, mesmo com tentativas barradas no meio', () => {
    const ok = criarLimite(1, 1000);
    expect([ok('a', 0), ok('a', 1), ok('a', 2)]).toEqual([true, false, false]);
    ok.devolver('a');
    expect([ok('a', 3), ok('a', 4)]).toEqual([true, false]);
  });
  it('IPv6 agrupado por /64', () => {
    expect(chaveIp('2804:14c:1:2:aaaa::1')).toBe(chaveIp('2804:14c:1:2:bbbb::9'));
    expect(chaveIp('200.1.2.3')).toBe('200.1.2.3');
  });
  it('IPv6 comprimido cai no mesmo /64 que a forma expandida', () => {
    const chave = chaveIp('2001:db8:0:0:5:6:7:8');
    expect(chaveIp('2001:db8::1:2:3:4')).toBe(chave);
    expect(chaveIp('2001:DB8:0000::9')).toBe(chave);
    expect(chaveIp('2001:db8::1%eth0')).toBe(chave);
    expect(chaveIp('2001:db8:0:1::1')).not.toBe(chave);
    expect(chaveIp('::1')).toBe(chaveIp('0:0:0:0:0:0:0:1'));
  });
  it('IPv4 mapeado em IPv6 vira o próprio IPv4', () => {
    expect(chaveIp('::ffff:1.2.3.4')).toBe('1.2.3.4');
    expect(chaveIp('::FFFF:102:304')).toBe('1.2.3.4');
  });
});

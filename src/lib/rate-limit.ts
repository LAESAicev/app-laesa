import { isIP } from 'node:net';

// Limite por chave (IP ou e-mail), em memória: um único contêiner, e o reinício zera.
// Teto rígido de chaves: com IPs forjados o mapa não cresce sem limite (descarta as mais antigas).
type Janela = { inicio: number; total: number };
const TETO = 10_000;

export function criarLimite(max: number, janelaMs: number) {
  const janelas = new Map<string, Janela>();
  function permitido(chave: string, agora = Date.now()): boolean {
    const j = janelas.get(chave);
    if (!j || agora - j.inicio > janelaMs) {
      janelas.delete(chave);
      janelas.set(chave, { inicio: agora, total: 1 });
      while (janelas.size > TETO) janelas.delete(janelas.keys().next().value!);
      return true;
    }
    if (j.total >= max) return false; // tentativa barrada não conta: devolver() libera exatamente uma vaga
    j.total += 1;
    return true;
  }
  /** Devolve a vaga consumida por um permitido() que acabou não sendo usado (ex.: o envio falhou). */
  function devolver(chave: string): void {
    const j = janelas.get(chave);
    if (j && j.total > 0) j.total -= 1;
  }
  return Object.assign(permitido, { devolver });
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

/** Em desenvolvimento, o próprio computador não entra no limite (testes e uso local compartilham o IP). */
export function isentoLocal(ip: string | undefined): boolean {
  return import.meta.env.DEV && !!ip && LOOPBACK.has(ip);
}

/** Os 8 grupos de 16 bits de um IPv6 válido: expande o "::" e um IPv4 no fim (::ffff:1.2.3.4). */
function gruposIpv6(ip: string): number[] {
  const grupos = (s: string | undefined) =>
    (s ? s.split(':') : []).flatMap((g) => {
      if (!g.includes('.')) return [parseInt(g, 16)];
      const [a, b, c, d] = g.split('.').map(Number);
      return [a * 256 + b, c * 256 + d];
    });
  const [inicio, fim] = ip.split('::');
  const a = grupos(inicio);
  const b = grupos(fim);
  return [...a, ...Array<number>(8 - a.length - b.length).fill(0), ...b];
}

/** IPv6 agrupado por /64 (uma pessoa costuma ter o prefixo inteiro); IPv4 inteiro, inclusive o mapeado em IPv6. */
export function chaveIp(ip: string | undefined): string {
  if (!ip) return 'desconhecido';
  const semZona = ip.split('%')[0]; // fe80::1%eth0
  if (isIP(semZona) !== 6) return ip;
  const g = gruposIpv6(semZona);
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return [g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255].join('.');
  return g.slice(0, 4).map((x) => x.toString(16)).join(':') + '::/64';
}

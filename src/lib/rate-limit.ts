// Limite por chave (IP ou e-mail), em memória: um único contêiner, e o reinício zera.
// Teto rígido de chaves: com IPs forjados o mapa não cresce sem limite (descarta as mais antigas).
type Janela = { inicio: number; total: number };
const TETO = 10_000;

export function criarLimite(max: number, janelaMs: number) {
  const janelas = new Map<string, Janela>();
  return function permitido(chave: string, agora = Date.now()): boolean {
    const j = janelas.get(chave);
    if (!j || agora - j.inicio > janelaMs) {
      janelas.delete(chave);
      janelas.set(chave, { inicio: agora, total: 1 });
      while (janelas.size > TETO) janelas.delete(janelas.keys().next().value!);
      return true;
    }
    j.total += 1;
    return j.total <= max;
  };
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

/** Em desenvolvimento, o próprio computador não entra no limite (testes e uso local compartilham o IP). */
export function isentoLocal(ip: string | undefined): boolean {
  return import.meta.env.DEV && !!ip && LOOPBACK.has(ip);
}

/** IPv6 agrupado por /64 (uma pessoa costuma ter o prefixo inteiro); IPv4 inteiro. */
export function chaveIp(ip: string | undefined): string {
  if (!ip) return 'desconhecido';
  if (!ip.includes(':')) return ip;
  return ip.split(':').slice(0, 4).join(':') + '::/64';
}

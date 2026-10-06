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

/** IPv6 agrupado por /64 (uma pessoa costuma ter o prefixo inteiro); IPv4 inteiro. */
export function chaveIp(ip: string | undefined): string {
  if (!ip) return 'desconhecido';
  if (!ip.includes(':')) return ip;
  return ip.split(':').slice(0, 4).join(':') + '::/64';
}

// Tipos e estrutura fixa do site. O conteúdo editável (status, canais, estatuto) vem de content/site.yaml
// via src/lib/content.ts. `exemplo: true` marca conteúdo provisório (selo tracejado).

export type StatusSelecao = 'aberto' | 'em-andamento' | 'finalizado';

export const navLinks = [
  { href: '/#sobre', label: 'Sobre', key: 'sobre' },
  { href: '/#como-funciona', label: 'Como funcionamos', key: 'como' },
  { href: '/#projetos', label: 'Projetos', key: 'projetos' },
  { href: '/#diretoria', label: 'Diretoria', key: 'diretoria' },
  { href: '/processos-seletivos', label: 'Processos seletivos', key: 'processos' },
  { href: '/contato', label: 'Contato', key: 'contato' },
] as const;

export type NavKey = (typeof navLinks)[number]['key'];

export type Canal = { icon: 'mail' | 'instagram' | 'linkedin' | 'github'; rotulo: string; valor: string; href: string; exemplo?: boolean };


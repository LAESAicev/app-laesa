// Conteúdo do site. Na Fase 2 estes arquivos viram YAML em content/, editáveis pelo painel (ADR 0001).
// `exemplo: true` marca conteúdo provisório: a página mostra o selo tracejado até a LAESA enviar o real.

export type StatusSelecao = 'aberto' | 'em-andamento' | 'finalizado';

export const selecao: { status: StatusSelecao; editalAtual: string } = {
  status: 'aberto',
  editalAtual: '2026-2',
};

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

export const canais: Canal[] = [
  { icon: 'mail', rotulo: 'E-mail', valor: 'contato@laesa.com.br', href: 'mailto:contato@laesa.com.br', exemplo: true },
  { icon: 'instagram', rotulo: 'Instagram', valor: '@laesa.icev', href: '#', exemplo: true },
  { icon: 'linkedin', rotulo: 'LinkedIn', valor: 'LAESA', href: '#', exemplo: true },
  { icon: 'github', rotulo: 'GitHub', valor: 'github.com/laesa', href: '#', exemplo: true },
];

export const estatutoUrl = '#'; // PDF público do estatuto: a definir

// Conteúdo fixo, tirado do estatuto (não editável pelo painel), e tipos do conteúdo editável.
// Hero, projetos e Mesa vêm de content/ via src/lib/content.ts.
import type { Datas, Eixo } from '../lib/atividades';

export type Commit = { mensagem: string; hash: string; meta?: string };


export const eixos = [
  { titulo: 'Ensino', texto: 'Trilhas, oficinas e minicursos para os membros, e membros que ensinam outros estudantes.', ref: 'Art. 3º § 1º' },
  { titulo: 'Pesquisa', texto: 'Projetos científicos e tecnológicos que viram artigos, resumos e relatórios técnicos.', ref: 'Art. 3º § 2º' },
  { titulo: 'Extensão', texto: 'Palestras, jornadas e eventos abertos, e parcerias com instituições e organizações.', ref: 'Art. 3º § 3º' },
  { titulo: 'Projetos', texto: 'Software para demandas reais da sociedade, feito em Squads interdisciplinares.', ref: 'Art. 3º § 4º' },
];

export const areas = [
  'Desenvolvimento de sistemas',
  'Qualidade e testes',
  'Arquitetura',
  'Gestão de projetos',
  'Inteligência artificial',
  'Segurança da informação',
  'Experiência do usuário',
];

export const sprint = [
  { titulo: 'Reunião geral abre a Sprint', texto: 'Pauta, metas e responsáveis definidos com toda a liga, com ata preenchida pela Vice-Presidência.' },
  { titulo: 'Squads tocam as entregas', texto: 'Membros são distribuídos por competência e disponibilidade, cada Squad com uma liderança indicada pela Mesa Diretora.' },
  { titulo: 'Reunião geral fecha a Sprint', texto: 'O que cada Squad e cada membro entregou entra na ata da Sprint.' },
  { titulo: 'Atas viram certificado', texto: 'As atas são compiladas para validar a participação de cada membro e emitir o certificado.' },
];

export type Regra = { texto: string; ref: string; valor: string; unidade?: string; check?: boolean };

export const regrasPublicas: Regra[] = [
  { texto: 'Frequência mínima nas atividades obrigatórias', ref: 'Art. 11º', valor: '75%' },
  { texto: 'Certificado de membro efetivo, por semestre', ref: 'Art. 26º § 2º', valor: '45', unidade: 'horas' },
  { texto: 'Certificado da Mesa Diretora', ref: 'Art. 26º § 2º', valor: '60', unidade: 'horas' },
  { texto: 'Membros na liga, no máximo', ref: 'Art. 53º', valor: '15' },
  { texto: 'Mandato da Mesa Diretora', ref: 'Art. 43º e 49º', valor: '2', unidade: 'semestres' },
];

/** Item da lista de atividades e projetos (content/projetos, src/lib/content.ts). */
export type Atividade = Datas & {
  slug: string;
  descricao: string;
  tags: string[];
  eixos: Eixo[];
  link?: string;
  linkInscricao?: string;
  /** Pode aparecer na home (as N mais perto de hoje). */
  destaque: boolean;
  exemplo?: boolean;
};


export type Pessoa = { nome: string; cargo: string; foto?: string; orientacao?: boolean; exemplo?: boolean };


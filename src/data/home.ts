export type Commit = { mensagem: string; hash: string; meta?: string };

/** Painel "git log" do hero. O primeiro item é o HEAD. */
export const heroLog: Commit[] = [
  { mensagem: 'Processo seletivo 2026.2 aberto', hash: 'e7c41a0', meta: 'inscrições até [data]' },
  { mensagem: 'Novo estatuto da liga publicado', hash: '3d8f512', meta: '02 jun 2026' },
  { mensagem: 'Mesa Diretora: Presidência, Vice e Projetos', hash: 'b51e9c7', meta: '2026' },
  { mensagem: 'Quatro eixos: ensino, pesquisa, extensão e projetos', hash: 'c94e0aa' },
  { mensagem: 'Sprints e Squads como método de trabalho', hash: '7be21d4' },
  { mensagem: 'LAESA fundada por alunos do iCEV', hash: 'a1f3c09', meta: '2023 · Teresina (PI)' },
];

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

export type Projeto = {
  nome: string;
  descricao: string;
  tags: string[];
  status: 'concluido' | 'em-andamento';
  ano?: number;
  link?: string;
  exemplo?: boolean;
};

export const projetos: Projeto[] = [
  { nome: 'Nome do projeto', descricao: 'Descrição curta: para quem foi feito, qual problema resolveu e o que o Squad entregou. Duas ou três linhas bastam.', tags: ['Projeto social', 'Web'], status: 'concluido', ano: 2025, exemplo: true },
  { nome: 'Nome da pesquisa', descricao: 'Pergunta de pesquisa, método e resultado. Se virou artigo, resumo ou apresentação em evento, o link entra aqui.', tags: ['Pesquisa', 'Qualidade de software'], status: 'em-andamento', exemplo: true },
  { nome: 'Nome da oficina', descricao: 'Atividade aberta à comunidade: tema, público atendido e quantas edições já aconteceram.', tags: ['Extensão', 'Ensino'], status: 'concluido', ano: 2024, exemplo: true },
];

export type Pessoa = { nome: string; cargo: string; foto?: string; orientacao?: boolean; exemplo?: boolean };

export const mesa: Pessoa[] = [
  { nome: 'Felipe Duan da Silva Sousa', cargo: 'Presidente' },
  { nome: 'Nome a confirmar', cargo: 'Vice-Presidente', exemplo: true },
  { nome: 'Nome a confirmar', cargo: 'Diretor(a) de Projetos', exemplo: true },
  { nome: 'Nome a confirmar', cargo: 'Professor(a) Orientador(a)', orientacao: true, exemplo: true },
];

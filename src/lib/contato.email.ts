// Texto do e-mail que chega na caixa da LAESA para cada mensagem do formulário.
import { rotuloAssunto, rotuloValor, type Contato } from './contato.schema';

const rotulos: Record<string, string> = {
  nome: 'Nome',
  email: 'E-mail',
  atividade: 'Atividade',
  organizacao: 'Organização',
  tipoProjeto: 'Tipo de projeto',
  prazo: 'Prazo desejado',
  formaColaboracao: 'Forma de colaboração',
  area: 'Área de atuação',
  link: 'LinkedIn/portfólio',
};

export function montarEmailContato(c: Contato, para: string) {
  const quemCompleto = c.assunto === 'projeto' ? c.organizacao : c.nome ?? 'anônimo';
  const quem = quemCompleto.length > 60 ? `${quemCompleto.slice(0, 59)}…` : quemCompleto;
  const linhas = Object.entries(rotulos)
    .filter(([k]) => (c as Record<string, unknown>)[k])
    .map(([k, r]) => {
      const v = String((c as Record<string, unknown>)[k]);
      return `${r}: ${rotuloValor[v] ?? v}`;
    });
  if (c.assunto === 'feedback' && c.anonimo) linhas.push('Enviado sem identificação: não há como responder.');
  return {
    to: para,
    subject: `[${rotuloAssunto[c.assunto]}] ${quem}`,
    replyTo: c.email,
    text: [...linhas, '', c.mensagem, '', '— Enviado pelo formulário de contato do site da LAESA'].join('\n'),
  };
}

import { describe, expect, it } from 'vitest';
import { validarContato } from '../src/lib/contato.schema';

const base = { nome: 'Ana Lima', email: 'ana@exemplo.com', mensagem: 'Mensagem com tamanho suficiente.' };

describe('validarContato', () => {
  it('aceita os quatro assuntos com os campos certos', () => {
    expect(validarContato({ ...base, assunto: 'duvida' }).ok).toBe(true);
    expect(validarContato({ ...base, assunto: 'feedback', atividade: 'oficina' }).ok).toBe(true);
    expect(validarContato({ ...base, assunto: 'projeto', organizacao: 'Bairro Vivo', tipoProjeto: 'aplicativo' }).ok).toBe(true);
    expect(validarContato({ ...base, assunto: 'colaborar', formaColaboracao: 'mentoria', area: 'Arquitetura' }).ok).toBe(true);
  });

  it('formulário vazio aponta todos os campos que faltam', () => {
    const r = validarContato({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(['assunto', 'email', 'mensagem', 'nome']);
  });

  it('e-mail incompleto vira mensagem que diz como corrigir', () => {
    const r = validarContato({ ...base, assunto: 'duvida', email: 'ana@gmail' });
    expect(r.ok || r.erros.email).toMatch(/nome@exemplo\.com/);
  });

  it('feedback anônimo dispensa e descarta nome e e-mail', () => {
    const r = validarContato({ assunto: 'feedback', anonimo: 'true', nome: 'Ana', email: 'ana@x.com', mensagem: base.mensagem });
    expect(r.ok && r.data).toMatchObject({ anonimo: true, nome: undefined, email: undefined });
  });

  it('"false" não conta como anônimo', () => {
    const r = validarContato({ assunto: 'feedback', anonimo: 'false', mensagem: base.mensagem });
    expect(r.ok).toBe(false);
  });

  it('projeto exige organização e tipo', () => {
    const r = validarContato({ ...base, assunto: 'projeto', tipoProjeto: '' });
    expect(!r.ok && Object.keys(r.erros).sort()).toEqual(['organizacao', 'tipoProjeto']);
  });

  it('atividade fora da lista vira erro, não é descartada', () => {
    const r = validarContato({ ...base, assunto: 'feedback', atividade: 'festa' });
    expect(!r.ok && r.erros.atividade).toBe('Escolha uma atividade da lista.');
  });

  it('mensagem só com espaços e textos acima do limite são recusados', () => {
    const vazio = validarContato({ ...base, assunto: 'duvida', mensagem: '      ' });
    expect(!vazio.ok && vazio.erros.mensagem).toBeTruthy();
    const longo = validarContato({ ...base, assunto: 'duvida', mensagem: 'x'.repeat(4001) });
    expect(!longo.ok && longo.erros.mensagem).toMatch(/4000/);
  });

  it('colaborar sem forma e área aponta os dois campos', () => {
    const r = validarContato({ ...base, assunto: 'colaborar' });
    expect(!r.ok && Object.keys(r.erros).sort()).toEqual(['area', 'formaColaboracao']);
  });

  it('feedback identificado com e-mail inválido é recusado', () => {
    const r = validarContato({ ...base, assunto: 'feedback', email: 'ana@' });
    expect(!r.ok && r.erros.email).toMatch(/nome@exemplo/);
  });

  it('link sem https:// é completado', () => {
    const r = validarContato({ ...base, assunto: 'colaborar', formaColaboracao: 'palestra', area: 'IA', link: 'linkedin.com/in/ana' });
    expect(r.ok && r.data).toMatchObject({ link: 'https://linkedin.com/in/ana' });
  });
});

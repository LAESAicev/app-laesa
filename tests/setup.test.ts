import { describe, expect, it } from 'vitest';
import nodemailer from 'nodemailer';

describe('rede de segurança dos testes (tests/setup.ts)', () => {
  it('nodemailer sem mock próprio lança em vez de enviar', () => {
    expect(() => nodemailer.createTransport({ host: 'smtp.gmail.com' })).toThrow(/bloqueado nos testes/);
  });
});

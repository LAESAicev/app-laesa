// Rede de segurança: teste que chegue ao nodemailer sem mock próprio falha em vez de tentar enviar e-mail.
import { vi } from 'vitest';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => {
      throw new Error('nodemailer bloqueado nos testes: mocke o envio (vi.mock) no próprio teste.');
    },
  },
}));

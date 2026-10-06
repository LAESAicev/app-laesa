/// <reference types="vitest/config" />
// Usa a config do Astro (resolve astro:env, astro/zod etc.). As variáveis de teste entram em process.env
// ANTES de carregar o Astro: o astro:env lê do ambiente, não do `test.env` do Vitest. Assim os testes
// não dependem do .env local (no CI ele não existe).
import { getViteConfig } from 'astro/config';

const variaveisDeTeste = {
  PUBLIC_CONTACT_EMAIL: 'laesa@somosicev.com',
  SMTP_USER: 'laesa@somosicev.com',
  SMTP_PASS: 'teste',
  INSCRICAO_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres',
  INSCRITOS_STORE: 'memoria',
};
Object.assign(process.env, variaveisDeTeste);

export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: variaveisDeTeste,
  },
});

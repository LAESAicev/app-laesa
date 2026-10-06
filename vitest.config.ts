/// <reference types="vitest/config" />
// Usa a config do Astro (resolve astro:env, astro/zod etc.). Variáveis fixas para os testes não dependerem do .env.
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      PUBLIC_CONTACT_EMAIL: 'laesa@somosicev.com',
      SMTP_USER: 'laesa@somosicev.com',
      SMTP_PASS: 'teste',
      INSCRICAO_SECRET: 'segredo-de-teste',
      INSCRITOS_STORE: 'memoria',
    },
  },
});

// @ts-check
import { defineConfig } from 'astro/config';

// Domínio definitivo pendente de resposta do iCEV (ADR 0001).
export default defineConfig({
  site: 'https://laesa.icev.edu.br',
  trailingSlash: 'never',
  build: { format: 'file' },
});

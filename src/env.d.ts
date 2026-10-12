declare namespace App {
  interface Locals {
    /** Quem está na tela de avisos (src/middleware.ts): só em /mesa/*, fora de /mesa/entrar. Nome declarado no login. */
    mesa?: { nome: string };
  }
}

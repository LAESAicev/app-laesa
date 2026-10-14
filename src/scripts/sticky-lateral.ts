// .sticky-lateral mais alta que a janela (src/styles/global.css): o CSS sozinho prende o topo 24px abaixo do header
// fixo e o fim do elemento só aparece quando a grade acaba. Aqui o `top` diminui (até negativo) nesse caso, e o
// elemento fica preso pela base, 24px acima do fim da janela (o botão Enviar do formulário sempre visível).
// Sem JS, vale o top do CSS.

const RESPIRO = 24; // o mesmo respiro do scroll-padding-top, contado a partir do header

/**
 * Distância do topo da janela em que o elemento fica preso: logo abaixo do header (header + 24px) se couber,
 * senão o necessário para a base caber 24px acima do fim da janela.
 */
export function topoSticky(janela: number, altura: number, header = 0, respiro = RESPIRO): number {
  return Math.min(header + respiro, janela - altura - respiro);
}

export function iniciarStickyLateral() {
  const els = [...document.querySelectorAll<HTMLElement>('.sticky-lateral')];
  if (!els.length) return;
  // clientHeight é a área visível sem a barra de rolagem horizontal, que é a referência do sticky
  const ajustar = (el: HTMLElement) => {
    const header = document.querySelector<HTMLElement>('.nav')?.offsetHeight ?? 0;
    el.style.top = `${topoSticky(document.documentElement.clientHeight, el.offsetHeight, header)}px`;
  };
  // troca de assunto, campos de "propor projeto", mensagens de erro, textarea redimensionada
  const ro = new ResizeObserver((entradas) => entradas.forEach((e) => ajustar(e.target as HTMLElement)));
  els.forEach((el) => ro.observe(el));
  window.addEventListener('resize', () => els.forEach(ajustar));
}

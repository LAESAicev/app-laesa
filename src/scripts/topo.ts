// Botão "Voltar ao topo" (BaseLayout). Aparece depois de ~1 tela de rolagem e some enquanto houver um controle
// (botão, campo, tag) embaixo dele, para nunca cobrir o Enviar do formulário nem um CTA no celular.
// Ao clicar, rola até o topo (suave, ou instantâneo com movimento reduzido: o html já troca o scroll-behavior)
// e leva o foco para o header, para o próximo Tab começar do logo.

const botao = document.querySelector<HTMLButtonElement>('.topo');
const header = document.querySelector<HTMLElement>('.nav');
const CONTROLES = 'a.btn, button, input, select, textarea, .tag-open, .check';

/** Algum controle da página está embaixo do botão? Confere os quatro cantos e o centro. */
function cobreControle(b: HTMLElement): boolean {
  const r = b.getBoundingClientRect();
  const pontos: [number, number][] = [
    [r.left, r.top], [r.right - 1, r.top], [r.left, r.bottom - 1], [r.right - 1, r.bottom - 1],
    [r.left + r.width / 2, r.top + r.height / 2],
  ];
  return pontos.some(([x, y]) =>
    document.elementsFromPoint(x, y).some((el) => el !== b && !b.contains(el) && el.closest(CONTROLES)),
  );
}

if (botao && header) {
  let agendado = false;
  const atualizar = () => {
    agendado = false;
    const visivel = window.scrollY > window.innerHeight && !cobreControle(botao);
    botao.toggleAttribute('data-visivel', visivel);
  };
  const agendar = () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(atualizar);
  };
  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  atualizar();

  botao.addEventListener('click', () => {
    header.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  });
}

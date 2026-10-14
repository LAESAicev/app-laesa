// A linha de commit (design/MOTION.md).
// - Nós viram "commit" quando a agulha (40% da viewport) passa pelo centro deles; anel só na descida.
// - Ramos do hero (.branches .branch) seguem a mesma regra no ponto onde saem da espinha (início do traço).
// - Preenchimento da linha: CSS scroll-driven onde suportado; senão este script escreve --p (0–1).
// - Energia: duração proporcional à altura da seção (velocidade constante); só anima seções visíveis.

const NEEDLE = 0.4;
const ENERGY_SPEED = 420; // px por segundo
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const nativeFill = CSS.supports('animation-timeline: view()');

const fills = [...document.querySelectorAll<HTMLElement>('.spine-fill')];
const nodes = [...document.querySelectorAll<HTMLElement>('.node:not(.head)')];
const branches = [...document.querySelectorAll<HTMLElement>('.branches .branch')];

/** Y (na viewport) de onde o ramo sai da espinha: início do traço do SVG visível (desktop ou mobile). */
function branchOrigin(branch: HTMLElement): number {
  const path = [...branch.querySelectorAll('svg')].find((svg) => svg.getClientRects().length)?.querySelector('path');
  const m = path?.getScreenCTM();
  if (!path || !m) return Infinity;
  return path.getPointAtLength(0).y * m.d + m.f;
}

let firstRun = true;
let scheduled = false;

function update() {
  scheduled = false;
  const needle = window.innerHeight * NEEDLE;

  if (!nativeFill) {
    for (const fill of fills) {
      const r = fill.getBoundingClientRect();
      const p = r.height > 0 ? Math.min(1, Math.max(0, (needle - r.top) / r.height)) : 0;
      fill.style.setProperty('--p', p.toFixed(4));
    }
  }

  for (const node of nodes) {
    const r = node.getBoundingClientRect();
    commit(node, r.top + r.height / 2 <= needle);
  }
  for (const branch of branches) commit(branch, branchOrigin(branch) <= needle);
  firstRun = false;
}

function commit(el: HTMLElement, committed: boolean) {
  const was = el.dataset.state === 'committed';
  if (committed === was && el.dataset.state) return;
  el.dataset.state = committed ? 'committed' : 'pending';
  if (!committed) el.classList.remove('ring'); // subindo: sem anel
  // Na carga, o que já está acima da agulha entra preenchido sem anel; depois, anel só ao descer.
  if (committed && !firstRun && !reduceMotion.matches) {
    el.classList.remove('ring');
    void el.offsetWidth; // reinicia a animação se for commitado de novo
    el.classList.add('ring');
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(update);
}

for (const el of [...nodes, ...branches]) {
  // nos ramos, o desenho da carga também dispara animationend (borbulha do SVG)
  el.addEventListener('animationend', (e) => e.animationName === 'node-ring' && el.classList.remove('ring'));
}

function sizeEnergy() {
  for (const fill of fills) {
    const seconds = Math.max(1.6, fill.offsetHeight / ENERGY_SPEED);
    fill.style.setProperty('--energy-dur', `${seconds.toFixed(2)}s`);
  }
}

const visibility = new IntersectionObserver((entries) => {
  for (const e of entries) e.target.classList.toggle('is-active', e.isIntersecting);
});
[...fills, ...branches].forEach((el) => visibility.observe(el));

window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', () => {
  sizeEnergy();
  schedule();
});
sizeEnergy();
update();

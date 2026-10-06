// A linha de commit (design/MOTION.md).
// - Nós viram "commit" quando a agulha (40% da viewport) passa pelo centro deles; anel só na descida.
// - Preenchimento da linha: CSS scroll-driven onde suportado; senão este script escreve --p (0–1).
// - Energia: duração proporcional à altura da seção (velocidade constante); só anima seções visíveis.

const NEEDLE = 0.4;
const ENERGY_SPEED = 420; // px por segundo
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const nativeFill = CSS.supports('animation-timeline: view()');

const fills = [...document.querySelectorAll<HTMLElement>('.spine-fill')];
const nodes = [...document.querySelectorAll<HTMLElement>('.node:not(.head)')];

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
    const committed = r.top + r.height / 2 <= needle;
    const was = node.dataset.state === 'committed';
    if (committed === was && node.dataset.state) continue;
    node.dataset.state = committed ? 'committed' : 'pending';
    if (!committed) node.classList.remove('ring'); // subindo: sem anel
    // Na carga, nós já acima da agulha entram preenchidos sem anel; depois, anel só ao descer.
    if (committed && !firstRun && !reduceMotion.matches) {
      node.classList.remove('ring');
      void node.offsetWidth; // reinicia a animação se o nó for commitado de novo
      node.classList.add('ring');
    }
  }
  firstRun = false;
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(update);
}

for (const node of nodes) {
  node.addEventListener('animationend', () => node.classList.remove('ring'));
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
fills.forEach((f) => visibility.observe(f));

window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', () => {
  sizeEnergy();
  schedule();
});
sizeEnergy();
update();

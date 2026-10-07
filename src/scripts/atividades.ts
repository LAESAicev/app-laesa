// Recalcula, com a data de hoje, a ordem, o estado e os grupos das listas de atividades geradas no build
// (src/components/ListaAtividades.astro), e liga a busca da página /atividades. Mesmas funções do build.
import {
  chaveGrupo,
  classeStatus,
  classificar,
  comparar,
  hojeEm,
  nomeGrupo,
  normalizar,
  rotulo,
  type Datas,
  type StatusManual,
} from '../lib/atividades';

type Item = Datas & { el: HTMLElement; eixos: string[]; busca: string };

const contaTexto = (n: number) => (n === 1 ? '1 atividade' : `${n} atividades`);

function ler(el: HTMLElement): Item {
  const d = el.dataset;
  return {
    el,
    nome: d.nome ?? '',
    inicio: d.inicio || undefined,
    fim: d.fim || undefined,
    ano: d.ano ? Number(d.ano) : undefined,
    status: (d.status as StatusManual) ?? 'auto',
    inscricao: d.inscricao != null,
    ordem: d.ordem ? Number(d.ordem) : 10,
    eixos: (d.eixos ?? '').split(' ').filter(Boolean),
    busca: d.busca ?? '',
  };
}

function grupoEl(chave: string): HTMLElement {
  const h = document.createElement('h2');
  h.className = 'proj-grupo';
  h.dataset.grupo = chave;
  const nome = document.createElement('span');
  nome.className = 'proj-grupo-nome';
  nome.textContent = nomeGrupo(chave);
  const sep = document.createElement('span');
  sep.className = 'sr-only';
  sep.textContent = ', ';
  const conta = document.createElement('span');
  conta.className = 'proj-grupo-conta';
  h.append(nome, sep, conta);
  return h;
}

const listas = new Map<HTMLElement, Item[]>();

/** Reordena e atualiza estados e grupos de todas as listas da página (uma vez por carregamento). */
export function iniciarListas(hoje = hojeEm()): void {
  document.querySelectorAll<HTMLElement>('[data-atividades]').forEach((lista) => {
    if (listas.has(lista)) return;
    const itens = [...lista.querySelectorAll<HTMLElement>('[data-atividade]')].map(ler).sort(comparar(hoje));
    for (const it of itens) {
      const estado = classificar(it, hoje);
      it.el.dataset.estado = estado;
      const status = it.el.querySelector<HTMLElement>('[data-rotulo]');
      if (status) {
        status.className = `status ${classeStatus(estado)}`;
        status.lastElementChild!.textContent = rotulo(estado, it);
      }
    }

    const agrupar = lista.dataset.agrupar != null;
    const limite = lista.dataset.limite ? Number(lista.dataset.limite) : Infinity;
    const antigos = new Map([...lista.querySelectorAll<HTMLElement>('.proj-grupo')].map((g) => [g.dataset.grupo!, g]));
    let anterior = '';
    itens.forEach((it, i) => {
      if (agrupar) {
        const chave = chaveGrupo(it, hoje);
        it.el.dataset.grupo = chave;
        if (chave !== anterior) lista.append(antigos.get(chave) ?? grupoEl(chave));
        antigos.delete(chave);
        anterior = chave;
      }
      it.el.hidden = i >= limite;
      lista.append(it.el);
    });
    antigos.forEach((g) => g.remove());
    listas.set(lista, itens);
    if (agrupar) contarGrupos(lista);
  });
}

function contarGrupos(lista: HTMLElement): void {
  const itens = listas.get(lista) ?? [];
  let primeiro = true;
  lista.querySelectorAll<HTMLElement>('.proj-grupo').forEach((g) => {
    const n = itens.filter((it) => it.el.dataset.grupo === g.dataset.grupo && !it.el.hidden).length;
    g.hidden = n === 0;
    g.classList.toggle('is-primeiro', primeiro && n > 0);
    if (n > 0) primeiro = false;
    g.querySelector('.proj-grupo-conta')!.textContent = contaTexto(n);
  });
}

/** Busca e filtro por eixo da página /atividades, com o estado na URL (?q=&eixo=). */
export function iniciarBusca(): void {
  const form = document.querySelector<HTMLFormElement>('[data-busca-atividades]');
  if (!form) return;
  iniciarListas();
  const lista = document.getElementById(form.dataset.lista!)!;
  const itens = listas.get(lista) ?? [];
  const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const chips = [...form.querySelectorAll<HTMLButtonElement>('[data-eixo]')];
  const contagem = document.querySelector<HTMLElement>('[data-contagem]')!;
  const vazio = document.querySelector<HTMLElement>('[data-vazio]')!;
  const termoVazio = vazio.querySelector<HTMLElement>('[data-termo]')!;
  const rotuloEixo = (v: string) => chips.find((c) => c.dataset.eixo === v)?.textContent?.trim().toLowerCase() ?? '';

  const url = new URL(location.href);
  input.value = url.searchParams.get('q') ?? '';
  let eixo = url.searchParams.get('eixo') ?? '';
  if (!chips.some((c) => c.dataset.eixo === eixo)) eixo = '';

  let espera: ReturnType<typeof setTimeout> | undefined;

  function aplicar(anunciar: boolean) {
    const termos = normalizar(input.value.trim()).split(/\s+/).filter(Boolean);
    let n = 0;
    for (const it of itens) {
      const ok = termos.every((t) => it.busca.includes(t)) && (!eixo || it.eixos.includes(eixo));
      it.el.hidden = !ok;
      if (ok) n++;
    }
    contarGrupos(lista);
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.eixo === eixo)));

    const q = input.value.trim();
    vazio.hidden = n > 0;
    termoVazio.textContent = `${q ? `para "${q}"` : ''}${q && eixo ? ' ' : ''}${eixo ? `em ${rotuloEixo(eixo)}` : ''}`;

    const texto = !q && !eixo ? contaTexto(n) : `${n === 1 ? '1 resultado' : `${n} resultados`}${q ? ` para "${q}"` : ''}${eixo ? ` em ${rotuloEixo(eixo)}` : ''}`;
    clearTimeout(espera);
    // espera a pessoa parar de digitar para o leitor de tela não anunciar cada tecla
    if (anunciar) espera = setTimeout(() => (contagem.textContent = texto), 250);
    else contagem.textContent = texto;

    const nova = new URL(location.href);
    q ? nova.searchParams.set('q', q) : nova.searchParams.delete('q');
    eixo ? nova.searchParams.set('eixo', eixo) : nova.searchParams.delete('eixo');
    history.replaceState(null, '', nova);
  }

  input.addEventListener('input', () => aplicar(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) {
      input.value = '';
      aplicar(true);
    }
  });
  chips.forEach((c) =>
    c.addEventListener('click', () => {
      eixo = c.dataset.eixo ?? '';
      aplicar(true);
    }),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    aplicar(true);
  });
  document.querySelectorAll<HTMLElement>('[data-limpar]').forEach((b) =>
    b.addEventListener('click', () => {
      input.value = '';
      eixo = '';
      aplicar(true);
      input.focus();
    }),
  );

  form.hidden = false;
  aplicar(false);
}

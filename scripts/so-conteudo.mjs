#!/usr/bin/env node
// Decide se uma mudança é "só conteúdo" (o que o painel grava) e pode ir ao ar sem revisão (docs/adr/0004).
// Entrada (stdin): a saída de `git diff --raw -z --no-renames <aprovado> <novo>`.
//   --raw traz o modo do arquivo (barra link simbólico e submódulo); --no-renames faz um arquivo movido de
//   src/ para content/ aparecer como apagado em src/ (e não só como novo em content/).
// Saída: 0 = só conteúdo; 1 = há outra coisa (lista os arquivos no stdout); 2 = nada mudou.
// O CI roda este arquivo como estava no último commit aprovado, nunca o do commit novo: mudar a regra exige
// promover à mão. Sem dependências, para rodar com o Node que já vem no runner.

const PERMITIDOS = [
  // YAML do painel (keystatic.config.ts; lido por src/lib/content.ts)
  /^content\/(?:[^/]+\/)*[^/]+\.yaml$/,
  // fotos do painel: só os formatos que src/lib/images.ts importa
  /^src\/assets\/uploads\/(?:[^/]+\/)*[^/]+\.(?:jpe?g|png|webp|avif)$/i,
  // documentos do painel (editais). Sem svg/html/js: esses vão ao ar só promovidos à mão.
  /^public\/uploads\/(?:[^/]+\/)*[^/]+\.(?:pdf|docx?|odt|xlsx?|ods|pptx?|odp|txt|csv|jpe?g|png|webp|avif|gif)$/i,
];
// arquivo comum (100644) ou apagado (000000); nada de link simbólico, executável ou submódulo
const MODOS = new Set(['100644', '000000']);

const caminhoSeguro = (p) =>
  !/[\x00-\x1f\x7f\\]/.test(p) && p.split('/').every((parte) => parte !== '' && parte !== '.' && parte !== '..');

const pedacos = [];
for await (const p of process.stdin) pedacos.push(p);
const campos = Buffer.concat(pedacos).toString('utf8').split('\0');
if (campos.at(-1) === '') campos.pop();

const recusados = [];
let total = 0;
for (let i = 0; i < campos.length; i += 2) {
  const cabecalho = campos[i];
  const caminho = campos[i + 1];
  // ":100644 100644 <sha> <sha> M"
  const m = /^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ [ADMT]$/.exec(cabecalho);
  if (!m || caminho === undefined) {
    recusados.push(`(entrada inesperada: ${JSON.stringify(cabecalho)})`);
    break;
  }
  total++;
  const ok = MODOS.has(m[2]) && caminhoSeguro(caminho) && PERMITIDOS.some((re) => re.test(caminho));
  if (!ok) recusados.push(caminho);
}

for (const r of recusados) console.log(r);
process.exit(recusados.length ? 1 : total ? 0 : 2);

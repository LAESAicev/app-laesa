// scripts/so-conteudo.mjs decide o que vai ao ar sem revisão (ADR 0004). Cada caso monta um repositório git
// temporário, aplica a mudança e passa ao script a mesma saída que o CI passa (git diff --raw -z --no-renames).
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const SCRIPT = resolve('scripts/so-conteudo.mjs');
const pastas: string[] = [];
afterAll(() => pastas.forEach((p) => rmSync(p, { recursive: true, force: true })));

type Mudanca = (escrever: (caminho: string, texto?: string) => void, repo: string) => void;

/** Commit base com conteúdo e código; aplica a mudança num segundo commit e roda o script no diff. */
function decidir(mudanca: Mudanca) {
  const repo = mkdtempSync(join(tmpdir(), 'so-conteudo-'));
  pastas.push(repo);
  const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
  const escrever = (caminho: string, texto = 'x\n') => {
    mkdirSync(dirname(join(repo, caminho)), { recursive: true });
    writeFileSync(join(repo, caminho), texto);
  };
  git('init', '-q');
  git('config', 'user.email', 'teste@exemplo.invalid');
  git('config', 'user.name', 'teste');
  for (const f of ['content/site.yaml', 'content/projetos/a.yaml', 'src/lib/x.ts', 'public/uploads/editais/a.pdf', 'package.json']) escrever(f);
  git('add', '-A');
  git('commit', '-qm', 'base');
  mudanca(escrever, repo);
  git('add', '-A');
  git('commit', '-qm', 'mudança', '--allow-empty');
  const diff = execFileSync('git', ['diff', '--raw', '-z', '--no-renames', 'HEAD~1', 'HEAD'], { cwd: repo });
  const r = spawnSync(process.execPath, [SCRIPT], { input: diff, encoding: 'utf8' });
  return { status: r.status, recusados: r.stdout.trim() };
}

describe('so-conteudo: o que vai ao ar sem promoção manual', () => {
  it('só YAML em content/ promove', () => {
    expect(decidir((e) => { e('content/site.yaml', 'statusSelecao: aberto\n'); e('content/editais/2027-1.yaml'); }).status).toBe(0);
  });

  it('conteúdo junto com src/ não promove e lista o arquivo de código', () => {
    const r = decidir((e) => { e('content/site.yaml', 'y\n'); e('src/lib/x.ts', 'export {}\n'); });
    expect(r).toEqual({ status: 1, recusados: 'src/lib/x.ts' });
  });

  it('PDF em public/uploads e foto em src/assets/uploads promovem', () => {
    expect(decidir((e) => { e('public/uploads/editais/2027-1/pdfEdital.pdf'); e('src/assets/uploads/mesa/presidente/foto.JPG'); }).status).toBe(0);
  });

  it('mandato novo da Mesa (YAML + fotos + estatuto da época no caminho do painel) promove', () => {
    const r = decidir((e) => {
      e('content/mandatos/2027-1.yaml', 'titulo: Mandato 2027.1\n');
      e('src/assets/uploads/mandatos/2027-1/membros/0/foto.jpg');
      e('src/assets/uploads/mandatos/2027-1/orientador/foto.png');
      e('public/uploads/mandatos/2027-1/estatuto.pdf');
    });
    expect(r).toEqual({ status: 0, recusados: '' });
  });

  it('arquivo apagado em content/ promove', () => {
    expect(decidir((_, repo) => rmSync(join(repo, 'content/projetos/a.yaml'))).status).toBe(0);
  });

  it.each([
    ['.github/workflows/ci.yml'],
    ['package.json'],
    ['public/uploads/x.html'], // HTML, JS e SVG só promovidos à mão
    ['public/uploads/x.svg'],
    ['public/uploads/x.js'],
    ['public/og.png'], // fora de uploads/
    ['src/assets/uploads/mesa/foto.svg'], // o build só importa jpg/png/webp/avif
    ['content/site.yml'], // o site só lê .yaml
    ['content/x.mjs'],
    ['scripts/so-conteudo.mjs'],
  ])('%s não promove', (caminho) => {
    expect(decidir((e) => e(caminho, 'mudou\n'))).toEqual({ status: 1, recusados: caminho });
  });

  it('arquivo movido de src/ para content/ não promove (aparece o apagado em src/)', () => {
    const r = decidir((_, repo) => execFileSync('git', ['mv', 'src/lib/x.ts', 'content/x.yaml'], { cwd: repo }));
    expect(r).toEqual({ status: 1, recusados: 'src/lib/x.ts' });
  });

  it('link simbólico em content/ não promove', () => {
    expect(decidir((_, repo) => symlinkSync('../src/lib/x.ts', join(repo, 'content/link.yaml'))).status).toBe(1);
  });

  it('YAML executável em content/ não promove', () => {
    expect(decidir((_, repo) => chmodSync(join(repo, 'content/site.yaml'), 0o755)).status).toBe(1);
  });

  it('nomes estranhos não escapam da regra', () => {
    // "content/../src" não existe no git (ele normaliza); o que chega é o caminho real, com espaço, acento ou quebra de linha
    expect(decidir((e) => e('content/edição nova.yaml')).status).toBe(0);
    expect(decidir((e) => e('content/a.yaml\nsrc/b.ts')).status).toBe(1);
    expect(decidir((e) => e('public/uploads/a.pdf.html')).status).toBe(1);
  });

  it('nada mudou: sai com 2 (nada a promover)', () => {
    expect(decidir(() => {})).toEqual({ status: 2, recusados: '' });
  });

  it('entrada que não é do git diff --raw -z não promove', () => {
    const r = spawnSync(process.execPath, [SCRIPT], { input: 'content/site.yaml\n', encoding: 'utf8' });
    expect(r.status).toBe(1);
  });
});

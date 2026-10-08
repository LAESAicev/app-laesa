// GET /avisos/itens.json — gerado no build: o que está publicado, para o comando dos avisos (scripts/avisar.ts).
// A imagem de produção não leva content/; o comando lê este arquivo de dist/client. Só dados que o site já mostra.
import type { APIRoute } from 'astro';
import { PUBLIC_CONTACT_EMAIL } from 'astro:env/client';
import { atividades, editais } from '../../lib/content';
import { statusDo } from '../../data/editais';
import type { Item, Manifesto } from '../../lib/avisos/manifesto';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('Defina SITE_URL: os avisos precisam do endereço público do site.');
  const url = (caminho: string) => new URL(caminho, site).toString();
  const itens: Item[] = [
    ...editais.map((e) => ({
      id: `edital:${e.slug}`,
      tipo: 'edital' as const,
      titulo: e.titulo,
      url: url(`/processos-seletivos/${e.slug}`),
      status: statusDo(e),
      ...e.datas,
      vagas: e.vagas,
      linkInscricao: Boolean(e.linkInscricao),
      exemplo: Boolean(e.exemplo),
    })),
    ...atividades.map((a) => ({
      id: `atividade:${a.slug}`,
      tipo: 'atividade' as const,
      nome: a.nome,
      descricao: a.descricao,
      url: url(`/atividades?${new URLSearchParams({ q: a.nome })}`),
      inicio: a.inicio,
      fim: a.fim,
      ano: a.ano,
      status: a.status,
      eixos: a.eixos,
      inscricao: Boolean(a.linkInscricao),
      exemplo: Boolean(a.exemplo),
    })),
  ];
  const manifesto: Manifesto = { versao: 1, geradoEm: new Date().toISOString(), site: site.origin, contato: PUBLIC_CONTACT_EMAIL, itens };
  return new Response(JSON.stringify(manifesto, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};

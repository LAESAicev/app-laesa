// Manifesto dos itens publicados: o site gera /avisos/itens.json no build (src/pages/avisos/itens.json.ts) e o
// comando dos avisos o lê do disco (dist/client/avisos/itens.json). A imagem de produção não tem content/, então
// é por ele que os avisos sabem o que está no ar. Dados públicos: os mesmos que as páginas mostram.
import { readFileSync } from 'node:fs';
import type { StatusManual } from '../atividades.ts';
import type { StatusSelecao } from '../../data/site.ts';

export type ItemEdital = {
  id: string; // "edital:2026-2"
  tipo: 'edital';
  titulo: string; // "Edital 2026.2"
  url: string; // página do edital no site
  /** Status no site (Configurações > status da seleção), no momento do build. */
  status: StatusSelecao;
  inscricoesInicio?: string; // datas "AAAA-MM-DD"
  inscricoesAte?: string;
  /** Só existe se for depois de inscricoesAte (mesma regra da página do edital). */
  prorrogadasAte?: string;
  vagas?: number;
  linkInscricao: boolean;
  exemplo: boolean;
};

export type ItemAtividade = {
  id: string; // "atividade:<slug>"
  tipo: 'atividade';
  nome: string;
  descricao: string;
  url: string; // /atividades?q=<nome>: a busca da página filtra direto nela
  inicio?: string;
  fim?: string;
  ano?: number;
  status: StatusManual;
  eixos: string[];
  /** Tem link de inscrição (o endereço em si fica de fora: os avisos só apontam para o site). */
  inscricao: boolean;
  exemplo: boolean;
};

export type Item = ItemEdital | ItemAtividade;

export const nomeDo = (item: Item) => (item.tipo === 'edital' ? item.titulo : item.nome);

export type Manifesto = {
  versao: 1;
  geradoEm: string;
  /** Origem do site (SITE_URL no build), ex.: "https://laesa.icev.edu.br". */
  site: string;
  contato: string;
  itens: Item[];
};

export function lerManifesto(caminho: string): Manifesto {
  let m: Manifesto;
  try {
    m = JSON.parse(readFileSync(caminho, 'utf8')) as Manifesto;
  } catch (e) {
    throw new Error(`Não consegui ler o manifesto ${caminho} (o site foi gerado com npm run build?): ${(e as Error).message}`);
  }
  if (m?.versao !== 1 || typeof m.site !== 'string' || typeof m.contato !== 'string' || !Array.isArray(m.itens)) {
    throw new Error(`Manifesto ${caminho} em formato inesperado: gere o site de novo.`);
  }
  new URL(m.site); // lança se SITE_URL veio inválido
  return m;
}

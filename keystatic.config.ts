// Painel de conteúdo (ADR 0001). Este arquivo é a fonte única do schema: o painel em /keystatic
// usa estes campos para editar, e as páginas leem o conteúdo pelo mesmo schema (src/lib/content.ts).
// Fotos ficam em src/assets/uploads (o build redimensiona e recorta); PDFs em public/uploads.
import { config, collection, fields, singleton } from '@keystatic/core';
import { EIXOS } from './src/lib/atividades';

const exemplo = fields.checkbox({
  label: 'Conteúdo provisório',
  description: 'Mostra o selo tracejado "exemplo" no site. Desmarque quando o conteúdo for o real.',
  defaultValue: false,
});

const pessoa = (label: string) =>
  fields.object(
    {
      nome: fields.text({ label: 'Nome', validation: { length: { min: 2 } } }),
      foto: fields.image({
        label: 'Foto',
        description: 'Qualquer foto serve: o site recorta no centro e redimensiona para o quadro 4:5 (800×1000). Prefira o rosto centralizado.',
        directory: 'src/assets/uploads/mesa',
        publicPath: '/src/assets/uploads/mesa/',
      }),
      exemplo,
    },
    { label },
  );

// Modo do painel: local (edita os arquivos da máquina, em `npm run dev`) ou GitHub (edita via commits no
// repositório da organização). O modo GitHub liga com PUBLIC_KEYSTATIC_GITHUB_REPO="LAESAicev/app-laesa" e
// exige um GitHub App da organização (passo a passo em docs/operacao.md, seção "Painel em produção").
const repo = import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO as `${string}/${string}` | undefined;
// O modo local não tem login: nunca pode ir para o site publicado.
if (import.meta.env.PROD && !repo) throw new Error('Painel em produção exige PUBLIC_KEYSTATIC_GITHUB_REPO (modo GitHub).');

export default config({
  storage: repo ? { kind: 'github', repo } : { kind: 'local' },
  ui: {
    brand: { name: 'LAESA' },
    navigation: {
      Site: ['configuracoes', 'hero', 'mesa', 'faq'],
      'Projetos e editais': ['projetos', 'editais'],
    },
  },

  singletons: {
    configuracoes: singleton({
      label: 'Configurações e status da seleção',
      path: 'content/site',
      format: { data: 'yaml' },
      schema: {
        statusSelecao: fields.select({
          label: 'Status do processo seletivo',
          description: 'Muda a tag do menu, a seção da home e a página de processos seletivos.',
          options: [
            { label: 'Inscrições abertas', value: 'aberto' },
            { label: 'Seleção em andamento', value: 'em-andamento' },
            { label: 'Finalizado', value: 'finalizado' },
          ],
          defaultValue: 'finalizado',
        }),
        editalAtual: fields.relationship({
          label: 'Edital atual',
          description: 'O edital mostrado em /processos-seletivos.',
          collection: 'editais',
          validation: { isRequired: true },
        }),
        estatutoUrl: fields.url({ label: 'Link do estatuto (PDF)' }),
        // Redes e e-mail vêm de variáveis de ambiente (.env.example), não do painel.
      },
    }),

    hero: singleton({
      label: 'Hero: git log',
      path: 'content/hero',
      format: { data: 'yaml' },
      schema: {
        commits: fields.array(
          fields.object({
            mensagem: fields.text({ label: 'Mensagem do commit', validation: { length: { min: 3, max: 70 } } }),
            hash: fields.text({
              label: 'Hash',
              description: '7 caracteres hexadecimais, só decorativo. Ex.: e7c41a0',
              validation: { length: { min: 7, max: 7 } },
            }),
            meta: fields.text({ label: 'Data ou detalhe (opcional)', description: 'Ex.: 02 jun 2026' }),
          }),
          {
            label: 'Commits',
            description: 'O primeiro da lista é o HEAD (destaque em menta). Arraste para reordenar.',
            itemLabel: (p) => p.fields.mensagem.value || 'Commit',
            validation: { length: { min: 2, max: 8 } },
          },
        ),
      },
    }),

    mesa: singleton({
      label: 'Mesa Diretora',
      path: 'content/mesa',
      format: { data: 'yaml' },
      schema: {
        presidente: pessoa('Presidente'),
        vicePresidente: pessoa('Vice-Presidente'),
        diretorProjetos: pessoa('Diretor(a) de Projetos'),
        diretorMarketing: pessoa('Diretor(a) de Marketing'),
        orientador: pessoa('Professor(a) Orientador(a)'),
      },
    }),

    faq: singleton({
      label: 'Perguntas frequentes',
      path: 'content/faq',
      format: { data: 'yaml' },
      schema: {
        perguntas: fields.array(
          fields.object({
            pergunta: fields.text({ label: 'Pergunta', validation: { length: { min: 5 } } }),
            resposta: fields.text({ label: 'Resposta', multiline: true, validation: { length: { min: 5 } } }),
            ref: fields.text({ label: 'Referência no estatuto (opcional)', description: 'Ex.: Art. 52º' }),
          }),
          { label: 'Perguntas', description: 'A primeira aparece aberta. Arraste para reordenar.', itemLabel: (p) => p.fields.pergunta.value || 'Pergunta' },
        ),
      },
    }),
  },

  collections: {
    projetos: collection({
      label: 'Atividades e projetos',
      slugField: 'nome',
      path: 'content/projetos/*',
      format: { data: 'yaml' },
      columns: ['nome', 'data', 'status'],
      schema: {
        nome: fields.slug({ name: { label: 'Nome', description: 'Ex.: Oficina: Git na prática' } }),
        descricao: fields.text({
          label: 'Descrição',
          description: 'O que foi (ou vai ser), para quem e quem conduziu. Duas ou três linhas.',
          multiline: true,
          validation: { length: { min: 20, max: 320 } },
        }),
        eixos: fields.multiselect({
          label: 'Eixos',
          description: 'Os eixos do estatuto (Art. 3º). São os filtros da página de atividades. Uma oficina aberta a outros cursos, por exemplo, é Ensino e Extensão.',
          options: EIXOS.map((e) => ({ label: e.rotulo, value: e.valor })),
          defaultValue: [],
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          description: 'Temas, para a busca: Figma, Segurança, IA…',
          itemLabel: (p) => p.value || 'Tag',
          validation: { length: { max: 4 } },
        }),
        data: fields.date({
          label: 'Data (ou início)',
          description: 'Dia do evento ou início do projeto. Define a ordem: o que está mais perto de hoje fica em cima. Sem data, o item vai para o fim da lista.',
        }),
        dataFim: fields.date({
          label: 'Data de fim (opcional)',
          description: 'Para cursos de vários dias ou projetos com prazo; precisa ser depois da data de início (senão é ignorada). Entre o início e o fim, o site mostra "acontecendo agora".',
        }),
        status: fields.select({
          label: 'Status',
          description: 'Automático: "em breve" antes da data, "concluído" depois. Use os outros só para projetos longos.',
          options: [
            { label: 'Automático (pela data)', value: 'auto' },
            { label: 'Em andamento', value: 'em-andamento' },
            { label: 'Concluído', value: 'concluido' },
          ],
          defaultValue: 'auto',
        }),
        linkInscricao: fields.url({
          label: 'Link de inscrição (opcional)',
          description: 'Com ele, um evento futuro aparece como "inscrições abertas", com o botão Inscrever-se. Some depois da data (no navegador de quem visita; o HTML sem JavaScript só atualiza na próxima publicação).',
        }),
        link: fields.url({ label: 'Link (opcional)', description: 'Post do Instagram, repositório, artigo ou página do projeto.' }),
        ano: fields.integer({ label: 'Ano (se não houver data)', validation: { min: 2023, max: 2100 } }),
        imagem: fields.image({
          label: 'Imagem (opcional)',
          directory: 'src/assets/uploads/projetos',
          publicPath: '/src/assets/uploads/projetos/',
        }),
        destaque: fields.checkbox({
          label: 'Pode aparecer na home',
          description: `A home mostra as atividades mais perto de hoje. Desmarque para listar só na página de atividades.`,
          defaultValue: true,
        }),
        ordem: fields.integer({ label: 'Desempate', description: 'Só para itens com a mesma data: menor aparece primeiro.', defaultValue: 10 }),
        exemplo,
      },
    }),

    editais: collection({
      label: 'Editais',
      slugField: 'titulo',
      path: 'content/editais/*',
      format: { data: 'yaml' },
      columns: ['titulo', 'inscricoesAte'],
      schema: {
        titulo: fields.slug({
          name: { label: 'Título', description: 'Ex.: Edital 2026.2' },
          slug: { label: 'Endereço da página', description: 'Ex.: 2026-2 → /processos-seletivos/2026-2' },
        }),
        inscricoesInicio: fields.date({ label: 'Inscrições de' }),
        inscricoesAte: fields.date({ label: 'Inscrições até' }),
        analise: fields.text({ label: 'Análise e entrevistas', description: 'Período, como aparece nas etapas. Ex.: 23 out a 3 nov 2026' }),
        integracao: fields.date({ label: 'Assinatura do termo e boas-vindas', description: 'Última etapa da seleção.' }),
        cronograma: fields.array(
          fields.object({
            etapa: fields.text({ label: 'Etapa', description: 'Ex.: Divulgação dos horários de entrevista' }),
            quando: fields.text({ label: 'Quando', description: 'Ex.: 27 out 2026, ou "Até 48h após o fim das entrevistas"' }),
            ref: fields.text({ label: 'Artigo do estatuto (opcional)', description: 'Ex.: Art. 57' }),
          }),
          { label: 'Cronograma completo', description: 'Todas as datas do edital, na ordem. Aparece na página do edital.', itemLabel: (l) => l.fields.etapa.value || 'Etapa' },
        ),
        vagas: fields.integer({ label: 'Número de vagas', validation: { min: 2 } }),
        linkInscricao: fields.url({ label: 'Link de inscrição' }),
        pdfEdital: fields.file({
          label: 'Edital (PDF)',
          directory: 'public/uploads/editais',
          publicPath: '/uploads/editais/',
        }),
        modeloCarta: fields.file({
          label: 'Modelo da carta de apresentação',
          directory: 'public/uploads/editais',
          publicPath: '/uploads/editais/',
        }),
        resultado: fields.url({ label: 'Link do resultado', description: 'Preencha quando o resultado for publicado.' }),
        exemplo,
      },
    }),
  },
});

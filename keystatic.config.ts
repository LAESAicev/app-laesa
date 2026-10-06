// Painel de conteúdo (ADR 0001). Este arquivo é a fonte única do schema: o painel em /keystatic
// usa estes campos para editar, e as páginas leem o conteúdo pelo mesmo schema (src/lib/content.ts).
// Fotos ficam em src/assets/uploads (o build redimensiona e recorta); PDFs em public/uploads.
// Fase 2: storage local (edição em `npm run dev`). Fase 5: modo GitHub, liberado ao time da organização.
import { config, collection, fields, singleton } from '@keystatic/core';

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

export default config({
  storage: { kind: 'local' },
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
        canais: fields.array(
          fields.object({
            icon: fields.select({
              label: 'Tipo',
              options: [
                { label: 'E-mail', value: 'mail' },
                { label: 'Instagram', value: 'instagram' },
                { label: 'LinkedIn', value: 'linkedin' },
                { label: 'GitHub', value: 'github' },
              ],
              defaultValue: 'mail',
            }),
            rotulo: fields.text({ label: 'Rótulo', description: 'Ex.: Instagram' }),
            valor: fields.text({ label: 'Texto exibido', description: 'Ex.: @laesa.icev' }),
            href: fields.text({ label: 'Link', description: 'Ex.: https://instagram.com/... ou mailto:contato@...' }),
            exemplo,
          }),
          { label: 'Redes e contato', itemLabel: (p) => p.fields.rotulo.value || 'Canal' },
        ),
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
      label: 'Projetos',
      slugField: 'nome',
      path: 'content/projetos/*',
      format: { data: 'yaml' },
      columns: ['nome', 'status', 'ordem'],
      schema: {
        nome: fields.slug({ name: { label: 'Nome do projeto' } }),
        descricao: fields.text({
          label: 'Descrição',
          description: 'Para quem foi feito, que problema resolveu e o que o Squad entregou. Duas ou três linhas.',
          multiline: true,
          validation: { length: { min: 20, max: 320 } },
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags', itemLabel: (p) => p.value || 'Tag', validation: { length: { max: 4 } } }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Concluído', value: 'concluido' },
            { label: 'Em andamento', value: 'em-andamento' },
          ],
          defaultValue: 'concluido',
        }),
        ano: fields.integer({ label: 'Ano de conclusão', validation: { min: 2023, max: 2100 } }),
        link: fields.url({ label: 'Link (opcional)', description: 'Repositório, artigo ou página do projeto.' }),
        imagem: fields.image({
          label: 'Imagem (opcional)',
          directory: 'src/assets/uploads/projetos',
          publicPath: '/src/assets/uploads/projetos/',
        }),
        destaque: fields.checkbox({ label: 'Mostrar na home', defaultValue: true }),
        ordem: fields.integer({ label: 'Ordem na home', description: 'Menor aparece primeiro.', defaultValue: 10 }),
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
        inscricoesAte: fields.date({ label: 'Inscrições até' }),
        analise: fields.text({ label: 'Período de análise', description: 'Ex.: 3 a 7 nov 2026' }),
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

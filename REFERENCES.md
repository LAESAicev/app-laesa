# Referências: comunicação visual da LAESA (primeira leva)

Pesquisa feita em 17/10/2026 para estender a identidade "Grafo de Commits" (site) ao Instagram (feed 4:5, carrossel, story 9:16) e a slides. Brief: "moderno, mas institucional, com linguagem de colagem". Restrição central: os templates serão editados no Canva por estudantes que não são designers.

Fontes consultadas: estudos de caso de estúdios (Pentagram, BUCK, Figma Brand Studio, Alexis Mark), It's Nice That, AIGA Eye on Design, Abduzeedo, Fonts In Use, Behance (via navegador, porque o acesso direto devolve 403), Are.na (via API pública) e os perfis de Instagram de duas ligas brasileiras de Engenharia de Software.

Limites desta leva:
- Behance e Instagram só abriram em navegador automatizado. Vi as imagens na tela, mas só a primeira dobra de cada projeto (o resto carrega sob demanda). Não baixei nem copiei imagens para este documento.
- Em vários estudos de caso só tive acesso ao texto. Quando a descrição visual vem do texto e não da imagem, digo isso no item.
- Are.na: a busca por canais funciona pela API, mas o conteúdo dos blocos é quase todo imagem sem legenda. Não consegui avaliar nenhum canal a ponto de virar referência. Os canais encontrados estão em "Termos que renderam".
- Next.js Conf 2024 (basement.studio), GDG Design Templates (Figma Community) e o guia de design de conferências do GDG Lviv (Medium) ficaram de fora porque não consegui ver o conteúdo (página sem descrição visual ou 403).
- A página de ligas acadêmicas do CIn/UFPE deu 404.

Total: 17 referências (7 inspirações, 7 padrões, 3 evidências).

---

### Princeton University: Motion Collage (Campus Mobility Principles)
Fonte/URL: https://www.behance.net/gallery/144980679/Princeton-University-Motion-Collage (Chá de Bold Estúdio + André Plus Prod., motion de Mykael Sobreira; publicado em 1/6/2022)
Tipo: inspiração
Relevante porque: é a referência mais próxima do brief inteiro, uma instituição acadêmica tradicional comunicada com colagem sem parecer zine de festa.
O que observei (vi os frames na página): fundo de papel quadriculado sobre chapas de cor chapada (laranja, verde, creme). Fotos de prédios e pessoas recortadas em preto e branco ou cor dessaturada. Títulos impressos em tiras de papel rasgado coladas tortas ("PRINCIPLES"). Selos em estrela ("HUMAN POWERED") e círculos com texto curto ("EASY FOR EVERYONE TO USE"). Uma linha desenhada à mão serpenteia pela composição e passa por pontos numerados (1, 3, 10). A marca de Princeton entra num retângulo de papel, sem perder o brasão. O texto de encerramento "OBRIGADO / THANK YOU" sugere estúdio brasileiro (suposição, não confirmei).
O que levar: a linha com nós numerados é quase literalmente o nosso grafo de commits feito de colagem. O papel quadriculado como fundo fixo. A tira de papel como "caixa de título" que aceita qualquer texto.
O que não levar / por que não serve: é vídeo; o movimento ajuda a organizar uma composição densa que, parada num feed 4:5, pode ficar poluída. A linha à mão é orgânica demais para o rigor do grafo; no nosso caso ela deve seguir trilhos.
Lição: colagem institucional funciona quando a instituição entra como um pedaço de papel dentro da colagem, e não como logo flutuando por cima.

### Hackathon #6 Poster Collection (Stripe)
Fonte/URL: https://www.behance.net/gallery/84421995/Hackathon-6-Poster-Collection (Mercedes Bazan, trabalho para a Stripe; ano não visível, o evento foi de 2 a 4 de outubro)
Tipo: inspiração
Relevante porque: é identidade de hackathon interno de empresa de dev, com série de pôsteres que variam muito mas são claramente uma família.
O que observei (vi a capa e a fileira de miniaturas): cinco ou seis pôsteres com azul elétrico, vermelho, amarelo e preto. A palavra "HACK" repetida em pilha, ocupando a altura inteira, em sans pesada ou fina. Um "6" gigante em 3D listrado. Smileys amarelos e formas de fita torcida sobrepostas à tipografia. Um dos pôsteres usa como fundo um trecho de código real (`const stripe = require(...)`, datas e cidades como strings) com as formas 3D por cima. Outro é um grid de quatro módulos (número, palavra, esfera listrada, smiley). Cabeçalho e rodapé finos com microtexto e logo da Stripe sempre no mesmo lugar.
O que levar: código real como textura de fundo (no nosso caso, `git log --graph` de verdade, com hashes em Geist Mono). A repetição da palavra em pilha, que Bebas Neue faz muito bem. A faixa fixa de microtexto em cima e embaixo, que segura a série.
O que não levar / por que não serve: smileys e fitas 3D puxam para um tom festivo e de 2019 que conflita com "institucional". Paleta primária pura não é a nossa.
Lição: a variação pode ser enorme no miolo se as bordas (cabeçalho, rodapé, logo) forem sempre iguais.

### SEAL: Liga Acadêmica de Engenharia de Software (CIn/UFPE)
Fonte/URL: https://www.instagram.com/seal.ufpe/ (perfil oficial, posts de 2026)
Tipo: padrão
Relevante porque: é uma liga do mesmo tipo que a LAESA, e resolveu o problema de "série editável por não designers" de um jeito muito simples.
O que observei (vi o grid do perfil): uma série de posts "Conheça nosso 1º/2º/3º Eixo" usa sempre a mesma ilustração (farol, ondas, sol em coral sobre creme e azul-marinho). Só muda o título (UX/UI, Testes de Software, DevOps e MLOps, Gestão de Processos). Uma linha em fonte mono no topo diz o número do eixo. Palavras de ligação ("de", "e") aparecem pequenas, dentro de uma caixinha inclinada. Rodapé com co-marca CIn + SEAL. O post de inscrições usa moldura de selo postal recortado e "SEAL 2026.2" em mono.
O que levar: a estrutura "fundo fixo + slot de título + rótulo mono", que sobrevive a qualquer troca de texto no Canva. O rótulo mono numerado combina com hashes/versões do nosso conceito. Co-marca no rodapé com a iCEV.
O que não levar / por que não serve: a ilustração plana e única é bonita, mas não é colagem, e repetida em todo post deixa o feed monótono.
Lição: o template mais robusto é aquele em que o estudante só pode mexer no texto.

### LES: Liga Acadêmica de Engenharia de Software (IFPE)
Fonte/URL: https://www.instagram.com/les.ifpe/ e https://lesifpe.com.br (perfil e site oficiais; posts de 2026, cerca de 130 seguidores na data)
Tipo: evidência
Relevante porque: mostra o que o público da LAESA já vê em ligas pares. A linguagem que o brief pede (colagem com halftone e condensada) já circula nesse meio.
O que observei (vi o grid do perfil): fundo azul-petróleo com grid em perspectiva. Recortes em halftone de megafone e mão apontando. Estrelas de explosão verde-neon. Títulos em sans condensada caixa-alta parecida com Bebas ("INSCRIÇÕES ENCERRADAS", em branco e amarelo). Tarjas pretas com texto em caixa-alta. Ao mesmo tempo, posts de eventos institucionais (SNCT) aparecem com outra paleta (roxo e rosa), ícones genéricos de calendário/relógio/pin, QR code e fotos dos responsáveis em círculos. O site (texto) tem tom institucional e seções de projetos, calendário, equipe e ingresso.
O que levar: a confirmação de que halftone + condensada é legível e aceito pelo público. O post de evento mostra os dados que sempre aparecem (data, hora, local, QR, responsáveis), então os nossos templates precisam de slots para eles.
O que não levar / por que não serve: a mistura de estilos no grid (cada post de um jeito) e o kit "tech" de raios neon e engrenagem. Se a LAESA usar a mesma receita, vira mais uma liga igual.
Lição: colagem halftone sozinha não diferencia. O que pode diferenciar a LAESA é o grafo de commits como estrutura.

### Behance: busca "liga acadêmica"
Fonte/URL: https://www.behance.net/search/projects/liga%20acad%C3%AAmica (busca vista em 17/10/2026)
Tipo: evidência
Relevante porque: dá uma noção do que existe publicado como identidade de liga acadêmica no Brasil.
O que observei (vi a primeira tela e os títulos listados na busca): mais de 10 mil resultados, dominados por ligas de medicina e saúde (cirurgia vascular, ortopedia, medicina intensiva, psicologia). Os projetos têm poucas curtidas (de 1 a 7) e poucas visualizações (dezenas a centenas). Muitos são selos circulares de inspiração heráldica. Destaque: "Id Visual - Liga Acadêmica" (Lucas Duailibe) com tipografia empilhada e formas orgânicas azuis sobre turquesa aplicadas em ecobag.
O que levar: quase nenhuma referência de liga de tecnologia com sistema completo publicado. Isso é espaço livre para a LAESA.
O que não levar / por que não serve: o padrão "selo circular com símbolo + nome em volta", que é o clichê de liga de saúde.
Lição: ligas raramente publicam sistemas; o comum são logos isolados. Um kit de templates bem feito já é diferencial.

### Cobe: identidade por Alexis Mark
Fonte/URL: https://www.itsnicethat.com/articles/alexis-mark-cobe-branding-graphic-design-project-130426 (Alexis Mark, Copenhague; texto de Ellis Tree, 13/4/2026)
Tipo: inspiração
Relevante porque: é colagem usada como sistema (e não como ilustração), e se apoia em painéis de partida, horários e pranchetas de terminal de transporte. Isso é parente direto de um log de commits.
O que observei (pelo texto; não vi as imagens em detalhe): peças impressas e web em camadas, como plantas em papel manteiga; desenhos, texturas e fotos de projetos sobrepostos. Composições "cheias, mas sistemáticas". Tipografia própria (AM Kosmos, grotesca industrial de x-height alta). Animações inspiradas em letreiros de notícias. Um dos sócios chama a linguagem dos painéis de "prática, urgente, precisa e estranhamente rítmica".
O que levar: tratar o post como um quadro de horários. Linhas de registro (hash, data, autor, mensagem) organizam a colagem. O letreiro corrido para stories e motion.
O que não levar / por que não serve: o resultado depende de designers manipulando camadas; no Canva isso precisa virar poucos elementos fixos.
Lição: informação tabular (horário, hash, data) pode ser o esqueleto da colagem, e não só legenda.

### The Guardian: artes das eleições feitas à mão
Fonte/URL: https://www.itsnicethat.com/features/the-guardian-election-editorial-graphic-design-illustration-spotlight-140624 (equipe de Chris Clarke, Harry Fischer e Rich Cousins; texto de Jenny Brewer, 14/6/2024)
Tipo: padrão
Relevante porque: é o caso mais claro de colagem produzida em volume (3 a 6 artes por dia) por uma equipe rotativa, mantendo consistência.
O que observei (pelo texto): papel cortado e rasgado com estilete, fotocópias gastas, marcas de toner. Mãos aparecem segurando as peças. As colagens não são coladas, para parecer trabalho em andamento. Rostos, prédios e membros recortados são reaproveitados de uma arte para outra, o que faz a série parecer uma campanha só. Tipografia limpa da casa por cima. O guia de estilo é solto; a consistência vem do processo.
O que levar: uma biblioteca fixa de recortes da LAESA (fotos do campus da iCEV, mãos, teclados, folhas de papel, prints de terminal) que todo mundo reutiliza. Tipografia limpa como contrapeso da colagem.
O que não levar / por que não serve: a imperfeição deliberada exige olho treinado. Para não designers, a "sujeira" precisa vir pronta dentro dos recortes, e não ser decisão de quem edita.
Lição: consistência em colagem vem de reutilizar as mesmas peças.

### It's Nice That: tendências gráficas para 2026
Fonte/URL: https://www.itsnicethat.com/features/forward-thinking-graphic-trends-2026-graphic-design-120126 (Ellis Tree, 12/1/2026)
Tipo: inspiração
Relevante porque: confirma que colagem escaneada e texturizada está em alta, e traz duas tendências que casam com o nosso conceito.
O que observei (pelo texto): "The visual index", recortes achatados, isolados e numerados como espécimes de coleção (exemplos citados: Sunroom, Miguel Vides, From Form). "Micrographics", dados técnicos (diagramas, métricas, timestamps) usados como textura de página. "Make me a copy", erros de impressora e grão como estilo. O texto sugere que geradores de imagem ainda têm dificuldade com colagem mista autêntica.
O que levar: recortes numerados (o número pode ser um hash curto). Timestamps e metadados de commit como textura de fundo.
O que não levar / por que não serve: tendência envelhece rápido. É opinião editorial, não dado.
Lição: o vocabulário de metadados do git (hash, data, branch) tem cara de 2026 se tratado como microgrâfico.

### GitHub Universe '24: "The World's Fair of Software"
Fonte/URL: https://abduzeedo.com/github-x-buck-crafting-dynamic-visual-identity-universe-24 (BUCK com o estúdio de design do GitHub; direção criativa de Ward Graumans; 2024)
Tipo: inspiração
Relevante porque: é a marca de evento dev mais conhecida, e o sistema foi feito para continuar vivo depois do evento.
O que observei (pelo texto): a peça central são os "Monumentos do Progresso", uma evolução da biblioteca de formas 2D do ano anterior, com ícones, mascotes e piadas internas do GitHub. Funcionam isolados ou como visual principal, animados para social e para o filme de abertura. Cores e tipografia "influenciadas por código", sem detalhes no texto. O sistema virou kit permanente da comunicação do GitHub.
O que levar: a ideia de biblioteca de peças com piada interna para quem programa (no nosso caso: `HEAD`, `main`, `merge`, `--graph`). Um kit que dura além do evento.
O que não levar / por que não serve: depende de ilustração e 3D de estúdio grande. Fora do alcance de quem edita no Canva.
Lição: o que torna o kit reutilizável é a biblioteca de peças.

### Config 2025 (Figma)
Fonte/URL: https://www.figma.com/blog/how-we-shaped-the-visual-identity-for-config-2025/ (Figma Brand Studio: Damien Correll, Leandro Castelao e equipe; 2025)
Tipo: padrão
Relevante porque: explica como um sistema de marca é montado para ser usado por muita gente e ainda ter textura artesanal.
O que observei (pelo texto): glifos feitos de formas primitivas, cada um com parte interna e externa, montados como componentes no Figma para parceiros trocarem e personalizarem. Paletas por tema de palestra viram variáveis. Os glifos são usados com parcimônia para não brigar com conteúdo denso. Impressão risográfica pela imperfeição e textura. O filme de abertura caiu de 60 para 15 fps para parecer feito à mão. Regra declarada: restringir o conceito, não a execução.
O que levar: componentes travados com poucas propriedades editáveis (equivalente no Canva: elementos agrupados e bloqueados, com só o texto livre). Cor por "trilha" (por exemplo, uma cor da paleta por núcleo ou tipo de post). Textura riso pronta.
O que não levar / por que não serve: "restringir o conceito, não a execução" funciona com designers. Com não designers, a execução também precisa de trilhos.
Lição: usar o elemento de marca com parcimônia quando o conteúdo é denso (carrossel, slide de aula).

### Chiba Tech (Pentagram)
Fonte/URL: https://www.pentagram.com/work/chiba-tech (Pentagram, sócia Giorgia Lupi; ano não informado na página)
Tipo: padrão
Relevante porque: instituto de tecnologia tradicional que derivou um grid inteiro do próprio símbolo.
O que observei (pelo texto): o personagem geométrico do símbolo de 1942 vira logo, tipografia, mascote e base do sistema. Layouts usam um grid ancorado nos quatro cantos, modular. Três tipos próprios: um que transforma o padrão xadrez em letras e também serve de elemento gráfico, um mono derivado do quadrado e um pixelado. Mascote "Chibuggy" para anúncios e aprovações, dando calor a um sistema rígido.
O que levar: os quatro cantos como slots fixos (logo, hash/data, número da página do carrossel, @). O ícone cérebro/circuito da LAESA pode ser a origem do grid, assim como o símbolo de Chiba é.
O que não levar / por que não serve: tipos próprios e paleta algorítmica são inviáveis aqui.
Lição: quando o símbolo gera o grid, cada peça parece da marca mesmo sem logo.

### MIT Media Lab (Pentagram)
Fonte/URL: https://www.pentagram.com/work/mit-media-lab (Pentagram, sócio Michael Bierut; ano não informado na página)
Tipo: padrão
Relevante porque: resolve como dar identidade própria a subgrupos sem quebrar a marca-mãe, que é o caso de núcleos, projetos ou eventos da LAESA.
O que observei (pelo texto): um grid 7×7 herdado do logo de 25 anos gera o monograma "ML" e glifos para cada um dos 23 grupos de pesquisa. Helvetica volta como tipo de apoio.
O que levar: cada núcleo ou série de posts ganha um "branch" com nome e cor, desenhado a partir do mesmo trilho do grafo.
O que não levar / por que não serve: 23 glifos é demais; para a LAESA, 3 a 5 variações bastam.
Lição: sub-identidade gerada por regra escala melhor do que sub-identidade desenhada caso a caso.

### The New School (Pentagram)
Fonte/URL: https://www.pentagram.com/work/the-new-school (Pentagram, sócia Paula Scher; o prédio que inspirou o sistema abriu em 2013)
Tipo: inspiração
Relevante porque: identidade universitária que é ao mesmo tempo institucional e expressiva só com tipografia e barras.
O que observei (pelo texto): fonte Neue (baseada na Irma, de Peter Bil'ak) em três larguras misturadas por algoritmo. Barras pretas paralelas, tiradas das faixas horizontais do prédio, ancoram o nome e organizam as escolas em várias escalas. Nomes das escolas em vermelho próprio.
O que levar: barras horizontais como estrutura (no nosso caso, linhas do log). Contraste de largura entre Bebas Neue (condensada) e Geist (normal) como versão "barata" do mesmo efeito.
O que não levar / por que não serve: fonte com três larguras e algoritmo não existe no Canva.
Lição: dá para ser expressivo e institucional ao mesmo tempo usando só tipo e uma barra.

### RATP: campanha contra assédio
Fonte/URL: https://fontsinuse.com/uses/50574/ratp-anti-harassment-campaign (Rosa Paris, segundo comentário na página; novembro de 2022)
Tipo: padrão
Relevante porque: campanha pública em série, feita para redes sociais e pôster 4:3, com Bebas Neue no texto de apoio.
O que observei (pelo texto; não vi as imagens): cada peça é dividida ao meio, com metades em cores complementares em choque. Piepie nos títulos, Bebas Neue nos textos menores. Tags: "half and half", "horizontal division", "series", "various formats".
O que levar: a divisão em duas metades como template de post de "antes/depois", "problema/solução" ou "pergunta/resposta", fácil de editar no Canva. Bebas Neue também funciona em tamanho de apoio, não só no título gigante.
O que não levar / por que não serve: o choque de complementares não cabe na paleta azul/ciano/menta, que é análoga. Aqui o contraste viria de claro/escuro (ground #F3F6F9 contra navy-deep #022B45).
Lição: uma regra de composição única (dividir ao meio) já basta para segurar uma série.

### Bebas Neue no Fonts In Use
Fonte/URL: https://fontsinuse.com/typefaces/31989/bebas-neue (página da fonte, 30 usos listados)
Tipo: evidência
Relevante porque: mostra em que contexto a fonte display da LAESA aparece no mundo real.
O que observei (pelo texto): usos em pôsteres de cinema (BlacKkKlansman, 2018; The Exorcist: Believer, 2023), campanha pública (RATP, 2022), embalagens de cerveja, games (Battlefield 3), Twix, álbuns e identidades pequenas. Ryoichi Tsunekawa (Dharma Type) a lançou em 2010; é aberta (SIL OFL) desde 2018. Quase sempre aparece acompanhada de uma serifada ou grotesca.
O que levar: Bebas é forte em título curto e grande, e funciona melhor com uma segunda fonte de outro caráter (Geist e Geist Mono já cumprem esse papel).
O que não levar / por que não serve: Bebas é muito comum. Sozinha, ela parece Canva genérico. A diferença tem que vir do sistema (grafo, mono, colagem), não da fonte.
Lição: Bebas Neue sozinha não identifica a LAESA.

### Future Architect (Strelka Institute)
Fonte/URL: https://eyeondesign.aiga.org/is-this-the-future-of-conference-branding/ (Ira Ivanova, 2018; app AR de Ivan Puzyrev)
Tipo: inspiração
Relevante porque: trata a foto do evento como peça da identidade, e a LAESA vai produzir muita foto de palestra e oficina.
O que observei (pelo texto): grid preto e branco em panorama, palco e telão fundidos como interface de modelagem 3D. O palco foi pensado como cenário de TV, então cada foto de palestrante já sai como um pequeno pôster quando compartilhada.
O que levar: pensar o slide e o fundo de palco já com o grafo de commits, para que a foto da palestra vire post sem edição. Template de "foto de evento + moldura do grafo".
O que não levar / por que não serve: panorama 3D e AR estão fora do escopo.
Lição: se o slide é da marca, a foto do evento também é.

### Taager Hackathon Event
Fonte/URL: https://www.behance.net/gallery/150028319/Taager-Hackathon-Event (vários autores no Behance, publicado em 9/8/2022)
Tipo: padrão
Relevante porque: exemplo de colagem modular em blocos quadrados, o tipo de sistema que o Canva reproduz com facilidade.
O que observei (vi a capa): fundo turquesa com título grande em sans geométrica. À direita, uma "escada" de quadrados com ícones (megafone, sacola, aperto de mão, setas), formas geométricas (círculos concêntricos, triângulos, meia-lua, pontos) e silhuetas de pessoa, em amarelo, azul-marinho, turquesa e branco.
O que levar: módulos quadrados de tamanho fixo que se encaixam num grid. Estudantes trocam um módulo por outro sem quebrar nada. Funciona como "commits" empilhados.
O que não levar / por que não serve: os ícones são de banco genérico e o resultado tem cara de template corporativo. Se adotarmos módulos, o conteúdo deles tem que ser recorte fotográfico, código ou tipografia, não ícone.
Lição: módulos são a estrutura mais fácil de editar no Canva. Usados com ícones de banco, porém, viram anti-referência.

---

## Padrões

1. Bordas fixas, miolo variável. Hackathon #6 (cabeçalho e rodapé finos), Chiba Tech (quatro cantos), SEAL (rótulo mono no topo e co-marca no rodapé) e RATP (série com regra única). Em todos, a variação acontece dentro de uma moldura que não muda.
2. Biblioteca de peças reutilizáveis. GitHub Universe (monumentos), Config 2025 (glifos como componentes), Guardian (recortes reaproveitados) e Taager (módulos). A consistência vem das peças repetidas.
3. Dado técnico como textura. Hackathon #6 (código real de fundo), Cobe (painéis de horários), tendências 2026 do It's Nice That (micrographics e índice numerado) e Princeton (nós numerados na linha). Isso valida o `git log` como textura da LAESA.
4. Colagem com âncora institucional limpa. Princeton (marca dentro de um papel), Guardian (tipografia limpa por cima) e The New School (barras organizando o expressivo). A colagem fica embaixo e a informação, por cima e limpa.
5. Halftone + condensada já é linguagem do público. LES/IFPE usa recortes em halftone e caixa-alta condensada. O Fonts In Use mostra Bebas em todo tipo de contexto.

Divergências:
- Densidade: Cobe e Guardian aceitam composição cheia; Config 2025 pede parcimônia quando o conteúdo é denso. Para a LAESA, a hipótese é colagem cheia na capa do carrossel e no story de anúncio, e colagem mínima (só uma faixa ou um recorte) nos slides internos e de aula.
- Rigor vs. mão: Princeton e Guardian usam linha e corte à mão; Chiba e MIT usam grid rígido. O grafo de commits pede o lado rígido na estrutura (trilhos, nós) e o lado manual só na textura dos recortes.
- Cor: RATP e Hackathon #6 contrastam por matiz; a paleta LAESA é análoga (azuis/ciano/menta), então o contraste precisa vir de claro/escuro e do papel/fotografia.

## Hipóteses

1. Trilho do grafo como moldura fixa. Uma linha vertical do grafo com nós sempre na mesma posição (margem esquerda no feed, no story e no slide), e os conteúdos entram como "commits" pendurados nela.
   Como saber se funciona: em 5 posts de assuntos diferentes, alguém de fora reconhece que são da mesma conta numa olhada no grid do perfil.
2. Slot de título em tira de papel. Título em Bebas Neue dentro de uma tira de papel (imagem PNG fixa) que acomoda de 1 a 3 linhas.
   Como saber se funciona: um estudante troca o título por um texto 50% mais longo no Canva e o layout continua inteiro, sem ajuste manual.
3. Cabeçalho de commit em Geist Mono. Linha fixa no topo, no formato `a3f9c1e · 17 out 2026 · palestra`, substituindo o "tema do post" e servindo como numeração da série.
   Como saber se funciona: legível com 360 px de largura de tela (em celular, texto mono abaixo de ~24 px num post 1080×1350 tende a sumir; testar).
4. Biblioteca de 15 a 20 recortes da LAESA (fotos do campus da iCEV e dos membros em halftone, mãos, teclado, papel quadriculado, print de terminal), já tratados na paleta.
   Como saber se funciona: três estudantes montam um post cada só com a biblioteca e os três posts parecem da mesma marca.
5. Duas densidades. Capa e anúncio com colagem cheia; páginas internas do carrossel e slides com só o trilho e um recorte.
   Como saber se funciona: o texto do slide 3 de um carrossel é lido em menos de 5 s no celular, sem zoom.
6. Divisão claro/escuro (ground #F3F6F9 contra navy-deep #022B45) como template de "antes/depois" ou "pergunta/resposta".
   Como saber se funciona: o contraste entre o texto e o fundo passa 4.5:1 nas duas metades, e o post funciona também em miniatura no grid.
7. Fundo de slide de palestra com o grafo, para que foto de evento já saia "da marca".
   Como saber se funciona: uma foto de celular de uma palestra real mostra a marca LAESA sem edição.

## Anti-referências

- Template "tech" genérico do Canva: circuito impresso, globo de rede, gradiente azul-roxo com partículas. É o que qualquer curso de TI usa e apaga o conceito do grafo.
- Neon cyberpunk e raios: verde e ciano neon sobre preto, raios e glitch (parte do feed da LES/IFPE vai por aí). O ciano #1DD0F8 da LAESA deve aparecer como cor de nó ou destaque, não como brilho.
- Imagem de banco "hacker": encapuzado, matrix de código verde, cadeado. É clichê e tem conotação de crime, ruim para uma liga acadêmica.
- Look SaaS de blob com gradiente: formas orgânicas com degradê e glassmorphism. Não tem nada de colagem nem de institucional.
- Ícones de banco em módulos (como no Taager): o grid modular é bom, os ícones genéricos não.
- Selo circular heráldico, o padrão das ligas de saúde no Behance: lê como "liga de medicina", não de software.
- Bebas Neue sozinha, centralizada, em cima de foto escurecida: é o post padrão de evento e não identifica ninguém.
- Mistura de estilos por post: o grid da LES alterna paletas e linguagens. É o que acontece quando não há template travado.

## Termos que renderam

Busca geral e Pinterest:
- "motion collage university"
- "collage identity system" / "collaged identity"
- "visual index cut-outs" / "numbered cut-outs collage"
- "micrographics graphic design"
- "hackathon poster collection"
- "code as texture poster"
- "departure board typography" / "timetable graphic design"
- "halftone cutout instagram"
- "graph paper collage"
- "torn paper label typography"
- "half and half poster series"

Fonts In Use: página da Bebas Neue (`fontsinuse.com/typefaces/31989/bebas-neue`) e tags "universities" e "education/academia".

Are.na (só pela API, conteúdo não avaliado): canais "ink/type/paint/print/glue" (yng li), "collage posters" (Dania Abdul), "Collage & Mixed Media" e "Grid & Info Hierarchy" (sam_morgan .mov), "Mood / Swiss" (The Night Watch), "torn posters" (James Vaughan). Melhor abrir logado no navegador.

Termos que não renderam: "Are.na halftone collage" (busca web não indexa canais), "risograph conference identity" (só ferramentas e prompts de IA), "behance semana acadêmica computação colagem" (só semanas de design).

## Territórios (notas cruas)

- Log de terminal: papel claro, trilho do grafo à esquerda, cada post é um commit com hash mono, título em tira de papel e um recorte em halftone. Institucional e calmo.
- Quadro de partidas: grid de linhas horizontais como painel de horários (Cobe + The New School), módulos de colagem encaixados nas linhas, para agenda, eventos e chamadas.
- Caderno de laboratório: papel quadriculado, fotos dos membros e do campus recortadas, linha com nós numerados (Princeton), mais quente e humano, para bastidores e recrutamento.

---

## Ponto de partida: posts que a LAESA já publicou

Fonte: Figma "Site da LAESA", página "Identidade dos Posts" (node 3132:1692), analisada em 17/10/2026. São evidência do que existe hoje, não referência externa.

### Workshop "Como a internet funciona" (node 3132:1693), o preferido do Felipe
Formato: 1080×1350 (4:5), o certo para o feed.
O que funciona: hierarquia clara (tag → título gigante em Bebas com uma palavra em ciano → subtítulo → lista de dados com ícones → selo de vagas). Foto real do ministrante dá rosto ao post. Bordas fixas: logo embaixo à esquerda, chamada ("Inscrições pelo link na bio") embaixo à direita. Lê bem em miniatura.
O que pesa: fundo quase preto e linhas onduladas com brilho, que não existem no site (o site é claro, com navy e o grafo). O recorte da foto se dissolve num brilho em vez de ter borda. O nome do ministrante fica sobre a foto. Nada do "Grafo de Commits" aparece.
Figma: camadas com nome genérico ("Frame 2", centenas de "Vector"); as ondas são dezenas de vetores soltos; um logo solto ("logo-8 1") fica fora dos frames, no canvas.

### Oficina "Do clique à experiência" (node 3132:1913)
Formato: 1080×1080 (1:1). No feed, o 4:5 ocupa mais tela.
O que funciona: mesma família visual do workshop (tag, título com destaque, lista de dados, logo na mesma posição). Camadas com nomes descritivos ("coluna-texto", "decor-arcos-topo").
O que pesa: informação demais para um post (título de 4 linhas em duas cores, parágrafo de 4 linhas, duas turmas, nome completo e cargo do ministrante, selo, logo e uma ilustração grande). A ilustração com brilho neon disputa atenção com o título e fica perto da anti-referência "neon tech". O frame "ilustracao-mockups" mede 16×16 e o conteúdo vaza dele, o que atrapalha alinhar e exportar.

### Padrão informal que já existe
Tag em pílula ciano, título em Bebas com uma palavra destacada, bloco de dados com ícones, selo contornado, logo embaixo à esquerda. Isso já é uma linguagem reconhecível e deve ser tratada como um território possível ("evolução do atual"), não descartada.

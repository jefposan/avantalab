# Componentes oficiais

## Regra geral

Antes de criar um componente, buscar implementação equivalente em `app/components`
e no design system. Quando faltar uma abstração recorrente, criá-la de forma
compartilhada e documentá-la aqui; não copiar marcação entre módulos.

## Cards

### Regra de decisão

- Usar `AvantaCard`/AvantaShell quando o usuário solicitar “AvantaCard” ou
  “AvantaShell”, ou quando briefing, manifesto ou especificação do módulo exigir
  expressamente esse componente.
- Sem essa solicitação, não impor AvantaCard. Manter o padrão geral: tipografia,
  cores, tokens, espaçamentos, raios, hierarquia, responsividade, tema e
  acessibilidade do PADRÃO AVANTA.
- Não converter automaticamente cards existentes para AvantaCard durante uma
  alteração sem relação com sua estrutura visual.

### Quando AvantaCard for solicitado

- Reutilizar `app/components/AvantaCard.tsx`; não recriar sua geometria.
- Título fica na CHAPA; controles ou metadado curto ficam no PLATÔ; conteúdo fica
  no CORPO.
- A curva é o path SVG oficial. Não reconstruir com CSS.
- A skin deriva de `corPrimaria` e tema; a estrutura não fixa paleta.
- Ler integralmente `planejamento/padrao-avanta-card.md`.

### Quando AvantaCard não for solicitado

- Preservar a linguagem visual e o componente já consolidado no contexto.
- Usar superfície, contraste, raio e sombra coerentes com a hierarquia da tela.
- Reutilizar um card geral oficial se existir; não criar variação local
  equivalente por conveniência.

Não transformar em card: barra simples de filtros, aviso curto, linha de tabela,
divisor ou agrupamento sem identidade própria.

## Controles

### Campo monetário

- Reutilizar `app/components/CampoMoeda.tsx` em valores monetários: `value` e `onChange` recebem string pt-BR com duas casas; `inputRef` encaminha foco. Usa `formatarMoedaDigitada`, teclado numérico, cursor à direita ao focar/clicar e após máscara. Não adiciona wrapper ou altera a geometria do formulário; preserva label, required, disabled, readOnly, erro e eventos do consumidor.
- Vazio permanece vazio; dígitos representam centavos (`1` → `0,01`, `123456` → `1.234,56`). Colagem formatada mantém o valor. Persistência continua explícita e validada no servidor. Não usar em EAN, quantidade, porcentagem ou outros campos textuais.

### Ações compactas

- Reutilizar `app/components/BotaoAcaoCompacto.tsx` em ações curtas de cards, formulários e listas quando a densidade compacta for solicitada. Face de 32px, raio de 10px, texto de 13px/peso 500 e padding horizontal de 10px. O botão nativo mantém alvo mínimo de 44 × 44px, com espaço transparente ao redor da face, sem sobreposição de alvos.
- Variantes `primario`, `secundario`, `discreto` e `destrutivo`; mesma escala para Salvar, Cancelar, Editar, Excluir, paginação e fechar. Cor vem de `--brand`; `--av-action-on-brand` define contraste sobre ela. `corTextoSobreFundo` em `app/lib/cores-avanta.ts` resolve texto preto/branco por luminância para cores hexadecimais, sem outro controlador de tema.
- Ícones usam SVG em bloco, centrado por flex na face quadrada, sem depender da linha de base do caractere ×. Com `somenteIcone`, fornecer nome acessível. Preservar foco visível, teclado, disabled e aria-pressed; rótulo de espera continua no próprio botão.
- Cabeçalhos coloridos de cards gerais podem usar a cor do perfil e o texto de contraste; não substitui AvantaShell nem muda todos os módulos automaticamente. Primeira aplicação: Configurações do AvantaPreços Web. Não alterar globalmente botões existentes ou reduzir campos de formulário para 32px.

### Seleção de áreas autorizadas

- Reutilizar `app/components/SelecaoModulos.tsx` para apresentar os módulos concedidos ao usuário. A seleção usa fundo institucional, painel central, identificação do perfil, blocos responsivos e saída separada.
- Reutilizar `app/components/AcessosUsuarioCampos.tsx` nos formulários de usuários. Dashboard e módulos são concessões do vínculo com a empresa, adicionais ao papel operacional.
- Não mostrar módulos negados ou inativos como atalhos. Tema e cor vêm do perfil; alvos de 44px, foco visível e estados de vazio/erro são obrigatórios.

### Cabeçalho de módulo

- Reutilizar `app/components/ModuloHeader.tsx` para cabeçalhos leves de módulos:
  retorno à esquerda, identidade do perfil centralizada e ações opcionais à direita.
- O componente reutiliza os estilos consolidados de Custos e Precificação, sem
  uma cópia local de CSS. Recebe marca, tema e retorno do módulo; não persiste
  preferências nem adiciona botões sem uma ação implementada.
- O `AppHeader` continua destinado ao dashboard completo, com abas e controles
  próprios; não é equivalente a esse cabeçalho de módulo.
- `ModuloHeader` aceita `returnTooltip` e `returnTooltipPosition` opcionais
  para ajuda do retorno; ausentes, preservam a estrutura anterior. O filtro
  compartilhado `FiltroCompetencia` aceita `tooltipPosition` opcional, sem
  adicionar ajuda ou wrappers nos consumidores que não a configurarem.
  Em cabeçalhos fixos, usar `Tooltip` com `posicao="bottom"` para ajuda abaixo
  do controle, sem duplicar balões nativos via `title`.
  `FiltroCompetencia` aceita `todosLabel` opcional para esclarecer a abrangência
  no consumidor; ausente, mantém **Todos** e seu funcionamento original.
  Tooltips inferiores ajustam a largura ao conteúdo, até 280px ou o espaço
  da tela com margem de 8px, preferindo uma linha sem cortar texto nas bordas.

- Botões devem possuir variantes: primário, secundário, discreto e destrutivo.
- Inputs, selects, textareas, checkboxes, datas e moeda devem convergir para
  componentes compartilhados conforme forem introduzidos.
- Badge expressa estado curto; não funciona como botão sem semântica interativa.
- O selo de perfil atual da Gestão usa `app/components/SeloPerfilEmUso.tsx` e a
  classe compartilhada `avanta-perfil-em-uso` de `app/globals.css`; o renderizador
  imperativo Mobile usa o mesmo contrato de HTML/CSS. Superfície branca opaca,
  tinta institucional, confirmação e contorno claro/escuro independem da cor do
  perfil. No Web, o selo é irmão do botão desativado, ligado por
  `aria-describedby`, para não herdar sua opacidade. Não é clicável nem animado.
- Tabela fornece cabeçalho, vazio, carregamento e comportamento responsivo.
- Modal fornece título, fechamento acessível, foco inicial e restauração do foco.
- `ModalConfirmacao` aceita `centralizarTexto` opcional para centralizar cabeçalho e mensagem no consumidor; ausente, mantém alinhamento anterior. Mensagem vazia durante progresso usa o título como nome acessível.
- `ModalConfirmacao` aceita `mostrarProgresso` para indicador oficial e status acessível durante a operação, e `ocultarCancelar` para resultado com uma ação de fechamento. São opções locais; sem elas os demais fluxos permanecem iguais. Durante o envio, Escape/clique externo continuam bloqueados e o foco permanece no modal.
- `CardExpandidoModal` aceita `variante="avisos"` para o painel compacto do cabeçalho, com a geometria do painel de avisos da Gestão (fundo translúcido, superfície arredondada, borda e sombra). `darkMode` resolve a superfície dessa variante; a apresentação centralizada anterior permanece padrão. Mantém Escape, clique externo, contenção e restauração de foco. Primeira reutilização: pendências de Marketplaces.

### Campo de data

- Reutilizar `app/components/CampoData.tsx` para calendário nativo com apresentação estável entre navegadores. O controle mantém valor ISO, validação required/min/max, teclado e associação ao label; a apresentação visual não depende do formato por extenso do Safari/iOS nem participa do tamanho intrínseco do input nativo.
- O padrão continua dd/MM/aaaa. Usar `anoCurto` somente em contexto que solicite dd/MM/aa (Marketplaces/AvantaPreços); não altera o século salvo. Não reproduzir o campo em módulos. Cores/foco/tamanho usam variáveis `--av-date-*`, com 44px no web e 48px no mobile.

### Campo de busca

- Todo campo destinado a pesquisar cadastros, listas ou resultados deve usar
  `app/components/CampoBusca.tsx` quando estiver em React. O componente mostra
  o botão `×` no canto direito somente enquanto existir um termo digitado;
  acioná-lo limpa o campo sem alterar os demais filtros.
- A comparação deve usar `normalizarTexto` ou `correspondeBusca` de
  `app/lib/formatters.ts`: acentos, cedilha, caixa e espaços repetidos não
  diferenciam resultados. O texto salvo nunca é modificado por essa regra.
- Em superfícies fora de React, preservar o mesmo contrato funcional e o nome
  acessível **Limpar pesquisa**. Buscas remotas também precisam normalizar no
  servidor/banco antes de filtrar, sem depender apenas da lista já carregada.

### Acesso e autenticação mobile

Este padrão vale para os cards de **login, cadastro e recuperação de acesso**
dos aplicativos e PWAs AvantaLab. Deve ser reutilizado em novos aplicativos;
não criar uma escala de botões local para autenticação.

O contrato funcional completo é obrigatório e está em `autenticacao.md`,
incluindo Google, Apple, Web/PWA, Capacitor, deep link, cancelamento, sessão e
testes. Esta seção resume apenas a face dos controles.

- A face visual dos botões de ação de acesso tem **32 px** de altura e raio de
  10 px. O alvo de toque continua com pelo menos 44 × 44 px, usando área
  interativa ou espaçamento interno sem aumentar visualmente a face do botão.
- **Entrar**, **Continuar** e a ação primária usam `#1687D9`, o mesmo azul do
  seletor de método ativo (E-mail/Telefone), com texto branco.
- **Continuar com Google** usa superfície branca, borda `#d9e0e4`, texto
  `#334155` e a marca Google. **Continuar com Apple** usa `#111827` com texto
  branco e o símbolo Apple. Ambos mantêm a mesma altura visual da ação primária.
- Os três botões ficam em largura integral, em coluna e com espaçamento de 8 px.
  O carregamento troca somente o rótulo por `Conectando…`/`Entrando…`, desabilita
  as ações concorrentes e nunca deixa o card sem resposta após erro ou cancelamento.
- Não usar o azul escuro institucional como ação de entrada mobile quando este
  padrão estiver aplicado; ele continua disponível para ações primárias de
  outros contextos.

### Botão de próxima rolagem

- Reutilizar `app/components/BotaoProximoScroll.tsx`; não copiar sua marcação,
  animação ou lógica para componentes locais.
- Na página, o botão pode avançar por destinos identificados e, no último
  acionamento, leva ao fim real do conteúdo.
- Dentro de uma área rolável, usar `modo="container"` e fornecer a referência da
  área; o avanço ocorre em blocos proporcionais à altura visível.
- No modo `container`, o controle é flutuante e acompanha o trecho da área
  rolável que estiver visível na tela. Ele permanece centralizado na largura do
  container e limitado às suas bordas, inclusive quando o card muda de altura.
- A distância inferior padrão no modo `container` é de 28 px, preservando o
  rodapé do card. Só informar `distanciaInferior` quando uma especificação
  aprovada exigir outro afastamento.
- Só aparece quando existe conteúdo abaixo, desaparece ao chegar ao final e
  reaparece quando o usuário volta a rolar para cima. Quando o próprio container
  sai da área visível da tela, o botão também desaparece.
- A landing page é a referência visual oficial: círculo translúcido, seta
  geométrica, movimento discreto e respeito à preferência de movimento reduzido.
- Usar apenas quando a rolagem assistida facilitar uma área longa ou quando for
  solicitada; o botão não substitui a rolagem nativa.

### Ações por voz com IA

- Reutilizar os ativos e o contrato em
  `app/padrao-avanta/acoes-por-voz/`; não copiar controlador, estilos, cards ou
  movimentos para o módulo consumidor.
- Em telas React, usar `AvantaVoiceActionDock.tsx` e reservar no layout a faixa
  onde o conjunto botão + texto será centralizado.
- O componente compartilhado controla captura, estados, dúvida contextual,
  escolha manual, confirmação, persistência e feedback. O módulo fornece somente
  o adaptador autenticado para transcrever, resolver e executar suas funções.
- O acionador permanece imóvel em todos os estados. A onda reage ao volume real,
  sem animação na ausência de voz e sem revelar recorte quadrado.
- Alterações exigem confirmação; o sucesso usa o aviso inferior padrão e oferece
  comprovante quando houver. Pendências ficam separadas de uma nova gravação.
- O contrato completo, textos, segurança, catálogo e matriz de testes estão em
  `acoes-por-voz.md`.
- Em fluxos de voz, uma resposta curta complementa a dúvida aberta; uma nova
  solicitação completa substitui o rascunho atual sem acumular dados antigos.
- O microfone de uma pergunta permanece dentro do card enquanto a resposta é
  gravada, transcrita e interpretada, sem fechar ou deslocar o contexto atual.
- O adaptador pode desativar **Salvar para depois** quando o módulo não oferece
  retomada de pendências e pode compactar listas curtas sem rolagem interna.

### Recolher e expandir blocos

- Reutilizar `app/components/BotaoExpandirCard.tsx`, com `variante="painel"`
  e `modo="lista"`, para recolher conteúdo no cabeçalho de blocos gerais.
  `contexto` identifica o bloco no nome acessível; `controlsId` associa o
  acionador ao conteúdo. O controle mostra Recolher/Expandir, possui alvo de
  48px e recebe `corPrimaria` e `darkMode` do shell.
- Ocultar com `hidden` quando for necessário preservar edição/filtros montados.
  Manter o título e o acionador disponíveis; recolher não cancela operações.
  As variantes existentes de cabeçalho e rodapé mantêm seu comportamento.
- A opção `somenteIcone` em `variante="painel"` remove apenas rótulo visual,
  borda e fundo: seta para cima/baixo, alvo de 48px, tooltip, nome acessível,
  foco e `aria-expanded`/`aria-controls` permanecem. Usada em Contas conectadas
  de Marketplaces; o padrão dos demais consumidores não muda.

### Blocos reordenáveis — AvantaKanban

- Reutilizar `app/components/AvantaKanban.tsx` para blocos React empilhados;
  recebe `items` com `id`, `title` e `render(handle)`, `order` controlada,
  `onOrderChange` e `disabled`. Inserir o handle no cabeçalho existente.
- Seguir `planejamento/padrao-avanta-kanban.md` e o núcleo de `app/lib/dnd.ts`:
  slots capturados uma vez, histerese oficial, cópia inerte transparente,
  vizinhos por transformações e atualização única da ordem ao concluir.
  Alturas diferentes usam o retrato inicial para evitar sobreposição.
- O acionador de seis pontos tem 48px, teclado por setas/Início/Fim,
  instruções, foco preservado, retorno por Escape/cancelamento e suporte a
  movimento reduzido. A cópia não monta componentes nem dispara consultas.
- Persistência pertence ao módulo; em Marketplaces é local, versionada,
  validada, separada por usuário/empresa e gravada apenas após concluir.
  Preferência inválida retorna à ordem padrão; falha ao salvar é informada.

## Estados assíncronos

- LoadingPontos compartilhado: dez pontos em onda, cor contextual, 140 × 50px ou compacto 48 × 20px; permanece animado inclusive com reduzir movimentos ativado por solicitação expressa do responsável. Exceção restrita ao loading. Sem vídeo, rede ou temporizador por quadro. Aplicação inicial no acesso Web e CarregamentoDadosModulo, sem conversão automática de outras famílias.
- Aplicação inicial em acesso Web e nas três variantes de CarregamentoDadosModulo. Voz, facial, SDK, gestos e aplicativos imperativos não são convertidos automaticamente. Manter preparação contínua até o gate real concluir, sem remover autorização ou recuperação.

### Detalhes com rolagem independente

- A ficha de produto em foco mantém sua identificação 8px abaixo da navegação visível. O controlador de alinhamento em `scroll-panel-row.ts` acompanha rolagem externa, foco, redimensionamento e mudanças de layout enquanto expandida, sem alterar a rolagem interna nem disputar foco com confirmações. Alinhamento é imediato; recolher/desmontar remove observadores e eventos.

- `ModuloHeader` aceita `productFocusNavigation` optativo em Marketplaces. Cabeçalho, seletor e atalhos marcados com `data-product-focus-navigation` ficam acessíveis durante o foco da ficha, inclusive em wrappers; o bloqueio isola os demais ramos e permite rolagem dentro da navegação. Não altera bloqueios de confirmação ou de operação em andamento.

- Nas fichas de Produtos cadastrados/Estoques, o modo de foco solicitado pelo responsável reutiliza `ativarFocoProduto` de `app/lib/foco-produto.ts`: mantém geometria, bloqueia rolagem/interação externa e restaura o estado anterior ao recolher/desmontar. O conteúdo rolável usa `data-product-scroll`; confirmações continuam disponíveis. Recolher desmonta rascunhos não salvos, nunca cancela uma escrita em andamento. Sem textos adicionais. `BotaoExpandirCard` aceita `destaque` optativo para pílula na cor do perfil somente quando há rótulo; `somenteIcone` não muda. Os demais consumidores de detalhes mantêm a página livre.

- Reutilizar `app/components/DetalhesRolaveis.tsx` para detalhes expandidos cuja identificação deve ficar fora da rolagem. Recebe o ID do cabeçalho existente, rótulo acessível e conteúdo, mantendo 100% da largura. Mede a altura disponível após a navegação e o cabeçalho; responde a resize, viewport móvel e mudança de altura da identificação, sem remontar formulários ou disparar consultas.
- A região aceita teclado e rolagem própria, contém o encadeamento vertical e não bloqueia a página. Em zoom/telas muito baixas mantém uma área mínima alcançável pela rolagem externa; impressão expande todo o conteúdo. Primeira aplicação: produtos cadastrados, estoque, anúncios e vendas de Marketplaces.

### Instalação PWA junto ao acesso

- Componente compartilhado `app/components/InstalarPwa.tsx`, com `useInstalacaoPwa` em `app/hooks/`, oferece instalação por gesto e instruções por plataforma. Montar o controlador desde a entrada da página para capturar `beforeinstallprompt` durante a preparação do login; renderizar a ação abaixo do card, fora do formulário.
- Reutiliza BotaoAcaoCompacto; standalone/appinstalled ocultam o botão. Aceite do prompt não confirma instalação, cancelamento não declara sucesso e falha/timeout preservam login e permitem instruções. iPhone não tenta instalar por API inexistente; orienta Safari/Compartilhar/Adicionar à Tela de Início. Primeira aplicação: AvantaPreços. Não migra automaticamente os outros fluxos de acesso.

- Gestão Web: atualização do financeiro não cobre o cabeçalho nem impede trocar abas. A região de dados usa `aria-busy`/`inert`, com mensagem local e recuperação em erro. Trocas reais de contexto limpam dados anteriores; respostas de gerações antigas são descartadas. Resumos secundários não bloqueiam a carga principal. Autenticação, autorização, plano e cadastro obrigatório não são dispensados por essa otimização.

- Na preparação autenticada, manter a estrutura real da página do módulo ao fundo, com camada translúcida e conteúdo não interativo (`inert`) até pronto. Não substituir a página por arte de login ou um fundo opaco. Antes de resolver o acesso em uma abertura direta, não montar conteúdo protegido; a prévia interna nunca autoriza dados ou operações.

- Preparação de módulos usa `CarregamentoDadosModulo`; `TransicaoNavegacaoInterna` reutiliza o mesmo card antes de montar o módulo. Título “Preparando [módulo]”, mensagem “Carregando os dados do módulo…”, cor/tema do perfil, status acessível e movimento reduzido. Não reutilizar a cena de login para essa etapa.
- `CarregamentoDadosModulo` aceita `escurecerFundo` opcional na camada de preparação: leve fundo escuro também no tema claro. Sem a opção, mantém a apresentação anterior; variantes locais não mudam. Usado ao localizar o destino de Conferir e ajustar em Marketplaces, com término confirmado ou recuperação de falha.
- Confirmar o contexto visual não recria repositórios da mesma empresa nem reinicia uma preparação já concluída. Atualizações em segundo plano preservam o conteúdo; mudança real de empresa deve preparar os novos dados sem mostrar dados do perfil anterior.

- Desabilitar submissão duplicada e indicar ação em andamento.
- Skeleton representa estrutura; spinner representa espera localizada.
- `CarregamentoDadosModulo` aceita `variante="local"` para espera centralizada dentro do conteúdo de um card, sem overlay nem bloqueio da página. Reutiliza círculo, cor do perfil, status acessível e movimento reduzido; a variante padrão de preparação do módulo permanece inalterada.
- A variante `local` destaca a mensagem em 16–18px, LoadingPontos e superfície suave na cor do perfil; `esqueletos` adiciona três prévias decorativas de linhas. Após oito segundos informa demora; o timer é limpo ao encerrar/trocar a carga. Não bloqueia controles nem representa progresso percentual.
- A variante `indicador` reutiliza LoadingPontos compacto, com nome acessível, sem mensagem visual ou altura mínima de card. Destinada à espera compacta no centro de cabeçalhos, como Contas conectadas; o consumidor reserva posição sem cobrir ações.
- Erro deve oferecer recuperação quando possível.
- Sucesso não deve depender exclusivamente de cor ou desaparecer antes da leitura.

### Importação compacta de catálogo

- `CardExpandidoModal` oferece `variante="compacto"` optativa: largura máxima de 480 px, altura limitada à viewport, rolagem e os mesmos controles de foco/Escape. Demais variantes permanecem iguais.
- `ProductPhotoInput` de Marketplaces aceita `compacto` para botão Adicionar em uma célula da galeria, preservando arraste, arquivo, validação, estados e mensagens.
- Importar é a própria confirmação do card. Padrão do catálogo e Personalizar fotos são escolhas explícitas; fotos têm remoção acessível e clique para capa, sem novo modal intermediário.

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

- Botões devem possuir variantes: primário, secundário, discreto e destrutivo.
- Inputs, selects, textareas, checkboxes, datas e moeda devem convergir para
  componentes compartilhados conforme forem introduzidos.
- Badge expressa estado curto; não funciona como botão sem semântica interativa.
- Tabela fornece cabeçalho, vazio, carregamento e comportamento responsivo.
- Modal fornece título, fechamento acessível, foco inicial e restauração do foco.

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

## Estados assíncronos

- Desabilitar submissão duplicada e indicar ação em andamento.
- Skeleton representa estrutura; spinner representa espera localizada.
- Erro deve oferecer recuperação quando possível.
- Sucesso não deve depender exclusivamente de cor ou desaparecer antes da leitura.

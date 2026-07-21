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

### Botão de próxima rolagem

- Quando o usuário solicitar um botão circular para avançar a rolagem, reutilizar
  `app/components/BotaoProximoScroll.tsx`; não recriar uma variação local.
- Padrão visual: círculo translúcido de 40×40 px, com área real de toque de
  44×44 px, seta SVG geométrica centralizada e posição central no limite
  inferior da viewport.
- Enquanto a página ou painel rola, o botão desaparece. Após 180 ms sem novo
  movimento, retorna com fade-in. Ele some ao chegar ao final e reaparece ao
  haver conteúdo abaixo.
- Cada toque avança aproximadamente 84% da área visível e o último toque vai ao
  fim. Em painéis com rolagem própria, informar `scrollContainerRef`.
- O círculo realiza um salto leve e espaçado para indicar a ação. A animação e
  as transições são removidas quando o aparelho solicita redução de movimento.
- Use `distanciaInferior` somente quando um rodapé fixo exigir afastamento
  adicional. Preserve o padrão visual e o rótulo acessível.

## Estados assíncronos

- Desabilitar submissão duplicada e indicar ação em andamento.
- Skeleton representa estrutura; spinner representa espera localizada.
- Erro deve oferecer recuperação quando possível.
- Sucesso não deve depender exclusivamente de cor ou desaparecer antes da leitura.

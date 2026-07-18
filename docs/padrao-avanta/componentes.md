# Componentes oficiais

## Regra geral

Antes de criar um componente, buscar implementação equivalente em `app/components`
e no design system. Quando faltar uma abstração recorrente, criá-la de forma
compartilhada e documentá-la aqui; não copiar marcação entre módulos.

## Cards

- Todo card novo usa `AvantaCard`/AvantaShell.
- Título fica na CHAPA; controles ou metadado curto ficam no PLATÔ; conteúdo fica
  no CORPO.
- A curva é o path SVG oficial. Não reconstruir com CSS.
- A skin deriva de `corPrimaria` e tema; a estrutura não fixa paleta.
- Ler a especificação completa em `planejamento/padrao-avanta-card.md`.

Não transformar em card: barra simples de filtros, aviso curto, linha de tabela,
divisor ou agrupamento sem identidade própria.

## Controles

- Botões devem possuir variantes: primário, secundário, discreto e destrutivo.
- Inputs, selects, textareas, checkboxes, datas e moeda devem convergir para
  componentes compartilhados conforme forem introduzidos.
- Badge expressa estado curto; não funciona como botão sem semântica interativa.
- Tabela fornece cabeçalho, vazio, carregamento e comportamento responsivo.
- Modal fornece título, fechamento acessível, foco inicial e restauração do foco.

## Estados assíncronos

- Desabilitar submissão duplicada e indicar ação em andamento.
- Skeleton representa estrutura; spinner representa espera localizada.
- Erro deve oferecer recuperação quando possível.
- Sucesso não deve depender exclusivamente de cor ou desaparecer antes da leitura.

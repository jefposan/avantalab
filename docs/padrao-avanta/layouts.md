# Layout, posicionamento e responsividade

## Estrutura de página

- Usar uma casca de página consistente, com título, descrição opcional e ação
  principal.
- Conteúdo deve respeitar largura máxima legível e padding lateral responsivo.
- Espaço entre seções principais: 24px.
- Conteúdo interno de card: 24–32px no web e 20px no mobile, salvo componente
  oficial com medida própria.

## Ações

- Ação principal no final da leitura: à direita no desktop e largura total quando
  necessário no mobile.
- Ordem usual: cancelar/voltar antes de confirmar/continuar.
- Ação destrutiva separada visual e espacialmente das ações comuns.
- Não depender apenas de ícone; fornecer nome acessível e tooltip quando útil.

## Formulários e filtros

- Label acima do campo.
- Filtros aparecem antes do resultado e preservam uma ordem estável.
- Em mobile, controles quebram para uma coluna sem rolagem horizontal.
- Tabelas podem rolar horizontalmente, mas ações e identificação essenciais devem
  permanecer compreensíveis.

## Estados e camadas

- Carregamento, vazio, erro e conteúdo devem ocupar uma região previsível.
- Modal web usa a infraestrutura compartilhada; respeitar viewport e bloqueio de
  scroll.
- Bottom sheet mobile mantém cabeçalho e ações críticas acessíveis.
- Definir `z-index` por camada do sistema, não por competição de números locais.

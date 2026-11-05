# Marketplaces — Navegação com ficha expandida

Versão local: 3.2.0.49. PADRÃO AVANTA 1.21.0.

Publicação não autorizada: aguardar novo pedido expresso do responsável. Nenhum envio à Vercel ou alteração de banco nesta entrega.

## Comportamento

- Expansão por si só não bloqueia conta, filtro, ordenação, paginação, atualização nem seleção de estoque.
- Ação externa recolhe fichas no mesmo clique e mantém a execução original. Outro anúncio/produto substitui o anterior.
- Ações/campos internos preservam a própria ficha; diálogos e portais não são desmontados por esse fluxo. Clicar em pesquisar referência recolhe a ficha do produto antes da pesquisa.
- Recolher não grava alterações não confirmadas. Gravações/sincronizações reais mantêm os bloqueios necessários; atualizações automáticas continuam preservando a ficha em revisão.
- Eventos restritos à empresa, com identificação distinta por lista/estoque/produto. Não executam comandos de banco ou marketplace.

## Verificações

- 716 testes de Marketplaces aprovados; testes direcionados também verificam diálogos, portais, ação interna, botão desabilitado, outra empresa e operação em andamento.
- PADRÃO AVANTA e Ava aprovados para 3.2.0.49.
- Checagem global de tipos encontrou arquivos gerados preexistentes em `.next/dev` e `outputs/` fora desta alteração. TypeScript aprovado sem erros em cópia isolada baseada na entrega 3.2.0.48, sem esses arquivos.

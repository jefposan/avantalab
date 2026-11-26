# Abertura local de Vendas e Custos — 26/11/2026

Comparação no localhost:3000 com a empresa Tridium, sessão autenticada e dados reais. Sem publicação, transmissão fiscal ou escrita de dados de teste.

## Medições

Cronômetro externo ao documento, do início da navegação até título da Visão geral visível e ausência do indicador Preparando. Rotas compiladas, mesma aba de validação; valores incluem navegação e consultas de dados.

| Situação | Custos e Precificação | Vendas e Serviços |
| --- | ---: | ---: |
| Antes do ajuste desta comparação | 4.045 ms | 9.058 ms |
| Cadastro, catálogo e resumos em paralelo, primeira conferência | — | 8.260 ms |
| Conferência final com compilação pronta | 5.103 ms | 6.534 ms |

São amostras locais, não percentis nem garantia de latência. As chamadas ao Supabase e à ponte local de dados reais variam. Um reinício automático do Next por limiar de memória interrompeu uma tentativa; ela e as cargas de recompilação foram descartadas.

## Ajuste aplicado

As APIs de cadastro, catálogo, permissões e resumos validam o acesso individualmente. Antes, cadastro empresarial era aguardado antes de iniciar as demais leituras. Agora as consultas independentes começam juntas; a página só aparece após as respostas essenciais e a confirmação de renderização. Estoque, clientes, fornecedores e detalhes fiscais permanecem em segundo plano após a apresentação.

Vendas ainda inicializa a tela em iframe e consulta operações e recebimentos para seus indicadores. Esses passos não existem da mesma forma em Custos. Uma evolução maior seria fornecer resumos agregados por uma API própria, evitando transferir históricos completos para montar a Visão geral; isso não foi incluído nesta correção.

## Verificação

Testes direcionados da preparação inicial, checagem TypeScript, PADRÃO AVANTA e Ava. Código espelhado no checkout que atende localhost:3000. Produção preservada.

# Publicação autorizada — 3.2.0.53

Identificação: **3.2.0.53 — Marketplaces: navegação sem bloqueios por ficha expandida, paginação ao topo, venda/devoluções separadas e estoques agrupados com cores sóbrias.**

PADRÃO AVANTA 1.21.0. Ajustes locais 3.2.0.49–3.2.0.53 autorizados para envio em 21/10/2026. Revoga somente para esta entrega a orientação anterior de não publicar sem novo pedido.

## Escopo

- Ação externa recolhe ficha expandida e executa no mesmo clique. Campos internos e modais são preservados; gravações e sincronizações reais continuam protegidas.
- Próxima/Anterior carregam a página e levam ao topo do card correspondente, com foco no título, cabeçalho fixo e movimento reduzido respeitados. Web e catálogo do AvantaPreços.
- Venda confirmada/cancelada sem contador de devolução zero. Devoluções reais em seção própria, separada da situação e do motivo de cancelamento.
- Seleção e ações dos estoques agrupadas; paleta sóbria estável, contraste verificado, sem configuração personalizada de cor. Etiquetas de vendas diretas reutilizam a paleta.
- Sem nova migração, alterações de saldos, anúncios ou vendas nesta publicação.

## Entrega

Pacote isolado baseado na entrega 3.2.0.50, que já inclui 3.2.0.49 e a base 3.2.0.48. Aplicar somente os arquivos das entregas 3.2.0.51–3.2.0.53 e os registros/documentos revisados. Não publicar o checkout compartilhado inteiro.

Vercel deve receber `avantaVersion`, `avantaSummary` e `avantaRelease` como metadados descritivos, sem inventar commit ou hash de Git. Registrar o identificador/URL devolvidos pela Vercel junto a este resumo. Promoção automática após build aprovado; comunicar envio e estado real sem esperar a conclusão.

Verificação do pacote: 722 testes de Marketplaces aprovados; TypeScript sem erros; PADRÃO AVANTA e Ava aprovados. Onze arquivos centrais dos ajustes conferidos com a origem; Gestão Mobile e AvantaVendas preservados por comparação de hashes. Conferência Vercel sem `.env`, saídas locais ou dependências no pacote.

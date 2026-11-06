# 3.2.0.316 — Vendas e Serviços: itens compactos e pedidos com estoque opcional

Base: produção 3.2.0.315, dpl_ER69iWxTBaS9zeWgZhtALHFNdLfQ.

Escopo: item compacto com nome completo e subtotal destacado; escolha de controle de estoque por pedido integrada até a persistência; correção da leitura de datas válidas no faturamento. Sem alteração de banco, permissões, identidade nativa ou ambiente fiscal.

Validações locais: PADRÃO AVANTA 1.23.1 e Ava aprovados; quatro testes específicos e 498 testes de segurança aprovados. PostgreSQL em memória utiliza a migração e os repositórios reais: saldo zero, confirmação, separação, faturamento, parcela e rascunho fiscal, idempotência e ausência de reserva/baixa. Com controle ligado, saldo insuficiente permanece bloqueante.

Interface real local conferida em 1920, 1280 e 390 px: linha única quando há espaço e reorganização sem transbordamento quando estreita. Usados somente dados fictícios; nenhum pedido real salvo nem documento transmitido à SEFAZ. NF-e permanece exclusivamente em homologação e sujeita às demais validações fiscais.

Publicação autorizada pelo titular em 05/11/2026. Build completo remoto obrigatório; promoção automática somente após aprovação. Recibo final: output/pipeline na raiz compartilhada.

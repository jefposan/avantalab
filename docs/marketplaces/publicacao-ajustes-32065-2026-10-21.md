# Publicação 3.2.0.65 — situação automática dos anúncios e rodapé

PADRÃO AVANTA v1.21.0. Publicação autorizada pelo responsável em 21/10/2026.

- IDs conhecidos são relidos independentemente da busca do Mercado Livre; exclusão exige resposta confirmada, nunca ausência/404.
- Cursor por conta, lotes de oito, lease e rodízio no worker existente. Agendamento de produção conferido ativo a cada 30 segundos. A tela também reconfere enquanto visível, sem trocar uma edição aberta.
- Falha isolada preserva os dados e não bloqueia outros IDs/contas. Aviso parcial só encerra após ciclo íntegro. Pedidos em andamento ficam separados da situação real do anúncio.
- Rodapé institucional pendente incluído; demais módulos Web revisados sem duplicar o rodapé hospedeiro. Sem mudança dos PWAs/nativos.
- Pacote isolado parte da entrega local do rodapé, que consolida Marketplaces 3.2.0.62 com a correção AvantaVendas av191. Nenhum arquivo de outra frente de trabalho deve ser publicado por engano.
- Migração aditiva `20261022020000_marketplace_listing_status_checks.sql`: tabela vazia privada de controle de progresso, sem saldo/venda/cadastro regravado, sem pausas em massa e sem interromper worker.

Validação e recibos finais em `/private/tmp/avanta-release65-manifest.json` e `/private/tmp/avanta-release65-status.json`. Envio e build não equivalem a publicação; promoção automática somente após build aprovado.

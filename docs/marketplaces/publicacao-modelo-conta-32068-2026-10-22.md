# 3.2.0.68 — Marketplaces: identificar modelo da conta ML e enviar title ou family_name

Publicação autorizada somente do sistema em 22/10/2026. Nenhum produto real deve ser publicado ou alterado nos testes. PADRÃO AVANTA v1.21.0.

Antes de validar/publicar, o servidor consulta GET /users/{seller_reference} usando a autorização da conta de destino. Confere identidade e formato das tags; user_product_seller seleciona family_name e omite title. Conta sem essa tag usa title e omite family_name. A consulta é feita por tentativa, sem inferir modelo do produto ou anúncio de origem, nem usar configuração antiga da conexão.

Falha na consulta, identidade divergente ou tags inválidas interrompem antes de POST /items/validate, criação do anúncio ou gravação de publicação. O mesmo corpo aprovado no validador é usado no envio final, sem fallback/repetição automática de POST /items. Estoque e demais regras de publicação continuam preservados.

Referências oficiais consultadas: https://developers.mercadolivre.com.br/pt_br/publicacao-de-produtos/user-products e https://developers.mercadolivre.com.br/pt_br/guia-para-produtos/preco-variacao . Conteúdo oficial indexado confirma identificação por tag e uso exclusivo de family_name no novo modelo.

Diagnóstico da 3.2.0.67 preservado; body.required_fields com propriedade family_name citada somente na mensagem passa a identificar nome/título. Testes com HTTP e banco simulados incluem modelo legado, UP, troca de conta, mudança de modelo, cópia, falhas e persistência de estoque.

Pacote isolado parte da produção 3.2.0.67, com identidade Git configurada a partir da configuração local já existente no repositório antes do commit. Versão e resumo nos metadados Vercel; promoção automática após build aprovado. Nenhuma migração, mudança de plano/permissão, sessão ou publicação de produto real. Manifesto: /private/tmp/avanta-release68-manifest.json. Recibo: /private/tmp/avanta-release68-status.json. Enviado/em build não significa publicado.

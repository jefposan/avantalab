# 3.2.0.83 — AvantaPreços: pesquisa econômica com preço e disponibilidade na origem

Entrega autorizada: somente GPT-5.4 mini, até cinco candidatos e conferência independente de preço/estoque em Product/Offer JSON-LD ou microdados. Valores da IA não entram no cálculo. Pausados, sem estoque, variante divergente, página bloqueada ou sem dados suficientes são descartados; referência anterior permanece quando não há oferta válida.

Inclui os controles locais .80: cache de descoberta por seis horas, limites 5/min usuário, 30/h e 100/24h empresa, reserva atômica, consumo registrado e cancelamento propagado sem garantia de estorno. Cache relê as origens antes de aceitar preços. Não há fallback 5.5.

Avaliação real: mini descobriu a página da calculadora Elgin MB7142 na Tek Distribuidor; servidor confirmou R$ 802,59 à vista e disponibilidade. A página da loja conferida separadamente contém esse valor, sem confundir com o preço de cartão R$ 891,77 ou a parcela. Chaleira sem prova, página de categoria, anúncio problemático do ML e voltagem impossível não entraram no cálculo. Leitura direta adicional confirmou R$ 759,81 na Utiland e R$ 970,73 na Papelaria Toledo.

Fontes bloqueadas ou sem estrutura verificável podem diminuir a cobertura; não são contornadas. A disponibilidade é a declarada pela loja no instante da leitura, sem garantir entrega em qualquer CEP ou fixar preços futuros. Alguns retornos OpenAI incluem abertura de página além das duas buscas solicitadas; registrar todas as ações, sem prometer custo fixo.

Pacote isolado baseado na .79, sem AvantaVendas av192/av193 e sem mudanças de autenticação fora do escopo. Nova dependência parse5 8.0.0; nenhum JavaScript das lojas é executado. Proteções SSRF, DNS fixado no socket, limites de bytes/tempo/descompressão e redirecionamento. Nenhum anúncio/produto publicado, pausado, removido ou alterado nos testes.

Migração necessária: `20261022200000_marketplace_price_ai_controls.sql`, tabela com RLS e RPCs somente service_role; sem alterações nos cadastros/saldos existentes. Execução e publicação somente após validação, com recibo local e promoção automática após build aprovado. Enviado/em build não significa publicado.

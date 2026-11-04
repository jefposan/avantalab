# EAN abaixo da descrição no pedido

Revisão local 3.1.0.57, PADRÃO AVANTA 1.20.0. Não publicada.

Cada item do pedido apresenta descrição/quantidade/preço e uma linha menor logo abaixo com EAN. Ausência de código válido mostra Não informado; falha da leitura complementar mostra Indisponível no momento e conserva a venda visível. SKU não vira EAN. Código passa por validação GTIN, mantendo zeros iniciais.

Pedidos salvos têm referências de inventário. Elas só são alinhadas aos itens quando todas as linhas do próprio pedido coincidem em título, quantidade e posição; caso divergente não infere identidade por nome. A leitura complementar usa ID do anúncio e conta exatos, limitada à empresa autorizada e Mercado Livre, em lotes de até 100 IDs por conta. Variação exige seu próprio EAN; não usa o código do pai. Código já confirmado no item é preservado. Não pesquisa internet, não altera pedido/estoque/anúncio nem grava enriquecimento. Trata-se do código disponível no catálogo salvo correspondente, não de uma afirmação sobre o GTIN histórico na data da venda.

Complemento limitado a 5 segundos no conjunto da listagem; ao esgotar o orçamento, conserva vendas e indica indisponibilidade somente no EAN. Não inicia consultas extras após o limite nem adiciona uma espera por produto.

Consulta pontual somente leitura do pedido 2000019047767022 da captura: item sem EAN no snapshot, referência MLB5328839535 e anúncio da mesma empresa/conta com GTIN 8720389031151, sem variações. Nenhum dado foi alterado. A nova leitura recupera esse código sem exigir ressincronização da venda.

Lista e atualização de pós-venda usam o mesmo enriquecimento, para não perder o código ao abrir detalhes. Não altera processamento/baixa de estoque, IDs dos pedidos, quantidade, preços, etiquetas ou permissões. Outros marketplaces mantêm a mesma apresentação quando houver EAN no item, sem fabricar código.

Quatro testes de renderização, identidade/isolamento, variações, ausência e falha complementar aprovados. Suíte completa com 1.382 aprovados, zero falhas. Lint sem erros (um aviso pré-existente do logo img em Vendas), tipagem e verificadores PADRÃO AVANTA/Ava aprovados. Prévia `/marketplaces/validacao-pedido-ean` disponível somente em desenvolvimento, com primeiro produto baseado na captura e segundo item fictício. Sem dados de comprador, autenticação ou pedido real modificado.

Temas claro/noturno conferidos no componente real. Evidência: `output/marketplaces/pedido-itens-ean-57.jpg`. A versão publicada continua 3.1.0.56; este ajuste de EAN do pedido permanece local até nova autorização de publicação.

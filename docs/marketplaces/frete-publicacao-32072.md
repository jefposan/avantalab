# 3.2.0.72 — Conferência de frete antes de publicar

Novo anúncio → selecionar conta, produto, categoria, preço, tipo, Mercado Envios e condição. O grupo **Frete do anúncio** consulta as condições da conta de destino e o custo estimado para o vendedor por unidade. Frete grátis significa grátis para o comprador, não custo zero para o vendedor.

- `mandatory`: marcado e bloqueado, “Obrigatório pelo Mercado Livre”.
- `optional`: escolha do usuário; estimativa considera a opção marcada/desmarcada.
- `not_allowed`: desmarcado e bloqueado, indisponível nesta modalidade.
- Regra não confirmada: tentar novamente; não liberar publicação por suposição.
- Custo indisponível: nunca transformar em zero. Nova consulta ou ciência explícita antes de publicar. Zero somente quando retornado como número válido em BRL.

O custo usa embalagem informada, atributos SELLER_PACKAGE_* do cadastro ou dimensões padrão da categoria, sempre identificando a origem. Não inferir a caixa por HEIGHT/WIDTH do produto. A seção de medidas serve à simulação, não substitui os atributos obrigatórios do anúncio. O valor final pode variar conforme o envio.

Consulta somente quando os parâmetros necessários existem, com debounce e cancelamento local de resposta antiga. Alterar preço, conta, produto, categoria, condição ou embalagem invalida a conferência. A assinatura de dez minutos verifica empresa, conta/vendedor, produto, parâmetros e atributos recarregados no servidor; não é persistida no cadastro. Ciência do custo indisponível não autoriza ignorar regra desconhecida.

Endpoints oficiais: POST `/users/{seller}/shipping_modes` (simulação com `X-Format-New: true` e `x-multichannel: true`), GET `/categories/{category}/shipping_preferences`, GET `/users/{seller}/shipping_options/free` com dimensions e free_shipping explícitos. Não usar o item de outro vendedor para estimar.

Documentação: [regras de envio](https://developers.mercadolivre.com.br/en_us/ship-products), [custos de envio](https://developers.mercadolivre.com.br/pt_br/produto-consulta-de-usuarios/custos-de-envio).

API interna `POST /api/modulos/marketplaces/publicar/frete` exige sessão e permissão manage da empresa e reconfirma a origem do produto. Não chama POST /items, nem grava produto, estoque ou auditoria de publicação. Publicação real continua explícita no botão Publicar, com revisão válida e pré-validação ML. Exigência nova de frete obrigatório interrompe para recalcular; nunca criar silenciosamente com outro custo.

Validação desta entrega exclusivamente com mocks de rede, sem novo produto publicado e sem alteração de anúncio existente. Sem migração ou mudança de plano/permissão.

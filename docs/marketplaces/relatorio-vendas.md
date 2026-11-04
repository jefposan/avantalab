# Estabilidade após conferência real — 3.2.0.219

A consulta em produção da 3.2.0.218 retornou taxas/fretes completos dos 25 pedidos confirmados de ML em outubro: bruto R$ 10.866,03; taxas R$ 1.717,06; frete R$ 995,21; líquido R$ 8.153,76. Amostras por pedido conferidas na lista. Nenhuma alteração de chave foi necessária em produção.

A sincronização inicial ainda provocava releituras e reinício visual da apuração/lista. A correção preserva apuração confirmada para o mesmo resumo e usa acumuladores novos, sem somar uma passagem em outra. Só troca o conjunto retido ao concluir a nova passagem; escopo/totais diferentes limpam resultados imediatamente. Cache financeiro usa a revisão no provedor (fallback updated_at apenas se ausente) e envio, em vez de invalidar por regravação local idêntica. Entradas continuam respondendo com a revisão local atual, protegendo a associação na lista.

Lista mensal não remonta por generatedAt; mantém página e detalhes na atualização silenciosa do quadro. Atualizar explícito relê a lista na página atual. Falha na nova consulta financeira identifica que os custos anteriores são os últimos confirmados. Nenhuma alteração no cálculo, estoque, permissões, plano ou esquema.

---

# Lista mensal — 3.2.0.217 (local)

Ver vendas do mês fica no cabeçalho da composição somente quando há um mês selecionado. Lista interna, rolável até 390 px, 25 registros por página; mesmos marketplace, conta, estoque, ano e mês. Detalhes dos itens/pedido no nome do produto, sem buscar comprador nem sincronizar o provedor. Fechar/reabrir preserva os filtros; nova competência/filtro/revisão remonta a lista na primeira página, abortando consultas anteriores.

GET relatorio-vendas?list=1 valida mês/página e a autorização compartilhada; loadMonthlySales limita os registros ao período, pagina leitura em 500 e devolve 25, com agregado confirmado do mês inteiro. Canceladas/estornadas/pendentes aparecem identificadas, fora desse total. Não converte origem histórica desconhecida em estoque atual. Falha rejeita a lista sem entregar total truncado; máximo seguro por fonte e prazo de consulta.

Financeiro: usa cache por pedido/revisão quando disponível; a consulta financeira em lotes também devolve entradas normalizadas, sem tokens/compradores. O navegador repassa essas entradas à lista para evitar depender da mesma instância serverless. Custos de registros excluídos do total não são exibidos como confirmados. Rodapé só usa composição do quadro quando contagem/bruto ainda conferem; divergência pede atualizar. Ausentes continuam A apurar.

Sem publicação, migração ou mudança de permissões. Leitura real local conferiu 50 registros / 39 confirmados em outubro, com cancelada fora do total e bruto correspondente ao quadro. A ausência de chave local continua impedindo confirmar custos dos provedores neste ambiente.

---

# Correção local 3.2.0.211

Layout compacto e cascata real, mantendo filtros e seleção mensal pelas barras. Tabela não repete 12 alvos altos; linhas compactas são apenas informativas.

GET continua lendo somente salvas. POST autenticado consulta custos reais de até três pedidos por lote, com cursor validado e isolamento da empresa/conta; não escreve em dados de venda nem estoque. Não há migração. O navegador acumula o resultado dos lotes e mostra cobertura; cache em memória do servidor é apenas otimização, limitado a 2.000 itens e uma hora (falhas por um minuto), separado por empresa, conexão, pedido e revisão. Mudança de filtros/ano aborta a consulta e invalida o resultado anterior. Cem lotes por passagem no máximo; limite comunicado sem esconder parciais.

ML: lê pedido identificado da conta, status paid, BRL e bruto compatível. Comissão de sale_fee por unidade; custo do vendedor em shipments/{id}/costs, nunca receiver/gross_amount/save. Confere os pedidos de shipments/{id}/items; frete compartilhado entre até oito pedidos próprios é rateado por valor, método de maiores restos em centavos, sem duplicação. Falha/identidade divergente mantém campo pendente. Sem envio identificado não assume frete zero.

Magalu: lê relatório financeiro paginado do pedido e vendedor. CREDIT menos DEBIT; ignora INFORMATIVE e desconto promocional absoluto já aplicado. Usa currency/normalizer/status; comissões/tarifas e frete/créditos separados. Diferença da conciliação aparece como Ajustes na cascata. Vendas diretas sem despesas registradas permanecem pendentes.

**Bloqueio do teste real local:** MARKETPLACE_SECRETS_KEY não configurada. Cópia apenas dessa chave foi explicitamente autorizada, mas Vercel protege seu valor como Secret; API não devolve plaintext e painel desativa Copy to Clipboard. Nenhuma chave copiada ou rotacionada, nem configuração de produção alterada. Não prometer validação com dados reais até executá-la no ambiente com a chave existente. Não enviar segredos pelo chat.

Fontes: [ML pedidos](https://developers.mercadolivre.com.br/pt_br/gerenciamento-de-vendas), [custos de envio](https://developers.mercadolivre.com.br/en_us/shipment-handling), [Magalu financeiro](https://developers.magalu.com/docs/apis/financial-analysis/overview/index.html).

Validação: testes de cálculos, cache, identidade, cobertura, leitura sem escrita e renderização; segurança e tipos do escopo. Typecheck global limitado por export preexistente AvantaLandingPage em app/page.ts, detectado ao gerar tipos de desenvolvimento. Local, sem publicação. A especificação inicial abaixo é histórica; a consulta de custos nela pendente foi implementada acima, ainda sem validação real local.

---

# Resultado de vendas — 3.2.0.210 (local, não publicado)

Posição: final de MarketplacesClient, depois dos painéis reordenáveis; Produtos cadastrados é o último painel na ordem oficial. O quadro não participa da reordenação. Não altera o período global de Vendas.

Filtros próprios: marketplace (inclui vendas diretas), conta, estoque e ano. Tabela e barras representam os 12 meses. Selecionar mês detalha os indicadores e Do bruto ao líquido; selecionar novamente/Ver ano inteiro retorna ao acumulado anual. Mudança de ano limpa o mês. Recolher preserva os filtros.

## Fontes e critérios

- Rota GET autenticada `relatorio-vendas`, com autorização compartilhada de visualização do módulo e validação de empresa/filtros. Somente leitura; sem credenciais/dados de compradores na resposta.
- Fontes: vendas salvas de marketplace_sales e marketplace_direct_sales. Sem consulta de produtos, EAN, fiscal, IA ou APIs dos provedores. Atualizar relê salvas; a sincronização existente é independente.
- Linhas agregadas em centavos no servidor; navegador recebe 12 resultados mensais e opções. Leitura paginada em 500, com prazo/limite por fonte, sem totais parciais após falha. Carga inicial adiada até aproximar a rolagem do quadro; não integra o gate de abertura do módulo.
- Competência por data da venda em America/Sao_Paulo; datas civis das diretas não são deslocadas. Não é regime de caixa ou data do repasse.
- ML: paid; Magalu: paid/confirmed; diretas: confirmed. Apenas BRL. Exclui pagamentos pendentes, cancelamentos e estados de estorno parcial/ambíguo. Isso não representa conciliação de estornos.
- Valor bruto usa o total persistido do pedido; diretas usam total_cents. Ausência de bruto é sinalizada, não convertida em valor confirmado. Pedidos contam uma vez por registro; unidades somam itens.
- Estoque: diretas usam warehouse_id histórico. Pedidos online não têm origem histórica de estoque persistida confiável e ficam em Origem não identificada. Nunca inferir pelo estoque Online atual. Selecionar um estoque real não inclui esses pedidos.

## Limitação explícita desta etapa

Taxas, frete a cargo do vendedor e ajustes financeiros reais não estão normalizados nas fontes atuais. Não foram implementados conectores de apuração nesta entrega. Consequentemente, pedidos existentes geram A apurar em taxas/frete/líquido. Não tratar como zero, estimar pelo anúncio, afirmar lucro/recebimento, ou somar valores incompletos como líquido definitivo. A seção financeira mostra a composição com pendências, sem desenhar uma cascata com valores inventados.

Antes de concluir o recurso financeiro: integrar custos/ajustes reais por pedido e conta, persistência idempotente, identificação do responsável pelo frete, reembolsos e cobertura dos registros; validar valores de produção com amostras reconciliadas. A coleta deve ocorrer fora da leitura do quadro. Origem histórica dos pedidos online também demanda persistência na sincronização sem backfill inferido.

Validação local: 13 testes de agregação/serviço/renderização, 472 de segurança, TypeScript, PADRÃO AVANTA 1.23.1 e Ava. Sem build completo, migração, publicação ou verificação visual autenticada em produção nesta etapa.

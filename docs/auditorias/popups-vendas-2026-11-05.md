# Revisão dos popups de Vendas e Serviços — 3.2.0.333

Referência: menu de ações aprovado pelo responsável. PADRÃO AVANTA 1.23.1.

## Cobertura

Os 34 pontos de abertura de `Dialog` do módulo compartilham cabeçalho na cor do perfil, corpo contido na viewport e rodapé sempre acessível. Os formulários longos mantêm rolagem no corpo, sem esconder as ações. A largura acompanha o conteúdo: confirmações compactas, formulários e detalhes amplos, menu de ações com três colunas quando houver espaço.

## Organização

- Menus de pedidos, notas, clientes, estoque e recebimentos usam ações disponíveis destacadas, condições separadas e opções previstas compactas/desativadas. Cancelamento fiscal, comercial ou estorno financeiro ficam no rodapé e preservam sua própria permissão.
- Rodapés reutilizam BotaoAcaoCompacto; o acionador de PDF da ordem de serviço também foi ajustado. A comparação dos 74 botões finais com os anteriores confirmou os mesmos handlers, condições disabled e títulos; apenas o Fechar do antigo ramo duplicado do menu deixou de existir.
- Campos continuam com 44px no desktop e 48px no mobile. O cadastro de pessoa jurídica reúne telefone e e-mail na mesma linha. Dados digitados usam peso normal; nomes dos resumos de pedidos podem quebrar linha.
- Nenhum campo, validação, confirmação fiscal ou permissão foi removido. Abertura e reorganização visual não executam faturamento, cancelamento, estorno, movimento de estoque ou emissão.

## Validação

- 542 testes de segurança aprovados; 10 testes focados de cadastro, ações e pendências aprovados.
- ESLint sem erros. Verificadores do padrão e da Ava aprovados.
- Prévia derivada do JSX real com dados fictícios: menu de ações, cadastro de cliente, faturamento e correção fiscal.
- Conferência em 1280×720 e 390×844: sem corte horizontal e com rodapé acessível. Menu principal sem rolagem no desktop; formulários e menus extensos rolam somente no corpo em telas pequenas.
- Alterações locais, ainda não publicadas.

## Inventário de aberturas

- `NewRecordDialog`
- `QuoteActions`
- `ServicePdfDialog`
- `RecordActionsDialog`
- `OrderDetailsDialog`
- `OrderLifecycleDialog`
- `ServiceOrderDetailsDialog`
- `ServiceLifecycleDialog`
- `ServiceExecutionDialog`
- `CatalogItemDialog`
- `ClientFormDialog`
- `SupplierFormDialog`
- `ClientReportDialog`
- `StockMovementForm`
- `StockInventoryForm`
- `StockMovementDetails`
- `FiscalDraftDetailsDialog`
- `FiscalRejectedCorrectionDialog`
- `FiscalIssueReviewDialog`
- `FiscalCancellationDialog`
- `FiscalHomologationDialog`
- `FiscalIntegrationEvaluationDialog`
- `FiscalIssuerRegistryDialog`
- `NfeSpHomologationDialog`
- `FiscalDeveloperView`
- `FiscalNumberingDialog`
- `FiscalView`
- `FiscalView`
- `ReceivableDetailsDialog`
- `ReceivableOperationDialog`
- `SettingsDialog`
- `FiscalMatrixDialog`
- `AccessSettingsDialog`
- `CertificateDigitalDialog`

# Magalu — autorização única de consultas

Revisão: 3.1.0, 13/10/2026. Publicação inicial por SKU, preço e estoque preparada; validação em loja real pendente.

Na versão 3.1.0, uma conta com o conjunto completo de escopos de catálogo pode
preparar um produto local e confirmar o envio ao Magalu. O envio é assíncrono:
SKU, preço e estoque são registrados sequencialmente, com conferência pelo GET
oficial entre as etapas. O status `published` só é mostrado após confirmação
do SKU pelo Magalu. Os dois índices de proteção por SKU/loja da migração
`20261014030000_marketplace_magalu_publication_guard.sql` foram aplicados e
conferidos no banco de produção em 13/10/2026; antes havia zero publicações
Magalu. Ainda faltam teste
em loja autorizada e observação da moderação de um SKU real. Não sincroniza
estoque subsequente nem importa anúncios antigos.

O administrador autorizou consultas de pedidos, entregas, documentos fiscais,
pós-venda, mensagens de compradores e informações financeiras. A fonte
executável de leitura é `MAGALU_CONNECTION_SCOPES` em
`app/modules/marketplaces/services/magalu-oauth.ts`.

## Conjunto configurado

| Área | Consulta |
| --- | --- |
| Pedidos | `open:order-order-seller:read` |
| Produtos | `open:portfolio-skus-seller:read` |
| Estoque | `open:portfolio-stocks-seller:read` |
| Entregas | `open:order-delivery-seller:read` |
| Notas fiscais | `open:order-invoice-seller:read` |
| Logística | `open:order-logistics-seller:read` |
| Documentos fiscais | `open:logistic-fiscal-documents-seller:read` |
| Reclamações/protocolos | `open:tickets-seller:read` |
| Mensagens dos protocolos | `open:ticket-messages-seller:read` |
| Histórico dos protocolos | `open:ticket-events-seller:read` |
| Devoluções/logística reversa | `open:ticket-returns-seller:read` |
| Acompanhamento de transações SAC | `open:sac-transaction-seller:read` |
| Relatório financeiro | `open:order-financial-report-seller:read` |
| Conversas com compradores | `services:conversations-seller:read` |

## Catálogo preparado (3.0.0.28)

Uma nova autorização da mesma loja também solicita os acessos abaixo. Eles são
isolados das consultas: a ausência deles não expira a conta nem interrompe
vendas e pós-venda já autorizadas.

| Área | Acesso |
| --- | --- |
| Categorias e ficha | `open:portfolio-categories-seller:read` |
| SKU | `open:portfolio-skus-seller:read`, `open:portfolio-skus-seller:write` |
| Preço | `open:portfolio-prices-seller:read`, `open:portfolio-prices-seller:write` |
| Estoque | `open:portfolio-stocks-seller:read`, `open:portfolio-stocks-seller:write` |

O servidor registra se a conexão recebeu o conjunto completo e orienta
**reautorizar catálogo** quando faltar algum acesso. A versão 3.1.0 adiciona
criação inicial de SKU, primeiro preço e estoque após revisão dos dados locais
e confirmação explícita no AvantaLab; conceder escopos por si só não publica.

Conferência externa pelo IDM oficial: os 14 acessos aparecem em AVAILABLE,
todos como default e nenhum em PENDING. Audiências produtivas:
`https://api.magalu.com` e `https://services.magalu.com`.
Na .22 nenhum escopo `write` ou `apiin:all` havia sido adicionado.
Na .24, com confirmação explícita para etiquetas, adicionado somente
`open:order-logistics-seller:write`. `MAGALU_AUTHORIZATION_SCOPES` solicita os 15
acessos juntos. A leitura continua funcionando com as 14 consultas; não expirar
a conta só porque falta a escrita de etiquetas. Nenhum acesso irrestrito.
O endpoint oficial de geração não publica parâmetros/corpo completos na referência
consultada; não enviar payload por tentativa nem afirmar geração local pronta.
Até confirmar o contrato e validar com entrega real, impressão usa o portal Magalu.
Client secret, redirect URIs, validade dos tokens e conexões existentes não
foram modificados. A inspeção não exibiu credenciais ou dados de compradores.

## Fluxo simples

1. Depois da publicação autorizada, iniciar a conexão Magalu no AvantaLab.
2. No ID Magalu, escolher a organização vendedora correta e permitir as consultas
   em uma única autorização. O dono da loja continua responsável pelo consentimento.
3. O servidor exige as 14 consultas e confirma o perfil vendedor e tenant antes
   de guardar tokens no cofre da empresa. Permissão ausente não vira sucesso.
4. Se a mesma loja já existe, atualiza a conexão mantendo ID, identificação e
   vínculos; não exige excluir ou desconectar a conta.

Não houve novo consentimento de vendedor ou gravação de tokens em produção
nesta etapa. Adaptadores de vendas/pós-venda e apresentação estão preparados
localmente na 3.0.0.23. A migração `20261013150000_marketplace_magalu_sales.sql`
foi testada somente em PostgreSQL isolado: ainda precisa ser aplicada ao destino
autorizado. Não afirmar que dados reais já foram carregados ou produção ativada.

## Consulta preparada (3.0.0.23)

- Pedidos paginados com janela de atualização fixa, cursor e retomada; nenhuma
  exclusão de canceladas. Atualização silenciosa, sem trocar a lista em foco.
- Filtros existentes de conta/situação/período e detalhes dos vários pacotes,
  prazo de preparação e chave/situação da nota fiscal quando informados.
- Protocolos ligados ao código/UUID do pedido, canal, entrega e vendedor;
  situação, motivo, responsável, prazo, mensagens e histórico em português.
- Registros financeiros ligados ao UUID do pedido, sem totalizar recebimento
  ou reembolso: crédito, débito e informativo são distintos.
- Registro de remessa de devolução não comprova produto recebido. O contrato
  detalhado da remessa ainda precisa ser confirmado com resposta real; não
  inventar situação, rastreamento, recebimento físico ou valor reembolsado.
- Banco privado com RLS, trava por conta, renovação protegida de token e aviso
  deduplicado por pedido aprovado após conexão/ativação. Consulta incompleta não
  avança cursor nem vira ausência de reclamações. Rotina usa o agendador existente,
  somente nas empresas com módulo vigente e rotina habilitada.
- Não implementados nesta etapa: arquivos/anexos fiscais, conversas fora dos
  protocolos, transações detalhadas SAC, etiquetas, publicação e estoque Magalu.
  Permissão configurada não equivale a endpoint implementado.

Antes de ativar: aplicar migração com aprovação, autorizar a mesma loja com as
14 consultas e verificar pedidos reais, protocolos/remessas/financeiro, filtros
e avisos. O teste prévio de identidade da loja usava outro conjunto de consultas.

## Limites

Leitura de informações financeiras não autoriza movimentar dinheiro.
Leitura de protocolos não autoriza cancelar, aceitar devoluções ou reembolsar.
Leitura de mensagens não autoriza responder ou marcar como lidas.
Leitura de logística não promete gerar etiquetas: o endpoint é POST e a operação
deve ser tratada separadamente, com permissão e implementação próprias.
Publicar anúncios e sincronizar estoque também continuam separados.

## Fontes oficiais

- [OAuth e consentimento](https://developers.magalu.com/docs/first-steps/create-an-application/authentication-authorization/index.html)
- [Configurar cliente e adicionar escopos](https://developers.magalu.com/docs/first-steps/create-an-application/create-application/index.html)
- [Pedidos, entregas e notas fiscais](https://developers.magalu.com/docs/apis/orders/overview/index.html)
- [SAC e devoluções](https://developers.magalu.com/docs/apis/sac/overview/index.html)
- [Logística e documentos](https://developers.magalu.com/docs/apis_logistic/overview/index.html)
- [Conversas](https://developers.magalu.com/docs/apis/conversations/ref/conversas/index.html)
- [Relatório financeiro](https://developers.magalu.com/docs/apis/financial-analysis/overview/index.html)
- [Etiquetas](https://developers.magalu.com/docs/apis_logistic/labels/ref/seller-v-1-post-logistics-shipping-labels/index.html)

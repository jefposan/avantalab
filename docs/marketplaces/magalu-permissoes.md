# Magalu — autorização única de consultas

Revisão: 3.0.0.22, 13/10/2026. Código ainda não publicado.

O administrador autorizou consultas de pedidos, entregas, documentos fiscais,
pós-venda, mensagens de compradores e informações financeiras. A fonte
executável é `MAGALU_CONNECTION_SCOPES` em
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

Conferência externa pelo IDM oficial: os 14 acessos aparecem em AVAILABLE,
todos como default e nenhum em PENDING. Audiências produtivas:
`https://api.magalu.com` e `https://services.magalu.com`.
Nenhum escopo `write` ou `apiin:all` foi adicionado.
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
nesta etapa. A autorização prepara acesso às APIs; exibir/sincronizar essas
informações no módulo ainda depende dos adaptadores Magalu. Não afirmar que
pedidos, devoluções, relatórios ou mensagens reais já foram carregados.

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

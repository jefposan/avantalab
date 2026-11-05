# Contrato de integração dos marketplaces — 3.2.0.28

Mercado Livre é a referência funcional. Cada próximo provedor deve implementar o
mesmo contrato interno antes de ser considerado integrado. Não criar fluxos de
estoque, edição, permissão ou aviso independentes por marketplace.

## Superfícies e segurança comuns

- Anunciados: contas selecionadas, pesquisa, contador exato, fotos, EAN, edição,
  carregamento, erro e pendências. Identidade é empresa + conta + ID/SKU.
- Produtos e Estoques: cadastro único, vínculos de publicação e estoque Online.
  Web e AvantaPreços reutilizam Conferir saldos para comparar e escolher direção.
- `POST /api/modulos/marketplaces/integracao`: capabilities, sync, listing e action.
  Seleção do adaptador no servidor, por conta pertencente ao perfil autenticado.
  As rotas existentes de Anunciados também usam esse adaptador.
- Pedidos/pós-venda e comandos de estoque conservam suas APIs comuns existentes.
  Visualizar não autoriza editar; gestão e Editar estoque mantêm suas verificações.
- Escopos OAuth são próprios de cada plataforma, conferidos por recurso/operação.
  Reautorizar a mesma conta quando faltar consentimento, sem excluir o cadastro.
- Escritas auditadas, idempotentes e sem reenvio automático após resultado incerto.
  Resposta aceita não significa alteração concluída: reler e comparar o resultado.

## Magalu

- Catálogo por página retomável; ficha, imagem, EAN, preço e AVAILABLE por canal.
  Ficha/preço editados no mesmo editor do ML. Salvar preço separadamente de
  título/descrição, pois são operações assíncronas distintas no Magalu.
- Atualização automática por consulta periódica do worker e atualização explícita.
  Não foi configurado webhook Magalu: não prometer entrega instantânea.
- Pedido aprovado novo baixa Online uma vez por SKU/conta. Ativação por conexão
  impede baixa retroativa do histórico. Pacotes cancelados não geram nova baixa;
  alteração após baixa gera conferência, sem devolução física presumida.
- Saldo local segue aos anúncios vinculados elegíveis de ML e Magalu. Zero requer
  saldo remoto zero e `active=false` confirmados antes de concluir. Pausa manual
  não é reativada automaticamente. Reposição espera consulta recente/completa de
  pedidos, além das pendências conhecidas do produto/conta.
- Não soma saldos de lojas/canais; somente um AVAILABLE do canal padrão sem branch.
  Multi-Origem, Fulfillment, moderação, saldo desconhecido e autorização negada
  mantêm pendência específica. Falta de resposta nunca equivale a zero confirmado.
- Comissão, frete e total vendido indisponíveis nessa consulta aparecem como
  indisponíveis, nunca estimados sem base. Etiquetas continuam pelo portal Magalu;
  encerrar/excluir não são oferecidos como equivalentes homologados do ML.

## Homologação dos próximos provedores

Declarar capacidades reais em integration-contract.ts; implementar identidade,
normalização, escopos, leitura/escrita, paginação, revisão, auditoria e confirmação.
Validar isolamento entre perfis/contas (inclusive mesmo SKU), venda repetida,
cancelamento, histórico, zero/pausa, retorno incerto, falta de escopo e recuperação.
Não marcar uma capacidade disponível apenas porque existe na documentação do
provedor. Diferenças reais ficam explícitas, sem respostas de sucesso fictícias.

Fontes: documentação oficial Magalu, Products (GET/PATCH SKUs, Prices e Stocks) e
Orders (GET pedidos), consultada em 21/10/2026. Integração financeira permanece fora.

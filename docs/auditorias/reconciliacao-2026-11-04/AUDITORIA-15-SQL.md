# Auditoria dos 15 SQLs sem identificador remoto

**Decisão: preservar os 15 como fontes históricas do produto. Nenhum foi comprovado obsoleto.**

A estrutura atual do Supabase foi consultada somente em leitura em 04/11/2026.
As evidências de uso foram obtidas do código publicado no deployment
`dpl_Dq1wCBwU92G354cov6BCiN4qrYt9` (3.2.0.309), não do trabalho paralelo da raiz.

A ausência dos 15 identificadores em `schema_migrations` não significa que os
recursos estejam ausentes ou desligados. Nenhum identificador equivalente pelo
mesmo nome foi encontrado. O registro remoto tem uma lacuna de rastreabilidade.

## Resultado individual

| Arquivo histórico | Recurso presente e usado | Decisão |
|---|---|---|
| 20261011200000_marketplace_local_products.sql | Cadastro local de produtos e vínculos com anúncios | Preservar |
| 20261012010000_marketplace_inventory_sync.sql | Sincronização de estoque, baixas e fila de eventos | Preservar |
| 20261012160000_marketplace_magalu_oauth.sql | Conexão OAuth Magalu vinculada ao navegador | Preservar |
| 20261012190000_marketplace_connection_labels.sql | Apelidos locais das contas conectadas | Preservar |
| 20261012230000_marketplace_sales_history.sql | Operações e histórico de vendas/anúncios | Preservar |
| 20261013150000_marketplace_magalu_sales.sql | Sincronização de vendas Magalu | Preservar |
| 20261013170000_marketplace_pending_sale_alerts.sql | Avisos de vendas pendentes e leitura por usuário | Preservar |
| 20261014030000_marketplace_magalu_publication_guard.sql | Proteção contra envio duplicado de SKU/loja Magalu | Preservar |
| 20261014050000_usuario_areas_liberadas.sql | Permissões por área, módulos e auditoria de acesso | Preservar |
| 20261023060000_marketplace_grouped_listings.sql | Agrupamento de anúncios por produto e conta | Preservar |
| 20261024150000_marketplace_inventory_protection.sql | Proteção de estoque contra eventos tardios e concorrência | Preservar |
| 20261025170000_marketplace_quality_web_usage.sql | Recibos de uso da IA e pesquisa web de qualidade | Preservar |
| 20261026170000_marketplace_fiscal_history.sql | Histórico e preservação de operações/documentos fiscais | Preservar |
| 20261027130000_marketplace_product_posts.sql | Versões de artes e conteúdo de produto | Preservar |
| 20261030143000_importador_despesas_centros.sql | Importação de despesas e rascunhos por centro de custo | Preservar |

## Evidências importantes

- Todas as tabelas, views e funções declaradas e enumeradas no inventário foram encontradas no banco atual.
- Produtos, estoque, vendas e histórico fiscal têm consumidores no código publicado; suas funções também podem ser acionadas por triggers do banco.
- OAuth Magalu usa `browser_binding_hash` na conexão e no callback. A coluna e a restrição de provedores existem.
- Os dois índices únicos de publicação Magalu estão válidos e prontos. O serviço de envio grava na tabela protegida e trata a violação de unicidade como envio duplicado.
- A consulta de anúncios chama condicionalmente `marketplace_grouped_listings`; por isso uma busca limitada a `.rpc("nome")` não a identificava.
- As permissões por área têm funções existentes, 136 políticas `usuario_area_limite` no schema public e uma política correspondente no Storage. As colunas são usadas no código de autorização.
- Os triggers consultados estão habilitados para o fluxo normal do banco. Nenhum deles foi removido ou desativado.
- O importador chama a RPC de despesas com centro de custo e escolhe a tabela de rascunhos por centro no código publicado.

Não foram acionadas funções de venda, estoque, importação ou emissão para
produzir esta prova. A análise verificou catálogo de estruturas e consumidores
do código; não mede quantos usuários utilizam cada função nem afirma que cada
linha de uma versão histórica ainda seja a implementação atual.

## Organização corrigida

As fontes foram movidas, sem alterar seus bytes, para
`supabase/historico-sem-registro/`, com origem e hashes em `proveniencia.json`.
A classificação provisória de material exclusivo de testes foi removida.
Os testes continuam consumindo essas fontes, sem uma segunda cópia do SQL.

A pasta fica fora da fila automática `supabase/migrations`: inserir os arquivos
nessa fila ou aplicar `db push` apenas para alinhar identificadores poderia
reexecutar comandos sobre estruturas já existentes. Não houve `migration repair`,
aplicação de SQL, remoção de tabelas/funções, mudança de RLS ou alteração de dados.

Os 271 registros remotos e os 15 arquivos históricos são informações distintas.
“Identificador não encontrado” não é registrado como “migração não aplicada”.

## Limpeza efetivamente feita

- Removida a pasta provisória `tests/fixtures/sql-historico` por movimentação dos seus conteúdos preservados.
- Retirada a afirmação `appliedMigration: false`, que não era sustentada pela consulta do histórico.
- Corrigidos changelog, guia do repositório e relatórios que descreviam esses recursos como material apenas de teste.
- Mantidos os 15 SQLs e as funcionalidades às quais estão relacionados.
- Raiz compartilhada, espelho fiel 3.2.0.309, produção e banco preservados.

O inventário técnico completo, com objetos, referências, linhas e hashes de
fontes publicadas, está em `AUDITORIA-15-SQL.json`.

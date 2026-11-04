# Ficha pesquisada — AvantaPreços3.2.0.41

PADRAO-AVANTA1.20.0. Correção local, não publicada.

Atualização da entrega autorizada: migração20261021040000 aplicada em produção
com dados preservados. Pacote41 em preparação para envio; afirmações anteriores
de migração apenas local nesta especificação descrevem a etapa de desenvolvimento.

## Causas

A pesquisa OpenAI solicitava somente ofertas. O GTIN de uma ficha Mercado Livre
selecionada por descrição não era reaproveitado no EAN. Além disso,
`registerConsultedProduct` recebia atributos canônicos `{id,name,value}`, mas
reaplicava o parser ML que só lia `value_name`, descartando características.
O SQL de registro só completava descrição/foto/EAN/preço, não atributos existentes.

## Novo contrato

Uma única pesquisa retorna ofertas e ficha opcional: EAN/GTIN, descrição,
imagem e atributos técnicos (marca, modelo, voltagem, capacidade, dimensões e
demais dados aplicáveis). Não cria condição/avaria/estoque por inferência.
Ficha exige identidade exata; campo exige fonte HTTPS presente nos sources
ou annotations da resposta real de web_search. EAN exige código explícito e
dígito verificador; conflito com EAN conhecido descarta o enriquecimento web.
Dados ausentes/ambíguos continuam vazios, sem impedir preços válidos.

Primeira consulta grava atributos normalizados e dados junto ao cadastro.
Atualizar preço usa o produto local exato; após concluir a pesquisa completa
somente ausências, inclusive quando não houve ofertas novas. Histórico pode
ser atualizado sem refazer cadastro; clientes relêem a ficha canônica.
Características/fontes ficam visíveis nos detalhes do AvantaPreços.

## Banco e preservação

Migração20261021040000 redefine registro mantendo origem/empresa, deduplicação,
validação de EAN divergente e saldo intocado. Bloqueia linha antes de completar,
mescla atributos novos por ID sem substituir valores preenchidos e guarda URLs
em publication_form.web_research_sources. Repetição sem mudança não aumenta
revisão. Não muda permissões: RPC exclusiva de service_role, autorização prévia
continua obrigatória nas APIs. Não apaga usuários, produtos, fotos ou movimentos.

Nenhuma pesquisa em massa ou correção retroativa automática. Produto já salvo
incompleto pode ser enriquecido em Atualizar preço. O exemplo MB7142 nos testes
usa dados sintéticos: não afirma EAN ou ficha real da calculadora do responsável.

Referência consultada via OpenAI Docs: [Web search e fontes da Responses API](https://developers.openai.com/api/docs/guides/tools-web-search).
Mantidos modelo configurado, store:false e autorização existente. Sem chamadas
pagas reais nos testes; nenhuma chave nova/exportação de credenciais.

Gestão nativa, AvantaVendas, vendas/financeiro e anúncios preservados. Migração
somente preparada/testada localmente; aplicação em produção/publicação pendentes.

Validação:699 testes de Marketplaces aprovados, incluindo SQL real em PGlite,
enriquecimento da consulta/atualização e renderização do componente real.
TypeScript sem erros em pacote isolado sobre40; verificadores PADRÃO AVANTA/Ava
aprovados. Prévia visual390×844 usa dados integralmente fictícios.

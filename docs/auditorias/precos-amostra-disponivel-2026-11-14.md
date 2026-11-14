# AvantaPreços — amostra disponível — 3.2.0.422

## Origem e restauração

- Base da main oficial consultada na rede: `176613769551d35112194c9a4a5bceac8875a181`, 3.2.0.421-av203. Os ajustes do dashboard AvantaVendas permanecem intactos.
- Produção da base conferida no domínio oficial: READY, `dpl_EAt8GobCvMy3iCqsvvK1WuL2B8QH`, branch main e mesmo SHA.
- Trabalho isolado em `/private/tmp/avanta-precos-ml-local`, branch `codex/precos-amostra-unica-20261114`. Checkout compartilhado preservado.
- Tag anterior à edição: `restauracao/precos-amostra-base-main-20261114`. Definição anterior da função salva antes da migração em `/private/tmp/avanta-403-investigacao-20261114/restauracao-funcao.sql`.
- PADRÃO AVANTA 1.23.1 e guia Server/Client Components do Next local consultados. Nenhuma geometria/interface nova.

## Regra autorizada

Continua buscando todas as páginas do catálogo confirmado, de 20 em 20, até o teto atual de 200. Não termina ao encontrar a primeira oferta nem ao atingir três vendedores. A prioridade permanece reunir vários vendedores e usar todas as ofertas aceitas após os filtros.

Somente o mínimo foi flexibilizado: após a coleta completa, uma ou duas ofertas válidas podem definir a referência. Uma oferta usa o próprio preço; duas ou mais usam a média aritmética em centavos. Mantém o menor preço por vendedor, exclusão das contas próprias, duplicatas, usados, inatividade explícita, moeda inválida e extremos. Mantém a conferência de identidade/variante e a proteção por dispersão superior a três vezes. Zero ofertas válidas, paginação parcial, identificação inconclusiva ou erro não substituem a referência.

Não ativa IA, pesquisa geral ou fallback pago. Não altera preço anunciado, estoque, reservas ou outras operações comerciais. A mudança serve à consulta inicial e ao Atualizar preço do cadastro, no celular e na Web. Resultados continuam recolhidos e informam a quantidade real considerada.

## Validação

- 41 testes focados de consulta, cálculo e persistência passaram. Cobrem sugestões com uma/duas ofertas, zero ofertas, 49 ofertas paginadas, coleta até a terceira página apesar de já haver uma válida, filtros, erro/consulta parcial, SQL real, referência gravada, repetição, revisão concorrente e isolamento de empresa/permissões.
- A suíte Marketplaces ampla executou 1.509 testes: 1.505 passaram, três skips preexistentes e uma expectativa antiga falhou (exigia bloquear uma oferta). Essa expectativa foi atualizada para a regra autorizada e passou no conjunto focado. Os demais testes não foram alterados. O build remoto ainda executa a suíte integral obrigatória.
- Segurança: 714 aprovados, zero falhas. TypeScript sem erros. Padrão Avanta, Ava e revisão AvantaVendas aprovados; diff sem erros.
- Exemplos controlados: uma oferta de R$ 429,90 gera referência R$ 429,90; duas de R$ 429,90 e R$ 430,00 geram R$ 429,95. São testes locais, não preços gravados em produção.

## Migração em produção

Migração incremental `20261114210000_marketplace_ml_price_small_sample.sql`, SHA-256 `c8e1fd2492006f1f28e199d4c67fa97227705825d3e6c85951e8320707fdea87`, aplicada após autorização de publicação e registrada atomicamente no projeto oficial. Guarda compara a definição da função com a preservada antes de executar. A migração não executa históricos sem registro nem reescreve pesquisas anteriores.

Conferência posterior confirmou que o único trecho alterado na função foi `jsonb_array_length(p_offers)<3` para `<1`. Permissões iguais: service_role autorizado, anon/authenticated negados. Fingerprints de 209 produtos (preço, estoque e revisão) e 304 saldos preservados; contagens de reservas, consultas e pesquisas iguais. Código anterior permanece compatível durante o build.

Evidências e logs: `/private/tmp/avanta-403-investigacao-20261114/`. Manifesto usa a base vigente, versão, resumo e hash da migração. Publicação autorizada pela main; somente declarar no ar após conferir READY e o domínio oficial. Pesquisa do 403 é trabalho separado e não inclui mudanças especulativas na autenticação desta entrega.

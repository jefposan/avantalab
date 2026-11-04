# Consulta e estoque — 3.1.0.51

> Revisão local 3.1.0.63, ainda não publicada: catálogo AvantaPreços passa a ler diretamente Produtos e estoque da mesma empresa. Busca descrição/nome/EAN em toda a base, com paginação de 25 e sem depender de histórico de pesquisa ou preço existente. Últimas consultas fica separada e limitada a dez. Abrir não confirma unidades nem duplica cadastro; editar quantidade depende da permissão individual já existente. Pesquisa de mercado é ação separada. Sem migração ou movimentação de dados reais nesta entrega.

> Publicado em 19/10/2026. Migrações 49/50 instaladas, 20 consultas antigas vinculadas e nenhum saldo presumido. Notas de implementação local abaixo são históricas. Publicação, preservação dos dados e limite do ensaio autenticado registrados em `publicacao-consulta-estoque-2026-10-19.md`.

> Complemento local 3.1.0.60, ainda não publicado: a caixa Editar estoque no usuário AvantaPreços permite conceder somente confirmação/ajuste de saldo na empresa, sem torná-lo usuário da Gestão. Desmarcada continua somente consulta; acessos existentes não são ampliados. Migração específica pendente. Após essa publicação, a regra histórica “somente Gestão movimenta” abaixo passa a admitir esse acesso dedicado explicitamente autorizado. Ver `permissao-estoque-avantaprecos.md`.

PADRÃO AVANTA 1.19.2. Implementação local, não publicada. A migração `20261019020000_marketplace_price_products_stock.sql` está preparada, não instalada em produção.

## Fluxo

Rótulos atuais (51, prevalecem sobre o histórico de validações abaixo): sem quantidade confirmada, **Produto fora de estoque / Estoque a ser inserido / Adicionar**. Adicionar abre a quantidade e Concluir confirma o saldo no mesmo cadastro. Não concluir/cancelar conserva o cadastro automático sem inventar unidades. Com saldo positivo, **Já em estoque / quantidade / Editar**; zerar conserva confirmação e auditoria, mas volta a **Produto fora de estoque / 0 unidades / Adicionar**. Reposição exige quantidade positiva. Histórico antigo e próxima leitura compartilham o fluxo. Cadastro e estoque são estados distintos; nenhum bipe duplica produto ou soma unidades.

1. Identificar um produto no AvantaPreços cadastra-o em Produtos e estoque da empresa, com foto, descrição e referência disponíveis, sem saldo confirmado. Produto sem ofertas também entra; busca ambígua/não encontrada não inventa um produto.
2. Histórico/manual vincula o cadastro na mesma transação. A migração vincula as consultas antigas; abrir o resultado no histórico exibe o estoque atual, sem refazer a pesquisa paga.
3. Entrar estoque abre quantidade de 1 a 99.999. Concluir confirma saldo físico com movimentação auditada. Depois o topo mostra Já em estoque e a quantidade. Editar define o saldo final entre 0 e 99.999; não é um incremento. Zero continua cadastrado/confirmado, não volta ao estado desconhecido.
4. Web e PWA usam os mesmos produtos e RPC de confirmação; consulta/reabertura/bipe não soma unidades nem publica anúncios. Quantidade do lote e estoque são independentes; PDFs/snapshots de lotes não mudam.

## Proteções

- Associação por empresa + origem ou EAN equivalente (zero inicial normalizado); trava transacional evita duplicações entre consultas. Sem EAN, nomes iguais não são mesclados. Vários cadastros com o mesmo EAN impedem nova associação até unificação; históricos ambíguos ficam sem vínculo na migração e a interface informa a pendência.
- Ao unificar produtos, o contrato de movimentação anterior continua sendo usado; origens e históricos passam ao destino na mesma transação, sem somar saldo. Um histórico antigo pendente pode ser vinculado ao reabrir depois da correção do EAN, sem nova pesquisa externa. Origem conhecida com EAN divergente é recusada para evitar movimentar o produto errado.
- Apenas campos vazios são completados; foto manual, referência existente, nome e saldo não são sobrescritos. Produto arquivado ligado à origem exige revisão, sem recriar silenciosamente.
- Tabela de origens com RLS e execução RPC somente service_role. APIs validam empresa e acesso AvantaPreços; confirmação exige gestão também no servidor/banco. Acesso dedicado de consulta não ganha autorização de movimentar saldo.
- Confirmação usa chave idempotente, revisão e lock existentes. Clique duplicado não soma nem gera outra movimentação. Resposta incerta mantém a mesma tentativa; atualizar consulta o saldo antes de permitir outro valor. Em gravação, campo/cancelamento/navegação concorrente ficam bloqueados.
- Atualização da lista ao retornar à aba ou receber evento local respeita edição/detalhes abertos. Não descarta formulário por atualização de outro aparelho. O resultado relê o saldo ao abrir; não afirma atualização contínua enquanto permanece aberto.

## Publicação futura

Instalar apenas a migração desta entrega, conferir vínculos/pendências por empresa, e publicar pacote isolado sobre a produção atual. Nenhuma quantidade real foi escolhida pelo agente. Produção continua na versão anterior até autorização/publicação. Prévia fictícia de desenvolvimento: `/marketplaces/consulta/validacao-estoque`, bloqueada em produção.

## Validação local

- Suíte completa do checkout: 1.358 testes aprovados, zero falhas. Quatro testes novos executam a API e o SQL real em PGlite: cadastro, identificação sem ofertas, histórico antigo, EAN com zero inicial, repetição simultânea, preservação manual, isolamento, saldo positivo/zero, auditoria e bloqueio por revisão/permissão. Refinamentos finais de EAN divergente/preenchimento ausente, unificação e reparação de histórico reconferidos no SQL real.
- Build em cópia isolada da base publicada 48, sem envs/credenciais em arquivos do pacote: `/private/tmp/avanta-estoque-49.9PURo7`. Suíte dessa base: 1.351 aprovados e um ignorado; zero falhas. Compilação/TypeScript aprovados, sem publicar. Após refinamentos, quatro testes direcionados e build reconferidos. Logs em `/private/tmp/avanta-estoque-49-build.log` e `/private/tmp/avanta-estoque-49-build-final.log`.
- PADRÃO AVANTA/Ava e verificadores de acesso Web/mobile, revisão/interface do AvantaVendas e avisos por perfil aprovados. Diff sem erro de espaços; tipagem do app/declarações aprovada.
- Componentes/serviços novos e leitor Web: ESLint aprovado. MarketplaceMobileApp mantém três erros de efeitos e cinco avisos preexistentes, reproduzidos sem os ajustes na cópia publicada 48; ProductsStock mantém o aviso de img anterior. Não foram suprimidos nem confundidos com erros novos.
- Chrome na prévia fictícia: entrada 3 → edição 6 → zero → 8; reabertura conserva saldo; falha de rede conserva valor e repetir confirma uma movimentação; depois 2 unidades. Tentativa retida bloqueia campos/cancelamento, sem novo movimento antes da confirmação. Cancelar após resposta incerta relê o saldo, em vez de ocultar a incerteza com um valor antigo. Consulta dedicada não exibe edição. Tema escuro e 320 px sem transbordamento horizontal; botões de 48 px e foco restaurado. Nenhum dado produtivo alterado.
- Evidência do componente real com dados fictícios: `output/marketplaces/consulta-estoque-49.jpg`. Prévia não equivale a teste autenticado contra banco real nem a publicação; a migração continua pendente em produção.

## Refinamento 3.1.0.50 — reutilizar produto existente

- Consulta por EAN procura primeiro o produto da empresa. Se já existir, abre sua referência e estoque atuais, sem pesquisa externa, duplicação ou alteração de quantidade. A API também aplica essa proteção antes de buscar conexão externa.
- Atualizar preço é uma ação explícita de gestão, com revisão/idempotência; pesquisa o mercado e atualiza o mesmo cadastro. Editar referência no PWA também altera o produto canônico, sem modificar estoque. Confirmar/editar saldo permanece uma ação separada.
- Snapshots de consulta usam a origem `local_reference` (“Referência cadastrada”), distinguindo referência salva de nova pesquisa de mercado. A origem LOCAL aponta diretamente para o produto da mesma empresa, inclusive sem EAN. Lotes já salvos conservam seus valores.
- Migrações 49 e `20261019030000_marketplace_local_reference.sql` pendentes, não instaladas. Publicação futura deve incluir ambas, em ordem, junto do pacote correspondente. Nenhuma gravação em produtos/estoque de produção foi feita nesta entrega.
- Validação local: 12 testes direcionados aprovados; suíte completa com 1.362 aprovados e zero falhas. Teste SQL real em PGlite confirma três snapshots no mesmo produto sem EAN, preservando foto manual, referência e saldo. Tipagem, lint dos novos fontes, PADRÃO AVANTA 1.19.2 e manuais Ava aprovados. O build isolado descrito acima é da versão 49, não uma comprovação de build/publicação da 50.
- Auditoria somente leitura em 19/10/2026, Saldão Aline: 28 produtos ativos e uma consulta cujo EAN ainda não está no cadastro. Migrações 49/50 ausentes em produção. Esse produto antigo ainda depende da migração para ser cadastrado/vinculado; não se deve comunicar inclusão ou saldo confirmado antes disso.

## Validação 3.1.0.51

- Refinamento final de publicação: confirmação para zero com resposta perdida pode repetir chave/revisão anteriores e recuperar o resultado sem outra movimentação. Chave diferente com revisão antiga é recusada; reposição atual sem quantidade positiva continua inválida. Teste de API específico aprovado; suíte final do checkout com 1.366 testes aprovados.

- Dez testes direcionados e suíte completa de 1.365 testes aprovados, zero falhas. Casos de saldo desconhecido, positivo, zero e reposição validam a mesma classificação no cliente/servidor, sem nova movimentação para quantidade inválida.
- Chrome local, componente real com dados fictícios: quantidade vazia não grava; cancelar/reabrir conserva pendência; adicionar 4, editar para zero, repor 2 e reabrir conserva 2 com apenas três movimentações. Referência preservada. Evidência: `output/marketplaces/consulta-estoque-51.jpg`. Nenhuma escrita no banco de produção.
- ESLint dos fontes alterados, PADRÃO AVANTA 1.19.2, Ava e diff aprovados. Tipagem do app/declarações aprovada com configuração temporária que exclui artefatos de compilação iOS em `outputs/`; verificação global bruta inclui código de fornecedor nesses artefatos e falha por dependências/tipos externos. Nenhum ajuste de configuração ou exclusão de artefato do usuário foi realizado. Build/publicação não executados nesta revisão.

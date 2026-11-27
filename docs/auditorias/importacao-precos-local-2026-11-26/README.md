# Importação seletiva de preços — 3.2.0.529 local

## Origem e preservação

Base oficial consultada na rede: main `ebee54e9a57711870e44faec8699fbed77f96afc`, versão 3.2.0.527. Checkout canônico `/Users/JEFF/avantalab` permanece na sua branch original, com versão local 3.2.0.363 e trabalhos paralelos preservados. Impressão compacta 3.2.0.528 permanece no checkout anterior, sem ser incorporada nesta entrega.

Desenvolvimento local isolado: `/private/tmp/avanta-precos-importacao-20261126`, branch `codex/importacao-precos-seletiva`. Nenhum push, merge remoto, aplicação de migração remota ou publicação autorizado nesta etapa.

PR #44 lida e comparada, sem merge nem cherry-pick. Aproveitado o conceito de destino por tabela e identificação prioritária pelo código. Não aproveitada a remoção da concorrência da rotina SQL antiga nem a edição de campos cadastrais dentro desta importação. Nova rotina exclusiva de preços; rotina antiga preservada para seus demais consumidores.

## Fluxo

Modal oficial, chave oficial por tabela, seletor desabilitado quando inativa; todas iniciam desativadas. Sugestão de origem ao ativar; permite alterar livremente a origem e reutilizar a mesma coluna em vários destinos. Limpar seleção, Cancelar e Revisar importação no rodapé. Sem botão Somente padrão, contagem no rodapé da seleção ou bloco com nome do arquivo e identificação das colunas.

Revisão consulta preços atuais no servidor. Exibe correspondências e cada preço anterior/novo. Confirmar envia o mesmo payload e sua revisão; mudança de produto, preço ou tabela exige nova conferência. Operação transacional, histórico com origem importacao e arquivo no registro da importação. Não cria produtos, não recebe campos cadastrais nem altera estrutura das tabelas.

Tabelas inativas não recebem gravações. **Sem modificar a regra existente de herança:** tabelas sem preço específico acompanham o padrão. Se o padrão for alterado, a tela informa essa regra; não cria registros em tabelas não selecionadas para congelá-las. Quando um destino selecionado coincide com o padrão antigo, mas o padrão mudará no mesmo lote, materializa o preço escolhido nesse destino para manter a revisão correta.

## Validação segura

- Planilhas externas, AvantaLab v2/v3 antigas, aba legada separada, zero, vazios, coluna não selecionada com erro, nomes antigos, duplicidades, ambiguidades, empresa divergente e cabeçalhos normalizados.
- Migração `20261126223000_custos_importar_somente_precos.sql` executada em PostgreSQL/WASM PGlite isolado, sem acesso aos dados reais. Testes de preview sem escrita, aplicação, no-op, preservação de estoque/fiscal/nome/código, histórico, empresa, permissão, conflito após revisão e rollback por falha no histórico.
- UI real montada apenas no laboratório localhost:3000, rota de validação fora desta entrega: dados sintéticos e transporte de confirmação simulado. Fluxos de ativar/desativar, origem compartilhada, voltar à seleção, revisão e confirmação conferidos no navegador. Desktop e celular 390 px sem overflow de página; contraste escuro corrigido localmente.
- Evidências visuais em `/Users/JEFF/avantalab/output/previas/importacao-precos/implementacao-local-desktop.jpg` e `implementacao-local-mobile-escuro.jpg` (primeira captura ainda contém bloco de arquivo removido posteriormente).

## Banco e publicação

Migração aditiva preparada, sem apagar dados; cria apenas a nova RPC e suas concessões equivalentes às rotinas de Custos existentes. **Não aplicada no Supabase remoto.** O módulo real poderá ler a seleção localmente, mas a revisão/gravação contra o banco real depende dessa aplicação futura. A validação atual usa banco isolado e transporte simulado; nenhum preço real foi alterado.

Não publicado, não sincronizado com GitHub. Não confundir esta implementação local com a versão que está no domínio oficial.

## Resultado final das verificações

`npm run build` concluído com saída 0: 3.308 testes, 3.302 aprovados, seis ignorados e nenhuma falha; webpack compilado em 36,7 s, TypeScript e geração das páginas concluídos. PADRÃO AVANTA 1.24.0, Ava 3.2.0.529 e diff verificados. Dois testes antigos de contrato foram atualizados para seguir o modal extraído e o parser novo, mantendo as verificações de exportação e concorrência.

Consulta somente de leitura confirmou `origin/main` no SHA de base e o domínio oficial ainda associado a `dpl_53YJrFMiWrrwnTw5mVbLLHV4Meys`, versão 3.2.0.527. Nenhuma publicação realizada.

A pedido do titular, uma alternativa em duas colunas foi renderizada separadamente em `/Users/JEFF/avantalab/output/previas/importacao-precos/proposta-duas-colunas.jpg`. É uma proposta visual, ainda não aplicada ao componente funcional; preserva a decisão pendente sobre a compactação.

## Compactação aprovada — 3.2.0.530

Aplicada a alternativa em duas colunas no componente funcional, após autorização do titular. Desktop: 800 px de modal e duas colunas de 377 px, 11 itens com 50 px cada em seis linhas, lista de 340 px (antes aproximadamente 638 px). Celular de 390 px: uma coluna de 320 px, sem overflow horizontal da página. O texto visual Ativo/Inativo foi ocultado somente nesta grade; a chave oficial continua nativa, com nome e estado acessíveis e área de interação de 44 px. Seletores usam 44 px em dispositivos de toque.

Validação visual no componente real: desktop claro, celular claro e escuro; ativar/desativar, limpar seleção, escolha da origem e retorno da revisão conferidos. Transporte da revisão permanece simulado somente na rota de laboratório; nenhum dado real alterado. 85 testes pertinentes passaram; TypeScript, PADRÃO AVANTA, Ava e diff aprovados. Não repetido o build completo da 3.2.0.529 após esta alteração exclusivamente visual; o componente atualizado foi compilado no servidor local e passou na tipagem.

Evidência final: `/Users/JEFF/avantalab/output/previas/importacao-precos/grade-compacta-local-desktop.jpg`. Migração remota e publicação continuam sem execução.

## Publicação autorizada pelo titular

Em 26/11/2026, após a autorização “publique”, a migração 20261126223000 foi aplicada e registrada no Supabase oficial qzewxhdkwettnlmkjoqd. Antes da execução, rotina inexistente e registro ausente; depois, rotina presente, migração registrada, execução concedida a authenticated e negada a anon. Nenhum preço ou cadastro de produto alterado na aplicação desta migração. Registro e criação da rotina realizados na mesma transação.

Pacote usa como base a produção 3.2.0.527, deployment dpl_53YJrFMiWrrwnTw5mVbLLHV4Meys, conferido no alias oficial. Publicação contém somente a importação de preços e seus refinamentos; a impressão compacta de pedidos continua preservada no checkout anterior.


## Revisão local 3.2.0.534 — aplicação da tabela selecionada

Inventário dos consumidores: Custos (listagem/edição/exportação/reajuste), catálogo de Vendas por PostgREST, catálogo comercial PostgreSQL, resolvedor da gravação comercial e opções/recálculo do editor fiscal. AvantaVendas possui catálogo/preços próprios e não expõe seletor destas tabelas de Custos.

A consulta de Custos passa a ler todas as páginas (500 por lote), ordenadas por tabela/produto e restritas aos IDs das tabelas da empresa. Erro de página recusa o conjunto incompleto. Os caminhos de Vendas já paginados ou PostgreSQL sem LIMIT foram revisados; seleção explícita indisponível passa a ser recusada, sem substituição por outra lista. Editor fiscal prioriza ID do produto na precificação; compatibilidade por SKU preservada para respostas antigas. Pedido comum utiliza opções comerciais separadas das funções fiscais, aplica a lista vinculada ao cliente e preserva seu ID no salvamento e recarga. Troca com itens mantém confirmação de recálculo. Novos itens não usam o preço base enquanto a lista do cliente está indisponível.

Leitura direta de produção confirmou T016: preço padrão 109,00 e NEILTON 80,00. Na interface localhost, NEILTON exibiu 80,00 no catálogo, item adicionado e subtotal; troca confirmada para padrão produziu 109,00 e retorno confirmado à NEILTON restaurou 80,00. Ensaio cancelado sem salvar documento nem preço, sem reserva, assinatura ou transmissão fiscal.

Validação: TypeScript, PADRÃO AVANTA e Ava aprovados. Regressão ampla: 3.314 testes, 3.306 aprovados, 6 ignorados e duas falhas de harness desatualizado (import da consulta e extração da inicialização do editor). Os dois harness foram ajustados para executar as dependências reais; repetição dos 48 testes afetados e relacionados terminou com 48 aprovados e zero falhas. Testes novos cobrem mais de mil preços, isolamento entre tabelas, preço zero, T016 a 80,00, herança legítima, SKU repetido com ID distinto, revisão preservada e recusa de tabela indisponível. Nenhuma publicação nesta revisão.


## Revisão local 3.2.0.535 — Recebimentos e navegação

Botão Notas Fiscais sem badge nem contagem no nome acessível. Ações em Recebimentos exibem Alterar pagamento e parcelas. Conferido no localhost com cobrança real do pedido 2026/5: janela aberta, Boleto e três parcelas selecionados apenas no formulário, depois Cancelar; linha permaneceu PIX, 1/1, R$ 132,05. Nenhuma gravação real.

Servidor: transação serializável, travas na operação e parcelas, comparação das versões de todo o grupo, idempotência em vendas_eventos, histórico imutável preservado e cancelamento de excedentes sem exclusão. Alteração somente de método preserva inclusive valores e vencimentos personalizados. Recebimentos/estornos existentes impedem reparticionamento; método do saldo aberto continua editável. Total exato em centavos; nota, estoque e movimentações financeiras anteriores não são alterados. Usa estruturas existentes, sem migração nova.

48 testes de Recebimentos, integração e menu aprovados; teste adicional da preservação de valores desiguais aprovado. TypeScript, PADRÃO AVANTA e Ava aprovados. Publicação não solicitada.


## Revisões locais 3.2.0.537 e 3.2.0.538 — consignado e controle de parcelas

Consignado envia parcelas=0 e primeiro vencimento vazio; oculta ambos os campos. Conversão de cobrança sem recebimentos/estornos cancela a cobrança das parcelas existentes, sem excluir seus registros, alterar o total da operação, estoque ou nota. Auditoria e idempotência preservadas. Com movimentos financeiros anteriores, conversão é protegida; não desfaz recebimentos. Modelo de saldo/status e resumo do servidor não contam consignado como dívida vencida.

Controle de Parcelas reutiliza LineNumberEditor, com menos à esquerda, quantidade digitável e mais à direita, inteiro de 1 a 120, sem alterar os limites dos consumidores existentes. Conferência no localhost mostrou 1 → 2 → 1; selecionar Consignado removeu campos de parcelas e vencimento. Cancelar manteve cobrança real do pedido 2026/5 intacta (PIX, 1/1 e 132,05).

51 testes direcionados aprovados, incluindo SQL real isolado, proteção de recebimentos anteriores, conversão idempotente a consignado, ausência de atraso, controle de quantidade e regressão de novo pedido/estoque/resumos/filtros. TypeScript, PADRÃO AVANTA e Ava aprovados. Sem publicação ou alteração de dados reais.


## Publicação autorizada — entrega 3.2.0.542

O responsável autorizou publicar os ajustes acumulados de Custos e Vendas e Serviços. Base remota main confirmada em 7d493839a7371b5da026c8b2eb9c4eac48387c03; domínio oficial na produção dpl_Gx6YLb8oQjqKvqE64mP7b4sAJi99 (3.2.0.530). Diff e arquivos novos preservados separadamente antes da integração. Sem migração nova nesta entrega e sem inclusão do trabalho de impressão de pedidos preservado em outro checkout.

Segurança: 1.078 testes aprovados, zero falhas ou ignorados, 204 arquivos em dois processos locais; suíte em 58,7 s. Testes direcionados de preços, recebimentos, consignado e componentes registrados acima. Build completo será executado obrigatoriamente pela Vercel, com promoção automática condicionada à aprovação. Recibo e confirmação final do domínio ficam no output/pipeline do checkout canônico, sem modificar seus trabalhos de desenvolvimento. Nenhuma cobrança real foi alterada para testar a entrega e nenhuma transmissão fiscal foi executada.

# Publicação 3.2.0.414 — contas desconectadas

- Autorizado ajustar e publicar pela main em 13/11/2026. Base main/produção: 337df40 / 3.2.0.411, dpl_CjDttPxgmHSNkUK6EGYsp122p4Rh; fila livre.
- Refinamento: só vínculos de contas explicitamente desconectadas são liberados. Contas conectadas, vencidas ou em atenção permanecem protegidas. A reconexão invalida a prévia; as linhas das contas são travadas durante a transação.
- Vínculos e trabalhos futuros retirados ficam registrados na auditoria. Vendas, eventos, documentos e pesquisas permanecem. Importação posterior reconhece também as referências sem vínculo direto e não recria os cadastros removidos.
- Regressão local: 38 testes aprovados e TypeScript sem erros. Inclui FK real dos controles/fila, conta mista, autorização vencida, reconexão, operação em voo, EAN sem vínculo e repetição idempotente.
- Chrome: dois produtos de conta desconectada selecionados, confirmação explícita, exclusão da lista ativa 7→5; histórico preservado. Produto de conta conectada e produto com saldo continuaram bloqueados.
- Conferência de produção antes da instalação: 15 cadastros ativos na TRIDIUM, 14 consultas de preço, 1 venda; nenhuma migração de limpeza de cadastros instalada. A publicação não executa limpeza de dados.
- A seção abaixo preserva a validação inicial da prévia 3.2.0.413. Build remoto e promoção são registrados no recibo do pipeline.

# Limpar cadastros — validação local 3.2.0.413

Status: implementado e validado localmente. Sem publicação, push ou migração em produção.
PADRÃO AVANTA 1.23.1. Base oficial: origin/main 337df40b935a79eb611084491a2ef125e3505541 (3.2.0.411).
Inclui a correção local 3.2.0.412 do evento já dispensado na limpeza por conta.
Ponto de restauração local: tag `restauração-antes-limpar-cadastros-20261113`, commit d75c99b.

## Comportamento e proteção

- Botão destrutivo compacto à direita das ações, em linha própria abaixo do título.
- Administradores selecionam cadastros individualmente ou todos os disponíveis no filtro. Pesquisa normalizada e filtros Todos/Sem vínculo/AvantaPreços.
- Revisão exibe toda a seleção, inclusive itens fora do filtro atual. Só a confirmação final altera o banco: exige ciência explícita, nome exato do perfil e token da prévia revalidado no servidor.
- A exclusão da lista ativa usa o arquivamento existente: mantém as linhas e referências históricas, inclusive consultas de preço, vendas e movimentos. Registra a auditoria individual existente e a auditoria idempotente do lote.
- Saldo em qualquer estoque, anúncios vinculados/encontrados ou operações atuais bloqueiam o item. Um evento antigo de conta já arquivada é preservado como histórico, sem impedir retirar o cadastro ativo.
- Não transmite alteração ou exclusão aos marketplaces. Não apaga produtos de outro perfil. Nova tentativa com o mesmo identificador recupera o resultado; falha reverte o lote inteiro.

## Validações

- Marketplaces: 1.478 aprovados, zero falhas, 3 testes externos ignorados pelo conjunto (1.481).
- Segurança: 712 aprovados, zero falhas.
- Regressão final dirigida: 30 aprovados, incluindo movimentos de estoque e por depósito preservados e falha simulada após a primeira alteração do lote.
- TypeScript, PADRÃO AVANTA e Ava aprovados para 3.2.0.413.
- Chrome local: seleção individual/todos, pesquisa sem acentos, seleção preservada entre filtros, revisão integral, nome incorreto e falta de ciência bloqueados, retorno sem excluir, resultado e contador após reload, desktop, viewport 390×844 sem transbordamento e tema escuro.
- Banco fictício após excluir três cadastros pela interface: ativos 7→4; pesquisas 2→2; vendas 2→2; registro histórico adicional 1→1; uma auditoria de lote. Dados de produção intactos.

## Teste e próxima etapa

Servidor: http://127.0.0.1:3413/marketplaces/teste-local-limpar-cadastros
Usa exclusivamente PGlite e dados fictícios. Reiniciar dados fictícios repõe o cenário.
As duas rotas de QA não são rastreadas e estão excluídas explicitamente do upload na .vercelignore.
A migração 20261113210000 está somente preparada e foi executada apenas no PostgreSQL de teste.
Antes da publicação autorizada, reconciliar main/produção atuais, aplicar somente a migração declarada, executar o pipeline completo oficial e conferir READY/PROMOTED no domínio.

# Pedido cancelado — restaurar como rascunho

Entrega: **3.2.0.514 — Vendas: restaurar pedido cancelado como rascunho**.
PADRÃO AVANTA **1.24.0**.
Base oficial: `f8cd7f4c35b8239d3d1c07e54145bdcd85cea5c2`.
Pasta isolada: `/private/tmp/avanta-restaurar-pedido-20261124`.
Base de produção: `dpl_4FdhFMd8oPK5mG1FAXHESYRroqwy`.

## Comportamento aprovado

- Popup compacto do pedido cancelado contém somente Restaurar como rascunho.
  Usa o mesmo Dialog, ícones, cores e aviso oficiais; sem opções previstas ou
  outras ações do pedido. O fechamento permanece no cabeçalho.
- Aguarda confirmação real. Clique repetido e fechamento durante envio ficam
  bloqueados; falha mantém o popup e informa o erro. Sucesso retorna o mesmo
  pedido à lista como Rascunho, com as opções normais dessa etapa.
- Servidor exige empresa, sessão, módulo ativo, sales.edit, situação Cancelado e
  versão atual. Transação serializável, bloqueio do pedido, chave idempotente e
  evento de auditoria. Retry antigo não reabre um pedido que já avançou.
- Não refatura, recria parcelas ou movimenta saldo ao restaurar. Conserva itens,
  documentos fiscais e histórico; pendências de estoque/recebimentos bloqueiam.
- Novo faturamento posterior usa chave de ciclo e mantém as parcelas canceladas
  anteriores. Reservas liberadas/devolvidas conservam o retrato dos itens antes
  de liberar o vínculo que impediria a edição do rascunho.

## Banco

Migração: `supabase/migrations/20261124190000_vendas_pedido_restauracao.sql`.
SHA-256: `fe099f557ab0f8b029eac207896ccba04f12035ea4d139bb70161be97f674d71`.

- Índice único continua impedindo parcelas vigentes duplicadas; parcelas
  canceladas permanecem como histórico de ciclos anteriores.
- A restrição de origem permite reserva devolvida histórica com retrato do item,
  sem item ativo vinculado. Permissões e RLS não foram alteradas.
- Aplicada em transação pelo SQL Editor autenticado do projeto Avantalab
  `qzewxhdkwettnlmkjoqd`, após conferir as restrições reais. Prazo de lock 5s.
- Registro `supabase_migrations.schema_migrations`, versão 20261124190000,
  conferido por SELECT: SHA-256 do SQL armazenado igual ao arquivo testado.
- Nenhuma restauração ou alteração de pedido real durante a validação.
- O download de variáveis de produção foi recusado pela revisão automática;
  não foi realizado. O editor autenticado permitiu aplicar somente o SQL
  necessário, sem extrair credenciais.

## Validação

- Quatro testes novos executam o menu/popup e os handlers reais; o ciclo com
  PostgreSQL isolado fatura, cancela, restaura, edita e refatura o mesmo pedido.
  Confere saldos, parcelas antigas, versionamento, isolamento e idempotência.
- Seleção de ciclo, retomada, estoque opcional, nota independente, integração e
  ferramentas: 23 aprovados antes do teste adicional de espera/falha do popup.
- Segurança: 991 aprovados, zero falhas.
- PADRÃO AVANTA e Ava: aprovados para a versão da entrega.
- `next typegen`, `tsc --noEmit --incremental false` e `git diff --check`: aprovados.

Implementação e publicação autorizadas no chat. Checkout principal preservado.
Gate completo e promoção pelo pipeline oficial; confirmação no domínio e métricas
remotas registradas no recibo ignorado de `output/pipeline/` após a publicação.

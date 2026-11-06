# Emissão fiscal vinculada ao pedido — 3.2.0.335

## Diagnóstico confirmado

- A tela publicada 3.2.0.334 mostrava certificado ativo e executor liberado para homologação. A pendência de rota/credenciamento era agrupada como Serviço de emissão, substituindo sua descrição pelo aviso genérico de liberação interna.
- O pedido da Tridium estava confirmado e persistido; não havia rascunho na tabela fiscal do perfil. A nota consultada existia somente no navegador. O fluxo anterior criava o retrato fiscal do pedido apenas ao faturar.

## Correções

- Emitir nota abre a conferência existente. Preparar nota e Validar nota oferecem os passos protegidos anteriores à confirmação explícita da série/número e à continuação do envio.
- Revisar emissor abre o cadastro/credenciamento. Ver serviço abre um diagnóstico separado do executor. Ver certificado preserva o acesso exclusivo ao certificado. O estado de credenciamento não é confirmado automaticamente pelo certificado.
- POST fiscal já autenticado aceita uma referência de pedido. O servidor exige fiscal.prepare e sales.view, verifica perfil, tipo, situação e versão, lê os itens e valores do pedido e consulta cadastros fiscais atuais do próprio perfil. Não aceita itens, emitente ou preços forjados enviados junto à referência.
- Transação com bloqueio do pedido cria somente o retrato fiscal vinculado e seu hash. Não altera pedido, versão, receitas, contas, saldos ou reservas. Repetição reutiliza o vínculo; mais de um vínculo ativo exige revisão. Falha causa rollback.
- A emissão independente fica explicitamente marcada no retrato protegido. Sem essa marca, permanece a validação anterior da origem faturada. Cancelados e devolvidos não ganham preparação independente.
- Faturamento posterior reutiliza o retrato existente e preserva a situação fiscal, evitando outra nota. Notas locais substituídas pelo retrato persistido deixam de duplicar a lista.

## Validação

- PostgreSQL em PGlite: isolamento por perfil, acesso negado, versão divergente, dados forjados ignorados, valores preservados, pedido/versão intactos, estoque/reservas/contas sem mudanças, repetição sem duplicação e faturamento posterior reutilizando a nota.
- Regressões de nota avulsa, faturamento sem estoque, cancelamento, conferência e ações de notas aprovadas.
- 544 testes de segurança do pacote isolado aprovados, tipagem sem erros, ESLint sem erros, PADRÃO AVANTA 1.23.1 e Ava conferidos.
- Prévia do JSX real confirma Emitir nota nas ações e pendência específica com Revisar emissor. Nenhuma nota foi numerada, assinada ou transmitida durante esta correção.
- Nenhuma mudança de banco, RLS, certificado, chave privada ou configuração do executor. Emissão permanece exclusivamente em homologação.

# 3.2.0.503 — Lançamento posterior do estoque

Base main e8b96f1e7c39887d3782c745d81f503f46f416bb, produção 502. Branch isolada codex/pedido-estoque-posterior-20261119. PADRÃO AVANTA 1.24.0. Aplicação/publicação autorizadas após aprovação visual.

- Lançar no estoque somente em pedido com produto e situação Confirmado/Em separação/Faturado, estoque Sem movimentação. Antes de faturar gera reserva; depois gera saída. Conferência explicita a diferença antes da confirmação.
- Reutiliza Dialog, Table, BotaoAcaoCompacto e AvisoFormulario. Bloqueia clique repetido e fechamento durante envio; erro exige atualizar a lista antes de repetir. Pedido/itens/quantidades não são editáveis nessa confirmação.
- Autoridade no servidor: consultar/editar vendas + stock.exit, empresa/sessão/módulo válidos, pedido persistido e versão explícita. Estoque principal ativo; nenhuma criação automática de local/saldo. Quantidades/produtos são lidos do banco, nunca aceitos do navegador.
- Bloqueio FOR UPDATE do pedido e saldos, isolamento serializable, auditoria no mesmo commit. Chave por pedido/versão impede duplicidade até em retorno perdido; estado e reservas impedem segunda ação com outra chave. Saldo disponível considera reservas de outros pedidos e respeita política existente de negativo. Sem alterar política/permissões.
- Reservas posteriores entram no fluxo de separação/faturamento/cancelamento/devolução sem mudar retratos imutáveis. Saldos são relidos por movimento para produtos repetidos em linhas distintas. Nenhuma escrita em notas/arquivos/preços ou financeiro na nova ação.
- SQL validado em PGlite com migrações reais: baixa e retorno, reserva e faturamento, liberações, duplicidade, revisão antiga, outra empresa, local inativo, falta de saldo, rollback por falha na auditoria, permissões e workflow. 734 testes de módulos passaram; TypeScript validado. Nenhuma migração ou banco externo alterado.
- Demonstração no navegador local: pedido fictício sem controle, faturado sem baixa; nova ação conferida, baixa concluída e botão ausente após sucesso. Captura /private/tmp/avanta-estoque-posterior-503.png. Sem dados reais ou transmissão fiscal.
- Publicação pelo pipeline oficial após reconferência de main, fila e domínio; recibo em output/pipeline.

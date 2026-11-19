# 3.2.0.506 — Clientes, confirmação e estoque do pedido

PADRÃO AVANTA 1.24.0. Pacote isolado baseado na main 3.2.0.505, sem alteração do checkout canônico compartilhado.

- Seleção oficial pesquisável com opções somente após digitar, razão social/CPF/CNPJ e até 20 resultados. ID identifica o cliente; nome fantasia não substitui razão social. Diagnóstico somente leitura encontrou o cliente informado ativo, porém anteriormente exibido pelo nome fantasia. Nenhum cliente real foi criado ou modificado.
- Confirmação aguarda ACK antes da navegação. Erro mantém formulário, itens e identidade estável de repetição; exclusão de erro não mascara sucesso. Cabeçalho usa o padrão compacto fiscal, sem movimentação fiscal implícita.
- Saída/reserva autorizada do pedido pode permitir déficit na linha de saldo afetada, transacionalmente. Sem saldo inicial cria linha zero validando produto/empresa/local. Entrada compensa saldo negativo; estornos, versões, auditoria, isolamento e idempotência permanecem. Controle desligado não afeta estoque.
- Testes PGlite: saldo zero, baixa -3, entrada 5, saldo 2; reserva/faturamento/cancelamento, repetição e rollback em falha. QA visual em demonstração local, desktop e 390 px, sem lançar pedidos reais.
- Diagnóstico de produção autorizado e somente leitura: log PostgreSQL de 19/11/2026 19:06:13 UTC indica permission denied for table commercial_policies. Metadados confirmam falta de SELECT para avanta_vendas_runtime. Não foram baixadas variáveis de produção nem alterados pedidos reais.
- Migração 20261119193000_vendas_politica_runtime.sql adiciona somente SELECT/INSERT/UPDATE e três políticas ao serviço interno. Usa vendas_runtime_empresa_liberada por empresa, não concede DELETE ou acesso anon/authenticated. Teste reproduz negação anterior, leitura/gravação versionada permitida, bloqueio de empresa desativada e bloqueio de exclusão. Não desativa RLS nem a validação HTTP de permissões.

## Aplicação autorizada e verificação

Responsável autorizou explicitamente aplicar a correção restrita e publicar. Aplicada somente esta migração no projeto qzewxhdkwettnlmkjoqd, em transação com seu registro em supabase_migrations.schema_migrations; nenhuma fila histórica foi executada. SHA-256: d368843fe07e71bd609d71838ca4b077b51ccd1395ace4e07addc9ea57ca9e02.

Pós-verificação somente leitura confirma RLS ativo, SELECT/INSERT/UPDATE verdadeiros para avanta_vendas_runtime, DELETE falso e SELECT falso para anon/authenticated. As três políticas usam vendas_runtime_empresa_liberada(company_id). Sem alteração de dados comerciais reais.

Suíte local de segurança: 962 testes aprovados, zero falhas. Mais dois testes de saldo/ponte passaram após a suíte; tipagem, PADRÃO AVANTA, Ava e validadores Web/Mobile/AvantaVendas aprovados. Build completo remoto permanece obrigatório.

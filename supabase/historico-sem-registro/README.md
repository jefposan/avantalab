# Fontes históricas de recursos presentes no produto

Os 15 SQLs desta pasta descrevem tabelas, funções, índices e proteções presentes
no Supabase e usados pelo código da produção 3.2.0.309. Não foram classificados
como recursos obsoletos. Seus bytes originais foram preservados.

Os identificadores desses arquivos não aparecem no histórico remoto consultado.
Isso é uma lacuna de rastreabilidade, não prova de ausência das funcionalidades.
Comentários antigos como “preparada localmente” descrevem a época da elaboração;
o estado constatado em 04/11/2026 está no inventário auditado.

Esta pasta preserva fontes do produto e também é consumida por testes isolados.
Ela fica fora de `supabase/migrations` para evitar reaplicação automática de SQL
sobre estruturas já existentes. Não é uma pasta de migrações pendentes e não
autoriza `db push`, `migration repair`, alterações de RLS ou execução de comandos.

Procedência e hashes: `proveniencia.json`.
Análise individual: `../../docs/auditorias/reconciliacao-2026-11-04/AUDITORIA-15-SQL.md`.
A raiz canônica e o espelho fiel da produção não foram alterados por esta organização.

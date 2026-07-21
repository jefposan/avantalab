# Banco de dados (Supabase) — AvantaLab

Fontes: `supabase/migrations/*.sql` (33 arquivos), scripts `*.sql` na raiz do repositório
(aplicados manualmente via SQL Editor, anteriores ao uso de migrations) e
`vendas_mobile/supabase/schema_vendas_mobile.sql`.

⚠️ IMPORTANTE — as tabelas do NÚCLEO financeiro (`empresas`, `usuarios_empresa`,
`configuracoes`, `lancamentos`, `faturamentos`, `faturamentos_entradas`,
`despesas_cadastradas`, `feedbacks`) NÃO possuem `CREATE TABLE` no repositório: foram
criadas manualmente no painel antes do versionamento. Suas colunas abaixo foram
inferidas do código (`app/lib/database.ts`, rotas de API, mobile-app.js) e dos
`ALTER TABLE` dos setups. Estrutura completa: PENDENTE DE CONFIRMAÇÃO — exportar via
`supabase db dump` do projeto vivo antes de qualquer migração.

## 1. Núcleo (inferido do código)

### empresas
- `id uuid pk`, `nome text`, `tipo_perfil text ('empresa'|'pessoal')`, `criado_em/created_at timestamptz` (nome exato da coluna de criação: PENDENTE DE CONFIRMAÇÃO).
- Triggers (de migrations): `empresas_inicializar_cadastro_perfil` (cria linha em `cadastros_perfil` com prazo de 7 dias) e `empresas_criar_codigo_vinculo` (gera código `AVA-XXXXXXXX` em `codigos_vinculo_empresa`).
- RLS: usuários vinculados leem (política criada manualmente; PENDENTE DE CONFIRMAÇÃO do texto exato).

### usuarios_empresa
- `id`, `empresa_id fk empresas`, `user_id fk auth.users`, `nome`, `email`, `login` (login interno), `perfil` (`gestor_master|administrador|operador_completo|operador_simples|funcionario_ponto`), `status` (`ativo|bloqueado`), `telefone`(?), `cpf`(?), `criado_em`, `atualizado_em`. Colunas `login/telefone/cpf`: usadas pelas rotas de usuário interno — PENDENTE DE CONFIRMAÇÃO da lista completa.
- É a fonte de TODAS as políticas RLS do padrão "usuário enxerga o que é da empresa vinculada".

### configuracoes (por empresa)
- `empresa_id pk/fk`, `cor_primaria text` (padrão `#003E73`), `dark_mode boolean`, `duplicados_ativo boolean`, `logo_url text`, `logo_settings jsonb {scale,x,y}`, `dashboard_ordem_web jsonb`, `dashboard_ocultos_web jsonb` (ambas via `dashboard_ordem_web_setup.sql`).

### lancamentos (despesas — livro-caixa de saídas)
- `id bigint pk`, `empresa_id`, `ano int`, `mes text` (MAIÚSCULO por extenso), `dia int`, `despesa_nome text`, `descricao text`, `valor numeric`, `status text` (`null`=realizada, `prevista`, `confirmada`, `cancelada` — `despesa_prevista_setup.sql`), `tipo_obs text` (`previsto|fixa|parcela|null` — `despesas_tipo_setup.sql`), `recorrencia_id uuid fk recorrencias` (índice único parcial `(recorrencia_id, ano, mes)` evita duplicar fixa no mês), `nota_arquivo_path text` (migration notas), `criado_em`.
- Trigger `lancamentos_remover_arquivo_nota`: ao excluir/trocar `nota_arquivo_path`, apaga o objeto no bucket `notas-lancamentos` (versão resiliente: erro vira `warning`).

### faturamentos (receita agregada mensal)
- `empresa_id`, `ano`, `mes`, `valor` com `unique(empresa_id, ano, mes)` (o upsert das triggers do Vendas depende desse unique). Detalhe completo: PENDENTE DE CONFIRMAÇÃO.

### faturamentos_entradas (receitas por dia/origem)
- `id uuid`, `empresa_id`, `ano`, `mes`, `dia`, `origem text`, `valor numeric`, `status text` (`prevista`/null — `receitas_previstas_setup.sql`), `tipo_obs text` (`previsto`, `vendas_mobile_sistema`), `criado_por uuid`, `updated_at`.
- Trigger `proteger_receita_vendas_mobile_gestao_trigger`: linhas com `tipo_obs='vendas_mobile_sistema'` não podem ser inseridas/alteradas/excluídas manualmente; somente quando `set_config('app.vendas_mobile_sync','1',true)` está ativo (usado pela função de sincronização).

### despesas_cadastradas (catálogo de tipos de despesa por empresa)
- `empresa_id`, `nome`, `categoria` (+ id/criado_em). Semeada no primeiro acesso com `DESPESAS_PADRAO_EMPRESA`/`DESPESAS_PADRAO_PESSOAL` (`app/lib/perfis.ts`).

### feedbacks
- `id`, `empresa_id`, `usuario_id`, `acesso_id`, `nome_empresa`, `nome_usuario`, `email_usuario`, `tipo` (`sugestao|duvida|reclamacao|avaliacao`), `mensagem`, `status` (`novo|em_analise|respondido|arquivado`), `created_at`.

## 2. Scripts de setup da raiz (ordem lógica de aplicação)

1. `recorrencias_setup.sql` — tabela `recorrencias` (despesas fixas): `empresa_id`, `nome`, `categoria`, `dia (1–31)`, `ativo`; RLS CRUD por vínculo; função genérica `set_atualizado_em()` + trigger.
2. `despesa_prevista_setup.sql`, `despesas_tipo_setup.sql`, `receitas_previstas_setup.sql` — colunas `status`/`tipo_obs`/`recorrencia_id` (ver acima).
3. `dashboard_ordem_web_setup.sql` — colunas de ordem/ocultos do kanban web em `configuracoes`.
4. `notificacoes_push_setup.sql` — `push_subscriptions` (`user_id`, `empresa_id`, `endpoint unique`, `p256dh`, `auth`, `user_agent`; RLS: dono gerencia as próprias) e `notificacoes` (`empresa_id`, `user_id` nullable = empresa toda, `titulo`, `corpo`, `url` padrão `/mobile`, `tipo`, `lida`; RLS select/update das que enxerga; INSERT só service role).
5. `agenda_push_setup.sql` — `agenda_itens` (id text gerado no app, `user_id`, `empresa_id`, `tipo`, `titulo`, `descricao`, `ano`, `mes`, `dia`, `repetir`, `repeticao` diaria|semanal|quinzenal|mensal|anual, `excluir_dias text[]` formato `"ANO-MESINDEX0a11-DIA"`); adiciona `origem_id`/`ref_data` em `notificacoes` + índice único `(origem_id, ref_data)` para dedup dos jobs.
6. `notificacoes_delete_setup.sql`, `broadcast_setup.sql` — delete de notificações pelo usuário; `empresa_id` nullable para broadcast global.
7. `modulos_setup.sql` — `modulos` (id slug, nome, descricao, icone, disponivel, `perfis text[]`, ordem; seed `ponto` para `{empresa}`) e `empresa_modulos` (`empresa_id`, `modulo_id`, `ativo`, `origem plano|avulso|cortesia`, `expira_em`, unique). RLS: catálogo legível por autenticados; ativação CRUD pelos usuários da empresa (fase de testes — quando a cobrança valer, escrita passa ao servidor).
8. `ponto_setup.sql` + incrementos `ponto_horario_setup.sql` (hora_entrada/hora_saida), `ponto_dias_setup.sql` (`dias_trabalho smallint[]` padrão `{1,2,3,4,5}`), `ponto_geofence_setup.sql` (`ponto_config`: lat/long/`raio_m` padrão 100; coluna `distancia_m` em registros), `ponto_cpf_setup.sql` → `ponto_cpf_global_setup.sql` (CPF único GLOBAL), `ponto_dias_nao_uteis_setup.sql` (igual à migration 20260710143000). Detalhes em [ponto.md](ponto.md).
9. `ponto_isolar_usuarios_setup.sql` — redefine `buscar_email_por_login_rpc` e `listar_usuarios_empresa_rpc` para ignorar `funcionario_ponto` e altera as policies de `configuracoes`, `despesas_cadastradas`, `faturamentos`, `lancamentos`, `faturamentos_entradas`, `recorrencias`, `empresa_modulos`, `notificacoes`, `feedbacks` acrescentando `perfil is distinct from 'funcionario_ponto'`.
10. `criar_empresa_qualquer_usuario.sql` — `criar_empresa_inicial_rpc(p_nome_empresa)` (security definer): qualquer autenticado cria empresa + vira gestor_master + configurações padrão.
11. `cobranca_setup.sql` / `cobranca_migracao.sql` (idempotente) — `cupons` (codigo unique, tipo periodo|vitalicio, duracao_valor/unidade, max_usos, usos, validade, ativo; SEM policies = só service role), `assinaturas` (uma por empresa; status trial|ativa|expirada|cancelada|cortesia|inadimplente; ciclo mensal|anual; trial_fim; valido_ate; gateway*; cupom_id; RLS: select por vínculo, escrita só service role), `cupons_resgates`. `cobranca_webhook_log_setup.sql` (diagnóstico temporário), `cobranca_rollback.sql` (drop das 3), `cupons_exemplos.sql` (exemplos — usa coluna antiga `duracao_meses`, hoje inválida).

## 3. Migrations versionadas (ordem cronológica — resumo do que cada uma introduz)

| Migration | Conteúdo |
|---|---|
| `20260702165900_admin_console` | `admin_configuracoes` (senha do /admin: hash pbkdf2 + salt + iterations) e `admin_disparos` (histórico de broadcasts). RLS sem policies (service role). |
| `20260702170000_ponto_lembretes` | `ponto_lembretes_enviados` (dedup user/dia/tipo/momento). |
| `20260702170100_ponto_dashboard_realtime` | adiciona `ponto_registros` e `ponto_funcionarios` à publicação realtime. |
| `20260703153000_push_subscriptions_origem` | coluna `app_origem ('mobile'|'ponto')` em `push_subscriptions` + backfill. |
| `20260706190000_cobranca_ciclo_financeiro` | consolida `cupons`/`assinaturas` (+colunas), `assinatura_faturas` (espelho de cobranças Asaas, `gateway_payment_id unique`), `cobranca_webhook_eventos` (caixa de entrada idempotente por `asaas_event_id`), agenda pg_cron `conciliar-cobrancas` a cada 30 min chamando a Edge Function com secret do Vault `cron_edge_secret`. URL do projeto hardcoded na migration (ajustar ao recriar!). |
| `20260707093000_assinaturas_dados_cobranca` | colunas cobranca_nome/documento/email/telefone em `assinaturas`. |
| `20260708120000_liberar_perfis_existentes_cortesia` | todos os perfis existentes → status `cortesia` sem prazo. |
| `20260708143000_caixinhas_movimentos` + `20260708150000` | `caixinhas_movimentos` (reserva/caixinha: tipo saldo_inicial|aporte|resgate|rendimento|ajuste; `valor>=0`; unique parcial de 1 `saldo_inicial` por empresa; RLS CRUD por vínculo ativo). |
| `20260710143000_ponto_dias_nao_uteis` | tabela + RLS + realtime (igual ao setup da raiz). |
| `20260712120000_primeiro_perfil_cadastro_idempotente` | `criar_primeiro_perfil_cadastro_rpc(nome, tipo)` — advisory lock por usuário, idempotente: se já tem vínculo ativo devolve a empresa existente (`criado:false`); senão cria empresa+vínculo gestor_master+configuracoes. Recria `criar_empresa_inicial_rpc` gravando o nome do usuário no vínculo. |
| `20260712130000_cadastro_completo_perfil` | `cadastros_perfil` (dados fiscais/endereço; CNPJ único; `obrigatorio_em = now()+7 dias`; escrita SÓ pela API) + trigger de inicialização + backfill. |
| `20260712140000_codigos_vinculo_empresa` | `codigos_vinculo_empresa` (código público `AVA-[A-Z0-9]{8}`), RPC `regenerar_codigo_vinculo_empresa_rpc`, trigger na criação de empresa, backfill. Select só gestor. |
| `20260712143000_solicitacoes_acesso_vendas_mobile` | `vendas_mobile_solicitacoes_acesso` (pendente/aprovada/rejeitada/cancelada; unique empresa+user) e `vendas_mobile_acessos` (papel vendedor|gestor; status ativo|bloqueado). RPCs: `solicitar_acesso_vendas_mobile_rpc(codigo,nome,tel)`, `analisar_solicitacao_vendas_mobile_rpc(id,aprovar,obs)`, `meus_acessos_vendas_mobile_rpc()`. |
| `20260712150000` | remove acesso implícito de gestores no `meus_acessos_...` (acesso precisa existir na tabela). |
| `20260712153000` | `gerenciar_acesso_vendas_mobile_rpc(id, 'revogar'|'reativar'|'excluir')`. |
| `20260712170000_notas_lancamentos` + `20260713090000` | coluna `nota_arquivo_path`, bucket privado `notas-lancamentos` (6 MB, jpeg/png/webp), trigger de limpeza do arquivo (resiliente). |
| `20260713103000_pacotes_e_custo` | `vendas_mobile_pacotes` ganha user_id/numero/origem; produtos ganham `preco_custo`; FK produto→pacote passa a `on delete cascade`; policies de pacote (ler oficiais ou próprios; gerir próprios). |
| `20260713193000_pagamentos_vendas_mobile` | `vendas_mobile_pagamentos` (+desconto, saldo_anterior, saldo_final). |
| `20260713233000_conteudos_vendas_mobile` | `vendas_mobile_conteudos` (pagina novidades|informacoes; informações globais `empresa_id null` com seed; novidades por empresa geridas por gestor). |
| `20260714120000_imagens_produtos` | bucket público `vendas-produtos` (5 MB) com policies por pasta `auth.uid()`. |
| `20260714183000_divulgacao` | seed módulo `vendas_mobile` no catálogo; `vendas_mobile_divulgacao_pastas` e `_materiais` (imagem|video, arquivo/miniatura); bucket público `vendas-divulgacao` (100 MB, imagens+vídeos) com policies por pasta = empresa do gestor. |
| `20260714193000_subpastas` | `pasta_pai_id` + trigger anti-ciclo/mesma-empresa. |
| `20260714210000_suspensao` | funções `vendas_mobile_modulo_ativo()` / `modulo_vendas_mobile_ativo_rpc(empresa)`; TODAS as tabelas do vendedor passam a: SELECT sempre (backup), INSERT/UPDATE/DELETE só com módulo ativo (inclui storage `vendas-produtos`). |
| `20260714213000_fila_miniaturas` | colunas de status de miniatura no material; `vendas_mobile_thumbnail_jobs`; triggers que enfileiram vídeo sem capa; `despachar_thumbnail_vendas_mobile()` chama o Cloud Run via pg_net com secrets do Vault (`vendas_thumbnail_worker_url`, `vendas_thumbnail_worker_secret`); `processar_fila_thumbnail_vendas_mobile()` agendada por pg_cron a cada 1 min (retentativas ≤3, timeout 10 min); realtime nos materiais. |
| `20260714220000_dashboard_clientes` | `data_nascimento` no cliente; `preco_custo` no item de pedido; backfill do custo a partir de `metadados`. |
| `20260715103000_catalogos_estoque` | catálogo mestre por empresa: `vendas_mobile_catalogos`, `vendas_mobile_catalogo_produtos` (com campos fiscais NCM/CST/alíquotas), `vendas_mobile_catalogo_recebimentos` (dedup por vendedor), `vendas_mobile_estoque_movimentos`; colunas de vínculo no produto pessoal + `estoque_controlado`; função `vendas_mobile_pode_gerir_catalogo(empresa)`; RPCs `sincronizar_catalogo_vendas_mobile_rpc()` (copia produtos ativos do catálogo p/ vendedor) e `movimentar_estoque_vendas_mobile_rpc(produto,tipo,qtd,obs)` (entrada/ajuste com trilha de saldo); storage `vendas-produtos/catalogos/<empresa_id>/...` para gestores. |
| `20260715213000_integracao_receitas` | `empresa_id` em pedidos/pagamentos + backfill + trigger `preencher_empresa_lancamento_vendas_mobile`; `vendas_mobile_integracao_gestao` (base_receita `recebidos|vendidos`); `vendas_mobile_receitas_gestao` (1 entrada de faturamento por empresa+dia); trigger de proteção em `faturamentos_entradas`; função central `sincronizar_receita_vendas_mobile_gestao(empresa,data)` (recalcula valor do dia, cria/atualiza/apaga a entrada `origem='Vendas Mobile'`, ajusta o agregado `faturamentos` pelo delta); triggers after IUD em pedidos e pagamentos; RPCs `configurar_integracao_gestao_vendas_mobile_rpc(base)` e `obter_integracao_gestao_vendas_mobile_rpc()`; backfill histórico. Base `vendidos` exclui status cancelada/convertida e forma de pagamento contendo "consign". |
| `20260715230000_vinculos_comerciais_e_reset` | `vendas_mobile_vinculos_comerciais` (1 ativo por vendedor — índice único parcial; flags novidades/divulgacao/catalogo); trigger em `vendas_mobile_acessos` ativa vínculo ao aprovar; RPCs `meus_vinculos_comerciais_...`, `atualizar_recurso_vinculo_comercial_...` (com opção de remover produtos do catálogo desligado); `sincronizar_catalogo` passa a usar o vínculo ativo; `vendas_mobile_backups_reset` + `resetar_vendas_mobile_rpc('RESETAR')` (backup JSONB + apaga dados operacionais do vendedor, preserva vínculo ativo). |
| `20260715231000_backup_reset_completo` | reset passa a incluir itens de pedidos, agenda e vínculos no backup. |
| `20260715233000_perfil_financeiro_independente` | `vendas_mobile_perfis_financeiros` (user → empresa destino financeiro, escolhido em Configurações; exige papel gestor/admin na empresa); `empresa_financeira_vendas_mobile(user)`; trigger de preenchimento passa a usá-la (erro "Defina um destino financeiro" se ausente); RPCs `meus_perfis_financeiros_...` e `definir_perfil_financeiro_...`; integração de receitas passa a usar o perfil financeiro. |
| `20260716090000_desvincula_empresa_comercial_anterior` | `desvinculado_em` no vínculo; aprovar novo acesso BLOQUEIA o acesso anterior (`vendas_mobile_acessos.status='bloqueado'`); políticas de leitura de novidades/divulgação passam a permitir histórico congelado (conteúdo criado até `desvinculado_em`). |

## 4. Storage (buckets)

| Bucket | Público | Limite | Tipos | Policies |
|---|---|---|---|---|
| `notas-lancamentos` | não | 6 MB | jpeg/png/webp | acesso via API (service role); trigger limpa arquivo órfão |
| `vendas-produtos` | sim | 5 MB | jpeg/png/webp | pasta `<auth.uid()>/...` do vendedor (escrita exige módulo ativo); pasta `catalogos/<empresa_id>/...` para gestores |
| `vendas-divulgacao` | sim | 100 MB | imagens + mp4/webm/quicktime | escrita por gestores na pasta da própria empresa |

## 5. RPCs (visão consolidada)

Security definer, `grant execute to authenticated` salvo indicação:
`criar_primeiro_perfil_cadastro_rpc`, `criar_empresa_inicial_rpc`,
`regenerar_codigo_vinculo_empresa_rpc`, `buscar_email_por_login_rpc`,
`listar_usuarios_empresa_rpc`, `solicitar_acesso_vendas_mobile_rpc`,
`analisar_solicitacao_vendas_mobile_rpc`, `meus_acessos_vendas_mobile_rpc`,
`gerenciar_acesso_vendas_mobile_rpc`, `modulo_vendas_mobile_ativo_rpc`,
`vendas_mobile_modulo_ativo` (helper), `vendas_mobile_pode_gerir_catalogo` (helper),
`sincronizar_catalogo_vendas_mobile_rpc`, `movimentar_estoque_vendas_mobile_rpc`,
`configurar_integracao_gestao_vendas_mobile_rpc`, `obter_integracao_gestao_vendas_mobile_rpc`,
`meus_vinculos_comerciais_vendas_mobile_rpc`, `atualizar_recurso_vinculo_comercial_vendas_mobile_rpc`,
`resetar_vendas_mobile_rpc`, `meus_perfis_financeiros_vendas_mobile_rpc`,
`definir_perfil_financeiro_vendas_mobile_rpc`, `empresa_financeira_vendas_mobile` (helper),
`sincronizar_receita_vendas_mobile_gestao` (interna), `despachar_thumbnail_vendas_mobile` (interna),
`processar_fila_thumbnail_vendas_mobile` (interna/cron).
`admin_metricas_uso` é chamada por `/api/admin-consumo` mas NÃO está no repositório —
PENDENTE DE CONFIRMAÇÃO (definida direto no banco).

## 6. Recriação do zero em ordem segura

1. Extensões: `pgcrypto`, `pg_cron` (schema pg_catalog), `pg_net` (schema extensions); Vault com secrets `cron_edge_secret`, `vendas_thumbnail_worker_url`, `vendas_thumbnail_worker_secret`.
2. Núcleo manual (sem DDL no repo — reconstruir a partir da seção 1 e validar com dump): `empresas`, `usuarios_empresa`, `configuracoes`, `despesas_cadastradas`, `lancamentos`, `faturamentos`, `faturamentos_entradas`, `feedbacks` + policies RLS padrão por vínculo.
3. Scripts da raiz na ordem da seção 2.
4. `vendas_mobile/supabase/schema_vendas_mobile.sql` (tabelas base do Vendas — as migrations posteriores assumem que existem).
5. `supabase/migrations/*` em ordem cronológica (`supabase db push`). Ajustar a URL do projeto na migration `20260706190000` (job de conciliação) e os secrets do Vault antes.
6. Buckets/policies de storage já são criados pelas migrations; conferir `notas-lancamentos`.
7. Edge Functions (`supabase functions deploy`) + secrets (`VAPID_*`, `OPENAI_API_KEY`, `ADMIN_FEEDBACKS_TOKEN`, `ASAAS_API_KEY`, `ASAAS_BASE_URL` opcional).
8. Agendamentos: pg_cron já criado pelas migrations (conciliar-cobrancas, miniaturas); agendar `processar-agenda`, `processar-despesas-dia` (diários) e `processar-lembretes-ponto` (frequência ≤10 min) — feitos hoje pelo painel; PENDENTE DE CONFIRMAÇÃO dos crons exatos.
9. Auth: habilitar e-mail/senha, telefone (se usado) e Google OAuth; configurar redirect URLs (`/mobile/vendas`, domínio de produção).
10. Realtime: publicações extras já são adicionadas pelas migrations (ponto, dias não úteis, materiais de divulgação).

# Fluxos e regras de negócio — AvantaLab

Formato das regras: condição → resultado; exceções e dados afetados quando relevantes.

## 1. Autenticação e cadastro

### Login (web `/`, mobile `/mobile`)
- Login por e-mail OU por login interno: o app chama `buscar_email_por_login_rpc(login)` para resolver o e-mail sintético e autentica com `signInWithPassword`. Funcionários de ponto são ignorados por essa RPC (não logam no sistema financeiro).
- Após login, `buscarEmpresasDoUsuario` lista vínculos ativos: 0 empresas → fluxo de criação de primeiro perfil; 1 → entra direto; várias → tela de seleção de perfil. Último perfil usado é lembrado (`avantalab_mobile_ultimo_perfil_id` no mobile).
- Se o papel do vínculo é `funcionario_ponto`, o mobile redireciona para `/ponto` (`telaRedirecionandoPonto`).
- "Manter conectado" (mobile): sessão preservada por até 30 dias com renovação em uso (chave `avantalab_ultima_atividade`).
- Login Google: presente no mobile (`signInWithOAuth` em `mobile-app.js`) e no Vendas Mobile. No web `page.tsx` não há chamada `signInWithOAuth` — PENDENTE DE CONFIRMAÇÃO se o web oferece Google.

### Cadastro
- Campos: nome, nome do perfil, e-mail, telefone (DDI padrão 55), senha + confirmação, aceite de termos (versão em `app/lib/legal.ts` — `TERMOS_VERSAO`), cupom opcional, tipo de perfil (`empresa`|`pessoal`), modo de início para empresa (`trial`|`assinar`).
- Telefone é verificado por SMS: `/api/sms/enviar-codigo` → Twilio Verify → `/api/sms/verificar-codigo`. Existe fluxo de "telefone obrigatório" pós-login para contas antigas sem telefone confirmado (estado `validacaoTelefoneObrigatoria`).
- Rascunho de cadastro é preservado em `sessionStorage` (web `avantalab_web_rascunho_cadastro`, mobile `avantalab_mobile_rascunho_cadastro`).
- Primeiro perfil: RPC idempotente `criar_primeiro_perfil_cadastro_rpc(nome, tipo)` — se o usuário já tem vínculo ativo devolve o existente (evita duplicar por duplo clique). Cria `empresas` + `usuarios_empresa` (gestor_master) + `configuracoes` padrão (`cor_primaria #003E73`, dark_mode false, duplicados_ativo true).
- Ao criar perfil, o app insere as despesas/categorias padrão (`inserirDespesasPadraoPerfil`), editáveis depois.
- Triggers do banco criam automaticamente: linha em `cadastros_perfil` (prazo de 7 dias para completar o cadastro fiscal) e código público em `codigos_vinculo_empresa`.

### Recuperação de senha
- `/api/senha/enviar-codigo`: recebe e-mail ou login → resolve o vínculo → envia código SMS ao telefone cadastrado.
- `/api/senha/redefinir`: valida código no Twilio e usa `auth.admin.updateUserById` para trocar a senha.
- Variante do Vendas Mobile em `/api/vendas/senha/*` (localiza pelo e-mail nas solicitações de acesso do Vendas) e reset padrão do Supabase (`resetPasswordForEmail`) no cliente do Vendas.

### Cadastro completo do perfil (`cadastros_perfil`)
- Todo perfil tem 7 dias (`obrigatorio_em`) para preencher dados fiscais/endereço via modal (`CadastroPerfilModal` no web; telas próprias no mobile). Escrita passa exclusivamente por `/api/perfil-cadastro` (valida vínculo/gestor, CPF/CNPJ, CEP via `/api/cep`→ViaCEP). CNPJ é único global.

## 2. Perfis, empresas e permissões

- Um usuário pode ter vários perfis (empresas) e alternar entre eles. Perfil tem `tipo_perfil` `empresa` ou `pessoal` (categorias e despesas padrão diferentes — `app/lib/perfis.ts`).
- Papéis por vínculo: `gestor_master` (dono), `administrador`, `operador_completo`, `operador_simples`, `funcionario_ponto` (exclusivo do módulo Ponto, sem acesso ao financeiro).
- Recursos administrativos (usuários, configurações, módulos, ponto admin) exigem gestor_master/administrador; operadores têm limites de inserção/edição/exclusão (validado na UI e por RLS).
- Criar usuário interno (`/api/criar-usuario-interno`): login normalizado (minúsculas, sem acento, espaços→ponto) → e-mail sintético; papéis permitidos: administrador, operador_completo, operador_simples. CPF não pode duplicar.
- Vincular usuário existente (`/api/vincular-usuario-existente`): busca por login/e-mail/CPF e cria vínculo adicional em outra empresa.
- Qualquer usuário autenticado pode criar novos perfis próprios (`criar_empresa_inicial_rpc`), tornando-se gestor_master do novo perfil (no plano Pessoal grátis, criar múltiplos perfis pessoais é recurso premium; criar perfil empresa continua livre).

## 3. Cobrança e acesso (feature flag)

- `NEXT_PUBLIC_COBRANCA_ATIVA` desligada → tudo liberado (estado atual de produção; migration 20260708120000 colocou todos os perfis como `cortesia`).
- Planos/preços (`app/lib/cobranca.ts`): empresa R$ 34,90/mês ou R$ 348/ano; pessoal_premium R$ 9,90/mês ou R$ 99/ano.
- Perfil EMPRESA: tudo-ou-nada. Sem assinatura vigente → `PaywallEmpresa` bloqueia o app. Trial de 7 dias (`/api/cobranca/definir-inicio`, modo `trial`) ou direto ao paywall (modo `assinar`).
- Perfil PESSOAL: núcleo sempre livre; recursos premium (`ava`, `analises`, `exportacao`, `busca_lancamentos`, `multiplos_perfis`, `notificacoes`, `organizar_dashboard`, `organizar_atalhos`, `usuarios_internos`, `ponto`) exigem Premium (modal `PremiumPessoalModal`).
- Vigência (`assinaturaVigente`): ativa; cortesia sem prazo ou dentro do prazo; trial dentro de `trial_fim`; inadimplente/cancelada até `valido_ate` (inadimplência ganha 3 dias de carência na conciliação).
- Cupons: resgate via `/api/cobranca/resgatar-cupom` → status `cortesia` com prazo derivado de `duracao_valor/unidade` (ou vitalício). Valida `ativo`, `validade`, `max_usos`.
- Asaas: `/api/cobranca/assinar` cria customer+subscription e devolve invoiceUrl; webhook `/api/cobranca/webhook` (token no header) grava `cobranca_webhook_eventos` (idempotente por `asaas_event_id`) e atualiza `assinaturas`/`assinatura_faturas`; Edge `conciliar-cobrancas` (30 em 30 min) recupera webhooks perdidos.
- Perfis criados antes de `NEXT_PUBLIC_COBRANCA_LANCAMENTO` são tratados como ativos (clientes atuais).

## 4. Lançamentos financeiros (núcleo)

- Receitas: entradas diárias em `faturamentos_entradas` (origem, dia, valor) + total mensal agregado em `faturamentos`. Entrada com data futura → `status='prevista'`, `tipo_obs='previsto'` (badge), confirmável na data.
- Despesas (`lancamentos`): avulsa (status null); futura → `status='prevista'`, `tipo_obs='previsto'` (na data: confirmar/ajustar/excluir; alterar data mantém "prevista"); parcelamento → gera um lançamento por mês com `tipo_obs='parcela'` (não pede confirmação); fixa → recorrência.
- Despesas fixas (`recorrencias`): nome, categoria, dia do mês; ao criar pode lançar o mês atual e projetar N meses à frente (`novaRecorrMesesFrente`). Geração mensal idempotente: `garantirFixasDoMesAtual` + índice único `(recorrencia_id, ano, mes)`. Editar/excluir a linha mensal afeta só aquele mês; a recorrência é gerida na tela "Despesas fixas".
- `status='cancelada'` = "não ocorreu" (fora dos totais).
- Duplicidade: alerta opcional conforme `configuracoes.duplicados_ativo`.
- Caixinha (reserva): `caixinhas_movimentos` — saldo_inicial (único), aporte, resgate, rendimento, ajuste; pode vincular a um lançamento.
- Nota anexa: upload por `/api/lancamentos/nota` (bucket privado, 6 MB); leitura de comprovante por foto via OpenAI (`/api/lancamentos/ler-foto`) preenche o formulário.
- EBITDA/relatórios: categorias `Amortização`, `Depreciação`, `Despesas financeiras`, `Imposto sobre lucro` são excluídas do EBITDA (`CATEGORIAS_EXCLUSAO_EBITDA`).

## 5. Agenda, avisos e notificações

- `agenda_itens`: lembretes com repetição diaria/semanal/quinzenal/mensal/anual; exclusão de ocorrência única via `excluir_dias` (`"ANO-MES0a11-DIA"`). A agenda também exibe as despesas futuras (previstas/fixas/parcelas) e, no Vendas, aniversários.
- Sino (`notificacoes`): user_id preenchido = pessoal; nulo = empresa toda. Usuário marca como lida e pode apagar (apagar geral remove para toda a empresa).
- Push Web (VAPID): inscrições por aparelho em `push_subscriptions` com `app_origem` `mobile`|`ponto`. Inscrições 404/410 são removidas automaticamente.
- Jobs diários: `processar-agenda` (lembretes de hoje) e `processar-despesas-dia` (pagamentos de hoje; título "Despesa para confirmar hoje" quando `status='prevista'` e não parcela). Dedup por `(origem_id, ref_data)`.

## 6. Vendas Mobile — acesso e vínculos

### Solicitação e aprovação
- O vendedor cria conta (e-mail/telefone/Google) e solicita acesso informando o CÓDIGO público do perfil (`AVA-XXXXXXXX`) + nome (+ telefone). RPC `solicitar_acesso_vendas_mobile_rpc`. Reenvio só sobrescreve solicitação rejeitada/cancelada.
- Gestor (gestor_master/administrador do ERP) aprova/rejeita (`analisar_solicitacao_vendas_mobile_rpc`) — no web pelo `ModalAprovacoes`. Aprovar cria/reativa `vendas_mobile_acessos` (papel `vendedor`). Ser gestor NÃO dá acesso implícito ao app de vendas.
- Gestor pode revogar/reativar/excluir acessos (`gerenciar_acesso_vendas_mobile_rpc`); excluir cancela a solicitação correspondente.

### Vínculo comercial × vínculo financeiro (conceito central)
- Vínculo comercial (`vendas_mobile_vinculos_comerciais`): UM ativo por vendedor. Define de qual empresa ele recebe catálogo, novidades e divulgação (flags individuais `catalogo_ativo`, `novidades_ativas`, `divulgacao_ativa`).
- Aprovar acesso em nova empresa: desativa o vínculo anterior (marca `desvinculado_em`) e BLOQUEIA o acesso comercial anterior — não há dois vínculos comerciais simultâneos. Conteúdo da empresa antiga vira histórico congelado (só o que foi criado até `desvinculado_em`, se a flag do recurso permanecer ligada).
- Ao desligar a flag `catalogo`, o vendedor pode optar por remover os produtos recebidos daquele catálogo.
- Vínculo financeiro (`vendas_mobile_perfis_financeiros`): independente do comercial. Define PARA QUAL perfil do Gestão vão as receitas do vendedor. Só pode apontar para empresa onde o usuário é gestor_master/administrador. Sem destino definido, lançamentos falham com "Defina um destino financeiro em Configurações antes de lançar."

### Suspensão e backup
- Desinstalar o módulo `vendas_mobile` da empresa: leitura dos dados continua (recuperação/backup), toda escrita operacional é bloqueada por RLS (`vendas_mobile_modulo_ativo()`), inclusive uploads. Reinstalar restaura a operação.
- Reset do vendedor (`resetar_vendas_mobile_rpc`, confirmação literal "RESETAR"): grava backup JSONB completo em `vendas_mobile_backups_reset` (clientes, pedidos+itens, pagamentos, produtos, agenda, vínculos) e apaga os dados operacionais, preservando apenas o vínculo comercial ativo (flags religadas).

## 7. Vendas Mobile — regras comerciais

- Produtos pessoais do vendedor (`vendas_mobile_produtos`): manuais, importados por XLSX, de pacote (Tridium ou próprios, com número/ordem) ou recebidos do catálogo mestre da empresa. Preço de venda, custo (rentabilidade), promocional, unidade, imagem (bucket `vendas-produtos`), estoque opcional (`estoque_controlado`).
- Catálogo mestre da empresa: gestor mantém `vendas_mobile_catalogo_produtos` (inclui campos fiscais); `sincronizar_catalogo_vendas_mobile_rpc()` roda no login do vendedor e copia apenas produtos ainda não recebidos (dedup em `_catalogo_recebimentos`), somente do vínculo comercial ativo com módulo ativo e `catalogo_ativo`.
- Estoque: movimentos `entrada`/`ajuste` via RPC (com saldo anterior/final); tipos `venda`, `cancelamento`, `consignacao`, `retorno_consignacao` previstos na tabela; a baixa automática desses tipos é feita pelo app — PENDENTE DE CONFIRMAÇÃO do detalhe no `app.js`.
- Pedidos (`vendas_mobile_pedidos` + itens): carrinho com quantidades, desconto, forma de pagamento informativa, status (aberta/concluída/cancelada; `convertida` para consignados convertidos), itens bonificados e consignados suportados no app. Total, subtotal e desconto persistidos; itens guardam nome/sku/preço/custo históricos.
- Pagamentos (`vendas_mobile_pagamentos`): recebimentos por cliente com desconto, saldo_anterior/saldo_final (conta-corrente do cliente), data, forma. Tipos pagamento/credito/debito/estorno.
- Dashboard: total vendido, pedidos, ticket médio, unidades, produto top, cliente destaque, rentabilidade (usa preco_custo), clientes inativos (dias configuráveis), consignados, aniversariantes (campo `data_nascimento`; alerta configurável de N dias; destaque no dashboard e na agenda).
- Integração de receitas com o Gestão: por empresa, base `recebidos` (soma dos pagamentos do dia — padrão) ou `vendidos` (soma dos pedidos do dia, excluindo cancelados/convertidos/consignados). Trigger recalcula a entrada do dia na hora; a linha em `faturamentos_entradas` tem `origem='Vendas Mobile'`, `tipo_obs='vendas_mobile_sistema'` e é imutável manualmente. Troca de base recalcula todo o histórico.
- Pacote ZIP do catálogo: exportação dos produtos + imagens em ZIP (jszip) para compartilhar/importar pacotes.

## 8. Controle de Ponto (resumo — detalhes em [ponto.md](ponto.md))

- Módulo por empresa (`empresa_modulos`, slug `ponto`, perfis `{empresa}`).
- Funcionário = usuário auth com papel `funcionario_ponto`, login por CPF (único global) + senha; criado por `/api/criar-funcionario-ponto`.
- Registro imutável (`ponto_registros`, sem UPDATE/DELETE), máquina de estados: entrada → saída almoço → retorno almoço → saída (atalho encerrar). GPS obrigatório + geofence (raio padrão 100 m).
- Lembretes de entrada/saída (10 min antes e no horário) — nunca para almoço.
- Desativar o módulo bloqueia a sessão do funcionário (`/api/ponto/verificar-acesso`).

## 9. Divulgação, novidades e informações (Vendas)

- Divulgação: pastas/subpastas por empresa + materiais imagem/vídeo (bucket `vendas-divulgacao`). Vídeos ganham capa gerada de forma assíncrona (fila + Cloud Run, primeiro frame). Leitura pelo vendedor respeita vínculo comercial ativo/histórico congelado e flag `divulgacao_ativa`.
- Novidades: publicações por empresa (`vendas_mobile_conteudos`, pagina `novidades`), geridas por gestor (web em `/mobile/conteudo-vendas` e /admin). Mesma regra de vínculo/histórico.
- Informações: conteúdos globais do produto (`empresa_id null`), publicados pelo /admin (tipos: versao, melhorias, atualizacoes, participe, orientacao, seguranca, dica).

## 10. Backup e restauração (Gestão)

- Exportação Excel (xlsx) por perfil (`app/lib/exportacao.ts`) — backup dos dados financeiros; restauração importa arquivo compatível com opção de atualizar ou substituir dados. Disponível no web e no mobile (`BackupMobileBridge`).
- Recurso premium no perfil Pessoal grátis.

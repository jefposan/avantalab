# Gestão Web — telas e funções

Arquivo central: `app/page.tsx` (~10.600 linhas) orquestra tudo; dados via
`app/lib/database.ts`; estado de auth/perfis em `app/hooks/useAuth.ts` e
`useEmpresas.ts`. Regras de negócio detalhadas em [fluxos-e-regras.md](fluxos-e-regras.md).

## Fluxo de entrada

1. Landing pré-login (`LandingPage.tsx` + module CSS; `/?cadastro=1` pula para cadastro).
2. Login/cadastro no `AuthCard` (e-mail ou login interno; recuperação de senha por SMS; termos/privacidade em `ModalTermos`/`ModalPrivacidade`).
3. Seleção de perfil quando o usuário tem várias empresas; criação de primeiro perfil quando não tem nenhuma (tipo empresa/pessoal, cupom, modo trial/assinar quando cobrança ativa).
4. Gate de cobrança: `PaywallEmpresa` (empresa sem acesso vigente) e `CadastroPerfilModal` (cadastro fiscal obrigatório em 7 dias).
5. `TourPrimeiroAcesso` no primeiro uso.

## Navegação principal (abas via `abaAtiva`)

- **Dashboard** (padrão) — kanban de cards arrastáveis (`@dnd-kit`, ids: `aConfirmar`, `saldo`, `resumoFinanceiro`, `evolucaoMensal`, `registrarEntradas`, `caixinha`, `ponto`). Ordem/ocultos persistidos por perfil em `configuracoes.dashboard_ordem_web/_ocultos_web`. Cards podem expandir/reduzir/remover ("Organizar blocos" pelo lápis). Card Ponto só para gestor/admin com módulo disponível (resumo Atraso/Falta/Incompleto; clique no funcionário abre relatório do dia). Cards seguem o padrão AvantaShell ([interface-e-design-system.md](interface-e-design-system.md)).
- **Gráficos** (`Graficos.tsx`) — cards reorganizáveis; evolução mensal (receitas × despesas, ano independente do global), por categoria com drill-down para lançamentos.
- **Por Categoria** (`PorCategoria.tsx`) — totais por categoria; clique abre os lançamentos que compõem o valor.
- **Relatório** (`Relatorio.tsx`) — relatório consolidado (EBITDA exclui as categorias de `CATEGORIAS_EXCLUSAO_EBITDA`).
- **Balanço Geral** (`BalancoGeral.tsx`).

Seletores globais de mês/ano no header (`AppHeader.tsx`) controlam o período de tudo.

## Lançamentos

- Registrar entradas (receitas diárias com origem; futuras viram "previstas"), total mensal.
- Despesas: avulsa, futura (Previsto), parcelada, fixa (recorrência com projeção de meses). Componentes: `CardEntradaFaturamento`, `TabelaEntradasFaturamento`, `CardLancamentoDespesa`, `TabelaLancamentosDespesa`, `ModalDespesasBase`, `ModalConfirmacao`.
- A confirmar: card lista previstas/fixas do dia para confirmar/ajustar/excluir.
- Nota anexa por lançamento (`ModalNotaLancamento`, upload/visualização/remoção) e leitura de comprovante por foto (`ProcessandoImagemModal`, OpenAI).
- Busca nos lançamentos (premium no Pessoal grátis).
- Caixinha: saldo inicial + aportes/resgates/rendimentos/ajustes.

## Barra Ajustes (header, por permissão)

Ordem dos botões (gestor_master/administrador, salvo indicação):
1. **Cadastrar Despesas** — CRUD de tipos de despesa e categorias (primeira letra maiúscula automática; instruções em `ModalInstrucoes`).
2. **Módulos** (`ModulosModal`) — catálogo filtrado por `empresas.tipo_perfil`; instalar/desinstalar escreve em `empresa_modulos`. Desinstalar Vendas Mobile suspende a escrita dos vendedores (aviso de backup/leitura preservada).
3. **Assinatura** (`AssinaturaModal`, só com `COBRANCA_ATIVA`) — status, faturas, trocar ciclo, cancelar.
4. **Ponto** (`PontoAdminModal`, com módulo ativo) — abas: lista de funcionários (criar/editar/desativar, CPF, senha, horário previsto, dias de trabalho), local/geofence, dias não úteis, relatórios (todos/por funcionário, mês/período, exportar Excel e PDF).
5. **Vendas Mobile** (`NovidadesVendasModal`, com módulo ativo) — publicar novidades e organizar divulgação; abre também a gestão completa em `/mobile/conteudo-vendas?empresaId=...` (catálogo mestre, pastas, uploads).
6. **Visual** (dropdown) — logo (upload + `ModalLogo` com escala/posição), cor principal (`cor_primaria`), modo escuro.
7. **Configurações** (dropdown) — alerta de duplicados; usuários internos (criar por login/senha, vincular usuário existente, editar papel, bloquear, excluir, redefinir senha — `/api/*usuario*`); perfil (editar/criar/trocar/excluir); backup/exportação e restauração (Excel via `app/lib/exportacao.ts`); aprovações do Vendas (`ModalAprovacoes` — solicitações pendentes e acessos aprovados com revogar/reativar/excluir; código de vínculo do perfil com regeneração).

Outros elementos: sino de notificações (com apagar), feedback (tipos sugestão/dúvida/reclamação/avaliação → `feedbacks` + SMS ao dono), `SobreModal` (versão/changelog via `public/changelog.json`), botão flutuante da Ava (`ChatFlutuante`), popups arrastáveis limitados à viewport (`DraggableModalCard`, `WebPopupScrollLock`), `Calculadora`.

## Permissões na UI

- `gestor_master`/`administrador`: tudo (usuários, ajustes, módulos, ponto admin, aprovações).
- `operador_completo`: opera lançamentos completos, sem administração — detalhe fino do gate por botão: PENDENTE DE CONFIRMAÇÃO (verificar cada uso de `perfilUsuario` em `page.tsx`).
- `operador_simples`: inserção básica, sem editar/excluir registros de terceiros — idem.
- `funcionario_ponto` nunca chega ao web (redirecionado; RLS bloqueia).

## Dados manipulados por tela

| Tela | Tabelas |
|---|---|
| Dashboard/Lançamentos | `lancamentos`, `faturamentos`, `faturamentos_entradas`, `recorrencias`, `caixinhas_movimentos`, `notificacoes` |
| Cadastrar despesas | `despesas_cadastradas` |
| Usuários | `usuarios_empresa` (+auth via API) |
| Visual/Configurações | `configuracoes` |
| Módulos | `modulos`, `empresa_modulos` |
| Ponto admin | `ponto_funcionarios`, `ponto_registros`, `ponto_config`, `ponto_dias_nao_uteis` |
| Aprovações Vendas | `vendas_mobile_solicitacoes_acesso`, `vendas_mobile_acessos`, `codigos_vinculo_empresa` |
| Vendas conteúdo | `vendas_mobile_conteudos`, `vendas_mobile_divulgacao_*`, `vendas_mobile_catalogos*` |
| Assinatura | `assinaturas`, `assinatura_faturas` (via API) |

# Controle de Ponto (`/ponto`)

Módulo opcional por empresa (catálogo `modulos`, slug `ponto`, perfis `{empresa}`).
Cliente: `public/ponto-app.js` (~880 linhas vanilla JS) carregado pela casca
`app/ponto/page.tsx` (noindex; manifest `/ponto-manifest.json`, escopo `/ponto`).
Administração: `PontoAdminModal` no Gestão Web. Modelagem/decisões:
`docs/modelo-modulo-ponto.md` e `docs/handoff-modulos-ponto.md`.

## Identidade e acesso

- Funcionário = usuário Supabase Auth com vínculo `usuarios_empresa.perfil='funcionario_ponto'` + linha em `ponto_funcionarios` (nome, login, cargo, CPF, `hora_entrada`/`hora_saida`, `dias_trabalho smallint[]` 0=dom…6=sáb, ativo).
- Login em `/ponto` por CPF + senha: `/api/ponto/resolver-email` converte CPF→e-mail interno (CPF é único GLOBAL — `ponto_cpf_global_setup.sql` — para resolver a empresa sem ambiguidade).
- Criação/edição/exclusão/senha pelo gestor via rotas service-role (`criar-funcionario-ponto` valida CPF com dígitos verificadores e exige módulo ativo; `atualizar-funcionario-ponto`; `excluir-funcionario-ponto` apaga o auth user; `redefinir-senha-ponto`).
- Isolamento: `ponto_isolar_usuarios_setup.sql` — o papel `funcionario_ponto` não aparece em listagens, não resolve login no app financeiro e é excluído das policies das tabelas financeiras. Ele acessa apenas: `empresas` (nome), `ponto_config`, `ponto_funcionarios`, `ponto_registros`, `push_subscriptions`.
- Sessão aberta é bloqueada se o gestor desinstalar o módulo (`/api/ponto/verificar-acesso` → `{ativo:false}` → `bloquearPonto`).

## Registro de ponto (app do funcionário)

- Views (`state.view`): `bater` (padrão) e `registros`; além de ajustes (`ajustesPontoHtml`).
- Máquina de estados do dia: sem registro → **Entrada**; após entrada → **Saída almoço** ou atalho **Encerrar (Saída)**; após saída almoço → **Retorno almoço**; após retorno → **Saída**; depois, dia encerrado. Confirmação explícita antes de registrar (`confirmarTipo`).
- Geolocalização OBRIGATÓRIA (Geolocation API). Sem permissão → registro bloqueado. O app calcula `distanciaMetros` até `ponto_config` (lat/long da empresa) e compara com `raio_m` (padrão 100 m). Botão "Atualizar localização" sem sair da página; posição recente é reaproveitada (`localizacaoRecente`).
- Registro (`ponto_registros`, INSERT-only): tipo, `registrado_em`, `dia` (data em América/São_Paulo), latitude/longitude/`precisao_m`, `distancia_m`, `dispositivo` (user agent), `hash` (integridade). Sem UPDATE/DELETE por RLS — imutável (base para futura conformidade REP-P/Portaria 671; v1 é controle interno, não certificado).
- Comprovante: tela de confirmação (sem PDF no fluxo de batida).
- Meus registros: períodos dia/semana/mês/ano, total de horas (`calcHorasDia`), impressão/PDF via `window.print` (CSS `@media print` em `page.tsx`, container `#ponto-relatorio-print`).
- Push de lembrete: opt-in no app (VAPID public key hardcoded em `ponto-app.js`), inscrição com `app_origem='ponto'`; Edge `processar-lembretes-ponto` envia 10 min antes e no horário de entrada/saída (nunca almoço), somente em dia de trabalho do funcionário, dedup em `ponto_lembretes_enviados`.
- Instalação PWA: instruções específicas iOS (`instrucaoInstalarHtml`) e prompt Android (`beforeinstallprompt`). SW: `ponto-sw.js` (cache `avantalab-ponto-vN`).
- Botão Sair encerra apenas a sessão do dispositivo.

## Administração (web — `PontoAdminModal`)

- Abas (`AbaPontoAdmin`): lista de funcionários (CRUD + senha + horário previsto + dias de trabalho), configuração de local/geofence (lat/long/raio — só gestor/admin por RLS), dias não úteis (`ponto_dias_nao_uteis`: feriado/empresa_fechada/recesso/folga_coletiva/outro, intervalo de datas, recorrente anual), relatórios (todos ou um funcionário, mês/período, exportação Excel e PDF).
- Card "Controle de Ponto" no dashboard web (gestor/admin): resumo do dia com Atraso, Falta, Incompleto (adiantamento aparece só no relatório); clique no funcionário abre relatório do dia com as 4 batidas. Atualização em tempo real (tabelas na publicação realtime).
- Regras de status derivadas: atraso = entrada após `hora_entrada`; falta = dia de trabalho sem registro (excluindo dias não úteis); incompleto = dia sem par de batidas. Cálculo é feito no cliente web — parametrização exata (tolerâncias): PENDENTE DE CONFIRMAÇÃO em `PontoAdminModal.tsx`/`page.tsx`.

## Tabelas e políticas (resumo)

- `ponto_funcionarios`: select próprio ou gestor/admin da empresa; insert/update por vínculo (rotas usam service role).
- `ponto_registros`: select próprio ou gestor/admin; insert somente o próprio; imutável.
- `ponto_config`: select por membros; escrita gestor/admin.
- `ponto_dias_nao_uteis`: select por membros; insert/delete gestor/admin.
- `ponto_lembretes_enviados`: uso interno do job (service role).

# Arquitetura — AvantaLab

## Visão geral

Monólito Next.js 16 (App Router) publicado na Vercel. O frontend fala direto com o
Supabase (anon key + RLS) para leituras/escritas comuns e com rotas `/api/*` do
próprio Next (service role) para ações administrativas e integrações. Três PWAs em
JavaScript vanilla são servidos como assets estáticos de `public/` e carregados por
páginas Next "casca" que injetam a configuração via atributos `data-*` ou objeto global.

```
Navegador ──► Next.js (Vercel)
   │             ├── app/page.tsx (Gestão Web, React)
   │             ├── /mobile  → public/mobile-app.js  (PWA vanilla)
   │             ├── /ponto   → public/ponto-app.js   (PWA vanilla)
   │             ├── /mobile/vendas → public/vendas-mobile/app.js (PWA vanilla)
   │             ├── /admin (React)
   │             └── /api/* (service role: usuários, senha, SMS, cobrança, Ava, ponto, admin)
   │
   ├── Supabase: Postgres+RLS, Auth, Storage, Edge Functions, pg_cron/pg_net/Vault
   ├── OpenAI (GPT-4o, Whisper, visão p/ notas)
   ├── Twilio Verify (SMS)
   ├── Asaas (assinaturas + webhook)
   └── Cloud Run: video-thumbnail-worker (FFmpeg)
```

## Mapa de diretórios relevantes

```
app/
  page.tsx                 # Gestão Web inteira (~10.600 linhas) — orquestrador
  layout.tsx, globals.css  # layout raiz e tipografia global (.typography-system)
  components/              # ~40 componentes do web (AppHeader, Dashboard, Graficos,
                           #  Relatorio, BalancoGeral, PorCategoria, AvantaCard,
                           #  ChatFlutuante (Ava), Modal*, PaywallEmpresa,
                           #  PremiumPessoalModal, AssinaturaModal, ModulosModal,
                           #  PontoAdminModal, LandingPage, TourPrimeiroAcesso...)
  hooks/useAuth.ts         # autenticação/cadastro/telefone/termos (web)
  hooks/useEmpresas.ts     # seleção/criação/edição de perfis (empresas)
  hooks/useUI.ts           # avisos/modais utilitários
  lib/
    supabase.ts            # cliente browser (anon key)
    database.ts            # TODA a camada de dados do web (~1.800 linhas)
    cobranca.ts            # lógica pura de acesso/planos/paywall
    cobranca-servidor.ts   # resolver estado de acesso no servidor
    asaas.ts               # cliente REST da Asaas
    perfis.ts              # categorias e despesas padrão por tipo de perfil
    cadastro-perfil.ts     # validações CPF/CNPJ, tipos de empresa, regimes
    exportacao.ts          # backup/exportação Excel (xlsx)
    formatters.ts, telefone.ts, paises.ts, legal.ts, fonts.ts, dnd.ts, version.ts
    admin-server.ts        # autenticação do /admin (token + senha hash pbkdf2)
  api/                     # rotas servidor (ver tabela abaixo)
  mobile/page.tsx          # casca do PWA mobile (injeta env em data-*)
  mobile/ava/              # chat Ava mobile (React, tela cheia)
  mobile/vendas/page.tsx   # casca do Vendas Mobile (bootstrap dos scripts)
  mobile/conteudo-vendas/  # gestão de Novidades/Divulgação/Catálogo pelo gestor (React)
  ponto/page.tsx           # casca do PWA de ponto
  admin/page.tsx           # console administrativo (React, ~950 linhas)
  rh/                      # protótipo estático (mock) — não produção
public/
  mobile-app.js (~12.600 l), mobile-sw.js, mobile-manifest.json, mobile-supabase.js
  ponto-app.js (~880 l), ponto-sw.js, ponto-manifest.json
  vendas-mobile/           # CÓPIA GERADA de vendas_mobile/app (não editar aqui)
  sw.js, manifest.json     # web
  images/                  # logos, ícones, fundos (ver pwa-e-assets.md)
  changelog.json
vendas_mobile/
  app/                     # FONTE do Vendas Mobile: app.js (~4.400 l), styles.css,
                           #  config.js, supabase-client.js, sw.js, manifest, assets/
  supabase/schema_vendas_mobile.sql  # schema base do módulo
  docs/, importacao/, referencia_tridium/
supabase/
  migrations/              # 33 migrations versionadas (jul/2026)
  functions/               # 9 Edge Functions + _shared/ava-system-prompt.ts
*.sql (raiz)               # ~24 scripts de setup aplicados manualmente (pré-migrations)
scripts/sync-vendas-mobile.mjs  # copia vendas_mobile/app → public/vendas-mobile
services/video-thumbnail-worker/ # Cloud Run (Dockerfile + server.mjs)
```

## Rotas web e mobile

- `/` — landing pré-login (`LandingPage`), login/cadastro (`AuthCard`) e o sistema Gestão. `/?cadastro=1` abre direto o cadastro.
- `/mobile` — PWA financeiro. Redireciona desktop (largura ≥1024, UA não-mobile, fora de standalone) para `/`.
- `/mobile/ava` — chat Ava em tela cheia (React).
- `/mobile/vendas` — PWA Vendas Mobile.
- `/mobile/conteudo-vendas?empresaId=...` — administração de conteúdos do Vendas pelo gestor.
- `/ponto` — PWA de ponto (login por CPF+senha; `robots: noindex`).
- `/admin` — console administrativo (token `ADMIN_FEEDBACKS_TOKEN` ou senha própria).
- Demonstração: `/avanta-card-demo`, `/kanban-elastico`, `/kanban-elastico/multi`, `/lancamento-por-foto-teste`.

## Rotas de API (`app/api/*`, todas Node runtime)

| Rota | Função | Autorização |
|---|---|---|
| `perfil-cadastro` | GET/POST dados de `cadastros_perfil` (cadastro completo do perfil, prazo 7 dias) | Bearer do usuário; escrita valida vínculo gestor |
| `atualizar-empresa` | Renomear/editar empresa | Bearer + vínculo |
| `criar-usuario-interno` | Cria usuário interno (login sem e-mail real → e-mail sintético) + vínculo | Bearer gestor/admin, service role |
| `vincular-usuario-existente` | Busca/vincula usuário já existente a outra empresa (CPF não duplicado) | idem |
| `atualizar-usuario-empresa`, `excluir-usuario-interno`, `redefinir-senha-usuario` | Gestão de acessos internos | idem |
| `usuarios-ativos` | Contagem de usuários (admin) | service role |
| `senha/enviar-codigo`, `senha/redefinir` | Recuperação de senha por SMS (resolve login→email→telefone, Twilio Verify) | público (validado por código SMS) |
| `sms/enviar-codigo`, `sms/verificar-codigo` | Verificação de telefone (cadastro) | público |
| `vendas/senha/*`, `vendas/telefone/confirmar` | Mesmos fluxos para contas do Vendas Mobile | público / Bearer |
| `cobranca/estado` | Estado de acesso do perfil (trial/ativa/expirada...) | Bearer + vínculo |
| `cobranca/assinar` | Cria cliente+assinatura na Asaas, devolve invoiceUrl | Bearer + vínculo |
| `cobranca/definir-inicio` | trial (7 dias) ou 'assinar' (expirada→paywall) para perfil empresa novo; no-op com flag desligada | Bearer |
| `cobranca/gerenciar` | Detalhes/cancelamento/troca de ciclo da assinatura | Bearer gestor |
| `cobranca/resgatar-cupom` | Valida cupom e grava assinatura 'cortesia' | Bearer + vínculo |
| `cobranca/webhook` | Webhook Asaas (header `asaas-access-token` = `ASAAS_WEBHOOK_TOKEN`), grava eventos e faturas, atualiza `assinaturas` | token |
| `ava/chat` | Chat da Ava (OpenAI direto; fallback Edge `chat-ia`); gate premium/vendas | Bearer |
| `ava/transcrever-audio` | Whisper | Bearer |
| `lancamentos/ler-foto` | Lê foto de comprovante com OpenAI e devolve campos do lançamento | Bearer |
| `lancamentos/nota` | Upload/consulta/remoção de nota anexa (bucket `notas-lancamentos`) | Bearer + vínculo |
| `criar-funcionario-ponto`, `atualizar-funcionario-ponto`, `excluir-funcionario-ponto`, `redefinir-senha-ponto` | CRUD do funcionário de ponto (auth user com papel `funcionario_ponto`) | Bearer gestor/admin |
| `ponto/resolver-email` | CPF → e-mail interno (login único no /ponto) | service role (público controlado) |
| `ponto/verificar-acesso` | Módulo ponto ativo? `{ativo:boolean}` | público controlado |
| `admin-configuracoes`, `admin-perfis`, `admin-cupons`, `admin-disparos`, `admin-feedbacks`, `admin-conteudos-vendas`, `admin-consumo` | Console /admin | `exigirAdmin` (token/senha) |
| `feedback`, `feedback/sms` | Registro de feedback + aviso por SMS ao dono | Bearer |
| `cep` | Proxy ViaCEP | público |
| `lancamento-foto-teste` | rota de teste | — |

## Edge Functions (Supabase, Deno)

| Função | Disparo | O que faz |
|---|---|---|
| `chat-ia` | HTTP (fallback da Ava; usado pelo mobile) | Prompt da Ava + contexto → OpenAI GPT-4o (stream). Também transcreve áudio (`?acao=transcrever-audio`). |
| `enviar-push` | HTTP | Web Push (VAPID) para inscrições do usuário/empresa (filtra `app_origem='mobile'`). Remove inscrições 404/410. |
| `broadcast` | HTTP (admin, token `ADMIN_FEEDBACKS_TOKEN`) | Notificação (sino) + push para todos os usuários. |
| `processar-agenda` | agendada 1×/dia | Lembretes da agenda que vencem hoje → notificação dedup (`origem_id,ref_data`) + push. |
| `processar-despesas-dia` | agendada 1×/dia (~00:05/08:05 BRT — PENDENTE DE CONFIRMAÇÃO do horário exato do agendamento, feito no painel) | Despesas previsto/fixa/parcela do dia → notificação empresa-wide + push. |
| `processar-lembretes-ponto` | agendada (janelas de 10 min — cron exato configurado no painel; PENDENTE DE CONFIRMAÇÃO) | Lembrete de entrada/saída 10 min antes e no horário, dedup em `ponto_lembretes_enviados`, push `app_origem='ponto'`. |
| `conciliar-cobrancas` | pg_cron `*/30 * * * *` (migration `20260706190000`) via pg_net + Vault (`cron_edge_secret`) | Reconsulta Asaas, sincroniza `assinatura_faturas` e status das `assinaturas`. |
| `ler-lancamento-foto` | HTTP | OCR/visão de comprovantes (OpenAI). |
| `transcrever-audio` | HTTP | Whisper. |

## Comunicação e dependência entre módulos

- Todos os módulos compartilham `auth.users` e o vínculo `usuarios_empresa` (papéis: `gestor_master`, `administrador`, `operador_completo`, `operador_simples`, `funcionario_ponto`).
- Sistema de módulos: catálogo `modulos` + ativação `empresa_modulos` (slugs `ponto` e `vendas_mobile`). A UI lê módulos ativos; a segurança é reforçada por RLS (funções `vendas_mobile_modulo_ativo()` etc.).
- Vendas Mobile → Gestão: triggers no banco sincronizam receita diária em `faturamentos_entradas` (tipo_obs `vendas_mobile_sistema`, protegido contra edição manual) e no agregado `faturamentos`. Ver [banco-supabase.md](banco-supabase.md) e [fluxos-e-regras.md](fluxos-e-regras.md).
- Ponto: totalmente isolado do financeiro (script `ponto_isolar_usuarios_setup.sql` remove acesso do papel `funcionario_ponto` a todas as tabelas financeiras).
- Ava recebe o contexto financeiro montado no cliente e enviado no corpo da requisição; nunca acessa o banco.
- Sincronização Vendas Mobile: `npm run dev/build` executa `scripts/sync-vendas-mobile.mjs` copiando `vendas_mobile/app` → `public/vendas-mobile`. Nunca editar `public/vendas-mobile` diretamente.

## Convenções importantes

- Versão em `app/lib/version.ts` (`MAJOR.MINOR.PATCH.MICRO`) + `CHANGELOG.md` + cache dos service workers (`CACHE_NAME`) + query `?v=` dos scripts (`/mobile-app.js?v=286`, `/ponto-app.js?v=19`, assets do vendas `assetVersion` em `app/mobile/vendas/page.tsx`).
- Meses são gravados por extenso em MAIÚSCULO (`'JANEIRO'...'DEZEMBRO'`) nas tabelas financeiras — os jobs dependem disso.
- Fuso oficial de negócios: `America/Sao_Paulo`.
- Validação antes de publicar: `node --check public/mobile-app.js` e `npx tsc --noEmit`.

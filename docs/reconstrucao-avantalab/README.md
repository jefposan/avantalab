# Documentação de Reconstrução — AvantaLab

> Objetivo: permitir que outra IA (ou equipe) recrie o AvantaLab com alta fidelidade
> mesmo com perda total de código, banco ou infraestrutura.
> Gerada em 2026-07-15 a partir da inspeção integral do repositório `~/avantalab`
> (versão do app: `1.4.1.03`, em `app/lib/version.ts`).

## O que é o AvantaLab

O AvantaLab é uma plataforma de gestão financeira para pequenas empresas e finanças
pessoais, com módulos opcionais (Controle de Ponto e Vendas Mobile). É um monólito
Next.js hospedado na Vercel, com banco/auth/storage/functions no Supabase, cobrança
via Asaas, SMS via Twilio (Verify) e IA via OpenAI (Ava).

## Módulos existentes

| Módulo | Rota | Descrição |
|---|---|---|
| Gestão Web | `/` | ERP financeiro desktop: dashboard kanban, lançamentos, receitas, despesas, gráficos, relatórios, usuários, módulos, assinatura. Tela única gigante (`app/page.tsx`). |
| Mobile (PWA) | `/mobile` | Mesma base financeira em PWA vanilla-JS (`public/mobile-app.js`). |
| Vendas Mobile | `/mobile/vendas` | PWA para vendedor autônomo/porta a porta: clientes, produtos, pedidos, consignados, pagamentos, agenda, divulgação, novidades. Código-fonte em `vendas_mobile/app`, sincronizado para `public/vendas-mobile`. |
| Controle de Ponto | `/ponto` | PWA para funcionário bater ponto com GPS/geofence; administração no web. |
| Ava (IA) | botão flutuante no web, `/mobile/ava` | Assistente IA (OpenAI GPT-4o + Whisper). |
| Admin | `/admin` | Console administrativo do dono do produto: perfis, cupons, disparos, feedbacks, consumo das plataformas, conteúdos do Vendas. |
| RH | `/rh` | Protótipo estático com dados mockados (`app/rh/data/mockData`). Não é módulo em produção. |

Páginas auxiliares/demonstração: `/avanta-card-demo`, `/kanban-elastico`, `/lancamento-por-foto-teste`, `landing-preview/` (HTML estático fora do app).

## Tecnologias

- Next.js 16.2.6 (App Router) + React 19.2.4 + TypeScript 5, Tailwind CSS 4.
- Supabase (`@supabase/supabase-js` 2.x): Postgres + RLS, Auth, Storage, Edge Functions (Deno), pg_cron + pg_net + Vault.
- PWAs em JavaScript vanilla (sem build): `public/mobile-app.js`, `public/ponto-app.js`, `public/vendas-mobile/app.js`.
- Bibliotecas: `@dnd-kit/*` (kanban do dashboard web), `jszip` (pacote ZIP de produtos), `qrcode`, `twilio` 6, `xlsx` (import/export Excel).
- Serviço externo: `services/video-thumbnail-worker` (Node + FFmpeg no Cloud Run) para capas de vídeos de Divulgação.
- Gateway de cobrança: Asaas (assinaturas, webhook, conciliação).

## Ordem recomendada de reconstrução

1. Infraestrutura e contas (Supabase, Vercel, Twilio, OpenAI, Asaas, Google OAuth, Cloud Run) — ver [integracoes-e-infraestrutura.md](integracoes-e-infraestrutura.md).
2. Banco de dados na ordem descrita em [banco-supabase.md](banco-supabase.md) (núcleo → setups da raiz → migrations cronológicas).
3. Autenticação e perfis — [fluxos-e-regras.md](fluxos-e-regras.md).
4. Gestão Web — [gestao-web.md](gestao-web.md).
5. Mobile — [mobile.md](mobile.md).
6. Vendas Mobile — [vendas-mobile.md](vendas-mobile.md).
7. Controle de Ponto — [ponto.md](ponto.md).
8. Ava/IA — [ava-e-ia.md](ava-e-ia.md).
9. Admin — [admin.md](admin.md).
10. PWA e assets — [pwa-e-assets.md](pwa-e-assets.md); design system — [interface-e-design-system.md](interface-e-design-system.md).
11. Testes — [testes-de-validacao.md](testes-de-validacao.md); deploy e backup — [deploy-backup-e-recuperacao.md](deploy-backup-e-recuperacao.md).

Prompt final acionável: [prompt-de-reconstrucao.md](prompt-de-reconstrucao.md).
Inventário de arquivos: [inventario-de-arquivos.md](inventario-de-arquivos.md).
Arquitetura geral: [arquitetura.md](arquitetura.md).

## Dependências externas indispensáveis

- Projeto Supabase (URL de produção usada hoje: `qzewxhdkwettnlmkjoqd.supabase.co`) com extensões `pgcrypto`, `pg_cron`, `pg_net` e Vault.
- Vercel (deploy automático do repositório GitHub `jefposan/avantalab`, branch `main`).
- Twilio Verify (SMS de código para telefone/senha).
- OpenAI (chat GPT-4o, Whisper, leitura de nota por foto).
- Asaas (assinaturas; sandbox e produção decididos pelo prefixo da API key).
- Google Cloud Run (worker de miniaturas de vídeo) + Google OAuth (login Google no Vendas Mobile e no mobile).
- Chaves VAPID para Web Push.

## Documentos internos pré-existentes (fonte complementar)

- `docs/arquitetura-modulos.md` — desenho do sistema de módulos.
- `docs/modelo-modulo-ponto.md`, `docs/handoff-modulos-ponto.md` — decisões do Ponto.
- `docs/contexto-header-mobile.md` — header do mobile.
- `planejamento/padrao-avanta-card.md` — padrão de card AvantaShell.
- `vendas_mobile/docs/*` — visão de produto, escopo V1 e referência Tridium do Vendas Mobile.
- `CHANGELOG.md` — histórico de versões (fonte valiosa de regras finas).
- `AGENTS.md` — convenções de versionamento, padrão de cards e manutenção obrigatória do conhecimento da Ava.
- `docs/ava/*` + `app/lib/ava-conhecimento.ts` — manuais operacionais da Ava para Gestão Web, Gestão Mobile e Vendas Mobile.

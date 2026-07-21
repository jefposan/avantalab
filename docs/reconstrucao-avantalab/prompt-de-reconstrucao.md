# Prompt de Reconstrução — AvantaLab

> Copie o prompt abaixo para uma IA competente com acesso à pasta
> `docs/reconstrucao-avantalab/`. Ele instrui a reconstrução completa do sistema.

---

Atue como equipe sênior de engenharia (arquitetura, backend, frontend, infra e QA).
Sua missão é reconstruir o sistema **AvantaLab** com alta fidelidade usando
exclusivamente a documentação desta pasta como especificação. Não invente
comportamentos: quando a documentação marcar `PENDENTE DE CONFIRMAÇÃO`, implemente a
opção mais conservadora, registre a decisão em `DECISOES-RECONSTRUCAO.md` e sinalize
para revisão humana.

Leia primeiro, nesta ordem: `README.md`, `arquitetura.md`, `banco-supabase.md`,
`fluxos-e-regras.md`. Depois consulte os documentos de módulo conforme a fase.

## Regras invioláveis

1. **Segurança**: nenhum segredo em código ou repositório; RLS ativado em TODAS as tabelas; escrita administrativa somente via service role no servidor; validação de vínculo/papel em toda rota de API; `ponto_registros` imutável; receitas `vendas_mobile_sistema` imutáveis manualmente; funcionário de ponto isolado do financeiro.
2. **Preservação de dados**: toda operação destrutiva exige confirmação explícita e backup prévio (padrão do `resetar_vendas_mobile_rpc`); migrations aditivas e idempotentes; nunca editar migration aplicada.
3. **Compatibilidade mobile**: os três PWAs são JavaScript vanilla sem build, servidos de `public/`; service workers network-first; IDs de elementos com handlers preservados; fuso `America/Sao_Paulo`; meses por extenso em MAIÚSCULO nas tabelas financeiras.
4. **Validação por fase**: ao fim de cada fase, execute os casos correspondentes de `testes-de-validacao.md` e só avance com 100% de aprovação (ou pendências documentadas).

## Fases

**Fase 0 — Infraestrutura**: contas e configuração de Supabase (extensões pgcrypto/pg_cron/pg_net + Vault), Vercel, Twilio Verify, OpenAI, Asaas, Google OAuth, Cloud Run e chaves VAPID, conforme `integracoes-e-infraestrutura.md`. Entregável: ambientes com variáveis nomeadas (sem valores no repo).

**Fase 1 — Banco**: recriar o schema na ordem de `banco-supabase.md` §6 (núcleo → setups → schema do Vendas → migrations cronológicas), buckets, RPCs, triggers, RLS, realtime e agendamentos. Validar com consultas de fumaça e testes de RLS (usuário A não lê dados da empresa B).

**Fase 2 — Autenticação e perfis**: login e-mail/login interno, cadastro com SMS, termos, recuperação de senha, criação idempotente do primeiro perfil, cadastro completo (7 dias), múltiplos perfis, papéis e permissões (`fluxos-e-regras.md` §1–§2). Testes §1.

**Fase 3 — Gestão Web**: `gestao-web.md` completo (dashboard kanban AvantaShell, lançamentos, previstos/fixas/parcelas, caixinha, notas por foto, gráficos/relatórios/balanço, ajustes, usuários, módulos, backup Excel). Testes §2.

**Fase 4 — Mobile**: `mobile.md` (PWA vanilla com paridade financeira, header/menu/atalhos, agenda, dark mode, pull-to-refresh, push). Testes §2.9 e §6.

**Fase 5 — Vendas Mobile**: `vendas-mobile.md` + regras §6–§7 e §9 de `fluxos-e-regras.md` (acesso por código, vínculos comercial/financeiro, catálogo mestre, pedidos/consignados/bonificações, pagamentos, estoque, dashboard, divulgação com worker de miniaturas, integração de receitas, suspensão e reset). Testes §4.

**Fase 6 — Ponto**: `ponto.md` (funcionário isolado, CPF global, geofence, imutabilidade, lembretes, admin web e relatórios). Testes §5.

**Fase 7 — IA (Ava)**: `ava-e-ia.md` — preservar `AVA_SYSTEM_PROMPT` integralmente; rotas de chat/transcrição/leitura de foto; gates premium/vendas. Testes §7.

**Fase 8 — Cobrança**: `fluxos-e-regras.md` §3 (flag, trial, paywall, premium pessoal, cupons, Asaas, webhook idempotente, conciliação). Testes §3 em ambiente de preview com flag ligada.

**Fase 9 — Admin**: `admin.md`. Testes §8.

**Fase 10 — PWA e design system**: `pwa-e-assets.md` e `interface-e-design-system.md` (manifests, SWs, versionamento coordenado, AvantaShell, temas claro/escuro, logos). Testes §9.

**Fase 11 — Deploy e recuperação**: `deploy-backup-e-recuperacao.md` (build, publicação, backups, plano de recuperação). Executar a suíte completa de `testes-de-validacao.md`.

## Entregáveis finais

1. Repositório funcional com a estrutura de `arquitetura.md` e `inventario-de-arquivos.md`.
2. Banco reproduzível por migrations (incluindo o núcleo que hoje não tem DDL — gerar e versionar).
3. Relatório de equivalência: resultado de todos os testes, divergências e decisões tomadas nos pontos `PENDENTE DE CONFIRMAÇÃO`.
4. `DECISOES-RECONSTRUCAO.md` com toda decisão não coberta pela documentação.

# Inventário de arquivos

Risco: 🔴 crítico (quebra o sistema), 🟡 cuidado (efeitos amplos), 🟢 seguro/documental.
"Gerado" = não editar diretamente.

## Raiz

| Item | Finalidade | Risco |
|---|---|---|
| `package.json` / `package-lock.json` | deps e scripts (`dev`/`build` rodam o sync do Vendas) | 🔴 |
| `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs` | configuração | 🟡 |
| `AGENTS.md` (importado por `CLAUDE.md`) | convenções de versão e AvantaShell | 🟢 |
| `CHANGELOG.md`, `README.md` | histórico/boilerplate | 🟢 |
| `*.sql` (24 arquivos) | setups históricos do banco (ordem em [banco-supabase.md](banco-supabase.md)); não reexecutar sem entender idempotência | 🔴 |
| `.env.local` | segredos locais (fora do git) | 🔴 nunca commitar |
| `preview-card-perfis.html`, `tmp/`, `landing-preview/` | protótipos/rascunhos | 🟢 |
| `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`, `next-env.d.ts` | gerados | gerado |

## app/

| Item | Finalidade | Risco |
|---|---|---|
| `page.tsx` | Gestão Web inteira | 🔴 |
| `layout.tsx`, `globals.css` | layout raiz, tipografia | 🟡 |
| `components/*` | UI do web (AvantaCard é padrão obrigatório) | 🟡 |
| `hooks/*`, `lib/database.ts` | auth/perfis/dados — contratos usados por todo o web | 🔴 |
| `lib/cobranca.ts`, `lib/cobranca-servidor.ts`, `lib/asaas.ts` | decisão de acesso e gateway | 🔴 |
| `lib/version.ts` | versão oficial (atualizar com changelog) | 🟡 |
| `api/**` | rotas service-role (segurança!) | 🔴 |
| `mobile/page.tsx`, `ponto/page.tsx`, `mobile/vendas/page.tsx` | cascas dos PWAs (injetam env e versão dos assets) | 🔴 |
| `mobile/ava/`, `mobile/conteudo-vendas/`, `admin/page.tsx` | telas React auxiliares | 🟡 |
| `avanta-card-demo/`, `kanban-elastico/`, `lancamento-por-foto-teste/`, `rh/` | demos/protótipos (rh usa mock) | 🟢 |

## public/

| Item | Finalidade | Risco |
|---|---|---|
| `mobile-app.js` | PWA financeiro (validar com `node --check`; preservar IDs com handlers) | 🔴 |
| `ponto-app.js` | PWA ponto (VAPID public key embutida) | 🔴 |
| `mobile-sw.js`, `ponto-sw.js`, `sw.js` | service workers (bump de cache coordenado) | 🔴 |
| `mobile-supabase.js`, `vendas-mobile/vendor/supabase.min.js` | SDK Supabase empacotado | 🟡 |
| `manifest.json`, `mobile-manifest.json`, `ponto-manifest.json` | manifests PWA | 🟡 |
| `vendas-mobile/**` | CÓPIA de `vendas_mobile/app` — **não editar** | gerado 🔴 |
| `images/**`, `changelog.json` | assets e changelog exibido no app | 🟡 |

## vendas_mobile/

| Item | Finalidade | Risco |
|---|---|---|
| `app/app.js`, `app/styles.css`, `app/supabase-client.js`, `app/sw.js`, `app/manifest.webmanifest`, `app/index.html`, `app/assets/**`, `app/data/**` | FONTE do Vendas Mobile | 🔴 |
| `app/config.js` | fallback com URL/anon key do Supabase hardcoded | 🔴 atualizar em migração |
| `supabase/schema_vendas_mobile.sql` | schema base do módulo | 🔴 |
| `docs/**`, `importacao/**`, `referencia_tridium/**` | documentação e referência (dados de terceiros — não publicar) | 🟢 |

## supabase/

| Item | Finalidade | Risco |
|---|---|---|
| `migrations/*.sql` | histórico oficial — nunca editar migrations aplicadas; só adicionar novas | 🔴 |
| `functions/*/index.ts`, `functions/_shared/ava-system-prompt.ts` | Edge Functions (deploy manual via CLI/painel) | 🔴 |
| `.temp/**` | estado da CLI (project-ref etc.) | gerado |

## Outros

| Item | Finalidade | Risco |
|---|---|---|
| `scripts/sync-vendas-mobile.mjs` | sincroniza fonte→public (roda no dev/build). Manual: `node scripts/sync-vendas-mobile.mjs` | 🔴 |
| `services/video-thumbnail-worker/**` | worker Cloud Run (deploy: `gcloud run deploy` — ver README do serviço) | 🟡 |
| `planejamento/**` | decisões de produto (AvantaShell, cobrança, gateways) | 🟢 |
| `docs/**` | documentação interna + esta pasta | 🟢 |

## Comandos de sincronização/validação

```bash
node scripts/sync-vendas-mobile.mjs   # fonte → public/vendas-mobile
node --check public/mobile-app.js && node --check public/ponto-app.js && node --check vendas_mobile/app/app.js
npx tsc --noEmit
git pull --rebase origin main         # antes de editar/subir (edição paralela)
```

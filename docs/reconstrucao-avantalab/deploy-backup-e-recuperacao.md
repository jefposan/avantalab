# Deploy, backup e recuperação

## Executar localmente

```bash
cd ~/avantalab
npm install
# .env.local com as variáveis de integracoes-e-infraestrutura.md
npm run dev      # roda scripts/sync-vendas-mobile.mjs e next dev
```
Acessos: `/` (web), `/mobile`, `/mobile/vendas`, `/ponto`, `/admin`.

## Validar build

```bash
npx tsc --noEmit                      # web
node --check public/mobile-app.js     # mobile vanilla
node --check public/ponto-app.js
node --check vendas_mobile/app/app.js
npm run build                          # sync + next build
npm run lint
```

## Publicar

Deploy automático: `git push origin main` → Vercel (se travar: `rm -f .git/index.lock`).
Antes de subir: validar, atualizar versão/changelog/caches conforme
[pwa-e-assets.md](pwa-e-assets.md) e `AGENTS.md` (semver MAJOR.MINOR.PATCH.MICRO).
Não fazer commit/push sem autorização do responsável.

## Aplicar migrations

- Histórico: scripts da raiz foram aplicados manualmente no SQL Editor; a partir de jul/2026 usa-se `supabase/migrations` (CLI vinculada — `supabase/.temp/project-ref`).
- Novo banco: seguir a ordem da seção 6 de [banco-supabase.md](banco-supabase.md); com CLI: `supabase link --project-ref <ref>` e `supabase db push`.
- Edge Functions: `supabase functions deploy <nome>` + secrets; agendamentos do painel (agenda/despesas/lembretes-ponto) recriados manualmente.

## Estratégia de backup

| Camada | Como |
|---|---|
| Código | GitHub (`jefposan/avantalab`). Esta pasta `docs/reconstrucao-avantalab/` versionada junto. |
| Banco | Backups automáticos do Supabase + `supabase db dump` periódico (schema + dados). Fazer dump do SCHEMA sempre que alterar o banco pelo painel (o núcleo não tem DDL no repo!). |
| Storage | Baixar buckets `notas-lancamentos`, `vendas-produtos`, `vendas-divulgacao` (CLI/API do Supabase). |
| Dados do usuário | Exportação Excel por perfil (web/mobile) — backup funcional do cliente. |
| Vendas Mobile | `vendas_mobile_backups_reset` guarda snapshots JSONB de resets; suspensão do módulo preserva leitura. |
| Segredos | Vault do Supabase + envs do Vercel + secrets das Edge Functions — manter cópia em cofre externo (nunca no repo). |

## Plano de recuperação total

1. Restaurar repositório do GitHub (ou desta documentação, na pior hipótese).
2. Criar projeto Supabase; extensões + Vault; recriar banco (ordem do banco-supabase.md); restaurar dump de dados; recriar buckets e objetos.
3. Restaurar `auth.users` (dump inclui schema auth) — essencial para logins internos e ponto.
4. Deploy das Edge Functions + secrets; recriar agendamentos; ajustar URL do projeto na migration do cron de conciliação e em `vendas_mobile/app/config.js`.
5. Configurar Vercel (envs) e apontar domínio `avantalab.com.br`.
6. Reconfigurar: webhook Asaas, Google OAuth (redirects), Twilio Verify, Cloud Run (worker + secrets no Vault), chaves VAPID (se trocar o par, todas as inscrições push expiram — usuários reativam).
7. Rodar os testes de [testes-de-validacao.md](testes-de-validacao.md).

## Checklist de migração de fornecedor

- Supabase → outro projeto: dump schema+dados+auth+storage; atualizar `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `config.js` do Vendas, migration do cron, secrets do Vault; reconfigurar OAuth/redirects; re-deploy functions.
- Vercel → outro host: garantir Node runtime nas rotas API, envs, domínio, e que `public/` seja servido estático com os mesmos caminhos.
- Asaas → outro gateway: reescrever `app/lib/asaas.ts`, rotas `cobranca/*`, Edge `conciliar-cobrancas`; migrar/recriar assinaturas (ids do gateway em `assinaturas`); atualizar webhook.
- Twilio → outro SMS: substituir chamadas Verify em `sms/*`, `senha/*`, `vendas/telefone/confirmar`, `feedback/sms`.

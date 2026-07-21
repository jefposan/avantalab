# Integrações e infraestrutura

## Serviços

| Serviço | Papel | Configuração |
|---|---|---|
| Supabase | Postgres+RLS, Auth, Storage, Edge Functions, Realtime, pg_cron/pg_net/Vault | Projeto atual: `qzewxhdkwettnlmkjoqd.supabase.co` (aparece hardcoded em `vendas_mobile/app/config.js` e na migration `20260706190000` — trocar ao migrar). |
| Vercel | Hospedagem Next.js; deploy automático do GitHub `jefposan/avantalab` branch `main` | Domínio `avantalab.com.br` (usado em metadados/OG). |
| Twilio Verify | SMS de verificação de telefone e recuperação de senha | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`. |
| OpenAI | Ava (gpt-4o), Whisper, leitura de notas por foto | `OPENAI_API_KEY` (Vercel e secret nas Edge Functions); `OPENAI_ADMIN_KEY` opcional p/ consumo no /admin. |
| Asaas | Assinaturas/cobrança | `ASAAS_API_KEY` (prefixo `$aact_prod_` → produção; senão sandbox; override `ASAAS_BASE_URL`), `ASAAS_WEBHOOK_TOKEN`. Webhook: `POST https://<dominio>/api/cobranca/webhook` com header `asaas-access-token`. |
| Google OAuth | Login Google (Vendas Mobile e mobile) | Provider habilitado no Supabase Auth; redirect URLs do domínio + `/mobile/vendas`. Client ID/secret geridos no painel Supabase — PENDENTE DE CONFIRMAÇÃO das URLs exatas cadastradas. |
| Google Cloud Run | `services/video-thumbnail-worker` (FFmpeg, capas de vídeo) | Projeto `avantalab-media`, região `southamerica-east1`, service account própria; secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_SECRET`; opcionais `STORAGE_BUCKET` (padrão `vendas-divulgacao`), `MAX_VIDEO_BYTES` (110 MB). URL e secret também no Vault do Supabase (`vendas_thumbnail_worker_url`, `vendas_thumbnail_worker_secret`). |
| Web Push (VAPID) | Notificações push dos PWAs | Secrets nas Edge Functions: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:contato@avantalab.com.br). A public key também está hardcoded em `public/ponto-app.js` (e presumivelmente em `mobile-app.js` — manter em sincronia ao trocar o par de chaves). |
| ViaCEP | Busca de endereço por CEP | Sem chave; proxy em `/api/cep`. |

## Variáveis de ambiente (nomes e finalidade — nunca commitar valores)

### Vercel / `.env.local`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — cliente browser.
- `SUPABASE_SERVICE_ROLE_KEY` — rotas `/api/*` administrativas.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` — SMS.
- `ADMIN_FEEDBACKS_TOKEN` — token mestre do /admin e da Edge `broadcast`.
- `NEXT_PUBLIC_COBRANCA_ATIVA` — liga a versão paga (padrão desligada).
- `NEXT_PUBLIC_COBRANCA_LANCAMENTO` — data de corte "clientes atuais".
- `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` (+`ASAAS_BASE_URL` opcional).
- `OPENAI_API_KEY` (+aliases `OPENAI_API_KEY_AVA`).
- Opcionais do /admin: `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `GITHUB_TOKEN`, `GITHUB_REPO`, `OPENAI_ADMIN_KEY`.
- `NEXT_PUBLIC_SITE_URL` (metadados; fallback `VERCEL_URL` → `https://avantalab.com.br`).

### Supabase Edge Functions (secrets)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `OPENAI_API_KEY`, `ADMIN_FEEDBACKS_TOKEN`, `ASAAS_API_KEY` (+`ASAAS_BASE_URL`). `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente.

### Supabase Vault
- `cron_edge_secret` (autoriza pg_cron→Edge conciliar-cobrancas), `vendas_thumbnail_worker_url`, `vendas_thumbnail_worker_secret`.

## Agendamentos

- pg_cron (criados por migrations): `conciliar-cobrancas` (*/30 min), `processar-miniaturas-vendas-mobile` (1 min).
- Painel Supabase (Scheduled Functions — PENDENTE DE CONFIRMAÇÃO dos crons): `processar-agenda` (1×/dia), `processar-despesas-dia` (1×/dia; docs citam 00:05 e o prompt da Ava cita 08:05 BRT), `processar-lembretes-ponto` (frequência ≤10 min).

## Domínios, callbacks e webhooks

- Produção: `https://avantalab.com.br` (Vercel). PWAs no mesmo domínio (`/mobile`, `/mobile/vendas`, `/ponto`).
- Webhook Asaas → `/api/cobranca/webhook` (token no header; eventos idempotentes por `asaas_event_id`).
- Cloud Run endpoint `POST /process-thumbnail` (Bearer `WORKER_SECRET`), chamado pelo banco via pg_net.
- OAuth Google: redirect do Supabase Auth (`<projeto>.supabase.co/auth/v1/callback`) + site URL do app.

## Riscos ao trocar fornecedor/API

- **Supabase**: URL hardcoded em `vendas_mobile/app/config.js` e na migration do cron; VAPID/inscrições push são inválidas se o par de chaves mudar; RLS e RPCs precisam vir juntas (o app confia nelas); Auth guarda usuários com e-mails sintéticos (`login interno` e funcionários de ponto) — migrar `auth.users` com hashes.
- **Asaas**: `gateway_customer_id`/`gateway_subscription_id` gravados em `assinaturas`; trocar gateway exige recriar assinaturas e reescrever `app/lib/asaas.ts`, rotas de cobrança e a Edge de conciliação.
- **Twilio**: fluxo Verify (envio+checagem) — outro provedor precisa dos dois passos; telefones armazenados em metadata do auth.
- **OpenAI**: modelos `gpt-4o`/`whisper-1` referenciados por nome; o prompt supõe streaming SSE compatível.
- **Cloud Run**: segredo compartilhado com o Vault; sem o worker, vídeos ficam com miniatura `pendente` (fila é retentada e marca erro após 3 tentativas — comportamento seguro).

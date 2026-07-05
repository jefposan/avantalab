# Teste da cobrança no Sandbox (passo a passo)

Objetivo: ver o fluxo da empresa funcionando ponta a ponta (paywall → assinar →
pagar no sandbox → webhook → acesso liberado), sem risco para a produção.

Tudo roda numa URL de **preview** da branch `feature/cobranca`. A produção
(main) fica intocada e com a cobrança desligada.

## Passo 1 — Publicar a branch (gera o preview)
Enviar a branch para o GitHub. O Vercel cria automaticamente um deploy de
preview com URL própria (não mexe na produção).

```
cd ~/avantalab
git push -u origin feature/cobranca
```
Depois, pegar a URL de preview no painel do Vercel (Deployments → a da branch).

## Passo 2 — Configurar as variáveis no preview (Vercel)
No projeto do Vercel → Settings → Environment Variables, no escopo **Preview**:

- `NEXT_PUBLIC_COBRANCA_ATIVA` = `true`
- `NEXT_PUBLIC_COBRANCA_LANCAMENTO` = `2020-01-01T00:00:00Z`  (data no passado, p/ ativar as regras)
- `ASAAS_API_KEY` = a chave de **sandbox** (`$aact_hmlg_...`)
- `ASAAS_WEBHOOK_TOKEN` = um segredo qualquer que você inventa (guarde-o)

Garantir que o preview também tenha (geralmente já herdam da produção):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Após salvar, **re-deployar** o preview para as variáveis valerem.

## Passo 2.5 — Liberar o webhook no preview protegido (Vercel)
O preview fica atrás do login do Vercel. Para o webhook do Asaas (máquina) passar:
- Vercel → Settings → Deployment Protection → **Protection Bypass for Automation**
  → gerar o segredo. Guardar (NÃO colar em chat).
- Usar a **URL fixa da branch** (Deployments → deploy da branch → Domains, a que
  tem `git-feature-cobranca` no meio), não a URL com código de deploy.

## Passo 3 — Configurar o webhook no Asaas (sandbox)
No painel do Asaas **sandbox** → Integrações → Webhooks:
- URL: `https://URL-FIXA-DA-BRANCH/api/cobranca/webhook?x-vercel-protection-bypass=SEGREDO`
  (o SEGREDO é o do Protection Bypass acima)
- Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- Eventos: pagamentos (PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE)

## Passo 4 — Forçar um perfil "vencido" para ver o paywall
Como um perfil novo estaria em trial (não vencido), criamos um estado vencido de
teste com um SQL (Claude fornece na hora). Assim o paywall aparece ao entrar.

## Passo 5 — Rodar o teste
1. Entrar no preview com o perfil de teste → deve aparecer o paywall.
2. Clicar em "Assinar" → é levado à página de pagamento do Asaas.
3. Pagar no sandbox (Pix/cartão de teste).
4. O webhook recebe a confirmação → status vira `ativa` → acesso libera.

## Se algo der errado
- Nada disso afeta a produção (flag off lá, branch e preview separados).
- Logs do webhook aparecem no painel do Asaas (Integrações → Webhooks → Logs).
- Para reverter o preview, é só apagar as variáveis ou a branch.

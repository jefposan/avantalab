# Ava e serviços de IA

A Ava é a assistente do AvantaLab. Identidade, tom e limites estão no prompt único
`supabase/functions/_shared/ava-system-prompt.ts` (`AVA_SYSTEM_PROMPT`) — esse arquivo
é a fonte da verdade do comportamento, tom e limites gerais. Os guias operacionais
por ambiente ficam em `app/lib/ava-conhecimento.ts`, com a referência legível em
`docs/ava/`; ao reconstruir, preservar ambos integralmente.

## Rotas e serviços

| Caminho | Onde roda | Uso |
|---|---|---|
| `/api/ava/chat` (Next) | Vercel | Chat principal (web, mobile, vendas). Exige usuário autenticado (Bearer). Monta `system = AVA_SYSTEM_PROMPT + guia operacional do ambiente + contexto` e chama OpenAI `gpt-4o` (stream SSE, `max_tokens 600`, `temperature 0.4`). Sem `OPENAI_API_KEY` no Vercel, faz fallback para a Edge `chat-ia`. |
| `/api/ava/transcrever-audio` (Next) | Vercel | Whisper (`whisper-1`, pt), limite 10 MB. |
| Edge `chat-ia` | Supabase | Mesmo prompt/modelo; usada como fallback e pelo mobile histórico; também transcreve áudio via `?acao=transcrever-audio` ou multipart. |
| Edge `transcrever-audio` | Supabase | Whisper standalone. |
| Edge `ler-lancamento-foto` / `/api/lancamentos/ler-foto` | ambos | Visão (OpenAI) para extrair campos de comprovantes/notas (≤6 MB, jpeg/png/webp) e preencher o lançamento. |

## Contexto e autenticação

- O CLIENTE monta o contexto (dados financeiros do período, módulos, etc.) e envia no corpo: `{ messages (≤20, roles user/assistant), contexto, empresaId, ambiente }`. A Ava não acessa o banco e não executa ações.
- Gate de acesso (`avaLiberadaParaPerfil`): com `COBRANCA_ATIVA`, perfil Pessoal grátis recebe 403 `premium:true` (recurso `ava`); no ambiente `vendas`, basta ter acesso ativo em `vendas_mobile_acessos`. Fail-open em erro.
- `ambiente` é normalizado como `gestao-web`, `gestao-mobile` ou `vendas`; a API injeta somente o respectivo manual em `app/lib/ava-conhecimento.ts`.
- `npm run verificar:ava` exige que `docs/ava/gestao-web.md`, `gestao-mobile.md` e `vendas.md` tenham sido revisados para a mesma `APP_VERSION`; o build executa essa checagem antes do Next.

## Diferenças por ambiente

- **Gestão Web**: botão flutuante (`ChatFlutuante.tsx`), janela sobreposta.
- **Mobile**: tela cheia independente (`/mobile/ava`, `AvaChatClient` + `AvaMobileBridge`); header fixo, campo ajusta ao teclado, conversa dura a sessão até "Nova conversa"; gravação de áudio → transcrição → envio.
- **Vendas Mobile**: usa a mesma ponte `AvaMobileBridge` (importada na casca `/mobile/vendas`), com `ambiente='vendas'`.

## Variáveis necessárias (sem valores)

- `OPENAI_API_KEY` (Vercel; aliases aceitos: `OPENAI_API_KEY_AVA`).
- Secret `OPENAI_API_KEY` nas Edge Functions do Supabase.

## Limites importantes (do prompt)

Responde só em pt-BR; não inventa dados fora do contexto; não confirma envio de
push/sincronização sem evidência; não expõe segredos/CPFs; funcionários de ponto são
orientados apenas ao `/ponto`; temas contábeis/jurídicos com recomendação de
profissional habilitado.

## Assets

Logos da Ava: `public/images/ava-logo-principal.png`, `ava-logo-fundo-claro.png`,
`ava-logo-fundo-escuro.png` (pré-carregadas no layout do mobile).

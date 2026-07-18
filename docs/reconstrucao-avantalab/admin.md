# Painel Administrativo (`/admin`)

Console do dono do produto (não é para clientes). Cliente React único
`app/admin/page.tsx` (~950 linhas); backend nas rotas `app/api/admin-*`.

## Autenticação

- `app/lib/admin-server.ts` (`exigirAdmin`): aceita o token mestre
  `ADMIN_FEEDBACKS_TOKEN` (env) OU uma senha personalizada armazenada em
  `admin_configuracoes` (hash PBKDF2 + salt + iterations ≥210000). A senha pode ser
  definida/trocada por `/api/admin-configuracoes` (POST).
- O front guarda o token digitado e o envia em header em todas as chamadas.

## Seções e rotas

| Seção | Rota API | Conteúdo/ações |
|---|---|---|
| Perfis | `admin-perfis` | Lista todas as empresas com situação real de acesso (reproduz `resolverEstadoAcesso`: assinatura da tabela, ou "cliente atual" se criada antes de `DATA_LANCAMENTO`, ou trial de 7 dias). Ações de cortesia/ajuste: PENDENTE DE CONFIRMAÇÃO (ver POST da rota). |
| Cupons | `admin-cupons` | CRUD de cupons (código, tipo periodo/vitalicio, duração valor+unidade dias/semanas/meses, max_usos, validade, ativo). |
| Disparos | `admin-disparos` | Envia broadcast (chama Edge `broadcast` → notificação no sino de todos + push `app_origem='mobile'`) e lista histórico (`admin_disparos`). |
| Feedbacks | `admin-feedbacks` | Lista feedbacks dos usuários; muda status (novo/em_analise/respondido/arquivado). |
| Conteúdos Vendas | `admin-conteudos-vendas` | Publica/remove conteúdos GLOBAIS da página Informações do Vendas Mobile (tipos: versao, melhorias, atualizacoes, participe, orientacao, seguranca, dica). |
| Consumo | `admin-consumo` | Uso × limite das plataformas: Supabase (RPC `admin_metricas_uso` — função criada direto no banco, PENDENTE DE CONFIRMAÇÃO do corpo), Vercel (`VERCEL_TOKEN`/`VERCEL_TEAM_ID`), GitHub (`GITHUB_TOKEN`/`GITHUB_REPO`), OpenAI (`OPENAI_ADMIN_KEY`), Asaas. Tokens opcionais — sem eles o painel mostra instruções. |
| Configurações | `admin-configuracoes` | Senha personalizada do painel. |

## Destinos das publicações

- Disparos → todos os usuários do app financeiro (sino `/mobile` + push mobile).
- Conteúdos Vendas (Informações) → todos os usuários do Vendas Mobile (global, `empresa_id null`).
- Novidades por empresa NÃO são feitas aqui — são do gestor da empresa (web Ajustes > Vendas Mobile ou `/mobile/conteudo-vendas`).

## Permissões

Uma única credencial administrativa (token/senha). Não há papéis internos no /admin.

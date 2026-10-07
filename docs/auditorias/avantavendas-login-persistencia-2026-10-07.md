# AvantaVendas — retorno social e persistência do acesso

Data: 07/10/2026. Revisão preparada: `1.48.0.44.01-av181`.
Base: `2855ca73814069b92b651e4bf6dbd4b5c9ca9e7a`, igual ao HEAD da pasta
principal e de `github/main` no encerramento da revisão. Nenhuma reversão de
recursos anteriores ou alteração dos arquivos `output/` e `outputs/`.

## Escopo

- Corrigir a transição de Google/Apple no AvantaVendas, usando a Gestão Mobile
  como referência, sem modificar a implementação da Gestão.
- Unificar a escolha Lembrar-me para senha, Google e Apple.
- Auditar antes de publicar. Esta revisão não foi enviada a produção nem
  executou migrações, gravações de dados ou autenticação em contas reais.

## Evidências e diagnóstico

1. **Corrida no retorno nativo.** O evento `browserFinished` cancelava a
   intenção de login enquanto `setSession`/`exchangeCodeForSession` ainda
   processava o callback. O cancelamento podia limpar a política da sessão e
   renderizar o formulário. A Gestão assume o retorno antes da troca de tokens
   e mantém a preparação até concluir o acesso; o Vendas passa a seguir isso.
2. **Escolha dependente da presença do checkbox.** Se o campo não estivesse
   montado, o login social interpretava a ausência como desmarcado, mesmo com
   preferência marcada no rascunho. A leitura agora usa o valor visível quando
   disponível e, na ausência, conserva o rascunho.
3. **Autorização externa tratada como consulta curta.** Uma inicialização
   nativa com intenção pendente aguardava sessão por aproximadamente dez
   segundos, limpando a intenção se a pessoa ainda estivesse autorizando.
   Esse limite agora se aplica à leitura da sessão, não à interação no provedor.
   A intenção mantém seu TTL de dez minutos e opção de cancelamento antes do
   processamento do retorno.
4. **Callbacks e listeners repetidos.** O mesmo retorno podia ser processado
   mais de uma vez. Agora há guarda durante/depois da confirmação, rejeição
   de retorno tardio de tentativa cancelada e registro idempotente dos
   listeners nativos, com liberação ao sair efetivamente da página.
5. **Falhas posteriores ao login.** Erro na preparação de perfis/dados apagava
   a política da sessão social já confirmada. Isso não deve revogar a escolha
   de persistência; a preferência passa a ser preservada.
6. **Rede confundida com autenticação.** Erro de rede em `getUser` forçava
   renovação; erro de rede em `getSession` era tratado como sessão inexistente.
   Agora essas falhas são propagadas ao tratamento de indisponibilidade/offline,
   sem rotação desnecessária ou falso diagnóstico de ausência de sessão.
7. **Expiração e renovação.** Consultar o prazo vencido removia a evidência
   necessária para encerrá-lo e podia migrá-lo como sessão legada. O prazo
   permanece até a decisão de encerramento. Eventos válidos de autenticação
   renovam a janela persistente sem chamar o SDK dentro de seu callback.

O caminho normal senha + Lembrar-me + reabertura **já passou antes da mudança**.
Não há evidência de que estivesse sempre quebrado. A rede e eventual revogação
no servidor são hipóteses adicionais para o relato, não um diagnóstico comprovado
do aparelho do usuário.

A base `1.48.0.44` já elimina a revogação global de outras sessões ao abrir
perfis da Gestão. Essa correção não foi feita nesta revisão e foi preservada.
Lembrar-me não recupera uma sessão revogada pelo servidor. A publicação da base
depende da migração `20261007190000_sessoes_isoladas_por_perfil.sql`, cuja aplicação
em produção não foi verificada nesta auditoria.

## Política e segurança preservadas

- Sessão do Vendas continua usando `avantalab-vendas-mobile-auth`; a Gestão
  não passa a compartilhar tokens ou restaurar o Vendas silenciosamente.
- Lembrar-me conserva identificador/preferência e sessão gerenciada pelo SDK,
  nunca senha, código OAuth ou uma cópia própria de tokens.
- Marcado: janela de 30 dias renovada com uso. Desmarcado: sessão temporária,
  respeitando a continuidade durante o redirecionamento social.
- Expiração, credencial inválida, saída explícita e ausência real da sessão
  continuam sendo respeitadas. Falha de rede não é autorização para ignorar
  credenciais inválidas ou criar uma sessão.
- URL web, origem e esquema nativo `br.com.avantalab.vendas://auth/callback`
  continuam iguais. SDK, provedores, política do Supabase e pacote nativo
  não foram atualizados.
- Nenhuma mudança em pedidos, pagamentos, estoque, catálogo, vínculos,
  compartilhamento, permissões, RLS ou tabelas.

## Auditoria executada

- **696 testes da suíte completa:** todos aprovados.
- **35 testes direcionados:** senha, Google/Apple, marcado/desmarcado,
  reabertura, prazo vencido, autorização demorada, abertura fria, cancelamento,
  retorno inválido/duplicado/tardio, ordem dos eventos, falha de dados/rede,
  renovação e ciclo de vida dos listeners.
- **Chrome isolado com DOM real:** quatro casos, Android/iOS × Google/Apple.
  Botão social real, renderização do `app.js` real e observação das mudanças no
  DOM enquanto o evento de fechamento concorre com a confirmação. Todos
  mantiveram Preparando acesso e a preferência, sem exibir formulário no meio.
  Provedores, plugins e carga operacional foram simulados; isso **não é** um
  teste físico Android/iOS nem autenticação real Google/Apple.
- TypeScript `--noEmit --incremental false`: aprovado.
- Build de produção Next.js: aprovado, incluindo as 148 páginas geradas.
  O primeiro ensaio esbarrou no bloqueio de rede para a fonte Inter; após
  permitir sua leitura, a compilação passou e a coleta apontou a ausência da
  chave administrativa nesta cópia isolada. O ensaio final usou a configuração
  pública existente e um valor administrativo fictício somente no processo
  local do build. Nenhuma credencial administrativa real foi necessária.
- Sintaxe dos dois arquivos JavaScript e `git diff --check`: aprovados.
- Validadores: Padrão Avanta 1.17.0, Ava, acesso Mobile/Web, agenda Vendas,
  interface Vendas, revisão de recursos e notificações por perfil: aprovados.

Executar novamente:

```sh
node --test tests/avantavendas/login-persistencia-oauth.test.mjs tests/modulos/sessao-avantavendas.test.mjs
node scripts/auditar-login-vendas-navegador.mjs
npm test
```

O script Chrome usa Node com WebSocket global e o Google Chrome do macOS.
Cria perfil temporário próprio; não interfere no Chrome aberto do usuário.

## Conferência final no aparelho

1. Conferir a revisão de recursos carregada para não testar JavaScript antigo.
2. Em Android e iPhone, entrar com senha, Google e Apple com Lembrar-me marcado;
   fechar/reabrir o aplicativo e confirmar o acesso restaurado.
3. Repetir desmarcado, iniciando uma nova sessão do WebView/navegador.
4. No provedor, demorar mais de dez segundos, concluir e observar a preparação
   sem retorno ao formulário. Repetir fechando/cancelando a autorização.
5. Confirmar que entrar na Gestão não revoga o acesso do Vendas; verificar a
   implantação da migração de sessões por perfil se esse comportamento persistir.
6. Indisponibilidade de rede deve permitir recuperação, não apagar dados ou
   orientar reinstalação. Saída explícita continua exigindo novo login.

## Referências técnicas

- [Eventos de autenticação Supabase](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Locks e callbacks de autenticação](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0)
- `public/mobile-app.js`: conclusão social nativa e persistência da Gestão.
- `app/mobile/OAuthNativoMobileBridge.tsx`: callback e fechamento da autorização.
- `docs/padrao-avanta/autenticacao.md`: fonte única de estado, sessão e lembrar-me.

# Autenticação e acesso

Este documento define o padrão oficial de login, cadastro, recuperação de
acesso e autenticação social dos produtos AvantaLab. Ele se aplica a Web, PWA,
Android, iOS e a novos sistemas plugados.

As implementações de referência são:

- Gestão React: `app/components/AuthCard.tsx` e `app/hooks/useAuth.ts`;
- Gestão Mobile: `public/mobile-app.js`;
- AvantaVendas: `app/avantavendas/sistema/app.js` e
  `app/avantavendas/sistema/styles.css`.

Esses arquivos são referências de comportamento e aparência, não autorização
para copiar lógica entre tecnologias. Quando existir componente oficial
compatível, ele deve ser reutilizado.

## Princípios obrigatórios

1. Login é uma fronteira crítica do produto: nenhuma alteração pode deixar
   botão, tela ou sessão em espera indefinida.
2. E-mail, telefone, Google e Apple concluem a mesma identidade e a mesma sessão
   Supabase; o provedor não cria uma área paralela do sistema.
3. Google e Apple compartilham uma única máquina de estados e uma única fonte de estado social.
   Não criar `googleLoading`, `appleLoading` e flags equivalentes concorrentes.
4. Web/PWA preservam o redirecionamento para
   `${window.location.origin}/` quando a entrada pertence à Gestão.
5. Aplicativo nativo usa navegador seguro, deep link próprio e conclusão
   explícita da sessão dentro do aplicativo.
6. Cancelamento, fechamento do navegador, erro do provedor e callback inválido
   sempre restauram uma tela de login limpa e interativa.
7. A intenção de origem acompanha o acesso: após autenticar ou sair, o usuário
   volta ao sistema correto, sem cair por engano em outra landing ou login.
8. O fluxo PWA/Web publicado não pode ser alterado como efeito colateral de uma
   correção exclusiva do Capacitor.

## Composição visual oficial

### Cena

- Usar o fundo mobile oficial sem logotipo incorporado. A marca é um elemento
  separado, permitindo posicionamento responsivo.
- O card fica centralizado horizontalmente e estabilizado na área útil vertical.
  A marca ocupa o espaço disponível entre o topo seguro e o card, centralizada
  nesse intervalo.
- A composição obrigatória das cenas de acesso, recuperação, bloqueio e
  carregamento é uma grade de três faixas: `minmax(0, 1fr) auto minmax(0, 1fr)`.
  A marca fica na primeira faixa, o card na faixa central e a última faixa
  absorve o espaço restante. Não posicionar a marca por `top`, margem fixa ou
  coordenada absoluta. O padrão continua válido em iOS, Android, PWA e WebView.
- Uma tela sem card (transição técnica imperceptível) não precisa exibir marca.
  Telas autenticadas, dashboards e modais de conteúdo não são cenas de acesso e
  não devem receber marca decorativa apenas por usarem o fundo institucional.
- Em WebView, usar a altura visual estável do aparelho, respeitar
  `env(safe-area-inset-*)`, impedir bounce da página externa e permitir rolagem
  somente no conteúdo do card quando ela for realmente necessária.
- Não criar tarja fixa para a status bar. O fundo da cena continua até a borda;
  o conteúdo nativo da barra alterna claro/escuro conforme o tema e o contraste.
- Referência do card mobile: largura máxima de 336 px, raio de 18 px, padding de
  16 px, gap de 8 px, borda branca translúcida, fundo branco a 30% e blur de
  18 px. Variações precisam preservar contraste e legibilidade.

### Hierarquia

1. marca AvantaLab;
2. título específico do produto, como **Gestão Financeira** ou
   **Gestão de Vendas**;
3. texto curto explicando o destino do acesso;
4. seletor E-mail/Telefone;
5. credencial e senha;
6. Lembrar-me e recuperação;
7. ação primária;
8. Google;
9. Apple;
10. alternância entre entrar e cadastrar.

Não duplicar título dentro e fora do card. Cadastro e recuperação mantêm a mesma
cena e a mesma escala visual do login.

### Medidas e cores

| Elemento | Regra |
|---|---|
| Card | máximo 336 px, raio 18 px, padding 16 px, gap 8 px |
| Seletor | face de 34 px, raio 9 px; ativo em `#1687D9` |
| Campo | face de 44 px, raio 12 px, texto com no mínimo 16 px no mobile |
| Entrar/Continuar | face de 32 px, raio 10 px, fundo `#1687D9`, texto branco |
| Google | face de 32 px, borda `#d9e0e4`, fundo branco, texto `#334155` |
| Apple | face de 32 px, fundo `#111827`, texto branco |
| Toque | área interativa mínima de 44 × 44 px, mesmo com face visual menor |

Os três botões principais usam largura integral e gap de 8 px. A marca Google e
o símbolo Apple precisam permanecer reconhecíveis; não redesenhar os provedores
como ícones genéricos do sistema.

## Máquina de estados

A fonte de verdade deve equivaler a:

```ts
type ProvedorOAuth = 'google' | 'apple';
type EstadoAcesso =
  | { etapa: 'ocioso' }
  | { etapa: 'credencial'; acao: 'login' | 'cadastro' | 'recuperacao' }
  | { etapa: 'social'; provedor: ProvedorOAuth }
  | { etapa: 'callback'; provedor: ProvedorOAuth | null }
  | { etapa: 'sessao-pronta' }
  | { etapa: 'erro'; mensagem: string };
```

Pode haver nomes diferentes conforme a tecnologia, mas deve existir uma única
fonte de estado social, espelhada em `ref` quando callbacks nativos precisarem
ler o valor atual.

| Evento | Estado esperado |
|---|---|
| toque em Google/Apple | registrar provedor, bloquear repetição e mostrar preparação |
| navegador seguro aberto | manter preparação; não voltar ao card prematuramente |
| callback válido | processar sessão, fechar navegador e continuar para o sistema |
| erro do provedor | limpar estado social, mostrar erro e reabilitar todas as ações |
| navegador dispensado | limpar estado social e retornar ao login |
| cancelar preparação | fechar navegador quando possível, limpar estado e retornar |
| remontagem sem sessão | restaurar preparação apenas se houver intenção social válida |
| remontagem com sessão | apagar intenção pendente e seguir para o sistema |

### Tela Preparando acesso

- Ao iniciar Google ou Apple, o card de login sai de cena e entra
  **Preparando acesso**. Não deixar o botão **Conectando…** exposto como única
  indicação de andamento.
- Exibir etapa real e progresso somente quando houver tarefas mensuráveis.
- Enquanto o provedor estiver pendente, oferecer **Cancelar e voltar ao login**
  na tela de preparação, nunca dentro do card de login ocioso.
- Cancelar remove feedback antigo, restaura os rótulos **Continuar com Google**
  e **Continuar com Apple** e permite nova tentativa imediatamente.
- Não limpar o estado apenas porque o aplicativo ficou ativo novamente; o
  retorno de foco pode acontecer enquanto o provedor ainda está processando.

## Web e PWA

1. Chamar `signInWithOAuth` sem `skipBrowserRedirect`.
2. A Gestão usa `redirectTo: `${window.location.origin}/``.
3. Antes de sair para o provedor, registrar em `sessionStorage` a intenção do
   login e o destino interno esperado.
4. Na raiz, aguardar o Supabase confirmar a sessão. Só então encaminhar para a
   Gestão ou para o sistema de origem.
5. Sem sessão, a raiz permanece na landing SEO oficial. Nunca renderizar uma
   landing antiga ou uma cópia interna de autenticação.
6. Erro ou retorno incompleto apagam a intenção pendente e devolvem o login
   pronto, com mensagem compreensível.

Rotas de Vendas podem retornar diretamente ao próprio caminho, desde que
preservem a origem e nunca obriguem uma passagem indevida pela landing.

## Capacitor Android e iOS

### Abertura

1. Detectar o ambiente com `Capacitor.isNativePlatform()`.
2. Chamar `signInWithOAuth` com o deep link do aplicativo e
   `skipBrowserRedirect: true`.
3. Validar a presença de `data.url`.
4. Abrir essa URL com `Browser.open` no navegador seguro.
5. Manter a tela **Preparando acesso** até callback, erro ou cancelamento.

### Retorno

- Escutar `App.addListener('appUrlOpen', ...)` para o aplicativo já aberto.
- Consultar `App.getLaunchUrl()` para abertura a frio.
- Escutar `Browser.addListener('browserFinished', ...)` e restaurar o login
  quando o navegador for dispensado sem callback.
- Validar protocolo, host e caminho do deep link antes de aceitar tokens.
- Aceitar o fluxo PKCE por `code` usando `exchangeCodeForSession`.
- Quando o provedor retornar `access_token` e `refresh_token`, concluir com
  `setSession`.
- Tratar `error` e `error_description`.
- No `finally`, limpar o estado pendente e executar `Browser.close()` quando
  possível.
- Remover todos os listeners ao desmontar para evitar callbacks duplicados.

Exemplo atual da Gestão:

```text
br.com.avantalab.app://auth/callback
```

Novos aplicativos usam seu próprio App ID. Protocolo, Android intent-filter,
iOS URL Types e Redirect URL do Supabase precisam ser idênticos.

## Sessão, origem e logout

- **Lembrar-me** vale igualmente para senha, Google e Apple.
- Marcado: persistência por até 30 dias, renovada conforme a política do
  produto. Desmarcado: sessão limitada ao uso corrente, preservando apenas uma
  janela curta para concluir o OAuth.
- Nunca armazenar senha, código SMS, token OAuth ou refresh token em rascunho
  próprio. A sessão fica sob responsabilidade do cliente Supabase.
- Um login iniciado no Vendas volta ao Vendas; um login iniciado na Gestão volta
  à Gestão. O logout respeita a mesma origem e não exibe `Auth session missing`
  como erro ao usuário.
- Sessão confirmada segue diretamente para preparação de perfil/permissões. Não
  exigir segundo clique na landing.

## Cadastro e provedores

- Cadastro por Google ou Apple usa a mesma conta-base do cadastro por e-mail.
  Dados de perfil ainda obrigatórios são concluídos depois da sessão, sem criar
  outro usuário deliberadamente.
- Não unir contas apenas por texto de e-mail sem identidade confirmada pelo
  provedor e pelo Supabase.
- Se Google for oferecido no iOS, oferecer Apple com destaque equivalente e
  funcionamento completo.
- O nome fornecido pela Apple pode chegar somente na primeira autorização; deve
  ser persistido quando disponível, sem depender de novo envio.
- E-mail privado da Apple é aceito como identidade válida.

## Configuração externa obrigatória

Antes de considerar o login pronto, conferir:

- Supabase: Site URL, Redirect URLs e provedores Google/Apple ativos;
- Google Cloud: cliente OAuth, origens e callback do Supabase;
- Apple Developer: App ID, Sign in with Apple, Services ID, domínio e Return URL;
- Android: intent-filter do deep link no app correto;
- iOS: URL Types, Bundle ID, Team e capability Sign in with Apple;
- Capacitor: `@capacitor/app` e `@capacitor/browser` sincronizados nas plataformas.

Segredos, chaves privadas e client secrets nunca entram no cliente, no Git ou
em documentação pública.

## Acessibilidade e mensagens

- Labels visíveis, `autocomplete`, `inputmode` e tipos de campo devem corresponder
  ao dado solicitado.
- Senha oferece mostrar/ocultar com `aria-label` e `aria-pressed`.
- Carregamento usa texto, não apenas spinner ou cor.
- Erro fica associado ao fluxo e não apaga o que o usuário pode corrigir.
- A mudança para preparação deve ser anunciada por região de status quando a
  tecnologia permitir.
- Foco retorna a um ponto previsível do login após erro ou cancelamento.
- Respeitar movimento reduzido e contraste em tema claro/escuro.

## Matriz mínima de testes

Testar separadamente:

- Web desktop e mobile;
- PWA instalado e navegador comum;
- Android com aplicativo fechado e aberto;
- iOS com aplicativo fechado e aberto;
- Google e Apple;
- senha por e-mail/login e por telefone;
- Lembrar-me marcado e desmarcado;
- sucesso, credencial recusada, ausência de rede, callback inválido;
- fechar pelo X, dispensar o navegador, voltar do sistema e cancelar preparação;
- login repetido, sessão já existente e logout;
- status bar, safe areas, teclado, rotação e diferentes alturas de tela.

Critério de aceite: em todos os caminhos, o usuário termina dentro do sistema ou
em um login limpo e operável. Nunca em landing incorreta, navegador abandonado,
**Conectando…** permanente ou **Preparando acesso** sem saída.

## Antipadrões proibidos

- flags independentes para Google e Apple;
- duplicar formulário ou landing para resolver diferença de plataforma;
- usar deep link no Web/PWA;
- usar `${window.location.origin}/` como callback nativo;
- aceitar callback sem validar a URL;
- depender apenas de `appStateChange` para detectar cancelamento;
- esconder o login sem oferecer recuperação de erro/cancelamento;
- deixar listeners nativos acumularem após remontagem;
- alterar PWA para contornar defeito exclusivo do WebView;
- criar faixa visual para simular safe area ou status bar.

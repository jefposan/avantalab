# Ava — Manual da Gestão Mobile

<!-- ava-version: 1.6.0.84.89 -->

> Revisão 1.6.0.84.89: consolidação técnica do AvantaVendas em uma única fonte;
> sem mudança operacional na Gestão Mobile.

> Revisão 1.6.0.84.88: a seleção e a troca para o Vendas passam a abrir a nova
> estrutura `/avantavendas`, preservando sessão e origem do acesso.

> Revisão 1.6.0.84.87: rota paralela de validação do AvantaVendas; sem impacto
> operacional na Gestão Mobile.

> Revisão 1.6.0.84.86: correção de distribuição no Vendas Mobile; sem impacto
> operacional adicional na Gestão Mobile.

> Revisão 1.6.0.84.85: Recolher em Despesas e Receitas também fecha e limpa a
> busca aberta.

> Revisão 1.6.0.84.84: com Vendas Mobile instalado e permissão autorizada, o
> cabeçalho exibe o atalho para ir ao Vendas. Ao buscar lançamentos, Despesas e
> Receitas mantêm a ação Recolher disponível.

> Revisão 1.6.0.84.83: conta de revisão não exibe o cadastro detalhado do perfil; sem impacto operacional para os demais usuários.
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.75: novo nome e ícone de instalação do PWA de Ponto; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.74: reforço do nome de instalação do PWA de Vendas no
> Safari/iPhone; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.73: novo nome e ícone de instalação do PWA de Vendas; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.72: ajuste de locais agrupadores em Recebimentos
> Presenciais, sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.71: ajuste de vencimento em Recebimentos Presenciais, sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.70: ajuste de cadastro em Recebimentos Presenciais, sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.69: mudança de cadastro no Recebimentos Presenciais da
> Gestão Web; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.68: refinamento visual do seletor entre E-mail e Telefone;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.67: alinhamento do card do Vendas à largura útil do
> Financeiro; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.66: padronização dimensional dos logins Financeiro e
> Vendas; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.65: compactação visual dos cards de login; sem impacto
> operacional na Gestão Mobile.

> Revisão 1.6.0.84.64: redução visual da marca e do card de acesso; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.63: ajuste visual dos cards de acesso para 30% de
> transparência; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.59: as telas de acesso exibem **Gestão Financeira** para
> identificar claramente o aplicativo atual.

> Revisão 1.6.0.84.58: ao chegar à Gestão pelo Vendas, sair da conta retorna ao
> login do Vendas. Quem iniciou pela Gestão continua retornando à entrada dela.

> Revisão 1.6.0.84.57: a rota da Gestão abre sempre a própria Gestão, mesmo
> quando existir uma preferência antiga do Vendas neste aparelho.

> Revisão 1.6.0.84.56: o Vendas Mobile abre diretamente no próprio aplicativo;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.55: campos adicionais no cadastro do Vendas Mobile; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.54: Lembrar-me mantém a sessão por 30 dias na Gestão
> Mobile; desmarcado, o acesso vale apenas enquanto o app/navegador estiver aberto.

> Revisão 1.6.0.84.53: aprimoramento visual das ações de Importação assistida
> da Gestão Web; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.52: no aplicativo, após sair, a entrada permite usar
> e-mail/login ou telefone brasileiro com DDD; a senha é a mesma da conta.

> Revisão 1.6.0.84.51: recuperação de sessão no Importador da Gestão Web; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.50: ajuste visual do seletor de perfil da Gestão Web; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.49: rascunhos no servidor do Importador Web; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.48: padronização visual das cenas de acesso do Vendas; sem
> impacto operacional na Gestão Mobile.
>
> Revisão 1.6.0.84.47: sugestões de tipo no Importador da Gestão Web; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.45: correção de viewport no aplicativo iOS do Vendas; sem
> impacto operacional na Gestão Mobile.
>
> Revisão 1.6.0.84.41: Vendas Mobile unificou altura de viewport, fundo e áreas
> seguras; sem impacto operacional na Gestão Mobile.

## Escopo

Este manual vale para a Ava aberta no Gestão Mobile/PWA (`/mobile`). A resposta
deve usar os nomes do menu e da barra inferior do celular.

## Navegação e perfil

- A barra inferior possui **Início**, **Lançar** e **Menu**; dois atalhos laterais
  podem ser ajustados em **Menu > Organizar atalhos**.
- Avisos já recebidos podem ser consultados e apagados em **Menu > Configurações >
  Avisos e notificações**; a ativação das notificações do aparelho fica no item
  **Notificações**, no mesmo submenu.
- **Sobre** apresenta as principais novidades em marcos consolidados, sem listar
  ajustes exclusivamente técnicos.
- Em **Configurações**, **Assinatura** aparece primeiro quando disponível, seguida
  pelos controles com chave. **Gerenciar perfil**, **Usuários** e **Editar dados
  cadastrais** aparecem em sequência.
- Quando o módulo Vendas Mobile está ativo e o usuário tem permissão, após o login
  a primeira tela permite escolher entre Gestão e Vendas e memorizar a preferência. Só
  depois da escolha aparece **Preparando acesso** e o sistema selecionado é carregado.
- Em **Preparando acesso**, 100% significa que os dados necessários para abrir o
  perfil foram concluídos. A Gestão libera a tela principal imediatamente e continua
  sincronizações complementares em segundo plano. Verificações lentas são repetidas;
  se a preparação ficar sem progresso por tempo anormal, o aplicativo faz uma única
  reconexão automática. Persistindo a falha, exibe **Tentar novamente** sem entrar em
  ciclo de recargas. Se chegar a 100% e o card ainda permanecer visível, o aplicativo
  confirma novamente a abertura antes de oferecer a recuperação.
- Dentro da Gestão, **Menu > Ir para Vendas** abre diretamente o Vendas Mobile; a
  tela com as duas opções é exibida somente na entrada após o login. Ao tocar, a
  Gestão consulta o estado atual do módulo no servidor para não solicitar uma
  ativação que já tenha sido concluída.
- Em um perfil sem o módulo instalado, **Ir para Vendas** continua disponível para
  Gestor Master ou Administrador. Ao tocar, o sistema solicita a ativação, confirma
  o salvamento no servidor e segue para o Vendas. Em perfil pessoal gratuito, a
  ativação exige primeiro o Premium.
- A instalação é salva separadamente em cada perfil da Gestão. Depois de ativada,
  não volta a ser solicitada enquanto o módulo permanecer instalado. Essas
  permissões não criam outras contas no Vendas: cada usuário possui uma única
  conta operacional.
- **Ir para Vendas** também pode ocupar um dos atalhos configuráveis da barra
  inferior, inclusive antes da ativação. Operadores veem o botão lateral inativo e
  não recebem permissão para ativar ou trocar de sistema.
- Ao escolher Vendas, a conta única do usuário abre diretamente. O destino
  financeiro continua sendo definido somente em **Configurações > Integração com
  Gestão**, dentro do Vendas.
- A ordem/visibilidade dos cards do dashboard é ajustada em **Menu > Organizar
  resumo** ou **Organizar dashboard**.
- Em **Gerenciar perfil**, o usuário pode administrar seus perfis conforme a
  permissão. Tocar em um perfil pode apenas destacá-lo; a troca efetiva usa o
  controle de troca já exibido no app.
- Valores podem iniciar ocultos pelo ícone de olho, conforme a privacidade salva.

## Lançamentos e agenda

- Para cadastrar ou revisar despesas e categorias: **Menu > Cadastrar despesas**.
- Nos cards **Despesas do mês** e **Receitas do mês**, tocar na lupa abre a busca
  já focada e pronta para digitação.
- O app registra receitas, despesas, despesas futuras, parcelamentos e despesas
  fixas. Previsto só se torna lançamento confirmado após a ação do usuário.
- Recorrências inteiras são alteradas em **Despesas fixas**; uma edição direta da
  linha mensal não altera os outros meses.
- A agenda exibe lembretes e compromissos. Puxar para atualizar exige gesto longo
  e conexão ativa.

## Conta e limites

- No aplicativo Android/iOS, **Entrar com Google** abre o navegador seguro do
  sistema. Ao concluir, o AvantaLab reabre automaticamente; ao cancelar, o
  usuário pode tentar novamente na tela de login.
- Perfil, dados cadastrais, backup e restauração ficam nas áreas de perfil/menu.
- A senha é da conta AvantaLab e pode afetar outros ambientes autenticados com o
  mesmo login.
- Controle de Ponto para funcionários é em `/ponto`, não no app financeiro. Sem
  dias de trabalho marcados, o funcionário fica em Escala variável: pode bater
  ponto em qualquer dia, mas não entra nos cálculos automáticos de faltas,
  atrasos ou lembretes de ponto. A inativação é feita na Gestão Web e bloqueia
  login e novas marcações sem apagar o histórico.
- A Ava explica, mas não altera dados, não revela informações de outros perfis e
  não garante uma sincronização sem confirmação no contexto.

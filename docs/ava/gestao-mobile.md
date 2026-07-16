# Ava — Manual da Gestão Mobile

<!-- ava-version: 1.5.3.13 -->

> Revisão 1.5.3.13: Usuários permite alterar e-mail e senha conforme a hierarquia de permissões; login e e-mail passam a acessar a mesma conta.

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
  depois da escolha aparece **Preparando acesso** e o sistema selecionado é carregado. A
  escolha pode ser refeita em **Menu > Sistemas**.
- Em um perfil sem o módulo Vendas instalado, **Sistemas** aparece inativo no menu
  lateral. Gestor Master ou Administrador pode tocar nele, confirmar a ativação e,
  após a validação, escolher entre Gestão e Vendas. Em perfil pessoal gratuito, a
  ativação exige primeiro o Premium.
- **Sistemas** também pode ocupar um dos atalhos configuráveis da barra inferior.
  Essa opção de atalho fica disponível depois que o módulo é ativado. Operadores
  veem o botão lateral inativo e não recebem permissão para ativar ou trocar de sistema.
- No seletor aberto pelo menu ou atalho, o **X** ou um toque fora do card cancela a
  troca e mantém o sistema atual. A escolha inicial antes do carregamento continua
  obrigatória.
- Ao escolher Vendas, um único perfil de Vendas ativo abre diretamente. Quando a
  conta possui mais de um, o usuário escolhe qual deseja acessar antes do carregamento.
  Essa escolha não modifica o destino financeiro configurado no Vendas.
- A ordem/visibilidade dos cards do dashboard é ajustada em **Menu > Organizar
  resumo** ou **Organizar dashboard**.
- Em **Gerenciar perfil**, o usuário pode administrar seus perfis conforme a
  permissão. Tocar em um perfil pode apenas destacá-lo; a troca efetiva usa o
  controle de troca já exibido no app.
- Valores podem iniciar ocultos pelo ícone de olho, conforme a privacidade salva.

## Lançamentos e agenda

- Para cadastrar ou revisar despesas e categorias: **Menu > Cadastrar despesas**.
- O app registra receitas, despesas, despesas futuras, parcelamentos e despesas
  fixas. Previsto só se torna lançamento confirmado após a ação do usuário.
- Recorrências inteiras são alteradas em **Despesas fixas**; uma edição direta da
  linha mensal não altera os outros meses.
- A agenda exibe lembretes e compromissos. Puxar para atualizar exige gesto longo
  e conexão ativa.

## Conta e limites

- Perfil, dados cadastrais, backup e restauração ficam nas áreas de perfil/menu.
- A senha é da conta AvantaLab e pode afetar outros ambientes autenticados com o
  mesmo login.
- Controle de Ponto para funcionários é em `/ponto`, não no app financeiro.
- A Ava explica, mas não altera dados, não revela informações de outros perfis e
  não garante uma sincronização sem confirmação no contexto.

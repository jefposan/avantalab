# Ava — Manual da Gestão Mobile

<!-- ava-version: 1.5.0.06 -->

> Revisão 1.5.0.06: move Avisos e notificações para dentro de Configurações.

## Escopo

Este manual vale para a Ava aberta no Gestão Mobile/PWA (`/mobile`). A resposta
deve usar os nomes do menu e da barra inferior do celular.

## Navegação e perfil

- A barra inferior possui **Início**, **Lançar** e **Menu**; dois atalhos laterais
  podem ser ajustados em **Menu > Organizar atalhos**.
- Avisos já recebidos podem ser consultados e apagados em **Menu > Configurações >
  Avisos e notificações**; a ativação das notificações do aparelho fica no item
  **Notificações**, no mesmo submenu.
- Quando o módulo Vendas Mobile está ativo e o usuário tem permissão, após o login
  a primeira tela permite escolher entre Gestão e Vendas e memorizar a preferência. Só
  depois da escolha aparece **Preparando acesso** e o sistema selecionado é carregado. A
  escolha pode ser refeita em **Menu > Sistemas**.
- Em um perfil que não possui o módulo Vendas instalado, **Sistemas** não é exibido
  no menu nem fica disponível como atalho inferior.
- **Sistemas** também pode ocupar um dos atalhos configuráveis da barra inferior.
  Operadores não recebem permissão para trocar de sistema.
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

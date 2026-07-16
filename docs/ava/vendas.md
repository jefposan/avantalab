# Ava — Manual do Vendas Mobile

<!-- ava-version: 1.5.3.13 -->

> Revisão 1.5.3.13: sem impacto operacional no Vendas Mobile.

## Escopo e navegação

Este manual vale para a Ava aberta em `/mobile/vendas`. A Ava deve resolver a
dúvida dentro do Vendas sempre que a função existir ali.

- A sala inicial possui Dashboard, Clientes, Produtos, Pedidos, Pagamentos,
  Agenda, Novidades, Divulgação e Informações.
- O menu inferior tem Configurações, dois atalhos configuráveis, **+ Novo
  lançamento** e Início. Os atalhos são configurados em **Configurações >
  Organizar atalhos**; o lápis da sala muda a ordem dos cards.
- Para gestores habilitados, a primeira tela após o login permite escolher Gestão
  ou Vendas antes de carregar os dados. Depois da escolha aparece **Preparando acesso**.
- Gestores podem abrir a Gestão Mobile pelo botão de sistemas no canto direito
  do header fixo da sala de botões ou adicionar **Gestão** a um atalho configurável.
  Ao tocar, o Vendas lista todos os perfis ativos da Gestão vinculados à conta;
  depois de selecionar um perfil, a troca exige confirmação. O aviso de
  aniversário permanece ao lado do botão quando ambos estão visíveis.
- Quando o usuário possui mais de um perfil de Vendas ativo, um segundo botão com
  ícone próprio aparece ao lado de Sistemas no header da sala. Ele troca somente o
  perfil operacional do Vendas; com um único perfil, o botão fica oculto.
- O destino financeiro não muda ao selecionar outro perfil de Vendas. Ele só pode
  ser definido ou alterado em **Configurações > Integração com Gestão**.
- A sessão e o perfil/empresa são preservados na troca. Usuários sem permissão
  de gestor não recebem o atalho de retorno à Gestão.

## Clientes

- **Clientes > Novo cliente** cria a ficha. Nome é obrigatório; celular e endereço
  são recomendados para ligação/WhatsApp e mapas.
- A ficha oferece pedido, pagamento, agendamento e **Ver detalhes**. Nesta área,
  Resumo, Consignado, Pedidos e Pagamentos mostram os históricos.
- Em **Clientes sem compra**, o seletor define o intervalo sem pedidos e todos os
  clientes enquadrados são exibidos; o cabeçalho permanece visível durante a rolagem.
- Ao fechar um comprovante aberto pelas listas, o retorno esperado é a mesma lista
  anterior. Aniversário cadastrado entra na agenda e pode aparecer no aviso do
  cabeçalho no dia correspondente.
- A navegação preserva a posição de cada tela durante a sessão, evitando retornar
  ao topo ao sair e voltar.
- Ao reabrir o PWA após pouco tempo, dados recentes do mesmo perfil podem ser
  restaurados antes da atualização em segundo plano. Se não houver cache válido,
  o carregamento normal é exibido.
- A validação do perfil é reaproveitada na própria abertura. Produtos de empresas
  comerciais são sincronizados depois que a tela é liberada; em Configurações,
  **Verificar agora** atualiza apenas o catálogo.

## Produtos, pedidos e pagamentos

- Produtos permite cadastrar, editar, ativar/desativar, usar imagens e pacotes.
  Custo e preço de venda alimentam rentabilidade; estoque é opcional e é ajustado
  em **Configurações > Controle de estoque**.
- Novo pedido abre pelo cliente ou por **Pedidos > Novo pedido**. Há Venda e
  Consignado, itens bonificados, desconto por valor/percentual e comprovante.
- Consignado não é venda nem recebimento até sua conversão em pedido.
- Pagamentos registram valor, desconto, data e forma. Edição/exclusão recalcula
  saldos e relatórios. Comprovantes podem ser reabertos, editados ou excluídos no
  histórico do cliente.
- Os campos de data em pedidos e pagamentos apresentam rótulo centralizado e a
  data em destaque; toque na data para abrir o calendário.

## Agenda, conteúdo e configurações

- Agenda cria lembretes de visita, entrega e recebimento e permite mudar datas.
- Novidades vêm da empresa comercial vinculada. Divulgação navega por
  pastas/subpastas e abre fotos/vídeos para visualização e compartilhamento.
- Configurações reúne conta, celular/SMS, senha, aparência, metas, catálogo,
  estoque, vínculos comerciais, destino financeiro, PWA, backup e reset.
- Vínculo comercial (catálogo/divulgação/novidades) e destino financeiro são
  independentes. Não assumir que uma troca altera automaticamente o outro.

## Limites da Ava

Ela orienta, não executa ações e não confirma valores, sincronizações ou
permissões sem evidência no contexto recebido.

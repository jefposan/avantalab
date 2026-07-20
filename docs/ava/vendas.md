# Ava — Manual do Vendas Mobile

<!-- ava-version: 1.6.0.87 -->

> Revisão 1.6.0.87: sem impacto operacional no Vendas Mobile; tratamentos de
> jornada e emissão do AEJ pertencem ao Controle de Ponto na Gestão Web.

## Escopo e navegação

Este manual vale para a Ava aberta em `/mobile/vendas`. A Ava deve resolver a
dúvida dentro do Vendas sempre que a função existir ali.

- A sala inicial possui Dashboard, Clientes, Produtos, Pedidos, Pagamentos,
  Agenda, Novidades, Divulgação e Informações.
- O rodapé de navegação permanece fixo na borda inferior da tela durante a
  rolagem e não se desloca ao entrar em Configurações ou trocar de página.
- O menu inferior tem Configurações, dois atalhos configuráveis, **+ Novo
  lançamento** e Início. Os atalhos são configurados em **Configurações >
  Organizar atalhos**; o lápis da sala muda a ordem dos cards. Enquanto a
  organização está ativa, a instrução **Clique no botão e arraste para a nova
  posição** aparece ao lado do lápis.
- Para gestores habilitados, a primeira tela após o login permite escolher Gestão
  ou Vendas antes de carregar os dados. Depois da escolha aparece **Preparando acesso**.
- Gestores podem usar **Ir para Gestão** no canto direito do header fixo da sala
  de botões ou adicionar **Ir para Gestão** a um atalho configurável.
  Ao tocar, o Vendas lista todos os perfis ativos da Gestão vinculados à conta;
  depois de selecionar um perfil, a troca exige confirmação. O aviso de
  aniversário permanece ao lado do botão quando ambos estão visíveis.
- Cada login possui uma única conta operacional no Vendas. Instalações e
  permissões em perfis da Gestão apenas autorizam a troca entre os sistemas e não
  criam contas adicionais ou um seletor de perfis dentro do Vendas.
- O destino financeiro só pode ser definido ou alterado em **Configurações >
  Integração com Gestão**.
- A sessão e o perfil/empresa são preservados na troca. Usuários sem permissão
  de gestor não recebem o atalho de retorno à Gestão.

## Clientes

- Ao salvar ou editar cliente, pedido ou pagamento, o Vendas confirma a gravação
  no servidor e atualiza imediatamente o cache local. Uma atualização iniciada
  antes da alteração não pode substituir o dado mais novo.
- Se a internet cair durante a gravação, a alteração fica protegida no aparelho
  e é reenviada automaticamente sem criar duplicidade. O app informa claramente
  quando ainda aguarda confirmação; **salvo** significa confirmação do servidor.
- No cabeçalho de **Clientes**, o campo de pesquisa fica à esquerda, **Ordem**
  aparece em seguida e **Buscar** ocupa o canto direito. Ao entrar novamente em
  **Clientes**, a pesquisa anterior é limpa e a lista completa volta a ser exibida.
- Ao trocar de página, a pesquisa da tela anterior é limpa. Um texto pesquisado
  em **Clientes**, por exemplo, não aparece em **Pagamentos** nem em outra área.
- **Clientes > Novo cliente** cria a ficha. Nome é obrigatório; celular e endereço
  são recomendados para ligação/WhatsApp e mapas.
- Quando existe endereço, toda a linha destacada no card abre a escolha entre
  Google Maps, Mapas Apple e Waze. Sem endereço, a linha fica inativa e orienta
  o cadastro antes de usar os mapas. Cidade, estado ou CEP sem logradouro não
  ativam o clique.
- A ficha oferece pedido, pagamento, agendamento e **Ver detalhes**. Nesta área,
  Resumo, Consignado, Pedidos e Pagamentos mostram os históricos.
- Na lista, o card que chega ao centro útil da tela recebe destaque e somente os
  vizinhos imediatamente acima e abaixo ficam desfocados. A rolagem é livre e nenhum
  card move ou encaixa a página automaticamente.
- Pedidos, consignados e pagamentos exibem 10 registros por vez. O botão
  **Carregar mais** acrescenta o próximo lote de até 10 registros sem perder a
  posição da rolagem, até chegar ao fim do histórico.
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
- Pedido e itens são salvos na mesma transação; se alguma parte falhar, o pedido
  anterior permanece intacto.
- Novo pedido abre pelo cliente ou por **Pedidos > Novo pedido**. Há Venda e
  Consignado, itens bonificados, desconto por valor/percentual e comprovante.
- Ao iniciar um pedido ou pagamento sem cliente predefinido, o foco abre na busca
  de cliente. A lista mostra somente os nomes, em fonte maior; a pesquisa ainda
  pode localizar pelo nome, telefone ou e-mail.
- Ao tocar em **Pagamento** no card de um cliente, o formulário permanece fixo
  enquanto o teclado numérico abre no mesmo toque e o campo **Valor pago** recebe
  um único foco automático.
- No campo **Produto**, digite nome, código, marca ou categoria para filtrar
  imediatamente as opções; toque no resultado para selecionar e preencher o preço.
- Ao cancelar ou fechar um novo pedido ou pagamento, o Vendas mantém a página e
  a posição anteriores, sem reconstruir ou mover a tela.
- Consignado não é venda nem recebimento até sua conversão em pedido. Ao abrir
  um consignado, o card mostra somente produtos e quantidades, com rolagem apenas
  nessa lista. Cabeçalho, total e ações permanecem fixos.
- O botão **Gerar pedido** fica disponível enquanto existir qualquer quantidade consignada e abre outro card com todos os itens disponíveis. Use **+** e
  **−** para informar a quantidade vendida, limitada ao saldo consignado, e
  confirme. O novo pedido entra no histórico da cliente e as quantidades são
  abatidas do consignado. Conversões parciais mantêm o consignado disponível para novos pedidos até que todos os produtos acabem.
- Ao editar um pedido, **+** e **−** atualizam a quantidade sem mover a lista,
  mantendo o produto tocado em foco.
- Pagamentos registram valor, desconto, data e forma. Edição/exclusão recalcula
  saldos e relatórios. Comprovantes podem ser reabertos, editados ou excluídos no
  histórico do cliente.
- Ao concluir um pagamento, fechar o comprovante retorna a **Pagamentos** quando
  o lançamento começou nessa tela; se começou na ficha da cliente, retorna a
  **Clientes**.
- Assim que um pedido ou pagamento é confirmado no servidor, o Dashboard é
  recalculado com a mesma revisão salva no cache local. Totais, recebimentos,
  ranking e indicadores do período já incluem o lançamento ao abrir o Dashboard.
- Os comprovantes priorizam leitura: título, cliente, itens, valores e saldo
  final usam fonte ampliada. No Dashboard, a tabela **Top 10 Clientes** também
  usa fonte maior para facilitar a conferência.
- A imagem compartilhada de pedido ou pagamento usa cabeçalho com empresa,
  cliente e data; não leva os botões da tela. Ela separa saldo anterior, valor
  do lançamento e saldo atual, deixando os dois últimos em faixas maiores para
  leitura imediata. O nome da empresa fica centralizado, e a lista aparece como
  **Detalhes do pedido** ou **Detalhes do pagamento**. As pílulas de pedido são
  azuis e as de pagamento verdes; cliente, data e o texto da pílula usam fonte
  ampliada.
- Ao confirmar um pagamento, o botão permanece bloqueado durante o envio. Antes
  de liberar o comprovante, o Vendas relê no servidor os pedidos e pagamentos da
  cliente e atualiza o saldo; caches financeiros de versões anteriores são
  descartados automaticamente.
- Clientes, pedidos e pagamentos são carregados em todas as páginas do servidor.
  O saldo nunca deve ser calculado com apenas os primeiros 1.000 registros do
  histórico da conta.
- Se o lançamento ou a conferência financeira falhar, o formulário permanece
  aberto e nenhum comprovante é exibido ou gerado.
- Os campos de data em pedidos e pagamentos apresentam rótulo centralizado e a
  data em destaque, sem horário; toque na data para abrir o calendário.

## Agenda, conteúdo e configurações

- Agenda cria lembretes de visita, entrega e recebimento e permite mudar datas.
- **Gestor Master**, **Administrador** e **Operador Completo** podem criar,
  editar e excluir novidades, pastas, subpastas, imagens e vídeos em
  Divulgação, desde que o módulo Vendas Mobile esteja ativo no perfil.
  Operador Completo não instala módulos nem administra acessos de usuários.
- Novidades vêm da empresa comercial vinculada. Divulgação navega por
  pastas/subpastas e abre fotos/vídeos para visualização e compartilhamento.
- Configurações reúne conta, celular/SMS, senha, aparência, metas, catálogo,
  estoque, vínculos comerciais, destino financeiro, PWA, backup e reset.
- Vínculo comercial (catálogo/divulgação/novidades) e destino financeiro são
  independentes. Não assumir que uma troca altera automaticamente o outro.

## Limites da Ava

Ela orienta, não executa ações e não confirma valores, sincronizações ou
permissões sem evidência no contexto recebido.

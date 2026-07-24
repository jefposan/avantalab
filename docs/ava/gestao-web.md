# Ava — Manual da Gestão Web

<!-- ava-version: 1.6.0.84.106 -->

> Revisão 1.6.0.84.106: estabilização visual da landing e restauração das
> larguras originais dos popups; sem mudança nos fluxos operacionais.

> Revisão 1.6.0.84.105: refinamento responsivo da landing pública; sem impacto
> operacional na Gestão Web.

> Revisão 1.6.0.84.104: o Importador mantém a mesma conferência humana e
> matemática, usando uma análise econômica por padrão e uma leitura reforçada
> somente quando a primeira não confere.

> Revisão 1.6.0.84.103: compatibilidade visual e funcional entre Safari no
> iPhone e Chrome no Android, com viewport dinâmico, áreas seguras, modais
> roláveis e campos sem zoom automático; sem mudança nos fluxos operacionais.

> Revisão 1.6.0.84.102: reorganização da Assinatura na Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.101: suspensão reversível do AvantaVendas no Premium
> Pessoal; sem mudança operacional adicional na Gestão Web, que já exige
> assinatura para perfis Pessoais.

> Revisão 1.6.0.84.100: revisão das permissões Premium na Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.99: removida a página provisória `/recebimentos`; o módulo
> integrado à Gestão e o PWA `/recebimentos/colaborador` permanecem disponíveis.
> As ações do cadastro foram compactadas e alinhadas, sem mudança operacional.

> Revisão 1.6.0.84.98: todos os campos de senha de Recebimentos Presenciais
> possuem botão acessível para exibir ou ocultar o conteúdo.

> Revisão 1.6.0.84.97: Recebimentos Presenciais carrega todos os lotes de
> lançamentos; bases com mais de mil registros não ocultam vencimentos próximos,
> atrasos, conferências ou resultados. As recorrências futuras ficam limitadas
> aos próximos 12 meses.

> Revisão 1.6.0.84.96: no login do colaborador de Recebimentos Presenciais, o
> botão com ícone de olho permite exibir ou ocultar a senha digitada.

> Revisão 1.6.0.84.95: distribuição iOS limitada a iPhone nesta fase; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.94: troca entre os PWAs preservada em modo aplicativo; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.93: rótulo estável do botão de ordem no AvantaVendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.92: identificação persistente do perfil na Gestão Mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.91: refinamento da navegação e dos planos na landing mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.90: ajuste visual do cabeçalho da landing em telas mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.89: consolidação técnica do AvantaVendas em uma única fonte;
> sem mudança operacional na Gestão Web.

> Revisão 1.6.0.84.88: o subdomínio oficial de Vendas passa a abrir a nova
> estrutura do AvantaVendas; sem mudança operacional na Gestão Web.

> Revisão 1.6.0.84.87: rota paralela de validação do AvantaVendas; sem impacto
> operacional na Gestão Web.

> Revisão 1.6.0.84.86: correção de distribuição no Vendas Mobile; sem impacto
> operacional na Gestão Web.

> Revisão 1.6.0.84.85: entrega de cache do PWA e ajuste de busca no mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.84: ajustes de navegação e filtros nos PWAs móveis; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.83: conta de revisão não exibe o cadastro detalhado do perfil; sem impacto operacional para os demais usuários.
> sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.75: novo nome e ícone de instalação do PWA de Ponto; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.74: reforço do nome de instalação do PWA de Vendas no
> Safari/iPhone; sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.73: novo nome e ícone de instalação do PWA de Vendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.72: locais agrupadores não possuem status ou ação de
> ativar/desativar, pois somente organizam clientes abaixo.

> Revisão 1.6.0.84.71: novos clientes não possuem frequência de recebimento
> pré-selecionada; escolha o período e configure o dia antes de salvar.

> Revisão 1.6.0.84.70: no cadastro de clientes em Recebimentos Presenciais,
> somente nome, valor contratado e vencimento são obrigatórios.

> Revisão 1.6.0.84.69: em Recebimentos Presenciais, **Cliente direto** possui
> contrato e cobrança próprios; **Local agrupador** (shopping, galeria ou
> condomínio) apenas organiza clientes abaixo e não gera cobrança própria.

> Revisão 1.6.0.84.68: refinamento visual dos seletores de acesso mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.67: alinhamento visual do card de acesso do Vendas Mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.66: padronização dimensional dos logins mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.65: compactação visual dos cards de login mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.64: redução visual da marca e do card de acesso mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.63: ajuste visual dos cards de acesso mobile para 30% de
> transparência; sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.59: identificação visual nas telas de acesso dos PWAs; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.58: retorno de saída entre os PWAs Gestão e Vendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.57: a rota da Gestão Mobile abre sempre a própria Gestão;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.56: o Vendas Mobile abre diretamente no próprio aplicativo;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.55: campos adicionais no cadastro do Vendas Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.54: ajuste da permanência de sessão nos PWAs móveis; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.53: as ações e os avisos da conferência de Importação
> assistida foram aprimorados visualmente; sem mudança operacional.

> Revisão 1.6.0.84.52: ajuste da entrada do aplicativo Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.51: durante a importação, o sistema tenta renovar a sessão
> antes de interromper o processamento. Se ela realmente expirar, abre o login
> com uma mensagem explicativa, sem retornar à landing page.

> Revisão 1.6.0.84.50: o seletor de perfil recebeu ajuste visual nas cores e
> ações; sem mudança operacional no acesso.

> Revisão 1.6.0.84.49: rascunhos do Importador são salvos no servidor do perfil
> e podem continuar em outro dispositivo; um rascunho local anterior é migrado na abertura.

> Revisão 1.6.0.84.48: padronização visual das cenas de acesso do Vendas; sem
> impacto operacional na Gestão Web.
>
> Revisão 1.6.0.84.47: o Importador pode sugerir o tipo pelo histórico do mesmo
> perfil. A sugestão é sempre editável antes da confirmação.

> Revisão 1.6.0.84.46: alterações no Importador salvam o rascunho automaticamente; sem
> impacto operacional na Gestão Web.
>
> Revisão 1.6.0.84.44: descarte de rascunho no Importador usa a confirmação
> confirmação, sem criar lançamentos; sem impacto nos demais ambientes.

## Escopo

Este manual vale para a Ava aberta na Gestão Web. Ela deve orientar caminhos
visíveis na interface e nunca confundir esta versão com `/mobile`, `/mobile/vendas`
ou `/ponto`. O perfil Pessoal gratuito não usa a Gestão Web: oriente o uso do
Gestão Mobile ou a assinatura/cupom do Premium Pessoal.

## Navegação e perfis

- O dashboard é a página inicial. Pelo lápis de organização, os cards podem ser
  exibidos, ocultados, movidos, expandidos, reduzidos ou removidos da visão.
- No perfil Pessoal, **Caixinha** começa visível. No perfil Empresa, **Reserva financeira** começa oculta e pode ser exibida em Organizar blocos; ambas registram aportes como despesa.
- **Menu** concentra perfil, usuários, aparência, despesas/categorias,
  despesas fixas, backup/restauração e módulos. No Web, ele abre em uma gaveta
  lateral esquerda; Visual e Configurações expandem seus próprios subbotões.
- **Sobre** apresenta as principais novidades em marcos consolidados, sem listar
  ajustes exclusivamente técnicos.
- Um login pode ter perfis Empresa e Pessoal. As permissões dependem do vínculo:
  Gestor Master, Administrador e operadores não enxergam necessariamente as
  mesmas ações.

## Financeiro

- O sistema registra receitas, despesas, despesas futuras, parcelamentos e
  despesas fixas.
- No novo lançamento, o botão **Arquivo** aceita imagens de nota e também PDF,
  CSV, TXT, XLS e XLSX. Imagens continuam preenchendo o lançamento único como
  nota; extratos, faturas e planilhas mostram uma barra de progresso e abrem a
  conferência do Importador em popup. Quando a soma não confere, o usuário pode
  cancelar ou refazer a análise; se faltar tipo de despesa, o sistema informa e
  leva o foco até a primeira linha pendente.
- Na prévia `/importador-despesas`, o usuário envia CSV, TXT, XLS, XLSX ou PDF.
  Para PDF, a IA estruturada analisa visualmente todas as páginas e colunas e separa compras e saídas
  reais dos campos de limite, total, vencimento, pagamento mínimo, saldo,
  crédito, compras futuras, simulações e resumo. Em extrato, ficam somente
  saídas; em fatura, despesas e estornos/créditos aparecem em áreas separadas.
  O estorno só é preparado como receita quando o usuário o selecionar, e a
  lista não é liberada se despesas menos estornos divergirem do total do
  documento. Antes de enviar, o usuário pode selecionar o tipo do documento para
  substituir a detecção automática. O usuário escolhe o perfil de destino,
  confere cada linha, seleciona um tipo de despesa já cadastrado e pode salvar o
  rascunho para continuar depois no mesmo navegador. Quando houver correspondência
  consistente no histórico do mesmo perfil, o tipo pode aparecer sugerido, mas é
  sempre editável. Ao confirmar, data, tipo,
  descrição e valor são gravados em Lançamentos; uma nova tentativa do mesmo
  lote não duplica os itens. O PDF original não é armazenado no AvantaLab nesta
  etapa. Estornos ficam separados e ainda não são lançados como receitas.
- Despesas futuras ficam marcadas como **Previsto** até confirmação. Alterar a
  data preserva essa natureza.
- Parcelamentos criam os lançamentos dos meses correspondentes.
- Para alterar toda uma recorrência, orientar em **Menu > Despesas fixas**;
  editar uma linha mensal afeta somente aquele mês.
- Gráficos e relatórios obedecem ao perfil e período selecionados. A análise da
  Ava só pode usar números presentes no contexto do usuário.

## Agenda, avisos e módulos

- Agenda reúne lembretes e compromissos financeiros. Lembretes podem repetir.
- O sino reúne avisos. Push depende da permissão e infraestrutura; a Ava não
  garante entrega sem confirmação.
- Funcionários do Controle de Ponto usam `/ponto`; configurações e relatórios
  ficam para gestores/autorizados. Se o cadastro do funcionário ficar sem dias
  de trabalho marcados, a escala é variável: ele pode registrar ponto em qualquer
  dia, mas faltas, atrasos e lembretes automáticos dependem de uma escala fixa
  programada. Para encerrar o acesso, desmarque **Funcionário ativo** e salve:
  login e novas marcações ficam bloqueados, mas relatórios e histórico são
  preservados. A reativação usa o mesmo controle. Na administração do ponto,
  a aba **Auditoria** mostra as marcações e as alterações de acesso registradas.
  O funcionário recebe um comprovante imediatamente após cada marcação e pode
  imprimi-lo; o código mostrado identifica o registro salvo no banco.
  Em **Conformidade REP-P**, gestores consultam e baixam os documentos AFD já
  emitidos para a própria empresa; **Gerar novo AFD** cria outra emissão do
  período e preserva todas as anteriores. Em homologação, os arquivos não têm
  validade legal.
  O botão **Disponibilizar manual** prepara o Manual do Sistema REP-P em PDF
  versionado e o inclui no mesmo histórico de documentos da empresa.
- **Recebimentos Presenciais** é instalado em **Menu > Módulos**. Depois de
  instalado, Gestor Master e Administrador usam **Menu > Recebimentos** para
  cadastrar empresas atendidas, pontos de cobrança e colaboradores, além de
  conferir, devolver, registrar divergências ou estornar recebimentos.
- Em **Empresas**, use **Pesquisar empresas e locais…** ou **+ Nova empresa**.
  No início do cadastro, escolha **Cliente direto** ou **Local agrupador**.
  Cliente direto possui responsável, contato, e-mail, endereço, valor contratado
  e vencimento próprios, sem clientes abaixo. Para salvar um cliente, somente
  nome, valor contratado e vencimento são obrigatórios; os demais dados são
  opcionais. Local agrupador é um shopping,
  galeria ou condomínio: registra somente nome e endereço, não gera cobrança e
  permite **+ Novo cliente no local**. Em **Colaboradores**, use **+ Novo colaborador**.
- Ao cadastrar ou editar um cliente — direto ou dentro de um local — escolha em **Recebimento** a frequência
  semanal, quinzenal, mensal, trimestral, semestral ou anual. Em seguida configure
  os dias aplicáveis: dias da semana; dia-base com intervalo rigoroso de 15 dias;
  dia mensal; ou mês inicial e dia para os ciclos trimestral, semestral e anual.
  Cada cliente mantém somente uma dessas regras. Ao trocar a frequência, o
  sistema substitui as previsões automáticas futuras ainda não recebidas e
  preserva atrasos, pagamentos e histórico anteriores.
  A primeira cobrança nunca antecede o cadastro; daí em diante o sistema cria as
  parcelas previstas e marca automaticamente como **Em atraso** as não recebidas
  depois do vencimento. A aba **Inadimplentes** mostra somente cobranças já
  vencidas com situação **Em atraso**; uma cobrança **Previsto** nunca aparece ali.
  A aba **Próximo a vencer** mostra somente a cobrança futura mais próxima de
  cada empresa atendida, sem listar os demais vencimentos futuros.
- No cadastro do cliente ou local, informe primeiro o **CEP**. Rua, bairro, cidade e
  UF são preenchidos para conferência; complete número e complemento antes de salvar.
- O colaborador entra em `/recebimentos/colaborador` com CPF e senha fornecidos
  pelo gestor. Esse acesso é independente do Controle de Ponto e do login da
  Gestão. Ao lançar um pagamento, ele vê todos os vencidos e somente o próximo
  vencimento futuro. Enquanto essa fila tiver cobrança programada, o recebimento
  deve ser vinculado a um desses itens e o botão de confirmação permanece
  desabilitado até selecionar empresa, título e informar um valor válido. O valor
  recebido usa moeda brasileira com duas casas decimais; a seleção avulsa aparece
  apenas quando a fila está vazia. No resumo do colaborador, **Recebido hoje**
  considera somente o dia atual, enquanto **Aguardando** mantém o total acumulado
  até a conferência de todos os lançamentos pendentes. O header do PWA exibe como título principal a empresa gestora
  que criou o acesso e, abaixo, **Recebimentos Presenciais**. Remover o módulo
  bloqueia novas entradas sem apagar os dados.
- As cobranças **Previsto** alimentam o total calculado dos próximos meses, mas
  não aparecem individualmente na listagem detalhada. Ao selecionar um mês
  futuro, **Visão geral** e **Resultados** mostram somente o total previsto.
- **Empresas**, **Colaboradores**, **Conferência**, **Próximo a vencer** e
  **Inadimplentes** não possuem seletor de mês. **Conferência** mostra todos os
  recebimentos aguardando confirmação, **Inadimplentes** mostra todos os atrasos
  abertos e **Próximo a vencer** reúne as cobranças previstas para os próximos
  30 dias. As duas últimas tabelas não repetem uma coluna de situação.
- Fora do modo instalado, a tela de login mostra **Instalar**. O botão abre a
  instalação nativa quando disponível; no iPhone ou em navegador sem prompt,
  orienta **Compartilhar > Adicionar à Tela de Início**.
- O fundo da tela de login mantém a marca AvantaLab. Após a autenticação, o PWA
  preserva o mesmo padrão visual usando a variante sem o logotipo.
- Ao instalar o módulo, a integração com **Receitas** fica ativa. Cada confirmação,
  alteração ou estorno atualiza imediatamente a receita do mesmo mês, incluindo
  valor e data, sem depender de atualização manual. Na Visão geral, o card
  **Total recebido e confirmado** permite usar **Atualizar títulos** para alterar
  o nome da entrada e da etiqueta em todos os meses, com reflexo imediato na
  tela de Receitas aberta. **Retirar das receitas**
  remove somente os lançamentos vinculados e interrompe a sincronização; os
  recebimentos permanecem preservados e **Adicionar às receitas** pode reativá-la.
- Os quatro cards de valores da Visão geral dividem uma linha horizontal. Ao trocar o
  mês, o aviso **Carregando valores…** usa uma única linha reservada e não altera a
  altura do card **Total recebido e confirmado**. O módulo acompanha o modo claro ou escuro do Gestão.
- Operador Completo e Operador Simples não veem nem administram o módulo,
  mesmo quando ele está instalado no perfil.
- Vendas Mobile é módulo complementar: catálogo, divulgação e novidades têm
  regras próprias e resultados podem ser enviados ao Gestão conforme o destino
  financeiro do vendedor.
- Com o módulo instalado, Gestor Master, Administrador e Operador Completo
  podem acessar o botão **Vendas Mobile** no Web. Somente Gestor Master e
  Administrador instalam ou removem o módulo.

## Limites da Ava

Ela orienta, não executa operações, não vê a tela atual e não confirma gravação,
sincronização ou permissão sem dados explícitos.

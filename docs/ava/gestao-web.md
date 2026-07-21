# Ava — Manual da Gestão Web

<!-- ava-version: 1.6.0.84.07 -->

> Revisão 1.6.0.84.07: receitas automáticas do Vendas são recalculadas pela
> competência mensal completa, inclusive quando houver recebimento já gravado
> com data futura dentro daquele mês.

## Escopo

Este manual vale para a Ava aberta na Gestão Web. Ela deve orientar caminhos
visíveis na interface e nunca confundir esta versão com `/mobile`, `/mobile/vendas`
ou `/ponto`.

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
- Em **Empresas**, use **Pesquisar empresas…** ou **+ Nova empresa**. Em
  **Colaboradores**, use **+ Novo colaborador**.
- Ao cadastrar ou editar uma subempresa, escolha em **Recebimento** a frequência
  semanal, quinzenal, mensal, trimestral, semestral ou anual. Em seguida configure
  os dias aplicáveis: dias da semana; dia-base com intervalo rigoroso de 15 dias;
  dia mensal; ou mês inicial e dia para os ciclos trimestral, semestral e anual.
  Cada subempresa mantém somente uma dessas regras. Ao trocar a frequência, o
  sistema substitui as previsões automáticas futuras ainda não recebidas e
  preserva atrasos, pagamentos e histórico anteriores.
  A primeira cobrança nunca antecede o cadastro; daí em diante o sistema cria as
  parcelas previstas e marca automaticamente como **Em atraso** as não recebidas
  depois do vencimento. A aba **Inadimplentes** mostra somente cobranças já
  vencidas com situação **Em atraso**; uma cobrança **Previsto** nunca aparece ali.
  A aba **Próximo a vencer** mostra somente a cobrança futura mais próxima de
  cada empresa atendida, sem listar os demais vencimentos futuros.
- No cadastro da subempresa, informe primeiro o **CEP**. Rua, bairro, cidade e
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

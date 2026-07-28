# Ava — Manual da Gestão Web

<!-- ava-version: 1.6.1.27 -->

> Revisão 1.6.1.27: na aba **Conferência** de Recebimentos Presenciais, Valor
> contratado, Valor declarado, Diferença, Forma de pagamento e Comprovante
> aparecem em uma única faixa no desktop. Em áreas estreitas, o resumo se
> reorganiza sem esconder observações ou ações.

> Revisão 1.6.1.26: em Recebimentos Presenciais, a listagem se reorganiza de
> acordo com a largura disponível, usa datas com ano abreviado e apresenta a
> coluna **Valor**. Gestor e Administrador podem estornar qualquer recebimento
> efetivamente lançado, mesmo antes da conferência; o estorno exige motivo e
> devolve a cobrança para **Previsto** ou **Em atraso**, conforme o vencimento.

> Revisão 1.6.1.25: em **Usuários e Permissões**, excluir apaga definitivamente
> uma conta interna somente quando não existe outro vínculo, perfil ou histórico;
> caso contrário, remove apenas o acesso atual e mantém a conta pesquisável por
> e-mail ou login em **Adicionar usuário existente**.

> Revisão 1.6.1.24: no card **Saldo do mês**, as linhas **Inicial**, **Final** e
> **Previsto** explicam o cálculo de cada valor em um tooltip que acompanha o
> cursor e também pode ser acessado por foco de teclado.

> Revisão 1.6.1.23: padronização monetária aplicada somente à edição de despesas
> fixas na Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.22: correção do salvamento de despesas fixas aplicada somente à
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.21: centralização do campo Dia aplicada somente à edição de
> lançamentos na Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.20: o card **Lançamentos a confirmar** mostra despesas e
> receitas previstas somente durante a data programada. Ao terminar o dia, o
> aviso desaparece, mas o lançamento continua previsto na Agenda e nos
> controles financeiros.

> Revisão 1.6.1.19: posicionamento automático do cursor aplicado somente à
> Gestão Mobile e ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.18: correção visual da curvatura do card Editar usuário. No
> login, o campo de acesso informa **E-mail ou login** e aceita qualquer um dos
> dois identificadores.

> Revisão 1.6.1.17: ao criar ou editar um usuário, e-mail e login são
> verificados no servidor antes da gravação. Se algum campo precisar de
> correção, o formulário mantém os demais valores e posiciona o cursor no
> campo indicado após o aviso. O acesso aceita e-mail ou login.

> Revisão 1.6.1.16: em Usuários e Permissões, criar e editar exigem nome
> completo, e-mail real, login e tipo de usuário. A senha é obrigatória somente
> na criação. O acesso aceita e-mail ou login; uma conta já existente deve ser
> vinculada por **Adicionar usuário existente**.

> Revisão 1.6.1.15: pesquisa de CNPJ alinhada no formulário próprio da Gestão
> Mobile; sem mudança operacional adicional na Gestão Web.

> Revisão 1.6.1.14: a página principal e o service worker da Gestão Web deixam
> de reutilizar o formulário de versões anteriores após uma atualização; sem
> mudança no preenchimento do cadastro.

> Revisão 1.6.1.13: no cadastro empresarial, CNPJ e **Buscar** ficam lado a
> lado; abaixo aparecem Razão Social, Nome Fantasia e Tipo de Empresa. O campo
> Responsável fica em Contato, antes de Site e Instagram, e não exige nome
> completo.

> Revisão 1.6.1.12: na etapa obrigatória de cadastro empresarial, a ação
> **Pesquisar CNPJ e preencher cadastro** aparece abaixo do documento e prepara
> os dados compatíveis para confirmação. Em Editar perfil, a pesquisa continua
> compacta ao lado do CNPJ.

> Revisão 1.6.1.11: cadastros de pessoas exibem Nome completo e preservam os
> campos quando ocorre erro. Usuários e Permissões, Controle de Ponto e
> Recebimentos mantêm rascunhos temporários dos dados não sensíveis; senhas,
> confirmações e códigos nunca são gravados no navegador. Em Recebimentos, o
> formulário só é limpo após confirmação do servidor.

> Revisão 1.6.1.10: a rota `/consulta` disponibiliza a Central de Consultas para
> pesquisa cadastral de CNPJ. No cadastro empresarial, inclusive na etapa
> obrigatória, **Pesquisar CNPJ** prepara os campos compatíveis para confirmação,
> preservando conteúdo existente por padrão. No celular, a ação ocupa uma linha
> própria; em telas maiores, permanece ao lado do documento.

> Revisão 1.6.1.09: conclusão e recuperação do acesso na Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.1.08: o card de login da Gestão Web volta a ficar alinhado à
> esquerda, na mesma posição do card Criar cadastro, inclusive em janelas web
> estreitas usadas com mouse ou trackpad. O início vertical dos dois cards
> também foi igualado; sem mudança no fluxo de autenticação.

> Revisão 1.6.1.07: as subpastas descendentes da pasta selecionada em Conteúdo
> do Vendas > Divulgação recebem uma variação do mesmo destaque visual para
> manter o ramo ativo identificável.

> Revisão 1.6.1.06: no visualizador da Divulgação, arrastar horizontalmente ou
> usar as setas laterais alterna entre o material anterior e o próximo da pasta.

> Revisão 1.6.1.05: tocar em uma imagem ou vídeo dentro da pasta de Divulgação
> abre o material original em um visualizador amplo; vídeos exibem seus
> controles de reprodução.

> Revisão 1.6.1.04: ao confirmar os arquivos escolhidos, a Divulgação mostra
> imediatamente o card Preparando arquivos para envio e mantém o percentual
> visível até concluir ou cancelar.

> Revisão 1.6.1.03: o resumo do envio de materiais informa somente quantos
> arquivos foram enviados e quantos foram ignorados por duplicidade.

> Revisão 1.6.1.02: as pastas de Conteúdo do Vendas > Divulgação mostram a
> quantidade total de materiais armazenados nelas e em todas as subpastas.

> Revisão 1.6.1.01: ação de envio de materiais reposicionada na Gestão Mobile;
> a Gestão Web mantém o botão Adicionar no painel da pasta, sem mudança
> operacional.

> Revisão 1.6.1: resultados do AvantaVendas são vinculados manualmente a um
> perfil financeiro. Ao trocar ou desvincular, os lançamentos anteriores podem
> ser apagados ou mantidos sem proteção para edição e exclusão; clientes,
> pedidos, pagamentos e o histórico operacional permanecem no Vendas.

> Revisão 1.6.0.84.148: ao atualizar a página, a Gestão valida a sessão no
> servidor. Sessão inválida ou usuário excluído retorna ao login e nunca abre o
> cadastro de perfil financeiro.

> Revisão 1.6.0.84.147: cadastros e edições de pessoas exigem nome e sobrenome
> na conta, no perfil pessoal, em Usuários e Permissões, Controle de Ponto e
> Recebimentos Presenciais.

> Revisão 1.6.0.84.146: em Editar dados cadastrais, os dados gerais foram
> reorganizados e o CPF/CNPJ passou a receber máscara e validação no campo.

> Revisão 1.6.0.84.145: o card `Usuários e Permissões` ganhou mais largura e
> ampliou o campo de senha inicial; sem mudança no fluxo de cadastro.

> Revisão 1.6.0.84.144: formatação dos campos de vínculo comercial no Vendas
> Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.127: linhas parcialmente preenchidas no modelo Excel
> permanecem visíveis na revisão. Data, tipo e valor são obrigatórios,
> editáveis e bloqueiam a confirmação quando inválidos; somente linhas
> completamente vazias são ignoradas.

> Revisão 1.6.0.84.126: o **Modelo Excel** preserva a formatação oficial e é
> gerado com uma lista suspensa contendo os tipos de despesa cadastrados no
> perfil ativo. O importador localiza os cabeçalhos mesmo quando há instruções
> acima da tabela.

> Revisão 1.6.0.84.125: ao lado de **Carregar arquivo**, o lançamento de
> despesas oferece **Modelo Excel**. A primeira aba recebe Data, Tipo de
> despesa, Descrição e Valor; a segunda traz orientações e exemplos. Depois do
> upload, o usuário ainda revisa e confirma todas as linhas antes da gravação.

> Revisão 1.6.0.84.124: **Visualizar comprovante** em Recebimentos Presenciais
> abre o card acima do popup administrativo, mostra **Carregando imagem…** e
> depois apresenta a imagem privada ou uma mensagem de erro.

> Revisão 1.6.0.84.123: a busca de Perfis do Avanta Admin reorganiza campo,
> filtros, ordem, paginação e botão principal no mobile e tablet, sem cortes ou
> rolagem horizontal e sem alterar o desktop.

> Revisão 1.6.0.84.122: o console global em `/admin` pode ser instalado como o
> PWA independente **Avanta Admin**, com nome, ícone e escopo próprios. O app
> não substitui nem altera os PWAs da Gestão, AvantaVendas, Ponto ou
> Recebimentos.

> Revisão 1.6.0.84.121: no PWA de Recebimentos Presenciais, a forma de
> pagamento é obrigatória e o colaborador pode anexar uma imagem JPG, PNG ou
> WebP de até 6 MB. O comprovante fica privado e vinculado ao lançamento;
> Gestor Master e Administrador podem consultá-lo na Conferência e no histórico
> de Recebimentos, inclusive depois de baixa, devolução, divergência ou estorno.

> Revisão 1.6.0.84.120: persistência das preferências do AvantaVendas no
> servidor; sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.119: ações destrutivas da Administração e do gerenciador de
> conteúdos do Vendas usam a confirmação visual do sistema. Fechar, voltar ou
> pressionar Esc cancela a ação sem alterar dados.

> Revisão 1.6.0.84.118: tipos de despesa cadastrados ou renomeados entram
> imediatamente em ordem alfabética. Inclusões, edições e exclusões atualizam
> também a Gestão Mobile aberta no mesmo perfil.

> Revisão 1.6.0.84.117: padronização de uma confirmação na Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.116: ocultação de opções de pagamento durante cortesia na
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.115: detalhamento de assinatura na Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.114: padronização visual de um aviso da Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.113: estabilização do topo e do menu inferior no
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.112: estabilidade do teclado durante lançamentos na Gestão
> Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.111: novo ícone de instalação do PWA AvantaVendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.110: desconto concedido nos comprovantes do AvantaVendas;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.0.84.109: contraste dos itens bonificados no AvantaVendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.0.84.108: restauração do comportamento visual anterior aos
> ajustes experimentais de compatibilidade Android; sem mudança operacional.

> Revisão 1.6.0.84.107: extratos e faturas em PDF aceitam até cinco páginas e
> três envios mensais por perfil. Tickets e notas pequenas por imagem não usam
> essa franquia. Após cada envio, o sistema informa quantos restam no mês. O
> Admin acompanha somente metadados de consumo, sem guardar o documento nem o
> conteúdo reconhecido.

> Revisão 1.6.0.84.104: o Importador mantém a mesma conferência humana e
> matemática, usando uma análise econômica por padrão e uma leitura reforçada
> somente quando a primeira não confere.

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
- Em **Usuários e Permissões**, um novo usuário exige nome completo, e-mail
  real, login, senha inicial e tipo. Na edição, os mesmos dados permanecem
  obrigatórios e apenas a nova senha é opcional. O usuário entra com e-mail ou
  login; se o e-mail já pertencer a uma conta, use **Adicionar usuário
  existente** para vinculá-la ao perfil. E-mail e login são conferidos no
  servidor antes de salvar; um erro mantém o preenchimento e leva o cursor ao
  campo que precisa de atenção.
- Ao excluir um usuário criado dentro do perfil, o login é apagado
  definitivamente somente se a conta não possuir outro perfil, vínculo ou
  histórico no sistema. Caso exista qualquer dependência, somente o acesso ao
  perfil atual é removido; a conta continua disponível em **Adicionar usuário
  existente** por e-mail ou login.
- Confirmações destrutivas da Administração e dos gerenciadores de conteúdo
  usam o card visual do sistema; fechar, voltar ou pressionar Esc cancela sem
  alterar dados.

## Financeiro

- O sistema registra receitas, despesas, despesas futuras, parcelamentos e
  despesas fixas.
- No novo lançamento, o botão **Arquivo** aceita imagens de nota e também PDF,
  CSV, TXT, XLS e XLSX. Imagens continuam preenchendo o lançamento único como
  nota; extratos, faturas e planilhas mostram uma barra de progresso e abrem a
  conferência do Importador em popup. Quando a soma não confere, o usuário pode
  cancelar ou refazer a análise; se faltar tipo de despesa, o sistema informa e
  leva o foco até a primeira linha pendente.
- Ao lado de **Carregar arquivo**, **Modelo Excel** baixa uma planilha pronta
  para preenchimento. A aba **Despesas** usa as colunas Data, Tipo de despesa,
  Descrição e Valor; a aba **Como preencher** contém instruções e exemplos que
  não entram na importação. **Tipo de despesa** é obrigatório e possui uma
  lista suspensa gerada com os tipos cadastrados no perfil ativo. O mesmo
  arquivo preenchido é reenviado em **Carregar arquivo** e sempre passa pela
  revisão antes de gravar. Linhas parcialmente preenchidas continuam na
  revisão; Data, Tipo de despesa e Valor devem ser corrigidos antes da
  confirmação. Somente linhas totalmente vazias são ignoradas.
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
- Em **Ajustes > Cadastrar Despesas**, novos tipos entram imediatamente em ordem
  alfabética nas listas e seletores. Alterações no catálogo são compartilhadas
  com a Gestão Mobile aberta no mesmo perfil.
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
  recebido usa moeda brasileira com duas casas decimais e divide a linha com a
  forma de pagamento obrigatória. O colaborador pode usar **Comprovante** para
  fotografar ou selecionar uma imagem JPG, PNG ou WebP de até 6 MB antes de
  confirmar; o anexo é opcional. A seleção avulsa aparece apenas quando a fila
  está vazia. No resumo do colaborador, **Recebido hoje**
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
  30 dias. As duas últimas tabelas não repetem uma coluna de situação. Em
  **Conferência** e **Recebimentos**, **Visualizar comprovante** abre por tempo
  limitado a imagem privada vinculada ao lançamento. A imagem continua
  disponível depois de confirmação, devolução, divergência ou estorno.
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

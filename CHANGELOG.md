# Changelog

## 1.6.0.57 - 2026-07-18

- Na Gestão Web, **Ajustes** passa a se chamar **Menu** e abre em uma gaveta
  lateral esquerda, com cabeçalho fixo, fechamento por clique fora ou inatividade
  e subbotões expansíveis no próprio fluxo.
- O destaque de **Módulos** e os demais botões coloridos do menu passam a usar
  degradê horizontal para reforçar a hierarquia visual.

## 1.6.0.56 - 2026-07-18

- Todos os rótulos de valor em Recebimentos passam a usar **Valor contratado**.
- **Atualizar títulos** passa a recarregar imediatamente a própria tela de
  Receitas, além de atualizar as entradas vinculadas e as demais sessões.

## 1.6.0.55 - 2026-07-18

- As tabelas **Próximo a vencer** e **Inadimplentes** deixam de repetir a
  coluna Situação e redistribuem as cinco informações restantes.
- O estado **Preparando acesso** do PWA de Recebimentos passa a usar o card de
  carregamento oficial do sistema.
- No lançamento do colaborador, a confirmação permanece desabilitada até haver
  empresa, título ou destino aplicável e valor válido; o valor recebido usa
  máscara monetária brasileira com duas casas decimais.
- **Aguardando** mantém o total acumulado de todos os recebimentos do colaborador
  ainda pendentes de confirmação, enquanto **Recebido hoje** permanece diário.
- O card **Total recebido e confirmado** deixa de exibir o indicador de valor
  sincronizado no canto superior direito.

## 1.6.0.54 - 2026-07-18

- A integração de **Recebimentos Presenciais** com **Receitas** passa a ser
  ativada com o módulo e sincroniza automaticamente valor e data de cada mês
  após confirmação, alteração ou estorno, sem atualização manual.
- O card **Total recebido e confirmado** agora separa **Atualizar títulos** de
  **Retirar das receitas**; a retirada preserva os recebimentos e exclui somente
  as receitas vinculadas, podendo a sincronização ser reativada depois.
- Cada subempresa passa a manter um único tipo de vencimento. Ao trocar a regra,
  previsões automáticas futuras e ainda não recebidas são substituídas, enquanto
  atrasos, pagamentos e histórico permanecem intactos.

## 1.6.0.53 - 2026-07-18

- Criada uma variante do fundo vertical padrão sem o logotipo AvantaLab,
  aplicada exclusivamente à área autenticada do PWA de Recebimentos.
- A tela de login preserva o fundo original com a marca; o cache offline do PWA
  foi atualizado para disponibilizar as duas versões.

## 1.6.0.52 - 2026-07-18

- O seletor de mês foi removido das abas **Empresas**, **Colaboradores**,
  **Conferência**, **Próximo a vencer** e **Inadimplentes**.
- **Conferência** agora reúne todos os recebimentos que aguardam confirmação,
  sem recorte mensal, e **Inadimplentes** reúne todos os atrasos abertos.
- **Próximo a vencer** passou a exibir todas as cobranças previstas entre hoje e
  os próximos 30 dias, em vez de somente a cobrança mais próxima por empresa.

## 1.6.0.51 - 2026-07-18

- No cabeçalho autenticado do PWA de Recebimentos, o nome da empresa gestora
  passa a ocupar o título principal; **Recebimentos Presenciais** aparece na
  linha secundária e a marca AvantaLab deixa de ser exibida nesse local.

## 1.6.0.50 - 2026-07-18

- Criada a aba **Próximo a vencer**, no mesmo padrão estrutural de
  **Inadimplentes**, exibindo somente a cobrança futura mais próxima de cada
  empresa atendida.
- A aba **Inadimplentes** permanece exclusiva para clientes realmente em atraso,
  sem misturar cobranças previstas.
- O header do acesso do colaborador foi ampliado e agora identifica a empresa
  gestora que criou seu vínculo, consultada pelo cadastro oficial do sistema.

## 1.6.0.49 - 2026-07-18

- No acesso do colaborador, a fila para lançamento de pagamentos agora exibe
  todos os vencidos e somente o próximo vencimento futuro.
- Enquanto houver cobrança programada disponível, o lançamento deve ser feito
  por essa fila; a seleção avulsa fica reservada à ausência de cobranças.
- A aba Inadimplentes agora considera a data atual, mostra somente cobranças
  realmente vencidas com situação Em atraso e calcula os dias sem antecipar o
  fim do mês selecionado.
- Lançamentos previstos continuam compondo os totais dos próximos meses, mas
  sua origem não aparece na listagem detalhada. Em meses futuros, Visão geral e
  Resultados exibem somente o total Previsto.
- O banco passa a normalizar cobranças abertas pela data local de São Paulo,
  impedindo que um vencimento futuro permaneça com situação Em atraso.

## 1.6.0.48 - 2026-07-18

- Edição e cadastro de empresas/subempresas passaram a compartilhar a mesma
  área fixa, dimensões e espaçamentos; a empresa-pai permanece no cabeçalho externo.

## 1.6.0.47 - 2026-07-18

- O campo legado `dia_vencimento` deixou de bloquear frequências recorrentes;
  o dia-base continua gravado quando aplicável.

## 1.6.0.46 - 2026-07-18

- Validações de Empresa e Subempresa agora abrem o aviso padrão em popup. Para
  subempresa, endereço é opcional; nome, responsável, valor e vencimento são obrigatórios.

## 1.6.0.45 - 2026-07-18

- O campo CEP agora consulta e preenche o endereço também ao pressionar Enter.

## 1.6.0.44 - 2026-07-18

- O indicador de salvamento foi alinhado ao canto direito das abas; botões de
  sucesso e destrutivos receberam tratamento próprio no modo escuro.

## 1.6.0.43 - 2026-07-18

- O indicador de salvamento passou para o fim da linha de abas, após Resultados.

## 1.6.0.42 - 2026-07-18

- Empresas inativas não exibem mais a ação de criar nova subempresa.

## 1.6.0.41 - 2026-07-18

- No cadastro de subempresa, o nome da empresa-pai ganhou maior destaque no
  cabeçalho de Empresas e subempresas.

## 1.6.0.40 - 2026-07-18

- Os controles de dias semanal, quinzenal e mensal ganharam mais área de toque;
  o bloco de vencimento foi compactado para manter as ações do cadastro visíveis.

## 1.6.0.39 - 2026-07-18

- A faixa interna acima das abas administrativas foi compactada para ampliar a
  área útil do conteúdo e evitar colisão visual do cadastro com sua borda.

## 1.6.0.38 - 2026-07-18

- Os quadros trimestral, semestral e anual foram alargados para exibir os 31
  dias em uma única linha no web, com respiro inferior no cadastro.

## 1.6.0.37 - 2026-07-18

- O popup integrado de **Recebimentos Presenciais** ganhou mais altura útil na viewport.

## 1.6.0.36 - 2026-07-18

- Quadros de configuração de vencimento foram compactados e centralizados;
  o quinzenal passa a exibir seus quinze intervalos em uma única linha no web.

## 1.6.0.35 - 2026-07-18

- O formulário de nova subempresa passou a usar margens laterais e inferior
  mais compactas dentro do AvantaCard.

## 1.6.0.34 - 2026-07-18

- As pílulas de vencimento agora ocupam uma linha estável, junto ao cabeçalho
  da área, e os campos de endereço não possuem mais limite ou ocultação visual.

## 1.6.0.33 - 2026-07-18

- A área **VENCIMENTO** passou a usar o mesmo título visual de **Nova
  subempresa**; suas pílulas ficam sempre visíveis, junto ao cabeçalho.

## 1.6.0.32 - 2026-07-18

- Endereço permanece visível ao configurar vencimento. A área **VENCIMENTO**
  passou a ter cabeçalho próprio e altura fixa até o final útil do AvantaCard.

## 1.6.0.31 - 2026-07-18

- O AvantaCard interno de administração passou a preencher uma área fixa do
  popup, com rolagem restrita ao conteúdo de cada aba.

## 1.6.0.30 - 2026-07-18

- O popup de **Recebimentos Presenciais** passou a manter altura fixa; as áreas
  internas redistribuem espaço sem redimensionar o card pai.

## 1.6.0.29 - 2026-07-18

- A mesma pílula de vencimento alterna entre **Configure o vencimento** e
  **Voltar ao endereço**, sem comando duplicado.

## 1.6.0.28 - 2026-07-18

- A configuração de vencimento ganhou o comando explícito **Voltar ao endereço**.

## 1.6.0.27 - 2026-07-18

- A seleção de período inicia oculta. A pílula **Configure o vencimento** abre
  a configuração e recolhe temporariamente a área de endereço.

## 1.6.0.26 - 2026-07-18

- A pílula de período abre imediatamente o respectivo quadro de configuração,
  sem o seletor intermediário “Escolher…”.

## 1.6.0.25 - 2026-07-18

- O cadastro de subempresa usa somente o card do formulário, sem moldura
  externa duplicada.

## 1.6.0.24 - 2026-07-18

- Popups de vencimento ficaram mais largos e usam mais colunas, reduzindo sua
  altura para caber no cadastro sem recorte.

## 1.6.0.23 - 2026-07-18

- A configuração de vencimento agora usa popups compactos com quadro de dias e
  meses, evitando listas extensas. Dias semanais ficaram centralizados.

## 1.6.0.22 - 2026-07-18

- Durante o novo cadastro de subempresa, a empresa-pai permanece somente no
  cabeçalho superior e as demais edições aguardam a conclusão ou o cancelamento.
- Endereço passou a concentrar CEP, rua, número, complemento, bairro, cidade e
  UF em uma única linha, com proporções compactas por campo.

## 1.6.0.21 - 2026-07-18

- Número passou a ficar ao lado de Rua no endereço da subempresa.
- A área de vencimento ganhou o título **Configure o vencimento** e pílulas
  centralizadas; a empresa-pai aparece no cabeçalho ao cadastrar subempresa.

## 1.6.0.20 - 2026-07-18

- A configuração de vencimento foi compactada: frequências viraram pílulas em
  uma linha e os controles específicos aparecem logo abaixo.

## 1.6.0.19 - 2026-07-18

- As ações de cancelar e salvar de subempresas agora ficam após a configuração
  do vencimento/recorrência.

## 1.6.0.18 - 2026-07-18

- A orientação do CEP permanece em uma única linha, mesmo quando ultrapassa a
  largura visual do campo.

## 1.6.0.17 - 2026-07-18

- O cabeçalho de Empresas foi elevado e a área de listagem ganhou mais espaço.
- CEP, rua, bairro, cidade e UF agora compartilham a mesma linha; a orientação
  de consulta fica diretamente abaixo do CEP.

## 1.6.0.16 - 2026-07-18

- No cadastro de subempresa, nome, responsável e valor contratado passaram a
  compartilhar a mesma linha no Web.

## 1.6.0.15 - 2026-07-18

- O comando **+ Novo colaborador** agora usa exatamente a mesma estrutura e
  estilo do comando **+ Nova empresa**.

## 1.6.0.14 - 2026-07-18

- O topo de **Empresas** ficou mais compacto. Nome da empresa, responsável e
  contato passam a ocupar a mesma linha.
- O endereço de subempresas agora começa pelo CEP: rua, bairro, cidade e UF são
  preenchidos pela consulta; número e complemento seguem editáveis.

## 1.6.0.13 - 2026-07-18

- O atalho de **RH** foi removido do cabeçalho e do menu responsivo até que o
  módulo de Recursos Humanos seja instalado e liberado oficialmente.

## 1.6.0.12 - 2026-07-18

- Subempresas agora configuram a regra completa do **Recebimento**: dias da
  semana no ciclo semanal; dia-base rigoroso de 15 em 15 dias no quinzenal;
  dia mensal; mês inicial e dia nos ciclos trimestral, semestral e anual.
- O sistema gera as cobranças previstas desde o cadastro da subempresa e as
  mantém atualizadas a cada carregamento. Cobranças abertas passam para
  **Em atraso** automaticamente após o vencimento, sem ação manual.
- O colaborador recebe a lista de cobranças abertas para apontar a parcela
  correta, evitando lançamentos avulsos duplicados.

## 1.6.0.11 - 2026-07-18

- O tooltip do gráfico de **Resultados** é ancorado na própria área do gráfico e
  fica precisamente alinhado, com respiro, ao lado direito do cursor.
- **Adicionar aos recebimentos** mantém `corPrimaria` também quando desabilitado,
  com contraste de estado apropriado.

## 1.6.0.10 - 2026-07-18

- O campo de senha de **Novo colaborador** inicia vazio, usa o placeholder
  **Digite a senha** e não solicita preenchimento automático do navegador.

## 1.6.0.09 - 2026-07-18

- Subempresas passam a definir a frequência de **Recebimento**: semanal,
  quinzenal, mensal, trimestral, semestral ou anual. Cadastros existentes foram
  migrados como mensais.
- Os filtros de Recebimentos voltaram a ocupar uma única linha; o período
  ganhou o grupo destacado **Selecione o período**.

## 1.6.0.08 - 2026-07-18

- O card de integração passou a se chamar **Total recebido e confirmado** e foi
  compactado: controles menores e espaço de retorno restrito a uma linha.
- A mensagem transitória agora informa **Carregando valores…**.
- Em **Recebimentos**, o título foi alinhado ao período **De / Até**, conectando
  visualmente a lista ao intervalo filtrado.

## 1.6.0.07 - 2026-07-18

- Em **Colaboradores**, o botão de copiar o link do PWA agora fica junto ao
  respectivo título; a pesquisa de colaboradores foi removida.
- O card **Baixado** volta a separar os campos e a ação em duas linhas, com
  controles mais compactos.
- Os cabeçalhos e comandos principais de **Recebimentos Presenciais** passam a
  herdar `corPrimaria`, mantendo leitura adequada também em temas escuros.

## 1.6.0.06 - 2026-07-18

- Reduzido pela metade o card **Baixado**, mantendo os dois campos e o botão de
  integração alinhados na mesma linha no web.
- Padronizados os comandos de pesquisa e criação nas abas **Empresas** e
  **Colaboradores**, com filtro instantâneo também para colaboradores.
- Reduzida a área do gráfico em **Resultados** para que permaneça integralmente
  dentro do AvantaCard pai.

## 1.6.0.05 - 2026-07-18

- Corrigida a distribuição da Visão geral de Recebimentos: os quatro cards de
  valores agora dividem horizontalmente toda a primeira linha no web.
- O card **Baixado** permanece centralizado na segunda linha e passa a alinhar
  os dois campos e o botão de integração em uma única linha no web.
- Em telas pequenas, indicadores e controles mantêm quebra responsiva sem
  rolagem horizontal.

## 1.6.0.04 - 2026-07-18

- Corrigido o nome exibido do módulo em todo o projeto para **Recebimentos
  Presenciais**, incluindo interface,
  metadados, PWA, APIs, Ava, documentação e mensagens do banco.
- Adicionada migration para atualizar o nome no catálogo das instalações já
  existentes, preservando o identificador técnico `recebimentos_presencial`.

## 1.6.0.03 - 2026-07-18

- Na Visão geral de Recebimentos, os cards de valores passam a ser distribuídos
  verticalmente e o card **Baixado** ganha ação com contraste reforçado.
- O aviso de carregamento da integração ocupa uma área fixa, sem alterar a
  altura do card durante a troca de mês.
- O módulo integrado passa a acompanhar o modo escuro do Gestão, com superfícies,
  campos, tabelas, estados e textos ajustados para contraste adequado.

## 1.6.0.02 - 2026-07-18

- PADRÃO AVANTA atualizado para 1.1.0: AvantaCard/AvantaShell passa a ser usado
  quando solicitado ou exigido pela especificação; os demais cards preservam o
  padrão visual geral sem adoção automática dessa geometria.

## 1.6.0.01 - 2026-07-18

- O PWA de Recebimentos Presenciais passa a usar o mesmo background institucional
  responsivo do Controle de Ponto, inclusive nos estados de preparação, login,
  bloqueio e painel do colaborador.
- O background foi incluído no cache offline do PWA e sua atualização foi
  versionada para alcançar instalações existentes.
- O login recebeu o mesmo card **Instalar** do Controle de Ponto, oculto quando
  o app já está aberto em modo standalone.
- A instalação usa o prompt nativo quando disponível e, no iPhone ou em
  navegadores sem prompt, orienta **Compartilhar > Adicionar à Tela de Início**.

## 1.6.0 - 2026-07-18

- Implantado o módulo instalável **Recebimentos Presenciais**, com catálogo por
  perfil, painel de gestão no Web, empresas, pontos de cobrança, colaboradores,
  conferência, divergência, devolução, estorno, indicadores e realtime.
- Criados banco, RLS, auditoria e RPCs próprios do módulo. Colaboradores usam
  contas independentes e não recebem vínculo nem acesso ao financeiro central.
- O PWA exclusivo `/recebimentos/colaborador` passa a autenticar com CPF e senha
  em uma sessão isolada, bloquear acesso quando o módulo estiver desativado e
  operar sobre dados reais do Supabase.
- Aplicados os novos ícones do PWA e a nova imagem de compartilhamento do link
  do colaborador.
- O total mensal baixado pode ser enviado ao Financeiro por Gestor Master ou
  Administrador, com nome da entrada e pílula de origem configuráveis. A receita
  vinculada não duplica no período e não permite edição ou exclusão manual.
- Reforçada a visibilidade do módulo: operadores não veem nem abrem sua gestão,
  mesmo quando ele está instalado no perfil.

## 1.5.4.60 - 2026-07-17

- Vendas Mobile: comprovantes compartilháveis de pedido e pagamento agora
  centralizam a empresa, ampliam cliente/data e saldo anterior, usam a pílula
  para identificar o comprovante e dão mais respiro antes do conteúdo.
- Os títulos de detalhes passam a indicar explicitamente “Detalhes do pedido” ou
  “Detalhes do pagamento”; a identificação genérica “VENDA” foi removida.

## 1.5.4.59 - 2026-07-17

- Criado o PADRÃO AVANTA 1.0.0 como fonte oficial para identidade visual,
  campos, formatação, layouts, componentes, preferências, módulos e
  acessibilidade.
- Integradas instruções para Codex, Claude e GitHub Copilot, com invocação
  pessoal `$padrao-avanta` para projetos novos ou plugados.
- Adicionado `npm run verificar:padrao-avanta`; o build agora valida a
  integridade do padrão antes de compilar.

## 1.5.4.58 - 2026-07-17

- AvantaShell: contorno do card unificado em um único sistema (drop-shadows de 1px seguindo toda a silhueta); eliminada a diferença de borda na região do platô e o recorte duplicado do canto arredondado.
- AvantaCard: nova API simplificada — basta informar `title`, `corPrimaria` (e opcional `darkMode`) e `plato` (conteúdo do canto superior direito); o preset é aplicado internamente. Modo antigo com `style`/`bodyStyle` segue compatível.
- Demo `/avanta-card-demo` refeita com o preset de produção, seletor de cor primária e alternância light/dark.

## 1.5.4.57 - 2026-07-17

- Compartilhamento: substituída a imagem de prévia dos links pela nova arte AvantaLab em 1200×628, otimizada em JPEG; atualizada a URL da metatag para evitar reaproveitamento da imagem anterior em cache.

## 1.5.4.56 - 2026-07-17

- Gestão Mobile: o seletor de sistemas agora usa os ícones finais de Gestão e Vendas fornecidos para seus respectivos botões.

## 1.5.4.55 - 2026-07-17

- Vendas Mobile: correção aplicada no arquivo-fonte do aplicativo para que a data de pedido e pagamento adote a mesma cor clara do rótulo no modo noturno; atualizada a versão de arquivos para substituir o CSS anterior.

## 1.5.4.54 - 2026-07-17

- Vendas Mobile: a data exibida nos campos de pedido e pagamento agora usa exatamente a mesma cor clara do respectivo rótulo no modo noturno; atualizada a versão dos arquivos para a correção chegar ao PWA.

## 1.5.4.53 - 2026-07-17

- Vendas Mobile: reforçado o contraste do rótulo e da data nos campos de pedido e pagamento durante o modo noturno.

## 1.5.4.52 - 2026-07-17

- Gestão Mobile: restaurado o disparo do aviso de valor repetido; o clique em salvar não interpreta mais o evento do navegador como confirmação.

## 1.5.4.51 - 2026-07-17

- Gestão Mobile: o aviso de duplicados agora identifica qualquer despesa com valor já lançado no mesmo mês, sem exigir que o nome também coincida.

## 1.5.4.50 - 2026-07-17

- Gestão Mobile: corrigida a camada do aviso de possível despesa duplicada para que ele sempre apareça acima do formulário de lançamento.

## 1.5.4.49 - 2026-07-17

- Gestão Mobile: o aviso de despesa com valor já existente agora usa o card de confirmação padrão do sistema, em vez do alerta simples do navegador.

## 1.5.4.48 - 2026-07-17

- Gestão Mobile: a faixa de mês e total ao detalhar lançamentos agora mantém contraste alto no modo escuro, evitando texto apagado em despesas e receitas.

## 1.5.4.47 - 2026-07-17

- Gestão Mobile: refinados os ícones do seletor de sistemas, com traços mais finos e minimalistas para Gestão e Vendas.

## 1.5.4.46 - 2026-07-17

- Gestão Mobile: o seletor inicial ganhou ícones próprios para os dois sistemas — gráfico de desempenho para Gestão e sacola com confirmação para Vendas.

## 1.5.4.45 - 2026-07-17

- Gestão Web: o card **Organizar blocos** abre centralizado, recebeu cabeçalho na cor do perfil e pode ser arrastado pelo próprio cabeçalho, como a Agenda.
- Gestão Web: ao ocultar os gráficos de **Meus perfis**, o card retorna à altura que tinha antes da expansão.

## 1.5.4.44 - 2026-07-17

- Gestão Web: a exclusão de despesa remove a linha imediatamente da lista, inclusive quando o identificador chega em formato numérico.
- Gestão Web: o painel **Organizar blocos** pode ser reposicionado na tela pela mãozinha do cabeçalho; o comparativo de **Meus perfis** ganhou folga adicional para nunca cortar o gráfico.
- Vendas Mobile: restauradas as imagens dos botões **Divulgação** e **Informações**, com nomes de arquivos compatíveis com a publicação web.

## 1.5.4.43 - 2026-07-17

- Gestão Web: a Agenda agora sinaliza e detalha no dia correto despesas futuras previstas, parceladas e fixas, junto dos lembretes.
- Gestão Web: **Organizar blocos** passou a distribuir os controles horizontalmente; os cards mantêm a mãozinha para reordenação.
- Gestão Web: ao exibir o comparativo em **Meus perfis**, o card se expande para mostrar todo o gráfico.
- Gestão Web: abrir **Ajustes** não desloca mais o conteúdo abaixo do cabeçalho.
- Vendas Mobile: no comprovante de pedido, cabeçalho e ações finais ficam fixos; apenas a lista de produtos rola.

## 1.5.4.42 - 2026-07-16

- Gestão Mobile: reforçada a configuração nativa do PWA no iPhone para o gradiente do header ocupar a área atrás da ilha, hora e bateria. A atualização do shell é forçada para não manter o comportamento antigo em cache.

## 1.5.4.41 - 2026-07-16

- Vendas Mobile: pedidos e pagamentos passam a confirmar os débitos e recebimentos da cliente diretamente no servidor antes de gravar o saldo. O cache continua acelerando a abertura, mas não pode mais compor comprovantes ou saldos financeiros.
- Corrigido o comprovante do pedido da cliente Valda no perfil Jefferson: os pagamentos legados de R$ 1.653,00 já quitavam integralmente o pedido anterior; o novo pedido de R$ 2.129,00 passa a registrar saldo anterior de R$ 0,00 e saldo atual de R$ 2.129,00.

## 1.5.4.40 - 2026-07-16

- Gestão Mobile: no PWA instalado, o gradiente do cabeçalho agora se estende até o topo físico da tela, atrás da área da ilha, hora e bateria. Os controles do cabeçalho permanecem na mesma posição segura.

## 1.5.4.39 - 2026-07-16

- Vendas Mobile: o destaque da lista de Clientes voltou ao centro útil da tela; somente os cards imediatamente acima e abaixo ficam desfocados, agora com mais intensidade.
- Gestão Mobile: o fundo em gradiente do cabeçalho passa a preencher também a área superior, sem alterar a posição dos conteúdos do header.

## 1.5.4.38 - 2026-07-16

- Vendas Mobile: o cabeçalho de **Clientes** foi reorganizado com o campo de pesquisa à esquerda, **Ordem** em seguida e **Buscar** no canto direito.
- Removido o encaixe automático dos cards de clientes. A lista agora acompanha livremente o gesto de rolagem, preservando apenas o destaque visual do card em foco.

## 1.5.4.37 - 2026-07-16

- Gestão Mobile: corrigida a causa estrutural da demora aparente em **60%**. Assinatura, cadastro e dados financeiros passam a carregar em paralelo, e cada conclusão real atualiza a barra.
- A tela principal continua sendo liberada somente após a carga indispensável terminar e os **100%** serem exibidos.
- Removido o reinício por tempo total que podia interromper uma carga ainda saudável. A recuperação automática agora reage somente à ausência real de progresso.
- O PWA deixa de reutilizar versões antigas do código de autenticação e dados financeiros, evitando que uma correção anterior desapareça após novas publicações.

## 1.5.4.36 - 2026-07-16

- Vendas Mobile: pesquisas e filtros de lista não são mais persistidos entre aberturas; a sala de botões sempre inicia com os campos de busca limpos.

## 1.5.4.35 - 2026-07-16

- Vendas Mobile: as imagens dos nove botões da sala são mantidas pré-carregadas e decodificadas, deixando o retorno para **Início** mais imediato.

## 1.5.4.34 - 2026-07-16

- Vendas Mobile: corrigida a restauração do cache que fechava a sala de botões e mostrava o Dashboard. Toda abertura volta agora obrigatoriamente para a sala de botões.

## 1.5.4.33 - 2026-07-16

- Gestão Mobile: a carga dos dados passa a indicar imediatamente que saiu da validação de sistemas, evitando a aparência de travamento em 60% enquanto assinatura e cadastro são verificados.
- Vendas Mobile: cada abertura começa na sala de botões. No modo escuro, botões azuis escuros recebem borda clara para manter contraste, incluindo **Ver detalhes** e a aba **Resumo** da ficha de cliente.

## 1.5.4.32 - 2026-07-16

- Gestão Web: Operador Completo passa a acessar o botão **Vendas Mobile** quando o módulo já estiver instalado no perfil. Instalar ou remover módulos continua restrito a Gestor Master e Administrador.

## 1.5.4.31 - 2026-07-16

- Vendas Mobile: o limite disponível de cada produto ganhou mais destaque ao gerar pedido a partir de um consignado.
- Produtos: os indicadores de produtos, pacotes e gerenciamento acompanham o cabeçalho fixo; a lista rola abaixo deles. Os botões de novo produto e novo cliente foram padronizados.

## 1.5.4.30 - 2026-07-16

- Vendas Mobile: o encaixe da lista de Clientes passa a posicionar o card em foco logo abaixo do cabeçalho, sem deixar parte do card anterior visível acima dele.

## 1.5.4.29 - 2026-07-16

- Gestão Mobile: corrigida a interrupção que podia deixar o preparo de acesso parado em **60%**. As verificações anteriores à carga de dados agora têm prazo e a integração com Vendas não bloqueia a abertura financeira.
- Se uma conexão excepcionalmente demorar, o app tenta uma reconexão controlada; se ainda não responder, mostra imediatamente **Tentar novamente**, sem manter o usuário preso na tela de carregamento.

## 1.5.4.28 - 2026-07-16

- Vendas Mobile: **Gerar pedido** depende exclusivamente da existência de produtos restantes no consignado. Conversões parciais mantêm o consignado disponível para novos pedidos até zerar todos os itens.

## 1.5.4.27 - 2026-07-16

- Vendas Mobile: o encaixe automático dos cards de Clientes é pausado integralmente enquanto qualquer popup estiver aberto e só é retomado após o fechamento.

## 1.5.4.26 - 2026-07-16

- Vendas Mobile: o botão **Gerar pedido** permanece sempre visível no card de consignado ativo; ao tocar, abre a etapa separada de quantidades e confirmação.

## 1.5.4.25 - 2026-07-16

- Vendas Mobile: ao tocar em **Pagamento**, o foco do campo **Valor pago** acontece durante o próprio toque, fazendo o teclado numérico abrir sem permitir que o card suba.
- Clientes: removido o texto auxiliar do cabeçalho, reduzida a altura de **Novo cliente** e compactado o espaço ocupado pelo cabeçalho fixo.

## 1.5.4.24 - 2026-07-16

- Vendas Mobile: o pedido consignado passa a exibir somente os produtos e as quantidades em consignação, com rolagem restrita à lista e cabeçalho, resumo e ações fixos.
- **Gerar pedido** abre uma etapa separada para escolher as quantidades vendidas, limitada ao saldo de cada produto; a confirmação cria o pedido da cliente e abate os itens do consignado.
- Edição de pedidos: os controles de quantidade mantêm o foco e a posição da lista, o card recebeu mais espaço e a linha de bonificação foi reorganizada com o botão **Inserir item**.

## 1.5.4.23 - 2026-07-16

- Vendas Mobile: o imã posiciona o card do cliente mais acima, no centro vertical da área entre o cabeçalho principal e o menu inferior.
- Lançar pagamento: o card permanece estável durante a abertura do teclado, sem subir gradualmente; o campo de valor continua recebendo foco automaticamente.

## 1.5.4.22 - 2026-07-16

- Gestão Mobile: corrige a espera indefinida em 60% ao limitar e repetir automaticamente as verificações de assinatura, cadastro e sessão.
- Preparação de acesso: se nenhuma etapa responder por tempo anormal, o aplicativo faz uma única reconexão automática; uma segunda falha mostra a opção de tentar novamente, sem criar ciclo de recargas.

## 1.5.4.21 - 2026-07-16

- Vendas Mobile: o imã dos cards de clientes reage mais rapidamente assim que a rolagem termina.
- Endereço do cliente: cidade, estado ou CEP isolados não tornam mais a linha clicável; sem logradouro, o card exibe a orientação para adicionar o endereço.

## 1.5.4.20 - 2026-07-16

- Vendas Mobile: o encaixe dos cards de clientes fica um pouco mais presente após a rolagem, sem impedir gestos fortes de avançarem por vários cards; somente os vizinhos imediatos do card em foco recebem um desfoque leve.
- Novos pedidos e pagamentos exibem somente o nome do cliente, com fonte maior, na lista de seleção.
- Integração: cada usuário mantém uma única conta operacional no Vendas. Ativações feitas em perfis da Gestão autorizam a troca de sistema, mas não criam contas ou perfis adicionais no Vendas.
- Gestão Mobile: a instalação salva em cada perfil passa a ser a fonte de verdade da ativação, evitando que um módulo já instalado volte a ser solicitado.

## 1.5.4.19 - 2026-07-16

- Vendas Mobile: a linha de endereço no card do cliente passa a ter aparência de botão e abre a escolha entre Waze e mapas.
- Clientes sem endereço recebem uma orientação no mesmo local, sem ação de clique.

## 1.5.4.18 - 2026-07-16

- Vendas Mobile: ao ativar o lápis para reorganizar a sala de botões, uma instrução ao lado do controle orienta a clicar e arrastar o card para a nova posição.

## 1.5.4.17 - 2026-07-16

- Vendas Mobile: novos pedidos e pagamentos permitem localizar o cliente digitando nome, telefone ou e-mail, com filtragem imediata das opções.
- Lançamentos gerais: ao abrir o card, o foco e o teclado vão diretamente para a busca de cliente; nenhuma pessoa é escolhida implicitamente antes do toque em um resultado.

## 1.5.4.16 - 2026-07-16

- Gestão e Vendas Mobile: corrige a ativação do módulo para usuários vinculados a mais de um perfil. Ativar um perfil não bloqueia mais o acesso aos demais.
- **Ir para Vendas** passa a considerar a instalação salva no perfil como fonte de verdade e repara o acesso do gestor antes de exibir uma nova solicitação de ativação.

## 1.5.4.15 - 2026-07-16

- Vendas Mobile: a página **Clientes** passa a calcular saldos, consignados, créditos e última compra em uma única leitura dos lançamentos, reduzindo o tempo de abertura.
- Clientes: o destaque central deixa de recalcular e alterar todos os cards durante a rolagem; o efeito de encaixe acontece somente depois que o movimento termina, melhorando fluidez e estabilidade.

## 1.5.4.14 - 2026-07-16

- Vendas Mobile: ao inserir um item no pedido, o produto pode ser localizado digitando nome, código, marca ou categoria; as opções são filtradas imediatamente e a escolha mantém o preço sincronizado.

## 1.5.4.13 - 2026-07-16

- Vendas Mobile: fechar os cards de novo pedido ou pagamento não força mais a restauração da página quando a rolagem já está correta, bloqueia ações padrão do botão e suspende temporariamente o encaixe automático dos clientes.
- Mobile: o fundo atrás de cards, confirmações, calendários e menus foi intensificado para separar visualmente o conteúdo aberto da tela principal.

## 1.5.4.12 - 2026-07-16

- Gestão Mobile: **Ir para Vendas** passa a confirmar o módulo diretamente no servidor antes de decidir pela ativação, evitando avisos incorretos causados por um estado temporariamente desatualizado.
- Vendas Mobile: datas de pedidos, pagamentos e demais registros passam a ser exibidas somente como data, sem horário.

## 1.5.4.11 - 2026-07-16

- Vendas Mobile: ao tocar em **Pagamento** no card da cliente, o campo **Valor pago** recebe foco durante o próprio toque e abre imediatamente o teclado numérico.

## 1.5.4.10 - 2026-07-16

- Gestão Mobile: corrige a situação em que a preparação chegava a 100%, mas a tela principal permanecia bloqueada.
- Carregamento: a interface é liberada assim que os dados essenciais terminam; agenda, notificações, tempo real, ponto e tutorial passam a iniciar em segundo plano sem prender o acesso.
- Recuperação: se o navegador mantiver indevidamente a tela de preparação após a conclusão, o sistema tenta abri-la novamente e disponibiliza uma ação de continuidade.

## 1.5.4.09 - 2026-07-16

- Vendas Mobile: corrige o rodapé da imagem do comprovante para mostrar apenas o tipo e a cliente, sem “Vendas AvantaLab”.

## 1.5.4.08 - 2026-07-16

- Vendas Mobile: ao compartilhar a imagem de um comprovante, a mensagem passa a identificar apenas o tipo e a cliente, sem a assinatura “Vendas AvantaLab”.

## 1.5.4.07 - 2026-07-16

- Clientes: o campo de pesquisa passa a ser limpo sempre que a página é acessada novamente.
- Sala de botões: a navegação valida se todos os cards foram montados antes de preservar a tela e reconstrói automaticamente a grade caso detecte uma renderização incompleta.
- Navegação: o botão **Início** deixa de aceitar uma sala parcial como válida, evitando retornar para uma tela sem os botões.

## 1.5.4.06 - 2026-07-16

- Vendas Mobile: históricos de pedidos, consignados e pagamentos passam a exibir 10 registros por vez, com botão para carregar o próximo lote até o fim da lista.
- Navegação: ao carregar mais registros dentro de **Ver detalhes**, a posição da rolagem é preservada.
- Listas principais: Pedidos e clientes da área de Pagamentos seguem o mesmo padrão de lotes de 10, com contador do total exibido.

## 1.5.4.05 - 2026-07-16

- Vendas Mobile: clientes, pedidos e pagamentos passam a ser carregados em todas as páginas do Supabase, sem perder registros quando o histórico ultrapassa 1.000 linhas.
- Financeiro: corrige saldos falsos causados por histórico truncado quando pagamentos antigos ficavam fora da primeira página retornada pelo servidor.
- Cache: a versão financeira local é renovada para descartar imediatamente os saldos calculados com respostas incompletas.

## 1.5.4.04 - 2026-07-16

- Pagamentos: o comprovante só é exibido depois que o Supabase confirma o lançamento e a conferência financeira da cliente termina; qualquer falha mantém o formulário aberto sem gerar comprovante.
- Clientes: o campo de pesquisa e o botão **Buscar** ficam permanentemente visíveis no cabeçalho, substituindo a lupa de expansão.
- Interface: campo de pesquisa e botão **Buscar** passam a ter a mesma altura.

## 1.5.4.03 - 2026-07-16

- Vendas Mobile: após salvar um pagamento, o sistema relê no Supabase todos os pedidos e pagamentos da cliente antes de liberar o comprovante e atualizar o saldo exibido.
- Pagamentos: o botão de confirmação fica bloqueado durante o salvamento e o estado local elimina repetições com o mesmo identificador.
- Cache: dados financeiros antigos armazenados no PWA são invalidados para que o próximo acesso restaure os valores atuais do servidor.

## 1.5.4.02 - 2026-07-16

- Gestão Mobile: o acesso passa a se chamar **Ir para Vendas** e fica disponível para Gestor Master e Administrador mesmo antes da ativação; quando necessário, o próprio fluxo ativa o módulo e segue para o Vendas.
- Integração: a ativação do Vendas Mobile passa a ser conferida exclusivamente pela validação segura do servidor, evitando que uma leitura protegida marque novamente o módulo como desativado.
- Navegação: a escolha entre Gestão e Vendas permanece somente na entrada após o login. Depois de acessar um sistema, o comando mostra apenas o outro destino; no Vendas, passa a se chamar **Ir para Gestão**.

## 1.5.4.01 - 2026-07-16

- Vendas Mobile: clientes, pedidos e pagamentos recebem identificadores únicos criados no aparelho, permitindo repetir uma gravação após queda de conexão sem duplicar registros.
- Persistência: se o Supabase não confirmar uma alteração por falha temporária de rede, ela permanece em uma fila protegida no IndexedDB e é reenviada automaticamente na abertura ou quando a internet retorna.
- Interface: o sistema diferencia uma alteração confirmada, uma alteração protegida aguardando sincronização e uma falha sem armazenamento local; sucesso só é informado após a confirmação do servidor.

## 1.5.4 - 2026-07-16

- Vendas Mobile: protege clientes, pedidos e pagamentos contra uma atualização antiga em segundo plano que poderia substituir na tela e no cache dados recém-salvos.
- Vendas Mobile: toda alteração operacional confirmada pelo Supabase atualiza imediatamente o estado e o cache local, em uma fila ordenada que impede uma gravação antiga de vencer a mais recente.
- Pedidos: o pedido e todos os seus itens passam a ser criados ou editados em uma única transação no banco; se qualquer etapa falhar, nenhuma parte é alterada.
- Banco de dados: clientes, pedidos e pagamentos passam a registrar automaticamente a data da última alteração.

## 1.5.3.16 - 2026-07-16

- Gestão Mobile: ao abrir a busca nas listas de despesas ou receitas, o campo recebe foco automaticamente e o teclado fica pronto para digitação.

## 1.5.3.15 - 2026-07-16

- Usuários: corrige o login vazio ao editar uma conta vinculada a vários perfis. A lista passa a exibir o login único da conta em qualquer perfil, e a alteração é salva de forma atômica.

## 1.5.3.14 - 2026-07-16

- Usuários: formulário de edição separa Nome, Login e E-mail e exige confirmação ao alterar senha.

## 1.5.3.13 - 2026-07-16

- Usuários: o e-mail informado na edição passa a atualizar a conta de acesso e todos os vínculos, mantendo o login e a mesma senha. A senha também pode ser alterada no mesmo formulário.
- Permissões: Gestor Master edita todos; Administrador edita a si e operadores; Operador Completo edita apenas os próprios dados; Operador Simples não possui edição.

## 1.5.3.12 - 2026-07-16

- Gestão Web e Mobile: a ativação do **Vendas Mobile** agora confirma a instalação no perfil e a liberação do gestor antes de informar sucesso. Falhas de salvamento passam a ser exibidas em vez de marcar o módulo como ativo apenas na tela.

## 1.5.3.11 - 2026-07-16

- Gestão Mobile: no seletor de troca de perfil, o perfil já aberto fica identificado como **Perfil em uso** e desativado; somente os demais podem ser selecionados.

## 1.5.3.10 - 2026-07-16

- Gestão Mobile: abertura mais ágil ao reaproveitar a validação inicial da integração com Vendas, conferir assinatura e cadastro em paralelo e evitar nova consulta de sessão.
- Gestão Mobile: o resumo comparativo de todos os perfis passa a atualizar logo após a tela principal, sem atrasar o acesso aos lançamentos do perfil aberto.

## 1.5.3.09 - 2026-07-16

- Vendas Mobile: reaproveita a validação de sessão e perfil na carga inicial, eliminando uma segunda consulta de acesso.
- Vendas Mobile: libera a tela antes da sincronização automática do catálogo; a atualização continua em segundo plano e a verificação manual não recarrega mais todo o sistema.

## 1.5.3.08 - 2026-07-16

- Vendas Mobile: restaura rapidamente os dados já validados do usuário e perfil ao reabrir o PWA, atualizando o Supabase em segundo plano sem retornar ao carregamento completo.
- Vendas Mobile: o cache local usa IndexedDB, é separado por usuário e perfil, tem validade de sete dias e é removido ao sair ou resetar o sistema.

## 1.5.3.07 - 2026-07-16

- Vendas Mobile: padroniza os campos de data de pedido e pagamento, com rótulo centralizado e mais legível e data em maior destaque.

## 1.5.3.06 - 2026-07-16

- Vendas Mobile: melhora o espaçamento no cabeçalho de **Ver detalhes** e adiciona exclusão diretamente ao comprovante de pagamento, seguindo o fluxo dos pedidos.
- Vendas Mobile: **Clientes sem compra** passa a exibir todos os clientes do intervalo, com cabeçalhos fixos, tipografia refinada e descrição compacta.
- Vendas Mobile: preserva a posição das telas ao navegar, evita reconstrução ao tocar novamente na tela atual e não verifica atualizações no simples retorno do aplicativo ao primeiro plano.
- Vendas Mobile: reduz o rótulo e amplia a data no formulário de edição de pagamento.

## 1.5.3.05 - 2026-07-16

- Vendas Mobile: estabiliza a sala de botões após o carregamento, evitando reconstruções redundantes, escalas de toque e recarregamento visual dos cards.
- Vendas Mobile: a organização dos botões passa a atualizar a própria grade, sem desmontar e recriar as imagens.

## 1.5.3.04 - 2026-07-16

- Gestão Mobile e Vendas Mobile: o percentual de preparação passa a avançar conforme scripts, sessão, permissões, consultas e recursos realmente são concluídos, exibindo também a etapa atual.
- Gestão Mobile: remove a espera artificial antes da validação da sessão e atualiza o cache do PWA para entregar o novo carregamento imediatamente.

## 1.5.3.03 - 2026-07-16

- Gestão Mobile e Vendas Mobile: os cards de preparação de acesso e de conteúdo agora exibem barra de progresso percentual durante o carregamento.

## 1.5.3.02 - 2026-07-16

- Vendas Mobile: em Clientes, Ordenar e a lupa passam a ocupar uma barra compacta; a lupa abre o campo com botão Buscar na mesma linha e se recolhe ao ficar vazia fora de foco.

## 1.5.3.01 - 2026-07-16

- Vendas Mobile: Clientes ganha encaixe central ao rolar, pesquisa recolhida em uma lupa, cabeçalho fixo nos detalhes e calendário centralizado para alterar datas.
- Vendas Mobile: separa definitivamente pedidos e consignados nas fichas dos clientes, amplia a lista de clientes sem compras e faz o recorte respeitar o período/dias selecionados.
- Vendas Mobile: agiliza pagamentos com seleção de cliente pelo botão **+**, foco imediato no valor, comprovante reorganizado e opção de editar diretamente no detalhe.
- Vendas Mobile: adiciona percentual de progresso durante a preparação do acesso e impede recargas automáticas inesperadas durante o uso.

## 1.5.3 - 2026-07-16

- Migração Tridium: cada histórico restaurado passa a usar o perfil pessoal da própria conta, com módulo Vendas ativo e acesso de gestor, sem vincular movimentações financeiras individuais à Tridium Cosméticos.
- Migração Tridium: quando a conta ainda não possui perfil pessoal, o importador o cria com acesso de cortesia e direciona pedidos e recebimentos ao respectivo perfil financeiro.

## 1.5.2.01 - 2026-07-16

- Gestão e Vendas Mobile: corrige a consolidação do Vendas para manter uma receita por mês, com o total correspondente a cada competência, em vez de concentrar o ano no mês atual.
- Gestão e Vendas Mobile: ao atualizar, cada competência é recalculada e registrada no dia corrente daquele mês.

## 1.5.2 - 2026-07-16

- Gestão e Vendas Mobile: consolida o resultado do Vendas em uma única entrada de receita por perfil financeiro, em vez de uma entrada para cada dia.
- Gestão e Vendas Mobile: o total consolidado é recalculado ao acessar o perfil ou o Vendas e recebe a data atual, refletindo a base escolhida entre vendas e recebimentos.

## 1.5.1.03 - 2026-07-15

- Migração Tridium: o importador passa a respeitar o perfil financeiro já escolhido pelo usuário, direcionando pedidos e recebimentos históricos à Gestão correta.
- Migração Tridium: preserva o status de acesso comercial existente e não reativa nem bloqueia perfis durante uma reimportação técnica.

## 1.5.1.02 - 2026-07-15

- Vendas Mobile: corrige a sincronização do catálogo após importação histórica, reconhecendo produtos pessoais já vinculados ao catálogo antes de tentar criar uma nova cópia.
- Migração Tridium: registra os recebimentos de catálogo dos três históricos restaurados, eliminando o conflito de chave duplicada na abertura do Vendas.

## 1.5.1.01 - 2026-07-15

- Migração Tridium: permite substituir de forma controlada os dados atuais de um representante pelo respectivo histórico legado, preservando o acesso, o vínculo empresarial e os dados dos demais usuários.
- Migração Tridium: Jefferson Ferreira passa a utilizar exclusivamente o histórico restaurado do backup legado.

## 1.5.1 - 2026-07-15

- Vendas Mobile: adiciona um importador idempotente e auditável para backups MySQL legados da Tridium, com validação prévia, vinculação por conta e prevenção de duplicidades.
- Migração Tridium: restaura catálogo, clientes, pedidos, itens, recebimentos econômicos e agenda de Jefferson Ferreira, Marcos Soares e William De Lima Raposo no Vendas Mobile.
- Migração Tridium: cria e confirma a conta do Marcos, libera os acessos de Vendas necessários e vincula os históricos ao perfil financeiro da Tridium Cosméticos, refletindo os recebimentos agregados na Gestão.

## 1.5.0.12 - 2026-07-15

- Gestão Mobile: separa os fundos das telas de entrada. Login e cadastro mantêm o logo em posição alta para não conflitar com o formulário; carregamento, seletor de sistema e demais telas pós-login usam o fundo de apresentação com o logo mais baixo, alinhado ao padrão do Vendas Mobile.

## 1.5.0.11 - 2026-07-15

- Sobre: consolida as 83 publicações anteriores em 10 marcos de evolução, agrupando microversões da mesma entrega.
- Sobre: o histórico público passa a destacar apenas novidades, facilidades e correções perceptíveis para o usuário; detalhes de cache, infraestrutura, migrações e validações internas permanecem somente neste changelog técnico.
- Web e Gestão Mobile: renomeia a seção do histórico para **Principais novidades**, reforçando o caráter resumido da publicação.

## 1.5.0.10 - 2026-07-15

- Gestão e Vendas Mobile: ao entrar no Vendas pela troca de sistemas, abre diretamente quando há um único perfil de Vendas ativo e solicita a escolha quando há mais de um.
- Vendas Mobile: adiciona ao header da sala um botão exclusivo para trocar o perfil de Vendas, visível somente para contas com múltiplos perfis.
- Vendas Mobile: a troca do perfil operacional não altera o destino financeiro, que continua configurável exclusivamente em **Configurações > Integração com Gestão**.

## 1.5.0.09 - 2026-07-15

- Gestão Mobile: adiciona **X** ao seletor de sistemas aberto dentro do app e permite cancelá-lo tocando fora do card, mantendo o sistema atual.
- Gestão Mobile: preserva como obrigatória a escolha inicial exibida antes do carregamento do sistema após o login.

## 1.5.0.08 - 2026-07-15

- Gestão Mobile: mantém **Sistemas** visível quando o perfil ainda não possui Vendas Mobile e oferece a ativação do módulo em um card de confirmação.
- Gestão Mobile: após ativar e validar o acesso integrado do gestor, abre automaticamente o seletor entre Gestão e Vendas; operadores permanecem sem permissão.
- Gestão Mobile: perfis pessoais gratuitos são direcionados ao Premium antes da ativação do Vendas Mobile.

## 1.5.0.07 - 2026-07-15

- Gestão Mobile: posiciona **Assinatura** como primeiro item de Configurações quando disponível e agrupa no topo os controles com chave.
- Gestão Mobile: reorganiza os itens administrativos na sequência **Gerenciar perfil**, **Usuários** e **Editar dados cadastrais**.

## 1.5.0.06 - 2026-07-15

- Gestão Mobile: move **Avisos e notificações** para dentro de **Configurações** no menu lateral.
- Gestão Mobile: reduz levemente a altura dos botões principais e dos itens internos de Configurações, preservando legibilidade e toque.

## 1.5.0.05 - 2026-07-15

- Gestão Mobile: corrige o menu sanduíche que interpretava ícones legados como sinal de bloqueio e desativava oito opções em todos os perfis.
- Gestão Mobile: mantém `disabled` somente na opção **Sistemas** quando a regra de permissão exigir; os demais botões voltam a responder normalmente.

## 1.5.0.04 - 2026-07-15

- Gestão Mobile: mantém a troca de sistemas totalmente oculta quando o perfil atual não possui o módulo Vendas instalado.
- Vendas Mobile: o botão de troca abre a seleção de perfil da Gestão, listando todos os perfis ativos vinculados à conta autenticada.
- Vendas Mobile: após selecionar um perfil, solicita confirmação e abre a Gestão diretamente no perfil escolhido.

## 1.5.0.03 - 2026-07-15

- Vendas Mobile: aplica a seleção de sistema antes da carga dos dados, usando o fundo padrão e exibindo **Preparando acesso** somente após a escolha.
- Vendas Mobile: posiciona a troca para Gestão no header fixo da sala de botões e exige confirmação antes de navegar.
- Vendas Mobile: corrige a escolha automática do perfil, priorizando vínculos com módulo Vendas ativo para evitar a exibição incorreta de recursos desativados.

## 1.5.0.02 - 2026-07-15

- Gestão Mobile: exibe a escolha entre Gestão e Vendas imediatamente após a autenticação, antes de carregar dados, paywall ou dashboard da Gestão.
- Mobile: após escolher o sistema, mostra **Preparando acesso** e somente então abre o destino selecionado; escolhas memorizadas continuam pulando o seletor.

## 1.5.0.01 - 2026-07-15

- Gestão e Vendas Mobile: corrige a liberação da troca de sistemas para Gestor Master e Administrador quando o módulo Vendas está instalado; operadores permanecem sem acesso.
- Vendas Mobile: prepara automaticamente o acesso integrado do gestor, evitando botões ausentes ou inativos após a instalação do módulo.

## 1.5.0 - 2026-07-15

- Gestão Mobile e Vendas Mobile: compartilham a sessão autenticada e preservam o perfil/empresa ao trocar de sistema.
- Mobile: após a validação, gestores com o módulo Vendas ativo podem escolher o sistema inicial e memorizar a preferência para os próximos acessos.
- Gestão Mobile: adiciona Sistemas ao menu lateral e aos atalhos personalizáveis do rodapé; operadores permanecem sem permissão para a troca.
- Vendas Mobile: adiciona acesso à Gestão no header e nos atalhos personalizáveis, acomodando o aviso de aniversário sem sobreposição.

## 1.4.1.03 - 2026-07-15

- Vendas Mobile: adiciona rolagem ao menu lateral do celular em paisagem, garantindo acesso a todos os botões.

## 1.4.1.02 - 2026-07-15

- Vendas Mobile: em paisagem, impede o recorte das ações nos cards de Pagamentos e desativa o destaque automático concorrente dos cards de Clientes.

## 1.4.1.01 - 2026-07-15

- Vendas Mobile: ajusta exclusivamente a paisagem do celular, compactando cards de Clientes e Pagamentos e preservando fôlego após os cabeçalhos de Dashboard e Produtos.

## 1.4.1 - 2026-07-15

- Ava: adiciona guias operacionais separados para Gestão Web, Gestão Mobile e Vendas Mobile; o chat passa a receber somente o manual do ambiente ativo.
- Ava: cria verificação obrigatória dos manuais por versão, para manter o conhecimento revisado junto das entregas do sistema.

## 1.4.0.68 - 2026-07-13

- Mobile: mantém no formulário o novo valor do lançamento enquanto a edição é salva, sem voltar visualmente ao valor anterior.

## 1.4.0.67 - 2026-07-13

- Web: aplica o modo escuro ao header do chat da Ava e alterna o logo entre as versões para fundo claro e escuro, seguindo o mobile.

## 1.4.0.66 - 2026-07-13

- Web: corrige o recorte dos cards durante o arraste do Kanban para preservar o raio AvantaLab em todos os cantos.
- Web: mantém o header principal visível ao abrir Ajustes depois de rolar a página.

## 1.4.0.65 - 2026-07-13

- Web: adiciona linhas-guia suaves ao gráfico Receitas x despesas do Relatório do perfil.
- Web: permite posicionar cards do Kanban abaixo de Lançamentos mensais, mantendo esse card fixo no topo.

## 1.4.0.64 - 2026-07-13

- Web: o tooltip do puxador de Meus perfis fecha ao iniciar o arraste e permanece oculto até soltar.

## 1.4.0.63 - 2026-07-13

- Web: adiciona em Configurações a chavinha Iniciar valores ocultos, com preferência salva no dispositivo.
- Web: reúne as opções de privacidade inicial e aviso de duplicados no mesmo menu de configurações.

## 1.4.0.62 - 2026-07-13

- Web: adiciona ao puxador do card Meus perfis um tooltip no mesmo padrão dos controles do menu.

## 1.4.0.61 - 2026-07-13

- Web: aumenta a folga final do card Meus perfis no modo expandido para concluir a rolagem sem cortes.
- Web: impede que o bloco Receitas x despesas por perfil seja comprimido durante o redimensionamento.

## 1.4.0.60 - 2026-07-13

- Web: corrige o cursor do puxador para alternar entre mão aberta e mão fechada durante o arraste.
- Web: amplia a área de captura para todo o rodapé e adiciona folga para exibir integralmente o último perfil.

## 1.4.0.59 - 2026-07-13

- Web: corrige a trava dos popups fixando a página na posição atual enquanto o overlay estiver aberto.
- Web: mantém a rolagem interna do popup e restaura a posição original da página ao fechar.

## 1.4.0.58 - 2026-07-13

- Web: refinado o puxador do card Meus perfis, com cursor de pegar/segurar, rótulo Arraste e resposta imediata.
- Web: limita a expansão do card ao conteúdo final da lista de perfis.

## 1.4.0.57 - 2026-07-13

- Web: bloqueia a rolagem da página de fundo sempre que um popup estiver aberto.
- Web: adiciona rodapé fino com puxador ao card Meus perfis, permitindo ampliar sua altura e a lista de perfis.

## 1.4.0.56 - 2026-07-13

- Web: mantém o tamanho da fonte da despesa selecionada e de sua lista no lançamento.
- Web: remove o lançamento de nota por foto e mantém somente o envio por arquivo.
- Web: avança automaticamente o foco entre dia, despesa, descrição e origem durante o lançamento.

## 1.4.0.55 - 2026-07-13

- Mobile: mostra "Carregando perfil..." ao lado do perfil selecionado durante a troca.
- Mobile: mês do Novo lançamento aparece em uma pílula maior, centralizada entre o título e o botão de fechar.

## 1.4.0.54 - 2026-07-13

- Leitura por foto: remove o laboratório temporário e consolida a API e a Edge Function definitivas.
- Histórico público: remove as entradas referentes aos testes isolados.

## 1.4.0.53 - 2026-07-13

- Mobile: o cabeçalho de Novo lançamento exibe o mês selecionado e corrige a acentuação do título para despesas e receitas.
- Mobile: foto e arquivo de nota, Ava IA e Insights da Ava ficam exclusivos para assinantes, com aviso azul explicativo no app.
- Mobile: atualiza o tutorial para os fluxos atuais de perfis, lançamentos, Caixinha, recursos de assinatura e configurações.

## 1.4.0.52 - 2026-07-13

- Mobile: destaca com borda azul o perfil atual e o perfil tocado durante a troca.
- Cadastro Web/Mobile: preserva o preenchimento durante reconstruções da tela e salva automaticamente o cadastro do perfil ao sair de cada campo.
- Mobile: adiciona topo colorido ao card da Caixinha, alinhado ao padrão visual dos demais cards.

## 1.4.0.51 - 2026-07-13

- Lançamentos por foto: destaca Arquivo e Foto com as cores do sistema no Web e Mobile.
- Avisos rápidos: substitui os cards pretos por azul médio AvantaLab no Mobile e Controle de Ponto.

## 1.4.0.50 - 2026-07-13

- Lançamentos: torna a remoção de notas resiliente para não impedir a exclusão da despesa.
- Mobile: corrige a confirmação de exclusão no modo noturno e padroniza os botões Voltar e Excluir.

## 1.4.0.49 - 2026-07-13

- Cadastro: mantém as três ações em uma única linha.
- Notas e despesas mobile: reorganiza as ações, melhora o contraste de Ver nota e remove o botão Salvar redundante.
- Lançamentos: corrige a exclusão de despesas comuns e melhora a legibilidade da confirmação no modo noturno.
- Lançamentos por foto: inverte a ordem dos botões Arquivo e Foto.

## 1.4.0.48 - 2026-07-13

- Notas: informa “Baixando imagem” enquanto prepara a visualização do comprovante.
- Perfis e cadastro: adiciona estado pressionado aos botões de acesso e permite salvar inclusões parciais para concluir depois.

## 1.4.0.47 - 2026-07-12

- Lançamentos por foto: exibe um card de processamento acima de toda a interface durante a leitura da imagem no Web e Mobile.

## 1.4.0.46 - 2026-07-12

- Lançamentos Web/Mobile: adiciona leitura de notas por foto ou arquivo, preenchendo data, valor e sugestão de despesa.
- Notas: armazena comprovantes em bucket privado do Supabase, permite visualizar, compartilhar ou salvar e remove o arquivo junto com o lançamento.
- Mobile: atualiza o identificador do script para carregar imediatamente os controles em navegadores e PWA.

## 1.4.0.43 - 2026-07-12

- Ava Mobile: elimina o flicker da logomarca ao estabilizar o elemento do header e reutilizar a imagem já decodificada durante as ações do chat.
- Mobile: pré-carrega as variantes clara e escura da Ava no layout, reduzindo o atraso da primeira exibição.
- Admin: adiciona o saldo disponível da conta Asaas vinculada ao sistema no resumo de consumo.

## 1.4.0.42 - 2026-07-12

- Ava Mobile: header do chat passa a usar a logomarca específica para fundos claros ou escuros conforme o tema ativo.
- Login Web: adiciona o botão "Acessar pelo celular" e gera localmente um QR Code para abrir a versão mobile.
- Admin: adiciona a OpenAI API ao resumo de consumo, com custo oficial do mês via chave administrativa e acesso direto ao saldo no painel de Billing.

## 1.4.0.41 - 2026-07-12

- Configurações > Perfil: permite selecionar qualquer perfil vinculado em que o usuário seja Gestor Master ou Administrador e editar seu cadastro completo.
- Cadastro do perfil: reúne Dados Gerais, Endereço, Contato e Dados Fiscais em um card amplo, carregando os dados existentes para correção.
- Perfis: mantém credenciais do usuário separadas dos dados cadastrais da empresa e preserva a data original de conclusão ao salvar correções.
- Cadastro Web/Mobile: quando Empresa é selecionada, solicita Nome Fantasia e Responsável separadamente; email e senha permanecem vinculados exclusivamente ao usuário.
- Primeiro acesso Web/Mobile: cria automaticamente o primeiro perfil com o Nome Fantasia informado e vincula o usuário autenticado, eliminando a repetição do nome após o cadastro.
- Perfis: mantém o mesmo usuário apto a criar outros perfis ou ser vinculado a perfis existentes, sem criar credenciais próprias para a empresa.
- Banco: serializa a criação do primeiro perfil por usuário para impedir duplicidade entre Web e Mobile e mantém perfis existentes inalterados.
- Cadastro cadastral Web/Mobile: adiciona dados gerais, documento, endereço com busca por CEP, contato e dados fiscais, com preenchimento reaproveitado pela cobrança.
- Perfis: concede sete dias de tolerância, permite adiar durante o prazo e bloqueia o acesso incompleto somente após o vencimento; perfis antigos recebem sete dias a partir da implantação.
- Paywall: apresenta planos antes do formulário e só solicita o cadastro completo quando o usuário decide contratar; cupom e liberação administrativa mantêm a exigência após o prazo.
- Segurança: CNPJ é único, CPF pode se repetir, Autônomo aceita CPF e somente Gestor Master ou Administrador pode concluir o cadastro.

## 1.4.0.40 - 2026-07-12

- Login mobile: restaura o enquadramento vertical do background e garante distância responsiva mínima entre o logo e o card de acesso ou cadastro.
- Cadastro: substitui o checkbox pelo aviso de aceite implícito, preservando os links dos Termos de Uso e da Política de Privacidade e o registro do consentimento.
- Cadastro: posiciona a escolha Empresa/Pessoal antes do nome, formata automaticamente celulares brasileiros e compacta a altura do formulário.
- Login: mantém intactos o posicionamento e as dimensões atuais dos botões Entrar e Conectar com Google.

## 1.4.0.39 - 2026-07-11

- Web responsivo: transforma os controles ocultos do header em menu sanduíche acessível até `1279px`.
- Web responsivo: menu reduzido passa a reunir ano, navegação, agenda, avisos, calculadora, perfil, ajustes e sair.
- Web responsivo: em telas intermediárias, o menu abre abaixo do botão; no celular, mantém a gaveta lateral.
- Web responsivo: Ajustes abre em um card vertical à esquerda do menu sanduíche, usando o mesmo breakpoint `max-xl` para manter todas as opções acessíveis.

## 1.4.0.38 - 2026-07-11

- PWA: passa a iniciar no dashboard mobile em `/mobile`, mantendo landing e autenticação na rota principal.
- Mobile: quando não há sessão, `/mobile` retorna ao novo login em vez de exibir a tela de acesso legada.
- Mobile: após autenticar pela rota principal, celulares e o PWA seguem automaticamente para o dashboard mobile.

## 1.4.0.37 - 2026-07-11

- Landing mobile: deixa o header transparente no topo e ativa o fundo translúcido somente após iniciar a rolagem.
- Landing mobile: move a seta flutuante para uma camada global, impedindo que a hero a recorte antes do fim da página.

## 1.4.0.36 - 2026-07-11

- Mobile/Web: desativa a página legada `/mobile` e mantém landing, login e sistema na rota principal responsiva.
- Login: adiciona a opção de instalar o AvantaLab como aplicativo, com suporte ao prompt do navegador e instruções para instalação manual.
- PWA: substitui o service worker legado por uma versão sem cache de páginas antigas e mantém o suporte a notificações.
- Landing mobile: mantém a seta ativa após Dúvidas e reserva o último clique para alcançar o final real da página.
- Login mobile: reduz a altura do card, mantém seu topo abaixo do logo e posiciona Entrar e Conectar com Google lado a lado.
- Carregamento mobile: utiliza o background vertical mobile por imagem responsiva WebP/PNG desde o primeiro frame, inclusive em navegadores sem suporte completo a `image-set()`.
- Landing mobile: reduz altura, espaçamento e peso visual dos botões Entrar e Teste grátis no topo.

## 1.4.0.35 - 2026-07-10

- Web: reorganiza a hero da landing no mobile em tela cheia, exibe o menu compacto e adiciona seta para a área de demonstração do produto.
- Web: ajusta o ponto de rolagem dos botões Benefícios e Dúvidas no menu mobile da landing.
- Web: deixa a seta da hero mobile flutuante, translúcida e compacta a área de demonstração do produto.
- Web: mantém a seta mobile até o fim da página, suaviza sua transparência e remove sombras da segunda parte da hero.
- Web: seta mobile passa a avançar etapa por etapa pelos cards da landing.
- Web: ajusta as paradas da seta mobile da landing e compacta a faixa de confiança abaixo da hero.
- Web: suaviza as pílulas do menu mobile e distribui melhor o conteúdo da primeira tela da hero.
- Web: adiciona uma etapa final da seta mobile para rolar até o fim real da landing.
- Web: reduz e anima a seta mobile da landing, mantendo-a disponível até o fim real do scroll.
- Web: compacta os subcards de benefícios no mobile.
- Web: garante uma última etapa independente para a seta mobile alcançar o fim real da página e reorganiza os benefícios com ícone e título na mesma linha.

## 1.4.0.34 - 2026-07-10

- Web: compacta, reposiciona acima do logo do background e refina a transparência dos cards principais de carregamento.
- Web: no modo reduzido, o card Meus perfis passa a exibir o título curto "Perfis".

## 1.4.0.33 - 2026-07-10

- Web: cancelar a troca de perfil mantém o usuário no perfil atual em vez de voltar para a tela de login.

## 1.4.0.32 - 2026-07-10

- Web: placeholder de logomarca no header passa a abrir o card de inserção de logo quando ainda não há logo configurada.

## 1.4.0.31 - 2026-07-10

- Web: abertura da seleção de perfil fica imediata ao usar a lista já carregada, atualizando os perfis em segundo plano.

## 1.4.0.30 - 2026-07-10

- Relatórios: reduz a altura das linhas da Matriz Anual de Despesas para melhorar a densidade visual.

## 1.4.0.29 - 2026-07-10

- Gráficos: barras positivas e barras verdes passam a usar o tom fixo do EBITDA, sem depender da cor primária do perfil.

## 1.4.0.28 - 2026-07-10

- Gráficos: barra positiva de "Resultado Mensal" passa a usar a mesma cor primária aplicada no gráfico de EBITDA.

## 1.4.0.27 - 2026-07-10

- Ponto: adiciona calendário de dias não úteis da empresa para feriados, recesso, folga coletiva e dias fechados, evitando que essas datas contem como falta no web, mobile e relatórios.

## 1.4.0.26 - 2026-07-10

- Web: cards de carregamento passam a usar acabamento translúcido estilo liquid glass, mantendo o restante dos cards do sistema sem alteração.

## 1.4.0.25 - 2026-07-10

- Web: card "Meus perfis" remove a tarja da lista e passa a exibir o mês centralizado no header para ganhar espaço.

## 1.4.0.24 - 2026-07-10

- Web: modal "Gerenciar perfil financeiro" recebe acabamento visual mais profissional, com ações suavizadas e acentos no padrão AvantaLab.

## 1.4.0.23 - 2026-07-10

- Web: lista de perfis do card "Meus perfis" ganha tarja de separação entre cabeçalho e scroll.
- Web: área de scroll dos perfis passa a exibir botão circular para mostrar mais itens quando houver conteúdo abaixo.

## 1.4.0.22 - 2026-07-10

- Web: relatório aberto ao clicar em um perfil passa a exibir valores sempre, independente do estado de ocultar valores no card "Meus perfis".

## 1.4.0.21 - 2026-07-10

- Web: relatório de perfil passa a exibir gráfico de receitas x despesas dos últimos 6 meses com tooltip.
- Web: bloco "Receitas x despesas por perfil" ganha destaque com borda na cor primária.
- Web: card reduzido troca o rótulo "Resultado consolidado" por "Consolidado" para melhorar o encaixe.

## 1.4.0.20 - 2026-07-10

- Web: card "Meus perfis" recebe contagem e controle de valores no header.
- Web: resumo consolidado passa a destacar resultado, receitas e despesas na mesma linha.
- Web: lista de perfis fica limitada a três empresas visíveis, com scroll e rolagem automática ao arrastar.
- Web: clique em uma empresa volta a abrir o relatório detalhado do perfil.

## 1.4.0.19 - 2026-07-10

- Web: card "Meus perfis" fica mais compacto com subcards, barras e área de gráficos reduzidos sem perder legibilidade.

## 1.4.0.18 - 2026-07-10

- Web: gráficos do card "Meus perfis" passam a usar tooltip flutuante no mesmo padrão dos demais cards.
- Web: tooltip dos perfis respeita o controle independente de exibir ou ocultar valores.

## 1.4.0.17 - 2026-07-10

- Web: card "Meus perfis" ganha controle independente para exibir ou ocultar valores.
- Web: modo expandido do card "Meus perfis" fica mais compacto e passa a abrir os gráficos somente ao clicar em "Exibir gráficos".

## 1.4.0.16 - 2026-07-10

- Web: dashboard ganha o card "Meus perfis" no kanban, com resumo financeiro dos perfis vinculados ao usuário.
- Web: novo card segue os controles padrão do dashboard para arrastar, expandir/reduzir, ocultar e reexibir pelo organizador.

## 1.4.0.15 - 2026-07-10

- Mobile: confirmação de reset da Caixinha passa a usar card visual no padrão do sistema, com texto em português corrigido.
- Mobile: cancelar o reset fecha a confirmação e também remove a pílula do menu "...".

## 1.4.0.14 - 2026-07-10

- Mobile: menu "..." da Caixinha passa a exibir duas pílulas de ação: "- Ocultar card" e "- Resetar total".
- Mobile: reset da Caixinha pede confirmação, apaga o aporte inicial, remove movimentos da caixinha e exclui as despesas geradas pelos aportes.

## 1.4.0.13 - 2026-07-10

- Mobile: pílula "- Ocultar card" do menu "..." passa a ficar acima do escurecimento global, mantendo todo o restante da tela escurecido.

## 1.4.0.12 - 2026-07-10

- Mobile: menu "..." dos cards passa a escurecer a tela inteira, incluindo o header principal, deixando somente a pílula de ação em destaque.
- Mobile: card "Pergunte para a Ava" deixa de exibir o menu "...".
- Mobile: ação do balão passa a aparecer como pílula clicável com o texto "- Ocultar card".

## 1.4.0.11 - 2026-07-10

- Mobile: ao abrir o balão do menu "..." dos cards, todo o restante da tela fica escurecido como nos demais modais; apenas o balão permanece em destaque.

## 1.4.0.10 - 2026-07-10

- Mobile: fundo escurecido do menu "..." dos cards do resumo passa a ficar acima do header, no mesmo patamar dos popups.
- Mobile: card de Insights da Ava informa que as sugestões são atualizadas ao mudar dados ou mês.

## 1.4.0.09 - 2026-07-10

- Mobile: ao abrir o balão do menu "..." dos cards, o restante da dashboard escurece para reforçar o foco.
- Mobile: puxador de arraste dos cards ganhou contraste mais forte, alinhado ao botão "...".

## 1.4.0.08 - 2026-07-10

- Mobile: cards de Evolução de despesas e receitas passam a iniciar com o mês ativo selecionado.
- Mobile: fundo escurecido dos cards/modais foi intensificado para dar mais foco ao conteúdo aberto.
- Mobile: tocar na casinha já estando na dashboard rola a tela para o topo.
- Mobile: menu "..." dos cards passa a abrir um balão apontando para o botão, com ação "Ocultar card".

## 1.4.0.07 - 2026-07-09

- Web: campo de dia em lançamentos volta a permanecer vazio/manual ao abrir o card de despesa.
- Mobile: menu "..." dos cards do resumo reposicionado junto ao puxador de arraste, sem criar espaço fora do card.

## 1.4.0.06 - 2026-07-09

- Web e mobile: telefone confirmado por SMS no cadastro passa a ser aplicado automaticamente ao primeiro perfil financeiro, evitando nova confirmação por SMS no primeiro acesso.
- Segurança: SMS permanece necessário para redefinição de senha e para acessos antigos que ainda não possuem celular confirmado.

## 1.4.0.05 - 2026-07-09

- Web e mobile: novo lançamento passa a abrir com o dia atual preenchido e limpa esse dia automaticamente ao focar no campo.
- Mobile: rascunho do lançamento de despesa passa a ser preservado durante re-renderizações do modal.
- Mobile: modais de lançamento deixam de fechar ao tocar fora, evitando perda acidental de preenchimento.
- Mobile: cards do resumo ganham menu "..." com opção de remover bloco.
- Mobile: menus de organização dos cards foram renomeados para "Ordenar cards" e "Mostrar/ocultar cards".
- Web: card de Lançamentos Mensais passa a ter menu de opções e pode ser removido/restaurado pelo organizador.

## 1.4.0.04 - 2026-07-09

- Admin: card de Perfis passa a exibir a quantidade de usuários ativos/cadastrados, sem contar funcionários do Controle de Ponto.
- Mobile: contagem de usuários ativos removida do rodapé.

## 1.4.0.03 - 2026-07-09

- Web: nova landing page oficial em pagina cheia na porta do sistema, com hero, beneficios, secao da IA Ava, planos com precos anual/mensal, FAQ e CTAs que abrem direto a tela de criar cadastro.
- Web e mobile: deep link ?cadastro=1 abre direto a tela de criar cadastro (web em / e mobile em /mobile).
- Mobile: celular sem sessao passa a ver a landing responsiva em /; o redirect para /mobile ocorre apenas com sessao ativa ou ao tocar em Entrar/Teste gratis.
- Mobile: corrigida a trava visual em "Abrindo versao mobile..." ao entrar pela landing.
- Mobile: botao Entrar da landing abre direto a tela de login mobile.
- Mobile: card de cadastro compactado para melhorar o preenchimento em telas menores.

## Em desenvolvimento

- Web: lista de Organizar blocos do dashboard compactada e contida nas laterais do painel.
- Mobile: card "Pergunte para a Ava" passa a usar logos especificos por modo e fundo solido sem degrade.
- Web e mobile: card de Insights da Ava passa a alternar logos especificos para fundo claro e fundo escuro, com fallback para o logo atual.
- Web e mobile: card de Insights da Ava redesenhado com paleta Avanta/Ava, header branco no modo claro, header escuro no modo noturno e contraste corrigido no mobile.
- Web e mobile: inicio dos Insights da Ava no dashboard, com sugestoes contextuais sobre resultado, maiores gastos e Caixinha.
- Web e mobile: Caixinha ganha aporte inicial separado, sem gerar despesa ou alterar receitas, e inputs mobile deixam de causar zoom ao preencher.
- Mobile: pull-to-refresh passa a escurecer a tela com mais intensidade durante o carregamento.
- Web e mobile: Caixinha adicionada ao dashboard com saldo, aporte mensal e aporte que cria automaticamente um lancamento de despesa vinculado.
- Mobile/PWA: notificacoes push passam a exibir o nome do perfil financeiro quando o aviso pertence a uma empresa ou perfil especifico.
- Mobile: drag do kanban do dashboard passa a manter o card original invisivel e transparente no modo noturno e volta a rolar o container da tela durante o arraste.
- Web e mobile: exclusao de avisos passa a sincronizar imediatamente a lista e o badge entre as versoes.
- Cobranca: botao "Ja paguei - atualizar" consulta a Asaas sem sair da tela e libera o perfil assim que o pagamento for confirmado.
- Web e mobile: descricoes financeiras passam a usar capitalizacao inteligente, preservando siglas, conectivos e termos especiais.
- Mobile: header do card de confirmacao de exclusao de despesas alinhado ao raio e a faixa colorida do modal.
- Web: AvantaShell recebe contorno inferior no corpo para corrigir a borda do card de Lancamentos Mensais.
- Mobile: confirmação de exclusão de lançamento redesenhada como card visual no padrão do sistema, com resumo do item e ações claras.
- Web e mobile: total mensal de receita passa a substituir apenas a base do total; se houver receitas avulsas, o usuario escolhe entre apagar esses lancamentos ou manter e somar.
- Web e mobile: receita definida como total do mes passa a aparecer nas listas de lancamentos como item somente leitura quando nao estiver representada por entradas individuais.
- Mobile: placeholder de telefone padronizado e aceite de politicas reorganizado em duas linhas.
- Mobile: campos de login, cadastro e recuperacao de senha com contraste reforcado e card de cadastro mais proximo do topo.
- Landing: texto inicial refinado para reforcar gestao empresarial, seguranca e facilidade de uso.
- Landing: primeira abordagem reposicionada com chamada profissional e beneficios de ponto, IA, graficos, pagamentos programados, avisos e notificacoes.
- Legal: cadastro web e mobile passam a registrar aceite de Termos e Privacidade com versao, data/hora e origem.
- Legal: Termos de Uso e Politica de Privacidade reforcados com LGPD, bases legais, guarda, retencao, suboperadores, incidentes e direitos dos titulares.
- Web: botão Visual atualizado com ícone de personalizacao visual.
- Web: avisos visualizados deixam de aparecer no sininho; novidades de versão permanecem disponíveis em Sobre.
- Mobile: ajuste de contraste do botão Configuracoes no modo escuro e refinamento do arraste do Kanban com placeholder invisível e auto-scroll.
- Versionamento: ajustes grandes apos a 1.3.5 consolidados na linha 1.3.6.x, com micro ajustes na quarta casa.
- Admin: lista de perfis reorganizada com tipo, situacao e origem do acesso; acao Resetar removida da interface.
- Admin: Liberar passa a conceder cortesia com acesso ilimitado ou periodo definido, e Revogar aparece apenas para cortesia/cupom vigente.
- Cobranca: migracao adicionada para liberar todos os perfis existentes por cortesia sem prazo.
- Web: AvantaShell atualizado com silhueta frontal em SVG continuo, removendo a emenda visual da curva do plato.
- Web: AvantaShell separado da skin visual; o padrao passa a fornecer somente a modelagem do header/recorte.
- Web: card de Lancamentos Mensais do dashboard aplicado ao formato AvantaShell mantendo a paleta do sistema.
- Web: ajuste fino do AvantaShell no dashboard com header mais baixo, quina esquerda quadrada, borda esquerda restaurada e chapa de fundo com cor primaria esmaecendo para transparente.
- Web: ano do card de Lancamentos Mensais movido para o topo direito do header AvantaShell.
- Web: ajustes aprovados do AvantaShell consolidados em preset reutilizavel para aplicar o mesmo padrao em outros cards.
- Web e mobile: area de assinatura com plano, proximo vencimento, historico de faturas, segunda via, troca de ciclo e cancelamento da renovacao.
- Cobranca: carencia de tres dias para pagamentos vencidos, com aviso persistente ate pagamento ou cancelamento.
- Cobranca: cancelamento preserva o acesso ate o fim do periodo efetivamente pago.
- Cobranca: webhooks idempotentes, historico financeiro e conciliacao automatica com a Asaas.
- Ponto: respeita a situacao da assinatura da empresa, mantendo acesso durante a carencia.

## 1.3.5 - 2026-07-03

- Web: novo resumo diario do Controle de Ponto no dashboard.
- Web: Kanban do dashboard e graficos mais fluido e organizado.
- Mobile: sessao mais estavel com Manter conectado.
- Mobile: menu redesenhado, com novos icones, cores e controles.
- Mobile: modo escuro aprimorado, incluindo a adaptacao do card da Ava.
- Mobile: header renovado, com seletor de periodo mais legivel.
- Web e mobile: cards, popups e menus com a nova identidade visual assimetrica.
- Web e mobile: Ava e tutoriais atualizados com os recursos atuais do sistema.
- Web e mobile: diversas correcoes de navegacao, rolagem, animacoes e responsividade.
- Push: comunicados, agenda e despesas separados dos lembretes exclusivos do PWA Ponto.

## 1.3.4 - 2026-07-02

- Web e mobile: cadastro de despesas padronizado, com nomes de despesas e categorias em formato de frase e edicao disponivel na lista web.
- Web e mobile: avisos de receitas e despesas previstas permanecem visiveis ate confirmacao ou exclusao.
- Web: o sininho recebe em tempo real os avisos de despesas destinados a toda a empresa.
- Push: usuarios vinculados a varios perfis recebem os avisos de despesas de cada perfil em seus aparelhos inscritos.
- Web e mobile: o primeiro login tolera falhas transitorias ao carregar perfis sem encerrar uma sessao valida.
- Dashboard web: novo card de controle de ponto com atrasos, faltas e jornadas incompletas atualizados em tempo real.
- Novos perfis de empresa e pessoais recebem uma lista inicial de despesas totalmente editavel e excluivel.
- Mobile: arrastar cards do dashboard bloqueia temporariamente o gesto de puxar para atualizar.
- Mobile: o grafico por tipo de despesa permite abrir os lancamentos que compoem cada total.
- Web: os blocos de despesas de cada mes permitem consultar os lancamentos que compoem seus valores e percentuais.
- Ava mobile: chat fullscreen com cabecalho fixo, campo ajustado ao teclado, nova conversa e retorno ao dashboard sem recarregar.
- Admin: painel responsivo reorganizado, mensagens arquivaveis e historico de disparos.
- Ponto: lembretes opcionais de entrada e saida, enviados antes e no horario quando o registro estiver pendente.
- Web: ajustada a posicao do menu de Ajustes para acompanhar a altura reduzida do header principal.

## 1.3.1 - 2026-06-22

- Agenda web/mobile: exclusao sincronizada, confirmacao ao excluir no web e atualizacao em tempo real.
- /admin: disparo de avisos (push + sino) para todos os usuarios; sino do web passa a ler as notificacoes do Supabase.
- Ava (IA) atualizada para gpt-4o com prompt revisado; balao periodico de boas-vindas da Ava no web.
- Tutorial reescrito (desktop e mobile) com a Ava em destaque e recursos atuais.
- Correcoes mobile: campo coberto pelo teclado (Android), scroll de cards, menu de Configuracoes (rolagem e sub-botoes).
- Header web: indicador deslizante das abas; card do chat com header colorido.
- Troca de perfil no web com loading imediato.
- Limpeza: removido componente ChatIA nao utilizado.

## 1.3.0 - 2026-06-22

- Notificacoes push (PWA mobile): inscricao por aparelho, service worker, sino com contador de nao lidas e badge no icone; convite para ativar na primeira abertura.
- Agenda no servidor (Supabase) com disparo automatico diario de push para lembretes do dia; exclusao de lembretes e de ocorrencias unicas.
- Agenda sincronizada entre web e mobile (mesmo perfil compartilha os lembretes).
- Botao de notificacoes vira "Ativar / Desativar"; icones de Agenda e Notificacoes padronizados em SVG.

## 1.2.5 - 2026-06-21

- Cadastro de despesas (mobile): ao tocar numa despesa da lista para abrir as opcoes/editar, a lista interna mantem a posicao do scroll em vez de voltar ao topo. Corrige o container de rolagem correto (lista de despesas cadastradas dentro do modal).

## 1.2.4 - 2026-06-21

- Corrigido de fato o scroll do cadastro de despesas no mobile: ao tocar numa despesa para editar, a lista mantem a posicao (preserva o scroll do container interno do modal) em vez de voltar ao topo.

## 1.2.3 - 2026-06-21

- Corrigido o scroll da lista de despesas no mobile: ao abrir acoes ou editar um lancamento, a lista mantem a posicao em que estava em vez de voltar ao topo.

## 1.2.2 - 2026-06-21

- Ajustado aviso de confirmacao da importacao limpa do backup.
- Mobile passa a abrir no ultimo perfil financeiro selecionado pelo usuario.

## 1.2.1 - 2026-06-21

- Ajustada a escolha do modo de restauracao do backup para opcoes compactas com selecao por radio.

## 1.2.0 - 2026-06-21

- Restauracao de backup com escolha entre atualizar dados e importar copia limpa substituindo os dados financeiros pelo backup.
- Modo substituir protegido por confirmacao textual e ponto de restauracao antes da importacao.

## 1.1.4 - 2026-06-21

- Logo removida do conteudo do backup para evitar base64 truncado e erro no Excel.

## 1.1.3 - 2026-06-21

- Corrigido erro de limite de caracteres do Excel ao gerar ponto de restauração.

## 1.1.2 - 2026-06-21

- Corrigida importação de entradas no backup restaurado e mensagens de erro da restauração.

## 1.1.1 - 2026-06-21

- Corrigida seleção de arquivo na restauração de backup.

## 1.1.0 - 2026-06-21

- Backup completo em Excel estruturado para portabilidade e restauração.
- Importação conservadora de backup em modo adicionar dados ausentes.
- Geração de ponto de restauração antes da importação.

## 1.0.1 - 2026-06-21

- Corrigido espaçamento e destaque ativo do menu web no header.

## 1.0.0 - 2026-06-21

- Versão base oficial do AvantaLab Gestão.
- Sistema web e mobile com login, perfis financeiros, lançamentos, dashboard, relatórios e backup inicial.

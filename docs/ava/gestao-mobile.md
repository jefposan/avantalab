# Ava — Manual da Gestão Mobile

<!-- ava-version: 1.6.1.121 -->

> Revisão 1.6.1.121: ajuste do agendamento exclusivo do AvantaVendas; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.1.120: estabilização do retorno OAuth exclusiva da Gestão Web;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.119: depois da autenticação, **Preparando acesso** permanece
> como uma única tela até a Gestão estar pronta. A Gestão abre diretamente;
> verificações opcionais do Vendas e sincronizações complementares continuam
> em segundo plano.

> Revisão 1.6.1.118: no seletor de data de **Lançar aporte**, a data curta
> fica centralizada; sem mudança operacional.

> Revisão 1.6.1.117: no card **Caixinha**, o botão ao lado do olho recolhe o
> conteúdo após Saldo e Aportes no mês. **Lançar aporte** identifica os campos
> e o seletor visual de data mostra `dd/mm/aa`.

> Revisão 1.6.1.116: em **Ver lançamentos**, a data do aporte usa o formato
> curto; edição na própria linha permanece disponível na Gestão Web.

> Revisão 1.6.1.115: o aporte inicial da **Caixinha** fica recolhido até usar
> **Adicionar aporte inicial**. Depois, pode ser atualizado ou excluído. **Ver
> lançamentos** mostra os aportes normais com a data de cada um.

> Revisão 1.6.1.114: ao adicionar um aporte na **Caixinha**, a data começa em
> hoje e pode ser alterada. O sistema cria a despesa na data escolhida, sem
> usar o mês que está aberto no dashboard.

> Revisão 1.6.1.113: ao criar um perfil Empresa, escolha **Usar 7 dias
> grátis** para liberar o Business Pro ou **Assinar agora** para seguir à
> escolha do plano. Assinar agora não cria uma assinatura expirada.

> Revisão 1.6.1.112: Administrador e Operador Completo podem criar e consultar
> Pontos de restauração; somente Gestor Master restaura ou exclui um ponto.

> Revisão 1.6.1.111: Gestor Master encontra **Pontos de restauração** em
> **Menu > Configurações > Backup e restauração**. Os pontos preservam o estado
> completo do perfil e a restauração exige digitar **RESTAURAR**; o Excel
> continua sendo apenas o backup baixável.

> Revisão 1.6.1.110: o sininho avisa gestores e administradores sobre faturas
> recorrentes a vencer em 5, 2 e 0 dias e em atraso há 1, 3 e 7 dias. Tocar no
> aviso abre **Assinatura**; com as notificações do aparelho ativas, o mesmo
> aviso também chega por push.

> Revisão 1.6.1.109: ajuste de pesquisa exclusivo do AvantaVendas; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.1.108: no aplicativo iOS, o modal de assinatura informa
> quando os planos da App Store estão sendo carregados; sem mudança no fluxo
> operacional de compra ou restauração.

> Revisão 1.6.1.107.62.03: ajuste visual exclusivo das telas de acesso web;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.62.02: ajuste visual exclusivo da seleção de perfil no
> desktop; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.62.01: ajuste visual exclusivo do acesso web; sem impacto
> operacional na Gestão Mobile.

> Revisão 1.6.1.107.62: a Ava informa que a gravação de voz é opcional,
> depende da permissão do microfone e é convertida em texto para a conversa.

> Revisão 1.6.1.107.61: o card de identificação do menu preserva suas dimensões
> originais e remove a borda e a sombra lateral assimétricas; sem mudança operacional.

> Revisão 1.6.1.107.60: o card de identificação do menu recebeu um recuo
> lateral mínimo; sem mudança nas opções ou ações do menu.

> Revisão 1.6.1.107.59: no aplicativo iOS, o menu lateral começa abaixo da
> área segura superior; sem mudança nas opções ou ações do menu.

> Revisão 1.6.1.107.58: ajuste visual exclusivo da seleção de perfil no
> desktop; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.57: correção da retomada de contratação empresarial no
> Web; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.56: centralização exclusiva das cenas completas de
> carregamento no desktop; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.55: Google e Apple mantêm **Preparando acesso** com a
> ação de cancelamento também na rota direta; cancelar fecha o navegador
> seguro quando possível e devolve o login pronto.

> Revisão 1.6.1.107.54: correção da disponibilidade da ponte nativa de compras
> no iOS; contratação e restauração mantêm os mesmos passos operacionais.

> Revisão 1.6.1.107.53: login, recuperação, confirmação de celular, avisos e
> carregamentos usam a mesma cena visual de marca separada e card centralizado;
> sem alteração dos passos operacionais.

> Revisão 1.6.1.107.52: a contratação de assinatura pessoal foi simplificada;
> no iOS usa a App Store e no web/PWA encaminha ao checkout Asaas.

> Revisão 1.6.1.107.51: padronização visual das entradas de Controle de Ponto
> e Recebimentos Presenciais; sem mudança operacional na Gestão Mobile.

> Revisão 1.6.1.107.50: ajuste visual exclusivo do Recebimentos Presenciais;
> sem mudança operacional na Gestão Mobile.

> Revisão 1.6.1.107.49: atualização de cache do Controle de Ponto; sem
> mudança operacional na Gestão Mobile.

> Revisão 1.6.1.107.48: correção visual exclusiva do Controle de Ponto; sem
> mudança operacional na Gestão Mobile.

> Revisão 1.6.1.107.47: telas de acesso e preparação passaram a usar fundo sem
> marca incorporada e logotipo independente, sem alteração nos passos de login,
> cadastro, assinatura ou navegação.

> Revisão 1.6.1.107.46: cancelar a confirmação de Google ou Apple no
> aplicativo nativo restaura o login limpo, sem mostrar mensagens técnicas do
> OAuth no card de acesso.

> Revisão 1.6.1.107.45: após concluir Google ou Apple pelo navegador seguro,
> a Gestão Mobile prossegue na sessão confirmada sem recarregar a página; o
> card **Preparando acesso** não entra em ciclo.

> Revisão 1.6.1.107.44: no aplicativo iOS/Android, o retorno do Google pelo
> navegador seguro reconhece tokens recebidos tanto na query quanto no fragmento
> do deep link e conclui a mesma sessão OAuth usada no PWA.

> Revisão 1.6.1.107.43: os aplicativos iOS e Android iniciam diretamente na
> Gestão Mobile; sessão válida abre o sistema e, sem sessão, aparece o login.
> Pela landing, Entrar e Começar grátis abrem login e cadastro sem card
> intermediário de preparação.

> Revisão 1.6.1.107.42: a entrada pública móvel abre a Gestão Mobile. No
> aplicativo, Google e Apple retornam pelo navegador seguro e deep link; erro
> ou cancelamento restaura o login.

> Revisão 1.6.1.107.41: no aplicativo iOS, perfil Pessoal sem assinatura
> vigente abre **Menu > Assinatura** diretamente nos planos Mensal e Anual e em
> **Restaurar compras**. Quem já possui assinatura continua vendo seu resumo e
> as ações de gerenciamento da App Store.

> Revisão 1.6.1.107.40: no aplicativo nativo, o cadastro usa a mesma cena do
> login, com a marca separada e posicionada entre a área segura e o card. Sem
> mudança de campos, cadastro ou permissões.

> Revisão 1.6.1.107.39: a conta controlada de revisão da Apple acessa o perfil
> Pessoal demonstrativo sem bloqueios de cadastro ou assinatura. Em
> **Menu > Assinatura**, mensal, anual e restauração continuam disponíveis
> para validar a compra Sandbox.

> Revisão 1.6.1.107.38: no Menu, o card de identificação permanece fixo e a
> lista de opções rola sem barra visual; sem mudança de ações ou permissões.

> Revisão 1.6.1.107.37: **Excluir minha conta** está em Menu > Configurações,
> como última opção do grupo. A confirmação de exclusão permanece obrigatória.

> Revisão 1.6.1.107.36: card de cadastro no navegador foi reposicionado para
> preservar mais conteúdo visível; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.35: alinhamento visual do acesso web ao padrão mobile; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.34: correção de compactação no cadastro; somente os
> seletores **Empresa/Pessoal** foram reduzidos visualmente.

> Revisão 1.6.1.107.33: os seletores **Empresa/Pessoal** do cadastro foram
> reduzidos visualmente; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.32: refinamento visual dos placeholders de telefone e
> cupom, além do rótulo de tipo de perfil; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.31: os seletores **Empresa/Pessoal** do cadastro foram
> reduzidos visualmente; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.30: os seletores **Empresa/Pessoal** do cadastro foram
> compactados visualmente; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.29: o seletor ativo **Empresa/Pessoal** do cadastro usa o
> azul padrão AvantaLab; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.28: ajuste visual dos seletores de tipo de perfil no
> cadastro web; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.27: os placeholders compactos do cadastro foram reduzidos
> visualmente, sem alteração no preenchimento ou no fluxo de acesso.

> Revisão 1.6.1.107.26: no cadastro, os seletores **Empresa** e **Pessoal**
> usam a mesma altura visual compacta dos campos e das ações sociais; sem
> mudança de fluxo operacional.

> Revisão 1.6.1.107.25: o card de cadastro oferece **Cadastrar com Google** e
> **Cadastrar com Apple**. A autenticação cria ou acessa a conta-base e, quando
> necessário, o sistema solicita a conclusão dos dados do primeiro perfil. Os
> campos e a ação por SMS usam a mesma altura visual compacta dos botões sociais.

> Revisão 1.6.1.107.24: durante o login com Google ou Apple, **Preparando
> acesso** exibe **Cancelar e voltar ao login**. A ação encerra a tentativa e
> restaura a tela de login sem manter o estado Conectando.

> Revisão 1.6.1.107.23: no navegador comum, o card de cadastro não possui
> rolagem interna; ao abrir o teclado, a página inteira acompanha o campo
> ativo. Os campos Senha e Confirmar senha usam somente seus labels. O PWA
> instalado permanece com seu comportamento anterior. O campo de cupom exibe
> somente CUPOM.

> Revisão 1.6.1.107.22: o card e os controles indicados do cadastro foram
> estreitados. No navegador comum, o campo ativo permanece visível quando o
> teclado abre; o PWA mantém seu comportamento anterior. Campos, ações e regras
> de preenchimento permanecem iguais.

> Revisão 1.6.1.107.21: o cadastro passa a usar o mesmo fundo e posicionamento
> responsivo do logo da tela de login; sem mudança nos campos ou ações.

> Revisão 1.6.1.107.20: o card de login permanece centralizado horizontalmente.
> No cadastro, o seletor Empresa/Pessoal foi compactado e o cupom fica ao lado
> da ação azul para enviar o código por SMS. Na landing mobile, **Entrar** fica
> no header, entre o menu e **Começar grátis**, sem duplicação dentro do menu.

> Revisão 1.6.1.107.19: ao entrar pela landing no navegador móvel sem uma
> sessão ativa, a Gestão Mobile abre sua própria tela de login, sem retorno à
> página pública.

> Revisão 1.6.1.107.18: pelo navegador móvel, Entrar na landing abre diretamente
> a Gestão Mobile e o acesso social retorna à própria rota mobile.

> Revisão 1.6.1.107.17: no aplicativo iOS, o Pessoal Premium é contratado pela
> App Store, com restauração de compras e gerenciamento da assinatura Apple.
> Planos Business permanecem contratáveis somente na plataforma web. O menu
> também permite excluir a própria conta com confirmação explícita.

> Revisão 1.6.1.107.16: mensagem de meta atingida ajustada no AvantaVendas;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.15: o login atual da Gestão e do AvantaVendas foi
> formalizado no PADRÃO AVANTA 1.4.0; sem mudança operacional nesta versão.

> Revisão 1.6.1.107.14: exclusão da landing React antiga e consolidação da
> landing SEO oficial; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.13: o login social mantém somente um estado de preparação,
> com bloqueio de repetição e cancelamento; removidos estados antigos duplicados.

> Revisão 1.6.1.107.10: o carregamento visual é encerrado antes de aguardar a
> Promise do painel iOS; fechar a confirmação retorna com os botões disponíveis.

> Revisão 1.6.1.107.09: após abrir o painel seguro, Google e Apple voltam ao
> rótulo normal no card; dispensar a folha do iOS retorna a um login pronto.

> Revisão 1.6.1.107.08: Google e Apple usam um único estado de login social;
> dispensar o painel seguro restaura ambos os botões para nova tentativa.

> Revisão 1.6.1.107.07: fechar ou dispensar o painel seguro de Google ou Apple
> limpa o login pendente e retorna à tela de acesso pronta para nova tentativa.

> Revisão 1.6.1.107.06: retorno automático do OAuth da Gestão Web/PWA; sem
> impacto operacional na Gestão Mobile nativa.

> Revisão 1.6.1.107.05: o Vendas também permite cancelar o login social
> pendente; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.04: se o login por Google ou Apple for cancelado no
> aplicativo, a pessoa retorna à tela de acesso sem permanecer em preparação.

> Revisão 1.6.1.107.03: o tema escuro salvo do AvantaVendas não se aplica às
> telas públicas de entrada; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107.02: a entrada também oferece **Continuar com Apple**. O
> fluxo usa a mesma conta AvantaLab e não altera e-mail, telefone ou Google.

> Revisão 1.6.1.107.01: botão de localização no card sem endereço do
> AvantaVendas; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.107: celebração de meta e preenchimento de endereço por
> localização adicionados ao AvantaVendas; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.106: a Ava orienta somente recursos efetivamente plugados ao
> sistema publicado; projetos em desenvolvimento ficam fora do guia.

> Revisão 1.6.1.105: contraste automático nos cards de seleção de perfil;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.104: links públicos de soluções foram ampliados; sem impacto na orientação da Ava.
>

> Revisão 1.6.1.103: refinamento de rastreamento público; sem impacto na orientação da Ava.
>

> Revisão 1.6.1.102: regras públicas de rastreamento foram esclarecidas; sem impacto na orientação da Ava.
>

> Revisão 1.6.1.101: páginas públicas de SEO foram adicionadas; sem impacto na orientação da Ava.
>

> Revisão 1.6.1.100: SEO público foi refinado; sem impacto na orientação da Ava.
>

> Revisão 1.6.1.99: rolagem pública foi alinhada entre CTAs e menu; sem
> impacto na orientação da Ava.
>

> Revisão 1.6.1.98: comprovantes de Recebimentos também exigem assinatura
> vigente; sem impacto na orientação da Ava.
>

> Revisão 1.6.1.97: o login do Controle de Ponto exige módulo instalado e
> assinatura empresarial vigente; sem impacto na orientação da Ava.
>

> Revisão 1.6.1.96: remover o módulo Vendas Mobile desfaz os vínculos de
> equipe e o destino financeiro, preservando os dados pessoais; sem impacto na Ava.
>

> Revisão 1.6.1.95: o Recebimentos Presenciais exige módulo instalado e
> assinatura empresarial vigente; sem impacto na orientação da Ava.
>

> Revisão 1.6.1.94: mudanças de plano atualizam a cobrança pendente para
> manter o acesso e o valor contratados alinhados; sem impacto na orientação da Ava.
>

> Revisão 1.6.1.93: o gestor Business pode migrar a assinatura para Business
> Pro no painel, preservando o ciclo; sem impacto na orientação da Ava.
>

> Revisão 1.6.1.92: módulos exigem plano empresarial; no Business Pro a
> instalação é sem cobrança e no Business há assinatura mensal.
> sem impacto operacional até a ativação da cobrança no Gestão Mobile.
>
> Revisão 1.6.1.81: a progressão comercial entre planos foi esclarecida na
> página pública; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.80: preços anuais apresentados na página pública foram
> atualizados; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.79: refinamento de texto público do Business Pro; sem impacto
> operacional na Gestão Mobile.
>
> Revisão 1.6.1.78: refinamento visual do CTA público do Business Pro; sem
> impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.77: a página pública destaca o teste de 7 dias do Business Pro;
> sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.76: comunicação pública de planos e chamadas atualizadas; sem
> impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.75: refinamento de altura e navegação da página pública; sem
> impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.74: correção técnica dos estilos públicos de planos; sem
> impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.73: a comunicação comercial pública dos planos foi atualizada;
> sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.72: a página pública recebe o botão oficial de próxima rolagem;
> sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.71: refinamento tipográfico da seção pública de planos; sem
> impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.70: destinos do menu público são alinhados pelo conteúdo
> visível da seção; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.69: a rolagem do menu público passa a compensar o header fixo;
> sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.68: a navegação interna da página inicial em prévia recebe
> rolagem suave; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.67: página inicial em prévia passa a apresentar IA Ava e planos
> públicos; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.66: páginas públicas de informações passam a usar o logotipo
> oficial no cabeçalho; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.65: a Central de Suporte passa a oferecer retorno à página
> inicial; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.64: o retorno das páginas legais passa a usar a expressão
> Página inicial; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.63: páginas legais passam a oferecer retorno à Landing; sem
> impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.62: Landing em prévia recebe navegação mobile acessível,
> melhorias de acessibilidade nas calculadoras e Política de Cookies; sem
> impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.61: o painel ilustrativo da Landing em prévia passa a usar
> gráfico de barras de receitas e despesas; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.60: o conteúdo do balão demonstrativo da Ava na Landing em
> prévia foi centralizado verticalmente; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.59: o balão demonstrativo da Ava na Landing em prévia apresenta
> uma pergunta de saldo mensal; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.58: o balão demonstrativo da Ava no painel da Landing em prévia
> utiliza o arquivo oficial do logotipo; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.57: o card da IA Ava na Landing em prévia utiliza o arquivo
> oficial do logotipo; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.56: em Receitas > Definir total, a referência Total mensal é
> persistida. O botão de exclusão aparece somente com essa etiqueta e remove
> somente o total, preservando receitas avulsas.

> Revisão 1.6.1.55: a Landing em prévia aplica o ícone institucional da IA Ava;
> sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.54: a Landing em prévia passa a divulgar Controle de Ponto e
> importação de despesas por faturas ou extratos; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.53: o texto institucional da Landing em prévia identifica a Ava
> como assistente de IA; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.52: a Landing em prévia passa a apresentar links públicos para
> Termos de Uso e Política de Privacidade; sem impacto operacional na Gestão Mobile.
>
> Revisão 1.6.1.51: os exemplos das calculadoras públicas passaram a ser
> placeholders, sem impacto operacional nos fluxos do Gestão Mobile.
>
> Revisão 1.6.1.50: a Landing em prévia inclui simulador público para financiar
> carro ou casa; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.49: o header da Landing em prévia sobrepõe o hero e o logo volta
> ao início; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.48: o header da Landing em prévia passa a ser transparente no
> topo; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.47: a troca de calculadora na Landing não desloca a página em
> telas amplas; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.46: a calculadora pública de CDI atualiza a Taxa DI pela série
> oficial do Banco Central; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.45: a Landing em prévia passa a oferecer calculadoras públicas
> de simulação; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.44: efeitos e backgrounds da prévia da Landing foram
> restaurados; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.43: adicionadas prévias públicas da Landing e da central de
> Calculadoras; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.42: ajuste visual no botão Desvincular perfil financeiro do
> AvantaVendas; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.41: refinamento de hover no Relatório Contábil da Gestão Web;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.40: contraste e hover do Relatório Contábil na Gestão Web;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.39: destaque do seletor de funcionário no relatório web do
> Controle de Ponto; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.38: Faltas no período integrado ao card de pontualidade no
> relatório web do Controle de Ponto; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.37: alinhamento do seletor de ano no relatório web do Controle
> de Ponto; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.36: nova compactação dos controles no relatório web do Controle
> de Ponto; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.35: compactação dos controles no relatório web do Controle de
> Ponto; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.34: centralização de Faltas no período no relatório web do
> Controle de Ponto; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.33: centralização do card de pontualidade no relatório web do
> Controle de Ponto; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.32: organização dos filtros no relatório web do Controle de
> Ponto; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.31: resumo de pontualidade no relatório web do Controle de
> Ponto; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.30: ajuste de cor do hover nos relatórios do Controle de Ponto;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.29: destaque ao passar o mouse nos relatórios do Controle de
> Ponto; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.28: listagem de faltas no relatório web do Controle de Ponto;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.27: compactação responsiva da Conferência na administração web
> de Recebimentos Presenciais; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.26: responsividade e estorno ampliado na administração web de
> Recebimentos Presenciais; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.25: em **Usuários**, a exclusão apaga uma conta interna somente
> quando não existe outro vínculo, perfil ou histórico; contas preservadas
> continuam pesquisáveis por e-mail ou login em **Adicionar usuário existente**.

> Revisão 1.6.1.24: explicações do card Saldo do mês aplicadas somente à Gestão
> Web; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.23: o campo **Valor** da edição de despesas fixas segue o padrão
> monetário do sistema, exibindo reais com duas casas decimais.

> Revisão 1.6.1.22: em Gerenciar despesas fixas, Salvar permanece ativo depois
> da interação com os campos, mostra **Salvando…** durante a gravação e fecha
> somente o formulário editado após a confirmação, mantendo o card principal
> aberto e atualizado.

> Revisão 1.6.1.21: ao editar uma despesa ou receita, o valor do campo **Dia**
> aparece centralizado horizontalmente; sem mudança no preenchimento ou na
> validação da data.

> Revisão 1.6.1.20: o card **Lançamentos a confirmar** mostra despesas e
> receitas previstas somente durante a data programada. Ao terminar o dia, o
> aviso desaparece, mas o lançamento continua previsto na Agenda e nos
> controles financeiros.

> Revisão 1.6.1.19: ao tocar em um campo textual editável já preenchido, o
> cursor vai para o final do conteúdo. A seleção intencional de um trecho por
> gesto longo permanece disponível.

> Revisão 1.6.1.18: o login identifica o campo de acesso como **E-mail ou
> login**, preservando também a alternativa por telefone. A correção do card
> Editar usuário permanece restrita à Gestão Web.

> Revisão 1.6.1.17: ao criar ou editar um usuário, e-mail e login são
> verificados no servidor. Se houver erro, todos os campos permanecem
> preenchidos e o cursor vai ao campo indicado. O acesso aceita e-mail ou
> login.

> Revisão 1.6.1.16: em Usuários, criar e editar exigem nome completo, e-mail
> real, login e tipo de usuário. A senha é obrigatória somente na criação. O
> acesso aceita e-mail ou login; uma conta existente deve ser vinculada pelo
> fluxo próprio.

> Revisão 1.6.1.15: no cadastro empresarial mobile, CNPJ e **Buscar** ficam
> lado a lado. A consulta preenche campos compatíveis ainda vazios, preserva os
> existentes e mantém Responsável em Contato, antes de Site e Instagram.

> Revisão 1.6.1.14: renovação de cache restrita à Gestão Web; sem impacto
> operacional na Gestão Mobile.

> Revisão 1.6.1.13: reorganização do cadastro empresarial da Gestão Web; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.1.12: ação explícita de pesquisa de CNPJ adicionada à etapa
> obrigatória da Gestão Web; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.1.11: em Usuários, os campos informam Nome completo e permanecem
> preenchidos quando há erro de validação, conexão ou servidor. Nome, login e
> perfil formam um rascunho temporário por usuário e perfil; a senha permanece
> apenas em memória e nunca é armazenada no navegador.

> Revisão 1.6.1.09: Preparando acesso só conclui os 100% depois que a tela
> principal estiver montada. Se o PWA for suspenso ou perder conexão durante a
> abertura, retornar ao aplicativo retoma a conclusão; uma versão antiga ainda
> aberta é atualizada antes de prosseguir.

> Revisão 1.6.1.08: reposicionamento do card de login apenas na Gestão Web; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.1.07: as subpastas pertencentes à pasta selecionada em Conteúdo
> do Vendas > Divulgação recebem o mesmo destaque em intensidade menor,
> facilitando a identificação do ramo ativo. O AvantaVendas também passa a
> navegar entre arquivos por gesto horizontal.

> Revisão 1.6.1.06: no visualizador da Divulgação, arraste para a esquerda para
> abrir o próximo material e para a direita para voltar ao anterior. Setas
> laterais e contador mostram as demais opções de navegação.

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

> Revisão 1.6.1.01: em Conteúdo do Vendas > Divulgação, selecionar uma pasta
> exibe junto dela a ação Enviar arquivos para esta pasta, que aceita fotos e
> vídeos nos mesmos formatos disponíveis na Gestão Web.

> Revisão 1.6.1: ao vir do AvantaVendas, a Gestão sempre apresenta a seleção de
> perfil. Se ainda não houver perfil financeiro, oferece criar ou ativar um sem
> vinculá-lo automaticamente como destino dos resultados do Vendas.

> Revisão 1.6.0.84.148: validação de sessão no refresh da Gestão Web; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.147: cadastros de conta e perfil pessoal exigem nome e
> sobrenome; a mesma regra vale nos módulos de pessoas administrados na Gestão.

> Revisão 1.6.0.84.146: reorganização do cadastro detalhado na Gestão Web; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.145: ampliação do card de usuários na Gestão Web; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.144: formatação dos campos de vínculo comercial no Vendas
> Mobile; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.127: validação de linhas incompletas no importador da Gestão
> Web; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.126: lista dinâmica de tipos no modelo Excel da Gestão Web;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.125: modelo Excel para importação na Gestão Web; sem impacto
> operacional na Gestão Mobile.

> Revisão 1.6.0.84.124: correção de camada do visualizador de comprovantes no
> popup web de Recebimentos Presenciais; sem impacto operacional na Gestão
> Mobile.

> Revisão 1.6.0.84.123: responsividade da busca de Perfis do Avanta Admin; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.122: identidade PWA própria do console Avanta Admin; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.121: forma de pagamento e comprovante privado no PWA
> independente de Recebimentos Presenciais; sem impacto operacional na Gestão
> Mobile.

> Revisão 1.6.0.84.120: persistência das preferências do AvantaVendas no
> servidor; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.119: confirmações e avisos operacionais usam cards do
> sistema. Fechar, tocar fora, pressionar Esc ou escolher **Voltar sem excluir**
> nunca remove dados. Em parcelamentos, a escolha distingue **somente esta** e
> **todas**; em despesa fixa, distingue **somente este mês** e **Abrir despesas
> fixas**.

> Revisão 1.6.0.84.118: tipos de despesa cadastrados ou renomeados entram
> imediatamente em ordem alfabética. Inclusões, edições e exclusões atualizam
> também a Gestão Web aberta no mesmo perfil.

> Revisão 1.6.0.84.117: ao excluir o total de receitas do mês, o aviso
> formatado informa se as receitas avulsas serão preservadas ou se o total será
> zerado. **Cancelar** não altera os dados; **OK** confirma a exclusão do total
> definido.

> Revisão 1.6.0.84.116: perfis com cortesia ou cupom mantêm no painel de
> assinatura apenas a identificação da situação e do plano; preços e opções de
> contratação não são exibidos enquanto essa liberação estiver ativa.

> Revisão 1.6.0.84.115: **Menu > Assinatura** sempre abre o resumo do perfil.
> Situação e tipo de plano aparecem para assinatura, cortesia, cupom, teste,
> teste expirado e cancelamento. Valor, próximo vencimento e faturas aparecem
> somente quando existe assinatura contratada; sem contrato, a tela oferece a
> Assinatura Pessoal ou Empresa correspondente ao perfil.

> Revisão 1.6.0.84.114: ao definir o total de receitas em um mês que já possui
> receitas avulsas, o aviso formatado mantém as mesmas escolhas: **Cancelar**
> preserva as receitas e soma o total; **OK** apaga as avulsas e mantém somente
> o total informado.

> Revisão 1.6.0.84.113: estabilização do topo e do menu inferior no
> AvantaVendas; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.112: o preenchimento de lançamentos mantém o campo e o
> teclado ativos enquanto informações secundárias são atualizadas em segundo
> plano.

> Revisão 1.6.0.84.111: novo ícone de instalação do PWA AvantaVendas; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.110: desconto concedido nos comprovantes do AvantaVendas;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.109: contraste dos itens bonificados no AvantaVendas; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.108: restauração do comportamento visual anterior aos
> ajustes experimentais de compatibilidade Android; sem mudança operacional.

> Revisão 1.6.0.84.107: limite do importador de extratos e faturas da Gestão
> Web; tickets e notas por imagem no Mobile permanecem sem franquia mensal.

> Revisão 1.6.0.84.104: otimização de custo do Importador da Gestão Web; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.102: Assinatura passa a ser o primeiro botão do Menu, fora
> de Configurações. Sem acesso vigente, abre o card Premium; com assinatura,
> cortesia administrativa, cupom, teste ou outra liberação válida, mantém o
> painel com plano, faturas e renovação. A ação Ir para assinatura abre
> diretamente a contratação. Quando Ocultar card é bloqueado pelo Premium,
> fecha somente o menu da ação e mantém o card no dashboard.

> Revisão 1.6.0.84.101: quando o Premium Pessoal deixa de estar vigente, o
> Vendas fica temporariamente inacessível e sua receita consolidada deixa de
> compor a Gestão. O módulo e todos os dados permanecem preservados; ao reativar
> a assinatura ou cortesia, acesso e receita retornam automaticamente.

> Revisão 1.6.0.84.100: no perfil Pessoal gratuito, recursos Premium aparecem
> sem cor e levam ao aviso de assinatura. Agenda e Ir para Vendas também exigem
> Premium; Conteúdo do Vendas aparece somente em perfil Empresa autorizado.

> Revisão 1.6.0.84.99: remoção do preview legado e ajustes visuais em
> Recebimentos; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.98: visibilidade padronizada nos campos de senha de
> Recebimentos; sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.97: paginação completa dos lançamentos em Recebimentos;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.96: controle de visibilidade da senha no PWA de Recebimentos;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.95: distribuição iOS limitada a iPhone nesta fase; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.94: ao chegar pelo AvantaVendas, a Gestão permanece na
> janela instalada do PWA, sem abrir a interface do navegador.

> Revisão 1.6.0.84.93: rótulo estável do botão de ordem no AvantaVendas; sem
> impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.92: o nome do perfil ativo permanece identificado abaixo do
> cabeçalho; durante a rolagem, a pílula fica 75% transparente e volta a ficar
> totalmente visível ao retornar ao topo.

> Revisão 1.6.0.84.91: refinamento da navegação e dos planos na landing pública;
> sem impacto operacional na Gestão Mobile.

> Revisão 1.6.0.84.90: ajuste visual da landing pública; sem impacto operacional
> na Gestão Mobile.

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
- **Assinatura** é o primeiro item do **Menu**. A tela sempre informa a situação
  e o tipo do plano. Valor contratado, próximo vencimento e faturas são
  exclusivos de uma assinatura recorrente; cortesia, cupom, teste, teste
  expirado e perfis sem contrato não exibem dados financeiros. Durante uma
  cortesia ou cupom ativo, também não aparecem preços nem opções de contratação.
  Nos demais casos sem contrato, a tela oferece **Assinatura Pessoal** ou
  **Assinatura Empresa** conforme o perfil. Usuários sem permissão devem solicitar
  a contratação a um gestor ou administrador.
- Em **Configurações**, os controles com chave aparecem primeiro.
  **Gerenciar perfil**, **Usuários** e **Editar dados cadastrais** aparecem em
  sequência; **Excluir minha conta** é a última opção e exige digitar
  **EXCLUIR** antes da confirmação.
- Em **Usuários**, criar exige Nome completo, E-mail, Login, Senha inicial e
  Tipo de usuário. Na edição, nome, e-mail, login e tipo continuam obrigatórios,
  mas a nova senha é opcional. E-mail e login acessam a mesma conta; se o e-mail
  já existir, use **Adicionar usuário existente**. Antes de salvar, o servidor
  verifica e-mail e login; um erro mantém os campos e leva o cursor ao dado que
  precisa ser corrigido.
- Ao excluir um usuário criado dentro do perfil, o login é apagado
  definitivamente apenas quando não há outro perfil, vínculo ou histórico.
  Caso contrário, somente o acesso atual é removido e a conta permanece
  disponível em **Adicionar usuário existente**.
- Em **Editar dados cadastrais** e na conclusão obrigatória de um perfil Empresa,
  o CNPJ fica ao lado de **Buscar**. A consulta cadastral preenche somente os
  campos compatíveis que estiverem vazios e informa quantos dados existentes
  foram preservados. Razão Social, Nome Fantasia e Tipo de Empresa aparecem
  depois do documento; Responsável fica em Contato, antes de Site e Instagram.
- Depois do login, a rota da Gestão abre diretamente a própria Gestão. Com o
  módulo Vendas Mobile ativo e permissão, **Menu > Ir para Vendas** e o atalho
  de mesmo nome abrem o outro sistema.
- Em **Preparando acesso**, a etapa **Acesso pronto** e os 100% somente são
  concluídos depois que a tela principal estiver montada. A verificação do
  Vendas e as sincronizações complementares continuam em segundo plano, sem
  reconstruir repetidamente o painel. Ao voltar de uma suspensão do PWA
  ou recuperar a conexão, o aplicativo retoma a abertura e verifica se a versão
  ainda é atual. Se a preparação ficar sem progresso por tempo anormal, realiza
  uma única reconexão automática; persistindo a falha, exibe **Tentar novamente**
  sem entrar em ciclo de recargas.
- Dentro da Gestão, **Menu > Ir para Vendas** consulta o estado atual do módulo
  no servidor para não solicitar uma ativação que já tenha sido concluída.
- Quando a Gestão é aberta pelo AvantaVendas instalado, a troca permanece na
  mesma janela em modo aplicativo, sem barras de endereço ou atalhos do
  navegador.
- Se o usuário chegar pelo AvantaVendas sem nenhum perfil financeiro, a Gestão
  abre a criação do primeiro perfil. Depois de criá-lo, solicita confirmação
  para usá-lo como destino financeiro do AvantaVendas; confirmando, o vínculo é
  salvo no servidor. Recusar não apaga o perfil e permite configurar o destino
  depois no Vendas.
- Em um perfil sem o módulo instalado, **Ir para Vendas** continua disponível para
  Gestor Master ou Administrador. Ao tocar, o sistema solicita a ativação, confirma
  o salvamento no servidor e segue para o Vendas. Em perfil pessoal gratuito, a
  ativação exige primeiro o Premium.
- No perfil Pessoal gratuito, os recursos Premium aparecem sem cor, mas continuam
  tocáveis para explicar o bloqueio e oferecer **Ir para assinatura**. O aviso
  mostra primeiro a contratação; a lista completa fica recolhida em **Veja os
  recursos adicionais**. **Agenda** e **Ir para Vendas** exigem Premium ou
  cortesia vigente.
- **Conteúdo do Vendas** aparece somente em perfil Empresa com o módulo ativo e
  permissão de Gestor Master, Administrador ou Operador Completo.
- A instalação é salva separadamente em cada perfil da Gestão. Depois de ativada,
  não volta a ser solicitada enquanto o módulo permanecer instalado. Essas
  permissões não criam outras contas no Vendas: cada usuário possui uma única
  conta operacional.
- **Ir para Vendas** também pode ocupar um dos atalhos configuráveis da barra
  inferior, inclusive antes da ativação. Operadores veem o botão lateral inativo e
  não recebem permissão para ativar ou trocar de sistema.
- Ao escolher Vendas, a conta única do usuário abre diretamente. O destino
  financeiro pode ser confirmado na criação do primeiro perfil vindo do Vendas
  e continua configurável em **Configurações > Integração com Gestão**.
- A ordem/visibilidade dos cards do dashboard é ajustada em **Menu > Organizar
  resumo** ou **Organizar dashboard**.
- Em **Gerenciar perfil**, o usuário pode administrar seus perfis conforme a
  permissão. Tocar em um perfil pode apenas destacá-lo; a troca efetiva usa o
  controle de troca já exibido no app.
- Valores podem iniciar ocultos pelo ícone de olho, conforme a privacidade salva.

## Lançamentos e agenda

- Para cadastrar ou revisar despesas e categorias: **Menu > Cadastrar despesas**.
- Novos tipos de despesa entram imediatamente em ordem alfabética nas listas e
  seletores. Alterações feitas no Mobile atualizam a Gestão Web aberta no mesmo
  perfil, e as alterações da Web atualizam o Mobile.
- Nos cards **Despesas do mês** e **Receitas do mês**, tocar na lupa abre a busca
  já focada e pronta para digitação.
- O app registra receitas, despesas, despesas futuras, parcelamentos e despesas
  fixas. Previsto só se torna lançamento confirmado após a ação do usuário.
- Durante o preenchimento de um lançamento, atualizações secundárias aguardam o
  fim da edição para atualizar a tela sem fechar o teclado ou apagar o conteúdo.
- Ao usar **Receita > Definir total** em um mês com receitas avulsas,
  **Cancelar** preserva essas receitas e soma o total informado; **OK** apaga
  as receitas avulsas e mantém somente o total.
- Ao excluir o total definido do mês, **Cancelar** não altera os dados; **OK**
  preserva as receitas avulsas existentes ou zera o mês quando não houver
  receitas lançadas.
- Os avisos e confirmações aparecem em cards do sistema. Fechar, tocar fora,
  pressionar Esc ou escolher **Voltar sem excluir** cancela sem remover dados.
  Em parcelas, a exclusão distingue **somente esta** e **todas**. Em despesa
  fixa, distingue **somente este mês** e **Abrir despesas fixas**.
- Recorrências inteiras são alteradas em **Despesas fixas**; uma edição direta da
  linha mensal não altera os outros meses.
- A agenda exibe lembretes e compromissos. Puxar para atualizar exige gesto longo
  e conexão ativa.

## Conta e limites

- No aplicativo Android/iOS, **Continuar com Google** ou **Continuar com Apple**
  abre o navegador seguro do sistema. Ao concluir, o AvantaLab reabre
  automaticamente; ao cancelar, o usuário pode tentar novamente na tela de
  login. No PWA, o retorno permanece na própria Gestão Mobile.
- Na conversa com a Ava, tocar no microfone solicita a permissão do aparelho e
  inicia a gravação. Ao encerrar, o áudio é enviado para transcrição e a
  mensagem resultante segue como texto. Se a permissão for negada, a conversa
  continua disponível pelo campo de texto.
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

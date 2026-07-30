# Ava — Manual da Gestão Mobile

<!-- ava-version: 1.6.1.107.21 -->

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
  sequência.
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
- Quando o módulo Vendas Mobile está ativo e o usuário tem permissão, após o login
  a primeira tela permite escolher entre Gestão e Vendas e memorizar a preferência. Só
  depois da escolha aparece **Preparando acesso** e o sistema selecionado é carregado.
- Em **Preparando acesso**, a etapa **Acesso pronto** e os 100% somente são
  concluídos depois que a tela principal estiver montada. As sincronizações
  complementares continuam em segundo plano. Ao voltar de uma suspensão do PWA
  ou recuperar a conexão, o aplicativo retoma a abertura e verifica se a versão
  ainda é atual. Se a preparação ficar sem progresso por tempo anormal, realiza
  uma única reconexão automática; persistindo a falha, exibe **Tentar novamente**
  sem entrar em ciclo de recargas.
- Dentro da Gestão, **Menu > Ir para Vendas** abre diretamente o Vendas Mobile; a
  tela com as duas opções é exibida somente na entrada após o login. Ao tocar, a
  Gestão consulta o estado atual do módulo no servidor para não solicitar uma
  ativação que já tenha sido concluída.
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

# Changelog

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

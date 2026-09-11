# Changelog

## 1.33.0.02 - 2026-09-11
- **Sincronização visível no AvantaVendas**: o cabeçalho mostra a rede riscada
  somente quando o aparelho está offline e apresenta a quantidade real de
  pedidos, clientes ou recebimentos aguardando envio. Ao tocar no indicador,
  a pessoa vê cada alteração pendente; a contagem desaparece à medida que o
  servidor confirma os itens.

## 1.33.0.01 - 2026-09-11
- **Centros de custo opcionais**: cada perfil financeiro pode ativar a
  separação de despesas, cadastrar centros por nome ou número e escolher o
  destino dos novos lançamentos avulsos, parcelados e fixos.
- **Resumo por centro**: o Dashboard passa a exibir as despesas realizadas de
  cada centro no mês, sem mover ou alterar lançamentos já existentes.

## 1.33.0 - 2026-09-11
- **PWAs preparados para falta de sinal**: Operações de Campo mantém, por até
  30 dias após o último acesso autorizado, os dados necessários para registrar
  Recebimentos e Serviços sem conexão. Cada atendimento fica protegido no
  aparelho e é enviado automaticamente ao servidor ao reconectar.
- **Sem duplicidade na sincronização**: recebimentos, comprovantes e serviços
  recebem uma chave idempotente; uma resposta perdida ou uma nova tentativa não
  cria um segundo lançamento nem uma segunda assinatura.
- **Acesso offline no AvantaVendas**: a última conta autorizada e os dados já
  sincronizados continuam disponíveis sem rede pelo mesmo período. A fila
  existente de clientes, pedidos e pagamentos volta a enviar as pendências
  assim que a sessão puder ser renovada.

## 1.32.0.03-av147 - 2026-09-11
- **Ícone Pix corrigido**: o comprovante de pagamento passa a usar uma marca
  vetorial proporcional e preenchida, sem cruzamentos ou deformação no tamanho
  de compartilhamento. Recursos PWA renovados para receber o refinamento.

## 1.32.0.03 - 2026-09-11
- **Símbolo de pagamento refinado**: a indicação de Pix no comprovante ficou
  mais nítida, equilibrada e distinguível dos demais meios de pagamento.

## 1.32.0.02-av146 - 2026-09-11
- **Recursos do AvantaVendas**: cache renovado para entregar o novo comprovante
  de pagamento também a instalações PWA já existentes.

## 1.32.0.02 - 2026-09-11
- **Comprovante de pagamento mais direto**: saldo anterior passa a ser uma
  informação própria, sem o título incorreto de Resumo financeiro.
- **Forma junto ao lançamento**: valor recebido, forma de pagamento e eventual
  desconto ficam no mesmo painel azul. O ícone se adapta a Pix, boleto,
  cartões, dinheiro, cheque ou uma modalidade genérica.

## 1.32.0.01 - 2026-09-11
- **Permissão de voz propagada ao PWA**: Operações de Campo passa a identificar
  sempre o colaborador autenticado e reler sua permissão no servidor em tempo
  real, ao retomar o aplicativo e em verificação periódica de contingência.
- **Rodapé realmente condicional**: ao desativar Comando por voz, botão, ajuda,
  faixa e espaço reservado somem juntos de Recebimentos e Serviços; ao reativar,
  retornam sem exigir novo login.
- **Cache renovado**: o service worker do PWA avança de revisão para não manter
  a interface anterior instalada no celular.

## 1.32.0 - 2026-09-11
- **Edição antes da confirmação por voz**: pedidos, consignados e pagamentos
  passam a oferecer edição com o microfone dentro do próprio card, preservando
  cliente, itens e escolhas já resolvidas.
- **Desconto falado ou manual**: o usuário pode aplicar desconto em reais ou
  percentual ao rascunho. O servidor relê preços e saldo, recalcula subtotal,
  desconto e total e exige uma nova confirmação antes de gravar.
- **Componente central atualizado**: o comportamento pertence ao controlador
  oficial de ações por voz e fica disponível aos módulos que reutilizam o
  contrato, sem cópias locais.

## 1.31.0.05 - 2026-09-11
- **Voz por colaborador**: em Operações de Campo, Comando por voz passa a ser
  uma permissão individual junto a Recebimentos, Serviços e Agendamento.
- **Compatibilidade preservada**: colaboradores existentes e novos começam com
  a permissão marcada. Ao desmarcar, a faixa de voz some somente daquele PWA e
  os endpoints também recusam o acesso, sem alterar dados ou outras funções.

## 1.31.0.04 - 2026-09-11
- **Comando de voz não suportado**: o AvantaVendas passa a informar claramente
  quando uma ação, como editar um pedido, ainda não está disponível por voz.
- **Sem tela vazia**: respostas informativas, consultas e recusas recebem um
  card com fechamento; retornos desconhecidos viram erro recuperável.

## 1.31.0.03 - 2026-09-11
- **Fluxo imediato em Operações de Campo**: Recebimentos e Serviços deixam de
  exibir ou persistir a opção **Salvar para depois**.
- **Listas sem scroll**: escolhas curtas, incluindo formas de pagamento e tipos
  de serviço, usam o espaço liberado dentro do mesmo tamanho de card.

## 1.31.0.02 - 2026-09-11
- **Ajuda de Serviços mais clara**: o texto agora explica primeiro o registro,
  mantendo nome e assinatura junto desse caminho, e apresenta o agendamento em
  uma instrução separada.

## 1.31.0.01 - 2026-09-11
- **Resposta por voz sem perder a pergunta**: o microfone permanece no mesmo
  local dentro do card durante gravação, transcrição e interpretação. O ajuste
  é central e atende todas as perguntas em Recebimentos e Serviços.

## 1.31.0 - 2026-09-11
- **Registrar serviço por voz**: em Serviços, a pessoa pode pedir para registrar
  um atendimento e informar o cliente. O sistema resolve a empresa/local e a
  execução pendente; quando houver mais de uma, pergunta qual serviço utilizar.
- **Continuação no fluxo oficial**: após a resolução, a voz fecha e abre
  **Registrar serviços** já na etapa do nome de quem recebeu. Assinatura e
  avaliação continuam obrigatórias e nenhuma execução é gravada pela IA.
- **Ajuda direta**: o balão de Serviços explica, em poucas palavras, tanto o
  registro quanto o agendamento e adapta o texto às permissões do colaborador.

## 1.30.0.01 - 2026-09-11
- **Escolha de pagamento sem scroll**: o card de voz apresenta integralmente as
  cinco formas de pagamento em linhas compactas, mantendo alvos de toque de
  44 px. Listas extensas continuam com rolagem protegida.

## 1.30.0 - 2026-09-11
- **Interpretação dinâmica em Operações de Campo**: Recebimentos e Serviços
  reconhecem um catálogo fixo de funções e localizam empresas e locais novos
  automaticamente pelos dados autenticados, com aproximação textual, fonética
  e contextual sem cadastro manual de aliases.
- **Atualização imediata**: empresas e locais criados ou editados atualizam o
  catálogo aberto em tempo real e os nomes mais recentes ajudam a próxima
  transcrição sem enviar a base completa à IA.
- **Troca segura de solicitação**: respostas curtas continuam a dúvida atual;
  uma nova solicitação completa cancela o rascunho em andamento e inicia outro
  fluxo limpo. A confirmação e a escrita oficial permanecem obrigatórias.

## 1.29.0.02 - 2026-09-11
- **Faixa de voz mais leve**: removido o fundo circular sob o microfone; a
  superfície inferior passa a usar 70% de transparência e o ícone de informação
  fica centralizado verticalmente dentro da faixa em qualquer altura de tela.

## 1.29.0.01 - 2026-09-11
- **Encaixe da Solicitação por Voz**: a faixa inferior de Operações de Campo
  agora começa no eixo do acionador e recebe o aro elevado do padrão usado no
  botão central do AvantaVendas, preservando posição, ajuda e estados do fluxo.

## 1.29.0 - 2026-09-11
- **Ações por voz em Operações de Campo**: Recebimentos e Serviços receberam a
  faixa inferior oficial com acionador, ajuda contextual e estados compartilhados
  do PADRÃO AVANTA. Recebimentos registra cliente, valor e forma de pagamento;
  Serviços cria agendamentos respeitando as permissões do colaborador.
- **Segurança operacional**: toda escrita continua usando as APIs oficiais, com
  confirmação prévia, sessão, empresa, assinatura e permissões revalidadas. A
  conclusão de serviço permanece na tela por exigir assinatura e avaliação.
- **Componente compartilhado**: criado o dock React e o endereço neutro dos
  recursos de voz para que novos sistemas consumam o mesmo controlador e estilo.

## 1.28.0.05 - 2026-09-11
- **Relatório de serviços**: a busca de cliente/local usa um único botão para
  limpar o texto, com cursor de ação ao passar sobre ele.

## 1.28.0.04 - 2026-09-11
- **PWA de Serviços**: o seletor de empresa agora exibe todas as empresas
  ativas cadastradas. A disponibilidade de execução é informada depois da
  escolha, sem ocultar clientes do cadastro.

## 1.28.0.03 - 2026-09-11
- **Relatório de serviços**: o quadro de seleção de cliente/local recebeu uma
  superfície contextual mais marcada, com contraste próprio nos temas claro e
  escuro para se diferenciar dos filtros de período e exportação.

## 1.28.0.02 - 2026-09-11
- **Operações de Campo**: a rotina contratada e cada agendamento manual são
  tarefas independentes no PWA; cada execução selecionada preserva assinatura
  e avaliação próprias. Relatórios e cadastros foram refinados, e o modo escuro
  passa a ser aplicado silenciosamente, mantendo apenas erros visíveis.

## 1.28.0.01 - 2026-09-10
- **Separação entre produtos**: corrigida a orientação para declarar expressamente que emissão fiscal pertence somente ao módulo **Vendas e Serviços da Gestão Web**. O aplicativo **AvantaVendas** e o módulo **Conteúdo AvantaVendas** não emitem notas fiscais.
- **Proteção contra regressão**: teste automatizado passa a impedir que a ponte de configuração fiscal seja ligada às fontes do AvantaVendas ou de Conteúdo AvantaVendas.

## 1.28.0 - 2026-09-10
- **Arquitetura fiscal de mercado**: NF-e, NFC-e e NFS-e permanecem capacidades independentes do produto; cada perfil empresarial passa a registrar no servidor somente os documentos que realmente utiliza.
- **Piloto sem regra especial no produto**: a Tridium foi configurada para o ciclo oficial somente com NF-e em homologação. Essa seleção é dado de implantação do perfil, não limitação do módulo Vendas e Serviços.
- **Persistência e isolamento**: o recorte fiscal é versionado, protegido por permissões e RLS, carregado em qualquer dispositivo e nunca associado ao usuário ou ao armazenamento local do navegador.
- **Segurança operacional**: a configuração de produção permanece bloqueada até a homologação formal dos conectores da empresa; cadastro e certificado já existentes não são alterados.

## 1.27.0 - 2026-09-10
- **Integridade fiscal**: consumidor final passa a ser uma informação própria do cliente, independente da situação da inscrição estadual, e alimenta corretamente o `indFinal` da NF-e.
- **Regras fiscais**: finalidade da emissão e exigência de inscrição estadual agora são efetivamente aplicadas pelo resolvedor server-side; valores desconhecidos, CFOP incompleto, escopo vazio e data futura bloqueiam a publicação.
- **Publicação segura**: todos os tipos de nota habilitados precisam ter suas regras ativas revisadas. Cada publicação mantém uma cópia integral, imutável e vinculada ao perfil empresarial, inclusive para repetição idempotente exata.
- **Compatibilidade**: cadastros e matrizes anteriores são migrados sem perder a interpretação já usada, mas permanecem sujeitos à confirmação fiscal responsável antes da emissão.

## 1.26.0.02 - 2026-09-10
- **Revisão de regras fiscais**: a edição ficou mais compacta, com contexto e indicadores condensados, campos reorganizados e as ações Adicionar, Duplicar e Excluir reunidas na mesma linha.
- **Responsividade**: o diálogo preserva a leitura no celular, mantém as três ações agrupadas e usa uma coluna para os campos de revisão em telas estreitas.
## 1.26.1.21 - 2026-09-11
- **Ajustes de Operações de Campo**: a troca de modo escuro passa a ocorrer de
  forma imediata e silenciosa; mensagens de erro continuam visíveis caso a
  preferência não possa ser salva.

## 1.26.1.20 - 2026-09-11
- **Execuções de serviço**: a rotina contratada e cada agendamento manual agora
  aparecem como serviços independentes no PWA. Quando ambos coincidirem no
  mesmo local e dia, o colaborador escolhe qual executar; os agendados mantêm
  a etiqueta **Interna**, **Revisão** ou **Extra** e cada execução coleta sua
  própria assinatura e avaliação.
- **Assinatura e cadastros**: o canvas de assinatura termina antes da faixa de
  ações, com folga visual abaixo do tracejado. O cadastro de subempresa também
  reúne nome, responsável, valor e dia de vencimento na mesma linha no desktop.

## 1.26.1.19 - 2026-09-10
- **Serviços no colaborador**: agendamentos do dia agora são identificados como
  execuções selecionáveis e o app envia o identificador do serviço escolhido,
  garantindo que a assinatura e a avaliação concluam o agendamento correto.
  A confirmação ganhou card centralizado e as avaliações **Bom** e **Regular**
  respondem ao toque.
- **Relatórios e cadastros**: a assinatura volta à mesma linha da execução no
  PDF, o tipo de rotina é apresentado como **Externa**, e o cadastro de cliente
  direto reúne nome, responsável, valor e vencimento na mesma linha.

## 1.26.1.18 - 2026-09-10
- **Operações de Campo**: reclicar a aba aberta descarta formulários, edições e
  seleções em curso, retornando à tela inicial daquela área. Os campos de
  vencimento foram alinhados nos cadastros direto e de subempresa, e a lista
  de serviços realizados agora preserva a coluna **Tipo** na mesma linha.
- **Relatório de serviços executados**: a mensagem inicial foi simplificada;
  PDF identifica somente o nome do perfil e PDF/Excel passam a incluir as
  imagens reduzidas das assinaturas disponíveis.

## 1.26.1.17 - 2026-09-10
- **Relatório de serviços executados**: a busca de cliente/local agora fica ao
  lado do seletor, abre a lista ao receber foco e remove os textos auxiliares
  redundantes.

## 1.26.1.16 - 2026-09-10
- **Relatório de serviços executados**: a consulta agora abre sem resultados.
  Após definir os filtros, o gestor usa **Consultar relatório** para exibir a
  lista e liberar as exportações PDF e Excel.

## 1.26.1.15 - 2026-09-10
- **Relatório de serviços executados**: logos PNG transparentes agora preservam
  integralmente a transparência no cabeçalho do PDF, sem placa de fundo.

## 1.26.1.14 - 2026-09-10
- **Relatório de serviços executados**: a identificação da empresa/perfil saiu
  do card de consulta e passou a compor somente o PDF baixado. O PDF agora é
  gerado diretamente pelo sistema — com logo quando o arquivo é compatível — e
  baixado no dispositivo, sem abrir a janela de impressão.

## 1.26.1.13 - 2026-09-10
- **Serviços realizados**: o rótulo do botão **Relatórios** foi centralizado
  verticalmente, mantendo sua altura alinhada ao seletor de competência.

## 1.26.1.12 - 2026-09-10
- **Comprovantes de assinatura**: o visualizador agora abre acima dos demais
  modais e tem contexto próprio de cor. Título, nome do arquivo, estado,
  imagem, fechamento e ação de abertura receberam contraste explícito nos
  temas claro e escuro.

## 1.26.1.11 - 2026-09-10
- **Serviços realizados**: o botão **Relatórios** agora tem a mesma altura do
  seletor de competência ao lado.

## 1.26.1.10 - 2026-09-10
- **Relatório de serviços executados**: o cabeçalho agora identifica a empresa
  ou perfil ativo. Quando uma logo está cadastrada, ela aparece no canto
  superior esquerdo do relatório.

## 1.26.1.09 - 2026-09-10
- **Relatório de serviços executados**: a lista de clientes e locais agora
  inicia recolhida para preservar o espaço de trabalho. Ela abre somente em
  **Selecionar cliente ou local** e volta a recolher após uma escolha.

## 1.26.1.08 - 2026-09-10
- **Relatório de serviços executados**: as datas de período agora usam o
  calendário padrão de Agendamentos, com navegação mensal e confirmação
  explícita. Quando aberto sobre o relatório, o calendário ocupa a camada
  correta acima do modal e mantém contraste nos dois temas.

## 1.26.1.07 - 2026-09-10
- **Relatório de serviços executados**: removida a pílula redundante de todos
  os clientes. A seleção ativa pode ser desfeita pelo próprio item, e o botão
  do agrupado agora explica que inclui somente os seus locais. Ações, filtros
  e lista ganharam contraste reforçado nos temas claro e escuro; a exportação
  para Excel permanece sempre visível na camada global do relatório.

## 1.26.1.06 - 2026-09-10
- **Relatório de serviços executados**: período e exportações foram reunidos
  em uma faixa compacta; os campos de data agora usam o controle padrão com
  ícone associado ao próprio campo. A busca foi alinhada ao título da lista.

## 1.26.1.05 - 2026-09-10
- **Relatório de serviços executados**: a seleção de cliente agora segue a
  hierarquia Empresa → locais, com pílulas de estado, busca lateral e
  contraste específico para os temas claro e escuro.

## 1.26.1.04 - 2026-09-10
- **Relatório de serviços executados**: o modal agora é renderizado na camada
  global acima dos controles fixos, garantindo que o escurecimento cubra toda
  a tela atrás do card.

## 1.26.1.03 - 2026-09-10
- **Relatório de serviços executados**: acrescentado o seletor de
  cliente/local. O filtro é respeitado na prévia, no Excel e na impressão/PDF.

## 1.26.1.02 - 2026-09-10
- **Relatório de serviços executados**: a aba **Realizados** agora permite
  escolher um período, revisar empresa, local, data e hora, colaborador,
  assinador, avaliação, observação e o comprovante protegido da assinatura.
  A listagem pode ser exportada para Excel ou impressa/salva como PDF.

## 1.26.1 - 2026-09-10
- **Arquitetura de voz**: as rotas oficiais e experimentais agora apontam para
  handlers privados únicos sob o domínio de Vendas. O laboratório continua
  compatível, mas o sistema oficial não depende mais da área de testes.
- **Qualidade**: o build passou a executar a suíte completa de 286 testes, e o
  lint foi organizado para separar código-fonte de bundles, espelhos nativos,
  rascunhos não aplicados e worktrees locais, sem ocultar avisos legados.
- **Organização**: os protótipos Constelação Avanta e preview de card de
  perfis foram retirados do aplicativo oficial e preservados em AvantaLab
  Projetos. Formatadores e armazenamento local de Vendas e Serviços foram
  isolados em módulo testado, sem mudança de contrato ou de dados.
- **Build estável**: a compilação de produção usa o Webpack suportado pelo
  Next 16 para evitar a paralisação observada no Turbopack ao recompilar os
  componentes legados de grande porte.

## 1.26.0.01 - 2026-09-10
- **Assinatura de serviços**: a área de desenho agora respeita estritamente a região livre antes da faixa de ações. Em celular, o canvas não avança nem fica sob os botões Cancelar, Limpar assinatura e Avançar.

## 1.26.0-av145 - 2026-09-10
- **Recursos do AvantaVendas**: cache renovado para carregar o componente e os
  estilos centrais de ações por voz do PADRÃO AVANTA.

## 1.26.0 - 2026-09-10
- **Padrão Avanta de ações por voz**: botão, ajuda, movimento por áudio real,
  estados, cards, desambiguação, edição, confirmação, pendências e resultado
  agora usam um único componente central reutilizável por outros sistemas.
  O AvantaVendas consome essa fonte sem alterar o fluxo aprovado (recursos
  renovados em `av145`).
- **Solicitação por Voz**: a localização de produtos ganhou um índice oculto com nomes oficiais, marca, categoria, apresentação e aliases de fala gerados automaticamente. O enriquecimento por IA acontece em segundo plano, sem criar campos para preenchimento manual nem atrasar a gravação do comando.
- **Aprendizado controlado**: quando uma pessoa corrige manualmente um cliente ou produto e conclui o lançamento, a associação é reforçada naquela conta; após duas confirmações reais, passa a ter prioridade. Escolhas canceladas ou lançamentos não confirmados não ensinam o sistema.
- **Segurança e custo**: o modelo recebe somente pequenos lotes de produtos reais e devolve saída estruturada validada; não executa consultas nem grava lançamentos. A transcrição recebe no máximo um vocabulário curto já aprendido, nunca o catálogo inteiro.

## 1.25.0.05 - 2026-09-09
- **Menu da Gestão**: a redução de largura e o deslocamento no hover agora são aplicados diretamente a cada atalho principal, garantindo a folga lateral mesmo com as utilidades de largura do menu.

## 1.25.0.04 - 2026-09-09
- **Menu da Gestão**: os atalhos principais agora preservam uma pequena folga à direita e avançam suavemente ao passar o mouse, sem tocar no limite lateral do painel.

## 1.25.0.03 - 2026-09-09
- **Identidade dos módulos**: Projetos, Custos e Precificação e Vendas e Serviços agora seguem Operações de Campo e exibem a logo configurada do perfil em seus cabeçalhos. Onde não houver logo, o nome do perfil é mostrado como alternativa.

## 1.25.0.02 - 2026-09-09
- **Identidade dos módulos**: Operações de Campo passa a exibir a logo configurada do perfil no cabeçalho, sem repetir o nome quando a marca já o comunica; sem logo, o nome do perfil é a alternativa.
- **Navegação e ajustes**: removida a entrada duplicada de Operações de Campo no menu. O seletor de modo escuro ficou centralizado e o botão de fechar dos ajustes ganhou contraste e área clicável explícitos.
- **Rodapé**: as páginas próprias de Operações de Campo, Projetos, Custos e Precificação e Vendas e Serviços agora compartilham o rodapé institucional. A marca apresenta somente **AVANTALAB** e a versão em tamanho reduzido.

## 1.25.0.01 - 2026-09-09
- **Ajustes de Operações de Campo**: o painel ficou mais compacto. Modo escuro agora aparece somente como seletor ON/OFF em uma linha.

## 1.25.0 - 2026-09-09
- **Visão geral**: Recebimentos deixou de exibir valores e agora acompanha somente quantidades operacionais: programados, recebidos em campo, confirmados, em conferência, divergências, devolvidos e atrasados. Os resultados em valor permanecem na aba **Resultados**.
- **Ajustes de Operações de Campo**: a engrenagem do cabeçalho agora abre os ajustes do módulo. Nela, gestores podem configurar o nome e a etiqueta da entrada financeira, ativar ou retirar a integração e definir se o resultado da empresa recebe valores **Recebidos e confirmados** ou **Programados no vencimento**. O padrão de perfis existentes continua sendo recebido e confirmado.
- **Aparência**: Ajustes também permite ativar ou desativar o modo escuro do perfil, com aplicação imediata e persistente.

## 1.24.0.01 - 2026-09-09
- **Visão geral**: **Recebimentos** passou a seguir o mesmo padrão de seção e cards numéricos de Serviços, usando a paleta própria da divisão financeira.
- **Total confirmado**: a faixa financeira ficou mais baixa, com valor destacado e os controles concentrados no canto direito.

## 1.24.0 - 2026-09-09
- **Financeiro**: o total recebido e confirmado agora ocupa uma pílula horizontal de largura total, reunindo valor, integração e ações na mesma linha em telas amplas.
- **Relatório de recebimentos**: a Visão geral ganhou um resumo mensal de cobranças, registros em campo, confirmações e atrasos, com acesso direto à listagem detalhada.

## 1.23.0 - 2026-09-09
- **Visão geral**: a Gestão Web agora separa claramente os resumos de **Financeiro** e **Serviços** para o mês selecionado. Serviços mostra programados, realizados, pendentes, atrasados, agendamentos manuais e avaliações regulares, com a quantidade de avaliações boas como referência de qualidade.

## 1.22.0.03 - 2026-09-09
- **Acesso do colaborador**: o cabeçalho do card de escolha de operação agora é uma faixa contínua do próprio card; o login não repete mais o texto AvantaLab. Em Serviços, **Registrar novo serviço** fica em destaque e **Serviços realizados** e **Agendar serviço** dividem a segunda linha.
- **Agendamentos**: novos agendamentos passam a iniciar em **Interna** como tipo de serviço padrão.

## 1.22.0.02 - 2026-09-09
- **Agendamentos**: os botões secundários **Fechar** e **Cancelar** no modal de edição receberam contraste próprio para permanecerem visíveis sobre o card branco.

## 1.22.0.01 - 2026-09-09
- **Agendamentos**: os botões de ação permanecem alinhados na mesma linha no Web. O calendário do PWA agora ocupa a camada superior da tela, mantém a data escolhida em destaque e exige a ação explícita **Confirmar**.
- **Acesso do colaborador**: o card de escolha de operação ganhou cabeçalho institucional colorido, nome do perfil maior e centralizado, além do botão **Sair** em pílula com contorno.

## 1.22.0 - 2026-09-09
- **Operações de Campo**: a aba **Agendamentos** agora permite à Gestão editar o local, a data e o tipo de um atendimento manual; cancelá-lo com confirmação; ou marcá-lo como concluído a partir da data programada. A conclusão entra em **Realizados** identificada como feita pela Gestão, sem criar assinatura ou avaliação fictícias.
- **Navegação**: as três áreas de abas ajustam tipografia, espaçamento e quebra responsiva para que **Agendamentos** permaneça dentro dos limites do card.

## 1.21.0.02 - 2026-09-09
- **Operações de Campo**: o campo de data de **Agendar serviço** agora abre o mesmo calendário centralizado do AvantaVendas, com navegação mensal, ação **Hoje**, cancelamento e bloqueio das datas anteriores ao dia atual.

## 1.21.0.01 - 2026-09-09
- **Operações de Campo**: a escolha entre Recebimentos e Serviços no PWA agora usa a mesma cena institucional de fundo e o mesmo card de acesso do login, com botões de seleção no padrão AvantaLab.

## 1.21.0 - 2026-09-09
- **Operações de Campo**: colaboradores podem receber a permissão independente **Agendamento**. No PWA de Serviços, ela libera **Agendar serviço** para criar atendimentos **Interna**, **Revisão** ou **Extra**, com empresa, piso/local e data.
- **Serviços**: a Gestão Web ganhou a aba **Agendamentos**, com lista dos manuais pendentes ou atrasados e modal para criar novos. Esses atendimentos seguem para Pendentes, Atrasados e Realizados conforme a execução; as etiquetas distinguem o tipo do serviço.
- **Alerta operacional**: ao selecionar uma empresa no registro de serviço, o PWA avisa os agendamentos manuais do dia naquele grupo. O aviso persiste até a execução ser registrada. Cobranças, vencimentos e históricos financeiros não são alterados.

## 1.20.0.09 - 2026-09-09
- **Página pública**: o card do AvantaVendas em Gestão Financeira agora pode ser aberto diretamente por `#avantavendas`, com a posição compensada pelo cabeçalho fixo também no celular.

## 1.20.0.08 - 2026-09-09
- **Proteção de dados**: o backup de Recebimentos agora inclui também os registros de Serviços e os PNGs privados de assinatura, permitindo a guarda completa antes de mudanças estruturais.

## 1.20.0.07 - 2026-09-09
- **Operações de Campo**: os painéis de Serviços agora usam toda a largura interna disponível do AvantaCard, como as filas de Recebimentos.

## 1.20.0.06 - 2026-09-09
- **Operações de Campo**: o seletor **Exibir avisos** agora tem 32 px, a mesma altura visual do seletor mensal e do botão **Todos**.

## 1.20.0.05 - 2026-09-09
- **Operações de Campo**: corrigido o seletor de mês deformado em **Avisos**. A situação **Exibir avisos** agora fica na mesma linha, à esquerda do seletor de mês; ambos, o botão **Todos** e o contador permanecem agrupados e alinhados à direita.

## 1.20.0.04 - 2026-09-09
- **Operações de Campo**: os controles de **Avisos** agora reutilizam o mesmo posicionamento e comportamento das filas de Conferência e Próximo a vencer: pesquisa no platô do card, seletor de mês no topo e ação **Todos** para remover o recorte mensal.

## 1.20.0.03 - 2026-09-09
- **Operações de Campo**: a aba **Avisos** passa a manter uma fila mensal de avaliações **Regular**, com pesquisa por empresa, pessoa ou observação; seleção de pendentes, concluídos ou todos; observação expansível; e ações para concluir ou reabrir o tratamento. O contador da aba permanece restrito aos avisos pendentes.

## 1.20.0.02 - 2026-09-09
- **Operações de Campo**: a agenda de Serviços recompõe o período operacional em curso conforme a frequência cadastrada. Um serviço semanal de terça não realizado, por exemplo, já aparece em **Atrasados** quando o módulo é aberto na quarta. A mesma regra respeita frequências quinzenal, mensal, trimestral, semestral e anual, sem alterar serviços concluídos.

## 1.20.0.01 - 2026-09-09
- **Operações de Campo**: a aba **Pendentes** agora mantém automaticamente uma janela móvel de hoje até os próximos 10 dias, sem seletor manual.

## 1.20.0 - 2026-09-09
- **Operações de Campo**: Serviços realizados agora têm filtro exclusivo por mês e exibem empresa, local ou vínculo, data de realização, colaborador, assinador, observação e selo de avaliação (**Bom** ou **Regular**).
- **Comprovante de serviço**: cada assinatura enviada passa a ser arquivada como PNG privado no servidor e pode ser visualizada pela gestão. O registro legado em banco foi mantido, preservando todas as assinaturas e históricos existentes durante a migração.

## 1.19.0.25 - 2026-09-09
- **Operações de Campo**: no PWA de Serviços, ao escolher empresa, piso ou cliente, a tela posiciona suavemente o próximo campo útil logo abaixo do cabeçalho. Assim, a sequência de preenchimento permanece visível, sem abrir o teclado antecipadamente.

## 1.19.0.24 - 2026-09-09
- **Operações de Campo**: a lista de piso dos locais agrupadores agora considera todos os clientes ativos, mesmo com um único piso cadastrado. A lista orienta a rota completa; clientes sem serviço pendente ficam identificados e indisponíveis para registro até a data programada.

## 1.19.0.23 - 2026-09-09
- **Operações de Campo**: a seleção de um cliente na lista de visitas agora pode ser desfeita tocando novamente no mesmo item, liberando a escolha de qualquer outro cliente.

## 1.19.0.22 - 2026-09-09
- **Operações de Campo**: removido o aviso redundante de **Salvando alterações…** da faixa de abas. O próprio botão de salvar continua informando o processamento.

## 1.19.0.21 - 2026-09-09
- **Operações de Campo**: removido o identificador redundante **Gestão operacional** do topo da página.

## 1.19.0.20 - 2026-09-09
- **Operações de Campo**: em locais agrupadores distribuídos em mais de um piso ou nível, o colaborador seleciona primeiro o piso e vê todos os clientes pendentes daquela área antes de escolher quem atender.

## 1.19.0.19 - 2026-09-09
- **Operações de Campo**: o PWA agora exibe para registro somente os destinos com serviço pendente ou atrasado. Quando não houver atendimento disponível, informa antes da assinatura a próxima execução programada, evitando uma falha no momento de enviar a avaliação.

## 1.19.0.18 - 2026-09-09
- **Operações de Campo**: as opções de avaliação de Serviço foram transformadas em cartões mais expressivos, com ícone, texto de apoio e borda âmbar destacada para **Regular**.

## 1.19.0.17 - 2026-09-09
- **Operações de Campo**: o topo da assinatura agora mostra o nome do assinante sem aspas e identifica a empresa ou a combinação empresa/subempresa selecionada.

## 1.19.0.16 - 2026-09-09
- **Operações de Campo**: todas as mensagens exibidas na área de assinatura, inclusive validações, agora são centralizadas dentro do campo.

## 1.19.0.15 - 2026-09-09
- **Operações de Campo**: na tela de assinatura, **Cancelar** foi movido para o rodapé, ao lado de **Limpar assinatura**. Cabeçalho e ações agora usam a cor institucional do sistema.

## 1.19.0.14 - 2026-09-09
- **Operações de Campo**: o cadastro de Serviço agora revela o campo do assinador — e o botão **Avançar para assinatura** — somente depois que a empresa e, quando necessário, o cliente forem definidos.

## 1.19.0.13 - 2026-09-09
- **Operações de Campo**: a coleta de assinatura agora é uma camada global, fora do card e do cabeçalho do PWA. O cabeçalho identifica o assinador e a área de desenho preenche todo o espaço útil da tela.

## 1.19.0.12 - 2026-09-09
- **Operações de Campo**: no PWA de Serviços, a ação ativa fica branca e a alternativa permanece apenas contornada. O acesso inicia em **Registrar novo serviço**. A assinatura do cliente agora abre em tela cheia, com cabeçalho identificado e opção de cancelamento.

## 1.19.0.11 - 2026-09-09
- **Operações de Campo**: no PWA de Serviços, **Registrar novo serviço** e **Serviços realizados** são ações separadas. O colaborador escolhe qual card abrir, sem exibir o registro e o histórico ao mesmo tempo.

## 1.19.0.10 - 2026-09-09
- **Operações de Campo**: o nome do perfil é sincronizado com as credenciais dos colaboradores já existentes e novos. O PWA atualiza a sessão quando necessário, garantindo o cabeçalho completo em Recebimentos e Serviços.

## 1.19.0.09 - 2026-09-09
- **Operações de Campo**: o cabeçalho do colaborador volta a identificar sempre o perfil ou empresa e, abaixo, informa de modo igual em ambos os acessos se a área é de **Registro de recebimentos** ou **Registro de serviços**.

## 1.19.0.08 - 2026-09-09
- **Operações de Campo**: o título **Permissões no aplicativo** foi posicionado dentro do bloco, com espaçamento próprio e sem sobrepor a borda.

## 1.19.0.07 - 2026-09-09
- **Operações de Campo**: ao editar um colaborador, os dados já cadastrados permanecem válidos e a senha só é redefinida quando uma nova senha é preenchida e confirmada. Assim, é possível liberar **Serviços** sem alterar o acesso existente.

## 1.19.0.06 - 2026-09-09
- **Acesso**: os cards de **Preparando**, **Carregando** e **Validando** não repetem mais o nome AvantaLab; o logotipo permanece somente na cena de fundo.

## 1.19.0.05 - 2026-09-09
- **Operações de Campo**: o card de **Validando acesso** não exibe mais a identificação “AvantaLab Gestão”.

## 1.19.0.04 - 2026-09-09
- **Operações de Campo**: removida a descrição abaixo do título principal para deixar a abertura do módulo mais direta.

## 1.19.0.03 - 2026-09-09
- **Solicitação por Voz**: após confirmar pedido, consignado, pagamento ou agendamento, o card central fecha e o resultado aparece no aviso temporizado padrão do rodapé. Para pedido, consignado e pagamento, o mesmo aviso preserva a ação **Compartilhar comprovante** antes de encerrar.

## 1.19.0.03-av144 - 2026-09-09
- Recursos do AvantaVendas renovados com a confirmação discreta no rodapé e o compartilhamento de comprovante integrado ao aviso temporizado.

## 1.19.0.02 - 2026-09-09
- O módulo antes chamado **Recebimentos Presenciais** passa a se chamar **Operações de Campo**. A rota e os identificadores técnicos foram preservados; os títulos, menu, catálogo de módulos e cabeçalhos agora representam tanto Recebimentos quanto Serviços.

## 1.19.0.01 - 2026-09-09
- **Recebimentos Presenciais**: a navegação foi reorganizada em três áreas coloridas. À esquerda ficam **Visão geral**, **Resultados**, **Empresas** e **Colaboradores**; **Recebimentos** e **Serviços** receberam identificadores acima das respectivas barras. Também foi incluído o respiro visual entre o menu e o AvantaCard.

## 1.19.0 - 2026-09-09
- **Recebimentos Presenciais** passa a controlar também a execução de serviços. O menu web reúne **Realizados**, **Pendentes**, **Atrasados** e **Avisos** em um grupo visual próprio de Serviços, com a mesma pílula deslizante da navegação principal.
- A programação já existente de execução do serviço cria a agenda operacional sem alterar cobranças, vencimentos ou históricos financeiros. Serviços passados sem confirmação ficam atrasados; uma avaliação **Regular** cria um aviso para o gestor, que pode concluí-lo após o tratamento.
- Colaboradores agora recebem permissões separadas para **Recebimentos** e **Serviços**. Quem tiver ambas escolhe a operação ao entrar no PWA e pode alterná-la no topo.
- No PWA, **Registrar novo serviço** coleta cliente, nome de quem recebeu, assinatura em tela e avaliação. Avaliações regulares podem incluir observação opcional para o aviso do gestor.

## 1.18.0.07 - 2026-09-09
- **AvantaVendas**: corrigido o gatilho compartilhado de conta que impedia novos pagamentos, pedidos, clientes e agendamentos após a publicação imediata do catálogo. A validação exclusiva do catálogo foi isolada no gatilho de produtos, sem alterar ou remover registros existentes.

## 1.18.0.06 - 2026-09-09
- **Recebimentos Presenciais**: o rótulo do campo compacto de nível passou de **Número / identificação** para **Referência**, evitando quebra de linha sem perder o contexto indicado pelo exemplo 12, G ou L2.

## 1.18.0.05 - 2026-09-09
- **Recebimentos Presenciais**: nos cadastros e edições, o campo **Rua** recebeu mais largura e **Número / identificação** ficou mais compacto, adequado a referências curtas como 12, G ou L2.

## 1.18.0.04 - 2026-09-09
- **Recebimentos Presenciais**: o AvantaCard de Administração não possui mais rolagem interna. Ele cresce conforme as linhas e filtros carregados, e a página completa assume a rolagem natural.

## 1.18.0.03 - 2026-09-09
- **Recebimentos Presenciais**: ao trocar de seção interna, qualquer cadastro ou edição de empresa, local ou cliente é cancelado sem gravar. Ao retornar à seção, a lista é exibida limpa.
- O formulário de cliente passou a usar a área rolável corretamente, mantendo endereço, execução do serviço e ações finais acessíveis em telas de qualquer altura.

## 1.18.0.02 - 2026-09-09
- **Recebimentos Presenciais** passa a abrir em uma página independente, com cabeçalho oficial de **Início**, marca AvantaLab e **Ajustes**, preservando o perfil ativo e toda a operação existente no espaço total da tela.
- Empresas, locais agrupadores e clientes no local agora podem registrar o nível do endereço por **Tipo de nível** (andar, piso, subsolo, térreo, mezanino ou outro) e **Número / identificação** livre. A estrutura evita listas extensas e mantém endereços já cadastrados intactos.

## 1.18.0.01 - 2026-09-09
- **Recebimentos Presenciais**: o **Local agrupador** agora também define a programação de execução do serviço. Cada cliente no local começa com **Herdar a programação do local** ativado; enquanto essa opção estiver ativa, suas datas ficam somente para consulta. Ao desativá-la, o cliente pode manter uma programação própria, sem alterar o vencimento mensal ou qualquer histórico financeiro.

## 1.18.0 - 2026-09-09
- **Recebimentos Presenciais** separa o pagamento da execução do serviço: todo cliente agora possui um **Dia de vencimento** mensal obrigatório, enquanto **Execução do serviço** concentra as opções semanal, quinzenal, mensal, trimestral, semestral e anual usadas como referência operacional.
- A migração preserva o dia já utilizado por cada cadastro e mantém histórico, atrasos, conferências, baixas, comprovantes e eventos. Somente previsões automáticas futuras ainda abertas são recriadas como cobranças mensais no novo dia de vencimento.

## 1.17.0.04 - 2026-09-08
- A resolução por voz classifica cada produto sobre o catálogo ativo completo da conta, compartilhado em cache, enquanto executa em paralelo uma consulta curta por termos completos. Prefixos genéricos deixam de permitir que descrições técnicas parecidas ocupem o lugar do nome comercial correto.
- Aproximações fortes precisam estar no nome, SKU ou marca; categoria e descrição continuam ajudando quando contêm os termos efetivamente falados. Assim, **Triliss** não é confundida com registros que apenas mencionam algo como **Tridium** em texto auxiliar.
- Um produto escolhido em **Procurar no catálogo** é relido por ID, conta ativa e estado ativo. A escolha encerra a dúvida mesmo quando a referência falada era ruim, eliminando o retorno em looping para a mesma lista.
- A conciliação continua independente do segmento do catálogo e também reconhece nomes separados ou unidos, como **Tri Liss** e **Triliss**.

## 1.17.0.04-av143 - 2026-09-08
- Recursos do AvantaVendas renovados com resolução definitiva da escolha manual e classificação segura do catálogo por voz.

## 1.17.0.03 - 2026-09-08
- Alterações em **Conteúdo AvantaVendas > Produtos** agora são publicadas no mesmo salvamento para todas as contas de AvantaVendas vinculadas ao perfil. Nome, SKU, descrição, preço sugerido, imagem, estado ativo e demais dados de divulgação substituem a cópia recebida, sem alterar custo ou estoque próprios da conta de vendas.
- O AvantaVendas acompanha essas cópias por atualização em tempo real e atualiza o catálogo aberto sem exigir que o vendedor use o botão de sincronização ou recarregue a página.

## 1.17.0.02 - 2026-09-08
- A pesquisa manual do catálogo na Solicitação por Voz mantém o mesmo campo durante a digitação. A lista e o aviso de carregamento são atualizados separadamente, evitando que o teclado do iPhone feche a cada resultado.
- A conciliação de produtos aceita palavras intermediárias presentes somente no cadastro, variações de plural e pequenas perdas da transcrição. Assim, referências como **kit cabelos normais** e **kit cabelo normal** encontram **Kit Home Care - Cabelos Normais**.
- A busca manual digitada usa a mesma classificação aprofundada do comando de voz e ignora respostas antigas quando uma nova pesquisa já foi iniciada.
- A transcrição informa o português brasileiro pelo campo de idiomas compatível com o modelo `gpt-transcribe`, reforçando a dicção esperada sem criar outra chamada à IA.

## 1.17.0.02-av142 - 2026-09-08
- Recursos do AvantaVendas renovados com digitação contínua no catálogo e conciliação refinada de produtos por voz.

## 1.17.0.01 - 2026-09-08
- Produtos antigos do **Conteúdo AvantaVendas** que ainda não possuíam SKU agora recebem um código técnico estável ao abrir a edição. Assim, **Salvar produto** funciona sem exigir o preenchimento manual de um dado ausente da importação original.
- Falhas de validação do formulário agora aparecem junto aos campos, sem ficar ocultas abaixo da lista de produtos.

## 1.17.0 - 2026-09-08
- A **Solicitação por Voz** passou a resolver descrições compostas de produtos com mais rigor no catálogo real da conta: aproximações de grafia e dicção são comparadas com nome, SKU, marca, categoria e descrição, enquanto resultados apoiados apenas em palavras genéricas deixam de virar sugestões desconexas.
- Quando a identificação de um produto não for suficiente, o painel oferece **Procurar no catálogo**. A busca manual é paginada, usa apenas produtos ativos da empresa e mantém cliente e todos os itens já entendidos na solicitação.
- Antes da confirmação de pedido ou consignado, **Editar pedido** permite ajustar quantidades, remover itens ou incluir produto pelo catálogo. A edição retorna obrigatoriamente à resolução e confirmação seguras do servidor.
- Pop-ups de dúvidas e catálogo agora reservam a área do menu inferior; listas extensas rolam dentro do card.
- Para manter a experiência imediata, produtos de uma mesma fala são resolvidos em paralelo. A varredura aprofundada, acionada somente quando a consulta curta não basta, é compartilhada por 30 segundos na conta ativa.

## 1.17.0-av141 - 2026-09-08
- Recursos do AvantaVendas renovados com a resolução de catálogo, seleção manual e edição segura de pedidos por voz.

## 1.16.0.13 - 2026-09-08
- Em **Conteúdo AvantaVendas > Produtos**, a lista agora abre sem o formulário de cadastro. **Novo produto** abre o formulário vazio; **Editar** leva a tela à área de edição; e **Cancelar** fecha o formulário sem gravar.
- Salvar e inativar produtos agora confirmam que a linha foi realmente alterada antes de concluir, evitando sucesso aparente quando uma permissão de acesso impedir a operação.

## 1.16.0.12 - 2026-09-08
- O símbolo de informação da Solicitação por Voz foi reduzido e ganhou mais folga interna, conforme a prévia aprovada. O alvo de toque permanece em 48 px.

## 1.16.0.12-av140 - 2026-09-08
- Recursos do AvantaVendas renovados com o refinamento aprovado do símbolo de informação.

## 1.16.0.11 - 2026-09-08
- O atalho de ajuda da Solicitação por Voz agora mostra somente o símbolo clássico de informação, sem botão branco, fundo ou aro externo. No modo escuro, o símbolo fica branco.

## 1.16.0.11-av139 - 2026-09-08
- Recursos do AvantaVendas renovados com o símbolo de informação simplificado.

## 1.16.0.10 - 2026-09-08
- O atalho de ajuda da Solicitação por Voz passou a usar o ícone clássico de informação, com círculo e “i” central mais legíveis.

## 1.16.0.10-av138 - 2026-09-08
- Recursos do AvantaVendas renovados com o ícone de informação padronizado.

## 1.16.0.09 - 2026-09-08
- O balão de ajuda da Solicitação por Voz agora fecha ao tocar fora dele, além de continuar alternando pelo ícone de informações.

## 1.16.0.09-av137 - 2026-09-08
- Recursos do AvantaVendas renovados com o fechamento contextual da ajuda por voz.

## 1.16.0.08 - 2026-09-08
- O carregamento inicial do AvantaVendas agora conclui a régua em **100%** no instante em que a Sala de Botões é aberta. Dados operacionais e conteúdos não essenciais continuam sincronizando em segundo plano, sem segurar a entrada.

## 1.16.0.08-av136 - 2026-09-08
- Recursos do AvantaVendas renovados com a conclusão visual da preparação inicial.

## 1.16.0.07 - 2026-09-08
- O ícone de ajuda da Solicitação por Voz passou a integrar permanentemente o bloco fixo da Sala de Botões. Ele não inicia, desaparece, nem acompanha a gravação; sua posição se distribui de forma responsiva entre o microfone e a lateral direita.

## 1.16.0.07-av135 - 2026-09-08
- Recursos do AvantaVendas renovados com o atalho fixo de ajuda por voz.

## 1.16.0.06 - 2026-09-08
- A Solicitação por Voz da Sala de Botões ganhou um ícone de informações ao lado do microfone. O balão explica que é possível solicitar pagamentos, pedidos e agendamentos descrevendo os dados necessários.

## 1.16.0.06-av134 - 2026-09-08
- Recursos do AvantaVendas renovados com a ajuda contextual da Solicitação por Voz.

## 1.16.0.05 - 2026-09-08
- Os Insights da Ava passaram por auditoria de cálculo: resultado e convite à Caixinha consideram receitas e despesas previstas quando existirem; mensagens identificam a projeção.
- A concentração usa somente despesas realizadas quando não há previsões e passa a identificar a base registrada e prevista quando elas existem. O cálculo usa a mesma coleção no valor e no total, com proteção adicional de teto em 100%.
- Valores inválidos não entram no saldo da Caixinha.

## 1.16.0.04 - 2026-09-08
- A Caixinha da Gestão Mobile passa a iniciar recolhida.
- O Insight de maior concentração calcula categoria e total sobre a mesma base de despesas ativas do mês, impedindo percentuais acima de 100%.

## 1.16.0.03 - 2026-09-08
- O puxador de reorganização da Gestão Mobile voltou ao espaço compacto original para não alcançar conteúdo dos cards; o contraste reforçado foi mantido.

## 1.16.0.02 - 2026-09-08
- A Gestão Mobile passou a iniciar e restaurar a tela inicial na mesma ordem: Ava, Saldo do mês, Visão geral, lançamentos, gráficos, Insights, Caixinha, Controle de Ponto e Meus perfis. A Agenda permanece oculta até ser ativada pelo usuário.
- O puxador usado para reorganizar cards agora tem contraste e área de toque mais claros, inclusive sobre o card azul escuro de Saldo do mês.

## 1.16.0.01 - 2026-09-07
- Ao escolher um cliente para registrar pagamento por voz, a lista mostra o **saldo devedor atual** de cada opção, calculado com pedidos e pagamentos reais, em vez do último pedido.

## 1.16.0.01-av133 - 2026-09-07
- Recursos da Solicitação por Voz renovados com o saldo atual na desambiguação de pagamentos.

## 1.16.0 - 2026-09-07
- A Solicitação por Voz agora cria agendamentos de visita, entrega, recebimento ou cobrança. Ela resolve o cliente na conta ativa, pede somente a data ausente, exige confirmação e relê o registro salvo.
- A Agenda do AvantaVendas passou a usar a tabela operacional por conta, compartilhada com a voz, preservando os agendamentos nos backups e entre dispositivos.

## 1.16.0-av132 - 2026-09-07
- Recursos do AvantaVendas atualizados para o agendamento por voz e a Agenda oficial por conta.

## 1.15.0.08 - 2026-09-07
- Os cards de confirmação, dúvida e resultado da Solicitação por Voz passaram a usar a superfície, bordas, raios e ações do AvantaVendas. O resultado não apresenta mais a ação redundante **Nova solicitação**.

## 1.15.0.08-av131 - 2026-09-07
- Recursos do AvantaVendas atualizados com a organização dos cards e ações de resultado da Solicitação por Voz.

## 1.15.0.07 - 2026-09-07

- O card **Deixe aqui suas sugestões** ganhou uma lâmpada de contorno maior e
  mais legível, substituindo o balão de conversa associado à Ava.

## 1.15.0.07-av130 - 2026-09-07

- Recursos do AvantaVendas atualizados com o ícone ampliado de sugestões.

## 1.15.0.06 - 2026-09-07

- O card da Sala de Botões que abre a central de feedback passou a dizer
  **Deixe aqui suas sugestões**. Dúvidas continuam sendo atendidas pela Ava.

## 1.15.0.06-av129 - 2026-09-07

- Recursos do AvantaVendas atualizados com a comunicação exclusiva de sugestões
  no card de feedback.

## 1.15.0.05 - 2026-09-07

- O botão de voz e sua mensagem agora são um único bloco, centralizado pela
  altura real na faixa entre sugestões e navegação. A margem negativa que
  desequilibrava a área foi removida.

## 1.15.0.05-av128 - 2026-09-07

- Recursos do AvantaVendas atualizados com a composição única e responsiva do
  comando por voz.

## 1.15.0.04 - 2026-09-07

- O comando por voz passou a centralizar o conjunto de botão e legenda dentro
  da faixa livre da Sala de Botões. Em telas baixas, o controle se reduz e a
  legenda é ocultada antes de alcançar qualquer item da navegação.

## 1.15.0.04-av127 - 2026-09-07

- Recursos do AvantaVendas atualizados com a distribuição responsiva segura do
  comando por voz.

## 1.15.0.03 - 2026-09-07

- O aviso exibido abaixo do botão de voz passou a separar o andamento da ação e
  o cancelamento em linhas curtas, centralizadas no eixo do microfone.

## 1.15.0.03-av126 - 2026-09-07

- Recursos do AvantaVendas atualizados com a composição equilibrada do estado
  de processamento por voz.

## 1.15.0.02 - 2026-09-07

- A Solicitação por Voz passou a sugerir clientes com nomes aproximados, letras
  repetidas e pequenas variações de dicção antes de pedir uma nova fala.
- As ondas do microfone foram suavizadas, têm área de desenho ampliada sem
  recorte visual e a legenda do estado fica junto ao acionador. Os avisos do
  fluxo agora são centralizados explicitamente no viewport.

## 1.15.0.02-av125 - 2026-09-07

- Recursos do AvantaVendas atualizados com a busca aproximada de clientes e os
  refinamentos visuais do comando por voz.

## 1.15.0.01 - 2026-09-07

- Concluída no Supabase a limpeza restrita das observações técnicas da
  importação MySQL legada. Observações manuais e todos os demais dados dos
  clientes foram preservados.

## 1.15.0 - 2026-09-07

- A Solicitação por Voz passou por auditoria e agora entende pedido de venda,
  pedido consignado e pagamento como intenções distintas, sempre confirmadas
  antes da escrita e executadas pela mesma rotina oficial do AvantaVendas.
- A transcrição usa o modelo especializado de alta precisão da OpenAI com
  contexto comercial curto. O catálogo e os clientes continuam somente no
  banco da conta; a busca tolera dicção próxima, letras duplicadas e descrições
  humanas antes de sugerir uma opção segura.
- Todos os avisos do fluxo foram reduzidos ao necessário. Resultado e erro não
  repetem selo, conta, detalhes técnicos ou explicações; a confirmação no
  servidor e a geração de comprovante permanecem preservadas.
- Corrigido o pedido comum criado por voz para usar a forma oficial **Venda**,
  mantendo seu reflexo no saldo do cliente; consignados usam **Consignado** e
  seguem a atualização oficial de estoque.

## 1.15.0-av124 - 2026-09-07

- Recursos do AvantaVendas atualizados com auditoria e interpretação ampliada
  da Solicitação por Voz.

## 1.14.3.27 - 2026-09-07

- O microfone da Sala de Botões sempre inicia uma nova solicitação, sem
  reabrir automaticamente o último rascunho salvo.
- Solicitações por voz salvas ficam separadas por conta e aparecem em um aviso
  com contagem no topo da Sala. A lista permite concluir ou cancelar cada uma.

## 1.14.3.27-av123 - 2026-09-07

- Recursos do AvantaVendas atualizados com a central de solicitações de voz
  pendentes.

## 1.14.3.26 - 2026-09-07

- **Salvar para depois** da Solicitação por Voz agora é uma pílula tátil e
  centralizada, preservando Cancelar e Confirmar como as ações principais.
- A confirmação continua exibindo apenas os dados do lançamento e suas ações,
  sem marca, usuário, selo experimental ou textos redundantes.

## 1.14.3.26-av122 - 2026-09-07

- Recursos do AvantaVendas renovados com a pílula de salvamento do comando de
  voz.

## 1.14.3.25 - 2026-09-07

- A pergunta de esclarecimento sobre pagamento foi reduzida para **Confirme a
  forma de pagamento.**, sem repetir o nome da cliente ou informações já
  visíveis nas opções.

## 1.14.3.25-av121 - 2026-09-07

- Recursos do AvantaVendas renovados para aplicar os painéis compactos da voz
  mesmo em instalações com cache anterior.

## 1.14.3.24 - 2026-09-07

- Os painéis da Solicitação por Voz foram reduzidos ao essencial: pergunta,
  opções, resultado, comprovante e ações. Marca, selo experimental, conta,
  explicações redundantes e rodapé técnico não aparecem mais durante o fluxo.

## 1.14.3.24-av120 - 2026-09-07

- Recursos do AvantaVendas atualizados com os painéis compactos do comando de
  voz.

## 1.14.3.23 - 2026-09-07

- Durante transcrição e interpretação, o botão circular de voz continua
  cancelável e exibe um anel de processamento com a etapa atual, evitando a
  impressão de que a solicitação travou.
- A resolução do catálogo passou a reconhecer melhor variações fonéticas de
  transcrição, como **Paladin** para **Palladium**, sem alterar o produto fora
  do catálogo nem dispensar a escolha quando houver ambiguidade.

## 1.14.3.23-av119 - 2026-09-07

- Recursos do AvantaVendas atualizados com feedback de processamento e busca
  fonética de produtos no comando de voz.

## 1.14.3.22 - 2026-09-07

- O áudio volta a ser enviado assim que a gravação termina, sem etapa extra de
  confirmação. Durante a transcrição e a interpretação, o próprio botão de voz
  passa a ser um botão de cancelar e interrompe a solicitação em andamento.

## 1.14.3.22-av118 - 2026-09-07

- Recursos do AvantaVendas atualizados para o cancelamento direto no controle
  circular de voz.

## 1.14.3.21 - 2026-09-07

- Ao encerrar uma gravação por voz, o áudio permanece no aparelho até a pessoa
  escolher **Enviar áudio**. A nova etapa oferece **Cancelar envio**, que
  descarta a gravação sem chamar a transcrição.
- Os cards de dúvidas, confirmação, resultado, erro e preparação de envio da
  Solicitação por Voz agora se centralizam na tela também no celular.

## 1.14.3.21-av117 - 2026-09-07

- Recursos do AvantaVendas atualizados para o envio explícito do áudio e para a
  posição central dos avisos do comando de voz.

## 1.14.3.20 - 2026-09-07

- Corrigida a causa real do salto do microfone ao iniciar a gravação: o
  componente ativo agora é ancorado diretamente no mesmo ponto central do
  acionador azul, sem depender da altura calculada dentro do Shadow DOM.

## 1.14.3.20-av116 - 2026-09-07

- Recursos do AvantaVendas renovados para carregar a âncora única do botão de
  voz antes, durante e depois da captura.

## 1.14.3.19 - 2026-09-07

- O botão de voz da Sala de Botões agora preserva também o mesmo diâmetro em
  todos os estados. No mobile, o círculo azul, o círculo vermelho de gravação e
  o estado de processamento permanecem com 80 px, sem deslocamento aparente da
  borda superior ao iniciar ou encerrar o áudio.

## 1.14.3.19-av115 - 2026-09-07

- Recursos do AvantaVendas revisados com geometria idêntica do microfone antes,
  durante e depois da gravação.

## 1.14.3.18 - 2026-09-07

- O microfone permanece no mesmo ponto da Sala de Botões antes, durante e
  depois da gravação; o componente ativo usa exatamente a área do acionador.
- A resolução de produtos agora cruza todos os termos falados com nome, SKU,
  marca, categoria e descrição do catálogo real. Expressões como “Progressiva
  Paladium” localizam **Paladium**, e pequenas variações ortográficas geram
  sugestões próximas em vez de encerrar a busca imediatamente.

## 1.14.3.18-av114 - 2026-09-07

- Recursos do AvantaVendas revisados com microfone imóvel e busca de catálogo
  por múltiplos termos e similaridade.

## 1.14.3.17 - 2026-09-07

- A Solicitação por Voz agora preserva, na mesma sessão, todos os clientes e
  produtos já escolhidos, eliminando o ciclo de pedir novamente a Fernanda e o
  produto após cada desambiguação.
- A interpretação passou a reconhecer complementos de nome, apelidos, vínculo,
  profissão e local como parte da referência do cliente — por exemplo,
  “Fernanda influencer” — sem confundi-los automaticamente com produtos.
- As ondas do microfone ficaram menores e mais leves, mas passaram a usar uma
  área transparente ampliada para não revelar nem sofrer recorte quadrado.
- A apresentação das opções de cliente deixou de pesquisar e exibir metadados
  técnicos, mas continua usando observações manuais úteis à identificação. As
  330 anotações estritamente técnicas da importação MySQL foram removidas do
  banco, preservando as 55 observações restantes.

## 1.14.3.17-av113 - 2026-09-07

- Recursos do AvantaVendas revisados com sessão de desambiguação cumulativa,
  ondas sem recorte e opções de cliente sem metadados técnicos.

## 1.14.3.16 - 2026-09-07

- O microfone da Solicitação por Voz agora ocupa o centro vertical real entre
  **Dúvidas e Sugestões** e o botão “+” do menu inferior, adaptando-se à altura
  disponível em vez de depender de uma margem fixa.

## 1.14.3.16-av112 - 2026-09-07

- Recursos da Sala de Botões revisados com a faixa flexível de centralização do
  comando de voz, inclusive durante gravação e processamento.

## 1.14.3.15 - 2026-09-07

- Aumentado o respiro acima do microfone da Solicitação por Voz para posicioná-lo
  um pouco mais abaixo de **Dúvidas e Sugestões**, mantendo a centralização.

## 1.14.3.15-av111 - 2026-09-07

- Recursos visuais do AvantaVendas revisados com o novo afastamento do comando
  circular na Sala de Botões.

## 1.14.3.14 - 2026-09-07

- A Solicitação por Voz deixou de ocupar um card na grade reordenável da Sala
  de Botões. O próprio botão circular do microfone agora fica centralizado logo
  abaixo de **Dúvidas e Sugestões**.
- O primeiro toque inicia a gravação no próprio local, sem navegar ou abrir uma
  segunda página. Dúvidas, escolhas, confirmação e resultado aparecem em uma
  sobreposição compacta, mantendo a Sala de Botões visível ao fundo.
- Encerrar, cancelar ou compartilhar o comprovante devolve o usuário à mesma
  Sala. A ativação em **Configurações > Funções** continua mostrando ou
  ocultando todo o controle de voz.

## 1.14.3.14-av110 - 2026-09-07

- Recursos oficiais do AvantaVendas revisados para incorporar o microfone no
  bloco de assistência da Sala, sem alterar a ordem dos nove cards oficiais.

## 1.14.3.13 - 2026-09-07

- A Solicitação por Voz pode ser ativada em **Configurações > Funções**. Quando
  ligada, seu botão aparece na Sala de Botões e pode ser reorganizado; quando
  desligada, desaparece da navegação normal.
- O fluxo oficial é carregado somente no primeiro toque, mantém a interface
  isolada, não mostra a transcrição e apresenta apenas dúvidas, escolhas e a
  confirmação obrigatória antes de pedidos ou pagamentos reais.
- A captura exibe ondas proporcionais ao sinal efetivamente recebido pelo
  microfone, preserva solicitações incompletas ao fechar e reutiliza os
  comprovantes oficiais após a conferência do lançamento no banco.
- A preferência pertence à conta ativa e também é validada pelo servidor. Um
  pagamento sem forma informada oferece Pix, Dinheiro, cartões, Transferência
  ou Outro antes de preparar a confirmação.

## 1.14.3.13-av109 - 2026-09-07

- Recursos oficiais do AvantaVendas revisados para carregar sob demanda a
  Solicitação por Voz e refletir sua ativação por conta na Sala de Botões.

## 1.14.3.12 - 2026-09-07

- O cadastro empresarial de clientes passou a consultar CNPJ e CEP pelas rotas
  reais do AvantaLab, incluindo o código IBGE necessário aos documentos
  fiscais, sem usar a base demonstrativa no perfil conectado.
- Clientes, fornecedores, recebimentos e movimentos de estoque agora mantêm o
  formulário aberto, bloqueiam envio duplicado e só informam sucesso depois da
  confirmação do servidor.
- A carteira e o relatório do cliente passaram a calcular operações,
  faturamento e valores em aberto exclusivamente pelos registros do perfil.
  Registros comerciais que falham antes da persistência não permanecem na tela
  nem são gravados no armazenamento local do modo integrado.
- O atalho **Produtos e serviços > Abrir origem em Custos** passou a abrir o
  catálogo do mesmo perfil empresarial e preservar o retorno direto a Vendas.
- A tela integrada agora só monta a operação comercial depois de confirmar o
  cadastro e as permissões do perfil, impedindo que dados demonstrativos sejam
  exibidos durante a abertura ou no retorno de Custos. A ponte também retoma a
  própria origem segura quando o navegador omite a referência da página pai, e
  a identidade validada deixa de aguardar listagens duplicadas ou as demais
  consultas operacionais. A cor primária acompanha a resposta protegida do
  cadastro empresarial; tempos excessivos encerram com opção de nova tentativa.
- Os aliases públicos da solicitação por voz agora declaram `runtime` e
  renderização dinâmica de forma estática, como exigido pelo Next 16, sem mudar
  os mesmos handlers protegidos de `POST`.

## 1.14.3.11 - 2026-09-07

- Pedidos e pagamentos executados pelo laboratório de voz agora são relidos do
  banco antes da resposta de sucesso, conferindo empresa, cliente, valor e itens.
- A conclusão passou a exibir uma evidência verificável com conta, tipo, cliente,
  valor, situação, horários de gravação e conferência e identificador integral.
- A confirmação e o rodapé deixam explícito que o laboratório é experimental,
  mas as ações confirmadas gravam dados reais na conta ativa.

## 1.14.3.10 - 2026-09-07

- Vendas e Serviços passou a refletir o certificado A1 ativo na prontidão da
  Central Fiscal e na preparação das notas, sem simular conexão com o
  autorizador antes da confirmação segura.
- O acesso integrado agora carrega o perfil empresarial mesmo quando o catálogo
  de Custos está indisponível e oculta toda informação comercial até confirmar
  perfil e permissões; dados demonstrativos não são mais usados como fallback.
- Contadores, indicadores, equipe comercial, responsáveis técnicos e
  estabelecimento emissor passaram a derivar exclusivamente dos registros e
  usuários ativos do perfil acessado. Atalhos ainda demonstrativos foram
  removidos do modo integrado.

## 1.14.3.09 - 2026-09-07

- Ampliada a leitura visual do microfone no laboratório de voz com quatro ondas,
  maior deslocamento, contraste e brilho proporcionais ao sinal captado.
- A forma da onda continua derivada das amostras reais e permanece estática
  abaixo do limiar de voz, sem animação decorativa no silêncio.

## 1.14.3.08 - 2026-09-07

- O laboratório de voz passou a desenhar ondas ao redor do botão a partir das
  amostras reais do microfone, usando nível RMS e limiar adaptativo de ruído.
- A pulsação decorativa automática foi removida: durante silêncio as ondas
  permanecem estáticas e só respondem quando o sinal de voz supera o ruído
  ambiente, inclusive no modo de movimento reduzido.

## 1.14.3.07 - 2026-09-07

- Corrigido o ciclo de desambiguação de clientes e produtos no laboratório de
  voz: tocar em uma opção agora preserva seu identificador validado em vez de
  reinterpretar o mesmo nome pela IA.
- O backend recompõe os candidatos na conta ativa e aceita a escolha somente
  quando o identificador ainda pertence ao resultado daquela referência. A
  seleção não consome tokens e continua sujeita à confirmação final.

## 1.14.3.06 - 2026-09-07

- Corrigido o carregamento infinito da rota de solicitação por voz quando o
  servidor externo da porta 3021 não está ativo.
- Após seis segundos sem conexão, a página informa o comando necessário e
  oferece nova tentativa; com o servidor iniciado, a ponte volta a carregar
  automaticamente o estado autenticado do Avanta Vendas.

## 1.14.3.05 - 2026-09-07

- A interface descartável do laboratório de solicitação por voz foi isolada em
  `AvantaLab Projetos/prototipos/solicitacao-voz`, evitando concentrar código
  experimental no repositório oficial.
- A rota oculta `/teste/solicitacao-voz` passou a funcionar como uma ponte
  autenticada: o laboratório externo não recebe token, chave OpenAI ou acesso
  direto ao banco, e somente pode solicitar as quatro operações tipadas.
- APIs, schemas e adaptadores de clientes, produtos, pedidos e pagamentos
  permanecem no AvantaLab como núcleo reutilizável e revalidam toda ação no
  contexto da conta ativa antes de executar.

## 1.14.3.04 - 2026-09-07

- Certificados A1 já instalados podem ser verificados novamente sem novo
  arquivo ou senha; o resultado e os bloqueios técnicos ficam vinculados ao
  perfil empresarial e aparecem em linguagem operacional na interface.
- A ativação pendente agora registra evidências públicas de validação e evento
  de auditoria, sem retornar nem persistir a senha original do certificado.
- A leitura de LCRs oficiais grandes passou a usar limites ASN.1 explícitos e
  tolerância de relógio controlada, corrigindo a falsa pendência de revogação
  sem reduzir as validações de assinatura, vigência ou cadeia ICP-Brasil.
- A inicialização fiscal local passou a recuperar a mesma chave mestra do cofre
  do macOS, evitando perder o acesso ao certificado protegido após reiniciar o
  servidor de desenvolvimento.

## 1.14.3.03 - 2026-09-07

- Criado o laboratório oculto `/teste/solicitacao-voz`, com captura de áudio
  compatível com navegadores móveis, transcrição server-side e interpretação
  estruturada de comandos do Avanta Vendas.
- Pedidos por voz reutilizam o RPC oficial e pagamentos reutilizam o fluxo
  protegido por conta e RLS; toda escrita exige confirmação e relê clientes,
  produtos, preços, saldo e permissões antes de executar.
- Clientes e produtos ambíguos passam por desambiguação contextual, sem enviar
  catálogos completos à IA. Consultas de vendas e histórico não exigem
  confirmação, e comandos ainda não suportados não simulam execução.
- Métricas técnicas do laboratório ficam restritas ao desenvolvimento e à
  sessão do navegador, sem criação de tabela ou exposição de credenciais.

## 1.14.3.02 - 2026-09-07

- Vendas e Serviços integrado passou a calcular permissões exclusivamente para
  o usuário autenticado na Gestão, ignorando qualquer usuário de teste salvo
  anteriormente no navegador.
- Ajustes fiscais, certificado digital e administração agora respeitam o login
  real no perfil empresarial ativo, sem alterar a propriedade empresarial de
  cadastros, XML, DANFE ou documentos comerciais.

## 1.14.3.01 - 2026-09-06

- O lint passou a ignorar somente caches, builds, cópias nativas e bibliotecas
  minificadas, evitando milhões de ocorrências em artefatos que não são fonte.
- O escopo completo de Vendas agora passa no ESLint sem erros; padrões antigos
  de inicialização do protótipo e contratos JSON dinâmicos permanecem visíveis
  como avisos restritos aos dois componentes legados.
- Auxiliares PostgreSQL foram renomeados de `useClient` para `withClient`,
  eliminando a interpretação incorreta como React Hooks.

## 1.14.3 - 2026-09-06

- A recarga das operações comerciais agora recompõe itens e, nas ordens de
  serviço, agenda, execução, checklist, materiais, custos, aceite e anexos.
- Evidências de serviço passaram a ser arquivos privados do perfil empresarial,
  com validação de assinatura, limite transacional de cinco arquivos, checksum
  SHA-256, evento de auditoria e abertura por URL temporária.
- Textos de confirmação agora distinguem corretamente a persistência integrada
  do modo demonstrativo local, sem prometer armazenamento inexistente.

## 1.14.2 - 2026-09-06

- Devoluções totais de pedidos faturados agora restauram o estoque, cancelam
  parcelas abertas e encerram o rascunho fiscal na mesma transação.
- Conclusões de ordens de serviço podem ser estornadas com devolução dos
  materiais e cancelamento das parcelas e do rascunho de NFS-e.
- Estornos são bloqueados quando ainda existe recebimento líquido ou documento
  dentro do ciclo fiscal; nesses casos o sistema orienta a estornar o valor ou
  cancelar a emissão antes de repetir a operação.
- Rascunhos fiscais continuam imutáveis. O encerramento passa a ser registrado
  em marcador imutável próprio, com empresa, operação, motivo, autor e chave de
  idempotência.
- A Central Fiscal passou a reconhecer esses marcadores e corrigiu o vínculo da
  emissão pelo identificador do rascunho e da operação.

## 1.14.1 - 2026-09-06

- Ordens de serviço persistidas passaram a iniciar, concluir e cancelar por uma
  rota protegida e idempotente, sem criar estado somente no navegador.
- A conclusão reúne na mesma transação o apontamento, checklist, materiais,
  baixa de estoque, parcelas e rascunho de NFS-e; qualquer falha desfaz o
  conjunto integralmente.
- Materiais adicionados durante a execução são validados novamente contra o
  catálogo e o saldo do perfil; custos de catálogo vêm do cadastro mestre.
- O documento fiscal previsto da ordem de serviço agora é preservado desde a
  conversão do orçamento, permitindo preparar NFS-e somente após a conclusão.
- Entradas de produção e devolução passaram a reconhecer as descrições completas
  da interface, e a auditoria de fornecedores usa seu tipo de recurso próprio.
- Pedidos persistidos podem ser cancelados antes do faturamento, liberando a
  reserva na mesma transação protegida do ciclo comercial.
- Cancelamento após a conclusão e devolução de pedido faturado continuam
  bloqueados até existir o tratamento fiscal/financeiro de estorno integral.

## 1.14.0 - 2026-09-06

- Vendas e Serviços passou a persistir clientes, fornecedores, orçamentos,
  pedidos, ordens de serviço, recebimentos e movimentações de estoque no perfil
  empresarial ativo; o login permanece somente como autorização e autoria da
  auditoria.
- Produtos publicados recebem saldo inicial zero no estoque principal, sem
  estoque fictício. Entradas, saídas, inventários, reservas e baixas validam
  saldo físico, saldo reservado, concorrência, datas e idempotência no servidor.
- Recebimentos e estornos atualizam a receita mensal da Gestão pelo regime de
  caixa, com vínculo idempotente por empresa e competência.
- CPF e CNPJ passaram a usar dígitos verificadores; datas inexistentes,
  sequências inválidas, vencimentos incoerentes, contatos e endereços fiscais
  incompletos são bloqueados antes da gravação.
- A interface integrada deixa de misturar registros demonstrativos com dados
  reais e recarrega documentos comerciais, clientes, fornecedores, estoque e
  recebimentos do servidor.
- A emissão fiscal externa continua condicionada à migração, credenciais,
  certificado ativo e homologação do autorizador/provedor; nenhum teste local
  transmite documentos fiscais reais.

## 1.13.0.92 - 2026-09-06

- O atalho **Vendas e Serviços > Novo > Produto** passou a informar sua origem
  ao abrir Custos e Precificação; nesse contexto, o cabeçalho exibe **Voltar** e
  retorna diretamente ao Vendas do mesmo perfil empresarial.
- Aberturas diretas de Custos e Precificação pela Gestão continuam mostrando
  **Início**, sem alterar o fluxo normal do módulo.
- O menu **Novo** agora escurece a tela enquanto está aberto e fecha ao clicar
  fora ou pressionar Escape, mantendo visíveis apenas o acionador e as opções.

## 1.13.0.91 - 2026-09-06

- A página de **Vendas e Serviços** passou a receber a `corPrimaria` do perfil
  empresarial autenticado e a utilizá-la como base visual, seguindo o mesmo
  contrato de Custos e Precificação.
- Botões principais, navegação ativa, ícones, gráficos, foco e sombras derivam
  agora da cor do perfil; o azul institucional permanece como fallback quando
  não houver uma cor hexadecimal válida.

## 1.13.0.90 - 2026-09-06

- O menu esquerdo **Novo** de Vendas e Serviços passou a oferecer também
  **Cliente**, **Fornecedor** e **Produto**, respeitando as permissões do perfil.
- Cliente abre diretamente o formulário comercial; fornecedor possui cadastro
  rápido vinculado à empresa e fica disponível nas entradas de estoque; produto
  abre o cadastro mestre em Custos e Precificação já preparado para inclusão.
- As descrições de NF-e e NFC-e no menu deixaram de expor os códigos técnicos
  “modelo 55” e “modelo 65”, usando nomes compreensíveis para o usuário.

## 1.13.0.89 - 2026-09-06

- A página integrada de **Vendas e Serviços** deixou de repetir no topo os
  seletores de perfil empresarial e tabela de preços; o perfil continua vindo
  obrigatoriamente do acesso feito pela Gestão e o catálogo usa sua tabela
  padrão internamente.
- O cabeçalho local voltou à composição compacta **Início / marca AvantaLab /
  Ajustes**, sem o seletor de usuário de demonstração e sem o selo de protótipo.
- O conteúdo passou a ocupar toda a altura disponível, sem a segunda barra de
  cabeçalho, e o retorno preserva o perfil empresarial recebido no acesso.

## 1.13.0.88 - 2026-09-06

- A Gestão Mobile passou a exibir **Conteúdo AvantaVendas** no menu Sistemas,
  substituindo o rótulo anterior **Conteúdo do Vendas**.
- O controle de ativação e as mensagens do mesmo menu também adotaram a nova
  nomenclatura e descrevem a função como publicação para a equipe.
- A versão dos recursos móveis foi avançada para retirar o rótulo antigo de
  sessões que ainda estejam abertas ou com recursos em cache.

## 1.13.0.87 - 2026-09-06

- O módulo integrado antes apresentado como **Vendas Mobile** passou a se chamar
  **Conteúdo AvantaVendas** no catálogo, no menu e nas telas de publicação.
- A descrição agora explicita sua finalidade: publicar novidades, catálogo e
  materiais de divulgação para a equipe, sem confundi-lo com **Vendas e
  Serviços**.
- O identificador técnico `vendas_mobile`, as rotas, permissões, vínculos e dados
  foram preservados; a alteração é somente de nomenclatura e orientação.

## 1.13.0.86 - 2026-09-06

- O catálogo de Módulos passou a exibir **Acessar** imediatamente nos módulos
  Web de página total já instalados, incluindo Vendas e Serviços.
- A ação usa o registro central do módulo, fecha o catálogo e abre a rota com o
  perfil empresarial ativo, preservando as validações de vínculo e instalação.

## 1.13.0.85 - 2026-09-05

- Vendas e Serviços foi incorporado ao AvantaLab como módulo Web de página
  total, incluído no Business Pro e contratável no Business.
- Durante a finalização, o catálogo, a instalação, a assinatura e as APIs do
  módulo ficam restritos ao UUID do perfil empresarial Tridium; perfis pessoais
  não recebem o módulo e nenhum login é usado como chave de liberação.
- Cadastro do emitente, certificado A1, registros comerciais e metadados de
  XML/DANFE usam a empresa ativa como proprietária; o usuário aparece somente
  como vínculo, permissão e autor da auditoria.
- A interface validada passou a rodar na mesma implantação da Gestão, com dados
  locais isolados por empresa e backend fiscal privado. Emissão, numeração,
  assinatura, transmissão e cancelamento permanecem bloqueados no piloto; fica
  habilitada somente a instalação/validação protegida do A1 e o diagnóstico
  `NfeStatusServico` da SEFAZ-SP em homologação quando as travas técnicas forem
  configuradas no ambiente.

## 1.13.0.84 - 2026-09-05

- O futuro Vendas Web padronizou CNPJ como primeiro campo de identificação e
  CEP como primeiro campo de todo bloco de endereço.
- Cliente, empresa ativa e cadastro interno de emissor agora apresentam
  **Buscar** junto ao CNPJ e ao CEP, com preenchimento dos dados locais
  disponíveis e continuidade manual quando algum campo não for encontrado.
- Os dados da empresa foram separados em identificação e endereço fiscal para
  tornar o cadastro do emitente mais simples, sem expor detalhes do backend.

## 1.13.0.83 - 2026-09-05

- O cancelamento da NF-e paulista ganhou adaptador interno para montar e assinar
  o evento 110111 com o certificado A1 ativo, sem expor XML ou credenciais.
- O transporte mTLS aceita somente o serviço oficial de eventos da homologação
  paulista e valida lote, chave, tipo, sequência, protocolo e data do retorno.
- O pacote XSD oficial do cancelamento foi incorporado com origem e SHA-512;
  a conexão segue desligada até o ensaio autorizado com certificado controlado.

## 1.13.0.82 - 2026-09-05

- As estrelas da Constelação Avanta percorrem o interior das letras com maior
  velocidade, respeitando a máscara da arte oficial para preservar a silhueta.
- O fundo responde individualmente ao cursor, com dispersão, profundidade e
  retorno amortecido, além de movimento contínuo mais visível.
- Quando as letras teriam menos de 64 px de altura, o protótipo apresenta o A
  oficial em escala ampliada, incluindo adaptação da área de interação.

## 1.13.0.81 - 2026-09-05

- A Constelação Avanta ganhou estrelas com núcleos brancos mais luminosos,
  halos amplos e iluminação suave nos pontos menores do nome.
- O fundo estelar agora combina pontos distantes, estrelas luminosas e halos
  desfocados em primeiro plano, com variação de tamanho, cor e cintilação.
- Mantidos o desenho oficial da marca, a dispersão com retorno automático e
  o protótipo isolado para avaliação antes de integrar à página oficial.

## 1.13.0.80 - 2026-09-05

- A Central Fiscal agora diferencia o cancelamento de rascunho do cancelamento
  de uma NF-e já autorizada, disponível nas ações do documento.
- A solicitação exige permissão, confirmação explícita e justificativa de 15 a
  255 caracteres; autorização, protocolo e documentos originais são preservados.
- Foi criado um cenário local fictício para validar a experiência sem valor
  fiscal. A transmissão governamental real permanece bloqueada até a homologação
  do adaptador oficial e a migração de banco continua apenas como rascunho.

## 1.13.0.79 - 2026-09-05

- Constelação Avanta forma o nome completo a partir do arquivo oficial da
  marca, preservando o A característico e as proporções das letras.
- Estrelas flutuam continuamente; a passagem do ponteiro dispersa as próximas
  e elas recompõem o nome automaticamente por movimento amortecido.
- Ajustados o fundo estelar, a escala responsiva e o modo de movimento reduzido.

## 1.13.0.78 - 2026-09-04

- Refinada a Constelação Avanta após comparação direta com a referência da
  OpenAI: o “A” passou a usar trilhas estreitas com espaço negativo definido.
- Reduzidos o estouro luminoso, a quantidade de estrelas grandes e a densidade
  do campo, preservando pontos nítidos e brilhos pontuais.
- O palco inteiro agora reage ao movimento do ponteiro, com profundidade e
  rotação mais perceptíveis; arraste, teclado e movimento reduzido permanecem.

## 1.13.0.77 - 2026-09-04

- A Central Fiscal do protótipo local agora inclui uma NF-e fictícia rejeitada
  pelo código `778`, identificada como **Demonstração**, para validar o fluxo de
  revisão sem certificado ou transmissão real.
- No ensaio, o usuário altera somente o NCM, preserva série, número e histórico
  e conclui a revisão sem assinatura, rede ou acesso ao autorizador fiscal.
- O cenário demonstrativo é removido automaticamente quando o Vendas recebe uma
  sessão autenticada da Gestão e nunca se mistura aos documentos reais.

## 1.13.0.76 - 2026-09-04

- Criado o protótipo público e isolado **Constelação Avanta**, sem integração
  com a landing page oficial.
- Um campo responsivo de partículas passa da dispersão à forma do “A” do
  AvantaLab e volta a se expandir conforme a rolagem.
- O ensaio responde a ponteiro, arraste e teclado, limita a densidade e a
  resolução do canvas e oferece estado estático para movimento reduzido.

## 1.13.0.75 - 2026-09-04

- A Central Fiscal passou a separar a NF-e rejeitada do fluxo normal de emissão:
  a ação agora se chama **Revisar dados fiscais** e exibe o código e o motivo
  devolvidos pelo autorizador.
- Para a rejeição `778`, o usuário corrige somente o NCM dos produtos. Os demais
  retratos fiscais são recompostos no servidor, sem confiar no navegador.
- Salvar a revisão mantém série, número e tentativa anterior, volta a nota para
  **Número reservado** e não acessa certificado, não assina e não transmite.

## 1.13.0.74 - 2026-09-04

- Estruturada a retomada segura de NF-e rejeitada: o usuário precisa confirmar
  a revisão, o código da rejeição é conferido e a nota volta somente até a
  preparação com a mesma série, número e reserva.
- O rascunho original, a tentativa rejeitada e cada XML assinado permanecem
  imutáveis. Correções e artefatos agora recebem revisões próprias, e a nova
  assinatura usa sempre o retrato fiscal corrigido mais recente.
- A retomada não acessa certificado nem rede e não retransmite automaticamente.
  O laboratório PostgreSQL recebeu apenas os rascunhos locais `0008` e `0009`;
  a custódia continua com zero certificado real e a emissão pública bloqueada.

## 1.13.0.73 - 2026-09-04

- O ensaio de resiliência fiscal passou a cobrir rejeição `778` e o esgotamento
  das oito consultas de recuperação, sempre com uma única transmissão.
- A rejeição mantém somente o XML assinado e orienta **Revisar dados fiscais**;
  a fila esgotada conserva a emissão como enviada e orienta **Revisar emissão**.
- O status deixou de afirmar que uma equipe foi avisada, pois ainda não existe
  notificação automática. Código interno, XML e falhas da fila não são expostos,
  e a emissão real continua bloqueada.

## 1.13.0.72 - 2026-09-04

- O laboratório fiscal ganhou ensaios repetíveis de timeout após o registro do
  envio e de lote recebido ainda em processamento.
- A recuperação cobriu respostas `103`, `105` e duplicidade `204`, retentativa
  com espera e reconciliação pela chave e pelo protocolo, chegando ao DANFE sem
  repetir a transmissão.
- Os dois cenários usam certificado efêmero e respostas mantidas em memória,
  realizam zero acesso externo e apagam os artefatos temporários. A emissão real
  continua bloqueada na interface.

## 1.13.0.71 - 2026-09-04

- Criado um ensaio sintético repetível para o caminho interno completo da NF-e,
  usando os serviços reais de orquestração, ciclo, armazenamento e recuperação.
- A prova chegou a `danfe_ready`, preservou XML assinado, protocolo, `procNFe` e
  DANFE como quatro artefatos imutáveis e concluiu as três tarefas da fila.
- Somente o certificado e a resposta autorizadora são sintéticos e efêmeros. O
  ensaio realiza zero chamada de rede e remove o armazenamento temporário ao
  final; a interface segue sem rota ou serviço capaz de transmitir nota real.

## 1.13.0.70 - 2026-09-04

- O runtime local do futuro Vendas passou a compor assinatura, autorização,
  recibo/protocolo, armazenamento imutável e recuperação num orquestrador
  interno único.
- A execução exige ambiente, escopo e confirmação exatos de homologação mais
  token técnico de no mínimo 32 bytes, validado novamente em cada chamada. A
  saída remove recursivamente XML, chave privada, certificado, senha e token.
- O orquestrador nasce bloqueado, não possui rota e o serviço de emissão usado
  pela interface permanece nulo. A rota da fila continua indisponível e nenhum
  certificado ou serviço fiscal real foi acessado.

## 1.13.0.69 - 2026-09-04

- Criado o transporte mTLS separado para consultar recibo e protocolo da NF-e
  nos serviços oficiais `NFeRetAutorizacao` e `NfeConsultaProtocolo` 4.00 da
  SEFAZ-SP em homologação.
- O contrato aceita somente recibo paulista de 15 dígitos ou chave paulista de
  44 dígitos e recusa produção, redirecionamento, troca de operação, conteúdo
  ativo de emissão e identificadores duplicados antes de ler o certificado.
- O adaptador está apenas no runtime local, sem rota pública, sem ligação à fila
  ou ao comando de emissão. Nenhum certificado real ou serviço fiscal foi
  acessado.

## 1.13.0.68 - 2026-09-04

- Criado o transporte mTLS separado para `NFeAutorizacao` 4.00 no endereço
  oficial da SEFAZ-SP em homologação, com A1 ativo e cadeia pública validada.
- O contrato aceita somente um lote síncrono com uma NF-e modelo 55 assinada,
  ambiente 2 e chave paulista; produção, redirecionamento, lote assíncrono,
  múltiplas notas e outras operações são recusados antes de ler o certificado.
- O autorizador está apenas no runtime local, sem rota e sem ligação ao comando
  de emissão. Nenhuma nota, certificado real ou serviço fiscal foi acessado.

## 1.13.0.67 - 2026-09-04

- A ativação do certificado A1 no laboratório passou a consultar
  automaticamente a disponibilidade da SEFAZ-SP depois de aprovar titularidade,
  validade, cadeia, revogação, assinatura e TLS mútuo.
- A disponibilidade do autorizador é informativa: uma paralisação ou falha de
  rede não desativa um certificado válido e será conferida novamente antes de
  uma futura emissão.
- O retorno ao Vendas expõe apenas **conexão fiscal verificada/disponível**, sem
  endpoint, código técnico, motivo interno, certificado, senha ou XML. Nenhum
  certificado real foi instalado e nenhuma consulta externa foi executada.

## 1.13.0.66 - 2026-09-04

- Preparado o transporte mTLS exclusivo para consultar o `NfeStatusServico`
  4.00 no endereço oficial de homologação da SEFAZ-SP. Ele lê somente o A1
  ativo da custódia protegida, reconstrói uma cópia temporária com a cadeia
  pública validada e apaga da memória tanto o material carregado quanto a cópia.
- O contrato aceita apenas o envelope `consStatServ` de SP em homologação e
  recusa produção, redirecionamento, endereço alternativo, NF-e, autorização,
  consulta de protocolo, inutilização ou evento antes de carregar o certificado
  ou abrir rede.
- O adaptador está disponível apenas no runtime do laboratório e ainda não
  possui ação pública que o invoque. A transmissão de notas permanece
  desabilitada; nenhum certificado real ou webservice fiscal foi acessado.

## 1.13.0.65 - 2026-09-04

- O runtime fiscal local passou a conectar o assinador real da NF-e ao A1
  mantido na custódia protegida. A chave privada é aberta somente em memória e
  nunca é devolvida ao navegador.
- Antes de assinar, o servidor exige certificado com situação ativa e repete
  titularidade, validade, chave, cadeia oficial, raiz fixada e LCR. O XML
  assinado é novamente validado e guardado como artefato imutável antes da
  transição transacional para `signed`.
- A conexão foi limitada ao laboratório PostgreSQL local e não habilita a etapa
  automática de transmissão. Sem certificado ativo ou fora do laboratório, o
  assinador permanece indisponível; nenhum A1 real ou SEFAZ foi acessado.

## 1.13.0.64 - 2026-09-04

- O backend fiscal passou a reconstruir automaticamente a cadeia pública do A1
  quando o arquivo instalado não trouxer todas as autoridades intermediárias.
- A complementação usa somente o pacote oficial vigente da ICP-Brasil, em URL
  fixa e sem redirecionamento, depois de confirmar o SHA-512 publicado pelo ITI.
  O caminho reconstruído é novamente validado até uma raiz oficial fixada antes
  de qualquer consulta de revogação.
- Pacote indisponível, alterado, excessivo ou sem caminho confiável mantém o
  certificado **Instalado** e inativo. Não há configuração adicional na tela,
  nenhum certificado real foi usado e nenhuma nota foi transmitida.

## 1.13.0.63 - 2026-09-04

- O backend do certificado passou a consultar e validar LCR v2 conforme o
  DOC-ICP-04/RFC 5280, sempre depois de aprovar localmente titular, validade,
  chave, cadeia e raiz ICP-Brasil.
- A LCR precisa estar vigente, conter as extensões obrigatórias e ter assinatura
  válida da autoridade emissora. Revogação, adulteração, expiração, excesso de
  tamanho ou indisponibilidade mantêm o A1 **Instalado** e inativo.
- A consulta restringe protocolo, porta, host, redirecionamento, tempo e tamanho.
  Nenhum certificado real foi usado e nenhuma nota foi transmitida.

## 1.13.0.62 - 2026-09-04

- O backend fiscal passou a trazer as seis raízes de assinatura ICP-Brasil
  vigentes v4, v5, v6, v7, v12 e v13, publicadas pela AC-Raiz/ITI.
- As impressões SHA-256 foram conferidas contra os certificados oficiais e o
  pacote vigente foi validado pelo SHA-512 publicado pelo próprio ITI. Raízes
  expiradas deixam automaticamente o conjunto aceito.
- A configuração é exclusivamente técnica e invisível ao usuário. A ativação
  continua bloqueada até existir evidência real e vigente de LCR ou OCSP;
  nenhum certificado real ou órgão fiscal foi acessado.

## 1.13.0.61 - 2026-09-04

- Preparado o validador server-side que poderá promover o A1 de **Instalado**
  para **Certificado ativo** somente com titularidade, validade, chave, cadeia
  ICP-Brasil, raiz fixada, revogação, assinatura e TLS mútuo aprovados.
- A promoção de estado e a auditoria são atômicas. Evidências incompletas ou
  indisponíveis mantêm o certificado instalado e inativo, sem simular sucesso.
- O rascunho `0007` foi aplicado somente ao PostgreSQL descartável da interface,
  que continua sem certificado. Nenhum A1 real, LCR/OCSP, SEFAZ ou ambiente
  governamental foi acessado.

## 1.13.0.60 - 2026-09-04

- A tela simples de **Ajustes > Certificado digital** foi conectada à Gestão
  autenticada: arquivo e senha seguem por um canal dedicado, sem entrar no
  armazenamento do navegador, e a senha é descartada depois da importação.
- A situação persistente agora aparece de forma objetiva como **Não
  configurado**, **Instalado** ou **Certificado ativo**. A interface não exibe
  estabelecimento, conexão SEFAZ, chave mestra ou administração técnica.
- A migração de custódia foi aplicada somente ao PostgreSQL descartável do
  laboratório, e a preparação automática desse banco passou a incluí-la. A
  chave aleatória local fica protegida no Chaves do macOS, fora do código e do
  banco.
- Nenhum certificado real foi selecionado, nenhuma senha de certificado foi
  informada e nenhuma conexão ou transmissão fiscal foi realizada.

## 1.13.0.59 - 2026-09-04

- Preparada a custódia persistente do certificado A1 do futuro Vendas: o arquivo
  normalizado recebe senha interna aleatória e envelope autenticado AES-256-GCM,
  vinculado à empresa e a uma chave mestra mantida fora do banco.
- O rascunho de banco mantém o certificado no schema fiscal privado, sem acesso
  de navegador, registra substituições em auditoria imutável e nunca grava a
  senha digitada pelo usuário.
- A situação foi separada corretamente entre **instalado, aguardando validação**
  e **certificado ativo**. A emissão só poderá usar o A1 depois de cadeia
  ICP-Brasil e revogação serem confirmadas no servidor.
- A API autenticada de instalação e consulta está preparada, mas permanece
  desligada enquanto a migração local e a chave mestra não forem habilitadas.
  Nenhum certificado real foi acessado e nenhuma conexão SEFAZ foi realizada.

## 1.13.0.58 - 2026-09-04

- Corrigido o fluxo da NF-e: o certificado digital é configurado uma única vez
  para a empresa e não aparece como etapa manual em cada nota.
- **Continuar emissão** passou a representar um único comando protegido. O
  servidor confere o documento, localiza automaticamente o certificado ativo,
  assina e transmite; não existem botões separados para adicionar certificado
  ou assinar dentro da emissão.
- O laboratório permanece bloqueado antes da assinatura e da transmissão porque
  ainda não existe A1 instalado no armazenamento protegido. O usuário recebe a
  orientação para revisar **Ajustes > Certificado digital**, sem informar arquivo
  ou senha novamente na nota.
- A orquestração automática foi validada com adaptadores sintéticos, inclusive a
  retomada segura de uma NF-e já assinada sem repetir assinatura ou envio.

## 1.13.0.57 - 2026-09-04

- A Central Fiscal passou a separar claramente **Continuar emissão**,
  **Adicionar certificado** e **Assinar NF-e**, exibindo cada ação somente no
  ponto correspondente do fluxo.
- A Gestão ganhou a ponte autenticada e a rota protegida para solicitar a
  assinatura. XML, chave de acesso, senha, certificado e chave privada não são
  devolvidos ao navegador; a assinatura também não transmite a nota à SEFAZ.
- Sem um certificado A1 instalado e ativo no armazenamento protegido do
  servidor, a operação falha fechada com a orientação simples para adicioná-lo.
  O certificado da Tridium não foi acessado e a emissão local permaneceu em
  `number_reserved`.

## 1.13.0.56 - 2026-09-04

- Uma NF-e com número reservado agora oferece **Continuar emissão** nas ações.
  A etapa recompõe o documento definitivo no servidor, reconfirma os dados e o
  XSD e informa quando ele está pronto para receber a assinatura digital.
- A resposta entre Gestão e Vendas usa um canal dedicado à solicitação, com
  origem validada e retorno limitado a dados operacionais; XML, chave de acesso,
  certificado e material sensível não chegam ao navegador.
- O ensaio integrado preservou a série 1, o número 1 e a versão 3 no estado
  `number_reserved`. Nenhum certificado real foi lido, nenhuma assinatura foi
  persistida e nenhuma tentativa de transmissão à SEFAZ foi criada.

## 1.13.0.55 - 2026-09-04

- A Central Fiscal passou a oferecer **Emitir NF-e** nas ações do documento
  preparado. A confirmação revisa os dados e reserva série e número de forma
  transacional, idempotente e protegida pela permissão `fiscal.issue`.
- A interface mantém numeração e detalhes técnicos no servidor: o usuário vê
  apenas a revisão, a confirmação e o resultado. O primeiro ensaio integrado
  vinculou a série 1 e o número 1 e atualizou a situação para **Número reservado**.
- Esta etapa permanece no PostgreSQL local de homologação. Nenhum certificado
  foi acessado, nenhum XML foi assinado e nenhuma conexão ou transmissão à
  SEFAZ foi realizada.

## 1.13.0.54 - 2026-09-04

- O laboratório integrado passou a oferecer um catálogo local autenticado como
  contingência de desenvolvimento quando Custos e Precificação ainda não está
  publicado, sem expor custos e mantendo o estoque explicitamente não integrado.
- O fluxo completo foi comprovado no navegador: pedido confirmado, separação,
  faturamento, parcela, rascunho fiscal, abertura da emissão e validação da NF-e
  com a versão 1 das regras fiscais publicadas.
- A preparação converte a data para o fuso fiscal de São Paulo e aplica pré-XML
  e XSD. O resultado ficou em `prepared`, com série e número apenas candidatos;
  nenhuma numeração foi reservada, nenhum certificado foi acessado e nenhuma
  transmissão à SEFAZ ou alteração no Supabase remoto ocorreu.
- O preparador do laboratório passou a instalar também a fila de recuperação e
  a governança de artefatos exigidas pela consulta fiscal, sempre no PostgreSQL
  local e descartável.

## 1.13.0.53 - 2026-09-04

- O laboratório integrado de Vendas permanece acessível mesmo quando o perfil
  ativo ainda não possui Custos e Precificação, permitindo concluir os ajustes
  fiscais sem confundir a indisponibilidade do catálogo com a do módulo.
- **Regras fiscais** passou a reunir responsável, data e as duas confirmações
  necessárias no mesmo fluxo, sem exigir a abertura de outra configuração.
- A publicação da versão 1 foi validada pelo navegador com a conta de revisão e
  confirmada no PostgreSQL local: sete regras revisadas, vínculo com a empresa,
  confirmações e auditoria. Nenhum certificado, SEFAZ ou banco remoto foi usado.

## 1.13.0.52 - 2026-09-04

- O laboratório comercial passou a validar a publicação das regras fiscais com
  um JWT real emitido pelo Supabase local, vínculo ativo com a empresa e o
  resolvedor oficial de permissões do módulo.
- A prova autenticada publica a versão 2, relê a configuração pela rota HTTP e
  confirma os bloqueios `401` sem sessão e `403` para outra empresa.
- Usuário, senha, token, banco e estruturas usados no ensaio são temporários e
  removidos ao final; nenhum projeto remoto, certificado ou SEFAZ foi acessado.

## 1.13.0.51 - 2026-09-04

- **Ajustes > Empresa e notas > Regras fiscais** passou a distinguir rascunho
  local, ausência de publicação, indisponibilidade e versão fiscal publicada.
- A Gestão mantém sessão, token e empresa ativa fora do protótipo e encaminha a
  consulta ou publicação por uma nova rota local protegida.
- Publicar exige `fiscal.configure`, revisão integral, versão esperada e chave
  idempotente; conflitos recarregam a versão vigente sem simular sucesso.
- A integração continua restrita ao laboratório de desenvolvimento. Nenhuma
  migração remota, certificado real ou conexão com a SEFAZ foi executada.

## 1.13.0.50 - 2026-09-04

- O futuro Vendas ganhou um repositório fiscal server-side por empresa para a
  matriz revisada e publicada, com versão esperada, hash do conteúdo,
  idempotência e auditoria append-only.
- A preparação da NF-e passa a consumir somente a regra publicada da empresa e
  bloqueia quando ela não existe, não foi integralmente revisada ou não
  corresponde à operação.
- O retrato imutável do item comercial agora preserva origem da mercadoria,
  unidade tributável, CST/CSOSN, PIS, COFINS e campos preparados para IBS/CBS,
  impedindo que uma alteração posterior do produto mude o documento faturado.
- O laboratório PostgreSQL local validou publicação, repetição idempotente,
  resolução da regra e preparação fiscal integrada. Nenhuma migração remota,
  certificado real ou conexão com a SEFAZ foi utilizada.

## 1.13.0.49 - 2026-09-04

- A Central Fiscal passou a distinguir **Abrir emissão fiscal** de **Validar
  dados fiscais**: abrir cria apenas o vínculo privado da NF-e em homologação;
  validar é a etapa posterior de regra tributária, pré-XML e XSD.
- A nova validação atravessa uma ponte autenticada que mantém token, empresa e
  permissões na Gestão e aceita somente retorno `prepared` sem numeração,
  certificado, assinatura ou transmissão.
- Enquanto a matriz fiscal revisada não possuir repositório server-side, a
  validação bloqueia com orientação clara. O sistema não deduz tributação a
  partir do navegador ou do cadastro do produto.
- Nenhuma migração remota foi aplicada, nenhum certificado foi acessado e não
  houve conexão ou tentativa de transmissão à SEFAZ.

## 1.13.0.48 - 2026-09-04

- O laboratório integrado do futuro Vendas passou a consultar a matriz de
  permissões pela sessão e pela API protegida da Gestão, sem entregar token,
  perfil empresarial interno ou credenciais ao protótipo isolado.
- A tela de **Usuários e permissões** distingue modo demonstrativo, consulta
  protegida e gravação conectada; quando a persistência não está instalada, a
  edição fica bloqueada com uma orientação clara.
- O contrato de alterações transmite apenas diferenças de perfil ou usuário e
  aceita liberar, bloquear ou voltar a herdar o padrão. A escrita remota fica
  desligada por padrão e só pode ser habilitada por configuração explícita.
- O ensaio PostgreSQL/Supabase descartável validou liberação, bloqueio,
  herança, proteção administrativa, auditoria imutável e rollback. Nenhuma
  migração remota foi aplicada.

## 1.13.0.47 - 2026-09-04

- A matriz granular do futuro Vendas foi unificada entre Gestão, protótipo e
  resolvedor server-side: 45 permissões para Gestor e Administrador, 35 para
  Operador completo e 10 para Operador simples.
- A configuração de acessos passou a apresentar explicitamente a permissão
  **Faturar**, mantendo as exceções por perfil e por usuário.
- Confirmar, separar, faturar, cancelar e devolver pedidos agora conferem todas
  as permissões comerciais, de estoque e fiscais exigidas pela ação. Operador
  simples pode criar e salvar o rascunho, mas não confirma por padrão.
- O alinhamento foi validado apenas no laboratório local. Nenhuma migração foi
  aplicada, nenhum acesso remoto foi alterado e não houve transmissão fiscal.

## 1.13.0.46 - 2026-09-04

- O laboratório integrado passou a transportar os identificadores reais dos
  itens publicados por Custos e Precificação até o backend comercial.
- Pedido confirmado pode ser persistido de forma autenticada e idempotente; o
  servidor relê ou cadastra o cliente, relê catálogo e preços e avança o ciclo
  até confirmação, separação ou faturamento conforme a ação solicitada.
- No faturamento, parcelas e rascunho fiscal são criados pelos serviços
  transacionais já validados. O estoque continua explicitamente não integrado.
- A empresa, o usuário e as permissões são resolvidos somente pela Gestão; o
  iframe não recebe token e não pode declarar esses dados.
- O fluxo permanece fechado quando o runtime ou as permissões não estiverem
  configurados. Nenhuma migração remota, certificado ou transmissão fiscal foi
  executada.

## 1.13.0.45 - 2026-09-04

- Rascunhos persistidos e prontos de NF-e ganharam a ação autenticada
  **Preparar emissão** na Central Fiscal e nas ações da operação comercial.
- A Gestão mantém sessão e empresa ativa, exige `fiscal.prepare` e encaminha ao
  laboratório somente o identificador seguro do rascunho.
- O backend confere empresa, pedido faturado, integridade e vínculo antes de
  abrir ou reencontrar a mesma emissão em homologação; repetir a ação não cria
  duplicidade.
- Esta etapa não reserva série ou número, não acessa certificado, não assina e
  não transmite à SEFAZ. Nenhuma migração ou projeto remoto foi alterado.

## 1.13.0.44 - 2026-09-04

- A Gestão Mobile passa a reconhecer o Android nativo como canal próprio de
  assinatura: Pessoal Premium usa Google Play e restauração de compras; Business
  e Business Pro continuam apenas para acesso a contratos empresariais já ativos.
- A conciliação da RevenueCat registra a origem correta entre App Store e Google
  Play e libera o Premium Pessoal em qualquer perfil pessoal do mesmo login.
- O menu diferencia excluir somente um perfil da solicitação de exclusão
  definitiva da conta da Gestão, disponível também em página pública própria.
- O projeto Android declara as permissões de notificações, câmera e microfone
  usadas sob ação do usuário e sincroniza os plugins nativos necessários.

## 1.13.0.43 - 2026-09-04

- A Central Fiscal do laboratório passou a listar os rascunhos comerciais
  persistidos e a emissão correspondente, isolados por empresa e pela permissão
  efetiva `fiscal.view`.
- Pedido faturado, rascunho e emissão usam o mesmo UUID por contrato; a consulta
  confirma também empresa e origem antes de apresentar o vínculo, sem criar uma
  tabela duplicada.
- Recarregar a tela ou repetir a abertura com outra chave segura reencontra a
  mesma emissão, inclusive quando ela já avançou de estado. Um vínculo divergente
  falha fechado antes de qualquer nova ação fiscal.
- A Gestão mantém o token e a empresa ativa fora do iframe e encaminha ao
  protótipo somente o retrato necessário. XML, PDF, certificado, referências de
  armazenamento, checksums e detalhes da fila não integram essa lista.
- O ensaio PostgreSQL/Supabase local confirmou a leitura ponta a ponta, sem rede
  externa, certificado real, tentativa de SEFAZ, migração aplicada ou projeto
  remoto vinculado.

## 1.13.0.42 - 2026-09-05

- A Central Fiscal do laboratório de Vendas passou a consumir visualmente o
  contrato autenticado de situação da emissão, preservando o estado local para
  rascunhos demonstrativos sem vínculo real.
- A tabela e os detalhes distinguem processamento, autorização, rejeição,
  recuperação em andamento e indisponibilidade sem expor fila, armazenamento,
  SEFAZ ou mensagens técnicas ao usuário.
- XML autorizado e DANFE aparecem separadamente nas ações somente quando o
  backend os declarar disponíveis, respeitando permissões próprias de download;
  a fila continua sem comando no navegador.
- A Gestão mantém token e empresa ativa, consulta o laboratório por um proxy
  restrito ao desenvolvimento local e devolve ao protótipo apenas dados seguros
  ou uma concessão HTTPS temporária para o arquivo.
- Nenhuma transmissão foi feita, nenhum certificado real foi utilizado e
  nenhuma migração ou projeto remoto foi alterado.

## 1.13.0.41 - 2026-09-05

- O futuro Vendas ganhou uma borda autenticada de consulta da emissão para a
  Central Fiscal, isolada por empresa e pela permissão `fiscal.view`.
- A resposta apresenta somente situação operacional e disponibilidade do XML e
  DANFE; referências privadas, checksums e erros internos não são expostos.
- O executor persistente da fila ganhou uma entrada exclusiva para agendador,
  protegida por segredo interno e desligada por padrão. Usuários não executam a
  fila por botões da interface.
- Mesmo com a flag do executor ativa, o runtime permanece bloqueado até existir
  o conector real de certificado, mTLS e retorno da SEFAZ.
- O ensaio PostgreSQL concluiu as três tarefas da emissão e confirmou
  `danfe_ready` sem retransmissão, rede externa ou certificado da Tridium.
  Nenhuma tela, migração ativa ou projeto remoto foi alterado.

## 1.13.0.40 - 2026-09-05

- A fila fiscal do futuro Vendas passou a consultar recibo ou protocolo sem
  retransmitir a NF-e quando o resultado do envio precisar ser recuperado.
- O protocolo bruto ficou restrito ao contrato protegido do backend; respostas
  públicas informam somente situação e metadados seguros.
- Depois da autorização, o serviço combina o XML assinado e o protocolo da
  mesma chave, grava `procNFe.xml`, gera o DANFE e registra cada artefato junto
  com a transição fiscal em uma única transação PostgreSQL.
- O ensaio local concluiu a emissão em `danfe_ready`, versão 8, com quatro
  artefatos imutáveis, oito eventos e oito operações.
- O transporte continuou simulado em memória. Não houve conexão externa,
  retransmissão real, uso do certificado da Tridium, API pública, tela,
  migração aplicada ou projeto remoto alterado.

## 1.13.0.39 - 2026-09-05

- A NF-e assinada ganhou abertura transacional de tentativa: lote, emissão em
  `submitted`, auditoria, idempotência e tarefa de recuperação são gravados
  antes do transporte, sem incluir XML ou segredo no banco de eventos.
- O fluxo relê o `signed_xml` pelo armazenamento privado, confere checksum,
  assinatura, CNPJ e chave e resolve a referência do certificado somente no
  servidor antes de montar o SOAP 1.2 de homologação.
- Resposta síncrona autorizada grava `protocolNFe.xml` de forma imutável e
  confirma `authorized`; lote pendente avança para `processing` com recibo e
  rejeição preserva código e motivo sem criar protocolo autorizado.
- O ensaio PostgreSQL chegou à versão 6 com dois artefatos, seis eventos, seis
  operações, uma tentativa e duas tarefas de recuperação.
- Todo transporte foi simulado em memória. Nenhuma conexão externa foi aberta,
  a SEFAZ real não recebeu documento e o certificado da Tridium não foi usado.
  Não houve API pública, tela, migração aplicada ou projeto remoto alterado.

## 1.13.0.38 - 2026-09-05

- A NF-e numerada ganhou o fluxo server-side protegido de assinatura XMLDSig.
  O provedor A1 encapsula a chave privada, apaga o PKCS#12 carregado e devolve
  o XML assinado somente para validação e armazenamento internos.
- O XML assinado é reconferido por referência, digest, RSA, CNPJ do emissor e
  XSD, recebe SHA-256 e rota imutável própria `signedNFe.xml`.
- Após a guarda, uma única transação registra o metadado `signed_xml`, avança a
  emissão de `number_reserved` para `signed` e inclui evento e operação
  idempotente. Falha do banco não declara a emissão como assinada.
- O laboratório PostgreSQL confirmou emissão na versão 4, chave com 44 dígitos,
  checksum, um artefato assinado, quatro eventos e quatro operações.
- A validação usou somente credencial sintética controlada. O certificado da
  Tridium não foi acessado e não houve mTLS, consulta ou transmissão à SEFAZ,
  API pública, tela, migração aplicada ou projeto remoto alterado.

## 1.13.0.37 - 2026-09-05

- A NF-e numerada ganhou montagem determinística do XML definitivo para
  assinatura, usando exatamente a série e o número reservados, a data, o cNF,
  a regra tributária e a versão do gerador congelados na preparação.
- Antes da assinatura, o serviço reconfirma empresa, permissão `fiscal.issue`,
  versão, vínculos, hash comercial, reserva, versão tributária e digest dos
  parâmetros fiscais. Qualquer mudança exige nova preparação.
- O XML definitivo passa novamente pelo XSD e por uma bancada XMLDSig efêmera
  somente em memória, provando referência, digest, RSA, chave e XSD assinado
  sem usar o certificado real e sem retornar conteúdo fiscal ou segredo.
- O ensaio PostgreSQL confirmou que a prova mantém a emissão em
  `number_reserved`, versão 3, sem chave persistida, artefato, evento adicional
  ou tentativa de transmissão.
- Certificado A1 real, assinatura persistente, armazenamento do XML assinado e
  conexão com a SEFAZ seguem desligados. Nenhuma tela, API, migração ativa ou
  projeto remoto foi alterado.

## 1.13.0.36 - 2026-09-04

- A NF-e preparada ganhou reserva fiscal transacional e idempotente no
  laboratório PostgreSQL local, avançando de `prepared` para
  `number_reserved` somente com a permissão efetiva `fiscal.issue`.
- A mesma transação serializável bloqueia a sequência ativa, pula numerações
  reservadas ou em inutilização, cria a reserva, atualiza o próximo número,
  vincula série e número à emissão e registra evento e operação.
- Repetir a mesma confirmação devolve a reserva existente sem consumir outro
  número. Versão desatualizada, estado incorreto, conflito idempotente ou série
  ausente encerram a operação sem avanço parcial.
- O ensaio integrado confirmou emissão na versão 3, série 1, número 1, uma
  reserva, três eventos e três operações, com a sequência avançada para 2.
- Certificado, assinatura, chave de acesso, lote, transmissão e SEFAZ seguem
  desativados. Nenhuma tela, API, migração ativa ou projeto remoto foi alterado.

## 1.13.0.35 - 2026-09-04

- A emissão privada de NF-e criada pelo faturamento agora pode avançar de
  `draft` para `prepared` no laboratório PostgreSQL local.
- A preparação relê e confere o hash do retrato comercial, exige regra
  tributária aprovada por um resolvedor server-side, identifica o próximo
  número sem consumi-lo, monta o pré-XML e executa o XSD oficial versionado.
- Natureza da operação, presença, CSOSN/CST, origem e PIS/COFINS não recebem
  suposições automáticas: ausência ou reprovação mantém a emissão em rascunho.
- O evento privado registra apenas metadados seguros, digest e referência da
  regra aplicada. O pré-XML não é persistido nessa etapa.
- A repetição idempotente reutiliza a preparação anterior. O ensaio confirmou
  emissão na versão 2, dois eventos e duas operações, mantendo série e número
  nulos e a sequência fiscal intacta.
- Certificado, assinatura, reserva, transmissão e consulta à SEFAZ permaneceram
  desativados. Nenhuma tela, API, migração ativa ou projeto remoto foi alterado.

## 1.13.0.34 - 2026-09-03

- O rascunho comercial imutável de NF-e agora pode abrir, de forma idempotente,
  uma emissão no repositório fiscal privado do laboratório PostgreSQL local.
- A ponte reconfirma empresa, módulo e `fiscal.prepare`, exige pedido faturado,
  rascunho pronto, emissor interno válido e SHA-256 íntegro antes de criar o
  estado fiscal inicial `draft` em homologação.
- A emissão utiliza o identificador do próprio rascunho, preserva o vínculo com
  o pedido e grava um único evento e uma única operação mesmo após repetição.
- Este passo não reserva série ou número, não monta XML, não usa certificado,
  não assina, não transmite e não consulta a SEFAZ. NFC-e e NFS-e são recusadas
  explicitamente pelo piloto de NF-e e seus rascunhos permanecem preservados.
- O ensaio integrado aplicou e reverteu os contratos comercial e fiscal apenas
  no Supabase local descartável, confirmou bloqueio ao usuário autenticado e
  terminou sem projeto remoto vinculado. Nenhuma tela, API ou migração ativa
  foi publicada.

## 1.13.0.33 - 2026-09-03

- O pedido em separação ganhou faturamento transacional candidato no laboratório
  PostgreSQL local. A mesma transação baixa a reserva do estoque, cria as
  parcelas a receber, congela o rascunho fiscal e registra a auditoria.
- As parcelas preservam o valor exato do pedido, o número contratado e os
  vencimentos mensais. Movimentos de estoque e eventos financeiros continuam
  imutáveis, e repetir o faturamento não duplica saldo, parcela ou rascunho.
- O núcleo passou a 19 tabelas com `vendas_fiscal_rascunhos`, um retrato
  comercial imutável compatível com NF-e, NFC-e e NFS-e. Ele não reserva número,
  não assina, não transmite e nunca representa documento autorizado.
- O emitente é resolvido no servidor e apenas campos fiscais permitidos entram
  no retrato. Pedidos com pendência mantêm o rascunho sinalizado para revisão.
- A matriz ganhou a permissão específica `sales.invoice`, permitindo controlar
  o faturamento por perfil ou usuário separadamente da edição de pedidos.
- Nenhuma tela, API, migração ativa ou conexão governamental foi publicada.

## 1.13.0.32 - 2026-09-03

- O pedido de venda ganhou ciclo persistente candidato de confirmação, início
  da separação e cancelamento no laboratório PostgreSQL local.
- A confirmação verifica cliente ativo, forma de pagamento, versão concorrente,
  permissões e disponibilidade e reserva todos os produtos controlados na mesma
  transação. Repetir a solicitação não duplica reservas ou movimentos.
- Iniciar a separação preserva o saldo físico e confere a integridade de cada
  reserva. Cancelar antes do faturamento libera integralmente as quantidades e
  devolve a disponibilidade, com eventos e movimentos imutáveis.
- O rascunho reforça o vínculo entre pedido, item e reserva para impedir que um
  item de outra operação da mesma empresa seja associado por engano.
- Faturamento, baixa física, recebíveis e rascunho fiscal permanecem para as
  próximas etapas. Nenhuma tela, API, migração ativa ou conexão remota mudou.

## 1.13.0.31.11 - 2026-09-06

- O card **Saldo do mês** da Gestão Mobile passou do preto ao azul escuro
  institucional AvantaLab, mantendo a leitura contrastada dos três valores.

## 1.13.0.31.10 - 2026-09-06

- O retorno ao toque de **Sugestões** e **Sair** na Gestão Mobile não desloca
  mais os botões. Agora ele usa realce interno contextual e uma breve expansão
  do ícone, preservando a geometria do rodapé.

## 1.13.0.31.09 - 2026-09-06

- Os botões **Sugestões** e **Sair** no rodapé do menu da Gestão Mobile agora
  exibem uma pressão breve e perceptível antes de abrir a respectiva ação.
  A animação respeita a preferência do aparelho por reduzir movimento.

## 1.13.0.31.08 - 2026-09-06

- No rodapé do menu da Gestão Mobile, **Sugestões** abre a central de dúvidas
  e sugestões após fechar o menu. **Sair** agora pede confirmação antes de
  encerrar a sessão e conclui a limpeza local mesmo em uma falha temporária de
  rede.

## 1.13.0.31.07 - 2026-09-06

- Ao criar uma despesa fixa na Gestão Mobile, a despesa escolhida permanece no
  seletor durante atualizações do modal. O formulário é limpo somente depois
  de salvar com sucesso ou ao fechá-lo.

## 1.13.0.31.06 - 2026-09-06

- O favicon do site agora usa somente o **A oficial AvantaLab** em fundo
  transparente, nos tamanhos 16, 32 e 48 px. Ícones de PWA, iPhone e Android
  permanecem inalterados.

## 1.13.0.31.05 - 2026-09-06

- O menu lateral da Gestão Web passou a exibir apenas o título **Menu**, sem o
  rótulo institucional redundante no topo.

## 1.13.0.31.04 - 2026-09-06

- O cabeçalho do **Laboratório de Marcas** agora apresenta somente a ação
  **Entrar**, com o mesmo destino de acesso da Gestão e sem sugerir teste ou
  plano gratuito para esse serviço.

## 1.13.0.31.03 - 2026-09-06

- A lista de produtos do pedido no **AvantaVendas** ganhou cabeçalho com
  contagem, fundo azul suave e destaque lateral institucional. Quantidade,
  total e exclusão permanecem nas mesmas ações, agora com leitura mais clara.

## 1.13.0.31.02 - 2026-09-06

- Os cards disponíveis no seletor de perfis da Gestão Mobile passaram a usar
  gradiente e borda aplicados diretamente no botão. Isso elimina a faixa azul
  escura que alguns WebViews exibiam no recorte direito arredondado.

## 1.13.0.31.01 - 2026-09-06

- O seletor de perfis da Gestão Mobile trocou a sombra azul profunda por uma
  sombra neutra e discreta, removendo a tarja escura visível no lado direito
  dos cards em alguns aparelhos.

## 1.13.0.31 - 2026-09-05

- O seletor de perfis da Gestão Mobile passou a destacar as opções disponíveis
  com gradiente institucional AvantaLab e uma seta de continuidade. O perfil
  em uso permanece neutro, identificado e sem ação, evitando trocas acidentais.

## 1.13.0.30 - 2026-09-05

- A página pública de exclusão da **Gestão** passou a orientar, em português,
  tanto a remoção definitiva da conta quanto a solicitação de exclusão de dados
  específicos sem encerrar o acesso. Ela informa o escopo, a confirmação de
  identidade, a restauração limitada de perfil e a retenção legal aplicável.

## 1.13.0.29 - 2026-09-04

- Os comprovantes e Espelhos de Ponto assinados passaram a exibir um selo
  institucional discreto com emissão, indicação da assinatura ICP-Brasil e o
  endereço oficial `validar.iti.gov.br`, sem expor nome ou CPF do titular no
  layout do documento.
- O AFD agora inclui no ZIP um guia de validação para o par `.txt` e `.p7s`;
  a versão simples para impressão informa claramente que não substitui o PDF
  assinado.
- A Gestão passa a informar corretamente quando o certificado de produção está
  ativo e assinando PDFs, sem confundir essa condição com a conformidade
  regulatória completa do REP-P.

## 1.13.0.28 - 2026-09-04

- Em **Controle de Ponto > Funcionários**, a lista passou a separar
  **Funcionários ativos** e **Funcionários inativos**. Ao inativar ou reativar,
  a pessoa é levada automaticamente para a aba correspondente; relatórios e
  exportações continuam incluindo o histórico dos desligados.

## 1.13.0.27 - 2026-09-04

- A inativação de funcionário do **Controle de Ponto** deixa de alterar o
  status genérico do vínculo técnico, que podia interromper o salvamento. O
  acesso passa a ser decidido pelo cadastro próprio do ponto, preservando o
  vínculo e todo o histórico necessário para consulta e exportação.

## 1.13.0.26 - 2026-09-04

- A inativação de funcionário do **Controle de Ponto** não depende mais do
  bloqueio complementar no provedor de autenticação. O vínculo interno e o
  gatilho de marcações passam a encerrar o acesso de forma definitiva primeiro,
  preservando o histórico mesmo se a camada complementar estiver indisponível.

## 1.13.0.25 - 2026-09-04

- O popup de administração do **Controle de Ponto** foi ampliado no web para
  exibir todas as abas do menu de uma vez em telas amplas. Em telas menores, a
  largura continua respeitando a área visível e a navegação permanece acessível.

## 1.13.0.24 - 2026-09-04

- No mobile, as seções da landing de **Gestão Financeira** saíram da faixa com
  rolagem lateral e passaram para o menu ☰. O desktop mantém a navegação em linha.
- O fundo escurecido do menu continua clicável para fechar a sobreposição.

## 1.13.0.23 - 2026-09-04

- Ao abrir o menu móvel da landing de **Gestão Financeira**, o conteúdo ao fundo
  recebe uma sobreposição escura. Tocar fora das ações fecha o menu.

## 1.13.0.22 - 2026-09-04

- Na landing de **Gestão Financeira**, o mobile ganhou o mesmo respiro visual do
  desktop entre o menu horizontal e o título inicial, sem alterar a navegação.

## 1.13.0.21 - 2026-09-04

- Nas **Calculadoras** da landing, o cartão selecionado mantém título e resumo
  na mesma posição dos demais. A seleção agora altera somente as cores do card.

## 1.13.0.20 - 2026-09-04

- A navegação da área **Gestão Financeira** na landing pública volta a oferecer
  **Calculadoras**, levando diretamente às simulações financeiras já disponíveis
  na própria página.

## 1.13.0.19 - 2026-09-03

- A landing pública passou a oferecer no card do **AvantaVendas** o link oficial
  para baixar o aplicativo na Google Play. O card da Gestão permanece com a
  indicação de disponibilidade futura no Android.
- Os dados estruturados da landing também passaram a registrar a versão Android
  do AvantaVendas, sem alterar qualquer fluxo dos aplicativos.

## 1.13.0.18 - 2026-09-03

- AvantaVendas: PDFs da Divulgação voltam a exibir o nome real do arquivo no
  card, na pré-visualização e na leitura em tela cheia, facilitando a
  identificação dos catálogos.
- Imagens e vídeos continuam sem o nome técnico gerado pelo sistema. Seleção,
  busca, ordenação, visualização e compartilhamento permanecem inalterados.

## 1.13.0.17 - 2026-09-03

- AvantaVendas: o filtro **Consignados** e o histórico do cliente mostram
  somente consignações ativas, com quantidade remanescente. Registros
  cancelados ou integralmente convertidos permanecem preservados no banco,
  mas deixam as listas operacionais e o filtro **Todos**.
- Cada consignação continua em um card independente, inclusive quando o mesmo
  cliente possui mais de uma, e o card ativo exibe apenas a identificação
  **Consignado**, sem o estado genérico **Concluída**.
- Conversões parciais mantêm apenas o saldo restante no consignado; a conversão
  integral encerra o consignado e mantém o pedido gerado como registro separado.

## 1.13.0.16 - 2026-09-03

- AvantaVendas: PDFs da Divulgação recebem visualização em tela cheia dentro do
  próprio sistema, com retorno à prévia, indicador da página atual e ação de
  compartilhamento disponível no cabeçalho.
- O documento continua sendo renderizado como PDF: links seguros para web,
  WhatsApp, telefone, SMS e e-mail permanecem ativos, e destinos internos
  passam a navegar diretamente até a página correspondente.
- A visualização é recalculada ao entrar, sair, redimensionar ou girar o aparelho,
  preservando a página atual e mantendo carregamento localizado.

## 1.13.0.15 - 2026-09-02

- AvantaVendas: a Divulgação deixa de exibir o nome técnico dos arquivos nos
  cards, na pré-visualização e na visualização ampliada. A interface mostra
  apenas o tipo do material e sua posição na pasta, mantendo busca, ordenação,
  seleção, upload e compartilhamento inalterados.

## 1.13.0.14 - 2026-09-02

- AvantaVendas: a Sala de Botões é liberada após sessão, conta e permissão,
  sem aguardar produtos, clientes, pedidos, pagamentos ou materiais. O cache
  passa a usar corretamente a conta ativa e módulos abertos durante a primeira
  sincronização exibem um loading localizado.
- Novidades e Divulgação deixam a preparação bloqueante e são atualizadas em
  segundo plano. Ao entrar antes da primeira resposta, a Divulgação informa a
  espera dentro da própria página e substitui o estado de uma só vez.
- Gestão Mobile: uma fotografia local isolada por usuário, perfil e ano é
  liberada somente após validar sessão, acesso, assinatura e cadastro. Os dados
  oficiais continuam sendo revalidados em segundo plano; consultas de convites
  e vínculos foram paralelizadas e os campos financeiros transferidos foram
  reduzidos ao necessário.

## 1.13.0.13 - 2026-09-02

- Gestão Mobile e AvantaVendas passam a usar o mesmo card de preparação, sem a
  marca AvantaLab duplicada dentro do card e com spinner, etapa, barra e
  percentual alinhados na mesma hierarquia visual.
- A Gestão inicia assim que o DOM está pronto, sem aguardar imagens e recursos
  secundários do evento de carregamento completo. No AvantaVendas, os scripts
  críticos começam a ser baixados antecipadamente e continuam sendo executados
  na ordem segura já existente.

## 1.13.0.12 - 2026-09-02

- AvantaVendas: ao confirmar pedido ou recebimento, o botão muda imediatamente
  para **Confirmando...**, antes da conferência financeira no servidor, e fica
  bloqueado durante todo o processamento para evitar envios duplicados.

## 1.13.0.31 - 2026-09-03

- Os materiais da Ordem de Serviço passaram a possuir vínculo explícito com a
  reserva de estoque no núcleo comercial candidato, sempre dentro da empresa.
- O laboratório PostgreSQL agora reserva os materiais antes da execução, baixa
  somente a quantidade efetivamente utilizada após a conclusão e libera a
  sobra sem reduzir o saldo físico.
- A devolução controlada estorna a baixa concluída e recompõe o saldo físico.
  Cada etapa é transacional, idempotente e registrada em movimentos e eventos
  imutáveis, sem misturar reservas antigas ou permitir saldo indevido.
- Permissões de saída e ajuste são verificadas antes do repositório e falhas
  internas do banco não são expostas ao operador.
- Nenhuma tela, API, migração ativa ou conexão remota foi publicada nesta etapa.

## 1.13.0.30 - 2026-09-03

- O orçamento de Serviços agora pode gerar uma única Ordem de Serviço no
  laboratório PostgreSQL local, preservando cliente, itens, preços e origem.
- A OS recebeu agenda, duração prevista, responsável, local, contato, checklist
  e materiais com custo congelado, sem realizar baixa de estoque nesta etapa.
- O ciclo validado passa por `Agendada`, `Em execução` e `Concluída`, registrando
  duração real, relato, checklist, consumo informado, custo real e aceite do
  cliente em histórico imutável.
- A montagem ocorre como `Salva` dentro da transação e só depois muda para
  `Agendada`, garantindo que a proteção de itens impeça alterações tardias.
- Nenhuma tela, API, migração, estoque real ou conexão remota foi ativada.

## 1.13.0.29 - 2026-09-03

- Orçamentos de Vendas e Serviços e pedidos de venda ganharam serviço e
  repositório PostgreSQL executáveis somente no laboratório local.
- Cada documento congela o retrato do cliente, tabela de preços, nome, custo,
  preço e classificação fiscal dos itens. Alterações posteriores nos cadastros
  não reescrevem o histórico já salvo.
- Os cálculos são realizados em unidades inteiras de centavos e milésimos, com
  limite validado de `R$ 9.999.999,99`, numeração por tipo/ano, versão otimista,
  idempotência e auditoria append-only.
- A conversão de orçamento de venda em pedido copia o retrato transacional uma
  única vez, registra a origem e recusa duplicidades. Orçamento de serviço já
  aceita NFS-e; sua conversão em ordem de serviço permanece para a próxima etapa.
- O teste PostgreSQL local confirmou criação, repetição segura, edição,
  conflito, busca, isolamento por empresa e conversão sem duplicidade, seguido
  de rollback. Nenhuma API, tela, migração ou conexão remota foi ativada.

## 1.13.0.28 - 2026-09-03

- A primeira persistência executável do futuro módulo comercial foi criada para
  clientes, exclusivamente server-side e ainda restrita ao laboratório local.
- O serviço confirma empresa, vínculo, módulo e permissão efetiva, valida e
  normaliza CNPJ, CEP, telefone e endereço fiscal. Cadastro incompleto pode ser
  preservado como `Revisar cadastro`, mas permanece inapto à emissão de nota.
- Inclusão, edição e inativação usam transação serializável, código sequencial
  por empresa, versão otimista e histórico append-only. Não existe exclusão de
  cliente nem acesso direto do navegador às tabelas.
- A prova real no PostgreSQL local confirmou busca por nome/CNPJ, isolamento
  entre empresas, conflito de edição, inativação e auditoria, seguida de
  rollback. Nenhuma API de tela, migração ou conexão remota foi ativada.

## 1.13.0.27 - 2026-09-03

- O futuro Vendas e Serviços ganhou um rascunho não aplicado para o núcleo
  comercial: clientes, contatos, numeração interna, operações e itens, ordens de
  serviço, estoque, inventários, contas a receber e históricos.
- As 18 tabelas usam isolamento por empresa, RLS forçada e acesso exclusivamente
  server-side. Itens confirmados e razões de estoque, recebimento e auditoria não
  podem ser alterados retroativamente; correções exigem novos eventos.
- Valores comerciais usam `numeric(14,2)` e a prova preservou exatamente
  `9.999.999,99`. Cliente, tabela de preço, catálogo, operação, estoque e
  recebimento foram protegidos contra referências pertencentes a outra empresa.
- A numeração interna é reservada com bloqueio transacional e repetição
  idempotente. O CPF ficou somente preparado no contrato; a interface inicial
  continua habilitando CNPJ até existir fonte de dados contratada e homologada.
- O rascunho foi aplicado e revertido em banco descartável do Supabase local. A
  prova confirmou 18 tabelas protegidas, acesso direto negado a `authenticated`,
  históricos imutáveis e rollback, sem projeto remoto vinculado ou dado real.

## 1.13.0.26 - 2026-09-03

- Foi criado um laboratório local e oculto para validar a futura integração do
  Vendas e Serviços com o catálogo real de Custos e Precificação, sem publicar
  rota comercial, item de menu ou alteração no ambiente de produção.
- A nova API de catálogo é somente leitura, exige sessão e vínculo com a empresa
  solicitada, funciona apenas em desenvolvimento e entrega somente produtos e
  serviços ativos e publicados, usando a tabela de preços selecionada.
- O contrato não expõe custo interno e declara explicitamente que estoque ainda
  não está integrado. O protótipo bloqueia edição do catálogo e movimentações de
  estoque enquanto recebe os itens da Gestão, evitando saldos ou gravações
  demonstrativas misturados aos dados reais.
- O laboratório foi conferido nos estados autenticado/indisponível previstos e
  continua separado da implantação oficial. Nenhum banco remoto, migração,
  pedido, orçamento, estoque ou documento fiscal foi criado ou alterado.

## 1.13.0.25 - 2026-09-03

- O futuro Vendas e Serviços ganhou contrato oficial dentro da Gestão, com o
  identificador `vendas`, separado do `vendas_mobile` e dependente do catálogo
  mantido por Custos e Precificação.
- A matriz inicial reúne 44 permissões em dez áreas e preserva os quatro tipos
  de usuário. O resultado efetivo segue padrão do tipo, exceção do tipo na
  empresa e, por último, liberação ou bloqueio individual.
- A nova API administrativa é exclusivamente server-side, exige Gestor Master
  ou Administrador autenticado, módulo ativo e protege gestão de acessos,
  auditoria, configuração fiscal e homologação contra bloqueio administrativo.
- O SQL oficial continua em `supabase/drafts`, fora das migrações ativas. A
  prova com sessão Supabase e PostgreSQL local validou empresa, módulo, RLS,
  exceção individual, auditoria imutável e rollback para o identificador
  `vendas`; nenhum banco remoto foi acessado ou alterado.
- O módulo ainda não foi colocado no menu da Gestão e a tela de permissões não
  foi exposta ao usuário: isso ocorrerá somente quando `/vendas` estiver
  incorporada e todas as ações passarem a obedecer à decisão do servidor.

## 1.13.0.24 - 2026-09-03

- O protótipo separado ganhou um resolvedor server-side compatível com a sessão
  Supabase da Gestão e passou a conferir token, empresa, vínculo ativo, módulo,
  perfil-base e exceções individuais antes do acesso a documentos fiscais.
- Um usuário fictício autenticado no Supabase local atravessou a rota HTTP. O
  ensaio negou outra empresa, vínculo bloqueado e leitura direta pelas funções
  públicas, sem persistir token e eliminando o usuário ao final.
- O padrão inicial mantém XML bloqueado para operadores e libera o DANFE ao
  Operador Completo; gestor ou administrador pode alterar essas decisões por
  usuário no futuro contrato persistente.
- Um quarto rascunho não aplicado estrutura exceções de perfil e usuário para
  todos os módulos, exige gestor/administrador ativo, protege permissões críticas
  e registra cada mudança em auditoria append-only. Seu rollback foi executado
  e confirmado no banco descartável.
- A rota real de download agora está conectada ao runtime protegido, mas a chave
  de ativação permanece desligada. Sem infraestrutura, migrações e Storage de
  produção aprovados, ela continua falhando fechada com HTTP 503.
- Nenhuma migração foi aplicada ao AvantaLab e nenhum Supabase remoto foi usado.

## 1.13.0.23 - 2026-09-03

- O protótipo separado passou a usar o cliente oficial do Supabase e validou a
  guarda de um `procNFe` sintético em bucket exclusivamente local e privado.
- O ensaio aprovou gravação sem sobrescrita, repetição idempotente, conflito de
  conteúdo, SHA-256, bloqueio da URL pública e leitura assinada por 60 segundos.
- A imagem local não oferece versionamento nativo; o laboratório usa versão
  lógica pelo checksum, mas o verificador rejeita essa condição para produção.
- A rota server-side de download foi criada fechada por padrão e só poderá gerar
  acesso depois da integração com a autenticação real e a permissão efetiva da
  empresa ativa. A consulta e a auditoria no PostgreSQL descartável foram
  validadas sem registrar a URL temporária.
- O backup do banco não foi tratado como backup dos objetos. Produção continua
  condicionada a versionamento nativo, criptografia, retenção e cópia separada
  dos arquivos, além de prova recente de restauração.
- Uma prova adicional exportou o arquivo em envelope AES-256-GCM, simulou sua
  perda no bucket local, restaurou os mesmos bytes e confirmou o SHA-256. Ela
  valida o procedimento, mas não se declara um segundo domínio de falha.
- Nenhum projeto Supabase remoto, certificado ou autorizador fiscal foi acessado.

## 1.13.0.22 - 2026-09-03

- O protótipo separado de Vendas e Serviços ganhou o contrato do futuro
  armazenamento fiscal durável, ainda sem configurar ou acessar provedor remoto.
- Produção passa a exigir armazenamento privado, criptografia em repouso e em
  trânsito, versionamento, gravação imutável, SHA-256, retenção com bloqueio
  jurídico e backup criptografado em domínio de falha separado.
- O acesso futuro ao XML autorizado e ao DANFE foi separado por permissões
  efetivas do usuário, sempre validando empresa ativa, autorização server-side,
  concessão HTTPS de até cinco minutos e auditoria sem guardar a URL temporária.
- Um terceiro rascunho não aplicado separa eventos de retenção, tentativas de
  acesso e provas de restauração. O PostgreSQL descartável aceitou as três novas
  tabelas com RLS forçada e gatilhos de imutabilidade.
- O piso operacional de retenção da NF-e é conservador, aceita extensão e
  bloqueio jurídico e não cria qualquer rotina de exclusão sem revisão fiscal.
- Nenhum Supabase remoto, certificado ou autorizador fiscal foi acessado.

## 1.13.0.21 - 2026-09-03

- A fila fiscal do protótipo separado ganhou executores idempotentes para
  reconciliar a guarda de `procNFe` e a geração do DANFE.
- Se o arquivo autorizado já estiver íntegro e faltar o metadado ou a mudança
  de estado, a execução seguinte completa o ciclo sem duplicar registros.
- Um DANFE ausente é regenerado a partir do `procNFe` conferido; XML autorizado
  ausente ou adulterado falha fechado, preserva a emissão e entra na política de
  retentativa com diagnóstico sem conteúdo sensível.
- O laboratório simulou as interrupções, manteve a emissão em `danfe_ready` e
  eliminou banco, backups e arquivos temporários ao final.
- Nenhum Supabase remoto, certificado ou autorizador fiscal foi acessado.

## 1.13.0.20 - 2026-09-03

- O protótipo separado ganhou um provedor de artefatos restrito ao laboratório
  local, com rota fiscal validada, escrita atômica sem sobrescrita, SHA-256,
  diretórios `0700` e arquivos `0600`.
- O backend guarda `procNFe` e DANFE, bloqueia amostras como documento fiscal,
  recusa adulteração e não devolve XML, PDF ou caminho físico à interface.
- O PostgreSQL registra somente referência opaca, versão, checksum, tamanho e
  tipo do conteúdo em tabela imutável; o ensaio chegou ao estado `danfe_ready`.
- A normalização de datas do driver PostgreSQL passou a usar ISO, impedindo erro
  de fuso ao avançar uma emissão relida do banco.
- Todos os arquivos e bancos criados pela prova continuam temporários; nenhum
  Supabase remoto, certificado ou autorizador fiscal foi acessado.

## 1.13.0.19 - 2026-09-03

- O laboratório fiscal passou a gerar dois backups locais, restaurá-los em um
  banco PostgreSQL descartável e conferir as 9 tabelas privadas, seus dados
  fictícios e a aplicação de RLS forçada.
- Uma prova com conexões reais confirmou que duas transições concorrentes não
  avançam a mesma emissão e que dois trabalhadores com `SKIP LOCKED` recebem
  tarefas distintas.
- O repositório mantém `SERIALIZABLE` no ciclo de emissão, repete abortos seguros
  de serialização e usa `READ COMMITTED` somente nas operações atômicas da fila.
- O Next.js do protótipo separado foi atualizado de `16.2.6` para `16.3.4`; a
  auditoria npm passou de três alertas altos para nenhuma vulnerabilidade.
- Nenhum projeto Supabase remoto, certificado ou autorizador governamental foi
  acessado nesta validação.

## 1.13.0.18 - 2026-09-03

- O Mac de desenvolvimento recebeu Docker Desktop e o protótipo separado de
  Vendas passou a versionar o Supabase CLI no próprio projeto.
- Foi iniciado um PostgreSQL/Supabase exclusivamente local, sem login ou vínculo
  remoto, e os rascunhos de emissão e fila fiscal foram aplicados com dados
  inteiramente fictícios.
- O ensaio confirmou RLS forçada, bloqueio de `anon` e `authenticated`,
  idempotência, histórico imutável e rollback sem tocar no Supabase de produção.

## 1.13.0.17 - 2026-09-02

- O protótipo separado de Vendas e Serviços recebeu um adaptador PostgreSQL
  server-side com transação serializável, bloqueio consultivo, versão otimista e
  idempotência validada pela impressão digital de cada operação.
- O ciclo fiscal passou a agendar, na mesma transação, tarefas de recuperação
  para consulta de autorização/recibo, guarda do `procNFe` e geração do DANFE.
- A fila candidata usa lease, `SKIP LOCKED`, espera exponencial e `dead_letter`,
  não armazena XML ou segredos e nunca retransmite a NF-e automaticamente.
- As migrações seguem não aplicadas: o runtime local de PostgreSQL/Supabase não
  está instalado e nenhum banco real foi alterado.

## 1.13.0.16 - 2026-09-02

- O protótipo separado de Vendas e Serviços recebeu a máquina de estados do
  ciclo fiscal, com idempotência, controle otimista de versão, pré-requisitos por
  etapa e imutabilidade de número, chave e cancelamento protocolado.
- Foi preparado um rascunho não aplicado de persistência PostgreSQL/Supabase,
  separando emissões, numeração, tentativas, artefatos e eventos em schema privado,
  com RLS forçada e sem acesso direto de `anon` ou `authenticated`.
- A migração real permanece desligada até revisão no repositório principal,
  testes pgTAP, backup, restauração e autorização explícita de implantação.

## 1.13.0.15 - 2026-09-02

- O protótipo separado de Vendas e Serviços recebeu um gerador server-side de
  DANFE A4 para NF-e modelo 55, baseado exclusivamente no `procNFe` autorizado.
- O documento confere ambiente, assinatura, situação 100, protocolo e chave antes
  de gerar o PDF, inclui código de barras Code 128 C e pagina os itens mantendo o
  cabeçalho fiscal e o número de cada folha.
- Uma amostra sintética de duas páginas foi renderizada e revisada visualmente,
  sempre marcada como homologação, sem valor fiscal e não autorizada.

## 1.13.0.14 - 2026-09-02

- O conector interno de NF-e paulista em homologação ganhou os contratos SOAP
  1.2 de consulta de recibo e consulta de protocolo nos endereços oficiais da
  SEFAZ-SP, ainda com o transporte real desativado.
- As respostas agora diferenciam processamento, autorização, cancelamento e
  reconciliação por duplicidade, sempre validando ambiente, UF, chave e limites
  seguros antes de reconhecer um resultado fiscal.
- O backend monta `procNFe` somente quando XML assinado e protocolo de situação
  100 pertencem à mesma chave; o contrato de guarda é imutável, idempotente e
  não devolve o XML, mas o provedor durável continua deliberadamente ausente.

## 1.13.0.13 - 2026-09-02

- O protótipo de Vendas e Serviços ganhou a preparação server-side da tentativa
  de NF-e paulista em homologação, ligada ao controle fiscal de numeração.
- A etapa calcula candidato de série/número, cNF, chave de acesso, pré-XML e XSD
  sem reservar número, assinar ou transmitir; repetição da mesma tentativa é
  estável e uma reserva existente é reutilizada.
- Rascunhos cancelados, outro modelo, produção ou numeração em inutilização
  falham fechados antes de qualquer conexão externa.
- O contrato de autorização NF-e 4.00 monta lote síncrono SOAP 1.2 e interpreta
  recibo, protocolo e autorização, mas mantém o transporte desligado e não
  recebe XML assinado por rota pública do navegador.

## 1.13.0.12 - 2026-09-02

- O protótipo de Vendas e Serviços recebeu controle fiscal versionado de séries
  e próximo número para NF-e, NFC-e e NFS-e, sem transmitir ao governo.
- A reserva futura é idempotente e impede duplicidade por rascunho, chave de
  operação e par série/número; abrir ou revisar uma nota não consome numeração.
- A Central Fiscal permite registrar intervalos para inutilização, preservando
  justificativa, responsável e auditoria, mas só aceita confirmação com o
  protocolo futuro do órgão autorizador.

## 1.13.0.11 - 2026-09-01

- Custos e Precificação: criar uma tabela solicita somente o nome; o código
  técnico estável é gerado automaticamente e permanece oculto na interface.
- A exportação reúne **Preço padrão** e uma coluna para cada tabela existente
  na mesma linha do produto. A importação atualiza valores preenchidos,
  preserva células vazias e tabelas ausentes e continua aceitando o formato
  anterior com uma aba separada de preços.
- Os botões **Importar Excel** e **Exportar Excel** receberam ícones SVG,
  hierarquia interna e espaçamento tipográfico revisados no padrão do módulo.

## 1.13.0.10 - 2026-09-01

- Gestão Web: **Menu > Visual** ganhou **Restaurar visual padrão**. Após a
  confirmação, a logo personalizada é removida, a cor volta ao azul AvantaLab e
  o modo claro é ativado, sem alterar dados ou a organização dos cards.
- Gestão Web: a coluna **Faturamento** do Balanço preserva o verde sobre verde,
  agora com contraste reforçado para mês e valor, inclusive no modo noturno.

## 1.13.0.09 - 2026-09-01

- Gestão Web e Mobile: a publicação de materiais na Divulgação valida o limite
  de 100 MB antes do upload e informa a recusa inteiramente em português.
- Respostas técnicas do armazenamento, incluindo **maximum allowed size**, não
  são mais exibidas ao usuário; erros desconhecidos recebem uma mensagem segura.

## 1.13.0.08 - 2026-09-01

- AvantaVendas: vídeos e demais materiais da Divulgação são preparados antes de
  liberar o botão de compartilhamento, preservando o toque exigido pelo iPhone.
- Falhas ao enviar um material agora usam somente o aviso em português
  **Não foi possível enviar o arquivo — Tente novamente**, sem expor mensagens
  técnicas do navegador.

## 1.13.0.07 - 2026-09-01

- Gestão Web: no **Balanço**, a linha do mês corrente recebe um destaque
  permanente e sutil nas colunas Despesas, Faturamento, A + B e Total em %.
  O hover continua destacando temporariamente qualquer outro mês, e o contraste
  foi ajustado também para o modo noturno.

## 1.13.0.06 - 2026-09-01

- O card **Estoque consignado** do Dashboard passa a ficar somente com o
  cabeçalho azul quando recolhido, eliminando a área branca vazia e preservando
  título, resumo, botão Expandir e a lista completa no estado aberto.

## 1.13.0.05 - 2026-09-01

- Todos os avisos rápidos do AvantaVendas passam a usar um cartão compacto com
  ícone, título, mensagem e cor semântica para sucesso, informação, atenção e
  erro, mantendo contraste nos temas claro e escuro.
- O aviso fica acima de cards e modais, possui fechamento manual, tempo de
  leitura adequado e respeita a preferência de movimento reduzido.

## 1.13.0.04 - 2026-09-01

- **Divulgação** recebe um botão **Atualizar** à direita do título. A ação relê
  somente os vínculos de conteúdo, pastas e materiais, sem reiniciar o
  AvantaVendas nem recarregar clientes, produtos, pedidos ou pagamentos.
- Durante a consulta, o próprio botão informa **Atualizando...** e bloqueia
  novos toques. A pasta aberta e os materiais anteriores são preservados se a
  rede ou o servidor não responderem.

## 1.13.0-av108 - 2026-09-01

- AvantaVendas: atualização manual e localizada dos materiais da Divulgação.

## 1.13.0.03 - 2026-09-01

- O preço de venda formado em **Custos e Precificação** passa a ser tratado
  exclusivamente como preço interno da empresa.
- **Conteúdo do Vendas > Catálogo** ganha o campo próprio **Preço sugerido de
  revenda**. Esse é o único valor enviado como sugestão aos novos produtos do
  AvantaVendas e continua editável pelo vendedor em cada pedido.
- Os preços anteriormente divulgados são preservados no novo campo durante a
  migração. Quando a precificação interna já os alterou, o primeiro valor
  anterior auditado é recuperado; alterações futuras na Gestão não modificam a
  sugestão de revenda.
- A situação da sincronização informa produtos publicados que ainda aguardam
  um preço sugerido de revenda, sem publicar o preço interno por substituição.
- O catálogo de divulgação deixa de expor ou enviar o custo interno da empresa
  aos perfis de distribuição já na primeira sincronização.

## 1.13.0-av107 - 2026-09-01

- AvantaVendas: sincronização passa a receber somente o preço próprio da
  divulgação, mantendo o valor sugerido editável no pedido.

## 1.13.0.02 - 2026-08-31

- AvantaVendas voltou a iniciar o pedido com o preço sugerido recebido no seu
  catálogo. O vendedor pode editar o preço no pedido, como antes.
- Tabelas de preços de **Custos e Precificação** continuam disponíveis somente
  na Gestão e deixam de ser carregadas, exibidas ou gravadas em clientes e
  pedidos do AvantaVendas.
- O desligamento no banco remove apenas automações e permissões do acoplamento;
  pedidos, itens, clientes, produtos e valores históricos são preservados.

## 1.13.0-av106 - 2026-08-31

- AvantaVendas: pedido sem aplicação direta das tabelas internas da Gestão,
  com preço sugerido do catálogo recebido e edição manual.

## 1.13.0.01 - 2026-08-31

- Gestão Mobile: incluir despesa ou receita agora bloqueia a tela inteira com
  fundo escuro, indicador de carregamento e mensagem da operação até o servidor
  confirmar e o Dashboard ser atualizado. A mesma camada, antes discreta,
  também passa a deixar explícitas as edições, confirmações e exclusões de
  lançamentos, evitando solicitações duplicadas.

## 1.13.0 - 2026-08-31

- Custos e Precificação recebeu **Tabelas de preços**, com uma tabela padrão e
  políticas adicionais para atacado, revenda ou negociações específicas.
- O cadastro completo de produtos e todos os preços podem ser exportados em
  Excel, ajustados localmente e reimportados. Antes de aplicar, o sistema mostra
  quantos produtos serão criados ou atualizados e quantos preços serão
  processados; IDs e datas de revisão evitam duplicidades e sobrescritas.
- No AvantaVendas, cada cliente pode ser vinculado a uma tabela. Novos pedidos
  identificam a política automaticamente, apresentam o preço correspondente e
  gravam a tabela e o valor unitário utilizados, preservando o histórico mesmo
  depois de futuros reajustes.
- Segurança: tabelas pertencem ao perfil empresarial, vendedores recebem apenas
  os preços do vínculo comercial ativo e o banco rejeita tabelas de outra
  empresa. Alterações manuais e importações alimentam histórico de preços.

## 1.13.0-av105 - 2026-08-31

- AvantaVendas: vínculo de tabela por cliente e aplicação automática dos preços
  no pedido, com identificação visível e preço histórico preservado.

## 1.12.1.18 - 2026-08-31

- Gestão Mobile: editar, excluir ou confirmar um lançamento agora mostra uma
  tela levemente escurecida com indicador circular central enquanto a alteração
  é gravada e o Dashboard é atualizado. O indicador desaparece antes do aviso
  final de sucesso ou do erro recuperável.

## 1.12.1.17 - 2026-08-31

- Gestão Mobile: a lista de **Despesas** passou a seguir a mesma hierarquia de
  **Receitas**: nome, observação e **Dia** em linhas separadas. Observações
  longas usam até duas linhas sem disputar espaço com o valor.

## 1.12.1.16 - 2026-08-31

- Gestão Mobile: a segunda linha das listas de **Despesas** e **Receitas** do
  Dashboard também passou a ter área de texto própria e até duas linhas. Uma
  observação longa não empurra nem corta o valor do lançamento.

## 1.12.1.15 - 2026-08-31

- Gestão Mobile: os cards do Dashboard passam a ocupar apenas a largura útil da
  tela. Listas de receitas com nomes longos ou etiquetas de situação não
  expandem mais a coluna nem ocultam os valores à direita, inclusive no PWA
  Android. Nomes de lançamentos passam a ocupar até duas linhas antes de usar
  reticências; a mesma contenção responsiva é aplicada no iPhone, sem mudar os
  dados, a navegação ou as ações dos cards.

## 1.12.1.14 - 2026-08-30

- Perfis que utilizam a vaga de uma assinatura de outro perfil agora são
  identificados como **Perfil vinculado** nos seletores e nas informações de
  **Gerenciar perfil** da Gestão Web e Mobile. O aviso esclarece que plano e
  vagas são administrados pelo perfil assinante.
- Em `/admin`, a lista de perfis passa a informar a vinculação e identifica o
  perfil de origem para a administração do AvantaLab. O vínculo, a quota e as
  regras de contratação existentes não foram alterados.

## 1.12.1.13 - 2026-08-30

- AvantaVendas: novos pedidos e pagamentos deixam de exibir uma confirmação
  rápida redundante, pois o comprovante aberto já confirma o registro.
- O loading, o bloqueio contra envio duplicado e todos os avisos de erro foram
  preservados.

## 1.12.1-av104 - 2026-08-30

- AvantaVendas: revisão do retorno visual após pedidos e pagamentos.

## 1.12.1.12 - 2026-08-30

- AvantaVendas: a pílula **Selecionar/Cancelar** em Divulgação passou ao azul
  claro `#1687D9`, igual às ações **Novo cliente** e **Novo pedido**.

## 1.12.1-av103 - 2026-08-30

- AvantaVendas: correção do tom visual da seleção múltipla.

## 1.12.1.11 - 2026-08-30

- AvantaVendas: a pílula **Selecionar/Cancelar** em Divulgação passou a usar o
  azul institucional AvantaLab, com texto branco centralizado.

## 1.12.1-av102 - 2026-08-30

- AvantaVendas: revisão visual da ação de seleção múltipla na pasta atual.

## 1.12.1.10 - 2026-08-30

- AvantaVendas: o botão **Selecionar** saiu da barra de busca e passou para o
  lado direito da linha da pasta atual, ao lado de **Voltar**.
- A ação aparece somente quando a pasta contém pelo menos dois arquivos; a
  linha de **Ordem A/Z** e **Buscar** recuperou a distribuição anterior.

## 1.12.1-av101 - 2026-08-30

- AvantaVendas: revisão visual da posição do seletor múltiplo em Divulgação.

## 1.12.1.09 - 2026-08-30

- AvantaVendas: Divulgação permite selecionar até dez arquivos da pasta atual e
  enviá-los juntos pelo compartilhamento nativo, sem texto automático.
- O visualizador recebeu **Selecionar mais**, a galeria mostra os itens marcados
  e uma barra fixa acompanha a quantidade e o preparo sequencial dos arquivos.
- Navegadores sem compartilhamento múltiplo recebem os materiais em um pacote
  ZIP; o compartilhamento individual permanece disponível.

## 1.12.1-av100 - 2026-08-30

- AvantaVendas: revisão visual e funcional da seleção múltipla em Divulgação.

## 1.12.1.08 - 2026-08-30

- Gestão Mobile: removidos os atalhos que levavam diretamente ao AvantaVendas
  pelo cabeçalho e pela barra inferior. Em **Sistemas**, o módulo Vendas Mobile
  permanece disponível apenas para consulta e ativação por quem tem permissão,
  sem abrir outro aplicativo ao concluir.
- AvantaVendas: o controle de contas passou a se identificar como **Perfis de
  vendas** e recebeu ícone de usuários, deixando claro que ele troca apenas o
  perfil de vendas, não o aplicativo.

## 1.12.1-av99 - 2026-08-30

- AvantaVendas: revisão dos recursos publicados para retirar qualquer aparência
  de troca entre aplicativos do controle de perfis de vendas.

## 1.12.1.07 - 2026-08-28

- Conteúdo do Vendas: ao selecionar uma pasta em Divulgação, a galeria de
  materiais publicados passa a abrir antes da lista de pastas no celular.
  Subpastas, visualização, retorno à pasta anterior e a ação de adicionar
  arquivos ficam acessíveis na própria visão da pasta.
- O envio, as permissões, o armazenamento, a proteção contra duplicidades e o
  conteúdo disponível aos vendedores foram preservados.

## 1.12.1.06 - 2026-08-27

- Gestão Mobile: o card **Novo lançamento** volta a acompanhar o teclado no
  Android. Descrição, origem e valor permanecem visíveis enquanto o teclado abre
  e o conteúdo interno continua rolável até as ações de salvar.
- O ajuste usa a geometria nativa do teclado, acompanha as mudanças do viewport
  e possui uma área segura alternativa para WebViews Android antigos, sem mudar
  o comportamento do iOS, da Ava ou dos demais modais.

## 1.12.1.05 - 2026-08-26

- AvantaVendas: corrigido o gatilho financeiro que tentava consultar o campo
  `data_pagamento` ao salvar um pedido. Pedidos e pagamentos voltam a usar seus
  respectivos campos de data sem interferência entre as tabelas.
- Incluído teste de regressão para impedir que os campos exclusivos voltem a
  ser avaliados no mesmo ramo do gatilho.

## 1.12.1.04 - 2026-08-26

- AvantaProjetos: a interface passa a consumir a cor primária do perfil nos
  títulos, ações, estados e detalhes visuais, eliminando a paleta fixa anterior.
- Cards de projetos, listas, mapa, detalhes e Kanban adotam a geometria de
  quadrantes validada em Custos e Precificação, com o canto superior esquerdo
  mais fechado e os demais cantos arredondados.
- As cores próprias escolhidas para identificar cada projeto e tarefa foram
  preservadas, assim como os modos claro e escuro.

## 1.12.1.03 - 2026-08-26

- AvantaVendas: criar, trocar ou apagar um vínculo financeiro agora exibe um
  indicador de processamento até a sincronização e a atualização da conta
  terminarem, bloqueando envios duplicados.
- Se a operação falhar, o formulário anterior é restaurado com os dados
  selecionados para permitir uma nova tentativa.

## 1.12.1-av98 - 2026-08-26

- AvantaVendas: revisão visual do estado de espera no fluxo completo de vínculo
  financeiro.

## 1.12.1.02 - 2026-08-26

- AvantaVendas: o vínculo financeiro volta a perguntar se os lançamentos
  anteriores devem permanecer na Gestão ou ser apagados antes do recálculo.
- A escolha entre valores **Recebidos** e **Vendidos** passa a ser gravada na
  mesma operação do vínculo, eliminando a sincronização inicial com base
  diferente da selecionada.
- A transferência considera todos os lançamentos da conta ativa, inclusive os
  que ainda carregam o destino financeiro legado do login. Trocas agendadas
  aplicam o mesmo processamento ao entrarem em vigor.

## 1.12.1-av97 - 2026-08-26

- AvantaVendas: revisão estática do fluxo completo de vínculo financeiro por
  conta, com confirmação do histórico e da base de receita.

## 1.12.1.01 - 2026-08-26

- AvantaVendas: no primeiro vínculo financeiro, agora é possível escolher
  **Todo o histórico**, **A partir do mês vigente** ou **A partir do mês
  seguinte**. Assim, uma conta pode ser conectada sem mover lançamentos já
  existentes.

## 1.12.1-av96 - 2026-08-26

- AvantaVendas: a primeira escolha de destino financeiro oferece explicitamente
  a opção de não transferir o histórico.

## 1.12.1 - 2026-08-26

- AvantaVendas: o destino financeiro e a base de receita passam a pertencer à
  conta de vendas ativa, não ao login. Contas diferentes podem enviar seus
  resultados para perfis diferentes da Gestão ou para o mesmo perfil, por
  escolha explícita do proprietário ou administrador da conta.
- Segurança de migração: os vínculos e as receitas históricas já existentes
  foram preservados sem mover pedidos, pagamentos ou lançamentos financeiros.
  Contas adicionais não herdam o destino da conta inicial.

## 1.12.1-av95 - 2026-08-26

- AvantaVendas: a escolha de destino financeiro, sua base de receita e a
  sincronização passam a usar a conta de vendas ativa como origem.

## 1.12.0 - 2026-08-26

- Novo módulo Web **Custos e Precificação**, instalado por Gestor Master ou
  Administrador em **Menu > Módulos**. Business pode contratar por R$ 14,90 ao
  mês; Business Pro e cortesia empresarial vigente instalam sem cobrança extra.
- Produtos e serviços passam a compartilhar a mesma base do Catálogo. Novos
  cadastros começam **Em estudo** e só aparecem para divulgação quando forem
  marcados como disponíveis; alterações e inativações refletem nos dois locais.
- O módulo reúne cadastro fiscal, imagem opcional, códigos próprios com apoio de
  sequência, insumos e recursos, composição de custos, formação de preço,
  simulações independentes e histórico de versões.
- Segurança: acesso, instalação, plano e hierarquia são validados no servidor e
  por RLS. Operador Completo edita, Operador Simples visualiza e a remoção do
  módulo não apaga cadastros, composições, simulações nem históricos.
- Interface: o catálogo de Módulos usa um card principal amplo com subcards
  quadrados responsivos, preservando modo escuro e a cor do perfil.
- Produção: os dados demonstrativos locais foram removidos; atualizações de
  custos usam controle de revisão para impedir sobrescrita silenciosa entre
  usuários e registram a autoria da última alteração.

## 1.11.0.01 - 2026-08-25

- Gestão Web e Mobile: ao editar uma receita ou despesa prevista para hoje ou
  uma data passada, agora é possível escolher entre manter a previsão ou
  **Confirmar nesta data**. A confirmação efetiva somente aquela ocorrência;
  despesas fixas e recorrentes preservam os próximos lançamentos.

## 1.11.0-av94 - 2026-08-24

- AvantaVendas: o controle **Recolher/Expandir** do Estoque consignado usa
  setas internas e estáveis, mantendo a direção visível nos dois estados.
- AvantaVendas: a reconciliação do Estoque atual passa a considerar a data real
  das entradas retroativas e aplica somente saídas de pedidos, consignados e
  bonificações ainda não refletidas, sem duplicar movimentações já processadas.

## 1.11.0-av93 - 2026-08-24

- AvantaVendas: ao arrastar um card de Configurações até o topo ou a base da
  área visível, a página agora rola continuamente e com velocidade progressiva.
  Assim, qualquer card pode alcançar o primeiro ou o último encaixe em um único
  gesto, sem perder a flutuação e a estabilidade do Kanban.

## 1.11.0-av92 - 2026-08-24

- AvantaVendas: o card arrastado em Configurações volta a usar a mesma camada
  flutuante transparente da Sala de Botões. A cópia permanece visível, elevada,
  recortada e fluida enquanto o espaço original fica reservado para o encaixe.
- AvantaVendas: somente o puxador de três traços inicia o movimento; rolagem,
  botões e campos continuam livres fora dele.

## 1.11.0-av91 - 2026-08-24

- AvantaVendas: o Kanban de Configurações permanece disponível sem ativar um
  modo separado. O arraste começa exclusivamente pelo puxador de três traços no
  cabeçalho de cada card, preservando a rolagem e todos os controles do card.
- AvantaVendas: o puxador possui alvo de toque acessível e também aceita as
  setas do teclado, mantendo o encaixe estável e a ordem salva por perfil.

## 1.11.0-av90 - 2026-08-24

- AvantaVendas: **Estoque consignado** recupera sua largura integral, o resumo
  no cabeçalho e a lista original em duas colunas no desktop e uma no celular.
  O cabeçalho segue o padrão azul dos cards do Dashboard e mantém o controle
  Expandir/Recolher com setas direcionais.

## 1.11.0-av89 - 2026-08-24

- AvantaVendas: o acesso ao Kanban de Configurações ganhou uma faixa própria e
  um botão sempre identificado como **Organizar cards**, inclusive no celular.
  O comando deixa de ficar reduzido a um ícone e passa a explicar o arraste.

## 1.11.0-av88 - 2026-08-24

- AvantaVendas: o estoque acompanhado passa a ser movimentado na mesma
  transação dos pedidos. Venda, consignado e item bonificado abatem o saldo;
  edição, cancelamento e exclusão devolvem somente a diferença necessária.
- AvantaVendas: a conversão de consignado em venda preserva o saldo já abatido,
  sem saída duplicada, e o Dashboard recebe imediatamente o estoque confirmado.
- AvantaVendas: uma reconciliação única incorpora as saídas registradas após o
  início do controle de cada produto, respeitando ajustes físicos posteriores.

## 1.11.0-av87 - 2026-08-24

- AvantaVendas: os cards de Configurações agora podem ser organizados com o
  Kanban estável do Projeto Avanta, por arraste ou teclado. A ordem acompanha o
  perfil e permanece igual nos próximos acessos.
- AvantaVendas: **Estoque consignado** passa a usar o mesmo card institucional
  dos demais indicadores do Dashboard, preservando expansão e recolhimento.
- AvantaVendas: **Clientes sem compra** ganhou ordenação pela data da última
  compra, alternando entre as mais antigas e as mais recentes.

## 1.11.0-av86 - 2026-08-24

- AvantaVendas: a casca móvel deixa de aceitar rolagem programática oculta ao
  focar o controle de tema em Configurações. Cabeçalho, conteúdo e navegação
  inferior permanecem ancorados ao alternar entre os modos claro e escuro.

## 1.11.0-av85 - 2026-08-24

- AvantaVendas: alternar o modo escuro não reconstrói mais a aplicação nem o
  menu inferior fixo. A troca passa a atualizar somente o tema e sua
  preferência, preservando a grade, a posição e a interação da navegação.

## 1.11.0-av84 - 2026-08-24

- AvantaVendas: recuperação construída sobre a versão oficial atual, preservando
  o Kanban fluido e todos os recursos posteriores. A confirmação financeira de
  pedidos e pagamentos deixa de acusar falso erro enquanto a leitura do servidor
  atualiza, sem deixar de conferir o perfil e os valores confirmados.
- AvantaVendas: movimentações de estoque passam a combinar perfil ativo e data
  informada na mesma operação, permitindo que contas compartilhadas funcionem
  com o mesmo isolamento e segurança das contas criadas inicialmente.
- AvantaVendas: avisos rápidos são exibidos acima de qualquer card ou camada
  escura e anunciados corretamente por leitores de tela.

## 1.11.0-av83 - 2026-08-24

- AvantaVendas: o Dashboard ganhou o card **Estoque atual**, com nome do produto
  à esquerda, saldo à direita, expansão/recolhimento e pesquisa aberta pela lupa.

## 1.10.2.02-av82 - 2026-08-24

- AvantaVendas: tocar na data da movimentação de estoque agora abre o mesmo
  calendário centralizado usado nos demais lançamentos, mantendo a exibição
  `dd/mm/aaaa` e bloqueando dias futuros.

## 1.10.2.01-av81 - 2026-08-24

- AvantaVendas: a data da movimentação de estoque passou a usar máscara fixa
  `dd/mm/aaaa`, independente do navegador, com conteúdo centralizado no campo.

## 1.10.2-av80 - 2026-08-24

- AvantaVendas: o formulário de estoque passou a registrar a data própria da
  entrada ou do ajuste. Quantidade e data ficam na mesma linha, o histórico é
  ordenado pela data informada e o horário de criação permanece preservado para
  auditoria.

## 1.10.1.03 - 2026-08-22

- Gestão Mobile: o Código AVA em **Gerenciar perfil** ganhou ação de cópia.

## 1.10.1.02 - 2026-08-22

- Corrigida a tipagem da consulta de vínculos do Vendas na Gestão Web para
  permitir a publicação da versão atual.

## 1.10.1.01 - 2026-08-22

- Gestão Mobile: **Gerenciar perfil** exibe o Código AVA do perfil ativo junto
  dos dados resumidos do perfil.

## 1.10.1 - 2026-08-22

- Gestão Web e Mobile: vínculos de conteúdo do Vendas usam a mesma fonte por
  conta de vendas. Novas solicitações pendentes geram aviso individual no
  sininho e push para Gestor Master e Administrador quando notificações estão
  permitidas no dispositivo.

## 1.10.0.03 - 2026-08-22

- Gestão Mobile: **Vínculos de conteúdo** não esconde mais uma conta de
  vendas ativa apenas porque seu antigo acesso legado foi removido. A lista é
  informativa e não altera permissões, catálogo ou conexões existentes.

## 1.10.0.02 - 2026-08-22

- Gestão Mobile: a lista de **Vínculos de conteúdo** em Aprovações do Vendas
  agora consulta a conexão efetiva de cada **conta de vendas** com o perfil.
  Assim, vendedores como William aparecem no perfil que fornece seu catálogo,
  Notícias e Divulgação, sem confundir esse vínculo com acesso ao app Vendas.

## 1.10.0.01 - 2026-08-22

- Gestão Mobile: **Aprovações do Vendas** agora separa corretamente as
  solicitações de vínculo por código dos **Vínculos de conteúdo** existentes.
  A lista usa a fonte oficial de Notícias, Divulgação e Catálogo, incluindo
  vínculos históricos e ativos, sem tratar o AvantaVendas independente como um
  acesso aprovado nem oferecer ações que possam bloquear o aplicativo.

## 1.10.0 - 2026-08-22

- Gestão Mobile: Gestor Master e Administrador podem analisar pedidos de acesso
  ao **Vendas Mobile** em **Menu > Configurações > Conta e equipe > Aprovações
  do Vendas**. A tela mostra pendências e acessos aprovados, permite aprovar,
  rejeitar, revogar, reativar ou excluir vínculos com confirmação e atualiza o
  contador em tempo real, reutilizando as mesmas permissões e RPCs da Gestão Web.

## 1.9.0.15 - 2026-08-22

- AvantaVendas: o seletor de perfis ganhou espaçamento adicional antes de
  **Criar perfil de vendas**, distinguindo claramente as contas das ações.

## 1.9.0.14 - 2026-08-22

- AvantaVendas: ao compartilhar um comprovante, a imagem agora segue com a
  mensagem pronta correspondente: **Comprovante de pedido** ou **Comprovante
  de pagamento**.

## 1.9.0.13 - 2026-08-22

- AvantaVendas: pedidos agora são gravados obrigatoriamente no perfil de vendas
  ativo. Cliente e produtos precisam pertencer ao mesmo perfil, impedindo que
  um lançamento seja desviado para outra conta do mesmo login ou da equipe.
- AvantaVendas: lançamentos históricos que ficaram em perfil diferente do
  cliente foram reparados sem recalcular receitas financeiras.

## 1.9.0.12 - 2026-08-21

- Conteúdo do Vendas: a escolha de capa diferencia a imagem privada enviada
  diretamente da imagem já publicada. As capas das pastas usam agora proporção
  fixa de 16:10, evitando cortes inesperados em qualquer tela.

## 1.9.0.11 - 2026-08-21

- Conteúdo do Vendas: fotos, vídeos e PDFs podem ser arrastados para a pasta
  ativa na Gestão Web. Uma imagem enviada exclusivamente como capa fica ligada
  à pasta e não aparece como material na galeria do AvantaVendas.

## 1.9.0.10-av79 - 2026-08-20

- AvantaVendas: o cabeçalho da sala de botões voltou a exibir o botão visual de
  troca, agora conectado aos perfis de vendas e com o nome do perfil ativo logo
  abaixo para identificação rápida.

## 1.9.0.09 - 2026-08-18

- Gestão Financeira: os botões públicos de cadastro voltaram ao texto mais
  direto “Começar grátis”.

## 1.9.0.08 - 2026-08-18

- Gestão Financeira: a composição aprovada do cabeçalho de planos foi aplicada
  definitivamente, com texto à esquerda e seletor Anual/Mensal à direita. O
  modo temporário de arrastar foi removido da landing.

## 1.9.0.07 - 2026-08-18

- Gestão Financeira: foi incluído um modo local de ajuste para a área de
  planos. Com `?editar-planos=1`, os três elementos do cabeçalho podem ser
  arrastados para definir a composição antes de aplicá-la definitivamente.

## 1.9.0.06 - 2026-08-18

- Gestão Financeira: o identificador e o título da área de planos voltaram a
  formar um bloco alinhado à esquerda, com espaçamento curto entre eles e o
  seletor de período mantido à direita.

## 1.9.0.05 - 2026-08-18

- Gestão Financeira: o título da faixa de planos foi ajustado para manter a
  leitura em uma linha sem competir com o seletor Anual/Mensal.

## 1.9.0.04 - 2026-08-18

- Gestão Financeira: a área de planos agora reúne identificador, título e
  seletor de período em uma única faixa. O texto repetido foi removido e os
  cards começaram mais próximos do cabeçalho.

## 1.9.0.03 - 2026-08-18

- Gestão Financeira: o cabeçalho da área de planos passou a posicionar “Planos
  e preços” à esquerda e o título principal à direita na mesma linha, abrindo
  mais espaço vertical para os planos.

## 1.9.0.02 - 2026-08-18

- Gestão Financeira: a faixa horizontal de opções foi compactada, com botões e
  espaçamentos visuais menores, preservando a navegação e a área de leitura.

## 1.9.0.01 - 2026-08-18

- Gestão Financeira: as opções de exploração passaram a formar uma faixa
  horizontal permanente abaixo do seletor principal. A rolagem por essas opções
  agora preserva uma área de leitura maior abaixo do cabeçalho.

## 1.9.0 - 2026-08-18

- Landing pública reorganizada em duas frentes internas: o Laboratório de
  Marcas abre como página principal e a Gestão Financeira possui rota e
  navegação próprias, mantendo a identidade AvantaLab.
- O seletor em pílula permite alternar entre as duas frentes. Menus, entrada e
  período de teste aparecem somente no contexto de Gestão Financeira.

## 1.8.5.15 - 2026-08-18

- Landing pública: o painel da evolução de marcas foi ampliado e seus marcos
  foram reposicionados para criar uma área superior dedicada aos arcos mais
  altos da trajetória.

## 1.8.5.14 - 2026-08-18

- Landing pública: a trajetória da evolução de marcas voltou à composição
  compacta e passou a usar arcos leves acima dos quatro círculos, mantendo uma
  distância visual entre a linha e cada marco.

## 1.8.5.13 - 2026-08-18

- Landing pública: os arcos da evolução de marcas ganharam uma descida maior
  após cada círculo e uma área própria antes dos textos, reforçando a leitura
  do percurso sem sobreposição.

## 1.8.5.12 - 2026-08-18

- Landing pública: os arcos entre as etapas passaram a percorrer somente o
  espaço abaixo dos círculos, saindo e retornando pela base central de cada
  marco, sem sobreposição.

## 1.8.5.11 - 2026-08-18

- Landing pública: a largura da trajetória foi vinculada à grade dos quatro
  marcos. Cada arco agora começa e termina no eixo central dos respectivos
  círculos.

## 1.8.5.10 - 2026-08-18

- Landing pública: a trajetória da evolução de marcas agora parte e chega
  exatamente na base de cada círculo, com os quatro marcos distribuídos na
  mesma grade para tornar a conexão contínua e harmônica.

## 1.8.5.09 - 2026-08-18

- Landing pública: a explicação e a trilha do Laboratório de Marcas foram
  unificadas em quatro etapas equivalentes — Ideia, Direção, Identidade e
  Operação. O tracejado agora é um percurso único, contínuo e geometricamente
  alinhado aos círculos de cada etapa.

## 1.8.5.08 - 2026-08-18

- Landing pública: os três saltos da trilha do Laboratório de Marcas agora
  evoluem em alturas progressivas e mais suaves, preservando a mesma distância
  horizontal entre etapas.

## 1.8.5.07 - 2026-08-18

- Landing pública: as setas dos saltos do Laboratório de Marcas foram movidas
  para o centro de cada arco, acompanhando a altura crescente da evolução.

## 1.8.5.06 - 2026-08-18

- Landing pública: as setas de chegada dos saltos do Laboratório de Marcas
  passaram a usar elementos visuais próprios para permanecerem nítidas sobre a
  trilha em qualquer navegador.

## 1.8.5.05 - 2026-08-18

- Landing pública: os saltos tracejados do Laboratório de Marcas agora deixam
  uma distância visual antes de cada marco, destacando as setas de avanço.

## 1.8.5.04 - 2026-08-18

- Landing pública: as setas dos saltos da trilha do Laboratório de Marcas foram
  deslocadas para antes do próximo marco, deixando cada avanço visível.

## 1.8.5.03 - 2026-08-18

- Landing pública: a trilha do Laboratório de Marcas passou a usar três saltos
  curvos tracejados, cada um com seta de avanço e arco maior no passo final.
  O movimento é decorativo, discreto e respeita a preferência por redução de
  movimento.

## 1.8.5.02 - 2026-08-18

- Landing pública: a trilha do Laboratório de Marcas agora conecta cada etapa
  individualmente por um trecho pontilhado e uma seta, sem linha antes de
  **Ideia** ou após **Operação**.

## 1.8.5.01 - 2026-08-18

- Landing pública: a evolução visual do Laboratório de Marcas foi reorganizada
  como uma trilha reta e ordenada, com quatro marcos, tracejado e setas entre
  ideia, direção, identidade e operação.

## 1.8.5 - 2026-08-18

- Landing pública: a AvantaLab passa a apresentar as duas frentes da empresa,
  **Laboratório de marcas** e **Gestão financeira**, sob a proposta “Do zero ao
  operacional”.
- Foi criada a seção do Laboratório de Marcas, com narrativa visual sobre a
  transformação de uma ideia em negócio pronto para operar, sem publicar um
  canal de contato ainda não definido.
- A navegação foi simplificada: **Laboratório de marcas** leva à nova frente e
  **Gestão financeira** agrupa os conteúdos atuais do sistema em um menu
  expansível acessível em desktop e celular.

## 1.8.4.01 - 2026-08-18

- Landing pública: os celulares da seção **Nossos apps** agora exibem as
  capturas originais dos dashboards do AvantaLab Gestão e do AvantaVendas,
  preservadas por inteiro dentro das molduras responsivas.

## 1.8.4 - 2026-08-18

- Landing pública: adicionada a seção **Nossos apps**, com apresentação do
  AvantaLab Gestão e do AvantaVendas, benefícios resumidos e links oficiais
  para baixar cada aplicativo na App Store.
- A disponibilidade futura no Google Play é informada sem oferecer um link
  inativo. O menu principal e a rolagem assistida agora levam diretamente à
  nova seção em desktop e celular.

## 1.8.3.01 - 2026-08-18

- Controle de Ponto: o estado final do botão central apresenta **Jornada
  Concluída** em uma escala menor e centralizada, preservando o tamanho e a
  posição do botão durante toda a jornada.

## 1.8.3 - 2026-08-17

- Perfis que usam uma vaga de outra assinatura agora podem iniciar uma
  assinatura própria pelo painel **Assinatura**, com confirmação clara da
  mudança comercial.
- O acesso compartilhado e a ocupação da vaga são preservados durante todo o
  checkout. Somente o pagamento confirmado ativa o plano próprio, remove o
  vínculo anterior e devolve a vaga ao perfil de origem em uma transação.
- Checkout abandonado ou recusado não interrompe o acesso existente. Perfis em
  cortesia continuam sem contratação disponível até a revogação administrativa.
- A transição bloqueia renovações avulsas ainda cobradas pelo plano de origem e
  suspende apenas benefícios de módulos que não façam parte do novo plano,
  preservando os dados cadastrados.
- Webhook, consulta de estado e conciliação automática aplicam a mesma regra,
  permitindo recuperação segura caso uma confirmação seja processada com atraso.

## 1.8.2 - 2026-08-17

- Auditado o ciclo completo de assinaturas Web e Apple: contratação repetida
  reutiliza a cobrança pendente e nunca substitui silenciosamente uma
  assinatura ou um período já pago.
- O teste Business Pro continua disponível até a data original mesmo quando o
  usuário inicia ou cancela um checkout antes do primeiro pagamento.
- Criação de perfil e consumo de quota agora são confirmados em uma transação
  no banco, impedindo dupla utilização da última vaga e o repasse de quota por
  um perfil que apenas recebeu acesso compartilhado.
- A quota do Pessoal Premium comprado pela App Store passa a reconhecer até
  três perfis pessoais do próprio login, com validação final no servidor.
- Perfis compartilhados identificam claramente a origem do plano e não podem
  contratar, alterar, cancelar ou receber cupom como se fossem o assinante.
- Resgates de cupom ficaram atômicos, limitados a gestores, protegidos contra
  uso simultâneo e impedidos de substituir cobranças Asaas ou App Store.
- Cancelamentos preservam somente o período efetivamente pago; carência não
  encurta teste vigente e a conciliação automática também cobre módulos.
- Ao elevar Business para Business Pro, renovações avulsas de módulos são
  encerradas antes da mudança para evitar cobrança duplicada.
- Cortesias administrativas não alcançam a cobrança independente do
  reconhecimento facial e preservam o cadastro do cliente na Asaas.
- Edição de perfil preserva o tipo quando ele não é enviado e bloqueia troca
  incompatível com assinatura vigente.

## 1.8.1 - 2026-08-17

- Corrigida a criação de perfis pelo painel **Gerenciar perfis**: esse caminho
  agora consulta e envia a quota do perfil assinante, igual ao fluxo completo.
- Business e Business Pro informam a quantidade de vagas antes da confirmação e
  vinculam o novo perfil à assinatura existente sem iniciar outro teste.
- Perfis empresariais criados sem uma quota elegível continuam independentes e
  podem escolher entre o teste do Business Pro e uma assinatura própria.
- Ao ativar uma assinatura Business paga, perfis anteriores do mesmo Gestor
  Master em teste, cortesia ou sem assinatura podem ser incorporados às vagas
  disponíveis. Assinaturas pagas próprias e seu histórico são preservados.
- O servidor restringe o consumo de vagas aos papéis Gestor Master e
  Administrador e mantém a decisão final de quota fora da interface.

## 1.8.0.05 - 2026-08-15

- A página e as APIs ainda experimentais de créditos, carteira, recargas e
  consultas de crédito foram retiradas da publicação oficial e preservadas
  integralmente em **AvantaLab Projetos**, junto com testes e migrações para
  retomada após a contratação da empresa fornecedora.
- A consulta de CNPJ usada no cadastro de perfis permanece ativa e inalterada.
  O histórico vazio das migrações da carteira foi mantido no banco, sem rota ou
  interface disponível, evitando uma reversão desnecessária.

## 1.8.0.04 - 2026-08-15

- Removida a rota pública e sem uso que enviava sugestões por SMS para um
  telefone administrativo. Sugestões continuam salvas e administradas pelo
  `/admin`; os serviços Twilio Verify de cadastro, validação de telefone e
  recuperação de senha permanecem ativos e inalterados.

## 1.8.0.03 - 2026-08-15

- Recebimentos Presenciais passa a exigir a conexão real do perfil com o
  Supabase. O antigo repositório demonstrativo em memória e seus registros
  fictícios foram retirados do pacote publicado, sem alterar cadastros,
  lançamentos, comprovantes ou integrações existentes.

## 1.8.0.02 - 2026-08-14

- O aviso **Acesso já existente** do AvantaProjetos ganhou destaque leve com
  borda e superfície vermelhas, ícone e título reforçado, mantendo contraste nos
  temas claro e escuro e anúncio acessível como alerta.

## 1.8.0.01 - 2026-08-14

- AvantaProjetos impede compartilhar um projeto com alguém que já participa da
  própria empresa de origem. Nesse caso, o acesso continua seguindo a hierarquia
  da equipe e nenhum vínculo redundante é criado.
- Compartilhamentos internos antigos deixam de gerar card ou botão
  **Compartilhado** enquanto o usuário mantiver vínculo ativo com a empresa.

## 1.8.0 - 2026-08-14

- AvantaProjetos reúne, na mesma página, projetos próprios e projetos
  compartilhados por diferentes contas. Cada card recebido identifica a empresa
  de origem e se a permissão permite editar ou somente visualizar.
- Contas sem assinatura ou sem o módulo instalado recebem um único botão
  **Projetos** com o selo **Compartilhado**. Esse acesso não libera criação,
  importação ou administração do módulo; ao instalar, o mesmo botão assume o
  estado normal e preserva os cards recebidos.
- Links abrem diretamente o projeto autorizado e o retorno preserva o perfil do
  convidado. Permissões são aplicadas individualmente quando a mesma empresa
  compartilha projetos editáveis e projetos de somente visualização.

## 1.7.3.37 - 2026-08-14

- Corrige a estrutura técnica das rotas de documentos do Controle de Ponto,
  permitindo que a compilação de produção seja concluída sem alterar as
  permissões ou o funcionamento do módulo.

## 1.7.3.36 - 2026-08-14

- Gestão Web: ao trocar de perfil, a atualização da lista não substitui mais
  a escolha feita no seletor. Um único clique mantém o perfil de destino até a
  confirmação do acesso.
- AvantaProjetos reduz em aproximadamente 25% a altura visual dos campos e do
  botão de verificação em **Compartilhar acesso**, preservando o alvo interativo
  ampliado e o alinhamento entre seletor e ação.

## 1.7.3.35 - 2026-08-14

- Organização interna: telas e protótipos em desenvolvimento foram retirados
  da publicação e preservados no repositório local **AvantaLab Projetos**.
  Controle de Ponto, Recebimentos, Projetos e AvantaVendas permanecem ativos
  sem alteração.
- AvantaProjetos bloqueia um segundo cadastro do mesmo e-mail no mesmo projeto.
  Quando o vínculo já existe, nenhum dado é alterado e a pessoa reaparece na
  lista com uma mensagem objetiva.
- O compartilhamento identifica no título a qual projeto pertence a lista de
  acessos. A mesma pessoa continua podendo receber acesso a projetos diferentes.

## 1.7.3.34-av78 - 2026-08-13

- AvantaVendas: cada perfil passa a ter um **Nome nos comprovantes** próprio em
  Configurações > Conta de vendas, independente do catálogo e do Gestão.
- AvantaVendas: comprovantes de pedidos e pagamentos usam o nome configurado;
  quando vazio, utilizam o nome do perfil de vendas ativo.

## 1.7.3.34-av77 - 2026-08-13

- AvantaVendas: **Dados do usuário** volta a exibir a empresa fornecedora de
  conteúdo vinculada ao perfil ativo, sem confundi-la com o destino financeiro.
- AvantaVendas: corrige globalmente as preferências de Notícias, Divulgação e
  Catálogo migradas de uma empresa diferente, sem alterar dados operacionais.

## 1.7.3.34 - 2026-08-13

- AvantaProjetos compacta o modal de compartilhamento, posiciona **Verificar e
  adicionar** ao lado do tipo de acesso, remove a ação redundante **Fechar** e
  mantém somente o X para descartar o formulário.
- A confirmação extensa abaixo do link copiado foi removida; o próprio botão
  continua confirmando **Conteúdo copiado**.

## 1.7.3.33-av76 - 2026-08-13

- AvantaVendas: separa definitivamente a empresa financeira do perfil e a
  empresa fornecedora de Catálogo, Notícias e Divulgação.
- AvantaVendas: migra os vínculos existentes por conta usando primeiro os
  produtos já recebidos, sem excluir ou recriar produtos, pedidos ou clientes.
- AvantaVendas: novas solicitações ficam vinculadas ao perfil de vendas ativo;
  participantes da mesma conta recebem o conteúdo autorizado para ela.

## 1.7.3.33 - 2026-08-13

- AvantaProjetos usa a área de transferência nativa do Chrome com chamada
  efetiva e limite de tempo; o método legado que retornava sucesso sem copiar
  foi removido do fluxo.

## 1.7.3.32 - 2026-08-13

- Corrige a ação do botão **Copiar link** no AvantaProjetos: o clique agora
  executa efetivamente a função de cópia, em vez de apenas referenciá-la.

## 1.7.3.31 - 2026-08-13

- AvantaProjetos copia o link pela seleção visível do próprio campo, usando o
  comando nativo que foi validado no Chrome, sem aguardar a API assíncrona que
  permanecia bloqueada nesse navegador.

## 1.7.3.30 - 2026-08-13

- AvantaProjetos verifica o conteúdo da área de transferência antes de confirmar
  a cópia do link. Sem confirmação, o link é selecionado para cópia manual e o
  sistema não exibe sucesso indevido.

## 1.7.3.29 - 2026-08-13

- AvantaProjetos executa primeiro a cópia compatível com seleção direta antes
  de recorrer à área de transferência moderna, impedindo confirmação sem uma
  operação de cópia bem-sucedida.

## 1.7.3.28 - 2026-08-13

- AvantaProjetos confirma de forma persistente **Conteúdo copiado** ao copiar
  links e usa uma alternativa compatível quando a área de transferência do
  navegador estiver bloqueada.

## 1.7.3.27 - 2026-08-13

- AvantaProjetos mantém o acesso aos links na lista de compartilhamentos:
  membros autorizados podem abrir o link do projeto e convites pendentes podem
  gerar um novo link individual, invalidando o anterior.

## 1.7.3.26 - 2026-08-13

- AvantaProjetos aplica o cabeçalho institucional colorido ao modal de
  compartilhamento de acesso, preservando legibilidade em temas claro e escuro.

## 1.7.3.25 - 2026-08-13

- AvantaProjetos exibe, no próprio compartilhamento, as pessoas que receberam
  acesso ao projeto, seu nível de permissão, convites pendentes e a revogação
  confirmada do acesso.

## 1.7.3.24 - 2026-08-13

- AvantaProjetos confirma visualmente a cópia de links de compartilhamento no
  próprio convite, com rótulo e orientação imediatos.

## 1.7.3.23-av75 - 2026-08-13

- AvantaProjetos passa a permitir compartilhamento seguro por projeto: verifica
  contas existentes, gera convite copiável para novos acessos e permite revogar
  o vínculo. Convidados veem e editam somente projetos compartilhados.
- AvantaVendas: backups e pontos de restauração passam ao esquema 2 e agora
  preservam também o nome e a empresa do perfil, participantes e permissões
  internas, preferências, opções de Notícias/Divulgação/Catálogo e os vínculos
  dos produtos recebidos.
- AvantaVendas: catálogo, preferências e estado dos recursos comerciais ficam
  isolados pela conta ativa; dois perfis do mesmo login não compartilham mais
  essas configurações nem bloqueiam o recebimento do mesmo produto.
- AvantaVendas: produtos cadastrados ou importados pelo usuário continuam no
  snapshot completo. Se o item mestre ou um pacote antigo não existir mais, a
  cópia restaurada é preservada como produto independente.
- Segurança: uma restauração nunca reativa autorização empresarial revogada
  pelo gestor. Backups e pontos antigos do esquema 1 continuam compatíveis.

## 1.7.3.22-av74 - 2026-08-13

- AvantaVendas: **Configurações > Dados e segurança** passa a reunir backup
  completo da conta ativa, restauração de arquivo e pontos de restauração
  manuais e automáticos.
- AvantaVendas: backups, pontos e reset são isolados pelo perfil de vendas.
  Proprietário e administrador podem criar cópias; somente o proprietário
  restaura, exclui pontos ou reseta o perfil. Antes de restaurar ou resetar, o
  sistema cria automaticamente um ponto de segurança.
- AvantaVendas: o backup baixado usa o pacote `.avantavendas`, com manifesto,
  dados completos e resumo em Excel. A restauração rejeita arquivos de outra
  conta e recarrega os dados após a confirmação.

## 1.7.3.21-av73 - 2026-08-13

- AvantaVendas: a organização da sala de botões passa a usar encaixes fixos e
  tolerância contra oscilações, mantendo o card arrastado estável mesmo em
  movimentos rápidos ou diagonais.
- AvantaVendas: o card em movimento preserva o recorte da imagem, os demais
  cards deslizam suavemente até a nova posição e a ordem é salva somente ao
  concluir o gesto. Também é possível reorganizar pelos direcionais do teclado.

## 1.7.3.20-av72 - 2026-08-13

- AvantaVendas: **Localização** no card principal de cliente sem endereço
  recebe contraste reforçado no tema claro. Em Editar cliente, CEP, Buscar e
  Apagar foram distribuídos igualmente pela largura da linha.

## 1.7.3.19-av71 - 2026-08-12

- AvantaVendas: no card de cliente, o CEP agora reúne **Buscar** e **Apagar**.
  A remoção pede confirmação, limpa apenas os campos de endereço e mantém os
  demais dados para o cadastro de um novo endereço. **Localização** recebeu
  contraste reforçado no tema claro.

## 1.7.3.18 - 2026-08-12

- Gestão Web e Mobile: o perfil que contratou Business ou Business Pro informa
  as vagas disponíveis e pode criar perfis que usam o mesmo plano
  imediatamente, sem teste nem nova assinatura. Um perfil que recebeu uma vaga
  não cria uma nova cadeia: nele, a criação segue o fluxo de teste ou assinatura.
- Cobrança: a assinatura de origem é compartilhada com os perfis criados na
  franquia. Assim, qualquer alteração de vigência é refletida também no novo
  perfil e na equipe, sem duplicar cobrança ou período de teste.
- Gestão Web: a criação de perfil informa quantas vagas do plano restarão. Sem
  vagas ou sem assinatura elegível, mantém as opções de teste e contratação.

## 1.7.3.16 - 2026-08-12

- Gestão Web e Mobile: o Balanço Geral permanece somente para consulta. As
  receitas continuam sendo criadas exclusivamente como entradas individuais no
  mês ou no card **Registrar entradas** do Dashboard.
- Banco de dados: normalização dos resumos históricos de receita para que cada
  total seja igual à soma das entradas efetivadas. Diferenças antigas são
  preservadas como **Receita registrada anteriormente**, sem apagar registros.

## 1.7.3.15-av70 - 2026-08-12

- Gestão Mobile: o texto **Uso diário** foi removido do topo do Menu. A lista
  passa a começar diretamente por **Assinatura e plano**, sem alterar a ordem
  ou o funcionamento dos botões.
- AvantaVendas: a releitura automática de **Divulgação** ao entrar na página
  agora ocorre silenciosamente, sem exibir um aviso de atualização.
- AvantaVendas: no celular, o gesto de puxar para atualizar começa somente no
  cabeçalho fixo de **Divulgação**. Fundo escuro, círculo de progresso e textos
  seguem exatamente o mesmo retorno visual usado na Gestão Mobile.

## 1.7.3.14-av69 - 2026-08-12

- AvantaVendas: ao entrar novamente em **Divulgação**, o aplicativo relê
  somente as pastas e os materiais publicados, sem exigir que o usuário feche
  o aplicativo ou saia da conta.
- AvantaVendas: no celular, puxar para baixo a partir do topo da página de
  **Divulgação** também atualiza os materiais. O gesto não interfere na
  rolagem normal, preserva a pasta aberta quando ela ainda existe e informa
  carregamento, sucesso, indisponibilidade de conexão e erro.

## 1.7.3.13 - 2026-08-12

- Gestão Web e Mobile: inclusão, edição, exclusão e confirmação de receitas e
  despesas agora bloqueiam a tela com fundo escuro e indicador de processamento
  até a resposta do servidor, evitando solicitações repetidas.

## 1.7.3.12 - 2026-08-12

- Gestão Web e Mobile: em **Conteúdo do Vendas > Divulgação**, o envio de
  materiais abre diretamente o seletor do aparelho. O menu intermediário com
  opções repetidas foi removido, e a mesma seleção aceita fotos, vídeos e PDFs.

## 1.7.3.12-av68 - 2026-08-12

- AvantaVendas: em **Divulgação**, a barra da pasta atual agora fica fixa com
  **Voltar** durante a rolagem dos arquivos. O formato compacto mostra
  “Pasta atual: nome da pasta” em uma linha e mantém busca e filtro no cabeçalho.

## 1.7.3.11-av67 - 2026-08-12

- AvantaVendas: os avisos dos cards de perfis e compartilhamento agora usam a
  mesma camada acima do formulário. Campos obrigatórios e erros preservam o
  preenchimento, oferecem **Voltar** e devolvem o foco ao ponto de correção.

## 1.7.3.10-av66 - 2026-08-12

- AvantaVendas: os cartões de criação e compartilhamento de perfis seguem os
  campos padronizados, com rótulos, contornos e espaçamento adequados. Quando
  o e-mail informado não possuir conta AvantaLab, um aviso sobre o formulário
  explica a situação e permite voltar sem perder o preenchimento.
- AvantaVendas: a lista em **Perfis de vendas** separa nome, vínculo e
  permissão em áreas próprias, evitando sobreposição de textos em telas móveis.

## 1.7.3.09 - 2026-08-12

- Gestão Mobile: o rodapé encaixado com **Sugestões** e **Sair** passa a ficar
  sempre visível acima da navegação inferior. O aviso de lançamentos duplicados
  permanece em Preferências, agora na ordem definida após modo escuro e valores
  ocultos.
- Gestão Mobile: grupos expansíveis preservam integralmente bordas, raios e
  sombras quando abertos, sem recorte pelos limites internos do menu e sem os
  marcadores laterais antigos.

## 1.7.3.08 - 2026-08-12

- Gestão Mobile: **Conteúdo do Vendas** permanece visível dentro de **Sistemas**
  para todos os perfis. Quando o módulo ainda não estiver ativo ou o usuário não
  possuir permissão, o próprio botão informa a indisponibilidade sem desaparecer.

## 1.7.3.07 - 2026-08-12

- Gestão Mobile: o Menu foi reorganizado por uso diário, organização da tela
  inicial, sistemas e configurações. Preferências, conta e equipe, dados e
  segurança agora possuem agrupamentos próprios; **Excluir este perfil** fica
  após **Pontos de restauração**.
- Gestão Mobile: **Instruções sobre categorias** saiu da lista principal e
  passou para o ícone de informação em **Cadastrar despesas**. **Sugestões** e
  **Sair** compartilham um rodapé encaixado e fixo, reduzindo a altura do menu.

## 1.7.3.07-av65 - 2026-08-12

- AvantaVendas: a imagem do comprovante de pagamento passou a usar a mesma
  composição compacta do pedido. Cabeçalho, confirmação e cards de valores
  ficaram menores; **Resumo financeiro** também foi reduzido e, junto de
  **Detalhes do pagamento**, é centralizado sem ícone. O rodapé usa pílula
  branca com o primeiro nome da cliente. A altura agora acompanha o conteúdo:
  o rodapé fica sempre à mesma distância da base e listas maiores de pedido
  ampliam a imagem antes dele, sem espaço vazio no final. A arte de fundo fica
  ancorada no rodapé, com corte superior quando necessário; os cards brancos
  passam a ter contorno azul suave para melhor separação visual.

## 1.7.3.06 - 2026-08-12

- Gestão Web e Mobile: receitas passam a ser registradas somente como entradas
  individuais. A opção **Definir total do mês**, seus avisos de substituição e
  a edição direta do faturamento no Balanço Geral foram removidos.
- Dados: referências mensais antigas são preservadas como uma entrada comum,
  identificada como **Receita registrada anteriormente**, sem apagar as demais
  receitas do período.

## 1.7.3.06-av64 - 2026-08-12

- AvantaVendas: a imagem do comprovante de pedido ficou mais compacta. O
  cabeçalho e a confirmação de sucesso agora usam menos espaço; os cards de
  valor do pedido e saldo atual também foram reduzidos. **Detalhes do pedido**
  ficou centralizado e não repete mais o ícone, diminuindo a altura total sem
  alterar itens, cálculos ou valores.

## 1.7.3.05-av63 - 2026-08-11

- AvantaVendas: o toque nos nove cards principais da sala agora reduz o botão
  uniformemente para o centro, sem manter a borda inferior fixa nem deslocar o
  card para baixo.

## 1.7.3.05-av62 - 2026-08-11

- AvantaVendas: o acesso direto ao aplicativo Gestão foi removido do cabeçalho
  da sala e das opções de atalhos inferiores. A integração financeira opcional
  permanece disponível somente em Configurações, sem alterar dados ou sessões.

## 1.7.3.05-av61 - 2026-08-11

- AvantaVendas: no comprovante de pedido, **Pedido registrado com sucesso!**
  fica centralizado horizontal e verticalmente na pílula de confirmação. Os
  títulos **Pedido registrado** e **Situação após o lançamento** também ficam
  centralizados na faixa entre o topo do card e o respectivo campo colorido de
  valor, inclusive no renderizador alternativo usado durante transições de
  cache.
- AvantaVendas: os nove cards principais da sala de botões voltam a afundar
  visualmente durante o toque, sem alterar a navegação nem o gesto usado para
  reorganizá-los.

## 1.7.3.05-av60 - 2026-08-11

- AvantaVendas: no comprovante de pedido, produtos com somente uma unidade não
  repetem a quantidade abaixo do nome. A linha “quantidade × valor unitário”
  permanece visível a partir de duas unidades, reduzindo a poluição visual sem
  alterar o valor total do item.
- AvantaVendas: Configurações mantém a ação Sair somente no cabeçalho, sem o
  card repetido no fim da página. No comprovante de pedido, os textos auxiliares
  do aviso de sucesso, do valor do pedido e do saldo atual foram removidos; os
  rótulos restantes ficam centralizados nos respectivos cards. Os ícones
  repetidos nos cabeçalhos de Pedido registrado e Situação após o lançamento
  foram retirados, permanecendo somente dentro dos campos coloridos de valor.

## 1.7.3.05-av59 - 2026-08-11

- AvantaVendas: o rodapé da imagem compartilhada do pedido agora mantém título
  e cliente dentro de uma pílula branca opaca, com largura adaptável e limite
  seguro para textos extensos, preservando a leitura sobre toda a arte de fundo.
  O nome da cliente usa somente a primeira palavra no cabeçalho e no rodapé,
  evitando que observações registradas depois do nome apareçam no comprovante.
- AvantaVendas: o campo de e-mail do acesso e do cadastro passa a aproveitar
  toda a largura interna disponível, exibindo endereços longos mais perto da
  borda direita sem retirar o espaço reservado ao botão dos campos de senha.

## 1.7.3.05-av58 - 2026-08-11

- AvantaVendas: a revisão própria dos recursos avança para `av58`, criando URLs
  novas para o JavaScript corrigido e um novo cache do service worker. Assim,
  cadastro, login sem empresa, preparação automática da conta e recuperação de
  senha deixam de reutilizar os arquivos imutáveis de `av55`.
- Entrega: o build agora compara a revisão executável do AvantaVendas com a
  revisão operacional mais recente do manual e do changelog, impedindo nova
  publicação quando esses números divergirem.

## 1.7.3.05-av57 - 2026-08-11

- AvantaVendas: a recuperação de senha consulta o diretório central de contas
  no servidor, sem depender de vínculo comercial, e, quando
  o e-mail não pertence a uma conta, exibe **Usuário não localizado** em um
  aviso acessível. O endereço digitado é preservado e recebe novamente o foco
  para correção.

## 1.7.3.05-av56 - 2026-08-11

- AvantaVendas: o cadastro de um e-mail já existente deixa de exibir a mensagem
  técnica em inglês e apresenta **Conta já cadastrada**, com ações diretas para
  entrar no login ou recuperar a senha, preservando o e-mail informado.

## 1.7.3.05-av55 - 2026-08-11

- AvantaVendas: a confirmação de exclusão foi condensada em uma descrição
  direta sobre os dados removidos, a preservação de outros serviços AvantaLab
  e o início vazio caso o usuário volte a utilizar o Vendas.

## 1.7.3.05-av54 - 2026-08-11

- AvantaVendas: a sessão local passa a usar armazenamento exclusivo. Abrir o
  Vendas não reutiliza silenciosamente a sessão do Gestão, e sair de um app não
  encerra a sessão do outro.
- AvantaVendas: a troca de sistema apenas abre o aplicativo de destino; sem uma
  sessão própria naquele app, o usuário informa o mesmo login AvantaLab.
- AvantaVendas: **Excluir conta do Vendas** remove somente a conta e os dados
  deste serviço, encerra sua sessão local e preserva outros serviços AvantaLab.
  Um retorno ao Vendas exige novo login explícito e começa com dados vazios.
- AvantaVendas: vínculos de catálogo e financeiro continuam no servidor e não
  dependem do compartilhamento de sessão entre os aplicativos.

## 1.7.3.05-av53 - 2026-08-11

- AvantaVendas: a validação SMS passa a bloquear chamadas simultâneas e a
  desativar o botão no primeiro toque, evitando que uma segunda requisição
  tente reutilizar uma verificação que o Twilio já aprovou e encerrou.
- AvantaVendas: após a aprovação do SMS, uma falha posterior na criação da
  conta pode ser retomada sem consumir ou conferir novamente o mesmo código.
- AvantaVendas: o reenvio de SMS também recebe trava contra toques duplicados.

## 1.7.3.05-av52 - 2026-08-11

- AvantaVendas: o nome completo do cadastro passa a aplicar inicial maiúscula
  em nome e sobrenomes, preservando conectivos usuais em português.
- AvantaVendas: o reenvio do código SMS agora exibe a contagem regressiva real
  de 60 segundos e se transforma em uma pílula acionável ao chegar a zero.
- AvantaVendas: códigos SMS antigos são limpos ao sair da validação, ao solicitar
  um novo código e ao tocar em um campo preenchido; caracteres de formatação
  adicionados pelo preenchimento automático também são removidos antes da
  verificação no servidor.

## 1.7.3.05-av51 - 2026-08-11

- AvantaVendas: a exclusão concluída agora exibe um aviso de sucesso após o
  encerramento da sessão, com a única ação **Voltar para o início**, que retorna
  ao login do Vendas sem direcionamento para o Gestão.

## 1.7.3.05-av50 - 2026-08-11

- AvantaVendas: ao concluir a exclusão da conta, o aplicativo encerra a sessão
  e retorna diretamente ao login. A tela intermediária e o direcionamento para
  o Gestão foram removidos desse fluxo.

## 1.7.3.05-av49 - 2026-08-11

- AvantaVendas: a Ava passa a usar a conta de vendas ativa como contexto da
  conversa, eliminando o falso erro de perfil selecionado em contas
  independentes, sem criar dependência com perfis financeiros do Gestão. O
  servidor valida a sessão e a participação ativa do usuário nessa conta.

## 1.7.3.05-av48 - 2026-08-11

- AvantaVendas: o seletor de conta ativa no modo escuro agora exibe uma única
  seta branca, alinhada à direita, sem repetir o ícone sobre o conteúdo.

## 1.7.3.05-av47 - 2026-08-11

- AvantaVendas: a tela **Preparando acesso** agora ocupa permanentemente toda a
  área útil após o login. A altura transitória reduzida pelo teclado deixou de
  ser congelada, eliminando a lacuna branca inferior em iOS, Android, PWA e
  navegador.

## 1.7.3.05-av46 - 2026-08-11

- AvantaVendas: o primeiro espaço de vendas agora é preparado automaticamente
  após a autenticação, sem tela intermediária ou segundo clique; o usuário entra
  direto na sala de botões e a operação é protegida contra contas duplicadas.
- AvantaVendas: a confirmação do cadastro por e-mail retorna ao próprio Vendas,
  preservando a origem do acesso em vez de encaminhar ao Gestão.
- AvantaVendas: **Ir para Gestão** deixou de consultar perfis financeiros e de
  incorporar a Gestão dentro do Vendas. Agora abre o aplicativo Gestão quando
  instalado e usa a Gestão Mobile no navegador como contingência, sem transferir
  perfil ou sessão; ambos continuam aceitando o mesmo login e senha.

## 1.7.3.05-av45 - 2026-08-11

- AvantaVendas: os botões da sala principal agora preservam a proporção quadrada
  também em telas Android de até 460 px, removendo a altura mínima conflitante e
  impedindo a deformação das imagens.

## 1.7.3.05-av44 - 2026-08-11

- AvantaVendas: Google e Apple agora compartilham no aplicativo nativo o mesmo
  fluxo seguro já usado pela Gestão Mobile, com navegador do sistema, deep link
  próprio, retorno PKCE ou por tokens, cancelamento recuperável e continuidade
  da sessão dentro do app; o redirecionamento Web/PWA permanece inalterado.

## 1.7.3.05-av43 - 2026-08-11

- AvantaVendas: o seletor de conta ativa agora usa setas SVG próprias, escuras
  no tema claro e brancas no tema escuro, inclusive em navegadores móveis.

## 1.7.3.05-av42 - 2026-08-11

- AvantaVendas: os cards de **Resetar sistema** e **Excluir conta do Vendas**
  agora exibem ícones SVG próprios e reconhecíveis nos cabeçalhos e nas ações,
  sem alterar o funcionamento dessas opções.

## 1.7.3.05 - 2026-08-10

- A Gestão Web não confunde falha temporária de leitura com configuração
  inexistente e, nesse caso, não grava valores padrão sobre as preferências do
  perfil.
- Gestão Mobile: tutorial, tema, ordem/visibilidade do dashboard, atalhos e
  preferência de valores passam a acompanhar a conta, mantendo a cópia local
  apenas como contingência offline.

## 1.7.3.04 - 2026-08-10

- A limpeza de cortesia também consulta o histórico técnico de cobranças para
  encerrar assinaturas antigas que já não estejam espelhadas nas faturas locais.

## 1.7.3.03 - 2026-08-10

- Ao liberar um perfil por cortesia, o sistema encerra cobranças abertas no
  Asaas, preserva o cadastro do cliente e remove faturas e avisos locais.
- O processador de avisos de assinatura ignora perfis em cortesia, inclusive se
  existir algum registro de fatura antigo.

## 1.7.3.02-av41 - 2026-08-10

- AvantaVendas: login e cadastro passaram a exibir validações em cards acessíveis,
  preservando os campos preenchidos e devolvendo o foco ao campo que precisa de
  correção, sem criar rolagem no formulário.
- AvantaVendas: Configurações agora oferece a exclusão definitiva do perfil e
  dos dados específicos do Vendas, com confirmação forte, preservando o login
  AvantaLab, os perfis do Gestão e o histórico financeiro já desvinculado; os
  uploads particulares do Vendas também são removidos do armazenamento.
- AvantaVendas: um perfil excluído não é recriado automaticamente; a reativação
  do Vendas depende de uma ação explícita do usuário.

## 1.7.3.02 - 2026-08-10

- AvantaVendas: um mesmo login pode ter várias contas de vendas, alternar entre
  elas e compartilhar uma conta com outros usuários, mantendo clientes,
  pedidos, pagamentos, agenda, produtos e backups separados por conta.
- AvantaVendas: o formulário de novo perfil e o card **Conta de vendas** passaram
  a apresentar labels, espaçamento, seletores e contornos alinhados ao padrão do
  sistema.
- AvantaVendas: todos os cards de Configurações agora usam cabeçalho institucional
  em degradê, com ícones e títulos padronizados; ações de risco preservam o
  cabeçalho semântico vermelho.

## 1.7.3.01 - 2026-08-10

- AvantaVendas: ao editar um pagamento, a forma de pagamento pode ser alterada
  logo abaixo da data e é atualizada ao salvar.

## 1.7.3 - 2026-08-08

- AvantaVendas: o Dashboard agora apresenta a evolução das vendas nos últimos
  12 meses, com barras selecionáveis e valor atualizado ao toque.
- AvantaVendas: a linha de início, fim, filtrar e mês atual passou a ocupar
  explicitamente toda a largura disponível também na prévia móvel.

## 1.7.2.34 - 2026-08-08

- AvantaVendas: no celular, os quatro controles do filtro do Dashboard agora
  ocupam igualmente toda a largura da linha.

## 1.7.2.33 - 2026-08-08

- AvantaVendas: os dois campos de data do filtro do Dashboard foram ampliados,
  e os quatro controles agora distribuem toda a largura disponível da linha.

## 1.7.2.32 - 2026-08-08

- AvantaVendas: no Dashboard, **Mês atual** agora fica junto aos campos de
  início, fim e **Filtrar**. O seletor de mês ocupa sozinho a linha seguinte,
  centralizado e com a mesma largura útil anterior.

## 1.7.2.31 - 2026-08-08

- A Gestão Web recebeu refinamentos de navegação e leitura: menu lateral com
  abertura deslizante, destaques por mês em balanços e relatórios, e tooltips
  de gráficos com contraste e identificação de faturamento aprimorados.
- A landing passou a apresentar uma grade ampliada de recursos, com ícones SVG
  relacionados a cada item e o logo oficial da Ava.

## 1.7.2.30 - 2026-08-08

- O botão **Início** passou a usar o azul-marinho escuro de marca do AvantaLab
  no modo claro.
- A integração desta publicação também equipara cortesias ao plano completo
  correspondente e atualiza vínculos comerciais aprovados automaticamente.

## 1.7.2.29 - 2026-08-08

- O botão **Início** passou a usar a seta SVG do AvantaProjetos, garantindo
  alinhamento geométrico com o rótulo.

## 1.7.2.28 - 2026-08-08

- O ícone de retorno do botão **‹ Início** foi alinhado verticalmente ao texto.

## 1.7.2.27 - 2026-08-08

- O menu flutuante dos cards do mapa usa agora os tooltips do AvantaLab, em vez
  dos balões nativos do navegador.

## 1.7.2.26 - 2026-08-08

- O tooltip de participantes agora é exibido também nos avatares dos cards do
  mapa e do kanban, além da página inicial.

## 1.7.2.25 - 2026-08-08

- Os avatares de participantes nos cards de projeto agora exibem o nome completo
  com o tooltip padrão do AvantaLab ao passar o mouse.

## 1.7.2.24 - 2026-08-08

- A seleção de responsáveis nos detalhes do card agora usa o mesmo padrão
  compacto de participantes, com checkbox, avatar e nome bem alinhados.

## 1.7.2.23 - 2026-08-08

- A edição de projeto também permite cadastrar um participante e já selecioná-lo
  no próprio projeto.

## 1.7.2.22 - 2026-08-08

- A página inicial dos Projetos passa a ter acesso próprio para cadastrar e
  gerenciar participantes, sem precisar abrir a criação de um projeto.

## 1.7.2.21 - 2026-08-08

- O mapa do AvantaProjetos agora permite arrastar cards também para cima da
  origem, sem limitar a organização vertical do projeto.

## 1.7.2.20 - 2026-08-08

- As cores pré-definidas configuradas no mapa agora permanecem visíveis nas
  bolinhas após concluir o ajuste, preservando também sua aplicação ao card.

## 1.7.2.19 - 2026-08-08

- A paleta do mapa agora reúne cores pré-definidas e cor livre em uma área
  isolada, com bolinhas centralizadas abaixo do cabeçalho.

## 1.7.2.18 - 2026-08-08

- O mapa passa a oferecer cinco cores pré-definidas configuráveis, aplicáveis ao
  card selecionado, além da escolha livre já existente.

## 1.7.2.17 - 2026-08-07

- Cards do mapa passaram a exibir uma linha de descrição quando ela estiver
  preenchida, com conexões e enquadramento ajustados à nova altura.

## 1.7.2.16 - 2026-08-07

- O mapa permite arrastar cards também para a esquerda da origem, mantendo o
  limite apenas no topo da área de trabalho.

## 1.7.2.15 - 2026-08-07

- Na etapa de escolha do sucessor, a ação final de remoção passa a se chamar
  apenas **Excluir**.

## 1.7.2.14 - 2026-08-07

- O campo **Card sucessor** passou a ter superfície, borda e foco visíveis para
  ficar claramente identificado como seletor.

## 1.7.2.13 - 2026-08-07

- Botões destrutivos do AvantaProjetos mantêm texto branco sobre o fundo vermelho
  também no modo claro.

## 1.7.2.12 - 2026-08-07

- O diálogo de exclusão de nós conectados foi reorganizado: cancelar, excluir
  somente o nó ou excluir os conectados ficam lado a lado; a escolha do
  sucessor aparece apenas ao preservar a sequência.

## 1.7.2.11 - 2026-08-07

- A exclusão de um nó do mapa preserva seus dependentes. Quando há mais de um
  card seguinte, é possível escolher qual assume a posição do nó removido.

## 1.7.2.10 - 2026-08-07

- As linhas de conexão do mapa agora acompanham o arraste dos cards de forma
  imediata, sem a transição que criava atraso visual.

## 1.7.2.09 - 2026-08-07

- Conexões criadas por **Relacionar** agora exibem **Remover relação** ao serem
  selecionadas no mapa. A ação mantém os dois cards e pode ser desfeita.

## 1.7.2.08 - 2026-08-07

- O retorno do AvantaProjetos passa a usar o rótulo **‹ Início**, preservando o
  acesso direto à Gestão do perfil ativo.

## 1.7.2.07 - 2026-08-07

- O seletor de modo escuro retorna à posição lateral no card de Ajustes, agora
  compacto em **ON/OFF** e com a chave vermelha ou verde conforme o estado.

## 1.7.2.06 - 2026-08-07

- O seletor de modo escuro do AvantaProjetos ocupa uma faixa própria no card
  de Ajustes, preservando texto e controle dentro do limite visual nos dois
  estados.

## 1.7.2.05 - 2026-08-07

- O seletor de modo escuro do AvantaProjetos aplica a aparência imediatamente,
  mantém largura fixa durante a gravação e restaura o estado anterior caso o
  servidor não confirme a alteração.

## 1.7.2.04 - 2026-08-07

- AvantaProjetos passa a usar a cena oficial de carregamento do AvantaLab e
  disponibiliza **Ajustes** para Gestor Master e Administrador alterarem o
  modo claro/escuro salvo no perfil, aplicado também ao AvantaLab.
- O retorno do módulo passa a se chamar **Sair** e usar a cor institucional.
  O foco do mapa agora elimina todas as áreas inativas, preservando navegação
  em todo o viewport e o controle flutuante de retorno.

## 1.7.2.03 - 2026-08-07

- AvantaProjetos passa a respeitar exclusivamente o modo visual salvo em
  **Menu > Visual** do perfil, sem acompanhar o tema automático do computador.
  O modo escuro aplica contraste institucional a textos, superfícies, campos e
  à marca oficial.
- No mapa de um projeto, **Ocultar cabeçalho** libera a tela para a visualização
  e mantém **Exibir cabeçalho** flutuante no canto superior direito.

## 1.7.2.02 - 2026-08-07

- O catálogo de módulos passa a ser carregado por uma rota protegida do servidor,
  com validação do vínculo ativo de Gestor Master ou Administrador. Usuários
  adicionados ao perfil recebem o mesmo catálogo do gestor original.
- Falhas de consulta deixam de aparecer como catálogo vazio: a tela informa o
  problema e oferece uma nova tentativa sem alterar instalações ou assinaturas.

## 1.7.2.01 - 2026-08-07

- O cabeçalho principal do AvantaProjetos passa a reunir título, descrição e
  ações na mesma linha. **Novo Projeto** usa o azul médio oficial e os dois
  botões têm face visual mais compacta, preservando a área segura de clique.

## 1.7.2 - 2026-08-07

- Conteúdo para a equipe: pastas principais da Divulgação agora podem usar como
  capa qualquer imagem publicada em suas subpastas. O gestor escolhe, troca ou
  remove a capa pela própria pasta; vídeos e PDFs não entram nessa seleção.
- AvantaVendas: a sala reserva o espaço dos botões com um loading local e revela
  todos eles de uma vez somente após as imagens estarem prontas, tanto na
  abertura quanto no retorno interno à sala.

## 1.7.1.04 - 2026-08-07

- AvantaVendas/iPhone: a pré-visualização deixa de depender do enquadramento do
  leitor nativo do Safari. As páginas do PDF agora são renderizadas dentro da
  área disponível, centralizadas nos dois eixos e carregadas sob demanda para
  preservar o desempenho; links do documento continuam acessíveis.

## 1.7.1.03 - 2026-08-07

- AvantaVendas: a pré-visualização de PDF agora enquadra a página inteira e a
  centraliza nos eixos horizontal e vertical. Imagens e vídeos permanecem com
  o comportamento anterior.
- AvantaVendas: materiais de divulgação e comprovantes passam a compartilhar
  somente o arquivo, sem mensagem ou título automáticos. O usuário pode
  escrever o texto que desejar no aplicativo de destino.

## 1.7.1.02 - 2026-08-07

- O topo do AvantaProjetos agora usa o logo oficial do AvantaLab e apresenta o
  nome do perfil abaixo da marca, com hierarquia e espaçamento mais claros.

## 1.7.1.01 - 2026-08-07

- Perfis empresariais com cortesia vigente agora liberam a instalação e a
  remoção de todos os módulos sem cobrança, mantendo a seleção explícita pelo
  Gestor Master ou Administrador.

## 1.7.1 - 2026-08-07

- AvantaProjetos tornou-se um módulo oficial exclusivo da Web, aberto em tela
  total na mesma guia e com retorno à Gestão preservando o perfil ativo.
- Projetos e participantes agora são persistidos por empresa no Supabase. Gestor,
  Administrador e Operador Completo editam; Operador Simples somente visualiza.
- O catálogo passa a apresentar módulos por R$ 14,90/mês no Business e como
  inclusos no Business Pro. Somente Gestor ou Administrador instala e remove.
- Cancelar um módulo avulso interrompe a renovação, mas mantém o acesso até o fim
  do período pago. Remoção e expiração preservam os dados.
- Criado o registro central e o contrato PADRÃO AVANTA 1.6.0 para módulos
  integrados ou em página total, com plano, superfície, hierarquia e retenção.

## 1.7.0.28.12 - 2026-08-07

- Gestão Mobile: **Excluir este perfil** substitui a antiga exclusão de conta.
  O login permanece ativo; após confirmar, o perfil e seus dados ficam
  indisponíveis, porém preservados por 30 dias para restauração com o mesmo
  login. Sem restauração, a rotina diária cancela assinaturas externas do
  perfil e remove os dados ao fim do prazo. Perfis com outros usuários ativos
  continuam protegidos contra exclusão por esta tela.
- Servidor: corrigido o gatilho de proteção do histórico de ponto que podia
  interromper uma exclusão antes da validação correta do registro.

## 1.7.0.28.11 - 2026-08-07

- AvantaVendas Mobile: as ondas animadas da sala de botões preservam o movimento
  e a composição visual, mas agora deslocam camadas já renderizadas. O fundo não
  recalcula gradientes e geometria a cada quadro, reduzindo travamentos em
  celulares de menor desempenho sem alterar os botões.

## 1.7.0.28.10 - 2026-08-06

- Gestão Mobile/iOS: quando o banco confirma que não existem avisos pendentes,
  o app usa também o plugin oficial de push já instalado para remover as
  notificações entregues e zerar o selo do ícone. A sincronização é repetida
  após o registro nativo, sem exigir nova build do Capacitor.

## 1.7.0.28.09 - 2026-08-06

- Gestão Mobile/iOS: o selo do ícone agora usa a contagem real de avisos
  disponíveis para cada usuário. A Gestão reconcilia o selo ao iniciar e ao
  retomar; avisos fechados só alteram a contagem após a confirmação no banco.
  O envio APNs deixa de forçar o número 1.

## 1.7.0.28.08 - 2026-08-06

- AvantaVendas: o comprovante de pedido compartilhado passa a usar a mesma
  composição institucional do comprovante de pagamento, preservando produtos,
  quantidades, bonificações, descontos, valores, saldos e compartilhamento.

## 1.7.0.28.07 - 2026-08-06

- AvantaVendas: o comprovante de pagamento compartilhado foi redesenhado com
  cabeçalho institucional sólido, cards financeiros com hierarquia visual clara
  e fundo oficial otimizado e reutilizável. Cálculos, dados, datas, valores,
  exportação e compartilhamento permanecem inalterados.

## 1.7.0.28.06 - 2026-08-06

- Gestão Mobile/PWA: **Ver controle de ponto** passa a listar todos os
  funcionários ativos, inclusive quem está em dia ou sem jornada prevista hoje.
  O resumo do card continua destacando somente atrasos, faltas e registros
  incompletos.

## 1.7.0.28.05 - 2026-08-06

- Gestão Web: removido o aviso redundante **Aporte atualizado** após salvar a
  edição de um lançamento da Caixinha. Mensagens de erro continuam visíveis.

## 1.7.0.28.04 - 2026-08-06

- Gestão Web: a edição em linha dos aportes da Caixinha/Reserva financeira passa
  a usar a mesma composição compacta dos lançamentos de despesas, com colunas
  estáveis, campos sem sobreposição e ações agrupadas e sempre visíveis.

## 1.7.0.28.03 - 2026-08-06

- Gestão Web: clicar em um aporte da Caixinha/Reserva financeira transforma a
  própria linha diretamente em edição, com ações de salvar, cancelar e excluir.
- Gestão Mobile/PWA: tocar em um aporte abre o mesmo card de ações utilizado
  pelos lançamentos de receitas e despesas. A edição atualiza o aporte e sua
  despesa vinculada; a exclusão confirmada remove ambos.

## 1.7.0.28.02 - 2026-08-06

- Gestão Web: os lançamentos de aporte da Caixinha/Reserva financeira passam a
  abrir as ações **Editar** e **Excluir** ao serem selecionados. A exclusão pede
  confirmação e remove tanto o movimento da Caixinha quanto a despesa vinculada,
  respeitando a permissão de exclusão de lançamentos.

## 1.7.0.28.01 - 2026-08-06

- Ava no AvantaVendas PWA: o foco passa a ocorrer somente quando o toque no
  campo termina, evitando que o movimento do teclado durante o próprio gesto
  faça o campo perder o foco. Os eventos do campo também deixam de alcançar os
  ouvintes globais do AvantaVendas. A mudança é restrita ao ambiente Vendas; a
  Ava da Gestão preserva o comportamento anterior.

## 1.7.0.28 - 2026-08-06

- Ava Mobile e AvantaVendas: o recuo do teclado passa a usar uma referência
  estável capturada antes do foco. Eventos intermediários do WebKit não zeram
  mais o recuo nem devolvem o campo para baixo; shell, cabeçalho e CSS do chat
  permanecem inalterados. A lógica recebeu testes próprios para iOS,
  Android/VirtualKeyboard, navegador, fechamento e rotação.

## 1.7.0.26 - 2026-08-05

- Ava no AvantaVendas: perguntas sobre resultados passam a receber primeiro os
  valores disponíveis no contexto, com período e métrica. A orientação de tela
  fica reservada a perguntas sobre onde ou como consultar.

## 1.7.0.25 - 2026-08-05

- AvantaVendas Mobile: cada lançamento de pedido ou pagamento agora leva uma
  cópia da pesquisa de Clientes que o originou e a restaura ao fechar o
  comprovante. Assim, o retorno não depende do estado momentâneo do card.

## 1.7.0.24 - 2026-08-05

- AvantaVendas Mobile: a busca de Clientes permanece aplicada após criar,
  editar ou excluir pedido e pagamento. O termo só é limpo ao tocar no campo
  para iniciar uma nova busca.

## 1.7.0.23 - 2026-08-05

- AvantaVendas Mobile: corrigido o modal de novo pedido ou pagamento no iPhone.
  A transição do teclado não reduz mais o fundo escuro nem antecipa o botão de
  finalizar; apenas o card é deslocado para manter o campo ativo visível.

## 1.7.0.22 - 2026-08-05

- Controle de Ponto: ao desmarcar um funcionário que já utiliza reconhecimento
  facial, a tela exibe **Salvar alterações** e aplica a remoção sem encaminhar
  ao pagamento. Configurações anteriores ao fluxo de cobrança também podem ser
  reduzidas ou totalmente desativadas sem criar uma nova contratação.

## 1.7.0.21 - 2026-08-05

- Gestão Mobile no Chrome para iPhone: o Menu recebe uma rolagem de toque
  própria e restrita ao `CriOS`, permitindo alcançar todos os botões mesmo com
  a barra inferior do navegador ativa. O shell e a navegação fixa permanecem
  inalterados; Safari, Android e aplicativos Capacitor não usam esse fallback.

## 1.7.0.20 - 2026-08-05

- Gestão Mobile: revertidas integralmente as tentativas de adaptação do Menu e
  da navegação inferior ao Chrome no iPhone, retornando o shell, a rolagem e a
  inicialização ao estado estável anterior. O suporte a PDFs e as demais
  entregas posteriores foram preservados.

## 1.7.0.19 - 2026-08-05

- Gestão Mobile no navegador: restaurado o posicionamento fixo da navegação
  inferior após a regressão que deixou a barra flutuando sobre os cards. A
  medição visual ineficaz do rodapé continua removida.

## 1.7.0.18 - 2026-08-05

- Gestão Mobile no navegador: Menu e navegação inferior passam a compartilhar
  o mesmo shell, evitando o defeito de posicionamento fixo do WebKit no iOS 26.
  A medição visual ineficaz e os reforços redundantes das tentativas anteriores
  foram removidos. Apps Capacitor mantêm a navegação fixa existente.

## 1.7.0.17 - 2026-08-05

- Gestão Mobile: reforçada a geometria da lista interna do Menu. Ela possui
  altura limitada e rolagem nativa explícita, garantindo acesso aos botões no
  fim da lista sem deslocar a navegação inferior.

## 1.7.0.16 - 2026-08-05

- Gestão Mobile no navegador: o Menu agora mede a altura real da barra inferior
  e reserva esse espaço. Quando necessário, a lista de ações rola até o último
  botão, sem ficar encoberta pela navegação fixa.

## 1.7.0.15 - 2026-08-05

- Gestão Mobile: corrigido erro de inicialização no navegador que poderia manter
  a tela **Preparando acesso** em 20% após o carregamento do aplicativo.

## 1.7.0.14 - 2026-08-05

- Gestão Mobile no navegador: o menu agora usa a altura real da área visível do
  Chrome. O cabeçalho fica íntegro e somente a lista de ações rola, inclusive
  quando a barra inferior do navegador está aberta.

## 1.7.0.13 - 2026-08-05

- Conteúdo para a equipe: corrigida a geração da capa da primeira página de
  PDFs no worker do Google Cloud. PDFs que ficaram sem capa são reenfileirados
  para processamento.

## 1.7.0.12 - 2026-08-05

- Conteúdo para a equipe: corrigido o retorno do seletor Arquivos no iPhone. A
  escolha de PDF não fecha o conteúdo e os próximos envios continuam usando o
  seletor em português.

## 1.7.0.11 - 2026-08-05

- Conteúdo para a equipe: Divulgação passa a aceitar PDFs. O worker do Google
  Cloud cria a capa da primeira página, o Vendas Mobile exibe o documento no
  visualizador e o compartilha como arquivo PDF. A escolha de material agora é
  apresentada em português antes de acionar fotos, câmera ou arquivos do aparelho.

## 1.7.0.06 - 2026-08-05

- Acesso e criação de perfil: Gestão Mobile e Gestão Web agora recuperam o
  formulário em falhas inesperadas de login, cadastro, login social ou
  preparação do perfil financeiro. Nenhuma dessas etapas permanece bloqueada
  em **Entrando...**, **Criando...** ou **Enviando...**.

## 1.7.0.05 - 2026-08-05

- Gestão Mobile: a criação de perfil agora também trata falhas nas etapas finais
  de preparação. O botão deixa de ficar em **Criando...** e o formulário volta
  com uma orientação recuperável caso categorias, configurações ou o
  carregamento inicial não possam ser concluídos.

## 1.7.0.04 - 2026-08-05

- Gestão Mobile: a criação do primeiro perfil Pessoa ou Empresa passou a usar a
  rota segura do servidor, já adotada na Gestão Web. O botão deixa de permanecer
  em **Criando...** quando a antiga RPC não está disponível e informa falhas de
  sessão ou conexão de forma recuperável.

## 1.7.0.03 - 2026-08-05

- Controle de Ponto: a barra inferior com **Sair**, **Ajustes** e **Ajuda** passa
  a ocupar a base da tela quando houver espaço. Em alturas menores, permanece no
  fluxo e conserva um respiro mínimo abaixo do card anterior, sem sobreposição.

## 1.7.0.02 - 2026-08-05

- Controle de Ponto: o fundo institucional também foi aplicado à tela principal
  do funcionário, atrás do botão **Bater ponto**, com as ondas ancoradas na base.
  A versão do PWA foi renovada para impedir a reutilização do visual anterior.

## 1.7.0.01 - 2026-08-05

- Controle de Ponto: o fundo institucional da validação facial passou para uma
  camada visual própria, abaixo de todo o fluxo, com as ondas preservadas na
  base e recorte restrito ao topo. O ajuste evita que a câmera e os estados da
  experiência encubram o fundo da tela.

## 1.7.0 - 2026-08-05

- Controle de Ponto: implantado o fluxo separado de contratação do
  reconhecimento facial por R$ 14,90 mensais por funcionário, com resumo antes
  da cobrança e liberação somente após a confirmação da Asaas.
- Inclusões durante o ciclo geram cobrança proporcional; remoções desativam o
  funcionário imediatamente e reduzem somente a próxima mensalidade, sem
  devolução ou crédito pelo período corrente.
- O cancelamento interrompe a renovação e permite manter o facial até o fim do
  período pago ou desativá-lo de imediato. Em atraso, aplica-se carência de três
  dias; o registro comum de ponto nunca é bloqueado por pendência financeira do
  adicional facial.
- A experiência de validação facial recebeu o fundo institucional específico,
  ancorado na base para preservar integralmente as ondas inferiores em qualquer
  proporção de tela; quando necessário, o recorte ocorre somente no topo.

## 1.6.2.02 - 2026-08-05

- Central de Consultas: três análises pagas foram preparadas para a Direct Data
  por R$ 11,99, R$ 20,99 e R$ 31,99, com estorno em falhas do fornecedor.
- Meus créditos: carteira genérica por perfil, recarga avulsa pela Asaas,
  extrato e confirmação idempotente; módulos e facial continuam separados.

## 1.6.2.01 - 2026-08-04

- Reconhecimento Facial: somente a imagem usada no cadastro facial permanece
  armazenada no bucket privado. Nas marcações de ponto, a captura é comparada
  em memória com a referência e descartada após o processamento; o histórico
  conserva apenas resultado, confiança, similaridade, motivo e horários.
- Controle de Ponto: o aceite administrativo explica em linguagem direta que
  os funcionários devem ser informados e que a empresa precisa oferecer um
  procedimento alternativo quando a validação facial não puder ser concluída.

## 1.6.2 - 2026-08-04

- Controle de Ponto: a validação facial ganhou uma experiência visual própria e
  integrada ao novo painel, com preparação orientada, captura em oval, feedback
  simples, progresso discreto, mensagens humanas de recuperação e confirmação
  antes do registro do ponto.
- Reconhecimento Facial: sessão AWS Rekognition, prova de vida, comparação de
  identidade, habilitação individual, APIs e regras de marcação foram
  preservadas. A câmera inicia somente após **Iniciar verificação** e o registro
  continua apenas quando o funcionário confirma a tela de sucesso.

## 1.6.1.157 - 2026-08-04

- Controle de Ponto: o halo do botão central foi reduzido para preservar o
  espaço visual dos cards laterais.
- Controle de Ponto: **Ajuda** agora abre um guia rápido dentro do próprio
  módulo, com quatro passos objetivos e fechamento pelo X, sem redirecionar o
  funcionário para outra página.

## 1.6.1.156 - 2026-08-04

- Controle de Ponto: a tela principal foi compactada para permanecer inteira na
  altura dos celulares, o botão central foi reduzido para não avançar sobre os
  cards laterais e o atalho duplicado de ajustes foi removido do cabeçalho.
- Controle de Ponto: no login, o card de instalação agora ocupa somente a
  altura do texto e do botão **Instalar**.

## 1.6.1.155 - 2026-08-04

- Controle de Ponto: a tela principal do funcionário foi redesenhada como um
  painel premium e responsivo, com **Bater ponto** como ação central, fluxo do
  dia ao redor, localização compacta, facial em formato de badge, atalhos de
  registros e barra inferior. GPS, reconhecimento facial, confirmações,
  comprovantes e regras de marcação permanecem inalterados.

## 1.6.1.154 - 2026-08-04

- Gestão Mobile: o cabeçalho de **Novo lançamento** preserva o título completo;
  a pílula de mês fica centralizada apenas no espaço entre o título e o X.

## 1.6.1.153 - 2026-08-04

- Gestão Mobile: a pílula de mês do card **Novo lançamento** foi centralizada
  entre o título e o botão de fechar.

## 1.6.1.152 - 2026-08-04

- Gestão Mobile: o card **Novo lançamento** agora abre no mês vigente e traz
  setas para selecionar o mês e o ano do lançamento. A escolha vale somente
  para o novo registro, inclusive receitas e parcelamentos, sem mudar o mês
  que está aberto no painel ao fundo.

## 1.6.1.151 - 2026-08-04

- AvantaVendas: o card de novo pedido agora aguarda o teclado concluir sua
  abertura antes de calcular o deslocamento, evitando o balanço durante o foco
  do campo de desconto.

## 1.6.1.150 - 2026-08-04

- Controle de Ponto: durante a verificação facial, **Ponto seguro** ocupa o
  platô do AvantaCard, o status fica no cabeçalho da leitura e o botão
  **Cancelar** permanece fixo e funcional em toda a captura.

## 1.6.1.149 - 2026-08-04

- AvantaVendas: ao abrir o teclado no card de novo pedido, o card inteiro agora
  sobe o necessário para manter o campo focado visível, inclusive o desconto.
  Ao fechar o teclado, o card retorna à posição original sem alterar o pedido.

## 1.6.1.148 - 2026-08-04

- Controle de Ponto: o platô da captura facial foi ampliado no mobile e a
  etiqueta **Ponto seguro** permanece em uma única linha.

## 1.6.1.147 - 2026-08-04

- Avanta Admin: o card de consumo AWS foi simplificado para mostrar somente
  custos, créditos e indicadores faciais úteis. Métricas técnicas do CloudWatch
  e franquias específicas do Free Tier continuam coletadas internamente, mas
  não são mais exibidas no `/admin`.

## 1.6.1.146 - 2026-08-04

- Avanta Admin: o painel **Consumo** passa a acompanhar a AWS usada pelo
  reconhecimento facial. O card reúne custos oficiais, créditos e Free Tier
  quando o IAM permitir, métricas do Rekognition no CloudWatch e indicadores
  próprios do AvantaLab, como verificações, médias, aprovações, falhas e
  projeção técnica. As credenciais continuam restritas ao servidor e cada
  fonte falha de forma independente, sem interromper os demais serviços.

## 1.6.1.145 - 2026-08-04

- Gestão Web e Mobile: a conclusão do tutorial passa a acompanhar a conta e a
  organização dos cards só permanece na tela após confirmação do servidor.
  Reinstalar o aplicativo não restaura essas preferências.

## 1.6.1.144 - 2026-08-04

- Controle de Ponto: limite da prova de vida facial ajustado de 90% para 70%;
  a comparação de identidade com o cadastro permanece em 90%.

## 1.6.1.143 - 2026-08-04

- Controle de Ponto: a experiência de cadastro e confirmação facial recebeu
  interface AvantaLab, com cabeçalho institucional, etapas claras, orientação
  de privacidade e estados de recuperação mais legíveis.

## 1.6.1.142 - 2026-08-04

- Controle de Ponto: corrigido o cache do PWA e incluída uma proteção de
  compatibilidade. Mesmo em um aplicativo antigo, funcionário sem facial ativo
  segue diretamente para a marcação comum, sem aviso ou abertura de câmera.

## 1.6.1.141 - 2026-08-04

- Controle de Ponto: o reconhecimento facial passa a ser exigido exclusivamente
  para o funcionário que estiver individualmente ativo no adicional. Sem essa
  habilitação, a marcação segue o fluxo comum, sem botão ou bloqueio facial.

## 1.6.1.140 - 2026-08-04

- Controle de Ponto: reforçadas as orientações de enquadramento facial em
  português (distância, centralização, luz e imobilidade) antes e durante a
  prova de vida, mantendo o mínimo de 90% de confiança.

## 1.6.1.139 - 2026-08-04

- Controle de Ponto: ao terminar a captura facial, a câmera é encerrada antes
  da confirmação no servidor. A orientação vertical não é mais exigida enquanto
  o resultado está sendo verificado.

## 1.6.1.138 - 2026-08-04

- Controle de Ponto: reconhecimento facial traduzido para português, com tema
  AvantaLab, orientação vertical explicada e conferência final responsiva
  (consulta a cada meio segundo, por até cinco segundos) antes de concluir ou
  reprovar a marcação.

## 1.6.1.137 - 2026-08-04

- Controle de Ponto: incluída a câmera guiada de prova de vida e reconhecimento
  facial no fluxo do funcionário, com cadastro/atualização facial separado da
  marcação e confirmação antes de registrar o ponto.

## 1.6.1.136 - 2026-08-04

- Controle de Ponto: infraestrutura AWS do reconhecimento facial conectada ao
  servidor com prova de vida, comparação com o cadastro autorizado e cofre S3
  dedicado. As chaves permanecem somente no ambiente de produção; as evidências
  têm retenção automática de cinco anos. A interface de captura continua
  bloqueada até a etapa de câmera guiada ser entregue.

## 1.6.1.135 - 2026-08-03

- Controle de Ponto: iniciada a preparação do adicional de reconhecimento
  facial por funcionário, a **R$ 14,90/mês** e com referência de até 120
  verificações mensais. Gestores selecionam os funcionários elegíveis e
  registram as condições de privacidade na aba Facial; a captura permanece em
  preparação até a infraestrutura AWS, retenção e revisão jurídica serem
  configuradas. Nenhuma imagem, vídeo ou template biométrico é guardado no
  banco AvantaLab nesta etapa.

## 1.6.1.134 - 2026-08-03

- Gestão Web e Mobile: despesas programadas agora mudam de **Previsto** para
  **A confirmar** na data e para **Pendente** depois do vencimento. O aviso de
  confirmação permanece disponível até o lançamento ser confirmado, editado ou
  excluído. Despesas pendentes deixam de compor totais, gráficos e resultado
  realizado, permanecendo somente na projeção até a confirmação manual.

## 1.6.1.133 - 2026-08-03

- AvantaVendas: os cards da sala de botões preservam a proporção quadrada em
  telas estreitas, incluindo Android, iPhone e PWA. A correção é exclusivamente
  visual e não altera ações, navegação ou dados do sistema.

## 1.6.1.132 - 2026-08-03

- AvantaVendas Android: criado o projeto Capacitor independente com o pacote
  `br.com.avantalab.vendas`, retorno seguro do OAuth por deep link e permissões
  nativas para câmera, microfone, localização e notificações. As pontes de
  câmera, fotos, localização e troca para a Gestão passam a aceitar Android sem
  alterar o fluxo Web/PWA nem o projeto Android da Gestão.

## 1.6.1.131 - 2026-08-03

- Avanta Admin: **Consumo das plataformas** passa a acompanhar saldo, gasto do
  mês, tentativas de verificação SMS, confirmações e taxa de conversão da
  Twilio. As credenciais permanecem somente no servidor e falhas da integração
  não impedem a consulta dos demais serviços. Quando o envio usa uma subconta,
  credenciais opcionais da conta principal permitem consultar também o saldo.

## 1.6.1.130 - 2026-08-03

- Troca de aplicativos no iOS: **Ir para Gestão** e **Ir para Vendas** passam
  somente a abrir o aplicativo de destino, sem selecionar ou transferir perfil,
  contexto ou autenticação. O aplicativo de origem permanece na sala atual ao
  retornar. O fluxo Web/PWA continua inalterado, inclusive com seleção de perfil
  quando aplicável.

## 1.6.1.129 - 2026-08-03

- Gestão Mobile no iOS: o deep link usado pelo AvantaVendas para abrir a
  Gestão deixa de ser interpretado como retorno de Google ou Apple. A troca
  entre os aplicativos preserva a sessão já existente no Gestão sem exibir
  falso erro de autenticação social. No sentido inverso, o botão do Gestão
  passa a abrir o aplicativo AvantaVendas instalado, sem carregar o PWA dentro
  do Gestão.

## 1.6.1.128 - 2026-08-03

- AvantaVendas: restaurada a formatação original dos botões do card **Novo
  lançamento**. Somente a ordem e as cores permanecem ajustadas: Pagamento à
  esquerda em verde e Pedido à direita em azul.

## 1.6.1.127 - 2026-08-03

- AvantaVendas: o cadastro do cliente passa a identificar **Data de
  Aniversário** com um ícone de bolo. No card aberto pelo botão `+`, **Lançar
  pagamento** fica à esquerda em verde e **Lançar pedido** à direita em azul,
  seguindo a mesma ordem e as mesmas cores do card do cliente.

## 1.6.1.126 - 2026-08-03

- AvantaVendas: o cabeçalho passa a exibir um sininho com a quantidade de
  itens da agenda do dia, incluindo aniversários. Ao tocar, a agenda abre
  diretamente no dia atual; o atalho específico de aniversários permanece.

## 1.6.1.125 - 2026-08-03

- iOS (Capacitor): a Gestão Mobile passa a solicitar notificações nativas,
  receber o token APNs e refletir a quantidade de avisos pendentes no ícone do
  aplicativo. O envio preserva o Web Push do PWA e passa a aceitar APNs.

## 1.6.1.124 - 2026-08-03

- Gestão Mobile: corrigida a altura interna do painel de avisos para restaurar
  a rolagem dos cards no iPhone, mantendo quantidade e **Fechar todas** fixos.

## 1.6.1.123 - 2026-08-03

- Gestão Mobile: o painel de avisos passa a respeitar a área segura superior
  do iPhone. A faixa com a quantidade de notificações e **Fechar todas** fica
  fixa, enquanto somente a lista de avisos acompanha a rolagem.

## 1.6.1.122 - 2026-08-03

- Gestão Web e Mobile: avisos do sininho passam a identificar o perfil
  financeiro de origem. Abrir ou fechar o painel não elimina mais os avisos;
  o sininho e o contador permanecem até o usuário fechar cada aviso ou usar
  **Fechar todos**.

## 1.6.1.121 - 2026-08-02

- AvantaVendas: o agendamento iniciado pelo card do cliente apresenta a data
  em `dd/mm/aa`, mantém o seletor nativo ao tocar no campo e oferece botões
  `<` e `>` para retroceder ou avançar um dia. Campo e controles passam a
  respeitar a mesma largura dos demais itens do formulário.

## 1.6.1.120 - 2026-08-01

- Gestão Web: a landing deixa de aparecer durante o retorno do login com
  Google ou Apple e quando já existe uma sessão ativa. Retorno, validação da
  sessão e carregamento do perfil usam uma única cena estável; erros e tempo
  excedido devolvem o login operável com mensagem.

## 1.6.1.119 - 2026-08-01

- Gestão Mobile: após autenticar, o acesso mantém uma única tela estável de
  preparação até o painel estar pronto. A validação opcional do Vendas e as
  sincronizações complementares passam para segundo plano, reduzindo
  reconstruções e flashes sem remover verificações de segurança.

## 1.6.1.118 - 2026-08-01

- Gestão Web e Mobile: a data de **Lançar aporte** passa a ficar centralizada
  no próprio seletor.

## 1.6.1.117 - 2026-08-01

- Gestão Web e Mobile: o card da Caixinha pode ser recolhido após **Saldo** e
  **Aportes no mês**; o seletor de data mostra `dd/mm/aa` e a área de novo
  aporte passou a ter título próprio. No Web, a edição continua na própria
  linha, agora sem abrir um bloco separado.

## 1.6.1.116 - 2026-08-01

- Gestão Web: datas dos aportes usam `dd/mm/aa`; tocar em um aporte abre a
  edição na própria linha e mantém a despesa vinculada sincronizada.

## 1.6.1.115 - 2026-08-01

- Gestão Web e Mobile: o aporte inicial da Caixinha fica recolhido e pode ser
  adicionado, alterado ou excluído. A lista de aportes abre por **Ver
  lançamentos** e exibe a data de cada item.

## 1.6.1.114 - 2026-08-01

- Gestão Web e Mobile: um novo aporte na Caixinha/Reserva financeira inicia com
  a data atual, que pode ser alterada. A saída correspondente usa a data
  escolhida, sem depender do mês aberto no dashboard.

## 1.6.1.113 - 2026-08-01

- Cadastro de perfil Empresa: a escolha passa a ser explícita entre **Usar 7
  dias grátis** do Business Pro ou **Assinar agora**. Assinar agora abre os
  planos após criar o perfil, sem gravar uma assinatura expirada.
- Perfis criados pelo fluxo anterior, sem cobrança e marcados como expirados,
  podem iniciar uma única vez o teste do Business Pro no paywall.

## 1.6.1.112 - 2026-08-01

- Admin: a busca de Perfis passa a exibir **×** para limpar o termo e voltar à
  lista sem filtro.
- Pontos de restauração: Administrador e Operador Completo podem criar e
  consultar pontos; restaurar e excluir permanecem protegidos para Gestor Master.

## 1.6.1.111 - 2026-08-01

- Gestão Web e Mobile: **Pontos de restauração** criam snapshots estruturados
  do perfil para Gestor Master, com criação manual, retenção e restauração
  protegida por confirmação. O Excel continua sendo a exportação baixável.

## 1.6.1.110 - 2026-08-01

- Gestão Web e Mobile: gestores e administradores recebem no sininho avisos de
  faturas recorrentes a vencer (5, 2 e 0 dias) e em atraso (1, 3 e 7 dias).
  O aviso abre a Assinatura; no Mobile, também é enviado como push quando o
  aparelho estiver com notificações ativadas.

## 1.6.1.109 - 2026-08-01

- AvantaVendas: em Clientes, uma busca permanece ao clicar fora; um novo clique
  no campo limpa somente seu texto, sem recarregar a página.

## 1.6.1.108 - 2026-07-31

- iOS: o modal de assinatura informa quando os planos da App Store ainda estão
  sendo carregados, mantendo as ações indisponíveis até a consulta terminar.

## 1.6.1.107.62.03 - 2026-07-31

- Gestão Web: a marca AvantaLab nas telas de login e cadastro passa a ficar
  centralizada verticalmente na viewport, enquanto o card preserva sua posição.

## 1.6.1.107.62.02 - 2026-07-31

- Gestão Web: o card de seleção de perfil após o login volta a ficar
  centralizado sobre o fundo institucional.

## 1.6.1.107.62.01 - 2026-07-31

- Gestão Web: login e cadastro passam a compartilhar a mesma posição do card
  na cena de acesso; a marca AvantaLab continua centralizada na viewport.

## 1.6.1.107.62 - 2026-07-31

- iOS: adicionada a descrição de uso do microfone para as mensagens de voz da
  Ava, evitando encerramento do aplicativo ao solicitar a permissão nativa.
- iOS: removido o registro manual redundante do RevenueCat; o Capacitor mantém
  o `PurchasesPlugin` pela lista gerada no sync e o Archive volta a compilar
  com a otimização Release habilitada.
- Privacidade: o uso voluntário de áudio, a transcrição e o descarte pelo
  AvantaLab após o processamento passam a ser informados explicitamente.
- O número interno do build iOS avança para 5.

## 1.6.1.107.61 - 2026-07-31

- Gestão Mobile: o card de identificação do menu volta às dimensões originais e
  remove a borda translúcida e a sombra lateral que criavam linhas clara e
  escura nas extremidades.

## 1.6.1.107.60 - 2026-07-31

- Gestão Mobile: o card de identificação no topo do menu recebe um recuo
  lateral mínimo e simétrico, preservando bordas, raios e sombra nos limites
  do painel.

## 1.6.1.107.59 - 2026-07-31

- Gestão Mobile no iOS: o painel do menu lateral começa abaixo da área segura
  superior do aparelho, sem alterar o PWA, o Android ou o restante da tela.

## 1.6.1.107.58 - 2026-07-31

- Gestão Web: após o login, a seleção de perfil passa a manter o fundo
  institucional usado nas cenas de preparação e carregamento, sem repetir o
  logotipo.

## 1.6.1.107.57 - 2026-07-31

- Cobrança: um perfil cuja cortesia foi revogada pode contratar novamente.
  A nova assinatura substitui o status histórico de cancelamento por
  aguardando pagamento e é liberada normalmente ao receber a confirmação da
  Asaas.

## 1.6.1.107.56 - 2026-07-31

- Gestão Web e Recebimentos Presenciais: as cenas completas de
  **Carregando** e **Preparando acesso** no desktop agora mantêm logotipo e
  card centralizados horizontal e verticalmente, seguindo a mesma composição
  já usada no mobile.

## 1.6.1.107.55 - 2026-07-31

- Gestão Mobile: Google e Apple mantêm o card **Preparando acesso** com
  **Cancelar e voltar ao login** mesmo quando o aplicativo foi aberto pela
  rota direta de entrada ou cadastro.
- No aplicativo nativo, cancelar a preparação também fecha o navegador seguro
  quando possível e restaura imediatamente o login para uma nova tentativa.

## 1.6.1.107.54 - 2026-07-31

- iOS: o controlador principal registra explicitamente o plugin nativo de
  compras quando a descoberta automática do Capacitor/Swift Package Manager
  não o disponibiliza, eliminando o falso aviso de plugin não implementado.
- O número interno do build iOS avança para 4, permitindo distinguir e
  reinstalar a versão corrigida no iPhone.

## 1.6.1.107.53 - 2026-07-31

- PADRÃO AVANTA: cenas mobile de acesso, recuperação, bloqueio e carregamento
  passam a usar a mesma composição de três faixas. A marca fica separada e
  centralizada no espaço entre a área segura superior e o card, sem coordenada
  fixa no topo.
- Gestão Mobile e Gestão React aplicam o padrão também nos estados especiais de
  preparação, aviso, confirmação de celular e carregamento de perfil.

## 1.6.1.107.52 - 2026-07-30

- Assinaturas pessoais: contratação direta a partir do menu, sem card
  intermediário. No iOS, os ciclos da App Store e a restauração de compras
  aparecem sem solicitar dados de cobrança. No web/PWA, o checkout Asaas
  exige apenas os dados de cobrança necessários, sem bloquear pelo cadastro
  operacional completo.

## 1.6.1.107.51 - 2026-07-30

- Controle de Ponto e Recebimentos Presenciais: a marca de acesso passa a
  ocupar a faixa superior disponível e fica centralizada entre a área segura
  e o card, sem posicionamento fixo no topo.

## 1.6.1.107.50 - 2026-07-30

- Recebimentos Presenciais: a marca de acesso deixa de ficar fixa no topo e
  passa a ocupar o centro do espaço disponível entre a área segura e o card,
  como nas demais entradas mobile do AvantaLab.

## 1.6.1.107.49 - 2026-07-30

- Controle de Ponto: a revisão do script de interface foi incrementada para
  impedir que o navegador reutilize a tela antiga sem a marca separada após o
  carregador inicial.

## 1.6.1.107.48 - 2026-07-30

- Controle de Ponto: login e **Preparando acesso** agora exibem a marca
  AvantaLab separadamente sobre o fundo oficial sem-logo, inclusive após o
  carregador inicial ser substituído pelo script do Ponto.

## 1.6.1.107.47 - 2026-07-30

- Cenas de acesso, carregamento e recuperação agora usam exclusivamente os
  fundos oficiais sem logotipo incorporado. A marca AvantaLab é exibida como
  elemento independente nas cenas de preparação, preservando posicionamento
  responsivo e áreas seguras no mobile.
- Gestão Mobile, Vendas, Ponto, Recebimentos, autenticação Web e Paywall deixam
  de referenciar os arquivos de fundo antigos. Os service workers foram
  versionados para substituir os recursos em cache na próxima abertura.

## 1.6.1.107.46 - 2026-07-30

- Cancelar a confirmação de Google ou Apple no aplicativo nativo volta ao login
  limpo. Mensagens técnicas como `Auth session missing!` não são exibidas no
  card de acesso.

## 1.6.1.107.45 - 2026-07-30

- Após login social no iOS/Capacitor, a Gestão Mobile continua a sessão já
  confirmada sem recarregar a página. Isso elimina o ciclo de **Preparando
  acesso** após autenticação com Google ou Apple.

## 1.6.1.107.44 - 2026-07-30

- Login com Google no iOS/Capacitor passa a reconhecer tokens OAuth retornados
  tanto na query quanto no fragmento do deep link, como já ocorre no PWA.

## 1.6.1.107.43 - 2026-07-30

- Aplicativos iOS e Android iniciam diretamente na **Gestão Mobile**; a landing
  continua exclusiva do web e PWA. Sessão válida abre o sistema e, sem sessão,
  o próprio login é exibido.
- Ao abrir **Entrar** ou **Começar grátis** pela landing, a Gestão Mobile não
  mostra o card intermediário de preparação antes de exibir login ou cadastro.

## 1.6.1.107.42 - 2026-07-30

- Entrada pública: **Entrar** e **Começar grátis** usam um único destino. No
  desktop abrem a Gestão Web; em aparelhos móveis e Capacitor, a Gestão Mobile.
- Gestão Mobile no Capacitor: Google e Apple usam navegador seguro e deep link
  nativo; retorno conclui a sessão e cancelamento restaura o login.

## 1.6.1.107.41 - 2026-07-30

- Gestão Mobile iOS: em perfil Pessoal sem assinatura vigente, **Menu >
  Assinatura** abre diretamente os planos Mensal e Anual da App Store, com
  **Restaurar compras**. O resumo continua disponível para assinaturas já
  contratadas, incluindo o gerenciamento da renovação.

## 1.6.1.107.40 - 2026-07-30

- Gestão Mobile: no aplicativo iOS/Android, o cadastro reconhece o WebView
  nativo como instalado e usa a mesma cena do login: marca separada, mesma
  escala e posicionamento entre a área segura e o card. Navegador e PWA comum
  mantêm seu layout rolável próprio.

## 1.6.1.107.39 - 2026-07-30

- Revisão iOS: a conta `teste@teste.com.br` usa um perfil Pessoal de
  demonstração, sem bloqueio por cadastro ou assinatura, preservando o acesso
  às opções reais de compra e restauração do Pessoal Premium pela App Store.

## 1.6.1.107.38 - 2026-07-30

- Gestão Mobile: o card superior do Menu fica fixo; somente os botões rolam,
  por toque e sem barra de rolagem visível.

## 1.6.1.107.37 - 2026-07-30

- Gestão Mobile: **Excluir minha conta** passa a ficar dentro de
  **Configurações**, como a última opção do grupo.

## 1.6.1.107.36 - 2026-07-30

- Cadastro mobile no navegador: reduzido o espaço entre o topo da cena e o
  card, preservando mais conteúdo visível na parte inferior da tela.

## 1.6.1.107.35 - 2026-07-30

- Gestão Web: login e cadastro passam a seguir a mesma ordem e cores do acesso
  mobile, preservando a escala confortável do desktop.

## 1.6.1.107.34 - 2026-07-30

- Correção do cadastro mobile: a compactação de 24 px passa a atingir somente
  os seletores **Empresa** e **Pessoal**; os campos retornam à altura de 32 px.

## 1.6.1.107.33 - 2026-07-30

- Cadastro da Gestão Web e Gestão Mobile: seletores **Empresa** e **Pessoal**
  reduzidos para 24 px de altura visual.

## 1.6.1.107.32 - 2026-07-30

- Login e cadastro da Gestão: os placeholders de telefone e cupom foram
  centralizados, preservando o texto digitado alinhado à esquerda. O rótulo do
  cadastro foi simplificado para **Tipo do perfil**.

## 1.6.1.107.31 - 2026-07-30

- Cadastro da Gestão Web e Gestão Mobile: seletores **Empresa** e **Pessoal**
  ajustados para 26 px de altura visual.

## 1.6.1.107.30 - 2026-07-30

- Cadastro da Gestão Web e Gestão Mobile: seletores **Empresa** e **Pessoal**
  compactados para 28 px de altura visual.

## 1.6.1.107.29 - 2026-07-30

- Cadastro da Gestão Web e Gestão Mobile: o estado ativo dos seletores
  **Empresa** e **Pessoal** passa a usar o azul padrão AvantaLab `#1687D9`.

## 1.6.1.107.28 - 2026-07-30

- Cadastro da Gestão Web: removido o espaçamento excedente ao redor dos
  seletores **Empresa** e **Pessoal**, deixando o conjunto com a mesma altura
  visual de 32 px das ações Google e Apple.

## 1.6.1.107.27 - 2026-07-30

- Cadastro da Gestão Mobile: placeholders dos campos compactos ajustados para
  14 px, preservando o texto digitado em 16 px para evitar zoom automático do
  navegador mobile.

## 1.6.1.107.26 - 2026-07-30

- Cadastro da Gestão Web e Gestão Mobile: os seletores **Empresa** e
  **Pessoal** passam a ter a mesma face compacta de 32 px dos campos e das
  ações Google e Apple.

## 1.6.1.107.25 - 2026-07-30

- Cadastro da Gestão Web e Gestão Mobile: adicionadas as opções **Cadastrar com
  Google** e **Cadastrar com Apple**, reutilizando o mesmo fluxo social do login.
  Durante a validação do código por SMS, essas opções permanecem ocultas. Os
  campos e a ação por SMS passam a usar a mesma face compacta de 32 px dos
  botões sociais.

## 1.6.1.107.24 - 2026-07-30

- Gestão Mobile: durante a conexão com Google ou Apple, a tela **Preparando
  acesso** volta a exibir **Cancelar e voltar ao login**. A ação interrompe o
  estado pendente e restaura imediatamente a página limpa de login, sem manter
  o botão em **Conectando...**.

## 1.6.1.107.23 - 2026-07-30

- Cadastro mobile no navegador: removida a rolagem interna do card. Com o
  teclado aberto, a página inteira acompanha o campo ativo; o PWA instalado
  permanece inalterado.
- Cadastro mobile: removidos os placeholders dos campos **Senha** e
  **Confirmar senha**; os labels continuam visíveis. O campo de cupom passa a
  exibir somente **CUPOM**.

## 1.6.1.107.22 - 2026-07-30

- Cadastro mobile: card e controles informados foram estreitados, preservando
  medidas e estilos do botão de envio do código por SMS e dos demais elementos.
  No navegador comum, o campo ativo também permanece visível quando o teclado
  reduz a área útil; o comportamento já validado do PWA não foi alterado.

## 1.6.1.107.21 - 2026-07-30

- Cadastro mobile: fundo e logo passam a usar a mesma cena responsiva do login,
  com fundo oficial sem marca incorporada, logo separado e card estabilizado na
  área útil da tela.

## 1.6.1.107.20 - 2026-07-30

- Gestão Mobile: o card de login volta a ficar centralizado horizontalmente na
  área útil do celular.
- Cadastro mobile: cabeçalho mais direto, seletor de perfil compacto e cupom ao
  lado da ação azul de envio do código por SMS.
- Landing mobile: **Entrar** passa ao header, entre o menu e **Começar grátis**,
  e deixa de aparecer duplicado dentro do menu.

## 1.6.1.107.19 - 2026-07-30

- Gestão Mobile: o acesso iniciado pela landing abre o login mobile quando não
  há sessão, sem retornar à página pública em ciclo.

## 1.6.1.107.18 - 2026-07-29

- Acesso: pelo navegador móvel, o botão **Entrar** da landing abre diretamente
  a Gestão Mobile. O retorno social mantém a rota de origem, sem depender de
  uma escolha tardia entre as interfaces Web e Mobile.

## 1.6.1.107.17 - 2026-07-29

- iOS: assinaturas pessoais passam a usar compra nativa da App Store, com
  ciclos mensal e anual, preços localizados, restauração e gerenciamento.
- O servidor valida a permissão Pessoal Premium na RevenueCat e mantém a
  assinatura da loja separada das assinaturas web da Asaas.
- No app iOS, planos empresariais podem ser acessados quando já contratados,
  mas não exibem checkout externo; a contratação Business permanece no Web.
- A barra de status do iPhone passa a adaptar os indicadores ao tema sem mudar
  a área segura, e a Gestão Mobile oferece exclusão definitiva da conta.

## 1.6.1.107.16 - 2026-07-29

- AvantaVendas: ao cumprir a meta mensal, o card Meta do período passa a
  informar “Meta atingida, parabéns!”.

## 1.6.1.107.15 - 2026-07-29

- PADRÃO AVANTA 1.4.0: o login validado da Gestão e do AvantaVendas passa a ser
  o contrato oficial para futuros acessos do ecossistema.
- O padrão agora exige uma única máquina de estado para Google/Apple, preparação
  cancelável, retorno específico para Web/PWA e Capacitor, conclusão da sessão
  Supabase, origem correta, safe areas e testes de cancelamento.
- O verificador passa a conferir a documentação e as implementações de
  referência para impedir regressões silenciosas no fluxo de autenticação.

## 1.6.1.107.14 - 2026-07-29

- Landing pública: removidos definitivamente o componente React antigo e seu
  CSS, que já não possuíam consumidores no sistema.
- A landing SEO oficial passa a usar nomes e diretório próprios, sem os
  identificadores legados de preview, preservando integralmente conteúdo,
  layout e assets compartilhados.
- A URL histórica `/preview/landing` permanece apenas como redirecionamento
  permanente para a raiz canônica, sem manter uma segunda implementação.

## 1.6.1.107.13 - 2026-07-29

- Autenticação: removidos os estados duplicados de carregamento de Google e
  Apple, os resets de carregamento geral que não pertenciam ao OAuth e as
  propriedades correspondentes espalhadas entre hook, página e card.
- Gestão: removido o restante inacessível da antiga landing interna. A raiz
  pública continua sendo a única landing e a Gestão mantém somente login,
  cadastro e recuperação.
- O fluxo social passa a ter uma única fonte de estado, com proteção contra
  clique duplicado, preparação, retorno e cancelamento.

## 1.6.1.107.12 - 2026-07-29

- Gestão: Google e Apple agora usam o mesmo estado único de preparação do
  AvantaVendas. Ao iniciar o provedor, o login é substituído imediatamente por
  **Preparando acesso**; a tela permanece estável até retorno, erro ou
  cancelamento explícito, que restaura os dois botões sem **Conectando…**.
- Removida a limpeza antecipada baseada apenas na ativação do app no iOS, pois
  ela podia desmontar a preparação antes do encerramento real do OAuth.

## 1.6.1.107.11 - 2026-07-29

- Gestão Mobile: o login nativo por Google ou Apple agora mantém uma tela
  **Preparando acesso** com **Cancelar e voltar ao login**, seguindo o fluxo já
  validado no Vendas. Cancelar limpa os provedores, o carregamento e o navegador.

## 1.6.1.107.10 - 2026-07-29

- Login social no iOS: os botões são restaurados antes de aguardar a Promise
  do navegador nativo, que pode permanecer pendente enquanto a folha Apple
  estiver aberta. Fechar a confirmação retorna ao login sem **Conectando…**.

## 1.6.1.107.09 - 2026-07-29

- Login social nativo: depois que o painel seguro assume o fluxo, os rótulos
  Google e Apple são restaurados imediatamente no card. O retorno após fechar
  a folha não depende mais de eventos de cancelamento do iOS.

## 1.6.1.107.08 - 2026-07-29

- Login social nativo: Google e Apple passam a compartilhar uma única fonte de
  estado para o provedor ativo. Fechar ou cancelar o painel seguro sempre
  restaura os dois botões e evita que algum permaneça em **Conectando…**.

## 1.6.1.107.07 - 2026-07-29

- Login social nativo: removido o botão redundante de cancelamento no card de
  acesso. Fechar ou dispensar a folha segura do Google/Apple limpa o estado do
  login e deixa a tela pronta para uma nova tentativa.

## 1.6.1.107.06 - 2026-07-29

- Login por Google e Apple iniciado na Gestão Web/PWA agora retorna da raiz
  pública diretamente para a Gestão assim que o Supabase confirma a sessão,
  sem exigir um segundo clique em Entrar.
- A Gestão deixa de renderizar sua landing legada antes ou depois do login; a
  landing pública oficial passa a ser exclusivamente a raiz do AvantaLab.

## 1.6.1.107.05 - 2026-07-29

- AvantaVendas: login por Google e Apple agora oferece cancelamento explícito
  durante a preparação, limpando o retorno pendente e voltando ao acesso.

## 1.6.1.107.04 - 2026-07-29

- Login social nativo: a tela de preparação agora oferece cancelamento explícito
  para Google e Apple. Ao dispensar o navegador seguro, o aplicativo também
  limpa o estado pendente e retorna à tela de acesso.

## 1.6.1.107.03 - 2026-07-29

- AvantaVendas: a preferência de modo escuro deixa de vazar para login,
  cadastro e recuperação de acesso. As telas públicas preservam a cena clara
  padrão e o tema salvo continua ativo após a autenticação.

## 1.6.1.107.02 - 2026-07-29

- Autenticação: incluído **Continuar com Apple** na Gestão Web, Gestão Mobile,
  Vendas Mobile e aplicativos Capacitor. O fluxo usa OAuth do Supabase e, no
  aplicativo nativo, retorna pelo navegador seguro do sistema.
- iOS: declarados os usos de câmera e biblioteca de fotos para anexar
  comprovantes e documentos em lançamentos.

## 1.6.1.107.01 - 2026-07-29

- AvantaVendas: o card de cliente sem endereço agora oferece o botão Localização na
  própria linha do endereço, que usa a localização do aparelho para preenchê-lo.

## 1.6.1.107 - 2026-07-29

- AvantaVendas: ao atingir a meta mensal, o Dashboard celebra a conquista uma
  vez por meta e mês; a ficha de cliente passa a preencher o endereço a partir
  da localização do aparelho, mediante permissão e revisão antes de salvar.

## 1.6.1.106 - 2026-07-29

- Ava: removidas referências a projetos ainda não plugados ao sistema, como
  Custos e Precificação e Central de Consultas.

## 1.6.1.105 - 2026-07-29

- Seleção de perfil: o texto dos cards passa a calcular contraste a partir do
  fundo efetivo do degradê, evitando rótulos ilegíveis em cores claras.

## 1.6.1.104 - 2026-07-29

- Página inicial: adicionada a seção Soluções AvantaLab, criando links internos para as páginas públicas de intenção de busca.

## 1.6.1.103 - 2026-07-29

- SEO: removido o bloqueio amplo `/gestao` do `robots.txt`, pois regras por
  prefixo também impediam o rastreamento de `/gestao-financeira`; a Gestão
  interna segue protegida por `noindex`.

## 1.6.1.102 - 2026-07-29

- SEO: Googlebot e Bingbot foram liberados explicitamente no `robots.txt`,
  evitando ambiguidade com regras de IA gerenciadas pela Cloudflare; títulos
  das páginas públicas também deixaram de repetir a marca.

## 1.6.1.101 - 2026-07-29

- SEO público: adicionadas páginas de intenção para gestão financeira,
  controle financeiro pessoal, controle de ponto e Vendas Mobile, com
  metadados, FAQ estruturado, CTAs e sitemap próprios.

## 1.6.1.100 - 2026-07-29

- SEO: metadados globais e canônicos das páginas institucionais foram
  refinados; dados estruturados agora descrevem o site, o software e os planos.

## 1.6.1.99 - 2026-07-29

- Página inicial: “Conhecer a plataforma” passou a usar o mesmo ponto de
  rolagem do item “Recursos” no menu, com offset consistente do cabeçalho.

## 1.6.1.98 - 2026-07-29

- Recebimentos Presenciais: a abertura de comprovantes também exige assinatura
  empresarial vigente, evitando acesso externo residual ao módulo.

## 1.6.1.97 - 2026-07-29

- Controle de Ponto: o login do funcionário agora valida também a assinatura
  empresarial vigente, além de confirmar que o módulo está instalado.

## 1.6.1.96 - 2026-07-29

- Vendas Mobile: remover o módulo empresarial agora bloqueia os vínculos de
  equipe e remove o destino financeiro daquele perfil, sem afetar o uso
  gratuito individual nem apagar dados pessoais.

## 1.6.1.95 - 2026-07-29

- Recebimentos Presenciais: colaboradores e gestores passam a ter o acesso
  externo do módulo bloqueado quando a assinatura empresarial não está vigente.

## 1.6.1.94 - 2026-07-29

- Assinaturas: mudanças de ciclo ou upgrade para Business Pro atualizam também
  a cobrança pendente, mantendo o valor cobrado alinhado ao acesso liberado.

## 1.6.1.93 - 2026-07-29

- Assinaturas: um Business ativo pode migrar para Business Pro sem cancelar ou
  recriar a assinatura; o ciclo atual é preservado e reduções não são feitas
  acidentalmente pelo painel.

## 1.6.1.92 - 2026-07-29

- Módulos: ativação do Business Pro passou a ser validada no servidor; planos
  pessoais não podem ativar módulos e Business permanece sujeito à cobrança.

## 1.6.1.91 - 2026-07-29

- Business Pro: módulos continuam incluídos, porém ficam desativados até o
  gestor escolher instalá-los; a instalação não gera cobrança avulsa.

## 1.6.1.90 - 2026-07-29

- Business Pro: módulos atuais e futuros passam a ser sincronizados e ativados
  automaticamente pelo plano, sem contratação ou instalação avulsa.

## 1.6.1.89 - 2026-07-29

- Módulos Business: remover um módulo cancela exclusivamente sua assinatura
  mensal recorrente e desativa o acesso, sem alterar o plano principal.

## 1.6.1.88 - 2026-07-29

- Sessões Business: ao abrir um perfil Business, o login atual encerra as
  outras sessões do mesmo usuário. Business Pro mantém sessões simultâneas.

## 1.6.1.87 - 2026-07-29

- Limites comerciais: criação de perfis foi centralizada no servidor e passa a
  validar quantidade total e tipo permitido antes da inserção.

## 1.6.1.86 - 2026-07-29

- Limites comerciais: criação e vínculo de usuários agora são validados no
  servidor conforme o plano ativo, com sugestão de upgrade ao atingir o limite.

## 1.6.1.85 - 2026-07-29

- Módulos Business: a instalação agora inicia uma assinatura mensal recorrente
  de R$ 14,90 no Asaas. A ativação ocorre somente após o webhook confirmar o
  pagamento; não há liberação direta pelo navegador.

## 1.6.1.84 - 2026-07-29

- Página pública: a nova apresentação comercial passou de prévia para a rota
  oficial `/`; a Gestão foi preservada em `/gestao`.
- SEO: definidos canônico, dados estruturados indexáveis, redirecionamento da
  prévia, `robots.txt`, sitemap e bloqueio explícito de indexação do sistema.
- Desempenho: a rota pública deixa de enviar a diretiva `no-store`; a Gestão
  autenticada continua sem cache persistente.

## 1.6.1.83 - 2026-07-29

- Cobrança: novas contratações empresariais passam a escolher Business ou
  Business Pro; o teste de 7 dias é exclusivo do Business Pro.
- Cobrança: preços e ciclos atualizados para Pessoal Premium, Business e
  Business Pro. Assinaturas empresariais antigas continuam compatíveis como
  Business durante a transição.
- Módulos avulsos: Business permanece preparado apenas para assinatura mensal
  recorrente de R$ 14,90 por módulo; não há opção anual avulsa.

## 1.6.1.82 - 2026-07-29

- Assinaturas: criado o catálogo central dos planos comerciais, limites e
  preços, usado pela página pública de planos.
- Módulos avulsos: preparada a persistência para uma assinatura mensal por
  módulo no Business, no valor fixo de R$ 14,90.

## 1.6.1.81 - 2026-07-29

- Planos na página inicial em prévia: as listas de recursos passam a explicitar
  a progressão entre Free, Pessoal Premium, Business e Business Pro.

## 1.6.1.80 - 2026-07-29

- Planos na página inicial em prévia: preços anuais do Business e Business Pro
  passam para R$ 249,90 e R$ 359,90, respectivamente.

## 1.6.1.79 - 2026-07-29

- Business Pro na página inicial em prévia: removida a mensagem redundante do
  teste abaixo do preço, mantendo o selo e o CTA de 7 dias grátis.

## 1.6.1.78 - 2026-07-29

- Business Pro na página inicial em prévia: CTA do teste passa a exibir a oferta
  em duas linhas, com destaque para os 7 dias grátis.

## 1.6.1.77 - 2026-07-29

- Business Pro na página inicial em prévia: destacados o teste de 7 dias grátis
  no selo, na mensagem de preço, no CTA e nas perguntas frequentes.

## 1.6.1.76 - 2026-07-29

- Página inicial em prévia: mensagens, CTAs, perguntas frequentes e dados
  estruturados passam a refletir a nova estrutura comercial dos planos.
- Planos: Business Pro recebe diferenciação visual de ecossistema completo,
  preservando o destaque do Pessoal Premium para uso pessoal.

## 1.6.1.75 - 2026-07-29

- Página inicial em prévia: Como funciona, IA Ava e Dúvidas passam a ocupar a
  altura útil da tela; a próxima rolagem agora também alcança o rodapé e seus
  links legais.

## 1.6.1.74 - 2026-07-28

- Planos na página inicial em prévia: corrigida a compatibilidade dos estilos da
  tabela comparativa com CSS Modules do Next.

## 1.6.1.73 - 2026-07-28

- Página inicial em prévia: a seção de planos passa a apresentar Free, Pessoal
  Premium, Business e Business Pro, com preços, limites e comparação comercial.

## 1.6.1.72 - 2026-07-28

- Página inicial em prévia: incluído o botão oficial de próxima rolagem, com
  avanço pelos destinos públicos e alinhamento ao conteúdo visível de cada seção.

## 1.6.1.71 - 2026-07-28

- Planos: título principal passa a permanecer em uma única linha em telas com
  largura suficiente, mantendo a leitura responsiva em telas menores.

## 1.6.1.70 - 2026-07-28

- Página inicial em prévia: cada destino da navegação interna passa a alinhar o
  primeiro conteúdo visível abaixo do header, eliminando o espaço excessivo.

## 1.6.1.69 - 2026-07-28

- Página inicial em prévia: a rolagem do menu passa a compensar a altura real
  do header fixo e uma margem de leitura, alinhando corretamente as seções.
- Navegação principal: Planos passa a aparecer antes de Calculadoras.

## 1.6.1.68 - 2026-07-28

- Página inicial em prévia: itens de navegação interna passam a rolar de modo
  suave até a seção escolhida, respeitando a preferência de movimento reduzido.

## 1.6.1.67 - 2026-07-28

- Página inicial em prévia: adicionadas as seções IA Ava e Planos, com conversa
  demonstrativa, comparação Pessoal/Empresa e alternância de cobrança mensal e
  anual, integradas à navegação pública.

## 1.6.1.66 - 2026-07-28

- Páginas públicas de informações: substituído o rótulo AvantaLab Gestão pelo
  logotipo oficial do AvantaLab no cabeçalho dos cards.

## 1.6.1.65 - 2026-07-28

- Central de Suporte: incluído botão de retorno à página inicial no topo do
  card, alinhado às páginas públicas de informações.

## 1.6.1.64 - 2026-07-28

- Páginas legais: o retorno ao conteúdo público passa a usar o texto claro
  `Voltar à página inicial`.

## 1.6.1.63 - 2026-07-28

- Páginas legais: Termos de Uso, Política de Privacidade e Política de Cookies
  passam a oferecer botão de retorno à Landing no topo do card.

## 1.6.1.62 - 2026-07-28

- Landing em prévia: adicionados menu mobile acessível, compensação de âncoras
  para o header fixo, navegação por teclado nas calculadoras, metadados sociais
  e dados estruturados preparados para a publicação.
- Privacidade: criada Política de Cookies, vinculada ao rodapé, e reforçado o
  canal de contato para solicitações relacionadas a dados pessoais.

## 1.6.1.61 - 2026-07-28

- Landing em prévia: o gráfico de linha ilustrativo do painel foi substituído
  por barras de comparação entre receitas e despesas, seguindo as cores e a
  leitura do gráfico comparativo do AvantaLab.

## 1.6.1.60 - 2026-07-28

- Landing em prévia: o conteúdo do balão demonstrativo da Ava é alinhado ao
  centro vertical.

## 1.6.1.59 - 2026-07-28

- Landing em prévia: o balão da Ava passa a apresentar uma pergunta de exemplo
  sobre o saldo do mês.

## 1.6.1.58 - 2026-07-28

- Landing em prévia: o balão de demonstração da Ava no painel ilustrativo passa
  a utilizar o arquivo oficial do logotipo da assistente.

## 1.6.1.57 - 2026-07-28

- Landing em prévia: o card da IA Ava passa a exibir o arquivo oficial do
  logotipo da assistente, substituindo o badge textual provisório.

## 1.6.1.56 - 2026-07-28

- Gestão Mobile: Total mensal passa a ter referência persistida. A etiqueta e
  a exclusão dependem dessa referência, sem confundir receitas avulsas.

## 1.6.1.55 - 2026-07-28

- Landing em prévia: o recurso da IA Ava passa a usar o ícone institucional da
  assistente.

## 1.6.1.54 - 2026-07-28

- Landing em prévia: a seção de recursos passa a apresentar Controle de Ponto e
  importação de despesas por faturas ou extratos.

## 1.6.1.53 - 2026-07-28

- Landing em prévia: o destaque institucional passa a identificar a Ava como
  assistente de IA.

## 1.6.1.52 - 2026-07-28

- Landing em prévia: rodapé agora apresenta o aviso de direitos autorais e
  links públicos para Termos de Uso e Política de Privacidade; criada a página
  pública dos Termos, alinhada ao texto exibido no aplicativo.

## 1.6.1.51 - 2026-07-28

- Calculadoras na Landing: os valores de exemplo passam a ser placeholders,
  mantendo os campos numéricos vazios e evitando resultados zerados antes do
  preenchimento; a Taxa DI atual continua disponível pelo botão específico.

## 1.6.1.50 - 2026-07-28

- Calculadoras na Landing: adicionada a opção `Financiar carro ou casa`, com
  simulação de entrada, custos financiados, SAC ou Price, parcelas, juros e
  total estimado; o resultado reforça a comparação pelo CET da proposta real.

## 1.6.1.49 - 2026-07-28

- Landing em prévia: o header passa a sobrepor o hero para que a transparência
  no topo revele o background; o logo agora rola ao início da página.

## 1.6.1.48 - 2026-07-28

- Landing em prévia: o header fica transparente no topo e recebe a superfície
  translúcida somente após o início da rolagem.

## 1.6.1.47 - 2026-07-28

- Calculadoras na Landing: estabilizada a altura do painel em telas amplas ao
  trocar de ferramenta, eliminando o salto visual da página.

## 1.6.1.46 - 2026-07-28

- Calculadora de CDI: a Taxa DI passa a ser consultada na série diária SGS 12
  do Banco Central, anualizada pela convenção de 252 dias úteis, aplicada
  automaticamente enquanto o campo não tiver sido editado e disponível no botão
  `Aplicar taxa real`.

## 1.6.1.45 - 2026-07-28

- Landing pública em prévia: a seção de Calculadoras agora reúne simulações
  interativas de renda passiva, reserva de emergência, investimento com CDI e
  juros compostos; a antiga rota isolada redireciona para essa seção.

## 1.6.1.44 - 2026-07-28

- Prévia da Landing: restauradas as camadas de background institucional, luz e
  profundidade visual no hero, nas faixas de destaque e no CTA final.

## 1.6.1.43 - 2026-07-28

- Adicionadas as prévias públicas de Landing e Calculadoras em
  `/preview/landing` e `/preview/calculadoras`, com navegação, CTAs, conteúdo
  institucional e metadados `noindex` para validação antes da publicação.

## 1.6.1.42 - 2026-07-28

- AvantaVendas: o botão Desvincular perfil financeiro ganha respiro em relação
  aos controles de integração e altura visual mais compacta.

## 1.6.1.41 - 2026-07-27

- Relatório Contábil: o hover das linhas recebe tom de cinza ainda mais claro.

## 1.6.1.40 - 2026-07-27

- Relatório Contábil: o destaque ao passar o mouse nas linhas dos cards adota
  cinza mais claro; os cabeçalhos MÊS e ano recebem contraste reforçado.

## 1.6.1.39 - 2026-07-27

- Controle de Ponto: ao selecionar um funcionário específico no relatório, o
  campo recebe borda institucional, fundo azul sutil e foco reforçado.

## 1.6.1.38 - 2026-07-27

- Controle de Ponto: Faltas no período passa a integrar o card Pontualidade na
  entrada, logo abaixo do horário previsto.

## 1.6.1.37 - 2026-07-27

- Controle de Ponto: o rótulo ANO fica centralizado abaixo do número no seletor
  de ano do relatório.

## 1.6.1.36 - 2026-07-27

- Controle de Ponto: controles compactos do relatório recebem nova redução de
  altura, mantendo Pontualidade na entrada inalterada.

## 1.6.1.35 - 2026-07-27

- Controle de Ponto: controles de período e Buscar registros ficam mais
  compactos; o card Pontualidade na entrada mantém sua altura.

## 1.6.1.34 - 2026-07-27

- Controle de Ponto: título e valor de Faltas no período passam a compor um
  único conjunto centralizado no card.

## 1.6.1.33 - 2026-07-27

- Controle de Ponto: indicadores e horário previsto do card de Pontualidade na
  entrada passam a ficar centralizados.

## 1.6.1.32 - 2026-07-27

- Controle de Ponto: os filtros De, Até e a ação Buscar registros passam a
  compartilhar a mesma linha no relatório web, mantendo empilhamento no celular.

## 1.6.1.31 - 2026-07-27

- Controle de Ponto: o resumo de Pontualidade na entrada passa a informar os
  adiantados e corrige o plural de **Pontuais**.

## 1.6.1.30 - 2026-07-27

- Controle de Ponto: o destaque de hover nas linhas dos relatórios passa a usar
  cinza claro, preservando o vermelho semântico das faltas.

## 1.6.1.29 - 2026-07-27

- Controle de Ponto: ao passar o mouse sobre uma linha de dia nos relatórios do
  gestor ou em Meus registros, o respectivo dia recebe destaque visual.

## 1.6.1.28 - 2026-07-27

- Controle de Ponto: o relatório individual passa a listar os dias de trabalho
  sem entrada como **Falta**, com borda e etiqueta vermelhas. A mesma situação
  também é apresentada nas exportações Excel e PDF.

## 1.6.1.27 - 2026-07-27

- Recebimentos Presenciais: os cards da aba **Conferência** passam a exibir
  Valor contratado, Valor declarado, Diferença, Forma de pagamento e
  Comprovante em uma única faixa no desktop.
- O resumo quebra de forma controlada conforme a largura disponível, reduzindo
  a altura dos cards sem ocultar informações, observações ou ações.

## 1.6.1.26 - 2026-07-27

- Recebimentos Presenciais: o popup administrativo passa a aproveitar melhor a
  largura disponível e a listagem reorganiza os lançamentos quando o card fica
  estreito, evitando títulos e valores sobrepostos.
- Na listagem, datas usam ano com dois dígitos, **Combinado** passa a **Valor** e
  a coluna redundante **Tipo** é removida.
- Gestores e administradores podem estornar qualquer recebimento efetivamente
  lançado, inclusive enquanto aguarda conferência; previsões e atrasos sem valor
  recebido permanecem sem a ação.

## 1.6.1.25 - 2026-07-27

- Gestão Web e Mobile: contas criadas em **Usuários e Permissões** passam a
  integrar um diretório global consistente para pesquisa por e-mail ou login.
- Ao excluir um usuário, o login é apagado definitivamente somente quando a
  conta foi criada internamente e não possui outro perfil, vínculo ou histórico.
  Nos demais casos, apenas o acesso ao perfil atual é removido.
- **Adicionar usuário existente** volta a localizar contas preservadas mesmo
  quando elas não possuem mais acesso a nenhum perfil financeiro.

## 1.6.1.24 - 2026-07-27

- Gestão Web: as linhas **Inicial**, **Final** e **Previsto** do card **Saldo do
  mês** exibem explicações em um tooltip que acompanha o cursor, com o mesmo
  estilo visual usado em **Evolução mensal**.
- As explicações também podem ser acessadas por foco de teclado.

## 1.6.1.23 - 2026-07-27

- Gestão Mobile: o campo **Valor** da edição de despesas fixas passa a seguir o
  padrão monetário do sistema, com prefixo `R$`, duas casas decimais, alinhamento
  à direita e teclado decimal.

## 1.6.1.22 - 2026-07-27

- Gestão Mobile: o botão **Salvar** da edição de despesas fixas permanece
  funcional após o usuário interagir com os campos do formulário.
- Durante a gravação, o botão muda para **Salvando…** e bloqueia novos toques.
  Após a confirmação do banco, somente o formulário de edição é fechado e o
  usuário permanece em **Gerenciar despesas fixas** com a lista atualizada.

## 1.6.1.21 - 2026-07-27

- Gestão Mobile: o valor do campo **Dia** fica centralizado horizontalmente ao
  editar despesas ou receitas, preservando o seletor numérico e os temas claro
  e escuro.

## 1.6.1.20 - 2026-07-27

- Gestão Web e Mobile: o card **Lançamentos a confirmar** passa a exibir
  despesas e receitas previstas somente na data programada.
- Após o término desse dia, o aviso desaparece automaticamente; o lançamento
  continua com status **Previsto** e permanece disponível na Agenda e nos
  controles financeiros até uma ação do usuário.

## 1.6.1.19 - 2026-07-27

- Gestão Mobile e AvantaVendas: ao tocar em um campo textual editável já
  preenchido, o cursor passa a ser posicionado no final do conteúdo para
  permitir apagar imediatamente da direita para a esquerda.
- A seleção intencional de um trecho por gesto longo e o foco por teclado
  permanecem preservados; seletores, datas, arquivos, botões e demais controles
  sem cursor textual não são afetados.

## 1.6.1.18 - 2026-07-27

- Gestão Web: o cabeçalho do card **Editar usuário** passa a respeitar
  exatamente o recorte do modal, eliminando a curvatura irregular no canto
  superior direito.
- Login da Gestão Web e Mobile: o campo de acesso passa a informar claramente
  **E-mail ou login** no rótulo e no placeholder, mantendo a alternativa por
  telefone.

## 1.6.1.17 - 2026-07-27

- Gestão Web e Mobile: criação e edição de usuários verificam no servidor a
  disponibilidade global do e-mail e do login antes de salvar.
- Alertas de validação preservam todo o preenchimento e, ao serem fechados,
  posicionam o cursor no campo que precisa de correção.
- O envio fica bloqueado durante a consulta para evitar cadastros duplicados;
  o acesso à conta continua aceitando tanto e-mail quanto login.

## 1.6.1.16 - 2026-07-27

- Gestão Web e Mobile: a criação de usuários passa a exigir nome completo,
  e-mail real, login, senha inicial e tipo de usuário.
- A edição usa os mesmos dados obrigatórios; somente a nova senha permanece
  opcional.
- O usuário criado pode entrar com o e-mail ou com o login. E-mails já
  cadastrados são direcionados ao fluxo **Adicionar usuário existente**.
- Nome, e-mail, login e tipo permanecem no rascunho temporário do formulário;
  senhas continuam apenas em memória e nunca são armazenadas no navegador.

## 1.6.1.15 - 2026-07-27

- Gestão Mobile: o cadastro empresarial passa a exibir CNPJ e **Buscar** na
  mesma linha, seguido por Razão Social, Nome Fantasia e Tipo de Empresa.
- A consulta usa exclusivamente o endpoint interno, preenche somente campos
  compatíveis que ainda estejam vazios e preserva dados existentes.
- Responsável sai de Dados Gerais e passa para Contato, antes de Site e
  Instagram, mantendo o formulário alinhado ao cadastro da Gestão Web.
- O cache do aplicativo mobile foi renovado para entregar imediatamente a nova
  versão do formulário.

## 1.6.1.14 - 2026-07-27

- Gestão Web: a página principal e o service worker passam a usar cabeçalhos
  sem cache, evitando que abas e instalações reutilizem o formulário de uma
  versão anterior após novo deployment.
- O identificador do service worker web foi renovado para descartar a versão
  antiga no próximo carregamento.

## 1.6.1.13 - 2026-07-27

- Cadastro empresarial reorganizado: a primeira linha apresenta CNPJ e
  **Buscar** lado a lado no mobile e no web; a segunda reúne Razão Social, Nome
  Fantasia e Tipo de Empresa.
- Responsável sai de Dados Gerais e passa para Contato, antes de Site e
  Instagram. Para empresas, o campo continua obrigatório, mas deixa de exigir
  nome e sobrenome.

## 1.6.1.12 - 2026-07-27

- Cadastro obrigatório: a pesquisa de CNPJ passa a ter uma ação primária
  exclusiva e sempre visível abaixo do documento, identificada como
  **Pesquisar CNPJ e preencher cadastro**.
- A edição comum do perfil mantém a ação compacta ao lado do CNPJ, separando
  explicitamente os dois contextos sem duplicar botões na mesma tela.

## 1.6.1.11 - 2026-07-27

- Cadastros de pessoas passam a identificar explicitamente `Nome completo` ou
  `Responsável — nome completo` e rejeitam números, símbolos isolados e nomes
  sem sobrenome na interface e nas validações compartilhadas.
- Gestão Mobile preserva nome, login, perfil e senhas em memória quando o
  cadastro ou a edição de usuário encontra um erro; os dados não sensíveis
  também são restaurados após atualização da página.
- Usuários da Gestão Web, funcionários do Ponto, empresas e colaboradores de
  Recebimentos e a conta do AvantaVendas recebem rascunhos temporários por
  perfil. Senhas, confirmações, códigos SMS e tokens nunca são armazenados.
- Recebimentos só limpa um cadastro depois da confirmação do servidor. Em erro
  de validação, rede ou banco, mantém todos os campos disponíveis para correção.

## 1.6.1.10 - 2026-07-27

- Nova rota pública `/consulta` cria a Central de Consultas com pesquisa
  cadastral de CNPJ via endpoint interno e provedor CNPJ.ws.
- O relatório normalizado apresenta dados empresariais por seções, possui
  impressão nativa e mantém as futuras categorias sinalizadas como **Em breve**.
- O cadastro empresarial e a tela obrigatória recebem **Pesquisar CNPJ** para
  preparar somente os campos compatíveis. A inserção depende de confirmação e
  preserva dados já preenchidos por padrão.
- No celular, a pesquisa ocupa uma linha própria com área de toque ampliada; em
  telas maiores, permanece ao lado do documento.
- Recebimentos e Central de Consultas usam no desktop o fundo AvantaLab sem
  logotipo incorporado, sem alterar o fluxo operacional de Recebimentos.

## 1.6.1.09 - 2026-07-27

- Gestão Mobile: a etapa `Acesso pronto` só conclui os 100% depois que a tela
  principal foi montada, evitando permanecer no card ao final da carga.
- A abertura é retomada ao voltar ao PWA, recuperar a conexão ou restaurar uma
  página suspensa; falhas finais passam a oferecer recuperação independente.
- A rota usada na troca AvantaVendas → Gestão recebeu a mesma política sem
  cache da entrada direta, com verificação de versão e caches isolados entre os
  dois aplicativos.

## 1.6.1.08 - 2026-07-27

- Gestão Web: o card de login voltou a ficar alinhado à esquerda, na mesma
  posição usada pelo card Criar cadastro.
- O posicionamento centralizado do login foi preservado somente em aparelhos
  de toque; janelas web estreitas com mouse ou trackpad continuam à esquerda.
- O alinhamento vertical do login também foi igualado ao início do card Criar
  cadastro na visualização web.

## 1.6.1.07 - 2026-07-27

- AvantaVendas: o visualizador de Divulgação agora permite avançar ou voltar
  entre os arquivos da pasta por gesto horizontal ou pelos botões laterais.
- Conteúdo do Vendas: as subpastas descendentes da pasta selecionada recebem
  uma variação do mesmo destaque visual para evidenciar o ramo ativo.

## 1.6.1.06 - 2026-07-27

- Visualizador da Divulgação: arrastar horizontalmente alterna entre o material
  anterior e o próximo dentro da pasta aberta.
- Foram adicionados contador de posição e botões laterais acessíveis; o gesto
  preserva a rolagem vertical e os controles inferiores dos vídeos.

## 1.6.1.05 - 2026-07-27

- Divulgação: imagens e vídeos dentro das pastas de Conteúdo do Vendas passam a
  abrir em um visualizador amplo ao toque, usando o arquivo original.
- O visualizador funciona no mobile e no web, possui fechamento acessível,
  suporte à tecla Esc e controles nativos para vídeos.

## 1.6.1.04 - 2026-07-27

- Divulgação: após confirmar a seleção de arquivos, o card de progresso aparece
  antes do processamento com a etapa `Preparando arquivos para envio`.
- O card permanece visível durante verificação de duplicidade, envio e registro,
  com percentual, arquivo atual e opção de cancelamento.

## 1.6.1.03 - 2026-07-27

- Divulgação: o resumo após o envio informa somente as quantidades de arquivos
  enviados e ignorados por duplicidade, sem listar os nomes dos duplicados.

## 1.6.1.02 - 2026-07-27

- Conteúdo do Vendas: as pastas de Divulgação na Gestão passam a exibir o total
  de materiais de toda a árvore, somando os arquivos da própria pasta e de
  todas as suas subpastas.

## 1.6.1.01 - 2026-07-27

- Gestão Mobile: ao selecionar uma pasta em Conteúdo do Vendas > Divulgação, a
  ação `Enviar arquivos para esta pasta` passa a aparecer junto da pasta,
  evitando que o envio fique oculto abaixo da árvore de pastas.
- A versão web mantém o botão `Adicionar` no painel de materiais.

## 1.6.1 - 2026-07-27

- AvantaVendas passa a funcionar com uma conta independente, sem exigir código
  empresarial nem perfil financeiro para clientes, produtos, pedidos e
  pagamentos.
- O código da empresa solicita, mediante aprovação, somente acesso a Novidades,
  Divulgação e catálogo publicado para a equipe; ele não concede acesso a
  clientes, pedidos, pagamentos ou dados financeiros.
- A integração com a Gestão torna-se opcional e manual. O usuário escolhe o
  perfil financeiro, e o primeiro vínculo envia todos os meses existentes.
- Na troca de destino, o usuário escolhe entre todo o histórico, mês vigente ou
  mês seguinte e decide se os lançamentos do perfil anterior serão mantidos,
  agora editáveis, ou apagados. O histórico operacional do Vendas é preservado.
- Ao ir do Vendas para a Gestão, a lista de perfis financeiros é sempre
  apresentada. Sem perfil, o sistema oferece criar ou ativar um, sem vincular
  automaticamente o novo perfil ao financeiro do Vendas.
- A consolidação mensal enviada à Gestão passa a ser rastreada por usuário,
  permitindo transferir ou desvincular os resultados de cada conta com
  segurança e preservando os vínculos financeiros existentes.

## 1.6.0.84.148 - 2026-07-27

- Gestão Web: o refresh agora valida no servidor se a sessão e o usuário ainda
  existem antes de procurar perfis financeiros.
- Sessões inválidas, expiradas ou pertencentes a usuários excluídos são limpas
  e encaminhadas ao login, sem abrir indevidamente `Criar perfil financeiro`.

## 1.6.0.84.147 - 2026-07-27

- Cadastros de pessoas passam a exigir nome e sobrenome em toda a Gestão Web,
  Gestão Mobile, AvantaVendas, Usuários e Permissões, Controle de Ponto e
  Recebimentos Presenciais.
- A regra é validada na interface e nas APIs dos módulos, inclusive nas edições
  de usuários, funcionários e colaboradores já cadastrados.

## 1.6.0.84.146 - 2026-07-27

- Gestão Web: os dados gerais do cadastro do perfil foram reorganizados em duas
  linhas, com larguras proporcionais ao conteúdo.
- O CPF/CNPJ agora recebe máscara durante a digitação e validação visual dos
  dígitos antes da conclusão do cadastro.

## 1.6.0.84.145 - 2026-07-26

- Gestão Web: o card `Usuários e Permissões` ficou um pouco mais largo e a
  coluna da senha inicial ganhou mais espaço para exibir mais caracteres.

## 1.6.0.84.144 - 2026-07-26

- Vendas Mobile: os campos de `Vincular outra empresa` passam a ocupar a largura
  disponível e recebem labels, contorno, raio, espaçamento e foco visível nos
  temas claro e escuro.

## 1.6.0.84.143 - 2026-07-26

- Custos e Precificação: `Produtos cadastrados` passa a usar uma faixa
  horizontal de cards selecionáveis, mantendo estável a altura da Visão geral.
- Adicionada busca por nome, apresentação ou situação do produto.
- Incluídos três novos produtos de exemplo para validar a rolagem e a filtragem.
- As ações de insumos ficam reunidas no menu `⋯`; o menu abre lateralmente e a
  exclusão continua exigindo confirmação.

## 1.6.0.84.142 - 2026-07-26

- Custos e Precificação: a lista de insumos passa a mostrar `Editar` ao lado de
  `Excluir`.
- A edição ocorre na própria linha e permite alterar nome, categoria, unidade e
  custo, com ações para salvar ou cancelar.

## 1.6.0.84.141 - 2026-07-26

- Custos e Precificação: todos os campos monetários passam a montar o valor
  durante a digitação, sempre em reais e com duas casas decimais.
- A entrada funciona por centavos: `1`, `2`, `3` resultam progressivamente em
  `R$ 0,01`, `R$ 0,12` e `R$ 1,23`.

## 1.6.0.84.140 - 2026-07-26

- Custos e Precificação: adicionada a tela `Meta de vendas`.
- O usuário pode informar despesas operacionais, lucro mensal desejado, margem
  de contribuição de referência e vendas realizadas.
- O módulo calcula ponto de equilíbrio, meta mensal com lucro, progresso e
  faturamento restante; os valores são locais nesta fase e ficam preparados
  para futura leitura dos lançamentos classificados do AvantaLab.

## 1.6.0.84.139 - 2026-07-26

- Custos e Precificação: a Visão geral passa a oferecer o botão `Novo produto`.
- O cadastro solicita nome, apresentação e parâmetros iniciais, cria o produto
  como rascunho e abre sua composição vazia.
- Após o cadastro, o usuário pode adicionar insumos à composição para formar o
  custo e usar o produto no Simulador.

## 1.6.0.84.138 - 2026-07-26

- Custos e Precificação: a Visão geral deixa de apresentar médias financeiras
  entre produtos diferentes.
- Os cards agora mostram produtos cadastrados, composições validadas,
  composições em rascunho e insumos efetivamente utilizados; valores
  financeiros permanecem vinculados ao produto selecionado.

## 1.6.0.84.137 - 2026-07-26

- Custos e Precificação: o protótipo passa a incluir quatro produtos de exemplo,
  cada um com composição, custos indiretos, impostos, taxas e margem próprios.
- A Visão geral agora apresenta médias consolidadas da carteira e cards para
  selecionar o produto analisado.
- Composição e Simulador ganharam seletor de produto; os dados locais anteriores
  são migrados e preservados.
- O cabeçalho de Composição foi reorganizado com rótulo acima da lista e ação de
  restauração separada, eliminando o agrupamento excessivo dos controles.

## 1.6.0.84.136 - 2026-07-26

- Custos e Precificação: a altura visual do botão `Excluir` na lista de insumos
  foi reduzida em aproximadamente 40%, sem alterar os demais controles e
  preservando uma área ampliada de interação.

## 1.6.0.84.135 - 2026-07-26

- Custos e Precificação: os campos monetários recuperaram os controles de
  aumentar e diminuir no lado direito, mantendo o valor alinhado antes deles,
  a máscara brasileira e as dimensões atuais.

## 1.6.0.84.134 - 2026-07-26

- Custos e Precificação: valores monetários foram alinhados à direita nas áreas
  que ocupam, incluindo campos, tabelas, indicadores e resultados.

## 1.6.0.84.133 - 2026-07-26

- Custos e Precificação: todos os valores monetários agora são apresentados em
  reais, no padrão brasileiro e sempre com duas casas decimais.
- Os campos de custo aceitam edição com vírgula e são normalizados ao sair do
  campo, preservando os valores numéricos no armazenamento local.

## 1.6.0.84.132 - 2026-07-25

- Custos e Precificação: o valor unitário na lista de insumos ganhou tipografia
  maior e mais legível, sem alterar as dimensões do campo.

## 1.6.0.84.131 - 2026-07-25

- Custos e Precificação: as linhas de insumos foram compactadas novamente no
  desktop, mantendo a área mínima de toque dos controles em telas móveis.

## 1.6.0.84.130 - 2026-07-25

- Custos e Precificação: as linhas da lista de insumos foram compactadas,
  preservando os controles com área de toque acessível.

## 1.6.0.84.129 - 2026-07-25

- Custos e Precificação: a lista de insumos passa a oferecer exclusão com o
  card oficial de confirmação do AvantaLab.
- Quando o insumo estiver em uso, a confirmação avisa e também remove o item
  da composição, recalculando os valores e preservando a consistência local.

## 1.6.0.84.128 - 2026-07-25

- Novo protótipo de **Custos e Precificação** disponível em `/custos`, dentro
  do servidor principal do AvantaLab.
- A validação permite montar uma composição, cadastrar insumos e simular preço
  e margem, persistindo somente neste navegador e sem banco ou integração com
  os dados financeiros.
- Os arquivos do protótipo passam a ficar concentrados em `app/custos`; o
  servidor independente da porta `3100` deixa de ser necessário.

## 1.6.0.84.127 - 2026-07-25

- Importação de despesas: linhas parcialmente preenchidas no modelo Excel
  deixam de ser descartadas e passam a aparecer na revisão.
- Data, tipo de despesa e valor inválidos ficam destacados e bloqueiam a
  confirmação até a correção; somente linhas completamente vazias são
  ignoradas.
- Datas ausentes deixam de assumir silenciosamente o primeiro dia do mês, e
  data e valor podem ser corrigidos diretamente nos dois fluxos de revisão.

## 1.6.0.84.126 - 2026-07-25

- Gestão Web: o **Modelo Excel** de despesas passa a preservar a formatação
  oficial enviada e é personalizado no download com os tipos de despesa
  cadastrados no perfil ativo.
- A coluna **Tipo de despesa** recebe uma lista suspensa nas linhas de
  preenchimento, reduzindo erros de digitação e tipos pendentes na revisão.
- A leitura de planilhas passa a localizar automaticamente a linha dos
  cabeçalhos, mantendo compatibilidade com as instruções acima da tabela.

## 1.6.0.84.125 - 2026-07-25

- Gestão Web: o lançamento de despesas passa a oferecer o download de uma
  planilha Excel modelo ao lado de **Carregar arquivo**.
- O modelo possui uma aba limpa para importação e uma aba separada com
  orientações e exemplos, evitando lançamentos demonstrativos acidentais.
- Planilhas com **Data**, **Tipo de despesa**, **Descrição** e **Valor**
  reconhecem datas reais do Excel, pré-selecionam tipos já cadastrados e abrem
  a revisão antes de qualquer gravação.

## 1.6.0.84.124 - 2026-07-25

- Recebimentos Presenciais: o visualizador de comprovantes passa a abrir acima
  do popup administrativo, exibindo o card **Carregando imagem…** e, em
  seguida, a imagem privada ou uma mensagem de erro.

## 1.6.0.84.123 - 2026-07-25

- Avanta Admin: a busca de Perfis passa a reorganizar campo, filtros, ordem,
  paginação e ação principal em uma grade responsiva no mobile e tablet,
  evitando corte e rolagem horizontal sem alterar o layout desktop.

## 1.6.0.84.122 - 2026-07-25

- Avanta Admin: `/admin` passa a ter identidade PWA própria com o nome
  **Avanta Admin**, manifesto e ícones dedicados para Android, iOS, atalhos e
  instalação em modo standalone.
- O service worker usa escopo restrito a `/admin` e mantém o conteúdo
  administrativo sempre na rede; somente manifesto e ícones públicos entram
  no cache.

## 1.6.0.84.121 - 2026-07-25

- Recebimentos Presenciais: o colaborador passa a informar obrigatoriamente a
  forma de pagamento — boleto, cartão de crédito, cartão de débito, dinheiro ou
  Pix — ao lado do valor recebido.
- O lançamento pode receber uma imagem de comprovante JPG, PNG ou WebP de até
  6 MB. O arquivo fica em armazenamento privado, vinculado ao recebimento e
  preservado após conferência, devolução, divergência ou estorno.
- Gestor Master e Administrador podem abrir o comprovante por uma URL temporária
  nas telas de Conferência e Recebimentos. Registros antigos sem forma de
  pagamento exigem essa seleção antes da confirmação da baixa.

## 1.6.0.84.120 - 2026-07-25

- AvantaVendas: tema, atalhos inferiores, ordem da sala, alerta de aniversário,
  meta mensal e período de inatividade passam a acompanhar a conta pelo
  servidor, protegidos por RLS, em vez de depender exclusivamente do navegador.
- Na primeira abertura, as preferências locais válidas são migradas
  automaticamente. O armazenamento do aparelho permanece como fallback
  offline e estados temporários de navegação continuam locais.
- Falhas temporárias no armazenamento do navegador deixam de apagar todo o
  conjunto de preferências. O reset explícito inclui essas configurações no
  backup automático e continua removendo-as de forma atômica.
- A navegação inferior do AvantaVendas volta a ocupar uma camada persistente
  acima da sala, Dashboard e demais telas comuns. Modais e confirmações
  permanecem acima dela, preservando o bloqueio das ações.
- A sala preservada também reconstrói o rodapé caso uma atualização transitória
  o tenha removido, sem recarregar cards ou imagens.

## 1.6.0.84.119 - 2026-07-25

- Gestão Mobile: avisos de áudio e confirmações de lembretes, usuários,
  despesas cadastradas, lançamentos previstos, parcelas e despesas fixas
  deixam de usar caixas nativas do navegador e passam a seguir o padrão visual
  do sistema, com modo escuro, área segura, rolagem interna e foco acessível.
- Exclusões de parcelas e despesas fixas agora apresentam ações explícitas:
  fechar ou voltar nunca exclui; a pessoa escolhe entre somente o lançamento,
  todas as parcelas ou a área de Despesas fixas conforme o caso.
- Administração, Conteúdo para a equipe e AvantaVendas adotam as mesmas
  confirmações padronizadas para ações destrutivas e disparos gerais, sem
  alterar permissões, dados, rotas ou regras de negócio.

## 1.6.0.84.118 - 2026-07-25

- Gestão Web e Mobile: tipos de despesa recém-cadastrados passam a entrar
  imediatamente na posição alfabética correta em listas, seletores e no modal
  de gerenciamento, com comparação em português do Brasil.
- Inclusões, edições e exclusões do catálogo de despesas agora usam a
  sincronização financeira compartilhada: uma alteração feita na Web atualiza
  o Mobile aberto, e vice-versa, mantendo a mesma tabela e regra de negócio.

## 1.6.0.84.117 - 2026-07-25

- Gestão Mobile: a confirmação ao excluir o total mensal deixa de usar o aviso
  nativo sem formatação e passa a seguir a moldura visual dos demais avisos do
  sistema, inclusive quando não há receitas e o total será zerado.
- Mantida a regra existente: **Cancelar** não altera os dados; **OK** remove o
  total definido, preservando as receitas avulsas quando houver.

## 1.6.0.84.116 - 2026-07-25

- Gestão Mobile: perfis com acesso por cortesia ou cupom deixam de exibir
  preços, ciclos e ações de contratação em **Menu > Assinatura**. O painel
  mantém somente a identificação da situação e do plano liberado.

## 1.6.0.84.115 - 2026-07-25

- Gestão Mobile: **Menu > Assinatura** passa a distinguir acesso liberado de
  assinatura contratada. O resumo identifica plano e situação — em dia,
  cortesia, cupom, teste, teste expirado, pagamento pendente ou cancelamento —
  sem apresentar campos financeiros vazios.
- Valor contratado, próximo vencimento e faturas aparecem somente quando há
  contrato recorrente. Assinaturas canceladas preservam o valor contratado e o
  histórico local; cortesia, cupom, teste e perfis sem contrato recebem a oferta
  de Assinatura Pessoal ou Assinatura Empresa conforme o perfil.

## 1.6.0.84.114 - 2026-07-24

- Gestão Mobile: a confirmação exibida ao definir o total de receitas em um
  mês com receitas avulsas passa a usar a moldura visual dos avisos do sistema,
  inclusive no iOS, onde o alerta nativo não aceitava formatação.
- Preservados integralmente os botões e a regra existente: **Cancelar** mantém
  as receitas avulsas e soma o total; **OK** apaga as avulsas e mantém somente
  o total informado. Nenhum outro aviso foi alterado.

## 1.6.0.84.113 - 2026-07-24

- AvantaVendas: o shell mobile passa a manter cabeçalho e navegação inferior
  em faixas próprias, deixando somente o conteúdo central rolar. A estrutura
  elimina a dependência de camadas `fixed` para esses elementos e evita que
  eles se desloquem junto com a página no WebKit.
- Cabeçalhos internos continuam visíveis dentro da rolagem; modais bloqueiam
  apenas o conteúdo central e preservam a posição anterior. A solução é
  compartilhada entre iOS e Android, sem detecção de aparelho e sem alterar o
  layout desktop.

## 1.6.0.84.112 - 2026-07-24

- Gestão Mobile: atualizações assíncronas deixam de reconstruir o modal de
  lançamento enquanto um campo está sendo editado, evitando a perda de foco e
  o fechamento inesperado do teclado virtual.
- A atualização pendente é aplicada assim que a edição termina, preservando
  notificações, sincronização financeira, assinatura e resumo do ponto sem
  criar comportamento específico para Android ou alterar o fluxo no iOS.

## 1.6.0.84.111 - 2026-07-24

- AvantaVendas: substituído o ícone do PWA pela nova arte “AV”, preservada sem
  reinterpretação em PNG nas dimensões 180, 192 e 512 pixels.
- Manifesto, metadados e pré-cache passam a oferecer ícones separados para uso
  padrão, Apple Touch e recorte adaptativo `maskable` no Android.

## 1.6.0.84.110 - 2026-07-24

- AvantaVendas: comprovantes de pedido passam a exibir o desconto concedido no
  resumo da tela e na imagem compartilhada sempre que o valor for positivo.
- Comprovantes de pagamento mantêm a exibição condicional existente com o
  rótulo padronizado “Desconto concedido” na tela e na imagem.

## 1.6.0.84.109 - 2026-07-24

- AvantaVendas: itens bonificados passam a usar uma superfície âmbar escura no
  tema noturno, mantendo nome, quantidade, preço e total legíveis tanto no
  rascunho quanto no comprovante do pedido.
- Corrigido o seletor do comprovante para alcançar as linhas bonificadas dentro
  do contêiner de rolagem, sem alterar produtos comuns ou regras comerciais.

## 1.6.0.84.108 - 2026-07-24

- Compatibilidade: restaurado o comportamento visual anterior ao conjunto de
  ajustes experimentais para Android, preservando integralmente as melhorias
  independentes do importador de documentos, seus limites e sua auditoria.
- Landing page, popups, modais, layouts web, iOS e demais componentes voltam ao
  estado seguro `backup-pre-android-mobile`.

## 1.6.0.84.107 - 2026-07-24

- Gestão Web: extratos e faturas em PDF passam a aceitar no máximo cinco
  páginas por envio e três análises mensais por perfil. Tickets, cupons e notas
  pequenas por imagem permanecem fora dessa franquia.
- O limite é reservado de forma atômica no servidor antes da análise, evitando
  contorno por outro aparelho, recarga ou envios simultâneos. Após cada envio,
  o resultado informa quantas análises ainda restam naquele mês.
- Admin: Consumo passa a exibir as análises de documentos que mais utilizaram
  tokens, com perfil, páginas, modelo, contingência e resultado, sem armazenar
  o PDF ou seu conteúdo financeiro.

## 1.6.0.84.104 - 2026-07-24

- Gestão Web: a análise de PDFs do Importador passa a usar GPT-5.6 Terra com
  raciocínio médio como padrão econômico. GPT-5.6 Sol com raciocínio alto é
  acionado somente quando a primeira leitura não passa pela conferência
  estrutural e matemática.
- A qualidade visual do PDF e a tolerância máxima de dois centavos são
  preservadas; o limite de saída foi reduzido para evitar consumo anormal.

## 1.6.0.84.102 - 2026-07-24

- Gestão Mobile: Assinatura passa a ser o primeiro botão do Menu e deixa o
  grupo de Configurações.
- Gestão Mobile: perfis sem assinatura ou liberação vigente veem o card
  Premium; assinatura, cortesia administrativa, cupom, teste e demais
  liberações válidas mantêm o painel de plano, faturas e renovação.
- Gestão Mobile: Ir para assinatura abre diretamente a contratação do plano.
  Ao tentar ocultar um card sem Premium, somente o menu da ação é fechado e o
  card permanece no dashboard.

## 1.6.0.84.101 - 2026-07-23

- Premium Pessoal: o bloqueio do AvantaVendas passa a suspender somente o
  acesso, preservando módulo, vínculos, clientes, produtos, pedidos e
  pagamentos para a reativação.
- Gestão Mobile: a receita consolidada do Vendas deixa de compor o perfil
  Pessoal gratuito e reaparece automaticamente, com o mesmo histórico, quando
  a assinatura ou cortesia volta a ficar vigente.
- AvantaVendas: o acesso direto também confere a assinatura do perfil e oferece
  a ação “Ir para assinatura”, sem confundir bloqueio temporário com
  desinstalação do módulo.

## 1.6.0.84.100 - 2026-07-23

- Gestão Mobile: recursos exclusivos do perfil Pessoal Premium passam a exibir
  controles sem cor no plano gratuito e abrem um aviso com acesso direto à
  assinatura.
- Gestão Mobile: o aviso Premium prioriza o card da assinatura; a relação de
  benefícios fica recolhida em “Veja os recursos adicionais”.
- Gestão Mobile: Agenda e Ir para Vendas passam a exigir assinatura ou
  cortesia vigente no perfil Pessoal; Conteúdo do Vendas fica disponível
  somente em perfis Empresa com permissão compatível.
- Interface: os avisos de assinatura passam a ficar acima dos menus flutuantes
  dos cards, preservando a assinatura como próxima camada do fluxo.

## 1.6.0.84.99 - 2026-07-23

- Recebimentos Presenciais: ações de cancelar, excluir e salvar do cadastro de
  empresa ficam alinhadas à seleção do tipo de cadastro, com altura compacta.
- Recebimentos Presenciais: botões de exclusão ganham borda vermelha também no
  modo escuro, reforçando visualmente a ação destrutiva.
- Recebimentos Presenciais: removida a antiga página de demonstração em
  `/recebimentos`; o módulo integrado e o PWA do colaborador permanecem ativos.

## 1.6.0.84.98 - 2026-07-23

- Recebimentos Presenciais: todos os campos de senha passam a usar o mesmo
  controle acessível para exibir ou ocultar o conteúdo, incluindo cadastro,
  confirmação, edição e login do colaborador.

## 1.6.0.84.97 - 2026-07-23

- Recebimentos Presenciais: consultas de lançamentos passam a carregar todos os
  lotes do Supabase, eliminando o corte de 1.000 registros que ocultava os
  vencimentos mais próximos em bases maiores.
- Recorrências automáticas ficam limitadas ao horizonte móvel dos próximos 12
  meses; previsões não recebidas além desse intervalo são removidas sem afetar
  histórico, recebimentos ou baixas.

## 1.6.0.84.96 - 2026-07-23

- Recebimentos Presenciais: o login do colaborador passa a permitir exibir e
  ocultar a senha pelo botão acessível dentro do campo.

## 1.6.0.84.95 - 2026-07-23

- iOS/App Store: distribuição limitada a iPhone nesta fase, removendo a
  exigência de screenshots de iPad; próximo build passa a ser o número 2.
- iOS/App Store: declarada ausência de criptografia não isenta para evitar
  nova pendência de export compliance no próximo upload.

## 1.6.0.84.94 - 2026-07-23

- AvantaVendas: a troca para a Gestão permanece dentro da janela instalada do
  PWA, sem abrir barras de endereço e atalhos do Safari.
- PWA: o escopo do AvantaVendas passa a abranger a rota compartilhada da Gestão,
  mantendo o início e a identidade do aplicativo em `/avantavendas`.

## 1.6.0.84.93 - 2026-07-23

- AvantaVendas: o botão de classificação em Pagamentos mantém o título “Ordem”
  em Todos, Débito, Crédito e Último pagamento, sem alterar o critério aplicado.

## 1.6.0.84.92 - 2026-07-23

- Gestão Mobile: a identificação do perfil ativo permanece visível abaixo do
  cabeçalho e ganha 75% de transparência durante a rolagem, retornando à
  opacidade total no topo.

## 1.6.0.84.91 - 2026-07-23

- Landing mobile: a bolinha flutuante avança somente entre Benefícios, IA Ava,
  Planos, Dúvidas e o fim total da página, respeitando as mesmas âncoras do menu.
- Landing mobile: o cabeçalho da área de planos foi compactado para aproximar os
  cards de preços e aproveitar melhor a altura disponível.

## 1.6.0.84.90 - 2026-07-23

- Landing mobile: cabeçalho ganhou mais altura e respiro, com marca ampliada,
  navegação menos comprimida e botões com área de toque de 44 px.
- Landing mobile: conteúdo inicial e âncoras foram compensados para respeitar o
  novo cabeçalho fixo sem sobreposição.

## 1.6.0.84.89 - 2026-07-23

- AvantaVendas: removidas as cópias antigas do aplicativo e dos recursos
  públicos; o código oficial passa a existir somente em `app/avantavendas`.
- Compatibilidade: acessos antigos em `/mobile/vendas` são redirecionados para
  `/avantavendas`, preservando favoritos e instalações anteriores.
- Manutenção: o build deixa de recriar a pasta pública antiga; documentação e
  referências históricas foram consolidadas junto ao AvantaVendas.

## 1.6.0.84.88 - 2026-07-23

- AvantaVendas: `vendas.avantalab.com.br` passa a abrir internamente a nova
  estrutura `/avantavendas`, preservando o endereço público.
- Gestão Mobile: seleção inicial, troca de sistema, retorno ao login e ícone do
  Vendas passam a usar a nova rota e seus próprios recursos.
- Migração: a antiga rota `/mobile/vendas` permanece temporariamente disponível
  como contingência até a conclusão dos testes do endereço oficial.

## 1.6.0.84.87 - 2026-07-23

- AvantaVendas: nova estrutura em `/avantavendas` publicada em paralelo para
  validação antes da migração definitiva.
- AvantaVendas: manifesto, atualização, cache e service worker próprios,
  isolados dos demais PWAs do AvantaLab.
- AvantaVendas: código, estilos, bibliotecas e recursos passam a ser entregues
  pela nova pasta do produto, sem alterar ainda o endereço oficial existente.

## 1.6.0.84.86 - 2026-07-23

- Vendas Mobile: correções de Pagamentos, Divulgação, saída e mensagens de
  acesso passam a ser mantidas no código-fonte distribuído pelo build.
- Vendas Mobile: o cache do PWA é renovado para receber esta versão.

## 1.6.0.84.85 - 2026-07-23

- Vendas Mobile: atualização do cache do PWA passa a entregar imediatamente os
  ajustes de pagamentos e Divulgação já publicados.
- Gestão Mobile: Recolher em Despesas e Receitas também fecha e limpa a busca.

## 1.6.0.84.84 - 2026-07-23

- Gestão Mobile: perfis autorizados com Vendas Mobile instalado ganharam o
  atalho visual de troca no cabeçalho; buscas de despesas e receitas mantêm a
  ação Recolher disponível.
- Vendas Mobile: pagamentos classificam por valor ou data conforme o filtro;
  pastas de Divulgação somam materiais das subpastas; Configurações ganhou
  saída no cabeçalho; erros de acesso não passam do Entrar ao Cadastro.

## 1.6.0.84.83 - 2026-07-23

- App Store/Capacitor: a conta de revisão não exibe o modal de preenchimento do
  cadastro detalhado do perfil.

## 1.6.0.84.82 - 2026-07-23

- Capacitor/mobile: a conta de revisão reassocia o perfil empresarial existente
  antes de avaliar a necessidade de onboarding.

## 1.6.0.84.81 - 2026-07-23

- App Store: a conta `teste@teste.com.br` passa a reassociar automaticamente o
  perfil empresarial existente pelo e-mail antes de iniciar o onboarding.

## 1.6.0.84.80 - 2026-07-23

- App Store: reforçado o acesso automático da conta `teste@teste.com.br`, com
  fallback para projetos Supabase que ainda não possuem a RPC mais recente.

## 1.6.0.84.79 - 2026-07-23

- App Store: a conta de revisão `teste@teste.com.br` passa a receber dados
  demonstrativos idempotentes de receitas e despesas para testes, capturas de
  tela e demonstrações.

## 1.6.0.84.78 - 2026-07-22

- App Store: a conta de revisão `teste@teste.com.br` passa a receber
  automaticamente um perfil pessoal de teste após o primeiro login, sem exigir
  preenchimento manual do cadastro ou validação de telefone. O fluxo normal dos
  demais usuários não muda.

## 1.6.0.84.77 - 2026-07-22

- Suporte: criada a página pública `/suporte` com canais de ajuda, formulário de
  sugestão e seção de IA para atendimento, para uso do App Store Connect
  e suporte operacional.

## 1.6.0.84.76 - 2026-07-22

- Política de Privacidade: publicada a página pública `/privacidade`, com o
  mesmo conteúdo legal exibido no aplicativo e pronta para uso no App Store
  Connect.

## 1.6.0.84.75 - 2026-07-22

- Controle de Ponto: o PWA passa a instalar como **AvantaPonto**, com novo
  ícone oficial em Android, iPhone e navegadores compatíveis.

## 1.6.0.84.74 - 2026-07-22

- Vendas Mobile: a entrada estática e o acesso mobile passam a declarar
  explicitamente **AvantaVendas** como nome do aplicativo instalado.

## 1.6.0.84.73 - 2026-07-22

- Vendas Mobile: o PWA passa a instalar como **AvantaVendas**, com novo ícone
  oficial em Android, iPhone e navegadores compatíveis.

## 1.6.0.84.72 - 2026-07-22

- Recebimentos Presenciais: locais agrupadores não exibem status nem ação de
  ativar/desativar, pois são somente organizadores de clientes e não possuem
  cobranças próprias.

## 1.6.0.84.71 - 2026-07-22

- Recebimentos Presenciais: novos cadastros não pré-selecionam a frequência de
  vencimento. A pessoa escolhe o período e define o dia correspondente antes
  de salvar; cadastros existentes preservam a configuração gravada.

## 1.6.0.84.70 - 2026-07-22

- Recebimentos Presenciais: no cadastro de clientes, responsável, contato,
  e-mail e endereço passam a ser opcionais. Permanecem obrigatórios somente
  nome, valor contratado e a configuração de vencimento.

## 1.6.0.84.69 - 2026-07-22

- Recebimentos Presenciais: o cadastro passa a distinguir **Cliente direto** de
  **Local agrupador**. Clientes diretos concentram dados, contrato e vencimento
  próprios; locais como shopping e galeria possuem somente identificação e
  endereço e podem organizar clientes abaixo. A alteração permanece local até
  a publicação da migração correspondente.

## 1.6.0.84.68 - 2026-07-22

- Gestão Financeira e Gestão de Vendas: o seletor entre E-mail e Telefone
  ganhou estado ativo azul e altura mais compacta, preservando a mesma
  aparência nos dois acessos mobile.

## 1.6.0.84.67 - 2026-07-22

- Vendas Mobile: o card de login passa a ocupar a mesma largura útil máxima
  do Financeiro, eliminando a quebra antecipada de texto e a diferença de
  proporção entre as duas telas de acesso.

## 1.6.0.84.66 - 2026-07-22

- Gestão Financeira e Gestão de Vendas: telas de login passam a compartilhar
  as mesmas medidas de logo, card, espaçamentos, campos e ações.

## 1.6.0.84.65 - 2026-07-22

- Gestão Mobile e Vendas Mobile: os cards de login agora usam campos mais
  compactos, menos espaçamento interno e tipografia auxiliar reduzida, sem
  comprometer o alvo mínimo de toque das ações principais.

## 1.6.0.84.64 - 2026-07-22

- Gestão Mobile e Vendas Mobile: card e marca das telas de acesso foram
  reduzidos em aproximadamente 20%, preservando o tamanho dos campos e ações.

## 1.6.0.84.63 - 2026-07-22

- Gestão Mobile e Vendas Mobile: cards de acesso ajustados para 30% de
  transparência, preservando o efeito de vidro e a leitura dos formulários.

## 1.6.0.84.59 - 2026-07-22

- Gestão Mobile e Vendas Mobile: as telas de acesso identificam claramente o
  aplicativo atual como **Gestão Financeira** ou **Gestão de Vendas**.

## 1.6.0.84.58 - 2026-07-22

- Gestão Mobile e Vendas Mobile: a origem da jornada agora acompanha a troca
  explícita entre os aplicativos. Ao sair, o usuário retorna ao login do
  aplicativo pelo qual iniciou o acesso.

## 1.6.0.84.57 - 2026-07-22

- Gestão Mobile: a rota da Gestão deixa de obedecer a preferências antigas de
  sistema e abre sempre a própria Gestão. O Vendas continua acessível somente
  por sua ação explícita.

## 1.6.0.84.56 - 2026-07-22

- Vendas Mobile: após autenticar, abre sempre no próprio Vendas, sem exibir a
  escolha de sistema. A Gestão permanece disponível somente pela navegação
  explícita dentro do aplicativo. O cadastro volta a solicitar somente os dados
  necessários para criar a conta e pedir vínculo por código da empresa.

## 1.6.0.84.55 - 2026-07-22

- Vendas Mobile: o cadastro agora permite indicar o tipo **Empresa** ou
  **Pessoal**. Para empresa, solicita também o nome fantasia; a escolha é
  registrada na conta sem alterar o vínculo seguro pelo código da empresa.

## 1.6.0.84.54 - 2026-07-22

- Gestão Mobile e Vendas Mobile: a opção Lembrar-me passou a manter a sessão
  por 30 dias para entradas por senha, telefone e Google. Sem a opção, o
  acesso vale apenas enquanto o app/navegador permanecer aberto.

## 1.6.0.84.53 - 2026-07-22

- Gestão Web: as ações do card de Importação assistida receberam hierarquia de
  cores, estados de hover e foco, sombra sutil e redução tátil ao clicar. Os
  avisos da conferência agora podem ser fechados individualmente e voltam a
  aparecer quando a condição correspondente for disparada novamente.

## 1.6.0.84.52 - 2026-07-22

- Gestão Mobile no aplicativo: a tela apresentada após sair passou a usar o
  padrão visual do Vendas Mobile e permite entrar por e-mail/login ou telefone
  brasileiro com DDD.

## 1.6.0.84.51 - 2026-07-22

- Gestão Web: requisições autenticadas do Importador renovam a sessão e repetem
  uma vez após resposta 401. Quando a sessão realmente expira, o sistema abre
  diretamente o login com orientação, sem retornar à landing page.

## 1.6.0.84.50 - 2026-07-22

- Gestão Web: o seletor de perfis recupera o botão azul intenso de confirmação
  e passa a apresentar as cores dos perfis em gradiente translúcido e mais suave.

## 1.6.0.84.49 - 2026-07-22

- Gestão Web: rascunhos da importação passam a ser salvos no servidor por perfil
  e usuário; um rascunho local existente é migrado automaticamente na próxima abertura.

## 1.6.0.84.48 - 2026-07-22

- Vendas Mobile: todas as cenas de acesso passam a usar o fundo oficial sem
  marca embutida e o logo oficial como elemento independente. Logo e cards são
  centralizados horizontalmente; os cards também ficam no centro vertical da
  página e a marca ocupa o centro exato entre o topo seguro e o card. Conteúdo
  extenso rola dentro do card. O mesmo contrato atende PWA e aplicativo iOS.

## 1.6.0.84.47 - 2026-07-22

- Gestão Web: o Importador agora sugere o tipo de despesa pelo histórico do
  mesmo perfil, com indicação visual e possibilidade de edição em cada linha.

## 1.6.0.84.46 - 2026-07-22

- Gestão Web: a revisão do Importador salva automaticamente o rascunho após
  alterações, preservando o botão para salvar e fechar manualmente.

## 1.6.0.84.45 - 2026-07-22

- Vendas Mobile no aplicativo iOS: telas integrais usam viewport estável e uma
  única aplicação da área segura. Login, cadastro, vínculo, seletores e saída
  permanecem ancorados ao rodapé; quando necessário, somente o card interno
  rola. O fluxo no navegador e no PWA permanece inalterado.

## 1.6.0.84.44 - 2026-07-22

- Gestão Web: a confirmação para descartar importação salva passou a usar o
  modal padrão do AvantaLab.

## 1.6.0.84.43 - 2026-07-22

- Gestão Web: rascunhos salvos da importação podem ser descartados pela própria
  conferência, com confirmação, sem criar lançamentos.

## 1.6.0.84.42 - 2026-07-22

- Gestão Web: o acesso à importação salva foi movido para junto do botão
  Arquivo, no novo lançamento de despesas.

## 1.6.0.84.41 - 2026-07-22

- Vendas Mobile: telas de autenticação, seletores, menu, logout, agenda,
  modais e modo suspenso passam a usar uma única altura de viewport e áreas
  seguras. O fundo cobre a tela inteira em dispositivos de tamanhos diferentes
  e o gesto elástico não expõe áreas vazias.

## 1.6.0.84.40 - 2026-07-22

- Gestão Web: corrigido o fechamento do popup de Importação. Salvar e continuar
  depois agora encerra a revisão após gravar o rascunho, sem perder as linhas.

## 1.6.0.84.39 - 2026-07-22

- Gestão Web: expiração de sessão durante a importação fecha a conferência e
  retorna automaticamente à tela de login. O observador global de autenticação
  também encerra a área autenticada quando a sessão deixa de existir.

## 1.6.0.84.38 - 2026-07-22

- Vendas Mobile: login e cadastro deixam de mover o documento inteiro pelo
  gesto elástico do iPhone; formulários longos mantêm rolagem interna.

## 1.6.0.84.37 - 2026-07-22

- Gestão Web: corrigida a edição do valor a lançar no Importador; o campo agora
  pode ser apagado integralmente antes de digitar o novo valor. Salvar rascunho
  fecha a conferência após a gravação e o cabeçalho passou a usar a cor primária
  do perfil.

## 1.6.0.84.36 - 2026-07-22

- Vendas Mobile: cabeçalho, painéis fixos, sala de botões, login, cadastro,
  seleção de perfil e modais passam a reservar a área segura do iPhone desde a
  abertura inicial do aplicativo.

## 1.6.0.84.35 - 2026-07-22

- Administração: o resumo de consumo passa a usar os limites contratados do
  Supabase Pro (100 GB de Storage, 8 GB de banco, 100 mil MAUs e 250 GB de
  egress), em vez dos limites do plano Free.

## 1.6.0.84.34 - 2026-07-22

- Gestão Web: PDFs de extratos e faturas são usados somente durante a análise e
  descartados da memória do navegador e do servidor em seguida. O documento não
  é gravado no banco nem no Storage; imagens de recibo continuam no fluxo de
  nota anexada ao lançamento.

## 1.6.0.84.33 - 2026-07-22

- Gestão Web: a revisão de importações pode ser salva e retomada depois no
  mesmo navegador, preservando seleção, tipo, descrição, valores ajustados e
  total de conferência.
- Gestão Web: o valor a lançar agora é editável por linha. A conferência do
  documento continua usando o valor original reconhecido, permitindo lançar
  somente a parte do usuário em uma compra compartilhada.

## 1.6.0.84.32 - 2026-07-22

- Gestão Web: corrigido o progresso da análise de documentos no Importador. A
  atualização percentual agora ocorre fora da renderização do React e impede
  análises duplicadas no ambiente de desenvolvimento.

## 1.6.0.84.31 - 2026-07-21

- Gestão Web: o botão **Arquivo** do novo lançamento aceita nota por imagem,
  extrato, fatura de cartão e planilhas. Documentos financeiros exibem progresso
  e abrem a conferência do Importador no próprio fluxo de Lançamentos.
- Gestão Web: a conferência bloqueia a gravação quando a soma divergir, permite
  cancelar ou refazer a análise e desloca o foco ao primeiro tipo de despesa
  pendente antes de inserir os lançamentos.

## 1.6.0.84.30 - 2026-07-21

- Gestão Web: depois da revisão, o Importador cria no perfil selecionado os
  lançamentos confirmados com data, tipo de despesa cadastrado, descrição e
  valor. A gravação é autenticada, atômica e protegida contra repetição do mesmo
  item de uma fatura já importada.
- Gestão Web: o PDF continua sem ser armazenado no AvantaLab nesta etapa. Os
  estornos permanecem visíveis e separados, mas ainda não geram receitas.

## 1.6.0.84.29 - 2026-07-21

- Gestão Web: o Importador de despesas passa a enviar o PDF completo para uma
  análise visual isolada com GPT-5.6 Sol. Faturas com múltiplas colunas são
  percorridas página a página; compras futuras, limites e simulações ficam fora.
- Gestão Web: despesas e estornos/créditos são apresentados em áreas separadas.
  O usuário pode preparar um estorno como receita, e nenhuma lista é liberada
  quando despesas menos estornos divergem do total da fatura.

## 1.6.0.84.28 - 2026-07-21

- Gestão Web: o Importador de despesas passa a analisar páginas posteriores de
  faturas longas e registra estornos transacionais como valores negativos. O
  total apresentado é líquido — compras menos estornos — para conferir com o
  saldo da fatura.

## 1.6.0.84.27 - 2026-07-21

- Segurança: o contador interno de NSR do REP-P deixa de ficar acessível pela
  API pública do banco. O trigger responsável pela sequência legal continua com
  acesso interno, sem alterar o registro de ponto ou a geração de documentos.

## 1.6.0.84.26 - 2026-07-21

- Gestão Web: a análise de PDFs do Importador de despesas ficou mais rápida e
  resiliente. Ela envia somente linhas financeiras candidatas e recebe somente
  as despesas aprovadas, evitando respostas extensas e incompletas em faturas
  longas; falhas de resposta agora recebem orientação específica.

## 1.6.0.84.25 - 2026-07-21

- Gestão Web: a leitura de PDFs no Importador de despesas passa por análise
  estruturada com IA no servidor. Ela separa compras e saídas reais dos campos
  de limite, total, pagamento mínimo, vencimento, saldo, créditos e resumos;
  todos os resultados continuam sujeitos à revisão humana antes da confirmação.

## 1.6.0.84.24 - 2026-07-21

- Gestão Web: o Importador de despesas permite informar antes do envio se o
  documento é extrato bancário ou fatura de cartão. A escolha manual tem
  prioridade sobre a detecção automática e permanece no rascunho salvo.

## 1.6.0.84.23 - 2026-07-21

- Gestão Web: o Importador de despesas distingue extrato bancário de fatura de
  cartão. Em faturas, cada compra datada é listada como despesa, enquanto total
  da fatura, limite, vencimento e pagamento mínimo ficam fora da importação.

## 1.6.0.84.22 - 2026-07-21

- Gestão Web: o **Importador de despesas** passa a ler PDFs com texto
  selecionável. A prévia extrai saídas, ignora entradas e encaminha PDFs
  digitalizados para a futura etapa de OCR, sem gerar resultados vazios ou
  imprecisos.

## 1.6.0.84.21 - 2026-07-21

- Gestão Web: adiciona a prévia **Importador de despesas** em
  `/importador-despesas`. Ela lê CSV, TXT, XLS e XLSX, separa saídas para
  revisão, confere o total e permite salvar o rascunho para continuar depois no
  mesmo navegador. A leitura segura de PDF/OCR e o lançamento definitivo serão
  conectados ao processamento financeiro do AvantaLab em uma etapa posterior.

## 1.6.0.84.20 - 2026-07-21

- Gestão Web: o perfil Pessoal no plano gratuito passa a abrir a página de
  assinatura em vez do dashboard. O uso gratuito permanece disponível no
  Gestão Mobile; assinatura Premium ou cortesia libera também o acesso web.

## 1.6.0.84.19 - 2026-07-21

- Administração: a ficha de cada perfil em **Perfis** passa a exibir a data do
  último acesso efetivo de seus usuários ativos.

## 1.6.0.84.18 - 2026-07-21

- Administração: o botão **Carregar / Buscar** em Perfis mantém a mesma largura
  enquanto mostra o estado **Carregando...**.

## 1.6.0.84.17 - 2026-07-21

- Administração: **Ordem A/Z / Z/A** respeita o critério ativo em Perfis. Com
  **Data de criação** selecionada, alterna entre perfis mais recentes e mais
  antigos; com os demais filtros, ordena os resultados filtrados pelo nome.

## 1.6.0.84.16 - 2026-07-21

- Gestão Web: o card fixo **Lançamentos mensais** deixa de exibir o menu de
  opções e, portanto, não oferece mais **Remover bloco**.

## 1.6.0.84.15 - 2026-07-21

- Gestão Web: ao abrir a troca de perfil dentro de um acesso, o perfil em uso
  fica identificado como **Em uso** e desativado. No seletor exibido após o
  login, todos os perfis continuam disponíveis para seleção.

## 1.6.0.84.14 - 2026-07-21

- Administração: restaura **Data de criação** em **Perfis > Filtros > Situação
  de acesso**. O botão separado de ordem permanece limitado a A/Z e Z/A.

## 1.6.0.84.13 - 2026-07-21

- Gestão Web: o perfil selecionado no seletor de troca usa borda interna, sem
  cortar suas laterais. O degradê dos perfis segue do tom mais escuro à esquerda
  para a cor primária à direita.

## 1.6.0.84.12 - 2026-07-21

- Administração: em **Perfis**, o botão de ordem alterna diretamente entre
  **A/Z** e **Z/A**, sem abrir painel adicional.

## 1.6.0.84.11 - 2026-07-21

- Gestão Web: os perfis disponíveis no seletor de troca agora usam a cor
  primária própria em degradê, com contraste preservado para leitura.

## 1.6.0.84.10 - 2026-07-21

- Administração: em **Perfis**, a ordenação passa a ficar em um único botão
  **Ordenar**, ao lado de **Filtros**. Os filtros de situação e tipo permanecem
  separados da escolha de ordenação.

## 1.6.0.84.09 - 2026-07-21

- Administração: **Data de criação** passa a ser uma opção direta em
  **Perfis > Filtros > Situação de acesso**, sem exigir intervalo de datas.

## 1.6.0.84.08 - 2026-07-21

- Administração: em **Perfis**, o filtro passa a permitir ordenar por nome
  (A–Z ou Z–A) e por data de criação (mais recentes ou mais antigas).

## 1.6.0.84.07 - 2026-07-21

- Vendas Mobile e Gestão: a apuração mensal passa a considerar sempre todos os
  dias do mês selecionado. Recebimentos com data futura já existentes no
  histórico também entram na competência correspondente, mantendo o dashboard
  e a receita automática da Gestão alinhados.

## 1.6.0.84.06 - 2026-07-21

- Administração: a lista de perfis passa a exibir a data de criação de cada
  conta junto a tipo, situação e acesso.

## 1.6.0.84.05 - 2026-07-21

- Aplicativo iOS: o WebView passa a respeitar a área segura da tela, mantendo
  a navegação da landing page abaixo da Dynamic Island e do notch.

## 1.6.0.84.04 - 2026-07-21

- Aplicativo Android: desativa a camada gráfica acelerada somente na atividade
  nativa do AvantaLab, evitando resíduos visuais do WebView ao abrir o menu.

## 1.6.0.84.03 - 2026-07-21

- Gestão Mobile: o menu lateral usa o contêiner do aplicativo no Android, em
  vez de uma camada fixa aninhada. Isso evita os cards residuais que o WebView
  podia mostrar após abrir o menu, sem alterar o PWA ou o navegador.

## 1.6.0.84.02 - 2026-07-21

- Aplicativo Android e iOS: o login com Google abre no navegador seguro do
  sistema, retorna ao AvantaLab por deep link e conclui a sessão sem alterar o
  fluxo já usado pela Gestão Web e pelo PWA.

## 1.6.0.84.01 - 2026-07-20

- Gestão Web: a **Caixinha** passa a se adaptar ao perfil — permanece ativa no Pessoal e se apresenta como **Reserva financeira** no perfil Empresa, inicialmente disponível em Organizar blocos.


## 1.6.0.84 - 2026-07-20

- Administração: a consulta de consumo da Cloudflare foi migrada do endpoint
  Zone Analytics desativado para a API GraphQL oficial, preservando o resumo dos
  últimos 30 dias e informando com precisão quando faltar permissão no token.

## 1.6.0.83 - 2026-07-20

- Gestão Mobile: impede que Cloudflare ou o navegador combinem a página nova
  com arquivos antigos do PWA. Os scripts e o service worker passam a usar a
  versão oficial do sistema e recebem política explícita de não armazenamento.
- Gestão Mobile: depois de alcançar 100%, o carregador confirma que a tela
  principal realmente abriu e recupera o acesso se o card permanecer visível.

## 1.6.0.82 - 2026-07-20

- Administração: a aba **Consumo** passa a acompanhar métricas do Cloudflare dos
  últimos 30 dias, incluindo requisições, tráfego, taxa de cache, páginas,
  visitantes e ameaças mitigadas. A consulta é protegida no servidor e renovada
  a cada hora.

## 1.6.0.81 - 2026-07-20

- Gestores podem gerar, assinar e arquivar o Espelho de Ponto Eletrônico por
  funcionário e período na aba Conformidade REP-P.

## 1.6.0.80 - 2026-07-20

- A geração e o download de documentos REP-P exigem vínculo ativo de Gestor
  Master ou Administrador com a empresa. Operadores e o `/admin` global não
  acessam documentos de empresas.

## 1.6.0.79 - 2026-07-20

- O painel global `/admin > REP-P` deixou de emitir AFD; ele mantém somente o
  registro do software no INPI e a configuração do certificado. A empresa emite
  e consulta seus documentos na aba Conformidade do Controle de Ponto.

## 1.6.0.78 - 2026-07-20

- A empresa pode disponibilizar e baixar o Manual do Sistema REP-P em PDF
  versionado, preservado no mesmo histórico privado dos documentos de ponto.

## 1.6.0.77 - 2026-07-20

- A aba Conformidade REP-P passou a manter, por empresa, o histórico imutável
  de AFDs gerados. Gestores podem baixar documentos já emitidos ou gerar um
  novo, sem sobrescrever arquivos anteriores; emissão e download são auditados.

## 1.6.0.76 - 2026-07-20

- Gestores passaram a acessar a aba Conformidade REP-P no Controle de Ponto e
  baixar somente o AFD da própria empresa.

## 1.6.0.75 - 2026-07-20

- O painel REP-P gera o AFD por empresa e período diretamente da ARP, em ZIP
  com o arquivo texto e sua assinatura destacada `.p7s`.

## 1.6.0.74 - 2026-07-20

- O colaborador pode consultar todo o histórico de marcações e baixar o PDF do
  comprovante correspondente a cada registro.

## 1.6.0.73 - 2026-07-20

- O comprovante imediato do Controle de Ponto pode ser baixado em PDF e é
  preparado para assinatura PAdES pelo certificado ativo do REP-P.

## 1.6.0.72 - 2026-07-20

- A Central Administrativa ganhou o painel global **REP-P** para cadastrar e
  substituir certificados A1. O arquivo e a senha são criptografados antes de
  chegar ao banco, e cada substituição preserva o histórico técnico.

## 1.6.0.71 - 2026-07-20

- A homologação do REP-P passa a ler o certificado A1 configurado apenas no
  servidor, validar sua senha e identificar se ele está vigente ou vencido,
  mantendo a emissão legal bloqueada em todos os casos desta etapa.

## 1.6.0.70 - 2026-07-20

- O Controle de Ponto recebeu a camada segura de configuração da assinatura
  digital REP-P: certificado A1 e senha ficam exclusivamente em segredos do
  servidor, e a emissão legal permanece bloqueada durante a homologação.

## 1.6.0.69 - 2026-07-20

- O Controle de Ponto passou a preservar uma ARP interna: cada marcação recebe
  um NSR sequencial por empresa e uma cópia imutável dos dados originais.
- A trilha de auditoria passa a registrar o nome do responsável em novas ações
  administrativas, além do identificador técnico do usuário.

## 1.6.0.68 - 2026-07-20

- O modal administrativo do Controle de Ponto ganhou largura para acomodar a
  nova aba **Auditoria** sem cortar sua navegação em telas de desktop.

## 1.6.0.67 - 2026-07-20

- O comprovante de marcação do Controle de Ponto usa o identificador persistido
  do registro, substitui códigos gerados no aparelho e pode ser impresso logo
  após a confirmação.

## 1.6.0.66 - 2026-07-20

- Controle de Ponto passa a manter uma trilha de auditoria imutável para
  marcações, cadastros, inativações e reativações, disponível a gestores.

## 1.6.0.65 - 2026-07-19

- Controle de Ponto substitui a exclusão de funcionários por inativação segura:
  bloqueia login e novas marcações, preserva relatórios e histórico, e o banco
  passa a recusar exclusões diretas de registros, vínculos e empresas com ponto.

## 1.6.0.64 - 2026-07-19

- Controle de Ponto passa a tratar funcionário sem dias de trabalho marcados como
  **Escala variável**: pode registrar ponto em qualquer dia, não entra nos
  cálculos automáticos de faltas/atrasos e não recebe lembretes de ponto sem
  escala programada.

## 1.6.0.63 - 2026-07-19

- Gestão Mobile passa a usar traços geométricos centralizados nos controles de
  fechar e no botão central **Lançar**, mantendo o alinhamento visual em iPhone,
  Android e navegadores.

## 1.6.0.62 - 2026-07-19

- Os controles circulares de fechar e o botão central **Lançar** do Vendas
  Mobile passam a usar traços geométricos centralizados, mantendo o alinhamento
  visual em iPhone, Android e navegadores.

## 1.6.0.61 - 2026-07-19

- O rodapé do Vendas Mobile passou a ser uma camada persistente, mantendo-se
  ancorado ao fim da tela durante a rolagem e a navegação por Configurações.

## 1.6.0.60 - 2026-07-18

- No Vendas Mobile, pesquisas não são mais levadas de uma página para outra:
  ao mudar de tela, o campo de busca começa limpo.

## 1.6.0.59 - 2026-07-18

- No Vendas Mobile, o comprovante de um pagamento concluído retorna à tela que
  iniciou o lançamento: **Pagamentos** ou **Clientes**.

## 1.6.0.58 - 2026-07-18

- O painel administrativo ganhou filtros de perfis por situação de acesso e
  tipo (Empresa ou Pessoal), acionados pelo botão **Filtros**.
- Trials vencidos passam a ser classificados como **Expirados** no `/admin`,
  em vez de aparecerem apenas como inativos.

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

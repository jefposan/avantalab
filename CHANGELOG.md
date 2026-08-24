# Changelog

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

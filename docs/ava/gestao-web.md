<!-- ava-version: 3.2.0.381.01 -->

> Revisão 3.2.0.381.01. Ao abrir uma despesa pendente, use **Confirmar na data** para registrar o pagamento no dia e mês já lançados. **Aceitar hoje** usa a data atual. O visto salva a edição como prevista.

> Revisão 3.2.0.381: O menu lateral lista os módulos em ordem alfabética. Gerenciar módulos fica após o último módulo. Visual e Configurações expandem na coluna, que rola para mostrar as subopções. Ao expandir, os demais botões ficam inativos até recolher.

> Revisão 3.2.0.380: No menu lateral, use Buscar módulo para filtrar a lista em ordem alfabética. Assinatura fica no topo, Visual e Configurações abrem subopções e Tutorial fica no final.

> Revisão 3.2.0.379. Em Marketplaces → Configurações → Faturamento, Enviar faturamento para as receitas do mês começa ligado. A Gestão mostra Vendas Mkt Places em Receitas do mês, como uma linha automática separada do AvantaVendas. O total bruto soma pedidos confirmados em reais e vendas diretas confirmadas do módulo na competência de São Paulo. Desligar congela o valor já lançado. Religar atualiza o mês corrente. A integração começa no mês da instalação.

> Revisão 3.2.0.378. Em Marketplaces → Produtos cadastrados, abra o produto e vá a Publicação → Anúncios vinculados, use Ativar todos ou Pausar todos para os vínculos elegíveis do mesmo produto. A confirmação lista contas e anúncios, a ativação exige saldo Online conferido e o resultado aparece por conta. A edição de preço não muda a situação por comando. Se o Mercado Livre devolver um anúncio anteriormente ativo fora de venda, o lote de preço para e identifica o que foi confirmado.

> Revisão 3.2.0.377: DANFEs novos exibem a inscrição estadual real do destinatário; isento sem IE recebe ISENTO e não contribuinte sem IE recebe traço. O indicador 1/2/9 não é número de inscrição. XML e documentos já autorizados permanecem preservados.

> Revisão 3.2.0.376: Cada reserva pertence à sua nota. Nova nota usa a sequência ativa; retomada mantém sua própria reserva. Rascunho persistido usa a conferência do servidor, sem solicitar credenciamento demonstrativo após recarregar. As validações reais continuam no envio.

> Revisão 3.2.0.375: A preparação da NF-e usa trava privada do banco sem dar permissão de alteração dos retratos ao serviço. Rascunhos excluídos continuam bloqueados; não solicitar alteração cadastral para a antiga falha técnica de preparação.

> Revisão 3.2.0.374: A ponte da Gestão permite corrigir rejeições de três ou quatro dígitos, incluindo 1157, sem bloquear antes do servidor. Erros de campos preservam a orientação e o foco; falha de identificação pede reabertura da nota.

> Revisão 3.2.0.373: Previsão de entrega fica inativa em frete 1, 4 e 9. Trocar para modalidade incompatível limpa a previsão local; reabrir uma nota remove esse valor incompatível do formulário. Modalidades 0, 2 e 3 mantêm o campo disponível. O servidor impede XML com combinação proibida.

> Revisão 3.2.0.372: Quando a hora de saída fica vazia, o XML conserva o horário completo da emissão, sem zerar segundos. Datas iguais não ficam artificialmente anteriores por esse truncamento; horários manuais permanecem como preenchidos. Se o dia é igual e a hora é anterior, o aviso e o foco apontam Hora da saída; se o dia é anterior, apontam Data de saída.

> Revisão 3.2.0.371: Retornos SEFAZ de três ou quatro dígitos são preservados e uma rejeição libera a correção na própria nota. Tentativa com ausência confirmada por consulta 217 permite editar e salvar sem mudar o número; envio incerto continua protegido.

> Revisão 3.2.0.370: O leitor da autorização interpreta o XML por estrutura, namespace e entidades XML. Lote 104 exige resultado individual válido. Erros de leitura permanecem visíveis, sem serem substituídos por 217; autorização e rejeição seguem seus resultados reais.

> Revisão 3.2.0.369: Retorno 217 ou falha de comunicação não destaca o campo Número como inválido. A conferência preserva o retorno individual da autorização, inclusive 204/539, sem substituí-lo por 217 consultado depois; autorização confirmada continua prevalecendo.

> Revisão 3.2.0.368: O retorno da emissão permanece na conferência mesmo após assinatura ou processamento. Retorno 217 aparece como Não recebida pela SEFAZ; dados assinados ficam preservados. Salvar e emitir segue a mesma tentativa protegida. Somente autorização abre documentos.

> Revisão 3.2.0.367: Emitir nota é a única entrada para a conferência completa, com Salvar, Salvar e emitir e Cancelar. A assinatura usa os dados e a preparação da mesma revisão, incluindo consumidor final, sem reaproveitar validação antiga em revisão pendente.

> Revisão 3.2.0.366: Salvar e emitir mantém o editor aberto durante a revisão e o envio. O resultado utiliza a versão confirmada pelo servidor; falhas permanecem visíveis com foco no campo e autorização abre os documentos.

> Revisão 3.2.0.365: No pedido e na emissão da nota, o lápis à direita do cliente abre o cadastro completo em popup. Salvar atualiza o cliente sem sair do formulário nem perder itens e valores. Requer permissão de editar clientes.

> Revisão 3.2.0.364: Salvar guarda a revisão da nota com pendências e confirma sem preparar XML nem transmitir. Salvar e emitir valida a revisão, informa a condição fiscal incompatível e direciona ao campo com foco, rolagem e destaque. Uma revisão salva com pendências não pode ser assinada sem nova validação.

> Revisão 3.2.0.363: sem impacto operacional; reconciliação das fontes publicadas com a main, sem publicação nem execução de SQL.

> Revisão 3.2.0.362: Pendências da emissão Web levam ao campo correspondente com foco, rolagem, destaque e mensagem associada. Seções de detalhes são abertas para exibir o campo. Dados digitados são preservados.

> Revisão 3.2.0.361: Emissão da NF-e em blocos integrada ao perfil ativo. A lista de preços padrão pode ser definida no cadastro do cliente e alterada na nota; com itens, escolher recalcular ou preservar preços. Mensagens padrão pertencem à empresa e têm destino nota/fisco/interno. Mensagem interna nunca compõe XML/DANFE. Transporte, volumes, datas, referência, retenções e detalhes são validados no servidor e incluídos no XML quando informados. A emissão continua em homologação; não cria receitas nem movimenta estoque automaticamente.

> Revisão 3.2.0.360: Prévia local da emissão em /vendas-lab/emissao, organizada em blocos e com dados demonstrativos. Não orientar como emissão real: mensagens/rascunho ficam na página e os novos campos ainda não foram ligados ao XML ou aos cadastros reais. Sem publicação nesta etapa.

> Revisão 3.2.0.359: Ações da nota oferece Editar nota separado de Emitir nota. Para NF-e ainda não enviada com numeração reservada, Editar abre a página completa preenchida; Salvar mantém número e origem e não transmite. Notas autorizadas e envios em andamento não permitem edição.

> Revisão 3.2.0.357: Pedido e nota exibem itens em duas linhas compactas. O lápis abre o cadastro completo do produto no perfil atual; salvar mantém as quantidades, preços e descontos da operação. Dados fiscais inferiores são informativos.

> Revisão 3.2.0.353: Marketplaces: pedidos já postados, coletados ou em centro de distribuição entram em Em trânsito e não devem gerar aviso de despacho pendente. Resolver e Conferir saldos mantêm o fluxo existente. A mesma divergência de estoque continua sendo consultada automaticamente, com intervalo de 30 minutos após repetição, sem inflar o contador de tentativas; mudança de saldo ou confirmação explícita retoma o processamento. Ajuste verificado no ML que alcança ou ultrapassa o alvo antecipa a conferência. Não repor unidades por diferença sem confirmação. Nenhuma mudança no fluxo fiscal.

> Revisão 3.2.0.351: Ao corrigir uma nota rejeitada, alterar CFOP cria exceção somente nessa nota. Não modifica o cadastro do produto nem o padrão da empresa; a UF de destino e os demais requisitos fiscais continuam sendo validados.

> Revisão 3.2.0.350: Nota rejeitada: Corrigir nota abre os dados do documento para alterações. Salvar alterações registra revisão fiscal sem enviar e sem modificar pedido/estoque/receitas; série e número são preservados. A seguir abra a conferência para Salvar e emitir. PIX por chave ou QR fixo usa a opção explícita de estático. Não orientar troca do pagamento para burlar rejeição; cobrança dinâmica requer detalhes reais da transação nos campos apresentados.

> Revisão 3.2.0.349: Corrigida a falha interna “elemento raiz NFe” na validação estrutural do XML compacto. Não orientar alteração de cadastro, número ou série para esse erro. O fluxo de conferência e Salvar e emitir permanece igual.

> Revisão 3.2.0.348: A conferência de nota rejeitada usa os dados já validados no servidor; cadastros locais de demonstração não geram bloqueio de credenciamento. O servidor valida toda correção e envio.

> Revisão 3.2.0.347: A rejeição 588 é técnica, por formatação do XML. Abra a nota e confirme Salvar e emitir; o emissor corrige o formato sem pedir alteração em produto/tributação e preserva série, número e histórico. Salvar ou Cancelar não transmite.


> Revisão 3.2.0.346: Em Vendas e Serviços, abra a nota e use Salvar, Salvar e emitir ou Cancelar. Não há etapa de consultar envio. Autorização mostra DANFE/XML e compartilhamento; rejeição/falha apresenta motivo na conferência. Situação da nota abre o Portal Nacional no ambiente da nota, com chave para copiar.

> Revisão 3.2.0.345: Se a consulta oficial retorna 217 para envio sem recibo/autorização, a nota mostra Envio não recebido pela SEFAZ e Retomar emissão. O número e o XML são preservados; somente nova confirmação Salvar e emitir transmite. Falta de resposta não libera reenvio.

> Revisão 3.2.0.344: Em Vendas e Serviços, abrir uma nota mostra o resultado e os documentos salvos. Notas autorizadas permitem baixar/compartilhar sem consulta externa. Verificar envio é reservado à comunicação sem confirmação; não retransmite nem muda faturamento/estoque.

> Revisão 3.2.0.343: sem impacto operacional; preservação da versão imutável do protocolo corrigida para concluir os documentos de Vendas e Serviços Web.

> Revisão 3.2.0.342: Em Vendas e Serviços, Salvar e emitir conclui a conferência, o envio e a consulta do retorno na mesma operação. A autorização confirmada abre o card da nota com chave, protocolo, DANFE e XML disponíveis para baixar ou compartilhar conforme as permissões. O ícone fiscal do pedido e Consultar situação abrem esse mesmo resultado. Rejeições mostram o motivo e a revisão; falha de comunicação não confirma emissão e exige consultar a mesma nota antes de reenviar. O compartilhamento prepara o arquivo protegido e depois permite escolher o aplicativo; navegador sem suporte baixa o arquivo. O cancelamento ordinário paulista exige autorização dentro de 24 horas e confirmação com justificativa; fora do prazo, seguir procedimento fiscal específico. Somente homologação está liberada.

> Revisão 3.2.0.341: Se a transmissão falhar, a conferência informa a etapa e uma referência segura do erro e oferece Consultar situação da nota. Falha interna no registro da fila não se corrige alterando o cadastro fiscal. Consulte a nota existente antes de tentar novamente; o mesmo número e XML assinado permanecem preservados. Se já houver envio registrado ou autorização, não crie outra nota nem force retransmissão.

> Revisão 3.2.0.340: No ajuste de série e numeração da NF-e, Série e Próximo número são campos de digitação numérica com conteúdo centralizado. Série não usa mais uma lista. Informe a série adotada pela empresa e o próximo número livre; continuam válidas as proteções da numeração e o ambiente de homologação indicado no card.

> Revisão 3.2.0.339: Em Ajustes → Empresa e notas → Dados para emissão, use Configurar série e numeração. A mensagem Configure uma série ativa antes de confirmar a emissão também oferece esse atalho no card da nota. O editor consulta o perfil no servidor; selecione a série numérica e informe o próximo número livre. As opções de série não são tipos de nota nem naturezas de operação; faixas especiais não são oferecidas neste fluxo. O card identifica homologação sem valor fiscal. Não existe numeração inicial presumida quando falta configuração. O salvamento não emite a nota; volte à conferência e use Salvar e emitir quando desejar. Alterações concorrentes, reservas e inutilizações são protegidas.

> Revisão 3.2.0.338: Popups bloqueiam a rolagem das páginas de fundo, inclusive nos módulos internos de Vendas e Serviços. Somente o conteúdo interno pode rolar. Com janelas sobrepostas, o bloqueio permanece até fechar a última; depois a posição anterior da página é restaurada. Menus Novo e navegação sobreposta também mantêm o fundo parado.

> Revisão 3.2.0.337: Em Vendas e Serviços, Emitir nota abre a conferência com Salvar, Salvar e emitir e Cancelar. Salvar guarda o rascunho sem transmitir. Salvar e emitir valida, numera, assina e envia em uma única ação, somente em homologação e com acesso fiscal. Cancelar fecha a tentativa sem cancelar a NF-e, permitindo retomada. Preparações antigas canceladas apenas no navegador podem ser retomadas; notas canceladas fiscalmente permanecem somente para consulta. Notas já enviadas/autorizadas não são reenviadas. A nota avulsa segue as mesmas ações; emitir não fatura nem movimenta estoque.

> Revisão 3.2.0.336: Ao expandir Dados fiscais dos itens ou Histórico fiscal nos detalhes da nota, o popup posiciona o bloco para mostrar o conteúdo aberto. Ao recolher, mantém a posição. A rolagem fica dentro do popup e respeita movimento reduzido.

> Revisão 3.2.0.335: Em Notas Fiscais, Emitir nota abre a conferência. Para o rascunho de um pedido, Preparar nota grava o retrato fiscal no perfil sem faturar nem movimentar estoque; use a preparação e a validação disponíveis até a confirmação da emissão. A série/número e o envio continuam exigindo confirmação explícita e acesso fiscal. Revisar emissor abre cadastro e credenciamento e mostra a pendência específica. Ver serviço apresenta a situação do executor; Ver certificado abre o certificado. Certificado ativo não confirma credenciamento do emissor. O faturamento posterior reutiliza a nota vinculada ao pedido.



> Revisão 3.2.0.334: Os cabeçalhos e ações primárias dos popups de Vendas e Serviços adaptam a cor do texto à cor primária usando a mesma regra da Gestão: branco em tons fortes/escuros e tinta escura em cores claras. A cor do perfil continua inalterada e os selos conservam sua própria apresentação.

> Revisão 3.2.0.333: Os popups de Vendas e Serviços seguem o menu de ações aprovado: cabeçalho na cor do perfil, conteúdo compacto e rodapé sempre acessível. Nos menus de ações, escolha uma ação disponível destacada; condições informam o que falta ou a falta de acesso, e opções previstas ficam desativadas. Cancelamento ou estorno ficam separados no rodapé. Formulários longos rolam somente no conteúdo, mantendo título e ações acessíveis. A organização visual não altera permissões, validações ou efeitos financeiros, fiscais e de estoque.

> Revisão 3.2.0.332: Na lista de operações de Vendas e Serviços, aponte ou use Tab em cada ícone para consultar somente seu estado atual: faturamento, estoque ou nota fiscal. Cada indicador tem ajuda e foco independentes.



> Revisão 3.2.0.331: Revisar para emissão abre uma lista de pendências com ações específicas, sem repetir a lista de verificações prontas. Regra fiscal já revisada e correspondente não é apresentada como problema. Editar produto abre o cadastro daquele produto em Custos, com o retorno à conferência da mesma nota; não altera automaticamente tributos nem valores. A conferência consulta o estado atual do executor, certificado, catálogo e regras, preservando valores, origem e identidade do documento. Emissões numeradas, assinadas, enviadas ou autorizadas conservam o retrato fiscal. Verificar serviço abre o certificado e diagnóstico existentes; Revisar regras abre a matriz publicada; cada ação respeita suas permissões. Abrir/revisar não fatura, não baixa estoque, não reserva número nem transmite a nota.

> Revisão 3.2.0.330: Notas fiscais → Abrir detalhes prioriza cliente, itens, valores e pendências reais. Dados fiscais dos itens e Histórico fiscal iniciam recolhidos, com o controle oficial Expandir/Recolher; códigos permanecem consultáveis sem abreviações cortadas. Campos técnicos e avisos genéricos não ocupam a tabela de itens. Subtotal desconta o desconto unitário; frete, seguro, outras despesas e desconto geral aparecem quando existentes. A conferência exige o CFOP correspondente à UF da operação, mantendo bloqueios fiscais, permissões e confirmação de emissão. NF-e do Simples em 2026 não exige os campos IBS/CBS por ausência genérica; outros contextos mantêm exigência. A atualização da Tridium marca todos os produtos de todos os catálogos, inclusive inativos, para herdar os padrões fiscais da empresa; preserva NCM, CEST, códigos guardados, dados comerciais e históricos e guarda a opção anterior. Depois, Personalizar neste produto continua disponível. A atualização de banco foi aplicada aos 343 produtos atuais da Tridium, preservando o cadastro excluído e o backup da opção anterior.

> Revisão 3.2.0.329: Em Custos e Precificação → Produtos e serviços → cadastro, Configuração tributária inicia em Usar dados fiscais da empresa. Origem, CST/CSOSN, PIS, COFINS e IBS/CBS são consultados no perfil empresarial; CFOP segue a regra fiscal publicada correspondente à operação e à UF do cliente. NCM, CEST e unidade permanecem no produto. Personalizar neste produto permite exceções; campos vazios continuam usando o padrão da empresa ou da operação. Voltar a Usar dados fiscais da empresa preserva as exceções guardadas, mas deixa de aplicá-las. Códigos manuais/importados existentes são preservados. A Gestão exibe os valores efetivos e encaminha a edição ao cadastro oficial em Custos. A emissão exige os dados e regras válidos; o sistema não inventa códigos ausentes nem transmite notas ao alterar cadastros.

> Revisão 3.2.0.328: Em Menu → Configurações → Perfil, o destaque Perfil ativo oferece Editar cadastro do perfil ativo. O botão abre o mesmo cadastro completo da lista, incluindo dados fiscais, com as mesmas permissões de administrador ou gestor master. Editar dados básicos e acesso continua sendo uma ação distinta.

> Revisão 3.2.0.327: Em Revisar regras fiscais, Publicar regras fiscais verifica todas as pendências antes do envio e leva ao primeiro campo inválido, selecionando a regra correspondente. A lista mostra cada pendência e permite ir diretamente ao campo, com destaque e foco acessível. Responsável, data válida, confirmações e Regra revisada são verificados pela mesma função na tela e no servidor. Regras desativadas ou de tipos fora do escopo podem ficar sem CFOP; reativá-las restaura a obrigatoriedade. Nunca marcar revisão sem a conferência fiscal. A regra geral é uma reserva de enquadramento e não substitui a configuração dos cenários efetivos.

> Revisão 3.2.0.326: No menu de ações do pedido, as opções disponíveis aparecem coloridas em três colunas no desktop e os recursos previstos ficam em cinza, separados. Contas a receber antes de faturar indica Disponíveis após o faturamento; falta de permissão indica Sem acesso, sem classificar como recurso futuro. Cancelar pedido fica separado no rodapé e continua abrindo confirmação. Em telas estreitas, as opções se reorganizam e podem rolar para manter todas acessíveis. Editar pedido segue o fluxo direto da versão 3.2.0.325, com confirmação do servidor antes de abrir o formulário completo. O menu não executa ações durante a sua abertura.

> Revisão 3.2.0.325: Em Vendas → Ações → Editar pedido, o sistema reabre confirmados ou em separação no servidor e leva diretamente ao formulário completo do mesmo pedido, sem o card Abrir edição. Eventuais reservas são liberadas; revise, salve e confirme novamente. O editor só abre após confirmação do servidor e preserva cliente, itens, valores, condições e observações. Falha de acesso mantém o pedido intacto e aparece em alerta de erro, sem aparência de sucesso. Faturamento e cancelamento mantêm suas confirmações. Faturados continuam protegidos contra edição direta.

> Revisão 3.2.0.324: Substitui a prévia 3.2.0.323. Os três indicadores ficam juntos à seta de ações, na ordem Faturamento, Estoque e Nota fiscal, sem coluna própria nem símbolos sobrepostos. Preenchido indica conclusão, contorno indica pendência e a devolução usa retorno no próprio desenho. Aponte ou use Tab no grupo para consultar os três estados. Faturado não é recebido; nota pode permanecer autorizada após cancelar a venda e a ajuda indica revisar o fiscal. Estoque liberado e devolvido conserva sua identificação após recarga. Tipo fica abaixo do número, vendedor nos detalhes. As ações e os efeitos comerciais/fiscais não mudam.

> Revisão 3.2.0.322: Em Vendas e Serviços, use Notas Fiscais no menu esquerdo para consultar notas emitidas e rascunhos do perfil. Busque por número, série, cliente, CPF/CNPJ ou chave e filtre por tipo e situação. A seta de ações de cada documento oferece somente ações pertinentes e autorizadas: detalhes, preparação/revisão/continuação, consulta da situação, XML e DANFE disponíveis e cancelamento fiscal. Notas autorizadas ou em processamento não permitem cancelar como rascunho nem emitir novamente. Configurações fiscais reúne cadastro, certificado e séries; Nova nota fiscal abre o fluxo avulso. Emitir nota não fatura nem movimenta estoque; o ambiente fiscal continua exclusivamente em homologação. O nome de navegação Notas Fiscais substitui Central Fiscal nas orientações anteriores.

> Revisão 3.2.0.321: Novo → Nota fiscal (NF-e), ou Nova nota fiscal na Central Fiscal, abre a NF-e avulsa com destinatário, produtos, preços, descontos, frete e pagamento. Preparar nota fiscal salva o documento independente na Central Fiscal; depois revise e use o fluxo fiscal de preparação/numeração/continuação. Não cria pedido, conta a receber, receita, reserva ou baixa de estoque. As informações de pagamento são fiscais, sem lançamento financeiro. O emissor vem do perfil ativo. A emissão segue somente em homologação, sem valor fiscal. A nota de um pedido continua vinculada ao pedido e sua emissão não refatura nem baixa estoque novamente.

> Revisão 3.2.0.320: Em Vendas, as ações de pedidos confirmados e em separação oferecem Editar pedido (retorna a rascunho e libera reservas), Faturar pedido (escolha Baixar estoque neste faturamento) e Cancelar pedido. Cancelar a venda é independente de cancelar a nota: faturados podem ser cancelados mesmo com NF-e autorizada. A venda sai do faturamento comercial, as parcelas em aberto são canceladas e somente estoque efetivamente baixado retorna. A nota, seus arquivos e sua situação fiscal permanecem preservados; a coluna Fiscal indica revisão pendente. Regularização fiscal é tratada separadamente na Central Fiscal e não é realizada automaticamente pelo cancelamento comercial. Recebimentos já realizados exigem estorno financeiro explícito. Faturamento gera contas a receber; entradas mensais refletem recebimentos líquidos. Não editar diretamente pedidos faturados.

> Revisão 3.2.0.319: Pedidos ainda salvos no servidor aparecem como Rascunho também após recarregar a página. Use a seta de ações → Continuar pedido para retomar o mesmo registro.

> Revisão 3.2.0.318: Em Vendas e Serviços → Vendas, abra as ações de um pedido em Rascunho e use **Continuar pedido**. O mesmo pedido será reaberto com seus dados preservados. **Salvar alterações** mantém o rascunho; **Confirmar pedido** grava as alterações antes de avançar a situação. O número e o vínculo com o perfil empresarial não mudam, e uma falha restaura o conteúdo anterior.

> Revisão 3.2.0.317: Em Vendas e Serviços → Vendas, o menu de ações de um pedido passa a caber integralmente na área visível, sem cortar títulos ou botões. Quando necessário, somente a lista de ações rola verticalmente; o cabeçalho e o botão Fechar permanecem acessíveis. As ações e os registros não foram alterados.

> Revisão 3.2.0.316: Vendas e Serviços mostra itens compactos e subtotal destacado. Controlar estoque neste pedido começa desligado no acesso integrado: permite confirmar e faturar com saldo zero, sem reservar ou baixar estoque no AvantaLab. Ative somente para controlar o saldo neste sistema; nesse caso, saldo insuficiente bloqueia a confirmação. A NF-e continua exigindo cadastro fiscal completo e opera somente em homologação, sem valor fiscal. Datas válidas de vencimento são aceitas no faturamento.

> Revisão 3.2.0.315: Catálogos aceitam vários ativos por destino. Vendas e Serviços e AvantaVendas são independentes. Desativar apenas oculta itens, sem excluir produtos. Produtos e serviços reúne automaticamente todos os catálogos ativos em Vendas e Serviços, sem filtro manual; nenhum ativo deixa a lista vazia. Excluir catálogo manual, com confirmação, desliga os dois destinos e retira seus itens de novas operações, sem transferência ao catálogo local. Preços, históricos e lançamentos anteriores são preservados. Catálogos de sistema são protegidos; catálogo excluído não pode ser reativado nem receber novos itens. Sem alteração de interface na Gestão Mobile.

> Revisão 3.2.0.309: Modelo Excel de despesas consulta os tipos atuais do perfil a cada download e atualiza a lista de reconhecimento, compartilhada pelos centros de custo. Se a consulta falhar, tente novamente; não é gerado modelo antigo. Nomes distintos, como Água e Água / Energia, não são associados por suposição.

> Revisão 3.2.0.308: Em Custos e Precificação → Tabelas de preços, Reajuste aplica um percentual ou valor adicional às tabelas ativas selecionadas. Informe o valor, marque os quadros desejados, confira as médias e a quantidade de preços e use Revisar antes de Aplicar reajuste. Somente produtos e serviços ativos e não excluídos são alterados. Na tabela principal, o preço padrão do cadastro é atualizado; em tabelas adicionais, valores antes herdados tornam-se preços próprios. Cada preço e o lote ficam registrados no histórico. A operação não altera automaticamente pedidos anteriores nem os preços independentes do AvantaVendas.

> Revisão 3.2.0.307: Em Custos e Precificação, Excluir cadastro realiza exclusão lógica. O item sai das listas, é desativado no catálogo e não aceita novos usos, mas composição, preços, versões de custos e lançamentos anteriores permanecem vinculados ao mesmo código nos históricos. O histórico identifica o item como Excluído. Inativar continua disponível quando a intenção for apenas suspender o uso e permitir reativação.

> Revisão 3.2.0.305: Em Vendas de Marketplaces, Imprimir abre diretamente a janela padrão do navegador/sistema com o PDF de duas páginas 100 × 150 mm (envio e DACE), sem popup próprio ou QZ Tray. Selecione a impressora, papel 100 × 150 mm e escala 100%, confirmando nessa janela. Baixar oferece PDF ou TXT térmico; ambos mantêm identificação por pedido/produto. A faixa de documentos está compacta; estados informativos ficam em Documentos fiscais e erros/pendências fiscais continuam visíveis. Abrir a janela ou baixar arquivo não confirma impressão física.

> Revisão 3.2.0.304: Na entrada da Gestão Web, credencial recusada pelo Auth é relida, renovada uma vez quando aplicável e validada remotamente. Sessão definitivamente encerrada volta ao login. Falha de rede/timeout não dispara limpeza automática. Entrar novamente na tela de erro reinicia somente as chaves locais de autenticação do projeto, sem apagar senhas do navegador, preferências ou dados do sistema; não encerra outros aparelhos. Tentar novamente continua disponível. Nenhum acesso é liberado apenas pelo cache.

> Revisão 3.2.0.303: Em Vendas de Marketplaces, Imprimir abre a prévia PDF térmica no navegador: duas páginas 100 × 150 mm, envio/QR e DACE resumida, sem controle. Imprimir em tamanho real 100%, papel 100 × 150 mm. TXT por pedido/produto permanece disponível. Sem QZ Tray; exige impressora instalada no computador. PDF fora do layout reconhecido gera erro, sem corte arbitrário. Não confirma impressão física.

> Revisão 3.2.0.302: Preços padrão por produto: referência do cadastro × Ideal inicia novas preparações Online (Mercado Livre/Magalu); referência × Médio preenche novos posts Saldão e é usada no PWA Ofertas quando não existe post salvo. Percentuais vêm das configurações do perfil. Preços explícitos do anúncio e posts salvos têm prioridade no seu canal. Post altera somente post/Saldão; não muda Online. Alterar referência manual muda a base dos padrões, sem sobrescrever preço de venda manual. Consultar/bipar reaproveita dados salvos, sem publicar anúncios. Revisão substitui a regra de ausência de preço da .291.

> Revisão 3.2.0.300: Em Vendas de Marketplaces, Baixar etiqueta térmica entrega diretamente o TXT, identificado pelo número do pedido e nome do produto. Não é necessário extrair ZIP; o controle PDF não acompanha. Abra/envie o TXT no utilitário da L42DT como já configurado. Download não confirma impressão; impressão direta ainda não existe.

> Revisão 3.2.0.299: sem impacto operacional na Gestão Web; desempate por inclusão ajustado somente na Gestão Mobile.

> Revisão 3.2.0.297: O PWA público usa Saldão Aline como nome de instalação inclusive em links de ofertas compartilhadas; prévias sociais mantêm o produto; ícones já criados não são renomeados automaticamente.  Ofertas Web/PWA centraliza Entrar no grupo quando Instalar não aparece, sem mudança operacional nos demais ambientes.  Na lista de Vendas Web, a rolagem continua pela página ao atingir o início ou fim dos detalhes.  Cancelamento de venda direta: quantidade compacta, motivo e ações juntos em telas largas, com adaptação em telas pequenas. Quantidade zero continua cancelando sem reposição; somente devolução física informada repõe estoque.

> Revisão 3.2.0.296: No catálogo Ofertas: cabeçalho branco opaco permanece na borda superior e respeita a área segura do aparelho. Sem tarja adicional ou alteração de contatos e ações. Validar o efeito visual no iPhone após a publicação.

> Revisão 3.2.0.295: No catálogo público, Contato 1/2 do produto preenchem WhatsApp com saudação, pedido de oferta, nome e link do produto. No flutuante a mensagem apenas identifica a origem no Ofertas Saldão Aline. O cliente envia, nunca é automático. Voltar ao topo aparece acima do WhatsApp após rolar e preserva busca/filtros. Posts existentes e links do grupo não mudam.

> Revisão 3.2.0.294: Catálogo de ofertas com topo compacto: logo/grupo/instalar em uma faixa, título centralizado, busca sem rótulo visual e estoque/ordenar na mesma linha. Filtros Todos, Produto novo e Produto com detalhes ou avaria conservam os nomes completos e as ações anteriores. Sem alteração no funcionamento de compra, compartilhar, copiar ou consultar estoque.

> Revisão 3.2.0.293: O link geral do catálogo usa a imagem Saldão Aline Ofertas na prévia de compartilhamento; links por produto preservam a foto do produto. No celular os três filtros ficam na mesma linha, com texto longo dentro da pílula. Demais ações permanecem iguais.

> Revisão 3.2.0.292: No catálogo público, Compartilhar esta oferta abre o menu nativo no celular; no Web, Copiar link da oferta copia diretamente e confirma no botão. O link abre aquele produto; Ver todas as ofertas volta à lista. Comprar online mostra marketplace/preço sem nomes de contas. Topo com logo e botões Instalar/Entrar no grupo lado a lado no celular. Filtros Produto novo (Online) e Produto com detalhe ou avaria (Saldão); condição cadastrada continua visível, sem alteração de anúncios.

> Revisão 3.2.0.291: Catálogo público em /ofertas/saldao-aline, sem login: buscar produto, filtrar Online/Saldão, ordenar A–Z ou menor preço. Online escolhe conta e preço antes de abrir o anúncio; Saldão tem Contato 1 e Contato 2 no WhatsApp. Estoque atualizado periodicamente enquanto visível, sem somar contas. De é referência consultada; Por é preço do anúncio Online ou do post salvo Saldão, sem regra percentual. Se faltam preço/condição, consultar vendedor. Instalar usa PWA próprio; não há venda, reserva nem alteração de saldo nesta página.

> Revisão 3.2.0.290: AvantaPreços: o texto do post agora inclui Condição. Opções compartilhadas no Online e nos estoques de imagem: Novo, Usado, Recondicionado, Avaria e Com detalhe. No link Online, escolha explicitamente a condição; Avaria ou Com detalhe exigem uma observação em Detalhes. A condição informada vale somente para o post, sem mudar o anúncio no marketplace. Posts/imagens salvos não são regenerados automaticamente; De/Por continuam sem regra percentual.

> Revisão 3.2.0.284: Substitui a orientação percentual da 3.2.0.283: o post Online usa De=média consultada e Por=preço anunciado na conta escolhida. Qualquer preço anunciado válido é aceito; não calcular 10%, não exigir igualdade com sugestão e não orientar mudar o anúncio para gerar link. Legenda e formulário sem percentual/desconto; conta, anúncio ativo, saldo e URL oficial continuam conferidos. Saldão/imagem permanece igual.

> Revisão 3.2.0.283: AvantaPreços → Criar post: saldo Online abre link de compra, saldo Saldão mantém imagem, e saldo nos dois permite escolher. Online exige conta/anúncio; De é a média consultada e POR APENAS é 90% dessa média. Divergência com o preço anunciado bloqueia o link e orienta ajustar em Anúncios; nunca altera preços automaticamente. Gerar confere novamente. Compartilhar link usa texto e URL oficial, com Copiar link e descrição como alternativa. Posts em imagem existentes são preservados.

> Revisão 3.2.0.282: Uma conta já em sincronização não gera aviso de desconexão ou falha imediata. O módulo aguarda em segundo plano e faz até quatro retomadas de 30 segundos, sem bloquear as outras contas. Falhas reais ou ocupação persistente continuam visíveis.

> Revisão 3.2.0.281: Contas conectadas mostra contas, ações e indicador durante a atualização. Sucesso não deixa mensagem persistente; resumos de catálogo e itens preservados não aparecem no card. Falhas e autorização insuficiente continuam visíveis. A complementação permanece em segundo plano.

> Refinamento 3.2.0.280: EAN e pesquisa permanecem fixos abaixo do título durante a rolagem do Novo anúncio; a prévia ocupa o espaço livre abaixo das duas faixas.

> Refinamento 3.2.0.280: Novo anúncio tem uma única rolagem contida para as duas colunas, com cabeçalho fixo e prévia centralizada. O fim da rolagem não avança para Vendas ou Anunciados; use os atalhos para essas seções.

> Refinamento 3.2.0.280: a conferência Preparar conteúdo para qualidade tem título destacado, respiro e separação visual. Os indicadores e as ações Completar permanecem iguais.

> Refinamento 3.2.0.280: removido o texto de orientação sobre buscar nota acima de 70 no Novo anúncio; checklist de conteúdo preservado.

> Refinamento 3.2.0.280: removida a orientação textual abaixo da área de fotos do Novo anúncio; inclusão de imagens e validações permanecem.

> Revisão 3.2.0.280: Marketplaces > Novo anúncio: prévia compacta mostra foto junto ao nome e EAN, faixa de preço/quantidade e dados da publicação em duas colunas. Abra Descrição e características para o caminho completo da categoria e os dados longos. No Magalu, o expansor mantém ficha técnica e orientação de preparação. Prévia continua acompanhando a rolagem; envio e validações não mudaram.

> Revisão 3.2.0.279: Marketplaces: pontuação abaixo de 70 não gera aviso de pendência. Acompanhe a nota visualmente no anúncio e use a revisão/objetivos quando desejar; medidores e filtros de qualidade permanecem disponíveis. Avisos reais de estoque, vendas, vínculos e sincronização continuam ativos.

> Revisão 3.2.0.278: Marketplaces > Conferir saldos: anúncios User Products podem ser sincronizados após confirmar origem única e todos os vínculos do mesmo produto/conta. Full, depósitos, variações, kits e vínculos incompletos continuam bloqueados com o motivo por conta. Atualizar a página não autoriza reposição antiga por si só; a sincronização concluída exige retorno por conta.

> Revisão 3.2.0.277: Marketplaces > Novo anúncio: use a rolagem da página para todos os preenchimentos. O cabeçalho permanece sob a navegação e a prévia flutua centralizada na altura útil; em telas estreitas ou muito baixas ela acompanha o fluxo da página. Continua havendo folga após os botões finais.

> Revisão 3.2.0.276: Marketplaces: entrada confirmada no Online autoriza o envio do mesmo saldo às contas vinculadas; releituras preservam a autorização ainda pendente da mesma revisão. O envio só está concluído após confirmação por conta. Migração desta correção aplicada ao banco de produção.

> Revisão 3.2.0.275: Dashboard: sincronização automática de configurações ocorre em segundo plano, sem tarjas de salvamento ou sucesso no menu. Falhas ao salvar continuam informadas.

> Revisão 3.2.0.274: Marketplaces: Anunciados > Ver anúncios mostra Editar todos os anúncios na faixa de Estoque Online compartilhado, acima das contas. Abre uma única revisão com preço, informações, fotos e ficha técnica editáveis. Só campos alterados são enviados, após conferir todas as contas. Preço pode ser comum sem alterar a referência; diferenças existentes não são igualadas ao abrir. Bloqueios de catálogo e estoque compartilhado permanecem. O antigo Editar preços de todas as contas dentro do editor individual foi removido. A confirmação é única, com resultado por campo/conta e interrupção em falha ou pendência. Após confirmação de cada conta, preço anunciado e linhas são atualizados imediatamente, sem recarregar nem fechar a edição. Consultas anteriores não restauram o preço antigo. Confirmação pendente não altera o preço visível como se fosse sucesso; referência de precificação é independente.

> Revisão 3.2.0.273: Marketplaces: ao editar o Preço de venda de um anúncio vinculado, Editar preços de todas as contas abre um único valor e a lista completa de destinos do mesmo marketplace. Confere vínculos, preços e permissões de todas as contas antes do envio; preserva o preço de referência e os demais dados. Mostra confirmação por anúncio e interrompe em falha ou confirmação pendente, sem repetir automaticamente. Recarregar preços mantém o valor digitado e consulta novamente. A revisão individual ignora horários, estimativas e textos auxiliares; alterações reais e permissões continuam protegidas.

> Revisão 3.2.0.272: Marketplaces: em Anunciados, o cabeçalho compara o preço atual (ou faixa entre contas) com Mínimo, Médio e Ideal calculados pela referência cadastrada e percentuais da empresa. Se indisponíveis, mostra traços. Qualidade do anúncio identifica a barra; a situação aparece abaixo. Editar preços continua em Ver anúncios > Editar na conta > Preço de venda > Salvar alterações.

> Revisão 3.2.0.271: Marketplaces: Revisar anúncio permite rolar todo o conteúdo até os botões finais, inclusive com os campos expandidos. Cabeçalho permanece acessível; pontuação e publicação mantêm o comportamento anterior.

> Revisão 3.2.0.270: Publicação de catálogo preserva a descrição oficial e conclui com o popup existente. Não tenta regravar a descrição após criar o item. Falha parcial mostra o diagnóstico na revisão por conta; não repetir envio de anúncio já criado.

> Revisão 3.2.0.269: Preparação reconhece origem oficial mesmo quando a ficha omite GTIN, somente após busca exata do EAN com resultado único da mesma origem e identidade/variantes comprovadas. Vale para todos os produtos e contas; sem regra por cafeteira ou código específico. Anúncios comuns mantêm o limite da categoria.

> Revisão 3.2.0.268: Preparar anúncio reconhece também a origem de catálogo registrada pela pesquisa Web/AvantaPreços, mediante EAN e variante sem conflito reconfirmados. Abrir novamente a preparação carrega a ficha oficial. Origem ambígua ou não comprovada mantém o cadastro local e o limite da categoria.

> Revisão 3.2.0.267: Nome oficial de ficha de catálogo ML não é bloqueado localmente pelo limite do título comum. O ML continua validando o envio. Nome longo em página de catálogo não significa que anúncios comuns aceitam o mesmo comprimento; cadastro local sem vínculo de catálogo mantém a regra da categoria.

> Revisão 3.2.0.266: Pesquisa por EAN para cadastro usa nome compacto de até 60 caracteres quando marca/modelo permitem identificar com segurança, preservando variantes. Não corta o modelo; quando não houver identidade segura ou os essenciais excederem o limite, revisar o nome. Não altera automaticamente nomes de cadastros existentes.

> Revisão 3.2.0.265: Produtos cadastrados e Estoques oferecem botão Copiar nome e EAN ao lado do nome. Copia ambos para a área de transferência sem expandir a ficha; ausência de EAN é indicada como Não informado.

> Revisão 3.2.0.264: Card de publicação em andamento sem frase redundante; confirmação de sucesso com texto centralizado. Sem alteração dos passos de publicação.

> Revisão 3.2.0.263: Novo anúncio reserva espaço após os botões finais na coluna de preenchimento para alcançá-los no centro da tela pela rolagem; sem alteração das ações.

> Revisão 3.2.0.262: Novo anúncio deixa de exibir avisos de sucesso no rodapé ao salvar o nome ou a ficha. Salvamento automático e validações continuam funcionando.

> Revisão 3.2.0.261: No Novo anúncio, o limite de caracteres acompanha a digitação; nome válido é salvo automaticamente ao sair do campo. Se houver falha, Publicar tenta salvar novamente. Após salvar, confira o frete e marque a confirmação antes de publicar.

> Revisão 3.2.0.260: em Vendas → Documento e etiqueta, escolha Térmica L42DT — 100 × 150 mm e use Baixar etiqueta térmica. No Windows, extraia o ZIP oficial do Mercado Livre e abra o TXT/ZPL no Direct Print da Elgin/Bematech ou utilitário compatível, selecionando a L42DT e papel 100 × 150 mm, em tamanho original. PDFs auxiliares ficam separados no pacote. Download não confirma impressão. Instalação do driver/utilitário e teste físico são feitos no computador Windows. Para impressora comum, escolha PDF original; não reduza o PDF A4 para tentar obter a etiqueta térmica.

> Revisão 3.2.0.259: Categoria no Novo anúncio do Mercado Livre apresenta nome e caminho oficial completo, permitindo distinguir nomes iguais em áreas diferentes. O resumo também apresenta o caminho. Se o nome ou caminho não puder ser consultado, revalide; não escolha pelo código.

> Revisão 3.2.0.258: Preparar anúncio posiciona o card Novo anúncio abaixo da navegação de marketplaces, sem esconder seu início; sem alteração dos passos de publicação.

> Revisão 3.2.0.257: Publicar abre o popup Publicando enquanto aguarda o marketplace. No sucesso, mostra Publicação concluída e fecha em 2,5 segundos; em erro, fecha e direciona ao campo ou diagnóstico. Textos operacionais foram retirados do resumo lateral.

> Revisão 3.2.0.256: botões Cancelar anúncio, Revalidar dados e Publicar centralizados no Novo anúncio; sem impacto operacional.

> Revisão 3.2.0.255: ao clicar em Publicar sem marcar a confirmação, a área do checkbox recebe destaque vermelho e foco. Marque a confirmação após conferir o produto para retirar o aviso e continuar.

> Revisão 3.2.0.254: Novo anúncio não exibe mais a tarja de ficha preparada ao abrir a preparação ou trocar a conta. Erros e confirmação de publicação continuam visíveis.

> Revisão 3.2.0.253: produto sem anúncio exibe Preparar anúncio acima de Expandir com qualquer saldo Online. O botão da seção Publicação mantém o verde anterior. Preparar não publica; envio ainda exige as validações de saldo e das contas.

> Revisão 3.2.0.252: na lista de Estoques, a busca por nome, código ou EAN e Ler EAN ficam na mesma linha de Online/Saldão no desktop, com largura reduzida. Em telas estreitas seguem abaixo. O título de pesquisa foi removido.

> Revisão 3.2.0.251: espaçamento e centralização das pílulas do produto; sem impacto operacional.

> Revisão 3.2.0.250: nos Produtos cadastrados, **Preparar anúncio** e **Expandir** têm a mesma pílula; o preparo usa apenas texto compacto. O critério que mostra ou oculta a ação permanece o mesmo.

> Revisão 3.2.0.249: nos Produtos cadastrados, um produto sem estoque Online informado e sem anúncio mostra **Preparar anúncio** acima de Expandir. A ação abre a preparação, mas publicar continua exigindo a confirmação do saldo Online. Quando houver anúncio vinculado, o atalho não aparece.

> Revisão 3.2.0.248: ao preparar um produto no Novo anúncio, as referências Mínimo, Média e Ideal aparecem no cabeçalho, à direita do título. Em tela estreita elas passam para a linha seguinte; os valores, cálculos e a publicação não mudam.

> Revisão 3.2.0.247: Depois de selecionar as contas no Novo anúncio, escolha **Publicações iguais** para usar o preço e os dados principais em conjunto, ou **Publicações distintas** para abrir os cards de preço e frete por conta. O frete ainda é validado por destino; uma pendência abre a revisão individual antes de publicar.

> Revisão 3.2.0.246: Diagnóstico administrativo de preços em /marketplaces/diagnostico-precos: informe a empresa e EAN/modelo, use Testar contas sem IA. Exige gestor/administrador, consulta até quatro contas e mostra respostas de autenticação, catálogo, busca e ofertas. Não altera anúncios, referências ou a pesquisa atual; médias da amostra não foram validadas como equivalentes.

> Revisão 3.2.0.245: No Novo anúncio, os avisos e detalhes técnicos da preparação aparecem em uma faixa própria abaixo do painel. Leia o retorno antes de ajustar ou publicar; as ações e a prévia permanecem separadas.

> Revisão 3.2.0.244: Em Novo anúncio do Mercado Livre, marque **Todos** para selecionar todas as novas contas disponíveis de uma vez. Contas já anunciadas ou com envio pendente continuam bloqueadas; depois confira a validação e o frete de cada destino antes de publicar.

> Revisão 3.2.0.243: Ao preparar anúncio, use Conta, EAN com leitor ou Nome, marca ou modelo e o único botão Pesquisar. Digitar em uma pesquisa limpa a outra. Cancelar limpa a preparação; em telas estreitas os campos se empilham.

> Revisão 3.2.0.242: aviso de pesquisa de preços centralizado no card do produto; sem impacto operacional.

> Revisão 3.2.0.241: Ao preparar anúncio, o topo reúne Mínimo, Média e Ideal com base na referência salva do produto e nos percentuais configurados no perfil. O preço de venda digitado continua independente. A faixa fica fora da rolagem dos dados à esquerda; a prévia permanece à direita no desktop. Sem referência ou percentuais disponíveis, os valores ficam indisponíveis. Mercado Livre e Magalu usam o mesmo layout; em tela estreita as áreas se empilham.

> Revisão 3.2.0.240: Vendas, Anunciados, Estoque, Produtos cadastrados e Resultados compartilham uma única expansão: abrir um recolhe os outros quatro. Vale para cabeçalhos, rodapés e aberturas por busca, atalhos e pendências. Filtros e componentes permanecem montados ao recolher; o botão dos objetivos conserva o funcionamento da .239.

> Revisão 3.2.0.239: Em Qualidade do anúncio, os objetivos pendentes começam ocultos. Use Ver objetivos pendentes, à direita de Revisar anúncio, para expandir; Ocultar objetivos pendentes recolhe a seção. Ao fechar e reabrir o produto, os objetivos voltam ocultos. Revisão, consulta e publicação preservadas.

> Revisão 3.2.0.238: na revisão de anúncios, conflito anterior ao envio reconfere automaticamente os dados, preserva o rascunho e pede conferir/confirmar novamente. Falha parcial ou incerta continua interrompendo envios: use Conferir mantendo rascunho para ler o estado atual, sem reenvio automático. O motivo fica visível; mudanças reais de permissão e vínculo continuam protegidas. Qualidade por conta identifica anúncio, nota e horário do ML; o consolidado é a menor nota, não uma nota única do cadastro. Recarregar dados continua sendo a opção de reiniciar e descartar mediante confirmação.

> Revisão 3.2.0.237: correção interna preserva a coerência da ficha ao salvar o nome; fluxo operacional da .235/.236 mantido. Contador é ajuda; erro continua indicado separadamente.

> Revisão 3.2.0.236: nomes de fichas oficiais permanecem protegidos e não são reenviados ao salvar fotos/descrição da preparação. Para o caso Lenoxx na categoria Processadores MLB31674, limite consultado de 60 caracteres; corrigir o nome local de 67 caracteres e salvar antes de publicar. Conferência por conta da .235 preservada.

> Revisão 3.2.0.235: na preparação de produto local, Conferir cadastro alcança Nome do produto. Corrija e use Salvar ficha no cadastro; depois confira novamente as contas. O limite exibido vem da categoria. Cada conta possui sua conferência de frete, inclusive ciência de custo indisponível quando necessária. Detalhes técnicos da última recusa ficam na própria conta. Salvar o nome não publica nem modifica anúncios existentes; nomes oficiais do catálogo permanecem protegidos.

> Revisão 3.2.0.234: em Produtos cadastrados, Editar cadastro permite ajustar características manualmente junto dos demais dados. Salvar não muda estoque nem anúncios; o EAN da característica deve ser exatamente o EAN do cadastro. Ao ler um EAN com mais de uma ficha, escolha no popup comparando etiqueta, foto, ficha, tensão/potência disponíveis e EAN. Ficha que declarar outro EAN fica bloqueada; não tratar 127V e 220V como equivalentes.

> Revisão 3.2.0.233: Marketplaces Web: Resultado de vendas inicia recolhido. Expanda pelo controle do cabeçalho ou pelo atalho Resultados; filtros e cálculos preservados.

> Revisão 3.2.0.232: AvantaPreços: restaurado o fluxo de preço total, disponibilidade, variante e fonte direta citada retornados pela pesquisa web; a loja bloquear o HTML ao servidor não elimina a oferta. EAN diferente, outra tensão/modelo, usados/reembalados, preços sem centavos válidos ou sem fonte não entram. Média aritmética de até oito ofertas deduplicadas; salva e relê a referência. Mantém uma chamada mini com teto de duas ferramentas web, sem pesquisas adicionais. Cadastro com especificações contraditórias exige conferência, sem troca silenciosa de variante. Estoque e anúncios preservados.

> Revisão 3.2.0.231: AvantaPreços: Sincronizar e atualizar saldos fica à direita de Nova pesquisa no topo do produto. Mesmo fluxo de consulta e confirmação de divergências. Outras saídas registra baixas sem venda; Vendas diretas consulta histórico, ambas em Outras ações.

> Revisão 3.2.0.230: AvantaPreços: o ícone Sincronizar e atualizar saldos consulta os anúncios vinculados e relê o saldo local. Se estiverem iguais, conclui sem modal. Divergências ou pendências abrem conferência para confirmar direção e quantidade; nunca importa/soma quantidades automaticamente. Sem anúncio, relê apenas o saldo local. Falha não significa atualização concluída.

> Revisão 3.2.0.229: AvantaPreços: a descrição completa do produto fica dentro de Características, no topo antes dos atributos. Expanda Características para consultar; inicia recolhida ao abrir o produto. Texto cadastrado preservado.

> Revisão 3.2.0.228: AvantaPreços: topo do produto mostra Total e estoques em cards informativos alinhados. Conferir saldos e Atualizar permanecem disponíveis juntos abaixo. Sem alteração de cálculos ou ações.

> Revisão 3.2.0.227: AvantaPreços: novo post começa com nome básico do produto, sem texto promocional do cadastro. Legenda: descrição, Detalhe somente se preenchido e preços De tachado/Por negrito. Para post antigo, Editar e gerar nova versão. Sem mudança de cadastro/estoque. Sem alteração de permissões.

> Revisão 3.2.0.226: AvantaPreços: a barra do post é somente informativa, sem seleção ou bloqueios por saldo. Todos soma as quantidades e cada estoque mostra seu saldo ao abrir; desconhecido é Indisponível. Serve para orientar a escolha manual do preço. Gerar/compartilhar preservam validações próprias, sem consultar ou movimentar estoque por clique. Substitui a orientação de bloqueio da .225.

> Revisão 3.2.0.225: AvantaPreços: ao clicar Criar post, a barra no topo mostra Todos e cada estoque ativo com o saldo desse produto. Todos soma os saldos; seleção mantém preço e cadastro. Mais de três botões quebram para outra linha. Estoque zero ou indisponível impede gerar/compartilhar; reabrir consulta os saldos atuais. Post pronto mantém a barra. Não reserva unidades nem grava estoque. O filtro da lista continua disponível.

> Revisão 3.2.0.224: AvantaPreços, base da empresa: Visualizar produtos oferece Todos e estoques ativos (Online/Saldão etc.). Um estoque específico mostra somente produtos com saldo positivo nele e sua quantidade; busca e paginação respeitam a seleção. Todos permite ver a base inteira. Retornar do produto ou ajustar saldo relê a lista. Filtro não reserva unidades. Somente leitura, sem alteração de saldo.

> Revisão 3.2.0.223: AvantaPreços: Criar post → escolher foto do cadastro/galeria/câmera → revisar campos → Gerar e salvar. Arquivo e dados ficam no sistema por produto, disponíveis aos usuários autorizados em qualquer aparelho. Reabrir recupera o post pronto; Editar post gera nova versão ao salvar. Compartilhar post envia imagem e legenda automática com De tachado e Por negrito; Baixar imagem disponível. Não existe Copiar legenda nem salvamento no navegador. Edição não altera cadastro/saldo/anúncios; post salvo mantém preço e texto da versão, sem atualização silenciosa. Conflito pede reabrir. Substitui notas locais .220–.222.

> Revisão 3.2.0.222: detalhes na arte do post local ficam maiores, mais leves e afastados das etiquetas. Para atualizar arte já salva, Editar → Gerar e salvar. Sem impacto operacional no AvantaVendas; não publicado.

> Revisão 3.2.0.221: AvantaPreços local remove Copiar legenda e cópia manual; Compartilhar post mantém imagem e legenda automática. Sem impacto operacional no AvantaVendas; não publicado. Esta orientação substitui a alternativa de cópia descrita na revisão anterior.

> Revisão 3.2.0.220: AvantaPreços em teste local — Criar post oferece Foto do produto/Galeria/Tirar foto. Gerar e salvar grava arte e campos neste navegador por usuário, empresa e produto. Reabrir apresenta post pronto para Editar ou Compartilhar, sem preencher novamente. Legenda inclui descrição, De tachado e Por em negrito; Copiar legenda é alternativa se o aplicativo não encaminhar texto junto com a imagem. Limpar dados remove arquivos, sem sincronização entre aparelhos. Nada muda no cadastro ou saldo, não publicado.

> Revisão 3.2.0.219: Preserva custos já apurados quando sincronizações mantêm os mesmos totais. Cache considera a revisão do pedido no provedor, não uma simples regravação local. A lista mantém sua página durante atualizações em segundo plano; Atualizar relê a lista. Mudança de filtros/mês continua isolando resultados. Falha de nova consulta identifica os últimos custos confirmados; não inventa valores. Consulta real do ML validada na 3.2.0.218 (25 pedidos em outubro); demais ambientes sem novos passos.

> Revisão 3.2.0.218: sem impacto operacional; avisos do padrão connectionMessage centralizados horizontalmente no Marketplaces Web.

> Revisão 3.2.0.217: Selecione mês em Resultado de vendas e clique Ver vendas do mês. A lista aparece dentro do quadro, respeita marketplace/conta/estoque/ano e contém todos os estados, com canceladas/estornadas/pendentes Fora do total. Rodapé mostra total confirmado do mês inteiro; 25 registros por página, com rolagem própria. Clique no nome do produto para detalhes dos itens/pedido. Fechar lista ou Ocultar vendas recolhe somente a lista. Trocar mês/filtros reinicia a página; voltar ao ano oculta a lista. Taxas/frete/líquido ausentes continuam A apurar; não foram validados em contas reais no local sem chave. Recurso local, não publicado.

> Revisão 3.2.0.216: O atalho inferior Resultados leva ao quadro Resultado de vendas, abrindo-o se recolhido e alinhando no topo sem alterar os filtros. Local, não publicado.

> Revisão 3.2.0.215: A linha do mês na tabela de Resultado de vendas também seleciona o período e atualiza Do bruto ao líquido. Clique novamente para voltar ao ano; teclado Enter/Espaço funciona no mês. Local, não publicado.

> Revisão 3.2.0.214: sem impacto operacional; destaque visual da linha do mês ao passar o mouse em Resultado de vendas no Web.

> Revisão 3.2.0.213: Expandir Resultado de vendas alinha o quadro abaixo da navegação fixa, como os demais cards. Recolher e atualizar não deslocam a página; filtros e seleção do mês preservados. Local, não publicado.

> Revisão 3.2.0.212: sem impacto operacional; remoção da borda colorida superior do quadro Resultado de vendas no Web.

> Revisão 3.2.0.211: Quadro Resultado de vendas compacto; selecionar o mês pelas barras detalha a cascata, novo clique retorna ao ano. Consulta custos reais automaticamente em lotes, sem bloquear o módulo. ML usa comissão por unidade e frete do vendedor; envio compartilhado é rateado em centavos. Magalu usa transações e mostra ajustes quando necessários. Parcial identifica cobertura incompleta; A apurar nunca significa zero. Sem custos registrados nas diretas, manter pendente. Não é lucro nem repasse recebido. Neste teste local falta MARKETPLACE_SECRETS_KEY e a Vercel protege o valor; não criar/rotacionar chave para testar. Recurso local, ainda não publicado.

> Revisão 3.2.0.210: Marketplaces Web tem Resultado de vendas ao final da página. Filtre marketplace, conta, estoque e ano; clique no mês da tabela ou gráfico para a composição e clique novamente ou Ver ano inteiro para o acumulado anual. A carga é local ao quadro, após aproximar a rolagem; Atualizar relê dados salvos, sem sincronizar o marketplace. Só vendas confirmadas em BRL entram no total; ML confirmado sem pagamento não entra. Taxas/frete e líquido ficam A apurar porque a apuração financeira dos provedores ainda não foi integrada. Não confundir líquido com lucro. Vendas online sem origem histórica ficam em Origem não identificada; não atribuir ao estoque Online atual. Valores brutos ausentes são sinalizados com asterisco, sem inventar valores. Recurso em desenvolvimento local, sem publicação.

> Revisão 3.2.0.209: os pontos continuam animados mesmo com reduzir movimentos ativado. O movimento indica espera, sem garantir resposta da internet ou do servidor; validações e recuperação de erros preservadas.

> Revisão 3.2.0.208: Usar ficha do catálogo abre card compacto. Padrão do catálogo importa ficha, fotos e capa oficiais com um clique em Importar. Personalizar fotos permite remover, adicionar pelo computador/arraste e clicar na imagem para defini-la como capa; envia somente a seleção e sua ordem. Cancelar não importa. Preço, estoque e condições de venda preservados. Sem segunda confirmação ou textos longos. Uploads ficam preparados até Importar; comprovante vinculado a empresa/usuário/produto expira em duas horas. Resposta incerta exige releitura, sem reenvio automático. Catálogo oficial continua protegido.

> Revisão 3.2.0.207: o catálogo pode omitir GTIN na ficha detalhada. Nessa situação, aceitar somente a prova devolvida pelo ML na busca por product_identifier: EAN válido e idêntico, um único resultado total e mesmo produto da ficha. Contradição de EAN, busca textual, ambiguidade e variante divergente continuam bloqueadas. Retoma apenas itens preservados pela antiga ausência de GTIN; não repete envios incertos.

> Revisão 3.2.0.206: Cadastro do produto oferece Usar ficha do catálogo. A consulta é somente leitura e compara capa, fotos, nome, descrição e ficha técnica. Salvar e enviar abre confirmação explícita. Confirmar permite substituir dados técnicos, inclusive nome e capa, usando a ficha única com EAN/variante comprovados; catálogo primeiro e fotos próprias depois até o limite. Valores sem equivalente são preservados. Preço, saldo, SKU, EAN, condição, garantia, frete e condições de venda não mudam. A fila salva local e envia aos anúncios próprios editáveis; catálogo oficial não é modificado. Alterações no cadastro ou na ficha invalidam a prévia. Resultado aparece em Contas conectadas; envio incerto não é repetido. Sem confirmação, a rotina automática continua preenchendo somente lacunas.

> Revisão 3.2.0.205: ao abrir Marketplaces com permissão de gestão e conta ML conectada, o catálogo completa automaticamente o que falta no cadastro e nos anúncios próprios. Só ficha única com EAN válido e variante compatível; ambiguidade preserva o produto para conferência. Acrescenta fotos sem trocar capa/remover fotos; descrição e atributos preenchidos não são substituídos. Se o valor local difere do catálogo, não enviar a versão conflitante ao anúncio. Não altera preço, estoque, SKU, EAN, nome, vínculo de catálogo ou condições comerciais. O ML confirma cada envio; catálogo oficial fica protegido. A fila continua no worker ao fechar o navegador, sem IA paga, e evita reconsulta antes de 24h após conclusão. Resposta incerta interrompe o produto e exige Revisar anúncio, sem reenvio automático. Contas conectadas mostra resultados e motivos de preservação. Novos cadastros de empresa já ativada também entram na fila. Releitura não descarta edição aberta.

> Revisão 3.2.0.204: Revisar anúncio separa Pode ajustar no AvantaLab de Restrições e ajustes externos. Cada recomendação identifica somente seus anúncios, conta e quantidade de fotos. Um anúncio próprio pode adicionar fotos mesmo com par de catálogo no mesmo User Product, desde que alcance e permissões estejam confirmados; a galeria do catálogo é preservada e conferida após envio. Fotos de catálogo continuam sujeitas à análise do ML; a revisão não envia sugestões ao catálogo nem inventa aprovação. Galerias podem ser diferentes: conferir por anúncio, sem copiar automaticamente. Ficha técnica compartilhada mantém as restrições existentes. A nota real continua vindo do ML.

> Revisão 3.2.0.203: sem impacto operacional adicional; validação da atualização de anúncios em segundo plano descrita abaixo.

> Revisão 3.2.0.202: Atualizar em Anunciados executa em segundo plano. Só o botão muda para Atualizando e fica desativado até concluir. Lista, filtros, menu e edição continuam disponíveis; não descarta rascunhos nem reinicia consultas ao trocar filtros. A lista é relida silenciosamente e aguarda o fim de edição aberta. Atualiza vendas após cada conta; falhas identificam a conta. Sair/trocar perfil cancela o acompanhamento local com progresso salvo no servidor.

<!-- ava-version: 3.2.0.201 -->

> Revisão 3.2.0.201: importar ou vincular novo anúncio ao cadastro com saldo local já informado, inclusive zero, não pede reconfirmação. Não importa nem soma quantidade do marketplace. Apenas saldo local realmente ausente exige conferência inicial. A migração limpa marcadores indevidos, preserva confirmação física, depósitos e históricos. AvantaVendas sem impacto operacional.

<!-- ava-version: 3.2.0.200 -->

> Revisão 3.2.0.200: sem impacto operacional; Pesquisa, Situação e Qualidade alinhados em uma linha no Anunciados Web. Pesquisa 15% mais estreita, seletores com larguras iguais; comportamento dos filtros preservado.

<!-- ava-version: 3.2.0.199 -->

> Revisão 3.2.0.199: ao abrir Marketplaces, após carregar as contas, busca anúncios de todas as contas conectadas em segundo plano. Novas conexões/reconexões entram na fila. Após cada conta concluir, atualiza suas vendas e relê listas sem descartar edição aberta. Atualizar manual também atualiza vendas por conta. Falhas identificam a conta; usar Atualizar para tentar novamente. Sair/trocar perfil cancela as consultas locais e preserva progresso salvo.

# Ava — Manual da Gestão Web

<!-- ava-version: 3.2.0.198 -->

> Revisão 3.2.0.198: saldo informado, inclusive zero, é situação normal. A conferência inicial de anúncio importado/vinculado mantém Estoque a confirmar; Confirmar saldo XX abre somente o popup com saldo Online atual, sem formulário de quantidade. Cancelar não grava. Ajustar estoque altera a quantidade separadamente. Confirmar não soma saldos de outros estoques. Sem anúncio ou somente anúncios encerrados/excluídos não recebem essa pendência. Zero não cria aviso de esgotamento; falhas reais de pausa, sincronização e vendas continuam visíveis. A confirmação inicial não é uma conferência periódica de todo cadastro.

<!-- ava-version: 3.2.0.197 -->

> Preferência confirmada: ao excluir anúncios, manter o produto visível em Produtos cadastrados e nos Estoques, com saldo físico preservado.

> Revisão 3.2.0.197: na seção Publicação da ficha do produto, usar Excluir anúncios para conferir e excluir os anúncios das contas exibidas, preservando cadastro, saldos e históricos. A confirmação não apaga o produto local. Anunciados atualiza após confirmação; falha parcial exige nova conferência sem recriar os já excluídos. Não declarar exclusão em moderação ou retorno incerto. ML under_review/forbidden permite exclusão direta; outros estados dependem da regra da plataforma. Esta orientação substitui excluir cadastro nesse botão; outros fluxos de exclusão do cadastro permanecem próprios.

<!-- ava-version: 3.2.0.196 -->

> Revisão 3.2.0.196: resumo não repete Saldo local não informado; a conferência continua nos detalhes do produto. Avisos reais de divergência e pausa pendente preservados.

<!-- ava-version: 3.2.0.195 -->

> Revisão 3.2.0.195: cabeçalho do produto expandido e botão de recolher permanecem abaixo do menu durante o foco. Redimensionamento, foco e mudança de conteúdo recuperam alinhamento imediato sem reiniciar a rolagem interna. Confirmações e navegação preservadas.

<!-- ava-version: 3.2.0.194 -->

> Revisão 3.2.0.194: anúncio com exclusão/encerramento confirmado não deve receber tentativa de estoque ou pendência de pausa. Fila é encerrada por revisão e geração, preservando histórico. Não presumir exclusão por 404/erro de leitura. Inclui as regras de avisos da revisão 3.2.0.193; sem alterar saldos ou vendas.

<!-- ava-version: 3.2.0.193 -->

> Revisão 3.2.0.193: saldo zero confirmado e pausa comprovada não contam como aviso. Qualidade baixa só gera pendência para anúncio ativo. Pausa pendente de anúncio encerrado/excluído não é cobrada; falhas reais, vendas e conferência física pendente permanecem. Contador relê os avisos em segundo plano a cada minuto e após ajustar saldo, sem recarregar listas.

<!-- ava-version: 3.2.0.192 -->

> Revisão 3.2.0.192: produto expandido mantém cabeçalho, seletor de marketplaces e atalhos acessíveis; demais áreas continuam bloqueadas. Confirmações e proteções de gravação permanecem.

<!-- ava-version: 3.2.0.191 -->

> Revisão 3.2.0.191: confirmação de saldo Online zerado usa descritivo curto e botões Cancelar/Confirmar saldo zero. Conferir fisicamente antes de confirmar; Cancelar não grava. Mesma operação de estoque e solicitação de pausa.

<!-- ava-version: 3.2.0.190 -->

> Revisão 3.2.0.190: Ao consultar explicitamente um EAN já cadastrado sem preço de referência, o AvantaPreços pesquisa ofertas verificadas e confirma o preço salvo. Com referência existente, mantém consulta local. Sem ofertas válidas, informa ausência sem inventar preço; EAN e variantes continuam validados. A correção de saldo Online zero da revisão 3.2.0.189 acompanha esta entrega.

<!-- ava-version: 3.2.0.189 -->

> Revisão 3.2.0.189: estoque Online zero confirmado é esgotamento, não saldo desconhecido. Ao zerar, o sincronizador solicita pausa dos anúncios elegíveis; Sem estoque só confirma pausa/inatividade com saldo remoto zero na última conferência. Sem estoque com pausa pendente não comprova conclusão; verificar erros/contas sem ocultar vendas pendentes, conexão ou pausa incerta. Conferência de importação com zero oferece Confirmar saldo zero: contar fisicamente o Online, confirmar no modal e aguardar a pausa de cada conta. O botão sempre seleciona Online; não soma nem altera outros estoques. Cancelar não grava. Ajustar/Confirmar estoque aceita saldo final zero, inclusive 0 → 0, reenfileirando a pausa sem autorizar reposição. Confirmação física pendente não é dispensada nem substituída por leitura da quantidade do marketplace. Não adicionar uma unidade fictícia para destravar. Sem dado ainda informado mostra Estoque não informado/Confirmar estoque, preservando apresentação numérica. Após reabastecer, não prometer reativação automática de pausas manuais. Full e modelos não homologados mantêm restrições. Falha da fila pode ocorrer após confirmar o saldo: conferir avisos; repetir a mesma tentativa não duplica movimentação. Esta orientação substitui a regra antiga de obrigar Adicionar saldo positivo quando o saldo é zero. Sem mudança de permissões, plano ou banco.

<!-- ava-version: 3.2.0.188 -->

> Revisão 3.2.0.188: Em Vendas de Marketplaces, abra o pedido e a faixa Documento e etiqueta. Solicitar DC-e exige perfil PF/PJ não contribuinte e confirmação de que não há solicitação anterior sem retorno. O mesmo botão fica DC-e solicitada e inativo após aceite ou tentativa incerta. O histórico é independente da sincronização e da etiqueta. Expanda Documentos fiscais para consultar situação e arquivos oferecidos pelo ML. NF-e é para PJ contribuinte: importar XML original modelo 55 autorizado em produção (até 2 MB), substituir a NF-e importada antes da impressão ou solicitar emissão pelo Faturador, confirmando certificado A1/cadastro/dados fiscais prontos. Não confundir permissão OAuth com configuração do Faturador. Recurso não localizado (404) não significa ausência de documento. Erro definitivo de envio permite correção; incerteza mantém a reserva. Consultar não emite nem importa. A data de envio programado é um dia civil; impressão/reimpressão só após liberação logística. Downloads de NF-e externa dependem dos arquivos disponibilizados pelo ML. Pós-venda com ações de cancelamento/reembolso/devolução permanece no Mercado Livre. Não afirmar emissão real sem confirmação do provedor.

> Revisão 3.2.0.187: O X à direita de Estoque, junto dos atalhos flutuantes oculta os atalhos da esquerda por 30 segundos e ela retorna automaticamente. Saída para a esquerda, retorno para a direita, com movimento reduzido respeitado. Não muda filtros ou dados.

> Revisão 3.2.0.186: No pedido Web, Solicitar DC-e muda para DC-e solicitada no mesmo botão, inativo inclusive em envio programado e junto à impressão liberada. Abrir/Consultar etiqueta consulta o documento existente no ML sem reenviar. Aviso separado diferencia aceite, emissão concluída, tentativa sem confirmação e consulta indisponível; não afirmar aceite sem evidência.

> Revisão 3.2.0.185: sem impacto operacional; Cancelar anúncio conserva o texto dentro do botão ativo ou desativado, com quebra da linha de ações em telas estreitas.

> Revisão 3.2.0.184: sem impacto operacional; indicador das contas no Marketplaces Web ampliado, com texto Conectando contas... abaixo.

> Revisão 3.2.0.183: Consultar etiqueta permanece disponível no pedido com envio programado ou etiqueta em preparação; a consulta relê o Mercado Livre e não emite DC-e. A impressão depende da liberação logística, separada da emissão fiscal.

> Revisão 3.2.0.182: Após solicitar DC-e, o pedido mostra DC-e solicitada e aguarda a liberação da etiqueta, com emissão inativa inclusive ao reabrir. Consultar etiqueta permanece disponível. Resposta incerta não libera reenvio; falha confirmada antes do envio permite nova tentativa. Etiqueta liberada substitui a espera por Imprimir/Reimprimir.

> Revisão 3.2.0.181: No pedido expandido, Documento e etiqueta agrupa as ações compactas: Emitir DC-e e Consultar etiqueta na pendência fiscal; Imprimir etiqueta quando liberada ou Reimprimir etiqueta depois de impressa. Mensagem acompanha a situação do ML. Atualizar do Pós-venda fica ao lado do título e continua somente consulta. Link externo mostra a conta esperada, mas usa a sessão atual do navegador; não troca a conta do Mercado Livre. Demais regras fiscais/estoque e permissões preservadas.

> Revisão 3.2.0.180: Em Marketplaces Web, abra o pedido e use **Emitir DC-e**, abaixo do aviso fiscal e antes de Pós-venda. Confirme somente para vendedor PF/PJ não contribuinte; PJ contribuinte segue NF-e. O ML informa prazo de até três dias corridos da venda. Fechar o resultado consulta o pedido; **Consultar liberação da etiqueta** relê o envio até aparecer Imprimir etiqueta. Em resposta incerta, consulte antes de repetir: tentativa fica registrada no servidor. Envio programado aguarda liberação pelo ML, não admite emissão enquanto não estiver invoice_pending. Full e Magalu não participam. Não altera valores/estoque. Responder mensagens, cancelar, aceitar devoluções e solicitar reembolsos ainda são ações no ML; AvantaLab consulta o pós-venda. Implementação não comprova emissão fiscal real sem confirmação do provedor.

> Revisão 3.2.0.179: Publicar mantém o popup central durante envio e resultado por conta. Fechar encerra o acompanhamento sem reenviar. Em falha/resultado parcial, conferir Resultado do envio e recarregar os dados antes de nova tentativa. Aviso de foto no rascunho é limpo apenas depois dos envios confirmados, inclusive se a atualização da tela falhar. Confirmação curta Voltar/Publicar preservada.

> Revisão 3.2.0.178: Confirmação da revisão de anúncio foi simplificada: título Publicar alterações?, resumo do que será enviado e contas de destino, botões Voltar/Publicar. Sem mudança na validação ou na publicação.

> Revisão 3.2.0.177: Durante a inclusão da foto, aguarde Carregando na área de adicionar fotos. Erros de arquivo, endereço, conversão ou envio aparecem no mesmo local; tente outra imagem ou repita após corrigir. O resultado permanece ali, sem aviso no topo. Upload não publica o anúncio.

> Revisão 3.2.0.176: Fotos arrastadas da web são importadas pelo link da imagem. WebP/AVIF são convertidos automaticamente para JPEG/PNG, sem baixar e renomear manualmente. Aceita também arquivos WebP/AVIF; limite de 2,5 MB, imagem estática. A foto permanece na preparação até a confirmação de envio e respeita as restrições do anúncio.

> Revisão 3.2.0.175: Na preparação e na revisão de anúncio, arraste uma imagem JPG/PNG de até 2,5 MB para a área de fotos, do computador ou de outra página pública HTTPS. O botão de arquivo continua disponível. A imagem entra na preparação, sem publicar automaticamente. O motivo por conta distingue catálogo confirmado pelo ML de resposta sem informação de catálogo; atualizar a revisão tenta conferir a permissão novamente. Não prometer liberar fotos de catálogo por alterar a conta.

> Revisão 3.2.0.174: sem impacto operacional. Pesquisar e Cancelar anúncio possuem a mesma altura visual e largura igual na Gestão Web.

> Revisão 3.2.0.173: Em Revisar anúncio, fotos são liberadas por conta; adicionar somente nos destinos permitidos, preservando capas e galerias. Recomendações iguais aparecem uma vez. Em Novo anúncio, adicionar fotos, conferir fotos/descrição/ficha técnica e usar Salvar ficha no cadastro para compartilhar o conteúdo nas contas. Salvar não publica nem altera estoque ou preço. A nota acima de 70 é objetivo, calculado pelo ML sem garantia; restrições de catálogo e alcance aparecem por conta.

> Revisão 3.2.0.172: Revisar anúncio mostra automaticamente as recomendações reais do ML, agrupadas entre contas. Cada ação abre só Informações, Fotos ou Ficha técnica; campos protegidos e restrições ficam em Dados preservados e detalhes por conta. Fotos permitidas têm Adicionar fotos do computador. IA aparece quando pode completar dados ou fotos e usa o EAN exato para recuperar galeria do catálogo; valores existentes e fotos são preservados. Cadastro por EAN mantém todas as fotos encontradas, até o limite. Referência de preparo: três fotos reais, mas cumprir essa quantidade não garante nota. Se o catálogo controlar as fotos ou o alcance afetar outro cadastro, informar o impedimento específico; não prometer edição nem aumentar estoque para cumprir uma meta. Sugestões e fotos são revisadas antes de publicar.

<!-- ava-version: 3.2.0.171 -->

> Revisão 3.2.0.171: Ver no estoque recupera a lista de estoques antes de localizar o produto quando a leitura inicial falhou. Se persistir indisponível, usar Tentar novamente; erro de leitura não significa estoque inexistente. Nenhum saldo é alterado.

> Revisão 3.2.0.170: em Qualidade do anúncio, primeiro usar Revisar anúncio. Dentro do popup, Consultar objetivos lê todas as contas vinculadas e mostra cada pendência; os atalhos levam às Informações, Fotos ou Ficha técnica já abertas. Não há botão de consulta na ficha expandida de estoque nem repetição de ações por conta.

<!-- ava-version: 3.2.0.170 -->

> Revisão 3.2.0.169: em Qualidade do anúncio, usar Atualizar objetivos no topo para consultar as contas conectadas e revelar as pendências reais do Mercado Livre. A ação é somente leitura; depois, abrir Revisar anúncio apenas para corrigir e publicar campos editáveis.

<!-- ava-version: 3.2.0.169 -->

> Revisão 3.2.0.168: em Qualidade do anúncio, uma meta que só o Mercado Livre pode resolver fica identificada com a conta correspondente; não abrir link externo sem sessão nem pedir/guardar senha, SMS ou reconhecimento facial. O responsável pela conta conclui o ajuste diretamente no marketplace e, depois, usar Atualizar objetivos no AvantaLab para conferir o recálculo.

<!-- ava-version: 3.2.0.168 -->

> Revisão 3.2.0.167: em Qualidade do anúncio, usar os objetivos pendentes para abrir diretamente Informações, Fotos ou Ficha técnica na revisão. Quando não houver edição homologada pelo AvantaLab, abrir os detalhes por conta para conferir a restrição do Mercado Livre. Conferir e publicar alterações continua sendo uma decisão explícita; a nota é recalculada pelo marketplace.

<!-- ava-version: 3.2.0.167 -->

> Revisão 3.2.0.166: sem impacto operacional na Gestão Web; estabilização interna do estado de Marketplaces preserva abertura de produtos, navegação, foco, rolagem e confirmações existentes.

<!-- ava-version: 3.2.0.166 -->

> Revisão 3.2.0.165: em Marketplaces Web, anúncio com situação Excluído não aparece em Anunciados nem nos vínculos operacionais do produto. Seu registro técnico permanece somente para auditoria, sem apagar produto, estoque, vendas ou financeiro.

<!-- ava-version: 3.2.0.165 -->

> Revisão 3.2.0.164: em Revisar anúncio, o cabeçalho com produto, Completar com IA e Fechar fica visível enquanto o conteúdo da conferência rola. Nenhuma ação, preço, estoque ou anúncio é alterado por esse ajuste visual.

<!-- ava-version: 3.2.0.164 -->

> Revisão 3.2.0.163: ao publicar o mesmo cadastro em outra conta, somente o preço pode variar. Fotos, descrição, ficha, garantia, tipo, envio, condição, EAN e saldo vêm do cadastro; se não houver fotos canônicas cadastradas, completar a ficha antes de publicar. Na revisão, fotos diferentes por anúncio são somente consulta e não devem ser copiadas entre anúncios.

<!-- ava-version: 3.2.0.163 -->

> Revisão 3.2.0.159: sem impacto operacional na Gestão Web; AvantaVendas reutiliza LoadingPontos oficial e atualiza sua marca, sem alterar o componente da Gestão.

> Revisão 3.2.0.160: sem impacto operacional na Gestão Web; somente Gestão Mobile recebe o loading compartilhado.

> Revisão 3.2.0.161: sem impacto operacional; alteração de marca exclusiva do AvantaVendas.

> Revisão 3.2.0.162: sem impacto operacional; correção exclusiva da leitura do loading na Gestão Mobile.

<!-- ava-version: 3.2.0.162 -->

<!-- ava-version: 3.2.0.158 -->

> Publicação 3.2.0.158 confirmada na Web em 25/10/2026: deployment dpl_35yMw6kZUBQHnsXkhtSmApYPFNtL READY e domínio oficial conferido; o build mencionado como pendente na revisão abaixo foi aprovado. Recarregar a página para obter o novo fluxo. Sem alteração de anúncios reais nos testes.

> Revisão 3.2.0.158: em Qualidade do anúncio, usar Revisar anúncio para abrir a revisão geral no formato de Novo anúncio. Objetivos são informativos; detalhes por conta conservam Atualizar objetivos. Formulário reúne informações, fotos e ficha completa, com vazios, protegidos, campos preservados e diferenças por conta. Conteúdo controlado pelo catálogo/identidade é somente leitura com motivo. Preço e saldo são consulta neste editor, conservando seus controles próprios. Resumo flutuante mostra foto/prévia e Preenchimento do rascunho (indicador local de campos editáveis válidos), separado da última nota real do ML; não prometer aumento de nota. Completar com IA no topo pede confirmação da cota, pesquisa evidências e só preenche vazios permitidos do rascunho; conferir fontes e valores antes do envio. Sem comprovação, continuar manualmente nos campos liberados; ausência de sugestões não é necessariamente erro. Publicar alterações confirma anúncios existentes de todas as contas vinculadas suportadas, preserva preço/estoque/identidade e não cria anúncios. Todos os destinos/seções são validados antes da primeira escrita. Falha parcial/resultado incerto interrompe próximas etapas, exibe resultados e exige Recarregar dados e nova revisão, nunca reenvio automático. Cancelar revisão descarta só o rascunho, não desfaz alterações já confirmadas. Substitui as orientações antigas de editores separados/Aplicar melhorias no bloco de qualidade. Sem mudança de permissões, plano ou banco. Publicação pendente do build.

<!-- ava-version: 3.2.0.157 -->

> Revisão 3.2.0.157: Acesso Web mantém a mesma preparação durante sessão, cadastro e plano; loading de pontos também nos módulos e cards que usam o componente compartilhado. Não há Cancelar e voltar ao login nessa espera. Em erro, usar Tentar novamente; fechamento/cancelamento no provedor continua tratado. Publicado na Web em 25/10/2026.

<!-- ava-version: 3.2.0.156 -->

> Revisão 3.2.0.156: Completar com IA pesquisa dados ausentes por EAN/marca/modelo, com até duas ferramentas web e verificação da página, identidade/variante e trecho literal. Exibe fonte clicável e revisão antes de aplicar; dado não comprovado permanece pendente. Não substitui campos existentes, preço, saldo ou identidade. Preencher ficha técnica abre o editor manual; ausência de sugestões não oferece salvar vazio. Novo anúncio e revisão por conta incluem Ficha técnica complementar, com campos opcionais editáveis da categoria e suas opções/unidades, sem obrigar o que ficou vazio. Campos fixos/internos continuam protegidos. Leitura de EAN só traz o que a fonte disponibiliza; não garante nota acima de 70, que depende de outros critérios do ML. Contabilização inclui ferramentas web na cota existente. Revisão obrigatória antes de enviar.

<!-- ava-version: 3.2.0.155 -->

> Revisão 3.2.0.155: ao administrar outro usuário, nome no perfil e acessos autorizados podem ser ajustados, mas e-mail/login/senha globais pertencem ao titular. Oriente-o a editar seus próprios dados ou recuperar a senha no login; não prometa redefinição por outro gestor. Somente Master concede Master. Se plano/franquia não puderem ser conferidos, novas inclusões aguardam recuperação; usuários existentes não perdem acesso. Backups novos são identificados por perfil e download confere titularidade. Legados permanecem na nuvem: titular pode baixá-los diretamente e usar a importação local, sem atribuição automática. Publicado e conferido em 25/10/2026; sem alteração de plano, banco ou arquivos reais.

<!-- ava-version: 3.2.0.154 -->

> Revisão 3.2.0.154: Completar com IA confirma uso de uma pequena parte da cota mensal e revisão antes de aplicar, sem expor custos/modelo internos. Restrições globais de envio não bloqueiam preparar rascunho; identidade e campos fixos continuam preservados. Ao confirmar, cada destino é revalidado; elegíveis são enviados e os demais mostram motivo específico. Resultado parcial não significa sucesso geral e não é reenviado automaticamente. Rascunhos não salvos são descartados ao fechar. Orçamento e permissões preservados.

> Revisão 3.2.0.153: Qualidade compacta separa visão geral, Objetivos pendentes em botões âmbar e Edição manual azul-acinzentada. Fotos do produto/Ficha técnica abrem o editor conjunto; restrições sem editor levam aos detalhes por conta. Objetivos são lidos da avaliação local salva, sem consulta ao ML/IA na abertura; ausência, falha ou avaliação parcial são informadas. Atualizar objetivos consulta as contas; IA mantém revisão antes de aplicar e orçamento existente. Preços individuais, estoque, permissões e edição conjunta preservados. Inclui layout Estoque/Preços sugeridos da 3.2.0.152; demais ambientes sem impacto operacional.

> Revisão 3.2.0.152: Estoques/Produtos cadastrados separam Estoque (saldos por local e etiqueta de pendência), Preços sugeridos (referência, edição/pesquisa, mínimo/médio/ideal) e Expandir/Recolher. Sem alteração em dados, cálculos ou permissões; não confundir sugestões com preços dos anúncios. Demais ambientes sem impacto operacional. Ajuste local, ainda não publicado nesta etapa.

> Revisão 3.2.0.151: Ver no estoque aceita reabertura do mesmo produto, conclui pelo resultado local sem esperar rolagem e permite Cancelar. Falha/tempo excedido libera a tela com Tentar novamente; cancelar descarta resposta antiga, sem alterar dados. Produtos removidos/vínculo inválido exigem conferência. Etiqueta de pausa separa símbolo e quantidade. Demais ambientes sem impacto operacional.

> Revisão 3.2.0.150: resumo de Anunciados organiza qualidade com nota, situações em etiquetas, quantidade acima das ações e bloco Preço anunciado/Preços dos anúncios. O valor é o anúncio sincronizado, não a referência pesquisada. Sem alterações em dados ou anúncios; demais módulos sem impacto operacional.

> Revisão 3.2.0.149: Marketplaces exibe a qualidade real salva nos cards de Anunciados, Estoques e Produtos cadastrados. Em várias contas, mostra a menor nota, sem média inventada; sem avaliação não significa zero. Atualização diária no servidor, em pequenos lotes, sem consultar ML/IA ao abrir cards. Abaixo de 70 gera aviso; filtros de qualidade em Anunciados. **Completar com IA** usa somente GPT-5.4 mini por ação explícita, com evidências do mesmo cadastro/anúncios e fotos já existentes no ML, sem geração/pesquisa externa. Campos sem comprovação permanecem pendentes. Revisar fontes, selecionar sugestões, marcar autorização e aplicar aos anúncios vinculados; preços por conta, estoque e identificação são preservados. Limite próprio de US$ 5/mês por empresa; reserva máxima US$ 0,10 por tentativa, mantida se o consumo ficar incerto, e reaproveitamento por 24h. Edição manual não depende do orçamento. Falha parcial não desfaz envios confirmados: conferir os resultados e refazer análise, sem reenviar automaticamente. A pontuação depende do recálculo do Mercado Livre.

> Revisão 3.2.0.148: em Marketplaces, quando o saldo Online chega a zero e o Mercado Livre não permite confirmar a quantidade (User Product, vínculo incompleto ou depósito), o anúncio é protegido por pausa confirmada; não trate isso como saldo remoto zerado. Para voltar a vender, confira o saldo físico, registre-o no Online e reative: o sistema envia e relê a quantidade antes de liberar o anúncio. Cancelamento de pedido só devolve automaticamente antes de etiqueta/despacho; depois de qualquer avanço logístico, faça entrada manual somente após avaliar a unidade retornada.

> Identificação 3.2.0.147: em Anunciados, EAN ocupa uma linha abaixo do título/descrição; conta/vínculo ficam em linha separada. Sem mudança nos dados ou na busca.

> Revisão 3.2.0.147: Excluir produto confere também o mesmo EAN/UPC nos anúncios sincronizados de todas as contas, mesmo sem vínculo local. Se houver anúncios a excluir, revisar a lista, marcar a confirmação e usar **Excluir anúncios e produto**. O cadastro só é removido após confirmação remota; falha/resultado incerto preserva o cadastro, mas não desfaz anúncios já excluídos. Conferir novamente não exclui automaticamente. Conflito com outro cadastro/variação exige revisão, nunca excluir por semelhança de nome. Sem EAN, a descoberta é limitada aos vínculos. **Todas** em Anunciados inclui o histórico de excluídos; isso não indica anúncio ativo. Não orientar que um anúncio desconhecido/não sincronizado foi conferido.

> Revisão 3.2.0.146: Em Marketplaces, **Qualidade do anúncio** aparece antes de Cadastro do produto na ficha expandida de Estoques e Produtos cadastrados. Em Anunciados, use **Ver estoque** para abrir essa ficha; a qualidade não aparece como média no card do anúncio. Título, descrição, tipo, fotos e ficha técnica são editados uma vez para todos os anúncios vinculados elegíveis, após conferir todos os destinos. O preço continua individual por conta. Estoque local, EAN/identidade e anúncios reais não são alterados por esse editor. Se uma aplicação ficar parcial, confira o resultado exibido e recarregue antes de tentar o restante; o sistema não reenvia automaticamente.

> Revisão 3.2.0.144: sem impacto operacional na Gestão Web; somente apresentação conjunta dos botões da Sala do AvantaVendas restaurada. Não publicado.

<!-- ava-version: 3.2.0.145 -->

> Revisão 3.2.0.145: Carregar link do anúncio usa consulta própria, sem atualizar listas, retratos ou saldo. Exibe Carregando link e libera a ação após sucesso, erro ou limite de espera, sem marcar uma leitura falha como alteração incerta. Recolher a ficha cancela somente a leitura. O foco é único por página: outra ficha recolhe a anterior apenas quando não houver gravação em andamento; limpeza atrasada não remove o bloqueio da ficha atual. Atualizar listas não reabre uma pendência já consumida. A consulta não altera anúncios reais nem estoque; Conferir situação e ações confirmadas mantêm seus fluxos próprios.

<!-- ava-version: 3.2.0.143 -->

> Revisão 3.2.0.143: Novo anúncio valida automaticamente as novas contas selecionadas e as alterações do formulário, após pausa curta na digitação. Leituras limitadas a duas contas por vez; trocar rascunho/seleção cancela respostas antigas. Frete é estimado separadamente por conta, sem repetir consulta por renderização. Pendências exibem motivo e Conferir campo leva ao controle do anúncio naquela conta, nunca ao EAN da pesquisa. Publicar exige confirmação do produto, validação atual e frete revisado; nada é publicado automaticamente. Revalidar contas permite tentar novamente após falha sem recarregar a página, preservando os dados por destino. Anúncios existentes e envios incertos permanecem protegidos.

> Revisão 3.2.0.142: Qualidade do anúncio fica antes de Cadastro do produto. Consultar objetivos de todos lê avaliações reais por anúncio, sem nota agregada. Editar informações, Gerenciar fotos e Editar ficha técnica usam um editor único para os anúncios vinculados elegíveis. Título/nome base, descrição, tipo de anúncio, fotos e características dependem da permissão comum a todos os destinos; somente preço permanece individual. EAN/identidade e estoque não são enviados por esse editor. Revise e confirme antes de aplicar: todas as contas são conferidas antes do primeiro envio, com confirmação separada por destino. Falha parcial não significa sucesso geral; confira os resultados e recarregue antes de tentar novamente. Não repete envios automaticamente. Vínculos incompletos, conteúdo controlado pelo ML ou plataforma não homologada bloqueiam a edição conjunta, sem omitir destinos. Não publica novos produtos nem sincroniza campos ainda sem editor homologado. Entrega local, não publicada.

> Revisão 3.2.0.141: Preparar anúncio aparece em verde e recolhe a ficha antes de abrir Novo anúncio, liberando a página. Rascunhos não salvos da ficha são descartados; nenhuma escrita em andamento é interrompida. Atalhos flutuantes Vendas/Anunciados/Estoque/Pesquisar produtos ficam acima dos cards, mantêm transparência e recolhem o produto antes de executar a ação. Confirmações e carregamentos bloqueantes permanecem prioritários. As quatro ações administrativas de Produtos cadastrados aparecem no cabeçalho, junto de Atualizar, somente quando expandido. Busca continua local e automática; retirado apenas o texto explicativo. Sem alteração de regras de publicação/estoque. Local, não publicado.

<!-- ava-version: 3.2.0.140 -->

> Revisão 3.2.0.140: em Qualidade do anúncio, Consultar/Atualizar objetivos lê nota, classificação e metas reais do ML; o medidor compacto não calcula nota própria. Gerenciar fotos permite preparar JPG/PNG até 2,5 MB, ordenar e remover fotos; somente Revisar e salvar e a confirmação alteram o anúncio. Editar ficha técnica usa campos/valores/unidades permitidos pela categoria; EAN/identidade, catálogo e campos fixos ficam protegidos. Confira os códigos de todos os anúncios afetados pelo mesmo User Product na conta antes de enviar. Não altera estoque, preço ou outras contas. Erro de validação preserva rascunho e permite corrigir; resposta incerta exige Recarregar dados para conferir, nunca reenvio automático. Objetivo só é cumprido quando o ML recalcular e retornar assim; use Atualizar objetivos. Recursos sem API/permissão seguem com orientação/link oficial. Não garante posição nas buscas.

<!-- ava-version: 3.2.0.139 -->

> Revisão 3.2.0.139: Mercado Livre tem Qualidade e objetivos do anúncio no editor e em Anúncios vinculados do produto/estoque. Clique em Consultar objetivos; a nota, classificação, objetivos e datas vêm do ML por conta/ITEM/User Product. Atualizar objetivos faz nova leitura somente por ação manual. Ajustar no AvantaLab abre/focaliza título, descrição, preço ou tipo no editor existente, com permissões remotas e salvamento explícito. Outros recursos levam ao link oficial do ML; nunca aumente estoque para cumprir meta, confirme sempre o saldo físico. Sem avaliação ou acesso negado não significa nota zero. Após salvar, atualize os objetivos e aguarde eventual recálculo do ML. Não é a métrica de Experiência de compra e não garante posição nas buscas.

<!-- ava-version: 3.2.0.138 -->

> Revisão 3.2.0.138: em Anunciados, Ver no estoque mostra “Abrindo produto” com leve escurecimento enquanto localiza a ficha. A ficha aparece recolhida no estoque; o usuário pode expandi-la. Falha oferece tentar novamente sem alterar dados.

<!-- ava-version: 3.2.0.137 -->

> Revisão 3.2.0.137: Conferir e ajustar mostra “Abrindo pendência” com fundo levemente escurecido até localizar, expandir e alinhar a ficha abaixo da barra fixa. Os detalhes mantêm rolagem interna. Se a abertura não concluir, permite tentar novamente sem alterar dados.

<!-- ava-version: 3.2.0.136 -->

> Revisão 3.2.0.136: Conferir e ajustar posiciona a ficha no mesmo ciclo da expansão manual, logo abaixo da barra fixa, sem busca/controles acima do produto. Detalhes mantêm rolagem independente e recolher libera a navegação. Sem novos passos, dados ou permissões; ajuste local não publicado.

<!-- ava-version: 3.2.0.135 -->

> Revisão 3.2.0.135: vínculo e prova do anúncio associado precedem a importação, preservando confirmação física existente. Vínculos importados antigos podem receber prova sem remapear produto nem repetir baixa; pendências genuínas permanecem.

<!-- ava-version: 3.2.0.134 -->

> Revisão 3.2.0.134: vendas recebidas por outro código de anúncio recuperam o vínculo somente quando o Mercado Livre confirma o mesmo User Product ou relação recíproca de estoque de catálogo, na mesma conta e sem variações/conflito. Baixa por pedido ocorre uma única vez; não soma saldos de anúncios, não altera SALDÃO nem repõe estoque antigo. Sem prova, a pendência continua nos avisos para conferência. Nenhum novo anúncio é publicado ou reativado por este fluxo.

<!-- ava-version: 3.2.0.133 -->

> Revisão 3.2.0.133: Conferir e ajustar dos avisos de Marketplaces posiciona o produto expandido abaixo da barra fixa antes de bloquear a rolagem externa. Detalhes continuam com rolagem interna; recolher devolve a navegação. Não muda pesquisa, preço, saldo ou anúncios. Gestão Mobile e Vendas sem impacto operacional. Publicação autorizada, ainda não confirmada.

<!-- ava-version: 3.2.0.132 -->

> Revisão 3.2.0.132: perfis usam consultas agrupadas, mantendo as validações no servidor. A lista não espera todas as logos; Meus módulos busca somente a imagem do perfil escolhido sem bloquear navegação. Dashboard recebe a imagem pelas configurações, sem transferência duplicada. Aparência, permissões, planos e cadastros preservados; nenhum procedimento novo. Publicação autorizada, sujeita ao build completo.

<!-- ava-version: 3.2.0.131 -->

> Revisão 3.2.0.131: AvantaPreços e referências Web usam CampoMoeda oficial: cursor à direita ao focar/clicar, digitação por centavos e máscara imediata 1.234,56, inclusive colagem. Salvar/Atualizar cálculos continua explícito; foco não salva nem pesquisa. PADRÃO AVANTA 1.22.0 somente para moeda, não EAN/quantidade/percentual. Gestão Mobile e Vendas sem impacto operacional. Publicação autorizada, ainda não confirmada.

> Revisão 3.2.0.130: acesso prepara os perfis com consultas agrupadas, mantendo validações no servidor. A lista não aguarda logos de todos os perfis; Meus módulos busca a imagem apenas do escolhido, sem bloquear navegação, e mantém o nome se ela falhar. No Dashboard a imagem vem com as configurações, sem transferência duplicada. Aparência, permissões, planos e cadastros preservados; preparação local, não publicada. Nenhum procedimento novo para o usuário.

<!-- ava-version: 3.2.0.130 -->

> Revisão 3.2.0.129: sem impacto operacional na Gestão Web; reenvio do visual do Vendas com verificação de acesso corrigida, mantendo testes e backend.

<!-- ava-version: 3.2.0.129 -->

<!-- ava-version: 3.2.0.128 -->

> Revisão 3.2.0.128: AvantaPreços/Web mantêm GPT-5.4 mini, até oito ofertas distintas e média de todas as aprovadas. Consulta inicial combina EAN e marca/modelo/variante, com alternativa de varejistas independentes no mesmo orçamento. Até oito páginas já encontradas são priorizadas por modelo e diversidade, conferindo preço e estoque; sem pesquisas para completar a quantidade. Referência anterior preservada se não houver oferta comprovada. Testes reais Kian, Elgin e Conair confirmaram preços e cálculos. Gestão e Vendas sem impacto operacional; publicação autorizada, ainda não confirmada.

> Revisão 3.2.0.127: sem impacto operacional. Manutenção administrativa do histórico técnico do pg_cron com retenção de 30 dias; não altera cadastros, produtos, vendas, permissões ou plano, nem exige nova publicação do aplicativo.

<!-- ava-version: 3.2.0.127 -->

> Revisão 3.2.0.125: pesquisa explícita mantém GPT-5.4 mini, aceita até oito ofertas comprovadas na loja e calcula média de todas elas; não faz pesquisas adicionais para completar a quantidade. Origem bloqueada, variante conflitante ou estoque indisponível não comprova preço. Resultado vazio preserva referência salva. Preparação local não publicada; testes reais mostram cobertura variável. Demais funções sem impacto operacional.

> Revisão 3.2.0.97: atualização manual de preço mantém produto, lista e filtros, aplica somente a ficha pesquisada e exibe o resultado junto à ação no Web e AvantaPreços, incluindo ausência de ofertas, cache e falhas. Anúncios não sincronizam automaticamente ao entrar, por intervalo ou retorno à aba; demais cards permanecem estáveis após a carga e atualizam por ações explícitas. Somente vendas online aplicam atualizações periódicas; pendências completas são consultadas na carga inicial/ação manual. Mantidas sincronização de estoque no servidor, autorização, limites e modelo econômico. Gestão e AvantaVendas sem impacto operacional. Publicação autorizada; enviado/em build não significa publicado.

> Revisão 3.2.0.96: AvantaPreços avisa Produto cadastrado sem preço e orienta referência manual ou Atualizar preço. Preços são conferidos no cadastro e nos valores retornados pelo histórico antes de confirmar sucesso; divergência exibe erro. Pesquisa sem oferta e edição com preço vazio preservam a referência anterior. Sem pesquisa automática, alteração de estoque ou anúncios; sem impacto operacional na Gestão/AvantaVendas.

> Revisão 3.2.0.95: cards de produtos, estoque, anúncios, vendas e base local do AvantaPreços destacam o carregamento com círculo maior, mensagem, superfície na cor do perfil e três prévias de linhas. Após oito segundos avisam da demora, sem porcentagem fictícia nem bloquear a página. Demais fluxos preservados.

> Revisão 3.2.0.94: sem impacto operacional; corrigidos os testes de cancelamento para o estado de carregamento local, preservando todas as verificações e as melhorias de lista e filtros do AvantaPreços.

> Revisão 3.2.0.93: AvantaPreços informa Carregando produto ao abrir histórico/cadastro na base da empresa, sem pesquisa externa. Pesquisando preços fica reservado à pesquisa explícita. Publicação inclui lista inicial completa e filtros .92.

> Revisão 3.2.0.92: AvantaPreços abre a lista da empresa em A–Z sem exigir busca. Pesquisar é opcional; limpar restaura a lista sem mudar o filtro escolhido. Opções: última atualização, data de cadastro (recentes primeiro), anunciados, com estoque e sem estoque; saldo positivo em qualquer estoque não arquivado conta como com estoque. Sem IA/fontes externas.

> Revisão 3.2.0.91: publicação autorizada dos avisos únicos da Gestão Mobile sobre a produção .90. Sem impacto operacional na Gestão Web, Marketplaces ou AvantaPreços. Enviado/em build não significa publicado.

> Revisão 3.2.0.90: AvantaPreços separa Ver produtos e estoque em área exclusiva da base da empresa. Voltar e busca acima; resultados roláveis sob cabeçalho com ordenação e Limpar resultados. Abertura não pesquisa; digitar usa somente cadastro da empresa, sem IA nem fontes externas. Retorno dos detalhes preserva termo/página.

> Revisão 3.2.0.89: sem impacto operacional na Gestão Web. Mobile usa confirmação única e curta após recibo de inclusão/alteração/exclusão; fila e recuperação de falhas preservadas. Sem publicação nesta tarefa.

> Revisão 3.2.0.88: ao expandir produto em cadastros, estoque, anúncios ou vendas, role dentro dos detalhes; a identificação permanece fora dessa rolagem. Mantidas largura, edição, demais ações da página e alinhamento inicial sob os marketplaces.

> Revisão 3.2.0.87: Excluir produto apresenta Confirmar exclusão antes das opções de anúncios. Uma confirmação manual conclui quando não há pendências; bloqueios reais explicam por que a ação está desabilitada. Conferir novamente não exclui automaticamente. Saldo desconhecido não bloqueia; histórico preservado.

> Revisão 3.2.0.86: AvantaPreços abre produto/histórico com o preço salvo e mantém amostra e data da consulta. Nova pesquisa somente ao clicar em Atualizar preço; edição manual permanece disponível.

> Revisão 3.2.0.85: sem impacto operacional. Otimização somente de testes/build/fila de publicação; login, sessão, permissões e dados preservados. Não anunciar publicação desta entrega antes de confirmação.

> Revisão 3.2.0.84: publicação dos ajustes aprovados do AvantaVendas; sem impacto operacional na Gestão Web. AvantaPreços .80/.83 não incluído. Aguardar conclusão da publicação.

> Revisão 3.2.0.83: Web/AvantaPreços usam mini para descobrir links; somente preço/disponibilidade lidos diretamente em Product/Offer da origem entram numa nova referência. Sem estoque, pausado, encerrado, variante divergente, página bloqueada ou dados insuficientes são descartados. Podem existir menos de cinco ofertas ou nenhuma; referência anterior permanece sem ser declarada atual. Cache economiza descoberta por seis horas, mas relê a origem em cada atualização explícita. Limites .80 e uso registrados, sem fallback 5.5. Cancelar é melhor esforço, não estorno garantido. Bloqueio .80 é histórico: .83 tem avaliação da origem; produção somente após recibo. Entrega isolada não inclui AvantaVendas av192/av193; nenhum produto/anúncio publicado nos testes.

> Revisão 3.2.0.82: alinhamento das setas e ampliação sem borda nos materiais do AvantaVendas; sem impacto operacional na Gestão Web. Sem mudanças em arquivos ou dados. Local, não publicado.

> Revisão 3.2.0.81: tema roxo no formulário de consignado do AvantaVendas; sem impacto operacional na Gestão Web, precificação ou integração financeira. Não muda dados nem publica a entrega local 3.2.0.80. Local, não publicado.

> Revisão 3.2.0.80: preparação local de pesquisa com GPT-5.4 mini e controles de consumo compartilhados Web/AvantaPreços. Cache 6h por variante/empresa, cinco ofertas, limites de 5/min usuário, 30/h e 100/24h empresa; sem fallback 5.5. Cache informa reaproveitamento, não nova coleta. Cancelamento propagado não garante estorno; custos sem métricas permanecem desconhecidos. Avaliação real não aprovada por anúncio pausado/preço divergente; NÃO publicado nem migração aplicada. Produção não recebe estes controles até validação da origem. Demais módulos sem impacto novo.

> Revisão 3.2.0.79: Anunciados, Estoques e Produtos cadastrados usam a mesma tarja de situação. Produto local com qualquer anúncio ativo mantém Anunciado, mesmo com saldo zero ou filtro por outra conta. Pausado/Em análise/Desativado seguem a situação; excluídos ou somente locais sem tarja. Histórico de Vendas sem tarja. Pendências .77–.78 incluídas na entrega; não publicar produtos nos testes.

> Revisão 3.2.0.78: ao editar produto em Estoques/Produtos cadastrados Web, cadastro é salvo primeiro; se há anúncios vinculados aplicáveis, perguntar Atualizar os anúncios também? Somente cadastro não altera a plataforma. Revisar anúncios permite escolher cada conta/anúncio e revisar Dados ou Preço de venda; apenas Salvar alterações envia para o anúncio escolhido. Referência não é preço de venda: só usar como sugestão com opção explícita, ou digitar no formulário. Título/descrição dependem de permissão da plataforma; fotos/EAN/categoria não são enviados pelo editor atual. Confirmadas pelo marketplace exige retorno conferido; aguardando confirmação ainda é pendente, não repetir cegamente. Link Abrir anúncio reaparece nos vínculos; Carregar link consulta quando URL ainda não está disponível. Erro não apaga o cadastro local. Local, não publicado, sem alteração real de anúncios ou nova migração.

> Revisão 3.2.0.77: Excluir produto abre diretamente uma confirmação quando não há anúncios vinculados. Não exige confirmar saldo desconhecido nem registrar saída para limpar cadastro duplicado; após confirmar, apaga o cadastro/saldos/consultas do produto escolhido. Vendas/movimentações históricas permanecem independentes do cadastro. Com anúncios, encerrar/excluir explicitamente em todas as contas antes; pausa não basta e falha não significa inexistente. Sem checkbox/arquivamento. Cancelar não altera dados; falha recupera a mesma tentativa. Buscas ignoram acentos/ç e caixa; `maquina` encontra `Máquina`, inclusive em outras páginas. Migrações só preparadas/testadas localmente; não aplicadas/publicadas, nenhum produto real removido.

> Entrega autorizada 3.2.0.76: migração de exclusão/arquivamento aplicada com cadastros e saldos preservados, sem executar remoções. Publicação do sistema solicitada junto das pendências .73–.75; só considerar no ar após confirmação do deploy. As notas de implementação local abaixo são históricas. Não publicar nenhum produto nesta entrega.

> Revisão 3.2.0.76: Web e AvantaPreços oferecem Excluir produto nos detalhes, para gestores/administradores/operadores completos. Conferir todos os estoques e contas vinculadas; saldo positivo ou a confirmar exige saída/transferência ou confirmação real de zero, nunca zerar para burlar o bloqueio. Anúncio ativo deve ser pausado/encerrado explicitamente e conferido novamente; falha/desconexão ou operação pendente bloqueia. Confirmação relê todas as contas. Com histórico/vínculos, arquiva preservando registros; sem uso, exclui definitivamente após ciência e confirmação. Arquivado sai das listas/buscas ativas, não é recriado por sincronização e não apaga anúncios externos. Permissão dedicada de estoque não concede exclusão. Migração apenas preparada/testada em isolamento; não publicada nem aplicada em produção. Sem dados reais alterados.

> Revisão 3.2.0.75: após publicação confirmada, Novo anúncio fecha o produto/preparação, mantém aviso de sucesso, libera controles, atualiza listas e volta ao topo da página sem recarregar. No Magalu, aceite do SKU/análise ainda não é conclusão: só publicado encerra. Erro/resultado parcial/incerto conserva dados para conferir e não volta ao topo como sucesso. Nenhum produto publicado nos testes; correção local não publicada, sem migração.

> Revisão 3.2.0.74: erro de EAN no Novo anúncio leva a EAN do produto no anúncio, nunca ao campo de busca. Campo do anúncio permanece visível e recebe destaque/mensagem inline. Sem EAN, conferir motivo de ausência quando disponível na categoria pelo atalho; não inventar código nem presumir dispensa do ML. Ficha externa usa código da origem; corrigir na origem e revalidar. Sem publicar produto ou dados; correção local não publicada.

> Revisão 3.2.0.73: após recusa em Novo anúncio ML, corrigir campos e tentar novamente sem recarregar. Publicar indica/foca pendências, inclusive confirmação desmarcada e revisão do frete, sem enviar enquanto incompleto. Mensagem próxima do botão explica o próximo passo. Recusa explícita de validação permite nova tentativa; resposta incerta/timeout/resultado parcial mantém proteção e exige conferir Anunciados/ML antes de repetir. Espera limitada libera a interface e mantém os dados. Sem novo produto publicado; correção local, não publicada, sem migração.

> Revisão 3.2.0.72: Novo anúncio ML permite frete grátis opcional; quando exigido pela conta/categoria, fica marcado e bloqueado com aviso. Exibe custo estimado do vendedor por unidade antes de publicar, nunca confundir com preço do produto. Medidas padrão da categoria são identificadas; embalagem manual é usada na simulação e deve ser conferida também nas características. Custo indisponível exige ciência; regras desconhecidas exigem nova consulta. Preço/conta/embalagem alterados invalidam a conferência e a assinatura vence em dez minutos. Sem publicar produto nesta entrega, sem migração.

> Revisão 3.2.0.71: advertências explicitamente não bloqueantes do pré-validador ML não impedem criar anúncio. Somente POST /items/validate com HTTP 400/validation_error e todas as causas válidas do tipo warning recebe esse tratamento; recusa real/vazia/mista e qualquer falha de criação continuam bloqueando. Sucesso exige ID/vendedor confirmados. Atributos internos read_only/inferred não são enviados nem solicitados como obrigatórios, cadastro preservado. Categoria sugerida deve corresponder ao produto; previsão automática não é confirmação. Publicação/reteste autorizados, sem migração.

> Revisão 3.2.0.70: Novo anúncio orienta recusas em português e destaca campos identificados. Prazo da garantia requer quantidade e unidade: ex. 3 meses; não presumir unidade para “3”. Resposta original sanitizada fica em Detalhes técnicos, recolhida. Recusa desconhecida pede suporte sem inventar causa; falha de rede em operação pede conferir a lista antes de repetir. Dados preenchidos permanecem. Correção local, sem publicação ou migração.

> Revisão 3.2.0.69: rodapé de Marketplaces fica no fim da página, sem faixa vazia após ele; Pesquisar produtos continua flutuante, subindo quando o rodapé aparece para preservar links legais. Sem mudança operacional de estoque/anúncios, sessão ou permissões. Publicação autorizada somente do sistema; build em andamento não significa publicado.

> Revisão 3.2.0.68: Novo anúncio consulta o modelo atual da conta de destino no ML. Contas User Products enviam family_name; legadas enviam title, automaticamente, sem novo campo obrigatório para o usuário. Falha ao confirmar conta/modelo não envia anúncio: tentar novamente sem alterar cadastro por suposição. Cópia entre contas usa o modelo do destino. Motivos de recusa permanecem visíveis; sem publicação automática de produto durante testes, sem migração.

> Revisão 3.2.0.67: em Novo anúncio, recusa ML apresenta motivo/código informado pela plataforma e campos identificados. Conferir campo leva ao controle/características, sem apagar preenchimento nem reenviar automaticamente. Título ou característica herdada requer corrigir cadastro de origem e preparar novamente. Sem campo na resposta, informar essa limitação, não presumir falta de estoque/preenchimento. Testes simulados, sem publicação real ou migração.

> Revisão 3.2.0.63: correção do comprovante de consignado no AvantaVendas; sem impacto operacional na Gestão Web ou na integração financeira. Não regrava lançamentos. Publicado em `dpl_8s3BsjTyEPYpnERkpBCkroc6Rzzq`, com domínios oficiais conferidos. Alterações locais 3.2.0.59–3.2.0.62 não incluídas.

> Revisão3.2.0.43: no Web de Marketplaces, produto expandido no estoque mostra tarja verde Anunciado quando possui publicação confirmada. Filtro Todos/Anunciado/Não anunciado entre arrastar e Criar estoque atua antes da paginação, junto à pesquisa e estoque selecionado. Pausados do Mercado Livre continuam anunciados; rascunhos/excluídos não contam. Recolher produto libera a troca do filtro. Sem impacto operacional na Gestão nativa e no AvantaPreços/AvantaVendas; sem migração.

> Revisão local3.2.0.42: consultar EAN digitado ou pelo leitor abre diretamente detalhes e preços quando o produto é identificado, local ou externo. Busca por descrição segue listando resultados para seleção; EAN ambíguo/ausente não abre produto por suposição. Cancelar e proteção contra resposta antiga mantidos. Sem migração ou publicação; sem impacto operacional na Gestão nativa e AvantaVendas.

> Publicação3.2.0.41 autorizada: migração20261021040000 aplicada com preservação verificada de102produtos,129saldos e registros de10tabelas. Ficha web completa apenas ausências com fontes e EAN válido; Atualizar preço recupera dados faltantes de produto existente. Sem pesquisa em massa ou alteração de estoque/anúncios. Envio à Vercel em preparação; build iniciado não significa no ar. Notas locais anteriores de migração não aplicada são históricas. Gestão nativa e AvantaVendas sem impacto operacional.

> Revisão3.2.0.41: pesquisa web no AvantaPreços completa EAN válido, descrição, foto e características quando encontrados para o produto exato com fonte consultada. Características/fontes nos detalhes; cadastro preserva campos manuais/saldo/anúncios e Atualizar preço completa produto existente. Dado ausente/ambíguo continua vazio. Migração preparada, não aplicada; não publicado. Sem impacto operacional na Gestão nativa e AvantaVendas.

> Revisão3.2.0.40: AvantaPreços mantém EAN, descrição, internet e resultados no início; selecionar um produto abre detalhes com Voltar/Nova pesquisa. Cancelar também encerra busca local e abertura de produto, respostas antigas são ignoradas. Consultas auxiliares têm limite; salvar preço não aguarda histórico. Erro de gravação pede conferir valor antes de repetir. Cancelar não desfaz gravação já recebida. Sem impacto operacional na Gestão nativa e AvantaVendas; sem migração.

> Revisão local3.2.0.39: AvantaPreços tem × para limpar EAN digitado, EAN do leitor e busca por descrição enquanto preenchidos. Apaga só o campo acionado, sem consultar automaticamente ou alterar outro filtro/cadastro. Sem impacto operacional no Web de gestão, Gestão nativa e AvantaVendas; não publicado.

> Revisão local3.2.0.38: no AvantaPreços, Cancelar aparece durante pesquisa na internet/atualização de preço, antes ou depois da identificação do produto. Interrompe acompanhamento e libera o app imediatamente, mantendo a tela atual e ignorando respostas antigas. Não reverte gravação concluída nem garante revogação de tarefa já recebida pelo provedor. Sem impacto operacional no módulo Web de gestão de anúncios, Gestão nativa ou AvantaVendas; não publicado.

> Revisão local3.2.0.37: refinamento visual do estoque, compacto e setorizado. Estoque/operação lado a lado, quantidade e saldo atual do depósito selecionado juntos; notas e Cancelar/Concluir permanecem separados. Sem mudança de permissões, persistência ou instruções de cadastro/post. Sem impacto operacional na Gestão nativa/AvantaVendas; migração não aplicada, não publicado.

> Revisão local3.2.0.36: entrada/ajuste/transferência tem campos setorizados e observações internas opcionais de até160caracteres por produto. Usuários do perfil visualizam no produto, fora da publicação online. Criar post copia para Detalhes editável, revisar antes de gerar; edição do post não salva nota no cadastro. Exige Editar estoque para gravar, revisão protege concorrência e repetição não duplica entrada. Migração apenas preparada, não aplicada nem publicada; sem impacto na Gestão nativa/AvantaVendas.

> Revisão local 3.2.0.35: AvantaPreços oculta o seletor de contas; aviso somente Conectado/Desconectado, sem provedor ou quantidade. Preparação não declara desconexão antes de consultar. Conexão de pesquisa permanece interna; gestão de contas somente no Web. Etiquetas procuram todas as vendas do perfil. Falhas reais são informadas. Sem impacto operacional na Gestão nativa/AvantaVendas; não publicado. Leitor3.2.0.34 já publicado, notas locais anteriores são históricas.

> Revisão local 3.2.0.34: Ler etiqueta procura primeiro nas vendas Mercado Livre registradas no perfil, todas as contas/períodos, pelo ID do envio, sem depender de OAuth ativo nem da conta selecionada. Foto/EAN da mesma conta; sem aproximação por nome ou acesso a outros perfis. Só na ausência de venda local tenta as contas conectadas. Banco indisponível não é ausência. Sem preço/escritas; não publicado. Gestão nativa/AvantaVendas sem impacto operacional.

> Revisão local 3.2.0.33: no AvantaPreços, Ler etiqueta à esquerda e Ler EAN à direita, também na ordem de teclado e na prévia local. Mantém comportamento, modal e acesso. Não publicado; sem impacto operacional na Gestão nativa e AvantaVendas.

> Revisão local 3.2.0.32: Ler etiqueta no AvantaPreços também mostra Código da etiqueta (ID do envio lido) e EAN de cada produto, sem preço nem bipagem de conferência. EAN validado da ficha/variação correta; ausente mostra Não informado, sem presumir SKU ou EAN do pai. Somente Fechar; sem alteração de estoque/venda. Prévia fictícia local, não publicado; configuração OAuth real ainda pendente. Sem impacto operacional na Gestão nativa/AvantaVendas.

> Revisão local3.2.0.31: no AvantaPreços, Ler etiqueta fica junto a Ler EAN. QR Mercado Livre → consulta autorizada → foto e descrição dos produtos em modal com somente Fechar. Sem preço, bipagem de conferência EAN, cadastro, histórico de preços, movimentação ou despacho. Prévia fictícia em validacao-etiqueta; teste real local exige configuração OAuth segura. Não publicado. Sem impacto operacional na Gestão nativa e no AvantaVendas.

> Revisão 3.2.0.30: compactação de scripts exclusiva do AvantaVendas. Sem impacto operacional na Gestão Web, autenticação, permissões ou dados.

> Revisão 3.2.0.29: distribuição compacta exclusiva da Gestão Mobile, com lógica e URLs preservadas. Sem impacto operacional na Gestão Web; login/permissões/dados não alterados.

> Revisão de infraestrutura 21/10/2026, aplicação 3.2.0.28 mantida: WWW corrigido e proteções de cache/cabeçalhos aplicadas no Cloudflare/Vercel, sem impacto operacional. Login, permissões e dados não alterados; não orientar reinstalação, limpeza de dados ou nova senha. Auditoria em `docs/auditorias/cloudflare-entrega-web-2026-10-21.md`.

> Revisão 3.2.0.28 (prevalece sobre notas históricas): Magalu passa a compartilhar Anunciados, editor, avisos e conferência Online/anúncios com ML. Pedido novo aprovado baixa por SKU/conta uma vez; histórico anterior à ativação não é rebaixado. Zero só conclui após saldo zero e pausa relidos. Pausa manual preservada; cancelamento não repõe fisicamente por suposição. Reposição espera pedidos recentes/completos. Atualização Magalu é periódica, não instantânea; 202 significa processamento. Etiquetas pelo portal e taxas indisponíveis explicitadas; Full/Multi-Origem protegidos. Sem integração financeira nem impacto operacional no AvantaVendas/Gestão nativa. A versão3.2.0.27 já foi publicada; notas locais .27 abaixo são históricas.

> Revisão local 3.2.0.27: produto → Publicação → Estoque dos anúncios → Conferir saldos/Resolver compara Online e anúncios por conta; aviso compacto junto ao saldo e nas pendências abre a mesma conferência. Escolha Online para anúncios ou importe UMA origem (não soma contas); confira físico e confirme. Saldão/outros preservados. Zero requer confirmação adicional e pausa relida; fila/erro não significa concluído. Pausas manuais nunca são reativadas automaticamente. Mercado Livre elegível; Magalu não incluído. Venda exige saldo positivo e permissão. Migração somente testada localmente; não publicado.

> Revisão local 3.2.0.26: Venda/Registrar venda exige permissão e saldo positivo em algum estoque. Online zerado não impede venda pelo Saldão abastecido; formulário escolhe origem com saldo, sem modificar tentativas guardadas. Sincronização: Mercado Livre baixa pedido vinculado uma vez do Online e enfileira saldo para seus anúncios elegíveis no mesmo cadastro; não é instantâneo. Magalu importa vendas/avisos, sem baixa ou sincronização de saldo automática implementada. Cancelamento não devolve unidade automaticamente. Local, não publicado.

> Revisão local 3.2.0.25: Criar post do AvantaPreços usa Detalhes para qualquer condição (Novo/Usado/Com avaria). Observações opcionais até 160 caracteres; Com avaria exige explicar a condição. Conteúdo é preservado ao trocar condição, aparece ampliado na imagem. De maior/tachado, Por à direita, pílulas maiores. Não altera cadastro/estoque/venda. Ainda não publicado.

> Revisão local 3.2.0.24: AvantaPreços com SVG Atualizar saldos simplificado e pílulas de saldo numérico acessíveis. Online vazio/zero mostra 0 un.; quantidade positiva é mantida independentemente de confirmação. Não altera banco ou saldo automaticamente. Foto anterior difere dos bundles públicos .23; após publicação, fechar/reabrir PWA conectado, sem apagar dados/reinstalar. Local, não publicado.

> Revisão local 3.2.0.23 substitui a orientação .22 sobre saldo: em Estoques e Produtos cadastrados, Preparar anúncio sem saldo online mostra “sem estoque disponível” ao lado do botão e não abre o preparo. Corrigir o saldo online permite continuar; saldo offline não conta. Com saldo, cadastro incompleto continua permitido para completar em Novo anúncio. Ainda não publicado.

> Revisão local 3.2.0.22: Estoques e Produtos cadastrados → expandir produto → Publicação → selecionar conta autorizada → Preparar anúncio. Abre Novo anúncio preenchido com os dados locais, mesmo sem saldo, categoria ou foto. Revisar os campos destacados; categoria/opções são confirmadas na conta. Cadastro mínimo não impede preparo; publicação exige dados válidos, saldo online suficiente e confirmação. Preparo não altera cadastro/estoque nem publica. Magalu também mostra a ficha antes de selecionar categoria. Ainda não publicado.

> Publicação 3.2.0.18 em 20/10/2026: refinamentos .14–.18 do AvantaPreços e Online/Saldão no card Vendas publicados. Criar post → revisar foto/descrição, voltagem/condição/avaria → informar De real e Por → Gerar post → revisar → Compartilhar post ou Baixar imagem. Cor primária do perfil; sem alteração de cadastro, saldo ou financeiro ao gerar imagem. Fechar/reabrir PWA sem apagar dados; compartilhamento real depende do aparelho e será testado pelo responsável. Notas locais .14–.18 abaixo são históricas; demais trabalhos locais não foram publicados.

> Publicação 3.2.0.07 confirmada em 20/10/2026: ajustes de acesso/retomada exclusivos do AvantaVendas no ar, sem impacto operacional na Gestão. Notas locais .07 abaixo são históricas. Sem migração, mudança financeira ou de permissões.

> Produção 3.2.0.02 confirmada em 19/10/2026 nos dois domínios: revisões 01–02 publicadas. Cabeçalhos com ações compactas de 32 px e expandir/recolher somente setas; Estoques no AvantaKanban, padrão Vendas → Anunciados → Estoques → Produtos, com seis pontos e teclado. Ordens personalizadas antigas preservadas na mesma chave por usuário/empresa. Notas locais 01–02 abaixo são históricas. Recarregar Web sem apagar dados/preferências; sem impacto operacional na Gestão nativa/AvantaVendas/PWA, sem migração ou movimentação real.

> Produção 3.2.0 confirmada em 19/10/2026 nos dois domínios: migração aplicada e estoques separados disponíveis no Web/AvantaPreços. Os 65 produtos e saldos antigos foram preservados no Online; nenhuma movimentação ou permissão real alterada. Notas locais 71/3.2.0 e pendências de publicação abaixo são históricas. Criar/renomear estoques, Dar entrada, Ajustar saldo final e Transferir usam a mesma base por perfil. Só Online alimenta anúncios. Baixa manual por venda offline e novos critérios de cancelamento ficam para a próxima etapa; Gestão nativa/AvantaVendas sem impacto operacional. Recarregar Web ou fechar/reabrir PWA, sem apagar dados/reinstalar. Teste autenticado com o responsável.

> Produção 3.1.0.70 confirmada em 19/10/2026 nos dois domínios: revisões 65–70 publicadas. Salvar usuário termina silenciosamente, setas liberadas após salvar, Senha placeholder ****. Pendências no alerta à esquerda do mês com painel compacto; título alinhado ao seletor e mesma altura visual. Vendas/Anunciados com círculo durante consulta real; cards inicialmente recolhidos e atualização passiva preservados. Notas locais 65–70 abaixo são históricas. Recarregar sem apagar dados/reinstalar; ensaio autenticado com o responsável. Nenhuma permissão ou quantidade real alterada no deploy.

> Produção 3.1.0.51 confirmada em 19/10/2026: consulta/cadastro/estoque das revisões 49–51 disponíveis, migrações instaladas e consultas antigas vinculadas sem saldo presumido. Sem quantidade: Produto fora de estoque / Estoque a ser inserido / Adicionar → quantidade → Concluir. Saldo positivo: Já em estoque / quantidade / Editar saldo final; zero volta a fora de estoque / 0 unidades / Adicionar. Bipe reutiliza o cadastro por EAN, sem somar unidades nem pesquisar novamente; Atualizar preço é explícito. Notas locais/pending abaixo são históricas. Recarregar Web ou fechar/reabrir PWA sem apagar dados/reinstalar; entrar se a sessão tiver expirado. Ensaio autenticado pelo responsável; não informar que gravamos saldo real no deploy.

> Produção 3.1.0.48 confirmada em 19/10/2026, migração instalada. Recuperar fotos completou os 28 produtos sem imagens da Saldão Aline, com fotos carregando e demais campos preservados. Importar/reimportar preenche somente cadastros vazios; nunca substitui fotos existentes/manuais. Na pílula Referência, seta circular pesquisa ofertas atuais e atualiza somente a média local e seus três preços calculados, não preços dos anúncios nem lotes salvos. Recolher detalhes antes de pesquisar; aguardar sem repetir, atualizar a lista após resposta incerta. Falha/sem ofertas mantém referência; edição concorrente não é sobrescrita. Notas locais 48 abaixo são históricas. Exclusivamente Web.

> Produção 3.1.0.47 confirmada: revisões 44–47 disponíveis e migração de configurações instalada. Notas locais 44–47 abaixo são históricas, inclusive a antiga pendência do banco. Configurações do AvantaPreços reúne percentuais da referência/aparência por empresa; novos cálculos Web/PWA usam a regra compartilhada, lotes salvos preservam valores. Card de produtos é somente Web: referência em pílula estável e todas as etiquetas confirmadas visíveis, quatro por linha. Recarregar sem apagar dados/reinstalar. Build e arquivos/APIs conferidos; ensaio autenticado com o responsável. Nenhum anúncio publicado no deploy.

> Produção 3.1.0.41 confirmada em 18/10/2026: ajustes 37–41 de busca automática em Produtos e estoque, atalho com 20% de opacidade, seletor compacto e Contas conectadas somente com seta e inicialmente recolhido. Notas locais 37–41 abaixo são históricas. Recarregar a página, sem reinstalar ou apagar dados. Domínios/arquivos/APIs protegidas conferidos; interação autenticada produtiva/leitor físico com o responsável. A revisão local 42 pertence a outro trabalho, não publicado por esta entrega.

Na revisão 3.2.0.73, **Revalidar dados** recarrega a ficha/categoria de origem sem apagar preço ou descrição digitados. Usar após corrigir o cadastro de origem; não publica nem altera saldo. Continua sendo necessário revisar e confirmar antes de enviar.

> Revisão 3.2.0.122: publicação reutiliza EAN ativo da empresa sem alterar referência ou saldo. Duplicados existentes exigem abrir o cadastro correto; não somar estoques nem escolher preço automaticamente. Proteção adicional de EAN depende da migração desta versão. Local, não publicado.

> Revisão 3.2.0.123: gestor pode aprovar Excluir produtos no usuário do AvantaPreços. Desligado por padrão; independente de Editar estoque/Registrar vendas. Ao abrir produto, autorizados veem Excluir produto e confirmação. Todas as contas vinculadas são conferidas; anúncios não são excluídos automaticamente. Histórico de vendas preservado. Migração/permissão e interface preparadas, não publicadas. Duplicados legados não são removidos automaticamente.

> Revisão 3.2.0.124: sem impacto operacional na Gestão Web. Somente visual da preparação do AvantaVendas, sem backend.

<!-- ava-version: 3.2.0.124 -->

Revisão 3.2.0.121: Marketplaces Web oferece Vendas, Anunciados e Estoque à esquerda do rodapé e pesquisa à direita, todos compactos e com a mesma aparência. Abrem e alinham o card existente, sem trocar filtros ou pesquisar externamente. Produto em foco deve ser recolhido antes. Em telas estreitas usam ícones acessíveis. Gestão Mobile e AvantaVendas sem impacto operacional; local não publicado.

Revisão 3.2.0.120: Anunciados oferece Ver no estoque ao lado de Ver anúncios, levando ao ID vinculado no card Estoques, destacado e recolhido. Expandir permite editar; Voltar à lista retorna aos demais. Sem vínculo a ação é inativa, sem cadastro duplicado/pesquisa externa. Gestão Mobile e AvantaVendas sem impacto operacional.

Revisão 3.2.0.119: Fichas de Produtos cadastrados/Estoques com Expandir/Recolher textual usam pílula e foco exclusivo no produto, com rolagem interna. Recolher desmonta rascunho não salvo, restaura interação/rolagem e mantém envios protegidos. Controles só com seta, Gestão Mobile e AvantaVendas sem impacto operacional.

Revisão 3.2.0.118: Cancelar anúncio no topo e rodapé fica inativo na ficha vazia; digitar EAN/nome ou carregar produto o habilita. Limpar volta a desativá-lo, e preparação/envio continuam bloqueando a ação. Sem impacto operacional na Gestão Mobile e AvantaVendas; local não publicado.

Revisão 3.2.0.117: Novo anúncio oferece Cancelar anúncio no topo, ao lado de Pesquisar, e mantém o do rodapé. Ambos limpam a preparação pelo mesmo fluxo e ficam indisponíveis durante preparação/envio. Inclui preenchimento pela origem e agrupamento 115–116; sem impacto operacional na Gestão Mobile e AvantaVendas. Publicação do sistema autorizada, sem publicar produtos.

Revisão 3.2.0.116: Anunciados reúne anúncios vinculados ao mesmo cadastro local em um grupo, com contagem de contas/anúncios, situações e faixa de preços. Expandir permite editar ou abrir cada anúncio por conta. Saldo Online compartilhado aparece uma vez e não é somado. Sem vínculo local, anúncios permanecem separados. Paginação preserva grupos completos. Sem impacto operacional na Gestão Mobile e AvantaVendas; ajuste local não publicado.

Revisão 3.2.0.115: Anunciar em mais contas abre os dados já preenchidos a partir do anúncio de origem, inclusive com EAN; revalidar não os substitui pelos dados comerciais locais. Valores da origem temporariamente ausentes das opções continuam visíveis, mas precisam de validação na conta nova. Contas existentes são conferidas pelos vínculos persistidos e ficam bloqueadas. Campos editáveis preservados; EAN e saldo Online únicos. Sem impacto operacional na Gestão Mobile e AvantaVendas. Ajuste local não publicado.

Refinamento visual da 3.2.0.114: contas de destino usam até três colunas conforme o espaço do formulário; telas estreitas reduzem a grade sem mudar seleção, validação ou bloqueio das contas já anunciadas.

Revisão 3.2.0.114: Marketplaces: preparação com seleção de contas ao final, contas já anunciadas marcadas e bloqueadas, validação e resultado por conta, repetição sem duplicar envios confirmados e confirmação separada para atualizar dados comerciais existentes. EAN e saldo Online comuns ao cadastro; envio prioritário de alterações de estoque com fila durável, confirmação remota e preservação das pausas manuais. Magalu mantém o processamento assíncrono e exige revisão dos campos de sua categoria. Nenhum produto real publicado durante os testes. Gestão Mobile e AvantaVendas sem impacto operacional.

Revisão local 3.2.0.113: expandir manualmente Contas conectadas, Vendas, Anunciados, Estoques ou Produtos cadastrados alinha o card abaixo do cabeçalho e das marcas. Recolher ou atualizar dados não movimenta a página por essa regra; foco e preferências de movimento são preservados. Ainda não publicado.

Produção 3.2.0.112 confirmada READY/PROMOTED em 23/10/2026: limpeza do Novo anúncio, botões e correção da leitura das contas disponíveis nos domínios oficiais, com restauração 3.2.0.109 preservada. Notas locais 110–112 abaixo são históricas. Publicação em várias contas de uma vez ainda não existe nem foi implementada nesta entrega.

Revisão 3.2.0.112: ações do Novo anúncio ML ficam à direita na ordem Cancelar anúncio (vermelho), Revalidar dados (azul) e Publicar (verde), com destaque e efeito de clique. Funções e confirmações não mudam: cancelar descarta só o rascunho; revalidar consulta os dados; somente Publicar pode enviar após validação e confirmação. Ajuste local, não publicado.

Revisão 3.2.0.111: Contas conectadas e Anunciados compartilham uma consulta em andamento, sem duplicar a leitura inicial nem guardar permissões em cache permanente. Consulta tem prazo de 30 segundos, incluindo a sessão. Demora mostra aviso de consulta e permite Atualizar contas, preservando contas já carregadas; sucesso limpa o aviso. Timeout não significa desconexão nem exige nova autorização. Troca de perfil descarta respostas antigas. Sem alterar OAuth, banco ou anúncios; correção local, não publicada.

Revisão 3.2.0.110: Novo anúncio ML omite avisos repetitivos de preparo e a ajuda fixa do EAN preenchido. Validar EAN aparece apenas se o código local mudar ou houver erro de EAN; não é pesquisa de produto nem dispensa revisão/validação da conta e categoria. Cancelar anúncio (antes Limpar preparação) descarta somente o rascunho e libera novo preparo; não cancela anúncios publicados nem altera cadastro/estoque. Erros e pendências continuam visíveis. Ajuste local, não publicado.

Revisão 3.2.0.109: Produtos cadastrados obtém a quantidade diretamente do servidor e carrega a lista apenas ao expandir, sem bloquear a página pela contagem. Atualizar com o card recolhido atualiza só o total. A Gestão preserva o módulo já aberto quando revalida permissões do mesmo perfil, evitando uma segunda preparação; acesso revogado/troca de perfil continuam efetivos. Preparar anúncio leva Novo anúncio ao topo útil, abaixo da navegação, e mantém o alinhamento ao concluir a preparação, sem atualizar todas as listas. Prévia com foto e campos alinhados incluída na entrega autorizada; só anunciar publicação quando a Vercel confirmar READY e domínios.

Revisão 3.2.0.108: Preparar anúncio no Web organiza campos à esquerda e Prévia do anúncio à direita, com foto, título, preço, quantidade e condições preenchidas, atualizados na edição. Descrição e características/ficha técnica podem ser abertas dentro da prévia. A foto ausente mostra Sem foto. A prévia acompanha a rolagem e não representa anúncio já publicado nem a aparência exata no marketplace. Topo, datas, marcas, confirmação e fluxo de envio não mudam. Ponto local anterior 3.2.0.107 preservado; sem publicação do sistema.

Revisão 3.2.0.107: laboratório de Preparar anúncio disponível somente no desenvolvimento local em `/marketplaces/simulacao-preparo`. Usa dados fictícios e o formulário real, incluindo resumo flutuante e frete simulado. Escolha Sucesso, Recusa com erro no campo ou Resposta incerta; revise e marque a confirmação antes de Simular publicação. Reiniciar teste/trocar cenário descarta edições. Não conecta conta, consulta ML, grava estoque ou cria anúncio real. Não valida a integração OAuth/API. O módulo operacional e seus controles permanecem iguais; sem publicação do sistema.

Revisão 3.2.0.106: no Web, o Resumo da preparação acompanha a rolagem à direita e permanece centralizado na área útil abaixo dos controles fixos. Se necessário, role dentro do resumo ou use o teclado. Largura reduzida/zoom mantém resumo no fluxo da página. Campos e confirmação de envio preservados; não publicado.

Revisão 3.2.0.105: no Web, Preparar anúncio de Mercado Livre e Magalu mantém campos, pendências e ações na coluna esquerda e Resumo da preparação à direita. O resumo acompanha os dados editados do rascunho; quantidade para publicar não confirma saldo novo. Preparar não publica nem altera cadastro/estoque. Publicar/Enviar anúncio continuam exigindo revisão, validação e confirmação. Topo, datas e botões dos marketplaces preservados. Sem pesquisa nova de categoria ou publicação desta entrega.

Revisão 3.2.0.104: Atualizar anúncios mantém lista e total conhecidos se a mesma seleção falhar, identifica conta/etapa pendente e continua nas outras contas; não garante atualização remota quando houver recusa. Filtro Ativos oferece Ver todas as situações. Sem mudar permissões, preços ou estoque. Gestão mobile e AvantaVendas sem impacto operacional. Sem publicação nesta etapa.

Revisão 3.2.0.103: Preparar anúncio em Marketplaces mostra carregamento central padrão com fundo translúcido e formulário não interativo, removido no sucesso ou erro. Não significa publicação do produto. Gestão mobile e AvantaVendas sem impacto operacional. Sem publicação nesta etapa.

Revisão 3.2.0.102: avisos de ações de preço no Web e AvantaPreços expiram após 20 segundos e ao encerrar/trocar o produto, sem duplicação. Não confundir aviso transitório com pendência real ou estado sem referência. Preços e cadastro preservados; demais módulos sem impacto operacional. Sem publicação nesta etapa.

Revisão 3.2.0.101: Busca geral de preços ampliada com GPT-5.4 mini: termos mais curtos e identificadores do cadastro, distinção entre modelo e medidas, validação de variante e exclusão de vitrines de peças. Uma recuperação limitada tenta outras fontes quando não há ofertas válidas, respeitando cancelamento, tempo e custos. Média dos até cinco menores preços válidos; abertura local e referência anterior preservadas. Sem impacto operacional nos demais módulos; publicação autorizada, envio/build não significa publicado.

Revisão 3.2.0.100: valores do AvantaPreços ficam em lista vertical, um por linha, em todas as larguras. Sem impacto operacional na Gestão Web; preços, pesquisa e cálculos preservados. Sem publicação nesta etapa.

Revisão 3.2.0.99: OpenAI GPT-5.4 mini volta a fornecer preços totais, lojas e fontes. O servidor calcula a média das até cinco menores ofertas válidas e aplica os percentuais configurados, sem depender de leitura adicional do HTML das lojas. Cache reaproveita preços e fontes da pesquisa recente, sem afirmar nova conferência. Abertura continua somente local e referências não são apagadas em falhas. Demais módulos sem impacto operacional. Publicação autorizada após validar preços e cálculos no Web e AvantaPreços.

Revisão 3.2.0.98: pesquisa explícita também verifica a oferta principal Amazon quando não há dados estruturados, usando somente a variante identificada com estoque e compra habilitada. O preço confirmado forma a referência e os preços mínimo, médio e ideal conforme percentuais configurados. Mantidos GPT-5.4 mini e limites; cache antigo sem ofertas não é reutilizado. Sem impacto operacional nos demais módulos. Versão ainda não publicada.

> Revisão 3.2.0.66: a validação inicial do acesso tem limite de 15 segundos. Falha de sessão/rede não dispara logout: a cena deixa de carregar e mostra Tentar novamente, que recarrega a mesma URL sem limpar sessão/armazenamento. Não orientar apagar dados, reinstalar ou repetir credenciais por uma falha transitória. Conteúdo protegido continua exigindo identidade confirmada e autorizações. Sem migração; Marketplaces 3.2.0.65 e consignado av191 preservados.

> Revisão 3.2.0.65: Marketplaces reconfere automaticamente os anúncios já cadastrados, inclusive excluídos ausentes da busca. A lista exibe o estado remoto confirmado sem substituir uma edição aberta. Falha mantém último estado e gera aviso de conferência parcial; não presumir exclusão por erro/404. Conferência periódica é eventual, não instantânea. Rodapé institucional incluído; preservada a correção de consignado av191. Migração de progresso não altera estoque nem executa pausas em massa.

> Revisão 3.2.0.64: todos os módulos Web de página própria têm rodapé institucional com a versão de seu próprio pacote, inclusive Marketplaces dentro do iframe da Gestão. Projetos preserva o modo de mapa em foco. Ponto/Conteúdo AvantaVendas usam o rodapé da Gestão, sem cópia interna. Não deduzir versão de um iframe pelo rodapé do hospedeiro. Recarregar não comprova pausa remota; conferir situação do anúncio. Sem publicação ou migração.

> Revisão 3.2.0.62: em Estoques, “Produto da pendência” e “Voltar à lista” ficam agrupados com fundo discreto à direita dos seletores. Voltar restaura a lista com os filtros atuais, sem resolver a pendência ou alterar dados. Grupo acomoda larguras menores. Sem publicação ou nova migração.

> Revisão 3.2.0.61: cadastro local único prevalece na divergência de importação; não sobrescrever dados nem criar duplicado, apenas pedir estoque físico Online. Com vários candidatos, escolher cadastro nos avisos e depois confirmar quantidade no produto. Escolher cadastro não encerra o aviso de estoque. Ações de anúncio usam a conta confirmada mesmo em Todas as contas/ficha recolhida; sucesso exige retorno confirmado e resultado pendente continua nos avisos. Nova leitura do estado/valores encerra a pendência comprovada; não repetir envio incerto. Migração local refinada, não aplicada; não publicado.

> Revisão 3.2.0.60: tarjas são situações de publicação, não saldo: Anunciado prevalece sobre Pausado, Em análise e Desativado entre as contas consideradas. Todos excluídos/sem vínculo: sem tarja. Ao sincronizar anúncios externos, importar cadastro ou vincular por identidade segura no perfil; não importar unidades. Nova vinculação pede confirmar quantidade física Online, preservando saldo existente. Confirmação em Ajustar estoque encerra a pendência; não usar soma de contas. Ambiguidade/variações geram aviso para revisão sem novo cadastro por suposição. Migração local pendente, sem publicação.

> Revisão 3.2.0.59: o título Estoques mostra o total de produtos com saldo positivo no estoque selecionado, sem influência de conta, publicação ou busca. Produtos listados mostra separadamente o total dos resultados filtrados, não apenas a página atual. Atualizar e mudanças de cadastro/saldo renovam o total; filtrar/paginar não. Sem publicação.

> Revisão 3.2.0.58: expandir produto pelo título ou seta em Estoques/Produtos cadastrados rola seu início para logo abaixo do seletor de marketplaces. Recolher não move a página; atualização de dados não rouba a posição. Sem publicação.

> Revisão 3.2.0.57: produto expandido → Publicação → Anúncios vinculados permite Conferir situação e ações suportadas por conta: Pausar, Reativar (saldo Online positivo), Encerrar e Excluir após encerramento. Confirmação antes de alterar. Tarja/filtro Anunciado agora exigem anúncio ativo; outro ativo mantém tarja. Não apagar produto nem saldo Saldão. Resultado incerto exige conferir antes de repetir. Não publicado.

> Revisão 3.2.0.56: sincronização Online em duas colunas no Web; anúncios em páginas de três. Escolher direção/origem, Continuar e confirmar físico/zero na etapa seguinte. Alterar direção retorna sem salvar. Sem mudança nas regras de saldo/pausa; sem publicação.

> Revisão 3.2.0.55: nos avisos Web, Conferir e ajustar abre o produto em Estoques Online, o anúncio ou o pedido na conta correta, conforme a pendência, com detalhes abertos. Não sincroniza nem salva automaticamente. Voltar à lista encerra a consulta direcionada; item ausente mostra erro. Sem migração/publicação.

> Revisão 3.2.0.54: avisos de falta/divergência de estoque ignoram anúncios pausados, inativos, encerrados, excluídos ou cancelados, em Mercado Livre e Magalu. Um vínculo ativo do mesmo produto continua sendo conferido; estado desconhecido não é tratado como desativado. Contador usa avisos aplicáveis, sem recriar alerta pela fila bruta. Vendas já registradas aguardando baixa e falhas de conexão/pausa não confirmada permanecem visíveis. Fila e dados não são alterados; reativar anúncio volta a avaliar saldo. Mesma regra nas indicações Web/AvantaPreços. Sem migração/publicação; sem impacto operacional na Gestão nativa e AvantaVendas.

> Revisão 3.2.0.53: Estoques Web agrupa seleção e ações em uma faixa compacta, alinhada à esquerda; Renomear/Usar online/Arquivar ficam junto aos nomes, com divisor e identificação acessível do estoque selecionado. Cores por identidade passam a paleta sóbria de azul/cinza/verde/areia, estável e com contraste verificado; mesma paleta nas etiquetas de vendas diretas Web/AvantaPreços. Seleção mantém marca de confirmação e contorno, Arquivar mantém semântica destrutiva. Sem seletor de cor personalizado, migração ou publicação; dados/permissões preservados e sem impacto operacional na Gestão nativa/AvantaVendas.

> Revisão 3.2.0.52: histórico/detalhes de vendas diretas no Web e AvantaPreços separam Situação da venda e Devoluções em seções verticais distintas, cada uma com título, divisor e espaçamento. Motivo do cancelamento permanece na situação da venda; devoluções só aparecem com retorno registrado. Mesmo arranjo em desktop/mobile, sem competir na mesma linha. Sem alteração de dados, estoque, permissões ou fluxo; sem migração/publicação e sem impacto operacional na Gestão nativa/AvantaVendas.

> Revisão 3.2.0.51: vendas diretas no Web e AvantaPreços mostram somente Venda confirmada ou Venda cancelada quando nenhuma unidade foi devolvida. Havendo devolução física registrada, mostram informação separada: Devolução parcial (quantidade de total) ou Devolução total, com singular/plural correto. Não altera venda, estoque, totais, permissões nem fluxo de cancelamento/devolução. Sem migração/publicação; sem impacto operacional na Gestão nativa e AvantaVendas.

> Revisão 3.2.0.50: Próxima e Anterior nas listas de Anunciados, Estoques, Produtos cadastrados e catálogo do AvantaPreços mudam a página e, após o carregamento, rolam ao topo do respectivo card. Estoque usa o card do depósito, não a sublista. Título recebe foco sem rolagem adicional; cabeçalhos fixos e movimento reduzido respeitados. Filtros/contas/estoque preservados, sem rolagem em atualização automática. Sem migração/publicação ou impacto operacional na Gestão nativa e AvantaVendas.

> Revisão 3.2.0.49: no Web Marketplaces, item expandido em Anunciados/Estoques/Produtos cadastrados não bloqueia navegação. Clicar em filtro, conta, estoque, paginação, atualizar ou outra ação externa recolhe a ficha e executa o comando no mesmo clique; abrir outro item substitui a ficha anterior. Ações/campos internos e modais são preservados. Fechar não salva edições não confirmadas. Gravação/sincronização mantêm bloqueios necessários; atualização automática não descarta ficha aberta. Sem migração ou publicação; sem impacto operacional no AvantaPreços, Gestão nativa e AvantaVendas.

> Revisão 3.2.0.48: todos os usuários com acesso ativo ao AvantaPreços podem Ajustar preço médio/Atualizar cálculos e Atualizar preço nos detalhes do produto. As duas ações atualizam a referência compartilhada no cadastro e recalculam sugestões; não alteram saldo, anúncios ou lotes salvos. Permissão Editar estoque continua independente. Pesquisa explícita preserva cancelamento, limites e proteção de concorrência. Sem impacto operacional na Gestão nativa e AvantaVendas.

> Revisão 3.2.0.47: Estoques Web inicia em Todas as contas e permite escolher uma conta no cabeçalho, junto ao filtro de publicação. Todas mantém produtos sem anúncio; conta específica com Todos mostra produtos vinculados a ela. Anunciado/Não anunciado consideram publicação confirmada na conta escolhida; Não anunciado inclui produtos ainda sem vínculo nela. Lista, busca e contador respeitam esses filtros antes da paginação. Tarja Anunciado aparece na própria linha, sem expandir o produto; com conta selecionada considera somente essa conta. Saldo permanece por depósito, sem soma/duplicação por anúncio. Sem migração/publicação ou impacto na Gestão nativa/AvantaPreços/AvantaVendas.

> Revisão 3.2.0.46: removido Registrar cálculo manual da entrada do AvantaPreços. Produto não localizado mantém a pesquisa e aviso para revisar EAN/descrição ou buscar na internet, sem criar referência vazia ou abrir outro formulário. Produto localizado conserva Ajustar preço médio e Atualizar cálculos nos detalhes. Histórico existente e lotes preservados; consulta não localizada não inventa produto nem preço. Sem migração/publicação e sem impacto operacional na Gestão Web/nativa e AvantaVendas.

> Revisão 3.2.0.45: Web Marketplaces tem contagem leve de Estoques e Anunciados, independente da ficha/lista completa. Total confirmado permanece durante atualização; primeira leitura aguarda consulta real, sem inventar zero. Abrir/recolher card, voltar à aba e ordenar/paginar não recontam; abertura, Atualizar, filtros/estoque/conta e alterações de dados recalculam. Vendas abre registros salvos sem aguardar rede dos marketplaces; Atualizar mantém sincronização. Sem migração/publicação e sem impacto operacional na Gestão nativa/AvantaPreços/AvantaVendas.

> Revisão 3.2.0.44: AvantaPreços abre características recolhidas em cada abertura/troca de produto; seta permite expandir/recolher sem perder os dados. Ler etiqueta tem fundo azul institucional fixo (#003E73), independente do perfil; Ler EAN e demais cores preservados. Sem migração, alteração de dados ou publicação. Sem impacto operacional na Gestão Web/nativa e AvantaVendas.

> Atualização 3.2.0.21 autorizada: arte do WhatsApp aprovada e vinculada somente ao Open Graph/Twitter do link do AvantaPreços; ícone de instalação não mudou. Instalar AvantaPreços abaixo do login inclui prompt Android quando disponível e instruções iPhone. Envio/build não equivale a publicação; a imagem antiga pode permanecer no cache do WhatsApp. Notas de aprovação pendente abaixo são históricas.

> Revisão local 3.2.0.21: login AvantaPreços oferece Instalar AvantaPreços abaixo do card, sem exigir entrar. Android compatível abre a instalação; ausência de prompt mostra instruções. iPhone orienta Safari/Compartilhar/Adicionar à Tela de Início. Oculto no app instalado; cancelar não declara instalação e não altera sessão. Arte da prévia do link em aprovação, ainda não substituída. Não publicado. Revisão .20 de saldo/ícone/post já publicada, AvantaVendas preservado.

> Revisão local 3.2.0.20: saldo não informado aparece como zero no Marketplace/AvantaPreços, inclusive por estoque e na venda; erro de leitura permanece erro. Ajustar estoque permite informar o saldo correto, sem zeragem automática dos anúncios ao apenas abrir. Criar post preenche De com a média pesquisada/referência atual e permite editar; Médio de venda não é a base de De. Ícone Atualizar corrigido no AvantaPreços; AvantaVendas preservado. Sem publicação e sem impacto no financeiro.

> Publicação 3.2.0.19 confirmada: integração financeira Mobile .13 sobre produção .18, com migração aplicada e dados preservados. Refinamentos Web/AvantaPreços/posts .14–.18 e APIs protegidas conferidos; sem outra mudança operacional Web.

> Revisão local 3.2.0.18: post do AvantaPreços usa cor primária do perfil, De (preço anterior real informado) tachado e Por (venda) em destaque. De precisa ser maior que Por; referência de mercado não vira preço anterior automaticamente. Sem impacto operacional na Gestão Web, banco ou estoque; não publicado.

> Revisão local 3.2.0.17: no PWA AvantaPreços, Criar post fica ao lado de Atualizar preço. Foto/produto já selecionados; revisar descrição, voltagem, condição (Novo/Usado/Com avaria), avaria obrigatória se aplicável e preço sugerido ou manual. Gerar post abre prévia; Editar post/Baixar imagem e Compartilhar post ficam abaixo. Usa menu nativo com arquivo pronto; sem suporte, baixa PNG. Cancelar compartilhamento não declara sucesso. Não altera cadastro/saldo/vendas nem publica anúncio; sem impacto operacional na Gestão Web. Não publicado.

> Revisão local 3.2.0.16: formulário de venda/saída reorganizado. O seletor mostra somente o nome do estoque; Saldo disponível aparece separado e muda conforme a seleção, sem converter desconhecido em zero. Quantidade/valor e sugestões agrupados; confirmação/baixa/permissões preservadas. Não publicado.

> Revisão local 3.2.0.15: Vendas inicia em Online (pedidos importados dos marketplaces); Saldão alterna para vendas registradas manualmente, com origem no estoque escolhido. Filtro de estoque, período, contagem e total confirmado são próprios da origem; trocar origem limpa conta/canal/situação. Venda manual no estoque Online continua manual. No PWA, Venda é o terceiro botão do saldo e abre produto já escolhido, estoque, quantidade, valor/data e confirmação. Reutiliza baixa e histórico existentes, sem nova migração/financeiro/publicação.

> Revisão local 3.2.0.14 — AvantaPreços: resultado mostra Saldo do produto e pílulas por estoque. Ajustar estoque define saldo final; Adicionar saldo soma uma entrada no estoque escolhido. Zero confirmado é Sem saldo, desconhecido continua A confirmar e total parcial indica unidades confirmadas. Voltar retorna ao início; Nova pesquisa abre o leitor EAN diretamente. Lotes ativos, permissões e histórico preservados. Sem impacto operacional na Gestão Web; não publicado.

> Revisão 3.2.0.13: inclusão/exclusão em segundo plano na Gestão Mobile, incluída na publicação .19 com migração aplicada. Sem impacto operacional na Gestão Web; fluxos, permissões e dados existentes preservados.

> Publicação 3.2.0.12 confirmada em 20/10/2026: ajustes exclusivos da Gestão Mobile e migração aditiva instalada sem alterar registros. Gestão Web e demais módulos preservados; sem impacto operacional nesta interface.

> Revisão 3.2.0.12: período inicial do novo lançamento na Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 3.2.0.11 (incluída na 3.2.0.12): fila de edições exclusiva da Gestão Mobile. Sem impacto operacional na Gestão Web; migração aditiva aplicada sem alterar os registros.

> Publicação 3.2.0.10 confirmada em 20/10/2026 nos domínios oficiais: correções da Gestão Mobile no ar e migração numérica aplicada sem alterar registros (2.610 lançamentos, 163 parcelas). Indicador de contas .09 e AvantaVendas av189 preservados. Fechar/reabrir o aplicativo para obter os recursos, sem reinstalar ou apagar dados; teste em aparelho físico com o responsável.

> Revisão 3.2.0.10: integra as correções da Gestão Mobile descritas em 3.2.0.08, preservando o indicador de contas da produção 3.2.0.09. Sem outra mudança operacional na interface Web.

> Revisão 3.2.0.09: Contas conectadas mostra o círculo padrão no centro do cabeçalho durante leitura inicial/atualização, mesmo recolhido. Ao terminar ou falhar, o círculo desaparece; não significa nova autorização ou conexão OAuth.

> Revisão 3.2.0.08: sem mudança da interface Web. A função compartilhada de reorganizar parcelas agora aceita o ID numérico real dos lançamentos; migração `20261020160000_reorganizar_parcelamento_id_numerico.sql` aplicada, preservando registros existentes, histórico anterior, confirmação, empresa e centro. Exige acesso financeiro autenticado; acesso anônimo negado.

> Revisão 3.2.0.07: acesso e retomada cautelosa exclusivos do AvantaVendas; sem impacto operacional na Gestão Web. Não publicado, sem alteração de banco/permissões/financeiro.

> Revisão 3.2.0.06: produto expandido organizado em Cadastro do produto, Estoques e movimentações, Publicação e Históricos. Editar cadastro/Consultar ficha ficam juntos; Editar/Atualizar estoques também; Vendas e saídas agrupa Registrar venda, Outras saídas e Vendas diretas. Descrição/fotos, dados complementares e históricos abrem sob demanda. Não muda permissões nem confirmações. Inclui contadores .05 e vendas diretas .04; financeiro permanece adiado.

> Revisão 3.2.0.05: Anunciados mostra o total da seleção de contas e filtros, sem limitar à página atual. Estoques mostra produtos com saldo no estoque selecionado e acompanha a busca, não a soma de unidades ou quantidade de depósitos. Carregando indica “…”; falha ou catálogo não integrado indica “—”, nunca zero inventado. Inclui vendas diretas/saídas 3.2.0.04; financeiro continua adiado.

> Revisão 3.2.0.04: no produto Web/AvantaPreços, Registrar venda seleciona estoque, quantidade, valor unitário efetivo, data e observação. Mínimo/médio/ideal só preenchem sugestões; valor final é o vendido. Venda e saída são atômicas. Vendas do mês une ML/Magalu e Saldão · Venda direta (nome do estoque), com filtro Canal de venda e total confirmado; canceladas não contam no total. Data da venda define o mês. Histórico Vendas diretas no produto permite cancelar e informar unidades que retornaram fisicamente/estoque de destino; zero cancela sem repor, retornos posteriores são explícitos e limitados ao vendido. Outras saídas (perda/avaria/uso interno), ajustes e transferências não geram venda. Registrar vendas é permissão individual nova, inicialmente desmarcada, separada de Editar estoque. Configurações > Usuários da consulta libera o acesso; não ampliar automaticamente. Tentativa incerta fica guardada por perfil/ator/produto ou venda neste navegador; repetir recupera o mesmo recibo, fechar não desfaz envio. Prévia /marketplaces/validacao-vendas-diretas disponível apenas localmente, com dados fictícios. Nenhuma receita/lançamento financeiro, NF ou alteração de critérios de baixa/cancelamento online nesta etapa; integração com dashboard financeiro fica para trabalho posterior.

> Revisão 3.2.0.03: Produtos cadastrados é a base única. Estoques usa a mesma lista detalhada, com busca por descrição/EAN e leitor, filtrada pelo estoque/saldo positivo. Pílula única já vem selecionada; mais estoques ficam em pílulas lado a lado com cores estáveis. Criar estoque à esquerda de Atualizar abre nome e confirmação; Renomear/Usar online/Arquivar preservados. Recolher o produto antes de trocar estoque evita perder edição. Sem saldo aparece vazio só neste estoque, não significa produto excluído. Quantidade e edição correspondem ao selecionado.

> Revisão local 3.2.0.02: ordem padrão Vendas → Anunciados → Estoques → Produtos. Os seis pontos de Estoques permitem arrastar como os demais; teclado por setas/Início/Fim, Escape cancela. Preferência por usuário/empresa/navegador preserva ordens personalizadas antigas e insere Estoques antes de Produtos. Ainda não publicado.

> Revisão local 3.2.0.01: cabeçalhos de Estoques/Vendas/Anunciados/Produtos com ações de 32 px; expandir/recolher somente setas, também no rodapé, com tooltip e nome acessível. Funcionalidade, filtros e permissões preservados. Ainda não publicado.

> Produção 3.2.0 confirmada nos dois domínios, migração aplicada em 19/10/2026; notas locais 71/3.2.0 abaixo são históricas: Produtos mantém cadastro único com total/distribuição; Estoques cria/renomeia/consulta/arquiva offline vazio e define um Online por perfil. No produto/AvantaPreços escolher estoque e Dar entrada (soma), Ajustar saldo final (substitui), Transferir (retira/adiciona juntos). Não confundir ajuste com venda/baixa manual: essa etapa será definida depois. Só Online alimenta anúncios; legado vai para Online sem duplicar. Troca exige saldo anterior confirmado/zerado e pendências resolvidas. Gestores administram estoques; caixa Editar estoque permite movimentar, não administrar estoques. Falha não significa zero. Consulta não altera saldo. Publicação Web/PWA confirmada; saldos anteriores preservados.

> Revisão local 3.1.0.71: entrada/edição de estoque no AvantaPreços usa menos, quantidade centralizada, mais, Cancelar e Concluir na mesma linha. Botões alteram somente o rascunho; Concluir confirma saldo final, não soma ao saldo. Mesmas permissões e proteção de revisão/repetição. Campo compacto preserva limite existente e saldos maiores. Ainda não publicado.

> Revisão local 3.1.0.70: alerta do cabeçalho com mesma altura visual do seletor de mês; área de clique preservada. Sem impacto operacional. Ainda não publicado.

> Revisão local 3.1.0.69: título Período das vendas alinhado ao seletor de mês, não ao alerta à esquerda. Sem impacto operacional nos filtros ou avisos. Ainda não publicado.

> Revisão local 3.1.0.68: Vendas e Anunciados mostram círculo central durante carregamento real ao expandir. Anunciados sinaliza também atualização explícita e consulta Magalu em andamento. Aguarde a resposta; erro e vazio são informados separadamente. Cards permanecem inicialmente recolhidos; atualização passiva não bloqueia os demais. Ainda não publicado.

> Revisão local 3.1.0.67: Pendências fica no SVG de alerta à esquerda do mês, com contador somente para avisos existentes. Clique abre painel compacto igual aos avisos AvantaLab, preservando detalhes e Atualizar avisos. X/Escape/clique externo fecham, sem alterar estoque ou reconhecer pendências. Falha não vira ausência de avisos. Ainda não publicado.

> Revisão local 3.1.0.66: placeholder Senha dos usuários AvantaPreços é somente ****. Não é valor salvo; na edição, campo vazio continua mantendo a senha atual. Validação preservada. Ainda não publicado.

> Revisão local 3.1.0.65: ao salvar usuário da consulta, botão mostra Salvando… e sucesso termina silenciosamente, sem fechar editor ou recarregar a lista. Setas de troca liberadas após salvar; rascunho alterado precisa ser salvo ou cancelado. Erros continuam informados, sem descartar os campos. Permissão individual preservada. Ainda não publicado.

> Entrega publicada 3.1.0.64: nome do perfil em maiúsculas no topo do AvantaPreços; sem impacto operacional neste ambiente. Publicado.

> Entrega publicada 3.1.0.63: AvantaPreços → Ver produtos e estoque lista o cadastro completo do mesmo perfil, por descrição/nome/EAN, mesmo sem preço ou consulta anterior. Páginas de 25, busca no servidor ao digitar; pesquisa na internet separada. Abrir permite consultar saldo e editar somente com a permissão individual. Últimas consultas mostra dez registros recentes. Sem impacto na Gestão nativa. Publicado.

> Entrega publicada 3.1.0.62: editor identifica nome/login e salva somente a permissão daquele acesso. Lista exibe Editar estoque: Permitido/Não permitido por usuário; após salvar conserva o valor confirmado. Cancelar retorna ao cadastro novo desmarcado. Publicado.

> Entrega publicada 3.1.0.61: Marketplaces abre com Contas conectadas, Vendas, Anunciados e Produtos e estoque recolhidos. Expansão manual e atalhos explícitos continuam disponíveis; atualização automática não abre os blocos. Publicado.

> Entrega publicada 3.1.0.60: Marketplaces → Configurações → Usuários da consulta oferece uma única caixa Editar estoque, ao criar ou editar. Desmarcada por padrão; marcar permite confirmar/editar quantidades no AvantaPreços da empresa, sem dar Gestão ou outros poderes. Salvar persiste; desmarcar retira a permissão nas próximas gravações. Perfis já existentes não são liberados automaticamente. Migração instalada e publicação confirmada, sem concessão ou movimentação real pelo agente.

> Entrega publicada 3.1.0.59: Pendências identifica produto/EAN, conta, anúncio/pedido e motivo. Atualizar avisos apenas consulta; não reenviar estoque nem repetir entrada. Retornos automáticos e confirmação física atualizam essa área. “Sincronização ativa” removido; falhas/ausência de atividade continuam visíveis. Saldo já confirmado não é descrito como ausente; venda antiga ainda pendente mostra conciliação. Evento identificado de outro produto não bloqueia reposição. Notificação ainda não identificada da conta relacionada mantém proteção até sua leitura. Erro não significa ausência de pendências. Publicado.

> Produção 3.1.0.58 confirmada nos dois domínios: EAN abaixo dos itens do pedido e ações compactas no topo de Marketplaces. Notas locais 57–58 abaixo são históricas. Recarregar a página; sem mudança de saldo, pedido ou permissões no deploy.

> Revisão local 3.1.0.58: barra superior de Marketplaces com Criar Lote, Editar Lotes, Configurações e Copiar link na escala compacta oficial. Mesmas ações e permissões; sem impacto operacional. Ainda não publicado.

> Revisão local 3.1.0.57: detalhe do pedido mostra EAN em linha abaixo da descrição de cada item, conforme dado validado do item/anúncio da mesma empresa/conta/variação. Sem dado, Não informado; falha complementar, Indisponível no momento. Não inferir por SKU/nome. Sem mudança de estoque, preço, etiqueta ou pedido; ainda não publicado.

> Produção 3.1.0.56 confirmada nos dois domínios: foto/EAN dos Anunciados, contraste de confirmação e exclusão de acesso preservando a base. Notas locais 54–56 abaixo são históricas. Nenhuma exclusão/bloqueio de usuário real ou movimentação de saldo no deploy. Revisão 57 segue local.

> Revisão local 3.1.0.56: excluir acesso dedicado do AvantaPreços retira somente o acesso, bloqueia autenticação e libera o login. Produtos, quantidades, fotos, consultas, lotes e histórico permanecem no perfil/empresa em que foram criados, com autoria preservada. Criar o mesmo login em outra empresa não transfere a base. Confirmação em dois cliques; falha parcial informa que o acesso está bloqueado e pede repetir a exclusão para finalizar. Não se aplica a contas comuns/compartilhadas. Sem publicação ou exclusão produtiva de teste.

> Revisão local 3.1.0.55: Confirmar no modal de estoque físico recupera o texto visível com contraste explícito, protegido da cor herdada dos anúncios. Sem impacto operacional na confirmação, quantidade ou permissões. Não publicado.

> Produção 3.1.0.53 confirmada: Configurações Web compactas, setores e ações menores, topo na cor do perfil e X centralizado. Notas locais 52/53 abaixo são históricas; foto/EAN da revisão 54 ainda não publicado. Recarregar sem apagar dados; sem mudança de permissões ou migração.

> Revisão 3.1.0.54 local: em Anunciados, miniatura igual à de Produtos e estoque, com conta/código do anúncio e EAN em linha própria abaixo. SKU não é apresentado como EAN; ausente mostra Não informado. Sem foto disponível, exibe Sem foto. Sem alteração de cadastro ou sincronização; não publicado.

> Revisão 3.1.0.53 local: Configurações Web usa faixa superior na cor do perfil, contraste automático do texto e X geométrico centrado. Ações compartilham BotaoAcaoCompacto do PADRÃO AVANTA 1.20.0: face 32px, alvo 44px, variantes semânticas. Mesmas funções/permissões da revisão 52; não orientar procurar um novo comando. Sem publicação ou mudança em dados.

> Revisão 3.1.0.52 local, não publicada: modal Configurações do AvantaPreços Web compacto, apenas Configurações no título. Preços de venda e Aparência separados lado a lado; Usuários abaixo. Nome/login/senha/Salvar na mesma linha; na edição, Cancelar precede Salvar. Navegação de usuários mostra um por página com contagem, preservando todos os cadastros; não orientar rolar para procurar os demais. Explicação dos percentuais removida da tela; continuam percentuais da referência, não margem. Sem alteração de permissões, banco ou logins reais. Fechar/X/Escape e segurança de viewport preservados.

> Revisão 3.1.0.51 local, não publicada, prevalece sobre os rótulos históricos abaixo: consultar produto novo ou abrir antigo mantém o cadastro automático sem presumir saldo. Sem quantidade: Produto fora de estoque / Estoque a ser inserido / Adicionar. Adicionar → quantidade → Concluir confirma o saldo no mesmo produto; cancelar mantém o cadastro pendente. Saldo positivo: Já em estoque, unidades e Editar (saldo final, não soma). Ao zerar: Produto fora de estoque, 0 unidades e Adicionar; reposição exige valor positivo. Bipe não duplica nem soma estoque. Migrações 49/50 pendentes; sem alteração de produção ou lotes salvos.

> Revisão 3.1.0.50 local: EAN de produto existente abre o cadastro canônico, mostra referência e saldo atuais e não pesquisa o mercado nem soma unidades. Leitor Web do lote usa a referência cadastrada; Atualizar preço é ação explícita, altera o mesmo produto sem mexer em estoque/lotes salvos. Referência manual no PWA também atualiza esse cadastro. Já em estoque mostra saldo e Editar permite saldo final maior/menor/zero. Referência cadastrada não é nova pesquisa; sem duplicar produtos. Migrações 49/50 preparadas, não instaladas; não publicado.

> Revisão 3.1.0.49 local, não publicada: consultar e identificar no AvantaPreços cria/reutiliza o cadastro em Produtos e estoque, sem confirmar unidades. Histórico/manual e leitor Web de lotes compartilham esse cadastro. Entrar estoque → quantidade → Concluir confirma o saldo físico; depois Já em estoque mostra quantidade e Editar define o novo saldo final (não uma soma), permitindo aumentar, diminuir ou zerar. Histórico antigo pode ser aberto para entrar estoque. Consultar/bipar/reabrir não soma unidades nem publica anúncio. Fotos/referências preenchidas preservadas; ausência de ofertas não impede cadastrar o produto identificado. EAN duplicado ambíguo exige unificação, nunca criar outro por suposição. Só gestor master, administrador e operador completo alteram saldo; acesso de consulta apenas visualiza. Esperar gravação; falha/resposta incerta pede atualizar e conferir antes de outra alteração. Migração preparada/testada, ainda não instalada em produção. Lotes salvos preservam snapshots.

> Revisão 3.1.0.48 em validação: Produtos e estoque tem Recuperar fotos, que preenche somente cadastros vazios a partir dos anúncios vinculados. Não substitui fotos manuais nem altera preços/estoque. A importação também passa a incluir fotos válidas e informa pendências. Na pílula Referência, a seta circular pesquisa ofertas atuais do produto exato e atualiza a média de referência; mínimo/médio/ideal recalculam pelos percentuais da empresa. Não atualiza preço dos anúncios. Recolher os detalhes antes de pesquisar, para preservar edição aberta. Sem ofertas/falha mantém o valor; conflito não sobrescreve edição concorrente. Espera bloqueia duplicação; se a resposta não chegar, atualizar a lista antes de repetir. Pesquisa auditada por empresa, permissão de gestão, limite de cinco inícios/minuto e uma pendência por produto. Migração/publicação e recuperação produtiva ainda pendentes nesta etapa. Exclusivamente Web; lotes salvos/PWA preservados.

> Revisão 3.1.0.47, local e não publicada: todas as pílulas de marketplaces com publicação confirmada ficam visíveis no card de produto Web, quatro por linha; a quinta e seguintes seguem abaixo, sem “+N”. Nomes completos e ajuda de anúncios pausados preservados. Somente organização visual; não libera integrações nem muda anúncios, estoque ou referência. PWA inalterado.

> Revisão 3.1.0.46, local e não publicada: referência dentro de uma pílula no card de produto Web. Editar troca o conteúdo no mesmo espaço, sem abrir campos/botões grandes. ✓ ou Enter salva; × ou Esc cancela e retorna o foco para Editar. Reabrir usa o valor salvo, não o rascunho cancelado. Erro mantém a edição para correção; em espera, não afirmar que cancelar desfaz uma gravação enviada. Preços continuam calculados após salvar; permissões, anúncios e estoque preservados. Somente Web de computador; PWA e redirecionamento inalterados.

> Revisão 3.1.0.45, local e não publicada: card de Produtos e estoque compacto. Nome, SKU/EAN e pílulas de marketplace ficam à esquerda; estoque e referência juntos antes dos três preços. Percentuais junto aos títulos. Descrição e anúncios completos ficam em Expandir ou clique no nome. Pílulas usam o último estado dos anúncios vinculados, não uma consulta em tempo real; não repetem o marketplace e informam pausados do ML na ajuda. Sem vínculo mostra Sem publicação; vínculos sem estado de publicação reconhecido mostram Publicação não confirmada, nunca publicação inventada. Editar referência mantém Salvar/Cancelar e permissões. Este módulo é somente Web de computador: no celular permanece o PWA próprio, que não possui esta área. Não orientar procurar este card no PWA. Não altera redirecionamento, anúncio, estoque, lote ou tema. Migração da revisão 44 permanece pendente em produção.

> Revisão 3.1.0.44, local e não publicada: em Produtos e estoque, referência tem Editar/Salvar/Cancelar e os preços mínimo/médio/ideal aparecem ao lado de Expandir. São percentuais da referência, não margem/lucro. Engrenagem Configurações do AvantaPreços inclui percentuais e aparência antes dos usuários. Padrões 50/70/90; gestor/administrador altera por empresa. Novos cálculos no Web/PWA usam os percentuais salvos; lotes existentes não mudam. Automático acompanha o tema do aparelho, sem regra às 18h; padrão do perfil preserva o shell. Migração de configurações preparada, ainda não instalada em produção: aviso e bloqueio de Salvar configurações enquanto pendente. Prévia local fictícia validacao-produtos permite ensaiar em memória. Não confundir isso com gravação real nem publicação de anúncio.

> Publicação Web 3.1.0.43-av188 confirmada: ajustes do menu do AvantaVendas, sem mudança operacional na Gestão Web. Notas locais da revisão 43 abaixo são históricas.

> Revisão 3.1.0.43: linha deslizante adicionada ao menu inferior do AvantaVendas; sem impacto operacional na Gestão Web. Não publicado.

> Revisão 3.1.0.42: círculo do menu substituído por resposta tátil opcional exclusivamente no AvantaVendas; sem impacto operacional na Gestão Web. Não publicado.

> Revisão 3.1.0.41, local, não publicada: Contas conectadas inicia recolhido a cada abertura da página, mesmo se foi expandido antes. Use a seta para baixo para abrir. Conectar/Atualizar e contagem permanecem visíveis; nova conexão ainda abre a identificação da conta durante a ação.

> Revisão 3.1.0.40, local, não publicada: Contas conectadas recolhe/expande pela seta no cabeçalho, sem texto no controle. Seta para cima recolhe, para baixo expande; Conectar/Atualizar continuam disponíveis. Sem mudança nas contas ou permissões.

> Revisão 3.1.0.39, local, não publicada: seletor de marketplaces com botões 30% mais baixos no Web e seis colunas iguais; mobile preserva alvo de 48 px em três colunas. Sem impacto operacional na seleção, disponibilidade das integrações ou permissões.

> Revisão 3.1.0.38, local, não publicada: atalho flutuante Pesquisar produtos tem 20% de opacidade em repouso e 100% no mouse, foco do teclado ou toque/pressão. Sem impacto operacional na pesquisa, rolagem ou permissões.

> Revisão 3.1.0.37, local, não publicada: em Marketplaces Web, Produtos e estoque tem busca sempre visível por nome, descrição, SKU ou EAN; atualiza automaticamente sem Enter. Ler EAN verde foca/seleciona o campo; leitor USB/Bluetooth em modo teclado não precisa enviar Enter e não captura outros campos. Atalho flutuante Pesquisar produtos no canto inferior direito abre a área e rola abaixo do cabeçalho, com foco na pesquisa. Resultados são os cadastros de toda a empresa, independentemente do marketplace; mostram foto, descrição resumida, EAN, estoque e preço cadastrado. Nome/Expandir abre os detalhes. × limpa e restaura a lista. Falha não significa nenhum produto. Consultar não pesquisa preços na internet, altera estoque, inclui no lote ou publica anúncio. Prévia validacao-produtos é fictícia, somente desenvolvimento; teste autenticado local usa os dados reais da empresa.

> Revisão 3.1.0.36: o perfil atual na troca tem selo Em uso branco, azul-marinho e ✓, independente da cor do perfil. O selo não é um botão; o perfil atual continua desativado. Sem impacto operacional na troca, login ou permissões.

> Publicação 3.1.0.35 confirmada em 17/10/2026: inclui refinamentos 30–35 de botões, fechamento do painel e datas dos lotes/Marketplaces. Notas locais seguintes são históricas. Web/PWA, versão/cache e API protegida conferidos no domínio oficial; sem nova migração. Recarregar a página ou fechar/reabrir o PWA, sem reinstalar/apagar dados. Se fechou durante uma gravação, reabrir e atualizar para conferir antes de repetir. Teste autenticado no iPhone e entre aparelhos permanece com o responsável.

> Revisão 3.1.0.35, local, não publicada: no card de cada lote salvo, Editar lote e Continuar leituras ficam iguais na mesma linha e ocupam a largura útil, com texto centralizado. Continuar/Reabrir e continuar usa o verde do Ler EAN. Sem mudança operacional: edição/retomada, reabertura explícita e permissões preservadas.

> Revisão 3.1.0.34, local, não publicada: no Marketplaces/AvantaPreços, datas aparecem como dd/mm/aa (17/10/26), inclusive campos de lote/período, histórico, sincronizações e PDF. O calendário nativo continua disponível; salva ISO com ano completo, sem abreviar o banco. Apresentação compacta separada do seletor impede o formato por extenso do iPhone de invadir o custo; data central e valor à direita, com 16 px de intervalo. O padrão de datas dos outros módulos não muda. Ainda requer validação do responsável no iPhone após publicação.

> Revisão 3.1.0.33, local, não publicada: painel de lotes pode fechar pelo X, fundo ou Escape mesmo aguardando rede/PDF. Cancelar na escolha de PDF apenas volta à conferência; X/fundo/Escape saem do painel inteiro. Resposta tardia não reativa lote nem abre arquivo depois de sair. Rede tem limite de 20 s, PDF de 120 s; erro permite nova ação explícita, sem repetir gravação automaticamente. Na confirmação de remoção pendente, Fechar painel permite sair. Isso não desfaz alterações já enviadas ao servidor: reabrir e atualizar o lote para conferir antes de repetir; não afirmar cancelamento/estorno da gravação. Lotes salvos são preservados; rascunho não salvo não é gravação. Para destravar a versão antiga ainda no ar, recarregar a página ou fechar/reabrir o PWA, sem apagar dados ou reinstalar. O ajuste não comprova a causa exata da sessão iOS da captura.

> Revisão 3.1.0.32, local, não publicada: abaixo dos produtos do lote, Concluir conferência e Continuar leituras neste lote ficam lado a lado, iguais e ocupando a linha. Continuar/reabrir leituras usa o verde do Ler EAN. Sem mudança operacional; concluídos continuam mostrando Reabrir conferência e Reabrir e continuar leituras, sem reabertura implícita. Ações continuam restritas às permissões existentes.

> Revisão 3.1.0.31, local, não publicada: no detalhe do lote, Todos os lotes, Editar lote e Atualizar têm larguras iguais na mesma linha, preenchendo a largura útil. Acesso somente leitura continua sem Editar lote e distribui os dois restantes igualmente. Sem mudança operacional; os destinos e permissões são os mesmos.

> Revisão 3.1.0.30, local, não publicada: card de lote ativo no AvantaPreços mantém nome acima e dois botões iguais na mesma linha, ocupando toda a largura útil. Quantidade/Ver lote e totais à esquerda; Voltar ao modo comum à direita. Sem mudança operacional: abrir totais não encerra o lote; voltar pausa sem excluir os registros.

> Publicação 3.1.0.29 confirmada em 17/10/2026: inclui os refinamentos 27–29 de campos e botões dos lotes web/PWA. Data centralizada, moeda à direita sem legenda Opcional; custo não obrigatório. Pares de botões iguais em linha completa, ações de leitura verdes; lista com Atualizar à esquerda e Criar novo lote à direita. Recarregar web ou fechar/reabrir o PWA para obter os recursos atualizados, sem reinstalar ou apagar dados. Notas locais seguintes são históricas; sem nova migração ou mudança operacional.

> Revisão 3.1.0.29, local, não publicada: lista Lotes recebidos mostra Atualizar à esquerda e Criar novo lote à direita, com larguras iguais ocupando toda a linha. Sem mudança operacional; acesso de consulta continua sem criação e mostra Atualizar em largura total.

> Revisão 3.1.0.28, local, não publicada: no formulário de lote, Novo lote/Continuar lote existente e Cancelar/Criar e iniciar leituras ocupam linhas completas, cada par com larguras iguais. Ações de iniciar/retomar leituras usam o verde do Ler EAN. Edição preserva Cancelar, Salvar e Salvar e continuar na mesma linha. Sem mudança de operação.

> Revisão 3.1.0.27, local, não publicada: criação/edição de lote no web/PWA mantém data e valor na mesma linha, separados, com data centralizada e moeda à direita. A legenda Opcional foi retirada; deixar o valor vazio continua permitido e não equivale a zero. Máscara e cursor à direita preservados.

> Publicação 3.1.0.26 confirmada em 17/10/2026: lotes web/PWA e migração instalada em produção. Esta situação substitui as notas locais históricas abaixo. Entrar na mesma empresa e retomar o mesmo lote em Editar Lotes permite continuar em outro aparelho; Atualizar lote relê o salvo. Fechar/reabrir o PWA ou recarregar a página traz a versão atual, sem reinstalar nem apagar dados. Foram conferidos versão/bundles/cache/API protegida; o teste autenticado entre aparelhos será feito pelo responsável, sem lote fictício criado pelo deploy.

> Revisão 3.1.0.26, local: removido o texto Leitor ativo / Bipe o código do lote web. Ativação continua indicada no botão Ler EAN por aparelho; leitura por Enter e inclusão preservadas. Sem mudança operacional adicional nem publicação.

> Revisão 3.1.0.25, local: Marketplaces Web tem **Criar Lote** e **Editar Lotes** à esquerda das configurações. Criar ou **Salvar e continuar** abre inclusão no mesmo lote. **Ler EAN por aparelho** foca o campo; leitor USB/Bluetooth em modo teclado envia o EAN e Enter. Também permite digitar e **Consultar e incluir**. Contador abre conferência/totais/PDF; **Pausar lote** não apaga. **Atualizar lote** relê o salvo, inclusive alterações de outro aparelho. Para alternar web/PWA, entrar na mesma empresa e retomar o mesmo lote em Editar Lotes: ambos usam a mesma API e registros, sem importação. Consulta de pendente, candidato e continuação não duplicam leitura; novo bipe após sucesso conta unidade. Nada é anunciado por bipar. A prévia é fictícia em memória; migração e publicação produtivas pendentes.

> Revisão 3.1.0.24, local: data e custo do lote ficam lado a lado. O custo opcional usa máscara monetária Avanta, por exemplo 1.234,56; digite somente os algarismos (123456). Foco/clique posiciona o cursor à direita, conforme retificação do usuário; após digitar, o cursor segue no fim. Backspace apaga progressivamente até vazio, sem travar em 0,00. Apagar tudo mantém custo não informado, diferente de zero digitado. Ainda não publicado.

> Revisão 3.1.0.23, local: formulário de lote mais compacto. Na edição, **Cancelar**, **Salvar** e **Salvar e continuar** ficam na mesma linha. Salvar grava sem iniciar leituras; Salvar e continuar grava e retoma o mesmo lote. Lote concluído mostra aviso de que essa ação reabre a conferência. Criação e demais operações preservadas; não publicado.

> Revisão 3.1.0.22, local: AvantaPreços apresenta **Criar Lote** e **Editar Lotes** no topo, lado a lado e com larguras iguais. Editar Lotes abre a lista dos lotes salvos para edição/retomada. Sem destaque Consulta rápida / Qual é o preço? nem legenda de modo comum; a consulta comum continua sendo o padrão inicial. Com lote ativo, contador/totais e pausa aparecem em área separada abaixo dos dois botões. Ainda não publicado.

> Revisão 3.1.0.21, local: **Criar lote** abre **Data do lote** e **Valor de custo do lote (R$) — opcional**, seguidos de nome/origem/observações. **Continuar lote existente** no mesmo painel mostra os lotes salvos com data e custo. Cada linha oferece **Editar lote** e, no AvantaPreços, **Continuar leituras**. A edição mantém ID/produtos e permite **Salvar e continuar leituras**; concluídos usam **Reabrir e continuar**, explicitamente. A retomada relê o salvo antes de ativar e acrescenta produtos ao mesmo lote. Data do lote é escolhida pelo usuário; não confundir com data/hora de geração do PDF. Abertura comum preservada. Ainda não publicado nem migrado em produção.

> Revisão 3.1.0.20, local: Gerar PDF dos lotes abre a escolha **Detalhado — todos os produtos** ou **Resumido — somente totais**, seguida de **Gerar arquivo**. Cabeçalho azul institucional em duas linhas: empresa; geração, unidades e valor pago se informado. PDF A4 paisagem com margens de 5 mm e linhas compactas. **Lucro bruto** é o total projetado de cada cenário menos o valor pago, podendo ser negativo; sem custo fica sem valor e com pendências não é calculado. O custo é opcional em Criar lote/Editar informações. O parágrafo explicativo de estimativa foi removido da tela/PDF; não reintroduzi-lo por iniciativa própria. Informações adicionais do lote continuam editáveis, mas não entram no cabeçalho exportado. Ainda não publicado.

> Revisão 3.1.0.19 — implementação local, ainda não publicada: AvantaPreços abre no **Modo comum**. **Criar lote** pede nome, fornecedor/origem, recebimento, observações e valor pago opcional; após salvar, cada leitura continua no fluxo normal e também entra no lote. O contador abre produtos, totais e PDF. Bipes repetidos contam unidades; atualizar pesquisa ou abrir histórico não conta outro produto. Falha na pesquisa mantém a leitura pendente; usar **Consultar** no item pendente para completá-lo sem duplicar. Quantidade pode ser corrigida; Remover exige confirmação e afeta só o lote. **Voltar ao modo comum** pausa a coleta sem apagar dados; ao reabrir o aplicativo, o modo comum continua sendo o padrão. **Lotes recebidos** permite abrir e retomar um lote em conferência; concluídos precisam ser reabertos para alterar produtos. O mesmo acesso existe no módulo **Anúncios em marketplaces**, por empresa.

> O relatório usa os preços salvos na leitura e respeita quantidades: referência da pesquisa (ou manual, identificada) e venda mínimo/vermelho, médio/azul e ideal/verde. Os três totais e a diferença bruta em relação ao custo aparecem na tela e no PDF. Não chamar de lucro líquido: taxas, impostos, frete, despesas e devoluções não foram deduzidos. Sem custo, não há comparação; sem preços completos, há apenas subtotais parciais e aviso de pendência. Gerar PDF não publica anúncios nem movimenta estoque/financeiro. Fotos indisponíveis são informadas. A migração dos lotes precisa ser instalada antes do uso real; não afirmar persistência produtiva validada sem implantação.

> Revisão 3.1.0.18: marca e comprovantes de consignado ajustados somente no AvantaVendas independente; sem impacto operacional na Gestão Web.

> Revisão 3.1.0.17: correção do retorno Google/Apple exclusiva da Gestão Capacitor; sem impacto operacional na Gestão Web/PWA.

> Revisão 3.1.0.16: barra de preparação da Gestão nativa acompanha tarefas e desenha 100% antes da dashboard; sem impacto operacional na Gestão Web.

> Complemento 3.1.0.15 — Magalu: catálogo habilitado no aplicativo AvantaLab. Cada vendedor concede acesso à própria loja; a conta proprietária do aplicativo não limita quem pode conectar. Lojas existentes usam Conectar outra conta e escolhem a mesma organização para renovar as permissões, preservando conexão e identificação. Na Rarus/JEFF, consentimento concluído e formulário liberado. O perfil ainda não tem produtos locais: cadastrar/revisar o produto em Produtos e estoque antes do primeiro envio. Autorização de catálogo não é anúncio publicado; cada envio exige revisão e confirmação.

> Revisão 3.1.0.15: dashboard nativa abre com mês principal pronto e complementos automáticos nos cards; sem impacto operacional na Gestão Web.

> Revisão 3.1.0.14: removida a segunda preparação exclusiva da Gestão nativa; sem impacto operacional na Gestão Web.

> Revisão 3.1.0.13 Marketplaces Web, publicada: os retornos de catálogo seguem seis estados comuns a todos os provedores: consultando, vazio confirmado, itens encontrados, acesso negado, falha e ainda não verificado. Uma lista vazia de SKUs da Magalu pode vir sem metadados completos; não exigir o parser de pedidos para confirmar o array vazio. `results: null` só confirma vazio com contagem zero e início da lista; resposta ausente ou contraditória continua sendo falha. No Mercado Livre, lista vazia só confirma conta sem anúncios depois de sincronização concluída e sem filtros. Filtro sem linhas não é conta vazia. “Atualizar contas” repete a consulta, sem publicar produtos.

> Revisão 3.1.0.12: abertura progressiva exclusiva da Gestão nativa, helper de manutenção reutilizado com cliente autenticado no servidor; sem impacto operacional na Gestão Web.

> Revisão 3.1.0.11: localização nativa do Gestão iOS compilada, com IPA assinado e seletores conferidos no simulador; sem impacto operacional na Gestão Web. Upload e submissão 1.0.2 (7) concluídos em 16/10/2026; Waiting for Review, liberação automática após aprovação.

> Revisão 3.1.0.10: consulta de SKUs Magalu restaurada. “Sem anúncios para exibir” exige resposta válida com contagem zero, deslocamento inicial e sem próxima página; `results: null` só é vazio nessas condições. Falha da API não significa loja vazia. “Atualizar contas” repete a leitura, sem publicar anúncios.

> Revisão 3.1.0.09: API compartilhada preserva nome pessoal quando omitido na edição do acesso mobile; nome pessoal enviado continua exigindo nome e sobrenome. Sem impacto operacional nos formulários Web.

> Revisão 3.1.0.08: ao selecionar Magalu, o módulo consulta a primeira página de SKUs da loja. Só mostra “Sem anúncios para exibir” quando a resposta da Magalu confirma página vazia e completa. Se houver SKU, informa que existem produtos, mas ainda não importa a listagem. Acesso negado, falha, resposta incompleta ou conta a reautorizar aparecem separadamente; “Atualizar contas” repete a consulta. Isso não libera a publicação nem altera anúncios/estoque.

> Revisão 3.1.0.07: a linha da loja Magalu distingue acesso autorizado para vendas da liberação de publicação. “Publicação não liberada” informa ausência de permissões de catálogo, não significa anúncios pendentes nem ausência de anúncios. “Anúncios da loja: não consultados pelo AvantaLab” informa que anúncios antigos não foram importados nem contados; não afirmar “sem anúncios para exibir” sem consulta que confirme catálogo vazio.

> Revisão 3.1.0.06 (local): a conexão Magalu solicita inicialmente as consultas e a escrita de etiquetas já documentadas. Catálogo, preço e estoque só entram no consentimento após liberação dos acessos no aplicativo Magalu e habilitação no servidor. Conta conectada sem catálogo pode consultar vendas/pós-venda, mas não publicar. Se o login parar, use Cancelar conexão ou aguarde o aviso após dez minutos; não repetir SMS indefinidamente. Erros 401/400 observados ainda não têm causa confirmada, e a correção precisa de teste real antes de afirmar sucesso.

> Revisão 3.1.0.05: títulos dos cards reduzidos permanecem completos, com quebra de linha; filtros e ações se reorganizam conforme o espaço do card. Funcionamento e preferências preservados.

> Revisão 3.1.0.04: seletor de permissões compartilhado com Usuários mobile; sem impacto operacional na Gestão Web.

> Revisão 3.1.0.03: em Usuários e na seleção de áreas, a concessão antes chamada Dashboard da Gestão se chama Financeiro. Controla os dados e operações financeiras do perfil. Somente o rótulo muda; permissões gravadas e papéis preservados.

> Revisão 3.1.0.02: numeração volta à série 3, preservando todas as funcionalidades. Usuários exibe as liberações persistidas no servidor; erro de leitura não significa acesso ativado. Após Salvar alterações, Dashboard e módulos são conferidos no banco antes do sucesso; ao reabrir, permanecem conforme gravados. Em falha de consulta, atualizar a lista e tentar novamente.

> Revisão 4.0.0.30: restrição financeira por perfil no app nativo; sem impacto operacional na Gestão Web.

> Revisão 4.0.0.29: seletor restrito do app nativo; sem impacto operacional na Gestão Web e suas permissões.

> Revisão 4.0.0.28: entrada Web usa um card estável Preparando acesso, sem alternar títulos/mensagens entre provedor, sessão e empresa. Cancelamento social preservado; spinner sem percentual artificial.

> Revisão 4.0.0.27: seletor fixo no AvantaVendas. Sem impacto operacional na Gestão Web.

> Revisão 4.0.0.26: painel /admin usa senha administrativa própria, sem exigir sessão de perfil financeiro. APIs continuam autenticadas; sem alteração operacional da Gestão.

> Revisão 4.0.0.25: seletor de perfil fixo em todas as telas do AvantaVendas
> independente. Sem impacto operacional na Gestão Web.

> Falha de comunicação ao validar acessos não significa sessão expirada: tentar novamente após restabelecer o serviço, sem dispensar autenticação.

> Revisão 4.0.0.24: seletor de centros mais largo, nomes em até duas linhas; cadastro mantém até 80 caracteres, sem alterar nomes existentes.

> Revisão 4.0.0.23: corrigida a ativação de centros de custo em Configurações para Gestor Master/Administrador com Dashboard e plano elegível. Reutiliza o Principal e preserva os dados; sem mudança nos passos operacionais.

> Revisão 4.0.0.22: tela restrita a módulos exclusiva do app nativo AvantaLab; sem impacto operacional na Gestão Web/PWA.

> Revisão 4.0.0.21: Ponto e Conteúdo abrem pelo perfil selecionado sem reiniciar login. Dados secundários não exigem nova entrada. Falha de carga volta à seleção para tentar novamente, sem encerrar a sessão. Vendas não exige Dashboard quando seu módulo está liberado.

> Revisão 4.0.0.20: durante atualização financeira, as abas continuam disponíveis. A área de dados fica temporariamente não interativa, sem modal de carregamento; resumos secundários chegam em segundo plano. Em erro, usar Tentar novamente. Mudanças de perfil, ano ou centro não reutilizam dados do contexto anterior. Autenticação, plano e cadastro obrigatório ainda são necessários.

> Revisão 4.0.0.19: marca oficial AvantaLab no canto superior esquerdo de Meus módulos; sem impacto operacional.

> Revisão 4.0.0.18: em Meus módulos, clicar em qualquer parte do card abre o módulo. O botão Acessar continua disponível, assim como o acesso pelo teclado.

> Revisão 4.0.0.17: durante a preparação, a página do módulo fica visível ao fundo, sem interação até os dados estarem prontos; sem impacto nos comandos operacionais.

> Revisão 4.0.0.16: preparação dos módulos padronizada em um card compacto. Atualizações de acesso/tema não reiniciam a preparação de dados já exibidos; sem alteração nos comandos operacionais.

> Revisão 4.0.0.15: Trocar perfil em Meus módulos abre a tela padrão de seleção após login. Confirmar acesso segue as liberações do perfil escolhido.

> Revisão 4.0.0.14: Acessar usa o perfil e os módulos já carregados, sem espera por nova validação no clique. Dados e operações permanecem protegidos no servidor; revogação ou sessão inválida interrompem o acesso.

> Revisão 4.0.0.13: realce visual dos cards de módulos no hover e foco; sem impacto operacional.

> Revisão 4.0.0.12: para usuários sem Dashboard, Início retorna diretamente à seleção de módulos já carregada, sem preparar a Gestão. A lista é reconferida em segundo plano; abrir outro módulo continua exigindo acesso válido.

> Revisão 4.0.0.11: Meus módulos tem cabeçalho e conjunto integralmente compactados, sem mudança operacional.

> Revisão 4.0.0.10: Meus módulos exibe três cards por linha no desktop, sem mudança operacional.

> Revisão 4.0.0.09: cards de módulos mais largos e baixos; Acessar com fundo primário próximo ao rodapé. Sem alteração operacional.

> Revisão 4.0.0.08: Acessar fica no rodapé do módulo, com face menor e área de toque preservada. Sem mudança operacional.

> Revisão 4.0.0.07: Meus módulos não repete o nome quando há logo, usa cards mais largos e ação Acessar discreta; sem mudança operacional.

> Revisão 4.0.0.06: área Meus módulos mais compacta, sem alteração operacional de acesso, seleção ou retorno.

> Revisão 4.0.0.05: Salvar alterações fecha o card Editar usuário quando o servidor confirma o sucesso; a lista é atualizada. Em caso de erro, a edição permanece aberta para correção.

> Revisão 4.0.0.04: alterar somente Dashboard ou módulos habilita Salvar alterações. Master pode definir as liberações de Administradores e Operadores; o Administrador mantém poderes administrativos apenas nas áreas liberadas, sem alterar a própria concessão nem a de outros gestores.

> Revisão 4.0.0.03: modal Editar usuário mais largo no desktop, com campos de nova senha e confirmação lado a lado. Sem mudança operacional nas permissões ou no salvamento.

> Revisão 4.0.0.02: Editar usuário usa rolagem interna quando necessário, mantendo fechamento e ações disponíveis. E-mail, login e tipo ficam lado a lado no desktop e as liberações em duas colunas; no celular, uma coluna. As permissões não mudam.

> Revisão 4.0.0.01: Confirmar acesso mostra Carregando imediatamente e consulta apenas o perfil escolhido, sem recarregar os demais perfis. Se a validação falhar, a seleção mostra o erro e permite tentar novamente.

> Revisão 4.0.0: em Usuários, o gestor escolhe Dashboard da Gestão e os módulos liberados no cadastro, no vínculo de conta existente ou na edição. O papel define o nível de operação dentro da área. Gestor Master mantém a Gestão. Com Dashboard, a entrada abre a Gestão; sem ela, um módulo disponível abre direto e vários abrem Meus módulos. Início retorna à seleção para usuários restritos. Módulos também precisam estar instalados, ativos e compatíveis com o papel. Sem módulo disponível, orientar a procurar o gestor. Não orientar acesso por URL como forma de contornar liberações.

> Revisão 4.0.0 — Marketplaces: no card **Vendas**, após **Situação**, use
> **Marketplaces** para mostrar todas as plataformas ou selecionar uma ou mais.
> A escolha filtra os pedidos, as contas disponíveis e os contadores desse card;
> não altera os números globais do cabeçalho. Abrir vendas pelo aviso ou pelo
> cabeçalho limpa essa seleção para mostrar o pedido solicitado.

> Revisão 3.1.0.01: no Marketplaces Web, **Recolher** e **Expandir** ao lado
> de **Atualizar contas** ocultam ou mostram a lista de Contas conectadas.
> Conectar e atualizar continuam disponíveis com a lista recolhida; ao concluir
> uma nova conexão, a lista reabre para identificar a conta.

> Revisão 3.1.0: no Marketplaces Web, escolha Magalu, selecione uma loja com
> permissões de catálogo, prepare um produto do cadastro local em Produtos e
> estoque, busque a categoria final, complete os campos e confirme o envio.
> O AvantaLab envia SKU, primeiro preço e estoque em etapas; use **Verificar e
> continuar envio** até o Magalu confirmar. "Recebido" não significa publicado.
> São exigidos estoque físico confirmado, EAN válido e foto JPEG HTTPS. Uma
> loja sem permissões deve ser reautorizada sem excluir a conexão. Não há
> importação de anúncios antigos nem sincronização automática de estoque Magalu
> nesta entrega. O fluxo ainda precisa de validação com uma loja autorizada e
> um produto real; não afirmar que um anúncio foi publicado sem retorno do Magalu.

> Revisão 3.0.0.33.08: proteção contra encerramento por notificações no pacote
> Android da Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 3.0.0.33.07: no Mercado Livre, o botão de etiqueta só aparece quando
> o envio está apto para **Imprimir** ou **Reimprimir**. Não há botão Consultar
> para etiqueta indisponível. Um envio já coletado informa que a emissão não é
> permitida nesta etapa; **Atualizar** relê as vendas e abrir o pedido relê o envio.

> Revisão 3.0.0.33.06: o rótulo **Registrando…** do Controle de Ponto foi
> contido no botão circular; sem impacto operacional.

> Revisão 3.0.0.33.05: em Menu > Módulos, Acessar nos cards instalados de Controle
> de Ponto e Conteúdo AvantaVendas fecha o catálogo de módulos e abre seu popup.
> O acesso pelo menu permanece igual e as permissões existentes são preservadas.

> Revisão 3.0.0.33.04: refinamento visual do estado **Registrando…** no botão
> central do Controle de Ponto; sem impacto operacional.

> Revisão 3.0.0.33.03: clique em qualquer ponto da linha da venda abre ou fecha
> os detalhes; **Copiar pedido** apenas copia. A situação da etiqueta aparece
> em uma linha horizontal. A consulta e a prévia da etiqueta não mudaram.

> Revisão 3.0.0.33.02: **Copiar pedido** fica ao lado do número, separado da
> situação da venda. Continua copiando `Pedido #…`; a etiqueta não muda.

> Revisão 3.0.0.33.01: o logo da plataforma na linha de venda passa a ter o
> mesmo tamanho visual de Contas conectadas. Sem impacto operacional.

> Revisão 3.0.0.33: em Marketplaces Web, cada venda identifica a plataforma e
> **Copiar** coloca `Pedido #…` na área de transferência. Para Mercado Livre,
> a impressão obtém o PDF pela API oficial e o exibe no AvantaLab;
> não abre uma aba vazia. A alternativa **Abrir o PDF em nova guia** é explícita
> e erros de consulta aparecem na própria tela. Não há mudança no fluxo Magalu.

> Revisão 3.0.0.32: avisos de venda aparecem somente ao abrir **Anúncios em
> marketplaces** no perfil que possui o pedido; a Gestão e os demais módulos
> não os exibem. Em um aviso, **Ver venda no AvantaLab** restringe a conta,
> expande e abre o pedido interno. Essa ação não abre nem consulta o portal
> externo. **Entendi** apenas confirma a leitura para o usuário.

> Revisão 3.0.0.31: para lançar uma despesa, na tela inicial selecione o mês,
> vá a Despesas, preencha dia, tipo de despesa, descrição e valor e clique em OK.
> Cadastrar Despesas administra tipos e categorias; não é o lançamento mensal.
> A Ava usa o fluxo exato, responde de forma curta e revisa erros de orientação
> sem defendê-los como "forma geral". Contingência recebe o mesmo guia do ambiente.

> Revisão 3.0.0.30: em Projetos, Reorganizar e a troca de direção do mapa exigem
> confirmar o layout automático, que substitui todas as posições manuais, inclusive
> de ramos recolhidos. Cancelar, fechar ou Escape preserva o mapa e a direção.
> Textos e conexões não mudam; Desfazer recupera a disposição anterior na sessão.

> Revisão 3.0.0.28: a reconexão da mesma loja Magalu pelo AvantaLab agora
> solicita consentimento separado para categorias, SKU, preço e estoque. A
> conta atual continua consultando vendas; não é preciso excluí-la. Esta revisão
> não envia produtos, preços ou saldos: a publicação permanece bloqueada até o
> contrato de catálogo ser validado e a pessoa confirmar cada envio no AvantaLab.

> Revisão 3.0.0.27: o diagnóstico de relatórios Apple inclui data e motivo oficial.
> HTTP 403 não confirma falta de permissão da chave: conferir o código devolvido,
> a situação do contrato e a chave ativa. Sincronização parcial não confirma que
> todos os dias foram recuperados. Sem alteração nos controles da Gestão.

> Revisão 3.0.0.26: o login do Admin permite reconhecimento pelo gerenciador de
> senhas do navegador. Salvar/preencher depende das preferências do navegador;
> não existe armazenamento local próprio da senha. CSV oficial Google Play usa
> UTF-16 e é interpretado corretamente. Apple 403 indica chave sem acesso aos
> relatórios: conferir Sales and Trends no App Store Connect, sem pedir segredo
> pelo chat. Atualizar lojas confirma os dados somente após resposta da fonte.

> Revisão 3.0.0.25: no Admin, os indicadores Apple App Store e Google Play
> mostram downloads iniciais oficiais dos últimos 90 dias e a data da última
> leitura. Use **Atualizar lojas** para consultar as fontes agora. Dado atrasado
> ou sem leitura oficial não confirma quantidade atual; o aviso indica a fonte
> que precisa de configuração ou nova tentativa. Sem impacto na Gestão Mobile.

> Revisão 3.0.0.24 (publicação autorizada): vendas/pós-venda Magalu das versões
> anteriores e avisos de Venda pendente para pedidos antigos ainda aguardando
> envio. Entendi confirma a leitura, não envia ou encerra a venda. Um aviso por
> pedido/usuário; entregues, cancelados, despachados e Full não geram pendência.
> ML: abrir o pedido atualiza só a linha. Etiqueta liberada mostra Imprimir ou
> Reimprimir; Atualizar vendas ou abrir o pedido relê o provedor quando o cache
> ainda não a liberou.
> Envio programado mostra data informada pelo ML, sem prometer liberação antecipada.
> PDF aparece dentro do AvantaLab; **Abrir o PDF em nova guia** é opcional e
> explícito. Não é preciso permitir popup. Impressão
> revalida o pedido atual: canceladas, despachadas e Full não imprimem localmente.
> Magalu: acesso de logística para etiquetas autorizado e configurado junto das
> 14 consultas, mas geração local ainda depende de contrato completo/validação real.
> Por enquanto, Abrir etiquetas no Magalu leva ao portal e exige localizar o pedido
> na mesma loja. Não afirmar que impressão de todos os marketplaces está pronta.
> Após publicar, autorizar a loja com os novos acessos e testar dados reais; estoque,
> anexos fiscais e conversas fora de protocolos Magalu não foram integrados.

> Revisão 3.0.0.23 (somente local, sem publicação): consulta de vendas e pós-venda
> Magalu preparada no mesmo painel do ML. Vendas reúne contas autorizadas; use
> Conta das vendas e Situação para filtrar. Expandir o pedido mostra suas entregas,
> preparação, notas fiscais informadas e Pós-venda · Magalu. Protocolos incluem
> motivo, situação, responsável, prazo, mensagens e histórico quando disponíveis.
> Cancelamento não comprova devolução nem reembolso; remessa de retorno não
> confirma recebimento físico. Falha ou acesso negado não significam ausência.
> Movimentações financeiras não equivalem a saldo recebido. Respostas, devoluções
> e reembolsos continuam no portal Magalu; procure o pedido na mesma loja.
> Não há geração de etiquetas, sincronização de estoque Magalu, anexos fiscais
> ou conversas fora de protocolos nesta etapa. Migração só testada em banco isolado:
> aplicar e validar autorização das 14 consultas/pedidos reais antes de ativar.
> Não afirmar que vendas reais foram carregadas ou que produção já foi atualizada.

> Revisão 3.0.0.22 (código local, sem publicação): uma única autorização Magalu
> solicita as 14 consultas aprovadas: pedidos, produtos, estoque, entregas,
> notas/documentos fiscais, reclamações, devoluções, mensagens/eventos do SAC,
> transações do SAC, conversas com compradores e relatório financeiro.
> Os acessos foram adicionados à aplicação Magalu e conferidos como disponíveis
> e padrão, sem pendências; não foi liberada escrita. Isso não concede o
> consentimento da loja automaticamente: na próxima conexão, escolha a mesma
> loja e permita o conjunto de consultas. Não é preciso excluir a conta; a
> conexão existente é atualizada mantendo sua identificação e vínculos.
> Escopo ausente impede falsa confirmação completa. Cancelar, reembolsar,
> responder mensagens ou gerar etiquetas não foi liberado por esta etapa.
> As telas/adaptadores de vendas e pós-venda Magalu ainda precisam ser ativados;
> não afirmar que os dados já aparecem no AvantaLab ou foram testados em vendas reais.

> Revisão 3.0.0.21 (local, sem publicação): a conexão Magalu usa o acesso
> escolhido no ID Magalu (`tenant`), não o identificador do login. Antes de
> salvar, confirma o perfil vendedor na API oficial e a identidade da loja.
> Se o Magalu negar acesso vendedor, refaça a conexão escolhendo a loja, não
> o perfil pessoal; se já escolheu a loja, confira a liberação da integração.
> Falhas temporárias não confirmam conexão nem provam que a conta seja pessoal.
> Teste isolado da Saldão Aline valida autorização/identidade sem gravar tokens
> ou contas em produção. Ainda não ativa anúncios, vendas ou estoque Magalu.

> Revisão 3.0.0.20: rotação protegida do token de webhook da Asaas, sem
> alteração de telas, planos, lançamentos ou orientação operacional da Gestão.

> Revisão 3.0.0.19: publicação autorizada do diagnóstico Magalu.
> Avisos desse fluxo tratam somente do Magalu, sem mensagem sobre o Mercado Livre.
> Uma falha deve informar motivo conhecido e próxima ação: refazer autorização,
> permitir consultas, conferir acesso da loja, aguardar comunicação ou pedir
> revisão ao administrador. **Referência** identifica a ocorrência nos logs.
> Identificação não reconhecida não prova que a conta seja de compras; resposta
> fora do contrato também pode ser falha da integração. Não atribuir toda falha
> às permissões nem afirmar sucesso sem conta salva. Nada muda no ML ou estoque.
> Conta de compras e cadastro desenvolvedor não substituem cadastro de uma loja:
> cadastro oficial começa em https://marketplace.magalu.com/cadastro?service=magalu
> pelo CNPJ; concluir cadastro/aprovação e acesso da organização vendedora antes
> de conectar no AvantaLab. Não prometer conversão automática por e-mail.

> Revisão 3.0.0.18: publicação autorizada dos ajustes de contas Magalu e logo
> clássico Casas Bahia com fundo branco. OAuth Magalu habilitado em produção:
> selecione **Magalu**, use **Conectar outra conta** e entre como responsável
> pela loja no ID Magalu para escolher a organização e autorizar as consultas.
> Após confirmação real, fecha o popup, atualiza contas e pede identificação.
> Não afirmar que uma loja está conectada antes desse retorno. **Em preparação**
> permanece porque anúncios, vendas e estoque Magalu ainda não estão integrados.
> A conta autorizada mostra sincronização pendente; ML permanece operacional.

> Revisão 3.0.0.17: Casas Bahia mantém o logo clássico sobre fundo externo
> branco no seletor e nas contas. Sem impacto operacional ou publicação.

> Revisão 3.0.0.16: logo clássico Casas Bahia fornecido pelo usuário aplicado
> ao seletor e à identidade das contas. Sem impacto operacional ou publicação.

> Revisão 3.0.0.15: preparação do banco, retorno HTTPS e credenciais Magalu
> concluídos, ainda sem publicação/ativação ou consentimento de loja real.
> Após autorização confirmada, a lista se atualiza e solicita identificação;
> o popup fecha ou retorna ao módulo da empresa. A conta aparece como
> **Autorizada · sincronização pendente**, não como integração operacional.
> Pode editar identificação/desconectar; Renovar permanece exclusivo do ML.
> Não afirmar que Magalu publica, consulta vendas ou sincroniza estoque.
> O aviso de rotina automática se refere expressamente ao Mercado Livre.
> Casas Bahia agora usa logo branco sobre azul, com traço vermelho.

> Revisão 3.0.0.14: escolher situação no header aplica o filtro de todas as
> contas, expande **Vendas** e rola até seu card, com título abaixo do header
> e das marcas fixas. **Ver vendas** usa a mesma rolagem. Funciona também
> para Todas e situações sem resultados. Período mantido; situação no bloco
> e atualizações automáticas não rolam. Movimento reduzido respeitado.
> Esta entrega reúne as revisões 3.0.0.11 a 3.0.0.14 para produção; a migração
> aditiva do histórico já foi aplicada. As notas abaixo registram sua evolução.

> Revisão 3.0.0.13: **Situação** fica ao lado de **Conta das vendas**.
> Vale a última situação escolhida, no bloco ou no header; os dois seletores
> mostram o mesmo estado, sem somar filtros incompatíveis. Escolher situação
> no bloco mantém conta e período; escolher novamente no header volta a todas
> as contas. Contagens do bloco correspondem à conta/período, antes do recorte
> de situação; contagens do header continuam globais. Desktop lado a lado,
> celular em coluna. Sem publicação.

> Revisão 3.0.0.12: Marketplaces inicia em **Todo o período**, **Todas** as
> situações de vendas e **Todas as contas**. Anunciados também inicia em
> todas as contas/situações, substituindo o padrão Ativos da revisão anterior.
> Escolher situação ou período no cabeçalho abre Vendas, aplica a base recente
> e limpa a conta anterior: Entregues 6 mostra os seis no período, de todas
> as contas. Depois use **Conta das vendas** para restringir. Os números do
> cabeçalho são de todas as contas, não apenas da restrição local. Escolher
> conta para publicar não filtra vendas. Somente Vendas inicia expandido.
> Sem alteração de estoque ou publicação.

> Revisão 3.0.0.11: após migração/publicação, a rotina recupera vendas anteriores
> à ativação, mais recentes primeiro, sem nova baixa das que já integram o saldo
> inicial. Vendas novas têm prioridade na fila durante a recuperação do histórico.
> O filtro **Ativos / em andamento** inclui anúncio pausado,
> encerrado ou sem estoque continua ativo operacionalmente se tiver pedido em
> curso. A linha mostra a pendência e, separadamente, o estado real no ML.
> Saldo zero sem pendência não entra nos ativos. Cancelamento/devolução/reclamação
> só sai após encerramento confirmado; consulta negada ou incompleta mantém
> **Pós-venda a confirmar**, não inventa conclusão. Pedidos em aberto são
> reconsultados periodicamente. Atualizações continuam ocultas: aplicar novidades
> por Atualizar/filtros, sem perder a edição. Classificar não reativa anúncios,
> repõe estoque ou executa devoluções/reembolsos. Código ainda sem publicação.

> Revisão 3.0.0.10: **Situação das vendas** ordena automaticamente da maior
> para a menor quantidade no período escolhido, com **Todas** no início e
> situações zeradas ao fim. Empates conservam a ordem original. Alterações
> nas contagens reordenam a lista sem trocar o filtro selecionado. Sem publicar.

> Revisão 3.0.0.09: mais 10% de redução na altura visual dos botões do
> cabeçalho Marketplaces. Área interativa, textos e altura do header mantidos.
> Sem impacto operacional. Sem publicação.

> Revisão 3.0.0.08: botões do cabeçalho Marketplaces 10% mais baixos,
> com área interativa e altura do header mantidas. Sem impacto operacional.
> Sem publicação.

> Revisão 3.0.0.07: opções de Situação das vendas mais estreitas e baixas
> no desktop, com área de toque preservada. Sem impacto operacional;
> nomes, filtros e altura do cabeçalho mantidos. Sem publicação.

> Revisão 3.0.0.06: opções de Situação das vendas com fonte menor, nome
> e quantidade na mesma linha. Sem impacto operacional; filtros e altura
> do cabeçalho preservados. Sem publicação.

> Revisão 3.0.0.05: cores suaves nos filtros do cabeçalho Marketplaces;
> Ver vendas destacado na cor da empresa, com contador dentro do botão.
> Altura e ações mantidas, sem impacto operacional. O contador continua
> sendo o total filtrado, não vendas novas/não lidas. Sem publicação.

> Revisão 3.0.0.04: cabeçalho Marketplaces dividido em **Período das vendas**
> (mês, Todo o período, Selecionar datas), **Situação das vendas** (seletor e
> contagem por situação) e **Atualização e avisos** (Atualizar e Ver vendas).
> Altura mantida. Em tablet estreito, rótulo do grupo e tooltips identificam
> as ações compactadas em ícones. Ver vendas abre a lista com os filtros
> atuais e todas as contas; o número é total filtrado, não vendas novas/não
> lidas. A bolinha de Atualizar indica novidades disponíveis. Selecionar datas
> abre o mesmo card de início/fim; apenas o texto foi esclarecido. Sem publicar.

> Revisão 3.0.0.03: retirado Conexão e gestão do card inicial de Marketplaces,
> reduzindo sua altura e espaçamento vertical. Título e ações preservados;
> sem impacto operacional. Sem publicação.

> Revisão 3.0.0.02: removido o campo separado Identificação da conta de
> Novo anúncio, pois **Publicar na conta** já mostra nome local, nome oficial
> e ID. Alteração da identificação continua no lápis da conta conectada;
> conexão bem-sucedida continua solicitando a identificação. Sem publicação.

> Revisão 3.0.0.01: **Identificação da conta** em Novo anúncio apenas exibe
> o nome local, sem permitir edição. Após conexão bem-sucedida, a conta
> confirmada solicita uma identificação dentro do próprio card. Nas contas
> já conectadas, o lápis antes de **Renovar** abre essa mesma edição, somente
> do nome local. Use **Salvar identificação** ou **Cancelar**; sair do campo
> não salva. O nome aparece após o logo, antes do nome oficial e ID. Renovação
> não solicita novo nome. Sem alteração remota de anúncios, estoque ou nome
> oficial. Esta orientação substitui o salvamento automático da revisão anterior.

> Revisão 3.0.0: **Identificação da conta**, antes de Publicar na conta em
> Novo anúncio, permite ao administrador/master atribuir um nome local ou
> número. Salva ao sair do campo ou pressionar Enter; apagar volta ao nome
> oficial. Identificação compartilhada pelos usuários da empresa, exibida
> nas contas, seletores, anúncios, vendas e destinos dos produtos. Nome
> oficial e ID continuam disponíveis. Não renomeia a conta no marketplace,
> não reconecta nem altera estoques. Erro de salvamento permanece visível;
> só confirme a alteração após resposta do servidor. Tabela auxiliar aplicada
> com autorização, código sem publicação.

> Revisão 2.2.0: a marca selecionada filtra contas, Novo anúncio, Anunciados
> e destinos de preparação do cadastro. Esta regra substitui a seleção que
> antes definia apenas o destino de Conectar outra conta. Não mistura contas
> de plataformas diferentes. A troca fica bloqueada durante edição/preparação.
> Produtos e estoque continuam compartilhados pela empresa; Vendas e os avisos
> continuam gerais, com seus próprios filtros. Todas as marcas são selecionáveis,
> mas Em breve/Em preparação não ativa a integração ou a publicação.
> Header e marcas permanecem visíveis ao rolar, com 12px de folga entre eles;
> alturas e rolagem se adaptam à tela. Sem publicação nesta entrega.

> Revisão 2.1.0.06: card de apresentação de Marketplaces mais baixo por
> redução do espaçamento vertical. Título e botões preservados. Sem impacto
> operacional. Sem publicação.

> Revisão 2.1.0.05: retirada da orientação estática sobre contas mantidas e
> janela anônima. Sem impacto operacional; conectar continua preservando as
> contas existentes e os avisos de erro continuam aparecendo. Sem publicação.

> Revisão 2.1.0.04: contas conectadas compactas, com marca, nome, ID, situação,
> última sincronização e avisos na mesma linha no desktop. Em telas menores ou
> dados extensos, as informações quebram de linha sem corte. Renovar é o
> mesmo Renovar autorização e continua abrindo dentro da conta; Desconectar
> mantém sua confirmação. Botões menores preservam área de toque.
> Conectar outra conta e Atualizar contas ficam no cabeçalho da lista; Atualizar
> contas continua recarregando todas as conexões da empresa. A marca vem da
> conexão, não do seletor. Nenhuma nova integração ativada. Sem publicação.

> Revisão 2.1.0.03: blocos horizontais de largura integral: Marketplace
> primeiro e Novo anúncio logo abaixo. Marcas na mesma linha no desktop e
> com quebra responsiva. Nenhuma mudança na seleção, conexão ou publicação.
> Cards de contas compactos continuam apenas simulados. Sem publicação.

> Revisão 2.1.0.02: seletor Marketplace usa logos e cores das marcas.
> Borda e sinal de confirmação identificam a opção selecionada. Em breve e
> Em preparação continuam visíveis e não significam integração ativa. A
> seleção muda somente o destino de Conectar outra conta. Cards de contas
> compactos foram apenas simulados, não implementados. Sem publicação.

> Revisão 2.1.0.01: **Marketplace** define somente o destino de **Conectar
> outra conta**. Magalu é selecionável; vendas, anúncios, produtos, cabeçalho
> e contas existentes não mudam nem são remontados pela seleção. Novo anúncio
> continua usando a conta de publicação própria, independente desse seletor.
> O backend Magalu ainda está em preparação e informa isso ao tentar conectar.
> Não significa que a loja está conectada. Sem publicação nesta entrega.

> Revisão 2.1.0: retorno seguro Magalu preparado no backend, sem publicação.
> Magalu continua em preparação na interface. Cadastro da aplicação no ID
> Magalu não conecta uma loja nem ativa anúncios, vendas ou estoque. A loja
> precisa autorizar o acesso por conta própria; pessoa física desenvolvedora
> não equivale a uma conta seller habilitada. Migração e configuração dependem da
> futura ativação autorizada; não afirmar que o Magalu já sincroniza.

> Revisão 2.0.0.10: ícone de atualização do cabeçalho corrigido. Botões do
> cabeçalho de Marketplaces mostram ajuda padrão abaixo, no mouse ou foco pelo
> teclado. Atualização continua manual das listas, sem recarregar o navegador
> nem enviar edições aos marketplaces. Sem mudança das funções existentes.
> O tooltip do botão de atualização é **Atualizar anuncios**.
> Dicas inferiores têm largura do conteúdo e preferem uma linha, com quebra
> apenas quando necessário para caber na tela.

> Revisão 2.0.0.09: nas linhas de Vendas, a seta ao lado da situação aponta
> para baixo quando fechada e para cima quando aberta. A linha inteira abre
> ou fecha os detalhes, inclusive pelo teclado.

> Revisão 2.0.0.08: clicar para abrir uma venda leva o cabeçalho do pedido para
> baixo do cabeçalho fixo e destaca fundo/borda. Fechar ou atualizar em segundo
> plano não provoca nova rolagem. Redução de movimento respeitada.

> Revisão 2.0.0.07: Anunciados inicia em **Todas as contas**, com **Situação:
> Ativo**. **Conta dos anúncios** fica no cabeçalho, na linha dos botões, e não
> altera a conta de Novo anúncio. A lista informa a conta de origem; editar ou
> preparar cópia usa essa origem, mesmo em Todas. Filtro de contas bloqueado
> durante edição ou preparação de cópia. Consulta só contas conectadas da empresa.

> Revisão 2.0.0.06: atualizações automáticas não substituem as listas nem o
> pedido/pós-venda aberto. Avisos e contadores no cabeçalho acompanham novidades;
> nova venda continua abrindo o popup. O ícone de atualização no cabeçalho indica
> novidades e aplica as listas somente ao clicar; fica bloqueado durante edição
> de anúncio/publicação. **Atualizar** de cada bloco continua manual. Escolher
> filtros ou clicar no sino usa as vendas recentes. Estoque segue sincronizando
> no servidor; a lista estável não representa paralisação da rotina.

> Revisão 2.0.0.05: linhas de Vendas recebem destaque de fundo ao passar o mouse
> ou usar foco pelo teclado. Sem impacto operacional.

> Revisão 2.0.0.04: a busca e os botões **Novo produto**, **Importar anúncios
> existentes** e **Carregar estoque dos anúncios** ficam na mesma barra compacta
> de Produtos e estoque no computador. No celular, aparecem em coluna.
> Confirmações e proteção dos saldos existentes permanecem iguais.

> Revisão 2.0.0.03: **Carregar estoque dos anúncios** pede confirmação antes
> da consulta. **Revisar anúncios** só mostra as quantidades, sem salvar saldos.
> Depois de revisar a lista, **Carregar saldos no local** pede outra confirmação
> antes de gravar. Estoques já definidos, inclusive zero, não são substituídos.
> O saldo confirmado alimenta a sincronização dos anúncios vinculados compatíveis.

> Revisão 2.0.0.02: na carga inicial de estoque, **Carregar saldos no local**,
> **Consultar novamente** e **Fechar** ficam no topo dos resultados.
> A função continua disponível para produtos sem saldo definido, inclusive
> anúncios antigos de novas contas. Não sobrescreve saldos já confirmados.

> Revisão 2.0.0.01: ao abrir ou recarregar Marketplaces, somente **Vendas**
> inicia aberto. **Anunciados** e **Produtos e estoque** iniciam recolhidos;
> use **Expandir** no cabeçalho para acessar suas listas e ações. Durante a
> visita, a expansão manual é preservada nas atualizações. Ordem, filtros,
> sincronização e controles do topo/rodapé não mudaram.

> Revisão 2.0.0: após migração, publicação e ativação do agendador Supabase,
> novas vendas confirmadas baixam uma vez o saldo local dos produtos vinculados.
> Vendas históricas anteriores ao ponto inicial não baixam novamente. Ajustes
> em Produtos e estoque alimentam anúncios compatíveis; não editar o estoque
> vinculado separadamente no anúncio. Nova publicação usa o saldo local atual.
> A fila relê o saldo enviado; falhas, estoque insuficiente, falta de vínculo,
> variações, kits, Full e depósitos sem configuração ficam como pendência visível.
> Cancelamento/reembolso não comprova retorno físico nem repõe unidades.
> Aviso central **Nova venda** mostra conta, plataforma, pedido, produto e quantidade,
> sem depender dos filtros. **Ver anúncio no Mercado Livre** abre o anúncio vendido;
> pode ser necessário entrar na mesma conta. **Entendi** registra leitura apenas
> para o usuário, não marca envio. Várias vendas/itens aparecem um por vez, após
> fechar outra edição/modal. Realtime e conferência de dez segundos atualizam a tela.
> Com o navegador fechado não há popup/push; a rotina de estoque continua no servidor.
> Conferir a situação da sincronização: não afirmar ativação apenas pela versão.
> Outras plataformas exigem seus conectores; não prometer atualização instantânea.

> Revisão 1.52.0.03: retirada da numeração decorativa dos cards Marketplace,
> Novo anúncio e Vendas. Títulos e contagens mantidos; sem impacto operacional.

> Revisão 1.52.0.02: botões Expandir/Recolher de cada produto com metade da
> altura visual e área de toque preservada. Sem impacto operacional.

> Revisão 1.52.0.01: retirada de duas orientações estáticas em Novo anúncio.
> Validações e fluxos preservados; sem impacto operacional.

> Revisão 1.52.0: para anúncios já feitos, **Carregar estoque dos anúncios**
> em **Produtos e estoque** consulta o ML e revisa a carga inicial dos cadastros
> ainda sem saldo. Só anúncio ativo com quantidade maior que zero fornece
> estoque; inativos e zerados são desconsiderados, sem zerar o local. Vincule
> anúncios iguais antes da carga. Uma única origem pode ser sugerida; com mais
> de um anúncio, escolha apenas um, sem somar contas. Confirme **Carregar estoque**.
> Uma mudança na quantidade durante a revisão exige nova consulta. Saldos locais
> já definidos, inclusive zero, não são sobrescritos; depois use o ajuste manual.
> A origem fica no histórico. Não modifica anúncios nem implementa baixa por vendas.

> Revisão 1.51.0.02: os blocos **Vendas**, **Anunciados** e **Produtos e
> estoque** oferecem **Recolher** também no rodapé quando expandidos. Recolher
> pelo rodapé volta ao controle do topo, sem perder filtros ou edições.

> Revisão 1.51.0.01: espaçamento vertical na ficha de Produtos e estoque,
> entre campos, confirmações e ações. Sem impacto operacional.

> Revisão 1.51.0: Marketplaces tem **Produtos e estoque**, uma lista expansível
> por empresa. **Importar anúncios existentes** importa os anúncios já
> sincronizados das contas, sem somar quantidades e sem confirmar estoque.
> Abra cada produto e confirme as unidades físicas (zero é válido), com
> histórico. Para o mesmo produto em contas diferentes, use **Vincular ao
> cadastro** no registro com estoque ainda não confirmado: confirme que é o
> mesmo produto e mantenha o cadastro correto; os saldos nunca são somados.
> **Novo produto** salva nome, SKU, EAN opcional, descrição, preço, categoria e
> fotos sem publicar. **Preparar anúncio** escolhe uma conta e abre Novo anúncio
> para revisão separada; estoque deve estar confirmado. Uma primeira publicação
> nova registra a ficha e o estoque inicial no cadastro local antes de enviar
> ao ML. Republicações vinculam outro anúncio ao mesmo produto e não aumentam
> estoque. Dados locais não alteram anúncios existentes. Importação do cache
> pode ter ficha parcial: **Consultar ficha do anúncio** completa fotos, descrição
> e características ausentes sem alterar anúncios, saldo físico ou dados revisados.
> Anúncios com variações não são importados/copiados nesta primeira etapa; precisam
> de cadastro por variação. Ainda não há reserva, baixa automática por venda nem
> sincronização do saldo com as contas. Não prometer proteção contra venda sem
> estoque; mantenha o saldo físico revisado. AvantaVendas não usa este saldo.

> Revisão 1.50.0.07: **Publicar em outra conta** aceita o anúncio original
> sem EAN: usa a ficha ativa do catálogo ou o anúncio tradicional confirmado
> na conta de origem. Não inventar código nem exigir EAN apenas porque mudou
> de conta. Revise preço, estoque, descrição e opções no destino; preparar não
> publica. Se o Mercado Livre exigir EAN ou motivo da ausência, informe apenas
> dados reais. A categoria e o validador do ML continuam obrigatórios; a origem
> é da mesma empresa e é relida antes da publicação. Preço/estoque copiados
> aparecem preenchidos e falha na cópia não prende a troca de conta. Não muda
> a exigência de EAN na pesquisa inicial por código. Consulta real no local
> depende das chaves seguras da integração.

> Revisão 1.50.0.06: mais espaço vertical entre o painel de publicação em
> outra conta e as ações de edição. Sem impacto operacional no fluxo.

> Revisão 1.50.0.05: em **Renovar autorização**, mantenha aberto o painel
> da conta enquanto concluir **Autorizar agora** ou o titular usar o link.
> O servidor confirma a solicitação automaticamente; a conta alvo atualiza e
> o card mostra **Renovação concluída**, sem clicar em Atualizar contas. A aba
> aberta pelo botão fecha após sucesso. Se o navegador impedir ou o titular
> abrir o link numa aba comum, a mensagem informa que pode fechá-la. Cancelar,
> expirar ou autorizar outra conta não confirma renovação nem apaga a conexão.
> Fechar o painel interrompe a conferência automática, mas não cancela o link.
> Renovação concluída não comprova acesso a todas as reclamações/devoluções:
> use Atualizar pós-venda no pedido para conferir o acesso real.

> Revisão 1.50.0.04: Classificar, Atualizar e Recolher/Expandir têm o mesmo
> efeito ao passar o mouse. Sem impacto operacional nas ações ou na ordenação.

> Revisão 1.50.0.03: classificação mostra o ícone de filtro, tem largura
> constante e altura igual à de Atualizar/Recolher. Sem impacto operacional:
> Mais recentes/Mais antigas continuam alternando a ordem por data.

> Revisão 1.50.0.02: Vendas e Anunciados têm no topo **Mais recentes** /
> **Mais antigas**. Clique para inverter a ordem pela data de venda ou criação
> original do anúncio no Mercado Livre (não pela sincronização). Cada bloco tem
> sua própria ordem, começando pelos mais recentes. Filtros/contadores e detalhes
> das vendas são preservados. Nos anúncios, retorna à página 1; durante edição
> ou preparação em outra conta, termine/cancele antes de ordenar. A ordem vale
> para a tela atual, sem alterar dados no marketplace nem salvar preferências.

> Revisão 1.50.0.01: em Novo anúncio, apenas o botão da pesquisa iniciada
> mostra **Pesquisando…**. O outro mantém seu texto, mas aguarda a busca atual
> terminar. Sem impacto operacional na seleção, revisão ou publicação.

> Revisão 1.50.0: **Novo anúncio** oferece **Ou pesquise por nome, marca ou
> modelo**, abaixo do EAN. Digite ao menos 3 caracteres e use **Buscar produto**
> ou Enter. Escolha a ficha em **Produto encontrado**, mesmo se houver uma só.
> A busca por descrição consulta o catálogo ativo do Mercado Livre, não a web
> nem os produtos do perfil. Com EAN único válido, o código é preenchido e
> reconfirmado. Com vários, escolha **EAN da embalagem**; sem código válido,
> digite/leia o EAN acima para pesquisar novamente. Não inventar códigos nem
> afirmar que uma ficha sem EAN está pronta. Pesquisa não publica: a confirmação
> da ficha e a revisão dos dados de venda continuam obrigatórias. Digitar em
> uma busca limpa a outra e descarta a preparação anterior. EAN mantém seu fluxo
> existente, incluindo produtos cadastrados no perfil se ausentes no catálogo ML.

> Revisão 1.49.0.23: aviso de dados anteriores na edição de anúncio simplificado,
> orientando usar **Recarregar edição**. Sem impacto operacional; os campos
> continuam bloqueados até confirmar os dados atuais.

> Revisão 1.49.0.22: passar o mouse sobre um anúncio destaca suavemente sua
> linha, sem alterar o texto ou o destaque de edição. Foco por teclado tem
> efeito equivalente. Sem impacto operacional: o lápis continua abrindo a edição.

> Revisão 1.49.0.21: clicar no lápis para editar leva o título do anúncio
> ao topo visível, abaixo do cabeçalho. O carregamento dos dados não muda essa
> posição. Cancelar, salvar e confirmar a publicação continuam iguais.

> Revisão 1.49.0.20: o anúncio em edição é destacado pelo fundo e pela faixa
> lateral, sem mudar a cor do texto. Os nomes/descrições da lista aparecem
> completos com quebra de linha. Sem impacto operacional no fluxo de edição.

> Revisão 1.49.0.19: o anúncio aberto para edição mostra o título completo
> destacado na cor da empresa e a indicação **Em edição**. Sem impacto
> operacional: revisão, salvamento e confirmação continuam iguais.

> Revisão 1.49.0.18: **Publicar em outra conta** fica à direita na mesma barra
> das ações do anúncio, com destaque na cor do perfil e tooltip de preparação.
> Sem impacto operacional: a publicação no destino continua exigindo revisão
> e confirmação separadas; abrir a opção não publica o anúncio.

> Revisão 1.49.0.17: **Atualizar contas** é uma ação geral ao lado de
> **Conectar outra conta**; recarrega as contas da empresa e listas locais, não
> renova permissões ou consulta reclamações. **Renovar autorização** expande
> para baixo dentro do card da conta escolhida, com **Autorizar agora** e
> **Gerar link** lado a lado. **Fechar** recolhe a área sem cancelar o link.
> Após concluir no Mercado Livre, use a atualização geral e depois
> **Atualizar pós-venda** na venda. Atualizar contas não comprova acesso ao pós-venda.

> Revisão 1.49.0.16: Autorizar agora, Gerar link e Atualizar contas ficam
> alinhados na mesma linha do painel de renovação. Sem impacto operacional.

> Revisão 1.49.0.15: os dados da conta Marketplaces ocupam a largura inteira;
> Renovar autorização e Desconectar ficam lado a lado abaixo, em faces compactas.
> O painel foi simplificado: **Autorizar agora** abre o Mercado Livre diretamente
> em janela separada, para entrar na conta indicada e consentir. Sem o login,
> **Gerar link** permite enviá-lo ao titular. **Atualizar contas** fica dentro do
> painel; depois, atualizar o pós-venda. Identidade, permissões, validade, uso
> único e preservação do histórico seguem iguais.

> Revisão 1.49.0.14: em Contas conectadas de Marketplaces, gestor/administrador
> pode usar **Renovar autorização** e **Gerar link**.
> **Copiar link** permite envio manual, sem solicitar senha ou acesso AvantaLab
> ao titular. O responsável confirma a conta indicada e continua no Mercado
> Livre; usar janela anônima se outra conta estiver conectada. Link válido por
> 30 minutos e um retorno, só para a conta/empresa selecionadas. **Cancelar link**
> invalida uma solicitação ainda pendente; **Fechar** não cancela. Atualizar
> contas e pós-venda após conclusão. Contas expiradas também são renováveis.
> Não desconectar, excluir histórico ou prometer que renovar resolverá o 403:
> as permissões/políticas do ML continuam sendo verificadas pela plataforma.

> Revisão 1.49.0.13: o pós-venda de Marketplaces mostra problema relatado
> (texto fornecido pelo ML), etapa em português, próximo responsável, prazo e
> datas do caso quando autorizados. **Pendente** é ação obrigatória informada
> pelo ML; **Disponível** é opção, não recomendação de reembolso ou aceite.
> Casos encerrados não têm pendências atuais. Falhas parciais conservam os
> dados confirmados e identificam a área bloqueada. Uma busca negada pode
> recuperar os casos identificados pelo próprio pedido, sem confirmar que o
> histórico está completo. O aviso de permissão orienta o administrador a
> conferir claims/returns no DevCenter, autorização da mesma conta e atualizar
> a consulta; reconectar apenas quando necessária nova autorização. Não excluir
> a conta nem presumir devolução por cancelamento. Código não concede permissão
> do ML. Respostas, aceites e reembolsos continuam na plataforma. Gestão Mobile
> e PWA AvantaPreços não foram alterados.

> Revisão 1.49.0.12: tooltip dos pontos de organização encurtado para “segure
> arraste para mudar a ordem”. Ajuste de texto, sem impacto operacional.

> Revisão 1.49.0.11: tooltip de organização dos blocos informa “segure arraste
> para mudar a ordem dos blocos”. Ajuste de texto, sem impacto operacional.

> Revisão 1.49.0.10: tooltips oficiais explicam Atualizar, os pontos de organização
> e Expandir/Recolher nos blocos Anunciados e Vendas. Sem impacto operacional.

> Revisão 1.49.0.09: botões Atualizar e Recolher/Expandir de Anunciados usam
> o mesmo visual de Vendas. Sem impacto operacional: ações e permissões mantidas.

> Revisão 1.49.0.08: em **Anúncios em marketplaces**, **Vendas** vem antes de
> **Anunciados** por padrão. Arraste pelos seis pontos do cabeçalho para mudar
> a ordem dos blocos completos (não dos pedidos ou anúncios). Com foco nos
> pontos, as setas ou Início/Fim também organizam. Escape cancela um arraste.
> Recolher os blocos facilita mover. A escolha fica salva neste navegador,
> separada por usuário e empresa; não sincroniza entre aparelhos. Mantém
> filtros, edição, detalhes e Recolher/Expandir; recolhimento vale só nesta
> abertura. Não modifica produtos, vendas nem contas do Mercado Livre.

> Revisão 1.49.0.07: em **Anúncios em marketplaces**, **Anunciados** e
> **Vendas** oferecem **Recolher/Expandir** no topo, independentemente. Ambos
> iniciam expandidos. Recolher mantém filtros, edição e detalhes; título e
> Atualizar continuam acessíveis. O sino expande Vendas e mostra todas as contas
> nos filtros atuais. O estado vale durante esta abertura, sem preferência salva.

> Revisão 1.49.0.06: ao abrir uma venda em **Anúncios em marketplaces**, o
> Nota de atualização 3.2.0.355: o trecho abaixo registra a consulta anterior. Mensagens e soluções confirmadas pelo usuário passaram para Mensagens e atendimento, conforme a seção atual; não há decisões automáticas.
> **Pós-venda · Mercado Livre** consulta pedido, envio original, reclamações
> abertas/encerradas e devoluções. Pedido cancelado com envio entregue não
> comprova devolução nem reembolso. Confira categoria, solicitante e data do
> cancelamento, motivo traduzido quando disponível, resolução, retorno,
> destino/rastreamento e situação do dinheiro. Retorno entregue ao depósito do
> Mercado Livre não significa produto recebido pelo vendedor. Reembolso dos
> pagamentos e dinheiro do caso são fontes distintas; a regra de quando haverá
> reembolso não comprova que ele já aconteceu. **Atualizar pós-venda** repete a
> consulta, que mostra data/hora, falhas de permissão e dados incompletos. Não
> interpretar indisponibilidade como ausência de devolução ou desconexão.
> Mostra até 5 casos recentes; histórico maior é sinalizado. Motivos/códigos
> desconhecidos recebem aviso em português, sem inventar tradução. Ações e
> prazos apontam para o Mercado Livre; use **Abrir vendas no Mercado Livre**,
> na mesma conta do pedido. Não há resposta, aceite ou reembolso automático
> pelo AvantaLab nem novas notificações push/feed de reclamações nesta etapa.
> Os filtros do cabeçalho continuam classificando o pedido, não seu retorno.

> Revisão 1.49.0.05: no cabeçalho de **Anúncios em marketplaces**, use as setas
> para escolher o mês, **Todos** para todas as datas, ou **Período** para aplicar
> datas inicial e final. O seletor de situação informa a quantidade em cada
> grupo; os grupos somam o total de pedidos únicos no período. O sino e os
> contadores das contas respeitam os filtros e não contam eventos repetidos.
> O sino abre as vendas de todas as contas; **Conta das vendas** permite uma
> conta específica. Vendas já entregues/enviadas/canceladas não aguardam etiqueta.
> **Atualizar** processa os avisos recebidos. Dados antigos sem data original
> usam a data de entrada no AvantaLab até serem sincronizados novamente.
> A Ava orienta estes filtros e não confunde o contador de pedidos com push.

> Revisão 1.49.0.04: em **Anúncios em marketplaces**, a etiqueta de uma venda
> Mercado Livre continua disponível como **Reimprimir etiqueta** depois de já
> impressa. As situações de pedido e envio aparecem em português; quando a
> impressão ainda não puder ser feita, a tela informa se depende de nota
> fiscal/DC-e, geração do Mercado Livre, cancelamento ou operação Full.

> Revisão 1.49.0.03: Top clientes completo no Dashboard do AvantaVendas.
> Sem impacto operacional na Gestão Web.

> Revisão 1.49.0.02: ajuste visual do botão Voltar em Divulgação do
> AvantaVendas. Sem impacto operacional na Gestão Web.

> Revisão 1.49.0.01: crédito anterior identificado nos comprovantes de pedido
> do AvantaVendas. Sem impacto operacional na Gestão Web.

> Revisão 1.49.0: em **Anúncios em marketplaces**, o sino e o contador de cada
> conta mostram novas vendas recebidas do Mercado Livre. Abra a conta para ver
> itens e situação do envio. Quando houver **Imprimir etiqueta**, o PDF abre
> pelo AvantaLab; em envio Full, a expedição é feita pelo Mercado Livre. Para
> operar em produção, a aplicação Mercado Livre precisa ter configurado o
> callback HTTPS `/api/webhooks/mercado-livre` nos tópicos `orders_v2` e
> `shipments`.

> Revisão 1.48.0.45.01: o cabeçalho de **Anúncios em marketplaces** volta a
> carregar a logo configurada do perfil empresarial. Sem impacto operacional
> nos fluxos de publicação, conexão ou preços.

> Revisão 1.48.0.45: em **Anúncios em marketplaces**, depois de publicar uma
> ficha, use **Preparar em outra conta** para levá-la a outra conta Mercado
> Livre conectada da mesma empresa. Preço, estoque, descrição, garantia e
> atributos continuam editáveis; a conta de destino é consultada novamente e
> só recebe o anúncio após a nova confirmação em **Publicar**. Em um anúncio
> já feito, abra **Editar** e use **Publicar em outra conta**: o AvantaLab relê
> o anúncio e a descrição atuais, abre a mesma revisão no destino e não publica
> nada nessa etapa. Contas de empresas diferentes não podem ser usadas.

> Revisão 1.48.0.44.02: ao editar uma despesa e adiar o pagamento para qualquer
> data futura, ela passa a Prevista, inclusive fixa ou parcela, preservando
> valor e sequência. Permanece prevista até confirmação explícita. Com o aviso
> de duplicados ativo, salvar uma inclusão ou edição mostra as despesas com o
> mesmo valor no mês/ano e centro selecionados, com data, nome, descrição, valor
> e situação. A própria linha e canceladas não entram na comparação. Voltar à
> edição mantém os campos; Salvar mesmo assim permite o lançamento legítimo.

> Revisão 1.48.0.44.01: correção do retorno social e do lembrar-me no
> AvantaVendas. Sem alterações operacionais na Gestão Web.

> Revisão 1.48.0.44: controle de sessão por perfil. Business Básico acessado em
> outro dispositivo retorna à seleção de perfil, sem encerrar o login da conta.
> Para reassumir aquele perfil, faça novo login; recarregar não remove o bloqueio.
> Pessoal não revoga Pro/Premium, que preservam acessos simultâneos. Falha de rede
> não provoca logout; as demais funcionalidades não foram alteradas.

> Revisão 1.48.0.43.26: download provisório da Divulgação no Android instalado
> antigo do AvantaVendas. Nenhuma alteração nos fluxos da Gestão Web.

> Revisão 1.48.0.43.25: correção restrita ao compartilhamento de materiais da
> Divulgação no AvantaVendas para Android; sem impacto operacional na Gestão Web.

> Revisão 1.48.0.43.24: O AvantaPreços usa diretamente o cabeçalho e CSS de página do Recebimentos. Sem impacto operacional na Gestão Web.

> Revisão 1.48.0.43.23: Correção do topo do AvantaPreços no iPhone: área segura aplicada fora do cabeçalho útil e fundo raiz autenticado opaco. Sem impacto operacional na Gestão Web.

> Revisão 1.48.0.43.22: o cabeçalho autenticado do **AvantaPreços** segue o
> mesmo modelo visual e de viewport do PWA Recebimentos. A correção é restrita
> ao PWA de consulta e não altera a gestão web de preços ou conexões.

> Revisão 1.48.0.43.21: no **AvantaPreços**, Mercado Livre e Amazon Brasil são
> fontes obrigatórias da pesquisa. Quando o produto exato estiver disponível,
> o menor preço válido de produto novo de cada marketplace é preservado na base
> da média; as demais posições são completadas pelas ofertas comprovadas mais
> baratas encontradas na web.

> Revisão 1.48.0.43.20: o módulo Marketplaces usa a integração OpenAI já
> configurada no AvantaLab para a pesquisa web de preços do AvantaPreços. O
> cálculo permanece determinístico no servidor e as fontes são armazenadas para
> auditoria; as conexões Mercado Livre continuam responsáveis pela identificação.

> Revisão 1.48.0.43.19: a coleta do **AvantaPreços** usa uma pesquisa curta de
> produto, marca e modelo, sem exigir que as lojas repitam todo o título do
> catálogo para participar das cinco menores ofertas.

> Revisão 1.48.0.43.18: o **AvantaPreços** coleta a vitrine pública atual do
> Google Shopping com até 40 cards no primeiro lote, evitando a amostra curta
> da marcação anterior antes do cálculo das cinco menores ofertas.

> Revisão 1.48.0.43.17: no **AvantaPreços**, as ofertas da vitrine e dos
> vendedores da ficha são reunidas antes da seleção das cinco menores; uma
> oferta isolada e cara não substitui mais os demais preços encontrados.

> Revisão 1.48.0.43.16: no **AvantaPreços**, **Consultar novamente** acompanha
> a mesma coleta do Google Shopping por até três minutos. Preços válidos da
> vitrine são preservados se a ficha detalhada vier vazia; quando a coleta
> termina, a referência, os três cálculos, a data e o histórico são atualizados.

> Revisão 1.48.0.43.15: a mensagem de **Consultar novamente** permanece no
> produto aberto. A consulta agora diferencia ausência de oferta de falha do
> provedor, limite, validação ou indisponibilidade temporária.

> Revisão 1.48.0.43.14: a estabilização visual de Atualizar Produtos pertence
> ao AvantaVendas e não altera os fluxos da Gestão Web.

> Revisão 1.48.0.43.13: o ajuste visual de Atualizar Produtos pertence ao
> AvantaVendas e não altera os fluxos da Gestão Web.

> Revisão 1.48.0.43.12: o alinhamento das ações de Produtos e Pedidos pertence
> ao AvantaVendas e não altera os fluxos da Gestão Web.

> Revisão 1.48.0.43.11: o ajuste de posição e atualização visível da tela
> **Produtos** pertence ao AvantaVendas e não altera os fluxos da Gestão Web.

> Revisão 1.48.0.43.10: no **AvantaPreços**, **Consultar novamente** em um
> item do histórico consulta apenas o Google Shopping com o produto já salvo —
> não busca a ficha de novo no Mercado Livre. Tarefa concluída sem oferta
> encerra com aviso; a espera tem limite e nunca fica calculando sem fim.

> Revisão 1.48.0.43.09: o retorno visível de Atualizar Produtos pertence ao
> AvantaVendas e não altera os fluxos da Gestão Web.

> Revisão 1.48.0.43.08: o refinamento visual de Atualizar Produtos pertence ao
> AvantaVendas e não altera os fluxos da Gestão Web.

> Revisão 1.48.0.43.07: o filtro de Produtos ativos pertence ao AvantaVendas e
> não altera os fluxos da Gestão Web.

> Revisão 1.48.0.43.06: o botão Atualizar Produtos pertence ao AvantaVendas e
> não altera os fluxos da Gestão Web.

> Revisão 1.48.0.43.05: a deduplicação de produtos de catálogo pertence ao
> AvantaVendas e preserva seu histórico; sem impacto operacional na Gestão Web.

> Revisão 1.48.0.43.04: ao abrir o lápis de um anúncio, as ações aplicáveis
> aparecem junto da edição: **Pausar**, **Reativar**, **Encerrar** ou **Excluir
> definitivamente** após o encerramento. Elas sempre pedem confirmação e ficam
> indisponíveis enquanto houver alteração de campos não salva.

> Revisão 1.48.0.43.03: ao usar **Conectar outra conta**, a tela orienta sair
> da conta atual do marketplace no navegador ou usar janela anônima antes de
> autorizar a próxima, sem desconectar as contas já vinculadas ao AvantaLab.

> Revisão 1.48.0.43.02: quando já houver conta de um marketplace vinculada, o
> botão passa a ser **Conectar outra conta**. Essa ação preserva as conexões
> existentes; a pessoa só precisa autorizar a segunda conta na página oficial
> do marketplace.

> Revisão 1.48.0.43.01: o limite responsivo do **Histórico do cliente**
> pertence ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.48.0.43: o envio em **Dúvidas e Sugestões** é confirmado pela
> gravação da mensagem, sem depender da leitura de retorno. Em falhas reais, o
> formulário preserva o conteúdo e orienta uma nova tentativa.

> Revisão 1.48.0.42: ao abrir um módulo pelo Dashboard ou voltar pelo botão
> **Início**, a navegação reutiliza a sessão e o perfil já validados e não exibe
> uma nova tela de validação. Acesso direto e recarga completa continuam
> verificando a sessão normalmente.

> Revisão 1.48.0.41: em **Anúncios em marketplaces**, as contas conectadas
> são carregadas novamente ao abrir o perfil e uma nova conta é conectada em
> janela própria, sem reiniciar o módulo. Ao editar, o tipo de anúncio mostra
> as opções liberadas pelo Mercado Livre e a taxa correspondente é recalculada
> após mudar preço ou tipo.

> Revisão 1.48.0.40: o botão **Consultar novamente** do **AvantaPreços**
> informa claramente o cálculo em andamento, com ícone circular animado e o
> texto **Calculando, aguarde…**.

> Revisão 1.48.0.39: no **AvantaPreços**, SKU com e sem pontuação representam
> o mesmo produto na pesquisa Google Shopping — como `69065/011` e `69065011`.
> A coleta de vendedores da ficha selecionada não exige que o título resumido
> repita integralmente o título confirmado do catálogo Mercado Livre.

> Revisão 1.48.0.38: a referência automática do **AvantaPreços** vem dos
> vendedores da ficha identificada no Google Shopping. A média usa as até cinco
> menores ofertas ativas em reais e desconsidera preço de lista, frete e item
> indisponível.

> Revisão 1.48.0.37: no **AvantaPreços**, o preço de referência usa a média de
> até cinco menores ofertas comparáveis, evitando que anúncios muito acima do
> mercado distorçam o cálculo. Registros já salvos são atualizados com a regra
> nova ao usar **Consultar novamente**.

> Revisão 1.48.0.36: a organização inicial do PWA **AvantaPreços** prioriza a
> consulta manual, mantém o leitor de EAN mais compacto e coloca o acesso à
> base de produtos precificados antes das últimas consultas.

> Revisão 1.48.0.35: em **Custos e Precificação > Catálogos**, cada card
> separa os destinos **Vendas e Serviços** e **AvantaVendas**, ambos com ações
> próprias de **Ativar** e **Desativar**. Um estado nunca altera o outro. Use o
> primeiro para a operação interna da empresa e o segundo somente para os itens
> que podem ser visualizados e utilizados pelos usuários do AvantaVendas.

> Revisão 1.48.0.34: no **AvantaPreços**, um EAN que já possui cálculo salvo
> abre a referência da empresa sem repetir a consulta. A tela inicial mostra
> somente as 20 últimas consultas; **Produtos precificados** abre a base
> completa com busca e ordem alfabética padrão ou por data. Ao abrir um item,
> é possível ajustar o preço médio e recalcular 50%, 70% e 90%, ou consultar
> novamente somente as ofertas de preço, sem pesquisar o Mercado Livre outra vez.
> Produto sem catálogo pode ser salvo como cálculo manual com nome e referência.

> Revisão 1.48.0.33: se a coleta de preços do **AvantaPreços** permanecer na
> fila, o PWA acompanha automaticamente a mesma tarefa até finalizar. Não peça
> para a pessoa tentar de novo; uma nova consulta só é necessária se ela quiser
> pesquisar outro produto.

> Revisão 1.48.0.32: o **AvantaPreços** identifica o EAN no Mercado Livre e
> usa o título confirmado da ficha para pesquisar preços no Google Shopping.
> Isso evita que uma busca pelo código isolado retorne produtos não relacionados.

> Revisão 1.48.0.31: tolerância a rede lenta foi ajustada somente no
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.48.0.31: o **AvantaPreços** acompanha uma consulta de preços por
> até 45 segundos na mesma tarefa antes de indicar demora. Isso cobre a coleta
> assíncrona normal do provedor e não abre outra consulta durante a espera.

> Revisão 1.48.0.30: quando o provedor de preços informa que a consulta ainda
> está na fila, o **AvantaPreços** aguarda a mesma tarefa e tenta novamente.
> Esse estado transitório não é mais apresentado como recusa de acesso.

> Revisão 1.48.0.29: o **AvantaPreços** aciona a permissão nativa de câmera
> diretamente no toque em **Ler EAN**, sem botão ou autorização intermediária
> do PWA. Depois que o aparelho preserva a permissão, o leitor abre direto.

> Revisão 1.48.0.29: em **Custos e Precificação > Catálogos**, ativar um
> catálogo o mantém disponível apenas no Vendas interno. Para disponibilizá-lo
> a contas vinculadas do AvantaVendas, use explicitamente **Publicar no
> AvantaVendas**; retirar essa publicação não desativa o catálogo interno.

> Revisão 1.48.0.28: o **AvantaPreços** identifica o produto com a conexão
> Mercado Livre ou o catálogo do perfil e calcula sugestões usando ofertas em
> reais do Google Shopping pela integração DataForSEO no servidor. A Gestão Web
> não recebe credenciais nem expõe a consulta externa; a ativação produtiva é
> controlada pelo ambiente para evitar consumo involuntário de créditos.

> Revisão 1.48.0.27: o leitor do **AvantaPreços** verifica a permissão de
> câmera já existente. A câmera abre direto quando o navegador a mantém
> concedida; autorização pendente pede toque explícito e bloqueio mantém a
> digitação manual, sem novas tentativas automáticas.

> Revisão 1.48.0.26: o **AvantaPreços** passa a usar busca pública assistida e
> preço informado pela pessoa, sem leitura automatizada de vitrines de terceiros.
> O histórico identifica essa origem e as sugestões mantêm os percentuais 50/70/90.
>
> Revisão 1.48.0.25: sem uma amostra pública comparável, o **AvantaPreços**
> usa a faixa da oferta vencedora da ficha do Mercado Livre como referência e
> rotula o resultado de forma distinta da média.

> Revisão 1.48.0.24: resultados públicos de preço são associados pelo título
> do anúncio visível na vitrine, com normalização de texto; diferença de ID de
> catálogo não impede mais uma referência válida.

> Revisão 1.48.0.23: a busca de preço do **AvantaPreços** usa o token já
> conectado somente para autorizar a consulta de itens públicos; a amostra não
> é formada pelos anúncios da própria conta.

> Revisão 1.48.0.22: o **AvantaPreços** consulta primeiro a busca pública de
> consumidor do Mercado Livre pelo EAN e usa os anúncios ativos retornados na
> amostra. A vitrine não precisa exibir o GTIN no card para a oferta entrar.

> Revisão 1.48.0.21: o **AvantaPreços** também encontra anúncios normais pelo
> EAN e confere o GTIN no detalhe antes de calcular a média. Anúncios apenas
> parecidos não entram na referência.

> Revisão 1.48.0.20: o **AvantaPreços** calcula a média com o preço público
> dos anúncios ativos equivalentes. Sem amostra, usa o preço público do anúncio
> vencedor da buy box; sem ofertas comparáveis, informa indisponibilidade sem
> atribuir o caso a uma desconexão da conta.

> Revisão 1.48.0.19: a correção de vínculo comercial no AvantaVendas pertence
> ao perfil de vendas e não altera os fluxos da Gestão Web.

> Revisão 1.48.0.18: no card **Novo anúncio**, o EAN/GTIN tem `×` para limpar
> o código sem remover o leitor. As contas conectadas ficam no rodapé do card
> **Marketplace**, onde podem ser selecionadas ou desconectadas com confirmação;
> a área **Anunciados** não repete mais esse controle.

> Revisão 1.48.0.17: o **AvantaPreços** não falha quando somente a cotação
> detalhada `sale_price` é negada (`403`) e a ficha já fornece preço público da
> buy box ou faixa: calcula a estimativa e a identifica no resultado. Sem essa
> referência, o `403` permanece visível; `429` continua sendo limite explícito.

> Revisão 1.48.0.16: a consulta do **AvantaPreços** usa o preço efetivo do
> item vencedor da buy box quando não há amostra ativa comparável. Permissão
> negada e limite de consultas do Mercado Livre são exibidos sem disfarçar o
> motivo da falha.

> Revisão 1.48.0.15: os logotipos dos cabeçalhos usam altura contida com folga
> superior e inferior e largura proporcional. Nenhuma parte da marca pode ser
> ocultada pela área do cabeçalho.

> Revisão 1.48.0.14: os cabeçalhos compartilhados dos módulos ajustam
> automaticamente a área útil do logotipo da empresa. Margens vazias do arquivo
> deixam de reduzir a marca visual, que permanece contida entre as ações do topo.

> Revisão 1.48.0.13: no cabeçalho de **Anúncios em marketplaces**, **Copiar
> link do AvantaPreços** copia o endereço completo do PWA para envio ao usuário
> no celular. A ação confirma **Link copiado** e não abre outra página.

> Revisão 1.48.0.12: auditoria técnica corrigiu erros bloqueantes de qualidade
> em componentes e integrações compartilhadas, sem alterar a operação orientada
> pela Ava na Gestão Web.

> Revisão 1.48.0.11: ao abrir **Anúncios em marketplaces**, a validação de
> acesso usa a cena oficial compartilhada, com fundo institucional e card
> **Validando acesso**. A interface só é exibida depois de confirmar sessão,
> perfil, instalação do módulo e permissão; falhas mostram uma mensagem segura.

> Revisão 1.48.0.10: **Anúncios em marketplaces** abre dentro da Gestão pela
> rota oficial `/marketplaces`; o contexto curto da navegação não transporta
> logotipos em base64, evitando o bloqueio do quadro interno pelo navegador.

> Revisão 1.48.0.09: a uniformização do topo autenticado pertence ao PWA
> **AvantaPreços** no iPhone; a Gestão Web não é alterada.

> Revisão 1.48.0.08: a correção da extensão do fundo no modo standalone
> pertence ao PWA **AvantaPreços**; a Gestão Web não é alterada.

> Revisão 1.48.0.07: o ajuste de ancoragem do fundo pertence ao acesso do PWA
> **AvantaPreços**; a Gestão Web não é alterada.

> Revisão 1.48.0.06: a cobertura das áreas seguras e a posição do cabeçalho
> foram corrigidas no PWA **AvantaPreços**; a Gestão Web não é alterada.

> Revisão 1.48.0.05: a correção de viewport, fundo e cabeçalho pertence ao
> PWA **AvantaPreços** e replica a implementação do Recebimentos; a Gestão Web
> não é alterada.

> Revisão 1.48.0.04: a nova composição do login e a correção do botão de
> atualização pertencem ao PWA **AvantaPreços**; não alteram a Gestão Web.

> Revisão 1.48.0.03: em **Anúncios em marketplaces**, Pesquisar consulta
> primeiro o catálogo do Mercado Livre e, se não houver ficha, os produtos
> ativos cadastrados no perfil da própria empresa. Não há consulta externa
> GS1/GTIN nem credenciais adicionais nesta versão.

> Revisão 1.48.0.02: o PWA **AvantaPreços** iguala o viewport ao Recebimentos
> e aplica o fundo oficial à raiz visual do iOS, sem faixa branca nas áreas de
> sistema superior ou inferior; a Gestão Web não é alterada.

> Revisão 1.48.0.01: a correção do fundo e da área segura pertence às telas de
> acesso do AvantaPreços; não altera a operação da Gestão Web.

> Revisão 1.47.0.07: a uniformização da barra de status pertence ao PWA
> **AvantaPreços** no iPhone; não altera a Gestão Web.

> Revisão 1.47.0.06: o ajuste de limpeza ao iniciar uma nova leitura pertence
> ao PWA **AvantaPreços**; não altera a operação da Gestão Web.

> Revisão 1.47.0.05: a engrenagem de **Anúncios em marketplaces** gerencia
> usuários exclusivos do **AvantaPreços**. O gestor cria nome, login e senha,
> pode editar ou excluir o acesso, sem liberar os demais módulos da empresa.

> Revisão 1.47.0.04: o atalho abre o **AvantaPreços** sem antecipar a empresa.
> Quando o usuário possui vários perfis, escolhe um após o login; a troca exige
> sair do PWA e autenticar novamente.

> Revisão 1.47.0.03: o Marketplaces Mobile recebeu ícone próprio; sem mudança
> no acesso, na consulta ou na conexão reutilizada do Mercado Livre.

> Revisão 1.47.0.02: o PWA passa a se chamar **Marketplaces Mobile** e usa a
> rota genérica `/marketplaces/consulta`, preservando o atalho de consulta.

> Revisão 1.47.0.01: **Anúncios em marketplaces** oferece **Abrir consulta de
> preços**, que inicia o PWA Marketplaces Mobile. Ele reutiliza a empresa e uma conta Mercado
> Livre já conectada; com várias contas, permite escolher a usada na consulta.
> Não há novo OAuth. O EAN pode ser lido pela câmera ou digitado, e a pesquisa
> textual apresenta fichas para seleção. O resultado calcula mínimo, médio de
> venda e ideal como 50%, 70% e 90% da média encontrada. O histórico pertence
> somente à empresa ativa e **Consultar novamente** atualiza o preço.

> Revisão 1.46.0.06: ao escolher a categoria no card **Novo anúncio**, a ficha
> localizada permanece visível mesmo se o Mercado Livre negar uma consulta
> complementar de envio. Pendências bloqueantes e avisos aparecem separadamente.
> O formulário valida categoria, preço, estoque, tipo de anúncio, envio,
> condição, garantia, atributos e descrição; **Publicar** executa primeiro a
> validação oficial do Mercado Livre e só cria o anúncio após a confirmação.
> Uma negação de recurso não significa que a conta foi desconectada.

> Revisão 1.46.0.05: a ação do card **Novo anúncio** se chama
> **Pesquisar**. Ela consulta o produto pelo EAN e exibe os dados encontrados
> para complemento e revisão; não publica o anúncio. O campo EAN permanece
> largo no desktop mesmo com o botão do leitor integrado.

> Revisão 1.46.0.04: no card **Novo anúncio**, o botão com código de barras no
> campo EAN ativa a captura de um leitor USB/Bluetooth que opere como teclado.
> Escaneie o produto; o Enter enviado pelo leitor executa **Pesquisar**.
> Escape ou um novo clique no botão encerra o modo leitor.

> Revisão 1.46.0.03: todas as listas de Marketplaces abrem imediatamente abaixo
> do respectivo campo. O padrão vale para conta, produto, categoria, tipo de
> anúncio, envio, condição, garantia, atributos e situação.

> Revisão 1.46.0.02: em Marketplaces, selecione a conta no card Novo anúncio,
> informe o EAN e use Pesquisar. A ficha do catálogo aparece no mesmo
> card, com os campos complementares e preço antes de Publicar. A conta escolhida
> é compartilhada com Anunciados; com várias contas, a seleção é obrigatória.
> Pesquisar apenas consulta: não cria anúncio.

> Revisão 1.45.0.03: no anúncio User Products individual, sem vendas e com
> vínculo confirmado pela API, o campo **Nome base do título** pode ser editado
> na própria linha. O Mercado Livre gera o título visível a partir desse nome.
> Se o produto tiver outros anúncios vinculados, vendas, catálogo ou consulta
> inconclusiva, o campo fica somente leitura; o tooltip informa o motivo.
> Vínculo compartilhado pode ser revisto no Mercado Livre, mas vendas podem
> impedir a alteração também na própria plataforma. Nenhum anúncio real foi
> alterado nesta revisão.

> Revisão 1.45.0.02: corrigidas as permissões de edição de anúncios do Mercado
> Livre. Em User Products fora do catálogo, descrição pode ser alterada. O
> estoque só é editável após confirmar endereço único, sem Full, depósitos ou
> kit virtual; a mudança pode refletir em outros anúncios do mesmo produto.
> O título de User Products é gerado a partir do nome da família e segue
> somente leitura, pois mudar a família pode afetar outros anúncios.

> Revisão 1.45.0.01: em **Anunciados**, o lápis abre título, preço, estoque e
> descrição na própria linha, antes do EAN. O editor consulta permissões e
> dados atuais do Mercado Livre; apenas campos liberados podem ser alterados.
> Salvar envia só mudanças válidas e confirma o resultado. Cancelar descarta
> uma edição não salva mediante confirmação. Se a consulta falhar, título,
> preço e estoque da última sincronização continuam visíveis, mas bloqueados;
> descrição fica indisponível e não é possível salvar. Recarregar edição após
> restabelecer a consulta. Migração de auditoria de edição necessária para
> salvamentos; não afirmar edição real concluída sem confirmação do provedor.

> Revisão 1.44.0.56: a lista **Anunciados** foi ativada no ambiente AvantaLab
> após aplicação da migração. Selecione a conta, pesquise e filtre a situação;
> **Atualizar** consulta o Mercado Livre. A consulta automática roda a cada
> minuto com a página visível, não em segundo plano com o módulo fechado.
> **Editar** abre detalhes e ações permitidas pelo perfil/situação, sempre
> com confirmação antes de alterar. Encerrar é definitivo; Excluir exige
> anúncio encerrado. Indisponível não significa custo zero; taxa/frete são
> estimativas. Validar e preparar não publica por EAN. A Ava só confirma
> sincronização quando a tela indicar sua conclusão, não pelo status Conectada.

> Histórico da revisão 1.44.0.55: Marketplaces usa cabeçalho com Início e marca do perfil,
> cards alinhados e interface enxuta. Anunciados possui conta, busca e situação;
> sua ativação depende da migração de gestão. Enquanto pendente, a consulta
> informa indisponibilidade. Não afirmar que dados foram sincronizados ou que
> anúncios foram publicados. Validar e preparar ainda só valida EAN e valor.
> As alterações de catálogos, importação e Vendas permanecem preservadas.

> Revisão 1.44.0.53: o modelo Excel de **Custos e Precificação > Catálogos >
> Novo catálogo** ganhou identidade visual AvantaLab. A aba **Produtos**, os
> 25 cabeçalhos e as regras de importação permanecem iguais; sem mudança no
> procedimento orientado pela Ava.

> Revisão 1.44.0.52: os botões de baixar modelo e importar produtos no card de
> novo catálogo foram padronizados visualmente; sem alteração operacional na
> orientação da Ava.

> Revisão 1.44.0.51: na planilha de **Novo catálogo**, só **Nome** é
> obrigatório. As demais colunas ou células podem ficar vazias. Se **Código
> interno** faltar, o banco gera uma sequência exclusiva do catálogo sem
> repetir códigos do perfil. A prévia mostra quantos códigos serão gerados.
> Produto sem preço positivo não é disponibilizado no Vendas; sem NCM ou
> unidade tributável não é habilitado para uso fiscal. Complete os campos
> depois em **Produtos e serviços**. Salvar sem composição mantém o custo
> importado.

> Revisão 1.44.0.50: em **Custos e Precificação > Catálogos > Novo
> catálogo**, baixe o modelo Excel, preencha a aba **Produtos** sem alterar os
> cabeçalhos e importe o arquivo. A prévia mostra quantos itens foram validados
> e eventuais erros por linha. Só **Criar com produtos** grava o catálogo e os
> itens juntos; insumos/composições não são importados. Fornecedor deve usar o
> código de um cadastro ativo do mesmo perfil empresarial. As colunas de
> situação aceitam **Sim** ou **Não**; a prévia mostra quantos produtos entrarão
> no Vendas.

> Revisão 1.44.0.49: a tabela de **Produtos e serviços** mantém a mesma grade
> de colunas e altura de linhas em todos os catálogos; textos longos podem
> aparecer abreviados na célula, com conteúdo completo ao passar o cursor.
> Sem mudança no cadastro ou no filtro.

> Revisão 1.44.0.48: o filtro de **Produtos e serviços** oferece **Todos os
> catálogos** e somente catálogos ativos, exibidos apenas pelo nome. Se um
> catálogo escolhido for desativado, o filtro retorna a **Todos os catálogos**
> e limpa a seleção em lote; cadastros não são apagados.

> Revisão 1.44.0.47: em **Custos e Precificação > Produtos e serviços**, o
> seletor da lista inicia em **Todos os catálogos** e filtra itens e contagens
> pelo catálogo escolhido. Ele não define o vínculo de novos cadastros: no
> formulário, escolha o catálogo no campo **Catálogo**. Trocar o filtro limpa
> a seleção em lote anterior.

> Revisão 1.44.0.46: o título de composição na visão geral de Custos e
> Precificação ganhou pontuação para separar rótulo e nome do produto; sem
> impacto operacional na orientação da Ava.

> Revisão 1.44.0.45: em **Custos e Precificação** e **Vendas e Serviços**,
> ações rotineiras concluídas aparecem no estado da tela, sem avisos extras de
> sucesso. A Ava deve orientar pelo resultado visível e continuar explicando
> falhas, validações e operações fiscais ou financeiras que exigem atenção.

> Revisão 1.44.0.44: em **Custos e Precificação > Catálogos** e em **Conteúdo
> AvantaVendas > Gerenciar catálogos**, **Ativar** e **Desativar** são ações
> diretas, sem confirmação ou aviso de sucesso. O estado atualizado aparece
> no próprio card; falhas continuam sendo informadas.

> Revisão 1.44.0.43: em **Custos e Precificação > Catálogos** e **Conteúdo
> AvantaVendas > Produtos > Gerenciar catálogos**, todos os catálogos com borda
> verde e selo **Ativo no Vendas** abastecem o Vendas ao mesmo tempo. **Ativar**
> acrescenta o catálogo sem desativar os outros; **Desativar** retira somente
> o escolhido. Sem nenhum ativo, o cadastro de novos produtos em Conteúdo
> AvantaVendas fica indisponível até uma ativação. Os dados são preservados.

> Revisão 1.44.0.42: em **Anúncios em marketplaces**, Gestor Master ou
> Administrador usa **Conectar conta** para entrar na página oficial do Mercado
> Livre. A senha nunca é informada à Ava; após autorizar, o sistema retorna ao
> módulo e confirma ou explica a falha da conexão.

> Revisão 1.44.0.41: o módulo **Anúncios em marketplaces** está em estruturação
> para a Gestão Web. Ele pedirá EAN/GTIN e valor, validará as exigências do
> marketplace e só enviará uma publicação após confirmação. A conexão é feita
> na página oficial do marketplace; a Ava nunca pede senha da conta.

> Revisão 1.44.0.40: a entrega do arquivo por compartilhamento nativo pertence
> à Gestão Mobile; a exportação da Gestão Web continua usando o download do
> navegador, sem alteração operacional.

> Revisão 1.44.0.39: em **Custos e Precificação > Produtos e serviços**, o
> seletor ao lado de **Produtos/Serviços** define o catálogo de novos
> cadastros; por padrão, ele usa o catálogo de referência para novos itens. No editor, o
> campo **Catálogo** também permite alterar o destino de um item. Para muitos
> itens, selecione-os na lista, escolha **Mover para catálogo**, informe o
> destino e confirme. A movimentação preserva cadastro, preços, imagens,
> estoque, composição e histórico; se um código já existir no destino, ajuste
> o código antes de mover.

> Revisão 1.44.0.38: a ampliação do seletor de ordem de Pedidos pertence ao
> AvantaVendas; não altera a Gestão Web.

> Revisão 1.44.0.37: o posicionamento e fechamento do seletor de ordem de
> Pedidos pertencem ao AvantaVendas; não alteram a Gestão Web.

> Revisão 1.44.0.36: o refinamento do seletor de ordem de Pedidos pertence ao
> AvantaVendas; não altera a Gestão Web.

> Revisão 1.44.0.35: o posicionamento da contagem de Pedidos pertence ao
> AvantaVendas; não altera a Gestão Web.

> Revisão 1.44.0.34: a ordenação permanente de Pedidos pertence ao
> AvantaVendas; não altera os pedidos ou relatórios da Gestão Web.

> Revisão 1.44.0.33: ao salvar cliente ou fornecedor em **Vendas e Serviços**,
> a Gestão confirma o acesso do perfil pela conexão fiscal configurada. Se
> ocorrer uma falha, o aviso fica no formulário e os dados permanecem
> disponíveis para nova tentativa; ao concluir, a confirmação aparece depois
> de fechar o cadastro.

> Revisão 1.44.0.32: os campos de e-mail dos cadastros passam a converter
> letras em minúsculas durante a digitação, incluindo clientes, fornecedores,
> empresa, usuários, perfis e cobranças.

> Revisão 1.44.0.31: em cliente Pessoa física ou jurídica de **Vendas e
> Serviços**, Nome completo/Razão social, Nome fantasia e Contato principal
> ajustam a capitalização durante a digitação. Conectivos como “de”, “da” e
> “dos” ficam minúsculos; LTDA e S/A permanecem em maiúsculas.

> Revisão 1.44.0.30: a lista de **Tipo de pessoa** no cadastro de cliente em
> **Vendas e Serviços** abre abaixo do campo e se fecha ao escolher uma opção,
> clicar fora ou pressionar Esc.

> Revisão 1.44.0.29: para cliente Pessoa física em **Vendas e Serviços**,
> Telefone e E-mail compartilham a linha em tela ampla e permanecem em coluna
> no celular.

> Revisão 1.44.0.28: no cadastro de cliente Pessoa jurídica em **Vendas e
> Serviços**, Consumidor final, Inscrição estadual e Inscrição municipal ficam
> na mesma linha em tela ampla; no celular seguem empilhados para leitura.

> Revisão 1.44.0.27: em **Vendas e Serviços > Clientes**, Bairro, Cidade e UF
> compartilham a linha, com UF compacta. Pessoa física usa o próprio nome como
> contato; Nome fantasia de empresa é opcional. A orientação para localizar o
> município fiscal aparece somente quando ainda houver pendência.

> Revisão 1.44.0.26: para CPF, o campo Consumidor final não repete ajuda
> redundante; o usuário apenas confirma Sim ou Não.

> Revisão 1.44.0.25: para cliente Pessoa física, Nome completo e Consumidor
> final compartilham a mesma linha em telas amplas. O seletor Sim/Não é compacto
> e no mobile os campos permanecem em uma coluna.

> Revisão 1.44.0.24: no cadastro de cliente em **Vendas e Serviços**, escolha
> primeiro Pessoa física ou Pessoa jurídica e depois informe CPF ou CNPJ. CPF
> não usa situação de inscrição estadual, inscrição estadual ou municipal.

> Revisão 1.44.0.23: as ações em lote de **Produtos e serviços** usam os
> rótulos **Adicionar ao catálogo**, **Retirar do catálogo**, **Ativar
> cadastro** e **Inativar cadastro**. Quando uma opção já está aplicada a todos
> os selecionados, ela fica indisponível sem acrescentar texto ao rótulo.

> Revisão 1.44.0.22: a barra de ações em lote de **Custos e Precificação >
> Produtos e serviços** separa visualmente contagem, explicação e seletor. A
> quantidade aparece acima de “item selecionado” ou “itens selecionados”; sem
> mudança operacional nas ações.

> Revisão 1.44.0.21: a explicação da ação em lote aparece à esquerda do seletor
> em **Custos e Precificação > Produtos e serviços**, mantendo a barra em uma
> linha no desktop; sem mudança na função de cada ação.

> Revisão 1.44.0.20: em **Custos e Precificação > Produtos e serviços**, a
> coluna **Situação** informa Ativo ou Inativo e a coluna **Catálogo local**
> informa No catálogo ou Fora do catálogo. Ao selecionar itens, escolha a ação
> em lote, leia sua explicação e use **Confirmar**. Uma ação fica indisponível
> quando todos os itens selecionados já estão naquele estado; em seleção mista,
> ela continua disponível para ajustar somente os que precisam.

> Revisão 1.44.0.19: ordenação e pílula de recolhimento pertencem à Gestão
> Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.44.0.18: a prévia pública do link do AvantaVendas foi atualizada;
> sem impacto operacional na Gestão Web.

> Revisão 1.44.0.17: a verificação de cadastro passou a usar a mesma
> autorização oficial dos recursos da Gestão. Não há mudança nos perfis ou nas
> permissões exibidas ao usuário.

> Revisão 1.44.0.16: a proteção de abertura da versão Android do AvantaVendas
> não altera fluxos da Gestão Web.

> Revisão 1.44.0.15: troca de perfil e data de pedido consignado pertencem ao
> AvantaVendas, sem impacto operacional na Gestão Web.

> Revisão 1.44.0.14: ajuste de **Lembrar-me** pertence ao AvantaVendas, sem
> impacto operacional na Gestão Web.

> Revisão 1.44.0.13: abertura e percentual do AvantaVendas foram otimizados;
> sem impacto operacional na Gestão Web.

> Revisão 1.44.0.12: relatório anual pertence ao Dashboard do AvantaVendas;
> sem impacto operacional na Gestão Web.

> Revisão 1.44.0.11: o controle visual de expandir/recolher ficou menor, mas
> mantém área de clique ampliada; sem mudança operacional.

> Revisão 1.44.0.10: o controle compacto de expandir/recolher usa a cor do
> perfil no tema claro e contraste invertido no tema escuro; sem mudança operacional.

> Revisão 1.44.0.09: o controle do rodapé mantém a mesma cor de texto no hover,
> cresce suavemente ao passar o mouse e reduz no clique; sem mudança operacional.

> Revisão 1.44.0.08: o controle de expandir/recolher do rodapé ficou menor e
> abaixo do atalho de avançar a lista; sem mudança operacional.

> Revisão 1.44.0.07: o rodapé de expandir/recolher listas de receitas e
> despesas ficou mais compacto; sem mudança operacional.

> Revisão 1.44.0.06: na Gestão Web, o relatório é acessado somente em
> **Menu > Configurações > Exportar relatório**. Não há atalho visível na barra
> do mês.

> Revisão 1.44.0.05: além do atalho ao lado de **Despesas fixas**, use
> **Menu > Exportar relatório** para abrir a mesma configuração de período,
> tipos de lançamento e formato **Planilha XLS** ou **PDF**.

> Revisão 1.44.0.04: alinhamento de Mês e Ano pertence ao card móvel da
> exportação; sem impacto operacional na Gestão Web.

> Revisão 1.44.0.03: em **Exportar mês**, **Mês** e **Ano** ficam separados e
> exibem somente períodos que possuem lançamentos no contexto financeiro aberto.

> Revisão 1.44.0.02: em **Exportar mês**, escolha o mês e os grupos
> **Despesas**, **Receitas** e/ou **Previstos** antes de gerar **Planilha XLS**
> ou **PDF**. Despesas e receitas representam lançamentos realizados; previstos
> reúne receitas e despesas ainda previstas.

> Revisão 1.44.0.01: ajuste exclusivo da abertura do menu na Gestão Mobile,
> sem impacto operacional na Gestão Web.

> Revisão 1.44.0: com uma competência aberta, use **Exportar mês** ao lado de
> **Despesas fixas**. Escolha **Planilha XLS** para editar a relação ou **PDF**
> para compartilhar/imprimir. O arquivo inclui receitas, despesas e previsões
> do mês selecionado, com data, situação, natureza e resumo financeiro.

> Revisão 1.43.0.05: ao abrir **Editar produto** em **Conteúdo AvantaVendas
> > Produtos**, o formulário passa a usar toda a altura útil do modal. Os
> controles gerais ficam recolhidos e, em telas médias, a lista sai
> temporariamente de cena para não criar rolagem no editor. **Salvar produto**
> ou **Cancelar** devolve a lista completa.

> Revisão 1.43.0.04: ao editar um produto em **Conteúdo AvantaVendas >
> Produtos**, o editor cabe na altura do modal. Se necessário, somente o
> formulário e a lista rolam internamente; a página não é deslocada.

> Revisão 1.43.0.03: em **Conteúdo AvantaVendas > Produtos**, **Gerar ZIP**
> pede a escolha do catálogo quando houver mais de um ativo. A exportação não
> altera os catálogos ativos no Vendas; o pacote identifica a sua origem.

> Revisão 1.43.0.02: a barra de ações de **Conteúdo AvantaVendas > Produtos**
> foi compactada e padronizada. Não há mudança no fluxo de criar, gerir ou
> publicar catálogos.

> Revisão 1.43.0.01: em **Conteúdo AvantaVendas > Produtos**, use **Novo
> catálogo** para criar um catálogo próprio ou **Gerenciar catálogos** para
> renomear, ativar e desativar. A lista de produtos reúne os catálogos ativos;
> o pacote ZIP exporta somente o catálogo escolhido. A mesma
> gestão permanece acessível em **Custos e Precificação > Catálogos**; fonte
> externa e catálogo de Custos continuam independentes e nada é apagado.

> Revisão 1.43.0: em **Custos e Precificação > Catálogos**, crie catálogos
> independentes, edite seu nome e, quando for próprio, o código interno. Use
> A antiga ação **Tornar atual** foi substituída por **Ativar**: vários
> catálogos ativos podem abastecer o Vendas; desativar um preserva os demais.
> Nenhum item, preço, imagem ou histórico é apagado. O catálogo vindo de
> Custos e a fonte externa continuam identificados e separados.

> Revisão 1.42.0.04: em **Custos e Precificação > Produtos e serviços**, a
> lista pertence ao catálogo local da empresa, separado de eventuais catálogos
> recebidos de fonte externa. Marque um ou mais itens — ou use o controle no
> topo da primeira coluna para selecionar os resultados filtrados — e escolha
> **Adicionar ao catálogo**, retirar, ativar ou inativar. As ações em lote não
> mudam imagem, preço, estoque, fornecedor, composição ou dados fiscais.

> Revisão 1.42.0.03: correção exclusiva do salvamento de despesa prevista na
> Gestão Mobile, sem alteração operacional na Gestão Web.

> Revisão 1.42.0.02: no formulário de Insumos e recursos, **Unidade** e
> **Custo unitário** agora aparecem juntos na mesma linha, sem mudança no
> preenchimento ou no comportamento operacional.

> Revisão 1.42.0.01: selecione o **Fornecedor** no cadastro de um produto ou
> insumo. A mesma lista de fornecedores ativos da empresa é usada nos dois
> locais; por isso, produtos prontos também podem ter fornecedor mesmo sem uma
> composição de custos.

> Revisão 1.42.0: em **Custos e Precificação > Insumos e recursos**, marque
> **Habilitar como item fiscal** para usar um frasco, tampa, rótulo ou outro
> insumo também no estoque e em NF-e, sem criar outro código nem publicá-lo no
> catálogo comercial. Preencha NCM e unidade tributável; origem e código de
> barras são complementares. CFOP e natureza da operação são escolhidos uma vez
> na emissão e se aplicam à nota, não ao cadastro do item.

> Revisão 1.41.0.16: em cada busca com texto, há apenas um `×`: o botão
> clicável de limpar da própria tela. O controle nativo duplicado do navegador
> não é exibido.

> Revisão 1.41.0.15: em **Custos e Precificação**, abra a composição e digite
> o código ou nome para localizar um recurso. A quantidade começa em `1,00`.
> Em **Uso**, escolha **Integral** ou uma fração de `1/2` a `1/48`; por
> exemplo, `1/6` apropria um sexto do custo unitário da embalagem.

> Revisão 1.41.0.14: nas buscas da Gestão Web, você pode digitar com ou sem
> acento — por exemplo, `valvula` localiza `válvula`. Quando houver texto, use
> o `×` no fim do campo para limpar a pesquisa.

> Revisão 1.41.0.13: em **Custos e Precificação**, o campo **Custo unitário**
> de um recurso sem custo usa `0,00` apenas como sugestão visual. Clique no
> campo e digite normalmente; o valor começa pelos centavos.

> Revisão 1.41.0.12: a galeria da landing pública mantém somente as quatro
> capturas verticais oficiais do aplicativo. A arte horizontal da App Store
> não é apresentada como tela. Isso não altera nenhuma função da Gestão Web.

> Revisão 1.41.0.11: a galeria da landing pública da Gestão agora mostra todas
> as imagens usadas na App Store, preserva o topo de cada peça e acompanha o
> arraste com transição mais suave. Isso não altera nenhuma função dentro da
> Gestão Web.

> Revisão 1.41.0.10: a landing pública da Gestão ganhou uma galeria de telas
> do aplicativo. Arraste para os lados, use as setas ou as teclas direcionais
> para alternar as imagens. Isso não altera nenhuma função dentro da Gestão
> Web.

> Revisão 1.41.0.09: quando você está lançando uma **Despesa**, o card de
> **Receitas** mostra somente o cabeçalho, e vice-versa. Clique no cabeçalho
> para alternar o card ativo e exibir seus campos.

> Revisão 1.41.0.08: em Despesas, **Recolher lista** fica na barra do
> lançamento, entre **Parcelar** e os atalhos de arquivo.

> Revisão 1.41.0.07: ao ampliar a lista, **Recolher lista** aparece alinhado
> dentro da busca; o botão do rodapé continua disponível ao fim da lista.

> Revisão 1.41.0.06: ao editar uma despesa parcelada, a correção de parcela
> atual e total fica em uma faixa própria abaixo dos campos da linha. Salve
> para reorganizar apenas as parcelas seguintes.

> Revisão 1.41.0.05: em uma lista ampliada de **Despesas** ou **Receitas**, a
> linha que você estiver lendo permanece no mesmo ponto ao expandir. Ao usar
> **Recolher lista**, a tela retorna ao início do card.

> Revisão 1.41.0.04: os atalhos **Modelo Excel** e **Carregar arquivo** usam
> o mesmo tooltip do restante da Gestão Web. O fluxo de importação não muda.

> Revisão 1.41.0.03: no editor de uma despesa parcelada, a indicação
> **Parcela atual 2 de 3** permanece em uma única linha; os campos continuam
> permitindo corrigir a posição e a quantidade total normalmente.

> Revisão 1.41.0.02: em listas longas de **Despesas** e **Receitas**, use
> **Expandir lista** no rodapé para exibir todos os lançamentos na própria
> página. **Recolher lista** aparece antes e depois da lista ampliada. O ícone
> no cabeçalho continua abrindo a visualização em pop-up. Nenhum dos dois
> modos cancela o lançamento que estiver sendo editado.

> Revisão 1.41.0.01: ao editar uma **despesa fixa**, use **Manter sempre**.
> A Gestão conserva o mês atual e os três seguintes; quando um mês termina,
> acrescenta automaticamente o próximo. Ao editar uma **despesa parcelada**,
> é possível corrigir a parcela atual e a quantidade total, inclusive em
> sequências mais antigas. Confirme a reorganização para alterar somente a
> parcela aberta e as seguintes; o histórico anterior continua preservado.

> Revisão 1.41.0: no **Business Básico**, entrar no perfil em outro aparelho
> encerra a sessão anterior. No **Business Pro** e **Business Premium**, Web e
> Mobile podem trabalhar juntos; alterações financeiras chegam em tempo real.
> Se alguém salvar o mesmo lançamento antes de você, o sistema não substitui a
> alteração: atualize a lista, confira os dados e salve novamente.

> Revisão 1.40.0: Business Pro inclui 3 empresas e Business Premium inclui 10.
> Depois da franquia, o novo perfil empresarial custa **R$ 14,99 por mês**,
> sempre no ciclo mensal — mesmo que o plano principal seja anual. O sistema
> solicita os dados de cobrança e abre o checkout da Asaas; o perfil só é
> liberado após a confirmação. Business Básico inclui 1 empresa e orienta o
> upgrade para Pro ao atingir o limite.

> Revisão 1.39.0.02: ao cadastrar um tipo de despesa a partir de um
> lançamento, ele entra imediatamente no seletor da tela aberta e já fica
> escolhido; não é necessário fechá-la ou abri-la novamente.

> Revisão 1.39.0.01: a opção de excluir receita no editor pertence à Gestão
> Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.39.0: ao editar uma despesa identificada como parcela, ajuste
> **Parcela atual** e **Total de parcelas** quando necessário. Ao salvar e
> confirmar, a parcela aberta e as próximas são reorganizadas a partir da data
> informada; as parcelas anteriores não são alteradas.

> Revisão 1.38.0.24: o botão **Início** dos módulos tem a mesma altura
> renderizada em desktop e mobile. Não há alteração no fluxo de retorno.

> Revisão 1.38.0.23: em **Vendas e Serviços**, os textos de leitura usam os
> mesmos tons neutros dos demais módulos. O botão **Início** também segue a
> mesma medida e aparência.

> Revisão 1.38.0.22: o botão **Início** tem a mesma medida e aparência em
> todos os módulos. Ele continua retornando à Gestão Web.

> Revisão 1.38.0.21: os cabeçalhos de **Custos e Precificação**, **Projetos**,
> **Vendas e Serviços** e **Operações de Campo** usam a logo configurada da
> empresa, inclusive no celular. Sem logo cadastrada, exibem somente o nome da
> empresa; não há mudança nas funções.

> Revisão 1.38.0.20: os módulos usam texto em preto e tons de cinza para
> leitura. A cor de cada empresa continua identificando ações e estados; não
> há mudança no uso das funções.

> Revisão 1.38.0.19: o retorno dos módulos permanece **Início** e usa um
> contorno discreto, sem o antigo botão sólido. A função continua levando de
> volta à Gestão Web.

> Revisão 1.38.0.18: o carregamento de dados usa uma camada clara e discreta
> sobre todo o módulo, inclusive em Operações de Campo; o card é compacto e
> some quando a tela está pronta.

> Revisão 1.38.0.17: ao abrir um módulo pela Gestão Web, sua estrutura aparece
> de imediato e um card central informa apenas o carregamento dos dados. Espere
> esse card fechar antes de usar os controles: ele garante que não haja ações
> sobre uma tela parcial. Ao fechar, o módulo já está pronto para uso.

> Revisão 1.38.0.16: ao abrir **Custos e Precificação**, **Projetos**, **Vendas
> e Serviços** ou **Operações de Campo**, a Gestão Web mantém o Dashboard pronto
> em segundo plano e o módulo começa diretamente em sua própria estrutura. Ao
> usar **Início**, ele fecha de imediato e o Dashboard reaparece com seus dados
> já carregados; a confirmação de sessão, empresa e permissões continua no acesso
> ao módulo.

> Revisão 1.38.0.10: abrir **Custos e Precificação** pelo menu ou voltar por
> **Início** troca a página imediatamente na mesma sessão. A confirmação de
> empresa e permissões continua automática; se o acesso tiver mudado, a Gestão
> informa o bloqueio em vez de mostrar dados indevidos.

> Revisão 1.38.0.09: em **Editar cadastro do perfil > Dados fiscais**, informe
> o regime tributário e os parâmetros padrão da empresa. Em **Produtos e
> serviços**, mercadorias pedem somente **NCM** e **unidade tributável**;
> CFOP e natureza da operação são escolhidos pela regra fiscal durante a
> emissão, conforme operação e destinatário. Revise os parâmetros com o
> responsável fiscal antes de emitir.

> Revisão 1.38.0.08: **Em estudo** significa que o cadastro está ativo, mas
> ainda não está disponível no Catálogo de divulgação. Marque **Disponível no
> catálogo** somente quando ele estiver pronto para aparecer lá. Se o código
> interno já existir, a Gestão avisa e devolve o foco ao campo para correção.

> Revisão 1.38.0.07: no cadastro de Produtos e Serviços, use **Sugerir** ao
> lado de **Código interno** para abrir as sequências já reconhecidas somente
> na empresa atual. A lista prioriza categoria, marca, tipo e o prefixo
> digitado; escolher uma sugestão preenche o campo. Sem sequência existente,
> informe manualmente o primeiro código.

> Revisão 1.38.0.06: ao abrir **Editar cadastro** de qualquer item, a tela do
> editor começa no topo, mesmo que a lista tenha sido rolada para localizá-lo.

> Revisão 1.38.0.05: ao clicar novamente em **Produtos e serviços** no menu
> lateral, a Gestão volta à lista inicial de Produtos. Se estiver editando com
> alterações pendentes, escolha **Salvar e ir à lista** ou **Descartar**;
> fechar o diálogo mantém a edição.

> Revisão 1.38.0.04: a barra flutuante de **Inativar cadastro**, **Cancelar**
> e **Salvar** no editor de Produtos e Serviços permanece elevada após fechar
> confirmações e ocupa menos altura; o fluxo operacional não muda.

> Revisão 1.38.0.03: no cadastro de Produtos e Serviços, use **Salvar** uma
> única vez para gravar cadastro e composição. **Cancelar** volta para a lista;
> se houver mudanças, escolha entre continuar editando ou descartá-las. O mesmo
> aviso aparece antes de trocar de área pelo menu lateral.

> Revisão 1.38.0.02: o menu de ações ao final da linha de um produto fica sobre
> a lista e os filtros. Clique fora, pressione Escape ou role a tela para fechá-lo.

> Revisão 1.38.0.01: em **Custos e Precificação > Produtos e serviços**, a
> abertura padrão é a lista. Use **Produtos** ou **Serviços** no topo e o menu
> de ações no fim de cada linha para abrir **Editar cadastro** ou **Editar
> listas de preços**. Esta última reúne todas as tabelas ativas do mesmo item
> e salva os valores em uma única confirmação. **Novo produto** e **Novo
> serviço** abrem o cadastro detalhado, com a faixa horizontal para consultar
> os itens já existentes.

> Revisão 1.38.0: uma importação administrativa de catálogo em **Custos e
> Precificação** pode consolidar cadastro, preços e estoque de uma base
> legada. Ela cria um backup antes de substituir registros de teste, bloqueia
> catálogos com operação comercial e registra saldo inicial ou correção no
> histórico de estoque. A Ava orienta a conferir a prévia, mas não executa a
> substituição nem confirma os valores sem evidência.

> Revisão 1.37.0.01: depois de autorizar uma conta de nuvem, a Gestão Web
> confirma o resultado e volta ao fluxo de backup. Somente o **Gestor Master**
> conecta ou troca a conta; os demais podem usar a conta já autorizada.

> Revisão 1.37.0: em **Configurações > Backup**, escolha em cada geração se o
> Excel será salvo neste dispositivo, na conta conectada ou nos dois. Em
> **Restauração**, escolha **Arquivo deste dispositivo**, **Conta conectada**
> ou **Ponto de restauração**. Conectar Google Drive ou OneDrive abre a página
> oficial do provedor; a pessoa autoriza a pasta de backups sem informar senha
> ao AvantaLab.

> Revisão 1.36.0.31: o histórico paginado de disparos pertence ao painel
> `/admin`; sem impacto operacional na Gestão Web.

> Revisão 1.36.0.30: os destinos Todos, Usuário e Perfil/Conta pertencem ao
> painel `/admin`; sem impacto operacional na Gestão Web.

> Revisão 1.36.0.29: a seleção de um destinatário para disparos pertence ao
> painel `/admin`; sem impacto operacional na Gestão Web.

> Revisão 1.36.0.28: a correção da preferência e o diagnóstico de entrega de
> notificações pertencem aos aplicativos móveis; sem impacto operacional na
> Gestão Web.

> Revisão 1.36.0.27: a correção da retomada com **Lembrar-me** pertence à
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.36.0.26: a renovação da sessão lembrada pertence à Gestão Mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.36.0.25: a correção de sessão única pertence à Gestão Mobile
> nativa; sem impacto operacional na Gestão Web.

> Revisão 1.36.0.24: o novo convite de notificações pertence aos aplicativos
> móveis; sem impacto operacional na Gestão Web.

> Revisão 1.36.0.23: a recuperação de versão pertence à Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.36.0.22: a recuperação da sessão ao abrir por push pertence à
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.36.0.21: a correção de abertura pelo push pertence à Gestão
> Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.36.0.20: a autorização no primeiro login e a sincronização de push
> pertencem aos aplicativos Gestão Mobile e AvantaVendas; sem mudança
> operacional na Gestão Web.

> Revisão 1.36.0.19: em **/admin > Disparos > Automações**, use **Editar** no
> card desejado para alterar nome, aplicativo, gatilho, data ou intervalo,
> título e mensagem. **Salvar alterações** mantém o histórico e o estado ativo
> ou pausado; **Cancelar** fecha a edição sem modificar o fluxo.

> Revisão 1.36.0.18: em **/admin > Disparos**, escolha **App Gestão** ou
> **AvantaVendas** para um envio imediato. Em **Programar disparo**, informe o
> aplicativo, o gatilho (**data e hora**, **após o cadastro** ou **sem acesso**),
> o intervalo quando aplicável, o título e a mensagem. As automações podem ser
> pausadas, reativadas ou excluídas; os envios aparecem no histórico.

> Revisão 1.36.0.17: ao escolher um perfil na Gestão Web, o card aproveita a
> altura útil da tela com respiro superior e inferior. A rolagem aparece apenas
> na lista quando há perfis demais para o espaço disponível; as ações continuam
> acessíveis ao final do card.

> Revisão 1.36.0.16: a nova paleta verde do comprovante pertence ao
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.36.0.15: a correção da escolha de plano pertence à tela de
> reativação da Gestão Mobile; a Gestão Web já oferecia os três planos Business
> e não teve seu caminho operacional alterado.

> Revisão 1.36.0.14: em **/admin > Perfis**, **Todos** pesquisa em conjunto os
> usuários AvantaLab, os usuários AvantaVendas e os Perfis AvantaLab. Usuários
> e perfis continuam identificados separadamente; um perfil sem acesso ou com
> assinatura cancelada também aparece quando a situação selecionada é Todos.

> Revisão 1.36.0.13: a correção da indisponibilidade do comando por voz
> pertence ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.36.0.12: ao excluir um perfil, o Gestor Master escolhe entre
> **Guardar por 30 dias**, com restauração disponível, e **Excluir agora**.
> A exclusão imediata pede uma segunda confirmação com **EXCLUIR**, apaga dados
> e pontos de restauração do sistema e preserva apenas registros cuja guarda é
> obrigatória. O login AvantaLab não é excluído.

> Revisão 1.36.0.11: a conciliação reconhece a cobrança futura de uma alteração
> agendada sem antecipar o plano ou o ciclo. O caminho operacional não muda.

> Revisão 1.36.0.10: em uma alteração agendada, **Assinatura** continua exibindo
> o valor do plano vigente. O novo valor começa somente na renovação informada.

> Revisão 1.36.0.09: em **Assinatura**, o gestor escolhe Business Básico,
> Business Pro ou Business Premium. Upgrade de nível é imediato; downgrade e
> mudança mensal/anual ficam agendados para o fim do período pago, sem devolução
> proporcional, e podem ser cancelados antes da data. Cancelar renovação mantém
> o acesso até a validade. Ao reduzir a franquia, dados e históricos permanecem;
> perfis excedentes são desvinculados e acessos excedentes ficam inativos.

> Revisão 1.36.0.08: o Controle de Ponto aceita até 10 funcionários ativos no
> Business Básico quando contratado como módulo avulso, até 30 no Business Pro
> e quantidade ilimitada no Premium. Centros de custo só podem ser ativados no
> Pro ou Premium. Ao mudar para o Básico, o recurso e os módulos antes incluídos
> são desativados sem apagar dados; módulos avulsos pagos continuam ativos.

> Revisão 1.36.0.07: em **/admin > Perfis**, **Liberar acesso** exige escolher
> Business Básico, Business Pro ou Business Premium para uma cortesia Empresa;
> perfil Pessoal recebe Pessoal Premium. Limites, Centros de custo e módulos
> seguem o plano escolhido. Básico mantém módulos avulsos; Pro e Premium os
> incluem. Cortesias empresariais antigas sem plano preservam Business Pro.

> Revisão 1.36.0.06: a confirmação do Asaas agora valida perfil, plano e ciclo
> da cobrança antes de liberar o acesso. O caminho operacional de contratação
> permanece o mesmo.

> Revisão 1.36.0.05: o CTA do Business Pro na landing aparece como **Teste por
> 7 dias grátis** e continua levando ao mesmo cadastro.

> Revisão 1.36.0.04: cada card de plano da landing pode ser acionado em toda a
> sua superfície e leva ao mesmo cadastro indicado pelo botão interno.

> Revisão 1.36.0.03: a pílula de destaque do Pessoal Premium acomoda o texto
> integralmente; sem impacto nos caminhos operacionais orientados pela Ava.

> Revisão 1.36.0.02: os cinco cards da landing ficam na mesma linha no desktop;
> sem impacto nos caminhos operacionais orientados pela Ava.

> Revisão 1.36.0.01: a landing pública e a contratação Web exibem Business
> Básico, Business Pro e Business Premium. Básico possui 1 usuário e 1 empresa,
> módulos avulsos e sem Centros de custo; Pro possui até 3 usuários e empresas,
> Ponto para até 30 funcionários e módulos incluídos; Premium possui até 10
> usuários e empresas e funcionários ilimitados no Ponto. O ciclo pode ser
> mensal ou anual, e a liberação continua ocorrendo após confirmação do Asaas.

> Revisão 1.36.0: a base comercial reconhece Business Básico, Business Pro e
> Business Premium, inclusive limites de empresa, usuários, módulos, ponto e
> Centros de custo. A seleção pública do novo plano e a escolha de cortesia no
> Admin serão entregues nas próximas etapas; até lá, oriente somente os
> caminhos que já estiverem visíveis na tela.

> Revisão 1.35.0.19.73: a contenção visual do card Centros de custo pertence à
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.72: a consulta individual por toque no card Centros de
> custo pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.71: a remoção do seletor próprio de mês do card Centros de
> custo pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.70: o ajuste de largura e fonte do seletor de mês do card
> Centros de custo pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.69: o refinamento da largura do seletor de mês do card
> Centros de custo pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.68: o reposicionamento fixo do seletor de mês do card
> Centros de custo pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.67: o ajuste responsivo do seletor de mês do card Centros
> de custo pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.66: o novo card consolidado de Centros de custo pertence
> à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.65: na Gestão Web, uma despesa já lançada é editada ao
> clicar sua linha em **Lançamentos do período**. **Cadastrar despesas**
> permanece somente para os tipos e categorias.

> Revisão 1.35.0.19.64: a opção de excluir dentro do editor de despesa pertence
> à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.63: ao criar ou acessar um perfil empresarial, escolha
> **Preencher depois** para usar a Gestão sem CNPJ ou cadastro completo. Essa
> decisão fica salva e o lembrete não retorna; o sistema pedirá os dados apenas
> ao iniciar uma assinatura, emitir documento fiscal ou usar outra ação que os
> exija. **Salvar rascunho** mantém o que já foi informado.

> Revisão 1.35.0.19.62: a confirmação automática no editor de previsões
> pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.61: o ajuste de ações de lançamentos previstos pertence à
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.60: a correção da abertura de lançamentos pertence à Gestão
> Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.59: a restauração das ações ao tocar linhas de lançamento
> pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.58: a indisponibilidade sem rede da Solicitação por Voz
> pertence ao AvantaVendas; sem impacto operacional na Gestão Web.
>

> Revisão 1.35.0.19.57: o ajuste do rodapé do card móvel **Saldo do mês** não
> altera a operação da Gestão Web.

> Revisão 1.35.0.19.56: o isolamento dos avisos de validação do card de
> lançamento pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.55: o ajuste de respiro no card móvel **Saldo do mês** não
> altera a operação da Gestão Web.

> Revisão 1.35.0.19.54: a correção do botão **Editar** em avisos de despesas
> previstas pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.53: em um mês aberto, toque uma despesa ou receita
> **prevista** para editar ou usar **Aceitar hoje**. Essa ação efetiva o
> lançamento com a data atual. Registros já confirmados abrem diretamente para
> edição.

> Revisão 1.35.0.19.52: a fonte da lista de produtos em **Custos e
> Precificação > Histórico de custos** foi ampliada, sem mudar a seleção ou os
> registros exibidos.

> Revisão 1.35.0.19.51: em **Custos e Precificação > Histórico de custos**, o
> seletor de produto foi contido dentro do card, sem alterar a seleção ou os
> registros exibidos.

> Revisão 1.35.0.19.50: a mensagem do carregamento ao trocar **Centro de custo**
> usa texto branco sobre a superfície de vidro. A escolha e os dados não mudaram.

> Revisão 1.35.0.19.49: ao trocar **Centro de custo**, o carregamento da Gestão
> Web reutiliza temporariamente o efeito visual `avanta-loading-glass`. A escolha
> e os dados do centro não mudaram.

> Revisão 1.35.0.19.48: ao trocar **Centro de custo**, o card de carregamento
> usa uma superfície branca opaca. A escolha e os dados do centro não mudaram.

> Revisão 1.35.0.19.47: o espaçamento dos seletores em **Lançar** pertence à
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.46: a igualdade tipográfica dos seletores em **Lançar**
> pertence à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.45: o ajuste de largura do seletor de Centro de custo na
> pílula da Gestão Mobile não altera a operação da Gestão Web.

> Revisão 1.35.0.19.44: a opção **Todos** no seletor de Centro de custo da
> Gestão Mobile não altera a operação da Gestão Web.

> Revisão 1.35.0.19.43: o alinhamento do seletor de Mês em **Lançar** pertence
> à Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.35.0.19.42: a ativação, desativação e gestão de **Centros de
> custo** é atualizada em tempo real entre Gestão Web e Gestão Mobile para o
> mesmo perfil. A escolha em tela continua sendo o último contexto usado
> naquele dispositivo.

> Revisão 1.35.0.19.41: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.40: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.39: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.38: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.37: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.36: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.35: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.34: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.33: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.32: o contexto global de centro de custo na Gestão Mobile
> não altera a operação da Gestão Web.

> Revisão 1.35.0.19.31: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.30: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.29: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.28: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.27: ajuste visual exclusivo da Gestão Mobile, sem impacto
> operacional na Gestão Web.

> Revisão 1.35.0.19.26: a Gestão Mobile passou a usar a mesma configuração e
> os mesmos centros de custo da Gestão Web. Ativar ou desativar em qualquer
> versão mantém o estado compartilhado do perfil; lançamentos feitos no Mobile
> podem ser direcionados para o centro ativo escolhido.

> A Central Fiscal resolve o autorizador oficial de homologação da UF cadastrada
> no perfil empresarial. Isto permite testes de NF-e modelo 55 nas 27 UFs
> atendidas; não habilita produção, contingência, NFC-e ou NFS-e.

> Revisão 1.35.0.19.24: em **Centros de custo**, abra **Editar** de um centro
> adicional para encontrar **Excluir**. A confirmação informa que receitas,
> despesas e despesas fixas de todos os períodos serão apagadas. **Pausar**
> preserva o histórico e bloqueia novos lançamentos; o **Principal** não pode
> ser pausado ou excluído.

> Revisão 1.35.0.19.23: a elevação das abas do cabeçalho só ocorre com
> **Centros de custo** ativo; sem o recurso, o menu volta à posição original.

> Revisão 1.35.0.19.22: a faixa de abas do cabeçalho subiu discretamente, sem
> mover o seletor global de centro de custo ou modificar sua seleção.

> Revisão 1.35.0.19.21: o seletor global de centro de custo usa a cor primária
> do perfil e texto contrastante. A seleção e a lista não mudaram.

> Revisão 1.35.0.19.20: o seletor global de centro de custo foi ajustado dois
> pixels para baixo, equilibrando a folga do cabeçalho. A seleção não mudou.

> Revisão 1.35.0.19.19: o seletor global de centro de custo recebeu dois pixels
> extras de folga acima e dois abaixo no cabeçalho desktop. A seleção não mudou.

> Revisão 1.35.0.19.18: com **Centros de custo** ativo nas Configurações, há
> apenas um seletor no cabeçalho. **Gráficos**, **Categorias** e **Relatório**
> seguem esse mesmo centro; os seletores repetidos foram removidos das páginas.

> Revisão 1.35.0.19.17: a lista do centro de custo abre alinhada exatamente ao
> campo que a acionou. Sem alteração na escolha ou no carregamento do contexto.

> Revisão 1.35.0.19.16: no cabeçalho, o contexto financeiro aparece como
> **Centro de custo: [seletor]**, centralizado pela mesma faixa das abas entre
> Início e Relatório. Sem alteração no carregamento do centro escolhido.

> Revisão 1.35.0.19.15: a lista do seletor global de centro de custo fica
> acima das barras e do conteúdo enquanto aberta. O campo continua compacto,
> abaixo das abas, sem alterar a altura do cabeçalho.

> Revisão 1.35.0.19.14: com Centros de custo ativo, a seleção do contexto
> financeiro passou para abaixo do menu superior. Ela permanece disponível em
> todas as páginas da Gestão e continua carregando somente o centro escolhido.

> Revisão 1.35.0.19.13: o texto selecionado nos campos de centro de custo de
> **Gráficos**, **Categorias** e **Relatório** é centralizado. Sem alteração
> no comportamento de consulta.

> Revisão 1.35.0.19.12: os seletores de centro de custo em **Categorias** e
> **Relatório** adotam a mesma apresentação de Gráficos. O comportamento de
> consulta por centro não foi alterado.

> Revisão 1.35.0.19.11: em **Categorias**, o seletor de centro de custo ao
> lado do total anual permite consultar **Todos** (consolidado) ou somente um
> centro. A lista, a matriz e os totais seguem a escolha.

> Revisão 1.35.0.19.10: a **Análise Gráfica** permite filtrar por centro de
> custo e alternar entre visão anual e mensal. A visão anual usa o ano global;
> a mensal permite escolher o mês e aplica o recorte a todos os gráficos.

> Revisão 1.35.0.19.09: o rótulo **Centro de custo** de Registrar Entradas
> recebeu apenas padronização tipográfica; o fluxo de receita não mudou.

> Revisão 1.35.0.19.08: no card **Registrar Entradas**, o rótulo do centro de
> custo fica acima da lista. Não houve alteração no destino da receita.

> Revisão 1.35.0.19.07: os seletores de mês dos cards do Dashboard exibem o
> rótulo **Selecione o mês**. Não houve alteração nas opções ou nos cálculos.

> Revisão 1.35.0.19.06: com Centros de custo ativo, o **Relatório Contábil**
> permite escolher **Todos** para o consolidado do perfil ou um centro ativo
> para consultar somente seus valores mensais e multianuais.

> Revisão 1.35.0.19.05: o card **Saldo do Mês** oferece **Todos** como padrão
> e permite consultar o saldo consolidado ou o saldo individual de cada centro
> de custo ativo, incluindo previsões.

> Revisão 1.35.0.19.04: o card **Resumo Financeiro** usa receitas e despesas
> consolidadas de todos os centros de custo do perfil no mês selecionado.

> Revisão 1.35.0.19.03: o card **Centros de custo** reapura receitas, despesas
> e consolidado de todos os centros ativos ao alterar um lançamento financeiro.

> Revisão 1.35.0.19.02: **Balanço Geral**, **Relatório** e **Gráficos** usam o
> consolidado de todos os centros de custo do perfil em cada mês e ano. O
> centro selecionado continua sendo o contexto isolado dos lançamentos diários
> e do Dashboard.

> Revisão 1.35.0.19.01: a organização visual dos indicadores do Admin não
> altera a orientação operacional da Ava na Gestão Web.
>
> Revisão 1.35.0.19: a otimização técnica da Solicitação por Voz foi aplicada
> às páginas de colaborador de Operações em Campo; sem impacto operacional na
> Gestão Web.
>

> Revisão 1.35.0.18: o teste técnico local de desempenho da Solicitação por
> Voz pertence ao AvantaVendas; sem impacto operacional na Gestão Web.
>

> Revisão 1.35.0.17: no card **Registrar entradas**, o campo Dia aceita somente
> números de 1 a 31. A Ava pode orientar o preenchimento de um dia válido.
>
> Revisão 1.35.0.16: ao voltar ao campo Dia do card **Registrar entradas**, a
> Ava pode orientar uma nova digitação, pois o valor anterior é limpo no foco.
>
> Revisão 1.35.0.15: o rascunho do card **Registrar entradas** é preservado ao
> trocar apenas o foco entre os campos. Sem impacto na orientação da Ava.
>
> Revisão 1.35.0.14: o campo de dia da receita no Dashboard é digitável e sem
> controles incrementais. Sem impacto na orientação da Ava.
>
> Revisão 1.35.0.13: quando o perfil possui mais de um centro de custo, a Ava
> pode orientar que a receita lançada pelo card **Registrar entradas** seja
> direcionada pelo seletor do próprio card, sem trocar o centro aberto na tela.
>
> Revisão 1.35.0.12: a releitura de instalações iniciais Apple foi acelerada
> no painel administrativo. Sem impacto operacional para a Ava.
>
> Revisão 1.35.0.11: a persistência da releitura de instalações iniciais Apple
> no painel administrativo foi corrigida. Sem impacto operacional para a Ava.
>
> Revisão 1.35.0.10: os downloads da App Store no painel administrativo usam
> todas as classificações oficiais de instalação inicial e reprocessam a janela
> após a correção. Não altera a operação da Gestão Web.

> Revisão 1.35.0.07: no painel administrativo, os filtros de Cadastros
> classificam o vínculo da pessoa entre plataformas e a ordem por data usa o
> cadastro da conta. Perfis AvantaLab mantém seus filtros próprios; não altera
> a operação da Gestão Web.

> Revisão 1.35.0.06: o painel administrativo mantém resultado, pesquisa e
> controles ao alternar a leitura de cadastros ou perfis; não altera a
> operação da Gestão Web.

> Revisão 1.35.0.05: no painel administrativo, Cadastros e Perfis AvantaLab
> são leituras separadas. Cadastros mede pessoas por plataforma; Perfis
> AvantaLab mantém empresas, assinatura e liberação de acesso. Não altera a
> operação da Gestão Web.

> Revisão 1.35.0.04: os controles de ordenação e paginação do painel
> administrativo passam a valer também para Cadastros; não alteram a operação
> da Gestão Web.

> Revisão 1.35.0.03: a distinção visual do cabeçalho de Cadastros no painel
> administrativo não altera a operação da Gestão Web.

> Revisão 1.35.0.02: a lista de cadastros do painel administrativo mostra o
> último acesso junto à data de cadastro, sem alterar a operação da Gestão Web.

> Revisão 1.35.0.01: o alinhamento visual do cabeçalho de **Perfis** no painel
> administrativo não altera a operação da Gestão Web.

> Revisão 1.35.0: no painel administrativo, **Perfis** permite alternar os
> cadastros ativos entre **Todos**, **AvantaLab** e **AvantaVendas**. Uma pessoa
> presente nas duas plataformas aparece uma única vez em Todos e recebe as duas
> identificações na lista. Esta leitura é exclusiva do administrador e não
> altera os acessos da Gestão Web.

> Revisão 1.34.0: em **Vendas e Serviços > Central Fiscal**, a situação do
> executor vem do servidor. **NF-e de teste disponível** significa somente
> homologação da SEFAZ-SP, sem valor fiscal; produção permanece bloqueada. O
> certificado A1, os XMLs, o DANFE e os registros pertencem sempre ao perfil
> empresarial. A ação principal inicia a venda que dará origem à nota; não cria
> uma nota fiscal avulsa sem operação comercial. O link público de download do
> AvantaVendas não altera a operação da Gestão Web.

> Revisão 1.33.0.16: a composição dos comprovantes compartilhados pelo
> AvantaVendas não altera a operação da Gestão Web.

> Revisão 1.33.0.15: os cards **Meus perfis** e **Centros de custo** têm seu
> próprio seletor de mês, igual ao do Resumo Financeiro. Cada seletor atualiza
> somente o resumo do respectivo card.

> Revisão 1.33.0.14: os cards de carregamento da Gestão Web ficam no centro da
> viewport visível em qualquer resolução, inclusive em telas móveis.

> Revisão 1.33.0.13: ao trocar o **Centro de custos**, a Gestão Web mostra
> “Carregando centro de custo” e bloqueia interações com o contexto anterior
> até concluir a leitura do novo centro.

> Revisão 1.33.0.12: selecionar **Principal** mostra somente o financeiro do
> próprio centro. O consolidado fica no card **Centros de custo**, que apresenta
> receitas, despesas e resultado de cada centro no mesmo padrão de Meus perfis.

> Revisão 1.33.0.11: ao ativar **Centros de custo**, o perfil passa a ter o
> centro **Principal**, sempre ativo e presente na lista. O histórico já
> existente fica no Principal. Ao escolher outro centro no cabeçalho, receitas,
> despesas, despesas fixas e evolução anual passam a mostrar somente aquele
> contexto; o card **Centros de custo** preserva o resumo de todos eles.

> Revisão 1.33.0.10: a padronização visual dos pop-ups de retorno pertence ao
> PWA Operações de Campo; não altera a operação da Gestão Web.

> Revisão 1.33.0.09: o posicionamento central do aviso offline de Serviços
> pertence ao PWA Operações de Campo; não altera a operação da Gestão Web.

> Revisão 1.33.0.08: o retorno imediato para Serviços concluídos sem conexão
> pertence ao PWA Operações de Campo; não altera a operação da Gestão Web.

> Revisão 1.33.0.07: o seletor de **Centro de custos** abre a lista abaixo do
> campo e fecha ao escolher, clicar fora ou pressionar Escape. O cabeçalho
> mantém **Despesas fixas** alinhado aos controles financeiros.

> Revisão 1.33.0.06: o card **Centros de custo** permite ocultar ou mostrar
> somente seus valores pelo botão de olho, sem alterar os outros resumos.

> Revisão 1.33.0.05: o seletor de **Centro de custos** permanece entre
> **Despesas fixas** e os comparativos financeiros, agora na mesma largura do
> botão. A correção técnica da fila offline não altera a operação da Gestão Web.

> Revisão 1.33.0.04: os indicadores de conexão, fila real e bloqueio de voz
> pertencem ao PWA Operações de Campo; sem impacto operacional adicional na
> Gestão Web.

> Revisão 1.33.0.03: a indisponibilidade da Solicitação por Voz sem internet
> pertence ao AvantaVendas; sem impacto operacional adicional na Gestão Web.

> Revisão 1.33.0.02: os indicadores de rede e sincronização pertencem ao
> AvantaVendas; sem impacto operacional adicional na Gestão Web.

> Revisão 1.33.0.01: em **Configurações**, gestor master ou administrador
> pode ativar **Centros de custo** no perfil. Após cadastrar os centros no
> novo item do menu, escolha um deles junto a **Despesas fixas** para direcionar
> os novos lançamentos; o Dashboard mostra o resumo mensal por centro. Quando
> desativado, o financeiro continua como um único conjunto de receitas e despesas.

> Revisão 1.33.0: a contingência offline pertence aos PWAs Operações de Campo
> e AvantaVendas; não altera os fluxos de cadastro ou conferência na Gestão Web.

> Revisão 1.32.0.03: o refinamento visual do ícone Pix no comprovante pertence
> ao AvantaVendas; sem impacto operacional adicional na Gestão Web.

> Revisão 1.32.0.02: o refinamento do comprovante compartilhado pertence ao
> AvantaVendas; sem impacto operacional adicional na Gestão Web.

> Revisão 1.32.0.01: ao salvar a permissão **Comando por voz** de um
> colaborador, o PWA daquele usuário passa a remover ou restaurar toda a faixa
> de voz em Recebimentos e Serviços, sem depender de novo login.

> Revisão 1.32.0: a edição de rascunhos no comando por voz pertence ao
> AvantaVendas; sem impacto operacional adicional na Gestão Web.

> Revisão 1.31.0.05: em **Operações de Campo > Colaboradores**, **Comando por
> voz** é uma permissão individual, marcada por padrão em cadastros existentes
> e novos. Ao desmarcar e salvar, a faixa de voz desaparece somente no PWA
> daquele colaborador; Recebimentos, Serviços e Agendamento não são alterados.

> Revisão 1.31.0.04: a correção de comandos não suportados pertence ao
> AvantaVendas e não altera a Gestão Web.

> Revisão 1.31.0.03: a remoção de pendências e as listas compactas pertencem ao
> PWA Operações de Campo, sem alterar a Gestão Web.

> Revisão 1.31.0.02: o texto reorganizado da ajuda pertence ao PWA Operações de
> Campo e não altera o fluxo da Gestão Web.

> Revisão 1.31.0.01: a continuidade visual das respostas por voz pertence ao
> PWA Operações de Campo e não altera a conferência na Gestão Web.

> Revisão 1.31.0: a voz do PWA pode preparar um registro de serviço, mas não o
> conclui. Cliente e execução são preenchidos; assinatura, avaliação e gravação
> continuam no fluxo oficial. O agendamento mantém cliente, data e tipo.

> Revisão 1.30.0.01: o refinamento do card de formas de pagamento pertence ao
> PWA Operações de Campo, sem alterar a conferência na Gestão.

> Revisão 1.30.0: novos cadastros de empresas e locais de Operações de Campo
> passam a alimentar automaticamente a pesquisa por voz do PWA. Não há campo
> manual de aliases nem alteração nas regras de conferência da Gestão.

> Revisão 1.29.0.02: ajuste visual da faixa de voz pertence ao PWA Operações
> em Campo, sem impacto operacional na Gestão Web.

> Revisão 1.29.0.01: refinamento visual do acionador de voz pertence ao PWA
> Operações em Campo, sem impacto operacional na Gestão Web.

> Revisão 1.29.0: Operações de Campo recebeu Solicitação por Voz no PWA do
> colaborador para recebimentos e agendamentos. A gestão e suas regras de
> conferência permanecem inalteradas.

> Revisão 1.28.0.05: a busca de cliente/local no relatório de Serviços mantém
> um único controle de limpeza, sem impacto operacional.

> Revisão 1.28.0.04: o seletor de empresas do PWA passou a mostrar todas as
> empresas ativas; a disponibilidade do serviço é verificada depois da escolha.

> Revisão 1.28.0.03: o quadro de seleção de cliente/local no relatório de
> Serviços possui superfície e contraste próprios nos temas claro e escuro.

> Revisão 1.28.0.02: Operações de Campo separa rotina e agendamentos na
> execução do colaborador, preserva comprovantes nos relatórios e mantém o
> modo escuro silencioso após a preferência ser salva.

> Revisão 1.28.0.01: emissão fiscal pertence exclusivamente a **Vendas e
> Serviços**, módulo da Gestão Web. Não encaminhe a pessoa para o aplicativo
> AvantaVendas nem para **Conteúdo AvantaVendas**; essas duas áreas não emitem
> notas fiscais.

> Revisão 1.28.0: os tipos de nota são configurados por perfil empresarial e
> persistidos na Gestão. O produto contempla NF-e, NFC-e e NFS-e, mas a tela
> deve mostrar somente os documentos habilitados para a empresa ativa. No
> piloto Tridium, oriente exclusivamente o ciclo de NF-e em homologação; não
> peça novamente dados cadastrais nem certificado que já estejam salvos.

> Revisão 1.27.0: em **Vendas e Serviços**, o cadastro do cliente pergunta
> separadamente a situação da inscrição estadual e se ele é consumidor final.
> Na publicação das regras fiscais, todos os tipos de nota habilitados precisam
> estar revisados, com responsável e data válida. O sistema bloqueia CFOP
> incompleto, condição inválida, data futura e falta de inscrição estadual
> quando a regra escolhida a exigir. Nenhuma regra inicial é confirmada
> automaticamente: a decisão tributária continua sendo do responsável fiscal.

> Revisão 1.26.0.02: em **Vendas e Serviços**, a tela **Revisar regras fiscais**
> ficou mais compacta. As ações Adicionar, Duplicar e Excluir agora aparecem
> juntas acima da lista; o comportamento e as validações fiscais permanecem os mesmos.
> Revisão 1.26.1.21: a preferência de modo escuro é aplicada sem aviso de
> sucesso; falhas de gravação continuam sendo apresentadas para correção.

> Revisão 1.26.1.20: o cadastro de subempresa alinha nome, responsável, valor
> e vencimento em uma única linha no desktop. A separação de rotina e
> agendamento é operacional no PWA e não altera os registros existentes.

> Revisão 1.26.1.19: o PDF de Serviços mantém a assinatura reduzida na mesma
> linha do serviço executado. O cadastro direto alinha valor e vencimento com
> os demais campos, sem mudança nos dados operacionais.

> Revisão 1.26.1.18: na Gestão Web, reclicar a aba ativa cancela qualquer
> edição, formulário ou seleção em curso. O relatório de Serviços agora leva
> comprovantes de assinatura reduzidos nos arquivos PDF e Excel.

> Revisão 1.26.1.17: a busca de cliente/local do relatório de Serviços fica ao
> lado do seletor e abre a lista ao receber foco, sem alteração operacional.

> Revisão 1.26.1.16: o relatório de Serviços abre sem resultados e exige a
> ação explícita **Consultar relatório** antes de exibir ou exportar dados.

> Revisão 1.26.1.15: logos PNG transparentes preservam a transparência no PDF
> de Serviços da Gestão Web, sem impacto operacional.

> Revisão 1.26.1.14: o relatório de Serviços gera e baixa um PDF com a
> identificação da empresa/perfil; o card de consulta permanece neutro. Não há
> alteração nos registros operacionais.

> Revisão 1.26.1.13: o rótulo do botão Relatórios foi centralizado
> verticalmente na Gestão Web, sem impacto operacional.

> Revisão 1.26.1.12: o visualizador de comprovantes de assinatura mantém
> contraste legível e abre acima dos modais do relatório, sem alteração do
> conteúdo ou acesso privado aos arquivos.

> Revisão 1.26.1.11: o alinhamento do botão Relatórios na Gestão Web foi
> refinado, sem impacto operacional.

> Revisão 1.26.1.10: o relatório de Serviços identifica no cabeçalho a
> empresa/perfil ativo e mostra a logo cadastrada quando disponível.

> Revisão 1.26.1.09: a lista de clientes e locais do relatório de Serviços
> inicia fechada. Use **Selecionar cliente ou local** para abri-la; após a
> escolha, ela se fecha e o filtro fica resumido no cabeçalho.

> Revisão 1.26.1.08: as datas do relatório de Serviços usam o calendário
> padrão do sistema. Escolha o dia e confirme a seleção antes de continuar.

> Revisão 1.26.1.07: no relatório de Serviços, a seleção é removida ao clicar
> novamente no cliente, agrupado ou local ativo. **Todos deste agrupado**
> inclui somente os locais daquele agrupado; os controles de exportação têm
> contraste reforçado nos dois temas.

> Revisão 1.26.1.06: período e exportações do relatório de Serviços ficam em
> uma faixa única; a busca passou para o topo da lista de clientes e locais.

> Revisão 1.26.1.05: o seletor de cliente/local do relatório de Serviços
> agora mostra a hierarquia Empresa → locais. Pesquise ao lado da lista e
> selecione todos, o agrupado ou um local específico.

> Revisão 1.26.1.04: a camada do relatório de Serviços cobre a página inteira
> atrás do card, sem alteração operacional.

> Revisão 1.26.1.03: no relatório de **Serviços > Realizados**, escolha um
> cliente direto, todos os locais de um agrupado ou um local específico. A
> mesma seleção segue para a prévia, Excel e PDF.

> Revisão 1.26.1.02: em **Serviços > Realizados**, use **Relatórios** para
> definir a data inicial e final, revisar os serviços executados e exportar a
> listagem para Excel ou imprimir/salvar em PDF. A prévia mantém o botão
> **Visualizar assinatura**: o comprovante continua privado dentro do
> AvantaLab e não é exposto como link permanente na exportação.

> Revisão 1.26.1: reorganização interna de protótipos, testes, build e
> infraestrutura das rotas de voz; sem impacto operacional na Gestão Web.

> Revisão 1.26.0.01: a área de assinatura do PWA de Serviços respeita a faixa
> fixa de ações, sem alterar o fluxo operacional de registro.

> Revisão 1.26.0: ao salvar ou atualizar um produto em **Conteúdo
> AvantaVendas**, o sistema prepara automaticamente e em segundo plano as
> formas de localização usadas pela Solicitação por Voz. Não existe campo
> adicional para preencher e a publicação do produto não fica aguardando a IA.
> A experiência de voz foi centralizada no PADRÃO AVANTA; não há mudança na
> edição do catálogo nem nova configuração manual para a Gestão.

> Revisão 1.25.0.05: a folga e o hover dos botões principais do Menu da Gestão
> são aplicados diretamente a cada atalho; não há mudança nos fluxos operacionais.

> Revisão 1.25.0.04: os botões principais do Menu da Gestão deixam uma folga
> lateral e avançam suavemente no hover; não há mudança nos fluxos operacionais.

> Revisão 1.25.0.03: todos os módulos em página própria usam a logo configurada
> do perfil no cabeçalho; quando ela não existe, mostram o nome do perfil. Não
> há mudança nos fluxos operacionais.

> Revisão 1.25.0.02: as páginas próprias dos módulos exibem o rodapé
> institucional AvantaLab e Operações de Campo mostra a logo configurada do
> perfil, quando existir. A entrada duplicada no menu foi removida; não há
> mudança nos fluxos operacionais.

> Revisão 1.25.0.01: o ajuste visual do painel de Ajustes deixa **Modo escuro**
> em uma linha curta, com seletor ON/OFF; não há mudança operacional.

> Revisão 1.25.0: a **Visão geral** de Operações de Campo passou a mostrar
> somente quantidades operacionais de Recebimentos e Serviços; os valores ficam
> em **Resultados**. Em **Ajustes** (engrenagem do cabeçalho), Gestor Master e
> Administrador definem o nome, a etiqueta, o envio para Resultados e a base
> financeira: **Recebido e confirmado** ou **Programado no vencimento**. Perfis
> existentes preservam a primeira opção. A mesma tela também altera o modo
> escuro do perfil, aplicado imediatamente.

> Revisão 1.24.0.01: a Visão geral preserva as mesmas informações financeiras,
> mas **Recebimentos** agora usa a mesma estrutura de seção e cards numéricos de
> Serviços, na cor própria da divisão. O total confirmado ganhou mais destaque
> e os controles permanecem agrupados à direita; não há mudança operacional.

> Revisão 1.24.0: em **Visão geral > Financeiro**, a pílula de total recebido
> concentra a integração em uma linha. O novo **Relatório de recebimentos**
> resume as cobranças do mês e permite abrir a listagem detalhada.

> Revisão 1.23.0: a **Visão geral** separa Financeiro de Serviços no mês
> selecionado. Em Serviços, acompanhe programados, realizados, pendentes,
> atrasados, agendamentos manuais e avaliações regulares; as avaliações boas
> aparecem como referência de qualidade.

> Revisão 1.22.0.03: novos agendamentos iniciam no tipo **Interna**. Os demais
> refinamentos desta revisão pertencem ao acesso do colaborador.

> Revisão 1.22.0.02: o contraste dos botões secundários no modal de
> Agendamentos foi ajustado; não há mudança operacional.

> Revisão 1.22.0.01: as ações de cada agendamento manual permanecem alinhadas
> em uma linha na Gestão Web; não há mudança no fluxo operacional.

> Revisão 1.22.0: em **Serviços > Agendamentos**, a Gestão pode editar um
> agendamento manual, cancelá-lo após confirmação ou concluí-lo a partir da
> data marcada. A conclusão aparece em **Realizados** como feita pela Gestão,
> sem simular assinatura ou avaliação do cliente.

> Revisão 1.21.0.02: em **Serviços > Agendamentos**, a data usa o calendário
> centralizado do AvantaVendas. Navegue pelos meses, escolha um dia a partir de
> hoje ou use **Hoje**; datas anteriores permanecem indisponíveis.

> Revisão 1.21.0.01: a escolha de operação do PWA usa a mesma cena visual do
> login; não altera as permissões nem o fluxo operacional.

> Revisão 1.21.0: em **Operações de Campo > Colaboradores**, a permissão
> **Agendamento** libera no PWA de Serviços a criação de serviços **Interna**,
> **Revisão** e **Extra**. Na Gestão Web, use **Serviços > Agendamentos > Novo
> agendamento** para escolher empresa, piso/local, data e tipo. Serviços manuais
> ficam em Pendentes ou Atrasados até o registro; ao concluir, aparecem em
> Realizados. O alerta do PWA informa agendamentos manuais do dia da empresa e
> só desaparece quando forem registrados. Nada disso altera recebimentos.

> Revisão 1.20.0.09: a âncora pública direta do card AvantaVendas na página de
> Gestão Financeira não altera a operação da Gestão Web.

> Revisão 1.20.0.08: o backup administrativo de Recebimentos também preserva
> Serviços e suas assinaturas privadas; não há mudança no uso do módulo.

> Revisão 1.20.0.07: as filas de **Serviços** ocupam toda a largura interna do
> card de Administração, no mesmo comportamento das filas de Recebimentos.

> Revisão 1.20.0.06: o seletor **Exibir avisos** tem a mesma altura do
> controle mensal e de **Todos**, preservando o alinhamento da faixa de filtros.

> Revisão 1.20.0.05: em **Serviços > Avisos**, o filtro **Exibir avisos** fica
> à esquerda do seletor de mês. Os dois controles, **Todos** e o contador ficam
> no mesmo grupo alinhado à direita, sem alterar a consulta.

> Revisão 1.20.0.04: os controles de **Serviços > Avisos** seguem a mesma
> disposição das filas de Conferência e Próximo a vencer: pesquisa no topo do
> card, seletor de mês junto ao título e botão **Todos** para consultar todo o
> histórico de avaliações regulares.

> Revisão 1.20.0.03: em **Serviços > Avisos**, consulte por mês apenas as
> avaliações **Regular**. Pesquise por empresa, pessoa ou observação e alterne
> entre pendentes, concluídos e todos. A observação longa pode ser expandida;
> conclua o tratamento ou reabra o aviso quando necessário. O número na aba
> mostra exclusivamente os pendentes.

> Revisão 1.20.0.02: **Serviços > Atrasados** é preenchido pelo cronograma
> cadastrado. Se a execução semanal era prevista para terça e não foi
> registrada, ela aparece na quarta; o mesmo vale para as demais frequências.

> Revisão 1.20.0.01: a aba **Serviços > Pendentes** mostra automaticamente
> os serviços de hoje até os próximos 10 dias; não há seletor nesse painel.

> Revisão 1.20.0: em **Serviços > Realizados**, escolha o mês no seletor
> para consultar os atendimentos concluídos. Cada item informa empresa, local,
> data, colaborador, assinador e avaliação. Use **Visualizar assinatura** para
> abrir o PNG privado do comprovante.

> Revisão 1.19.0.25: no PWA de Serviços, cada seleção reposiciona suavemente
> o próximo campo útil para mantê-lo visível no visor.

> Revisão 1.19.0.24: no PWA de Serviços, o piso e todos os clientes ativos do
> local agrupador são exibidos mesmo sem serviço pendente. Somente os clientes
> com atendimento pendente ou atrasado podem ser selecionados para registro.

> Revisão 1.19.0.23: na lista de visitas do PWA de Serviços, tocar novamente
> no cliente selecionado desfaz a escolha e oculta o campo do assinador.

> Revisão 1.19.0.22: o processamento de salvamento em Operações de Campo é
> indicado somente no botão da ação; a faixa de abas não exibe aviso adicional.

> Revisão 1.19.0.21: o identificador visual **Gestão operacional** foi
> removido do topo de Operações de Campo, sem impacto no uso do módulo.

> Revisão 1.19.0.20: no PWA de Serviços, locais agrupadores com clientes em
> mais de um piso ou nível apresentam primeiro a seleção do piso e, em seguida,
> os clientes pendentes para visita naquele local.

> Revisão 1.19.0.19: no PWA de Serviços, somente destinos com atendimento
> pendente ou atrasado podem ser registrados. Sem atendimento disponível, o
> colaborador vê a próxima execução antes de iniciar a assinatura.

> Revisão 1.19.0.18: na avaliação de Serviço, o cliente escolhe entre cartões
> visuais de **Bom** e **Regular**; a segunda opção tem borda âmbar destacada.

> Revisão 1.19.0.17: o cabeçalho da assinatura de Serviço identifica o
> assinante e, abaixo, a empresa ou empresa/subempresa escolhida.

> Revisão 1.19.0.16: mensagens e validações exibidas na área de assinatura de
> Serviço são centralizadas no campo.

> Revisão 1.19.0.15: na assinatura de Serviço, **Cancelar** fica junto de
> **Limpar assinatura** no rodapé. O cabeçalho e as ações usam a cor do sistema.

> Revisão 1.19.0.14: no registro de Serviço, o campo do assinador aparece
> após a escolha do destino; só então é exibida a ação **Avançar para
> assinatura**.

> Revisão 1.19.0.13: a assinatura de Serviço é exibida em uma camada de tela
> cheia, sem o card ou o cabeçalho do PWA ao fundo. A área para assinar ocupa o
> espaço disponível e o cancelamento devolve o colaborador ao cadastro.

> Revisão 1.19.0.12: no PWA de Serviços, **Registrar novo serviço** inicia
> selecionado e a ação alternativa fica contornada. A coleta da assinatura abre
> em tela cheia e pode ser cancelada antes de avançar para a avaliação.

> Revisão 1.19.0.11: no PWA de Serviços, o colaborador escolhe entre abrir
> **Registrar novo serviço** ou **Serviços realizados**; os dois cards não são
> exibidos juntos.

> Revisão 1.19.0.10: o nome do perfil vinculado é sincronizado nas credenciais
> dos colaboradores para manter o cabeçalho completo no PWA de Operações de
> Campo.

> Revisão 1.19.0.09: no PWA de **Operações de Campo**, os cabeçalhos de
> Recebimentos e Serviços mantêm o nome do perfil ou empresa e informam, logo
> abaixo, o tipo de registro disponível na área.

> Revisão 1.19.0.08: em **Colaboradores**, o título **Permissões no
> aplicativo** fica dentro do bloco de seleção, sem sobrepor sua borda.

> Revisão 1.19.0.07: em **Colaboradores**, editar permissões não exige mudar a
> senha. Preencha e confirme uma nova senha somente quando quiser redefinir o
> acesso.

> Revisão 1.19.0.06: nos cards de **Preparando**, **Carregando** e
> **Validando**, a marca não é repetida em texto; o logotipo continua na cena
> de fundo.

> Revisão 1.19.0.05: no acesso de **Operações de Campo**, o card de validação
> mostra somente o estado e a mensagem, sem a identificação AvantaLab Gestão.

> Revisão 1.19.0.04: a abertura de **Operações de Campo** exibe somente o
> identificador Gestão operacional e o título; a descrição complementar foi
> removida.

> Revisão 1.19.0.03: confirmação e compartilhamento da Solicitação por Voz
> foram ajustados somente no AvantaVendas; sem impacto operacional na Gestão
> Web.

> Revisão 1.19.0.02: **Recebimentos Presenciais** passa a se chamar
> **Operações de Campo**. O nome muda no catálogo, menu, página web e PWA; a
> rota, as permissões e os dados existentes são preservados.

> Revisão 1.19.0.01: a navegação de Recebimentos Presenciais separa as áreas
> por cor. À esquerda, a ordem é **Visão geral**, **Resultados**, **Empresas**
> e **Colaboradores**; as barras seguintes recebem os rótulos externos
> **Recebimentos** e **Serviços**, com espaço antes do AvantaCard.

> Revisão 1.19.0: **Recebimentos Presenciais** também controla serviços. As
> abas **Realizados**, **Pendentes**, **Atrasados** e **Avisos** ficam reunidas
> no grupo verde de Serviços e usam a mesma pílula deslizante da navegação
> principal. A agenda vem de **Execução do serviço**, sem mexer em cobranças ou
> histórico financeiro. Em **Colaboradores**, defina o acesso a Recebimentos,
> Serviços ou ambos. No PWA de Operações em Campo, quem possui as duas
> permissões escolhe a operação e pode usar **Trocar sistema**; o registro de
> serviço solicita cliente, nome, assinatura e avaliação. Uma avaliação
> **Regular** gera Aviso para o gestor, com observação opcional, até ser
> concluído após o tratamento.

> Revisão 1.18.0.07: correção interna e preservadora do gatilho de lançamentos
> do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.18.0.06: o campo compacto ao lado de **Tipo de nível** passou a se
> chamar **Referência**. Use-o para informar números ou códigos como 12, G ou
> L2, sem quebra do rótulo.

> Revisão 1.18.0.05: nos cadastros e edições de **Recebimentos
> Presenciais**, **Rua** usa uma área maior e **Número / identificação** usa
> uma área compacta, própria para referências curtas como 12, G ou L2.

> Revisão 1.18.0.04: o card de **Administração** em **Recebimentos
> Presenciais** acompanha a altura real dos filtros e linhas carregadas. A
> rolagem ocorre na página completa, sem uma barra interna no card.

> Revisão 1.18.0.03: em **Recebimentos Presenciais**, trocar para outra seção
> interna cancela o cadastro ou a edição em andamento sem salvar. Ao retornar a
> **Empresas**, a lista abre sem formulário pendente; os campos do endereço,
> execução do serviço e as ações finais continuam disponíveis pela rolagem do
> próprio cadastro.

> Revisão 1.18.0.02: **Recebimentos Presenciais** abre em página própria, com
> **Início**, marca AvantaLab e **Ajustes** no cabeçalho. No endereço de empresa,
> local ou cliente, use **Tipo de nível** e **Número / identificação** para
> registrar, por exemplo, Andar 12, Piso G ou Subsolo 2; nenhum endereço já
> registrado é alterado automaticamente.
>
> Revisão 1.18.0.01: no **Local agrupador**, configure também a **Execução do
> serviço**. Todo cliente já existente e todo novo cliente no local inicia com
> **Herdar a programação do local** ativado; as datas aparecem somente para
> consulta até que essa opção seja desativada para definir uma programação
> própria. A herança é operacional e não altera vencimentos ou histórico.
>
> Revisão 1.18.0: em **Recebimentos Presenciais**, o pagamento é sempre
> mensal. Ao cadastrar ou editar um cliente, selecione o **Dia de vencimento**
> obrigatório; a antiga frequência passa a se chamar **Execução do serviço** e
> serve de referência para controlar a realização semanal, quinzenal, mensal,
> trimestral, semestral ou anual. O sistema preserva o dia já usado por cada
> cliente e o histórico de cobranças.

> Revisão 1.17.0.04: correção da conciliação e da escolha manual de
> produtos na Solicitação por Voz aplicada somente ao AvantaVendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.17.0.03: ao salvar ou inativar um produto em **Conteúdo
> AvantaVendas > Produtos**, a publicação alcança imediatamente as contas de
> AvantaVendas vinculadas; sem impacto operacional adicional na Gestão Web.

> Revisão 1.17.0.02: digitação contínua e conciliação refinada do catálogo na
> Solicitação por Voz aplicadas somente ao AvantaVendas; sem impacto
> operacional na Gestão Web.

> Revisão 1.17.0.01: ao editar um produto antigo sem SKU em **Conteúdo
> AvantaVendas > Produtos**, o sistema preenche um código técnico estável.
> Portanto, basta revisar os dados e usar **Salvar produto**; a validação também
> aparece no próprio formulário.

> Revisão 1.17.0: resolução e edição da Solicitação por Voz aplicadas somente
> ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.13: em **Conteúdo AvantaVendas > Produtos**, a lista abre sem
> formulário. Use **Novo produto** para abrir um cadastro vazio; **Editar** abre
> o item e leva a rolagem à edição no topo; **Cancelar** fecha sem gravar. Salvar
> e Inativar aguardam a confirmação do banco e mantêm o formulário aberto se a
> operação não puder ser concluída.

> Revisão 1.16.0.12: refinamento aprovado do símbolo de ajuda da Solicitação
> por Voz aplicado somente ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.11: símbolo de ajuda da Solicitação por Voz simplificado no
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.10: ícone de ajuda da Solicitação por Voz refinado somente no
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.09: fechamento contextual da ajuda da Solicitação por Voz
> aplicado somente ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.08: conclusão visual do carregamento inicial aplicada somente
> ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.07: atalho fixo de ajuda da Solicitação por Voz aplicado
> somente ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.06: ajuda contextual da Solicitação por Voz aplicada somente
> ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.05: critérios dos Insights foram ajustados somente na Gestão
> Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.04: Caixinha e cálculo de Insight foram ajustados somente na
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.03: área do puxador de cards foi ajustada somente na Gestão
> Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.02: ordem inicial e puxador de cards foram ajustados somente
> na Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.16.0.01: saldo atual na escolha de cliente de pagamento por voz,
> aplicado somente ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.16.0: agendamento pela Solicitação por Voz aplicado somente ao
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.15.0.08: organização visual dos cards da Solicitação por Voz
> aplicada somente ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.15.0.07: o ícone de sugestões da Sala de Botões foi refinado no
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.15.0.06: o card de sugestões da Sala de Botões foi renomeado no
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.15.0.05: agrupamento visual do comando por voz aplicado somente à
> Sala de Botões do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.15.0.04: distribuição responsiva do comando por voz aplicada
> somente à Sala de Botões do AvantaVendas; sem impacto operacional na Gestão
> Web.

> Revisão 1.15.0.03: composição do aviso de processamento por voz aplicada
> somente à Sala de Botões do AvantaVendas; sem impacto operacional na Gestão
> Web.

> Revisão 1.15.0.02: busca aproximada e ajustes visuais da Solicitação por Voz
> aplicados somente à Sala de Botões do AvantaVendas; sem impacto operacional na
> Gestão Web.

> Revisão 1.15.0.01: limpeza de metadados técnicos de clientes aplicada somente
> ao banco do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.15.0: auditoria e interpretação ampliada da Solicitação por Voz
> aplicadas somente à Sala de Botões do AvantaVendas; sem impacto operacional na
> Gestão Web.

> Revisão 1.15.0-av124: recursos do AvantaVendas atualizados; sem impacto
> operacional na Gestão Web.

> Revisão 1.14.3.27: central de pendências da Solicitação por Voz aplicada
> somente à Sala de Botões do AvantaVendas; sem impacto operacional na Gestão
> Web.

> Revisão 1.14.3.26: pílula Salvar para depois aplicada somente à Sala de
> Botões do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.14.3.25: ajuste de texto do comando de voz aplicado somente à Sala
> de Botões do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.14.3.24: simplificação visual dos painéis de voz aplicada somente
> à Sala de Botões do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.14.3.23: indicador de processamento e busca fonética do comando
> de voz aplicados somente à Sala de Botões do AvantaVendas; sem impacto
> operacional na Gestão Web.

> Revisão 1.14.3.22: cancelamento direto no círculo durante o envio de voz
> aplicado somente à Sala de Botões do AvantaVendas; sem impacto operacional na
> Gestão Web.

> Revisão 1.14.3.21: confirmação explícita do envio de áudio e centralização
> dos avisos aplicadas somente na Sala de Botões do AvantaVendas; sem impacto
> operacional na Gestão Web.

> Revisão 1.14.3.20: âncora do microfone corrigida somente na Sala de Botões do
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.14.3.19: diâmetro do microfone estabilizado somente na Sala de
> Botões do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.14.3.18: microfone imóvel e busca ampliada de produtos aplicados ao
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.14.3.17: correções da Solicitação por Voz e limpeza restrita de
> metadados de importação aplicadas ao AvantaVendas; sem impacto operacional na
> Gestão Web.

> Revisão 1.14.3.16: centralização responsiva aplicada somente ao microfone da
> Sala de Botões do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.14.3.15: ajuste fino de posição aplicado somente ao microfone da
> Sala de Botões do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.14.3.14: comando circular incorporado à Sala de Botões do
> AvantaVendas, sem navegação para outra página; sem impacto operacional na
> Gestão Web.

> Revisão 1.14.3.13: ativação da Solicitação por Voz aplicada somente às
> Configurações e à Sala de Botões do AvantaVendas; sem impacto operacional na
> Gestão Web.

> Revisão 1.14.3.12: Vendas e Serviços consulta CNPJ/CEP reais no cadastro do
> cliente e aguarda a confirmação da Gestão antes de fechar cadastros,
> recebimentos e movimentos de estoque. Falhas preservam o preenchimento e não
> deixam registros apenas locais no perfil empresarial. Relatórios de cliente
> usam as operações e parcelas persistidas do próprio perfil.

> Revisão 1.14.3.11: pedidos e pagamentos confirmados pelo laboratório de voz
> são relidos do banco e exibem conta, valor, horários e código do registro como
> comprovação. A rota continua oculta e sem entrada nos menus da Gestão Web.

> Revisão 1.14.3.10: Vendas e Serviços só libera os dados após a Gestão
> confirmar o perfil empresarial e as permissões do login. Perfil, contadores,
> equipe, emitente e situação do certificado vêm da empresa acessada; uma falha
> de catálogo não autoriza o uso de dados demonstrativos.

> Revisão 1.14.3.09: reforçado o contraste e a amplitude das ondas reais do
> laboratório oculto de voz. Sem alteração em menus ou fluxos oficiais da
> Gestão Web.

> Revisão 1.14.3.08: o laboratório oculto de voz ganhou ondas visuais ligadas
> ao sinal real do microfone, sem movimento durante o silêncio. Sem alteração
> em menus ou fluxos oficiais da Gestão Web.

> Revisão 1.14.3.07: seleção de candidatos ambíguos no laboratório de voz
> passou a usar o identificador validado na conta ativa, sem repetir a mesma
> pergunta nem enviar uma nova interpretação à IA.

> Revisão 1.14.3.06: a ponte do laboratório de voz agora encerra o estado de
> carregamento quando o projeto externo não responde e apresenta uma orientação
> de inicialização, sem alterar menus ou fluxos oficiais.

> Revisão 1.14.3.05: interface do laboratório de voz transferida para o
> repositório externo de protótipos, mantendo na Gestão apenas a ponte
> autenticada e o núcleo seguro de integração. Sem entrada em menus.

> Revisão 1.14.3.04: Vendas e Serviços permite verificar novamente um
> certificado A1 já instalado, sem novo upload ou senha. As evidências públicas
> e eventuais bloqueios pertencem ao perfil empresarial; o ambiente local
> reutiliza a chave preservada no cofre do sistema após reiniciar.

> Revisão 1.14.3.03: laboratório oculto de solicitação por voz criado para o
> Avanta Vendas, sem entrada em menus e sem impacto operacional na Gestão Web.

> Revisão 1.14.3.02: Vendas e Serviços recebe da Gestão a identidade do usuário
> autenticado para aplicar permissões reais. O perfil empresarial permanece o
> único proprietário de certificados, documentos fiscais e dados comerciais.

> Revisão 1.14.3.01: verificação técnica do módulo Vendas isolada de builds e
> arquivos gerados, sem mudança no fluxo operacional da Gestão Web.

> Revisão 1.14.3: a consulta comercial recompõe integralmente os documentos
> após recarga. Evidências de ordens de serviço são privadas, vinculadas à
> empresa e auditadas por checksum e autoria; o usuário apenas autoriza o acesso.

> Revisão 1.14.2: devoluções faturadas e estornos de serviços concluídos foram
> integrados ao estoque, contas a receber e histórico fiscal. Valores líquidos
> recebidos e documentos fiscais em andamento bloqueiam o estorno até serem
> regularizados nas respectivas áreas.

> Revisão 1.14.1: o ciclo persistido da ordem de serviço agora coordena início,
> reserva, conclusão, consumo de materiais, contas a receber e rascunho de NFS-e
> em uma transação do perfil empresarial. Cancelamentos antes da conclusão
> liberam reservas; pedidos anteriores ao faturamento também podem ser
> cancelados com liberação transacional. Estornos posteriores permanecem
> bloqueados.

> Revisão 1.14.0: Vendas e Serviços passou a gravar a operação comercial no
> perfil empresarial ativo. Recebimentos líquidos geram ou atualizam a entrada
> da competência correspondente na Gestão; usuários são autores da auditoria,
> nunca proprietários dos dados. Cadastros, estoque e documentos comerciais são
> recarregados do servidor e não se misturam aos dados de demonstração.

> Revisão 1.13.0.92: Custos e Precificação distingue abertura direta pela Gestão
> de abertura por **Vendas e Serviços > Novo > Produto**. No primeiro caso mantém
> **Início**; no segundo mostra **Voltar** para Vendas, preservando o perfil. O
> menu Novo de Vendas também ganhou fundo escurecido e fechamento externo.

> Revisão 1.13.0.91: Vendas e Serviços passou a herdar visualmente a cor
> primária do perfil empresarial autenticado, no mesmo padrão de Custos e
> Precificação. A seleção do perfil e as permissões não mudaram.

> Revisão 1.13.0.90: o menu **Novo** da página local de Vendas e Serviços ganhou
> os atalhos Cliente, Fornecedor e Produto; Produto abre sua origem oficial em
> Custos e Precificação. Sem alteração na seleção do perfil pela Gestão.

> Revisão 1.13.0.89: na página local de **Vendas e Serviços**, o cabeçalho
> contém somente **Início**, a marca AvantaLab e **Ajustes**. O perfil
> empresarial já vem do acesso pela Gestão e não é selecionado novamente; a
> tabela padrão do catálogo é resolvida internamente e não aparece no topo.

> Revisão 1.13.0.88: a Gestão Mobile também passou a mostrar **Conteúdo
> AvantaVendas** no menu Sistemas; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.87: o módulo integrado de publicação agora se chama
> **Conteúdo AvantaVendas** no catálogo, no menu e no cabeçalho da área. Use-o
> para publicar novidades, catálogo e materiais de divulgação para a equipe.
> **Vendas e Serviços** continua sendo o módulo separado de operação comercial.

> Revisão 1.13.0.86: depois de instalar um módulo Web de página total, o card
> em **Menu > Módulos** mostra **Acessar**. Em Vendas e Serviços, essa ação
> fecha o catálogo e abre a página usando o perfil empresarial ativo.

> Revisão 1.13.0.85: **Vendas e Serviços** passa a ser um módulo Web. Nesta
> etapa de finalização, somente o perfil empresarial Tridium o encontra em
> **Módulos**. No Business Pro, escolha **Instalar**; no Business, contrate o
> módulo pelo próprio perfil. Perfis pessoais não o exibem. Emitente,
> certificado e documentos pertencem sempre ao perfil ativo, não ao login.

> Revisão 1.13.0.84: no futuro Vendas Web, os cadastros de cliente, empresa
> ativa e emissor começam pelo **CNPJ**, com **Buscar** na mesma linha. Todo
> endereço começa pelo **CEP**, também com **Buscar**. O CNPJ pode preencher o
> endereço disponível; use o CEP para completar ou atualizar. Revise os dados
> retornados e preencha manualmente o que faltar antes de salvar.

> Revisão 1.13.0.83: o cancelamento da NF-e paulista já possui montagem,
> assinatura e transporte interno preparados para homologação. Para o usuário,
> permanece a mesma ação **Cancelar NF-e**; os XSDs oficiais já são conferidos e
> a conexão real segue bloqueada até o ensaio controlado, sem campo técnico novo.

> Revisão 1.13.0.82: interação e adaptação móvel da Constelação Avanta
> refinadas no protótipo isolado; sem impacto operacional na Gestão Web.

> Revisão 1.13.0.81: brilho e profundidade do protótipo Constelação Avanta
> refinados; sem impacto operacional na Gestão Web.

> Revisão 1.13.0.80: na Central Fiscal do futuro Vendas Web, uma NF-e autorizada
> oferece **Ações > Cancelar NF-e**. Informe uma justificativa entre 15 e 255
> caracteres e confirme a solicitação. A autorização, o protocolo e os arquivos
> originais permanecem no histórico. O cenário local é fictício e não transmite.

> Revisão 1.13.0.79: marca completa e movimento das estrelas no protótipo
> Constelação Avanta; sem impacto operacional na Gestão Web.

> Revisão 1.13.0.78: o protótipo isolado da Constelação Avanta recebeu ajustes
> visuais e de interação, sem alterar fluxos da Gestão Web.

> Revisão 1.13.0.77: foi incluído apenas no acesso local do protótipo do Vendas
> um cenário demonstrativo da rejeição 778. Ele é removido quando a Gestão abre
> o módulo com sessão autenticada e não altera documentos ou emissões reais.

> Revisão 1.13.0.76: criado o protótipo público e isolado da Constelação
> Avanta, sem alterar fluxos ou orientações operacionais da Gestão Web.

> Revisão 1.13.0.75: a Central Fiscal separa uma NF-e rejeitada da continuação
> normal. Em **Revisar dados fiscais**, a rejeição 778 libera somente o NCM dos
> produtos. **Salvar revisão fiscal** mantém série, número e histórico e não
> assina nem transmite; a nota volta a **Número reservado**.

> Revisão 1.13.0.74: a correção de uma NF-e rejeitada preserva o rascunho, a
> tentativa, o XML anterior, a série e o número. Após validar os novos dados, o
> fluxo para em **Número reservado** e exige nova assinatura; não há reenvio
> automático e **Emitir NF-e** continua bloqueado na interface pública.

> Revisão 1.13.0.73: rejeição fiscal e fila de consultas esgotada passaram a
> orientar revisão manual, sem alegar notificação automática inexistente e sem
> oferecer retransmissão. **Emitir NF-e** continua bloqueado.

> Revisão 1.13.0.72: os caminhos internos de timeout, recibo pendente e
> reconciliação por protocolo foram aprovados sem retransmissão ou rede externa.
> Não existe nova ação de usuário e **Emitir NF-e** permanece bloqueado.

> Revisão 1.13.0.71: o laboratório comprovou o caminho interno completo da NF-e
> até o DANFE pronto com certificado efêmero e autorização em memória. Não
> existe nova ação de usuário nem transmissão real; **Emitir NF-e** permanece
> bloqueado na interface.

> Revisão 1.13.0.70: assinatura, autorização, retorno e armazenamento da NF-e
> foram reunidos num orquestrador interno do laboratório. A trava permanece
> fechada e não existe nova rota ou ação de usuário; **Emitir NF-e** continua
> sem capacidade de transmissão.

> Revisão 1.13.0.69: o backend local do futuro Vendas Web agora possui os
> transportes protegidos para consultar recibo e protocolo da NF-e em
> homologação. Eles continuam sem rota, sem ação de usuário e desconectados da
> fila e do comando **Emitir NF-e**.

> Revisão 1.13.0.68: o futuro Vendas Web ganhou no backend local o transporte
> próprio da autorização NF-e em homologação. Ele ainda não possui rota nem está
> ligado ao comando **Emitir NF-e**, portanto não há nova ação para o usuário e
> nenhuma nota pode ser transmitida por esta etapa.

> Revisão 1.13.0.67: ao adicionar um A1 no futuro Vendas Web, o backend valida
> e ativa o certificado e então confere automaticamente a disponibilidade da
> conexão fiscal. O usuário não recebe um novo botão ou formulário técnico. Se
> a SEFAZ estiver indisponível, o certificado continua ativo e a conexão será
> conferida novamente antes da emissão.

> Revisão 1.13.0.66: o laboratório já possui o transporte protegido que poderá
> consultar automaticamente a disponibilidade da SEFAZ-SP com o certificado
> ativo. Essa operação ainda não está exposta na tela e não aceita envio de
> nota, evento ou inutilização. Portanto, não há mudança de ação para o usuário.

> Revisão 1.13.0.65: o laboratório Web já consegue usar automaticamente um A1
> ativo para assinar e guardar a NF-e, sem pedir novamente arquivo ou senha. A
> etapa continua bloqueada sem todas as validações do certificado e ainda não
> transmite ao órgão fiscal. Não existe nova ação manual na tela.

> Revisão 1.13.0.64: quando o A1 instalado não trouxer toda a cadeia pública,
> o servidor tenta completá-la automaticamente com o pacote oficial da
> ICP-Brasil. O usuário não precisa localizar nem cadastrar certificados
> intermediários. Se a fonte oficial ou sua integridade não forem confirmadas,
> a situação continua **Instalado** e a emissão permanece bloqueada.

> Revisão 1.13.0.63: depois das verificações locais, o servidor consulta e
> valida automaticamente a LCR informada pela cadeia do A1. Se a autoridade não
> responder ou a evidência não for válida, a tela continua mostrando
> **Instalado**. O usuário não precisa configurar nem acionar essa consulta.

> Revisão 1.13.0.62: a validação automática do A1 já reconhece no backend as
> raízes de assinatura vigentes publicadas pela AC-Raiz/ITI. Isso não cria
> nenhuma configuração nova para o usuário. Sem confirmação vigente de
> revogação, o certificado permanece **Instalado** e não pode emitir.

> Revisão 1.13.0.61: depois de instalar o A1, o servidor tenta validá-lo sem
> exigir outra ação do usuário. Ele só mostra **Certificado ativo** quando todas
> as verificações fiscais e criptográficas forem aprovadas. Enquanto raiz
> ICP-Brasil ou revogação estiverem pendentes, o estado permanece **Instalado**.
> Esta preparação continua restrita ao laboratório local.

> Revisão 1.13.0.60: em **Ajustes > Empresa e notas > Certificado digital**, o
> Gestor ou Administrador pode adicionar ou substituir o A1. O cadastro da
> empresa precisa estar completo; o sistema confere o titular, descarta a senha
> depois da importação e mostra **Instalado** até as verificações técnicas
> concluírem. **Certificado ativo** só aparece quando o servidor confirmar a
> prontidão fiscal. A ativação atual existe somente no laboratório local.

> Revisão 1.13.0.59: a futura instalação do A1 passa a guardar somente uma cópia
> normalizada e cifrada no servidor; a senha digitada não é preservada. Depois
> da instalação, o estado é **Aguardando validação**. **Certificado ativo** só
> aparece após as verificações técnicas do servidor. Esta infraestrutura ainda
> está desligada no laboratório e não deve ser apresentada como instalação
> concluída.

> Revisão 1.13.0.58: o certificado é configurado uma única vez em **Ajustes >
> Certificado digital**. Na nota, use somente **Continuar emissão**; o servidor
> confere, assina e transmite automaticamente com o certificado ativo. Se ele
> estiver ausente ou inválido, a emissão é bloqueada e orienta a revisão dos
> Ajustes, sem solicitar novamente arquivo ou senha.

> Revisão 1.13.0.57: depois de **Continuar emissão**, a Central Fiscal informa
> se é necessário **Adicionar certificado** ou se a NF-e pode ser assinada.
> **Assinar NF-e** guarda o documento assinado no servidor, mas não o envia à
> SEFAZ. Sem certificado ativo, a assinatura permanece bloqueada.

> Revisão 1.13.0.56: após reservar série e número, use **Continuar emissão**
> nas ações da NF-e. A Gestão confere o documento definitivo e informa quando
> ele está pronto para a assinatura. O certificado ainda precisa ser adicionado
> e ativado; esta etapa não assina nem envia a nota.

> Revisão 1.13.0.55: na Central Fiscal do laboratório, uma NF-e que já passou
> pela validação dos dados apresenta **Emitir NF-e** nas ações. A confirmação
> vincula série e número no servidor local e mostra **Número reservado**; o
> certificado, a assinatura e o envio à SEFAZ continuam fora desta etapa.

> Revisão 1.13.0.54: no laboratório integrado, o usuário pode confirmar,
> separar e faturar um pedido do catálogo local, abrir a NF-e na Central Fiscal
> e usar **Validar dados fiscais**. A validação aplica a regra publicada e o XSD,
> mas não reserva número, usa certificado ou transmite para a SEFAZ.

> Revisão 1.13.0.53: em **Ajustes > Empresa e notas > Regras fiscais**, Gestor
> ou Administrador informa responsável e data, revisa as regras e confirma o
> cadastro e as obrigações tributárias no mesmo fluxo antes de publicar. A
> ausência de Custos e Precificação bloqueia apenas o catálogo, não os ajustes.

> Revisão 1.13.0.52: sem mudança operacional na tela. O laboratório confirmou
> com uma sessão real do Supabase local que somente usuário vinculado à empresa
> e autorizado consegue consultar ou publicar regras fiscais.

> Revisão 1.13.0.51: no laboratório integrado, **Ajustes > Empresa e notas >
> Regras fiscais** informa se existe uma versão publicada no servidor. Gestor
> ou Administrador autorizado pode solicitar a publicação; sem integração, a
> tela permanece bloqueada e não declara sucesso. O recurso continua local.

> Revisão 1.13.0.50: o laboratório do futuro Vendas já possui o contrato local
> para publicar uma matriz fiscal revisada por empresa. A preparação da NF-e
> usa somente essa versão e os dados fiscais congelados do produto. A tela de
> Ajustes ainda não publica no backend remoto e nenhum certificado ou SEFAZ foi
> utilizado.

> Revisão 1.13.0.49: no laboratório integrado do futuro Vendas, **Abrir emissão
> fiscal** cria somente o vínculo privado da NF-e. **Validar dados fiscais** é a
> etapa seguinte, para regra revisada, pré-XML e XSD; ela permanece bloqueada
> até a publicação server-side das regras e não usa número, certificado ou SEFAZ.

> Revisão 1.13.0.48: no laboratório integrado do futuro Vendas, **Ajustes >
> Equipe e acessos > Usuários e permissões** consulta a matriz pela sessão da
> Gestão. O token permanece fora do protótipo e a edição informa quando a
> persistência ainda não está habilitada. A escrita remota continua desligada.

> Revisão 1.13.0.47: no laboratório do futuro Vendas, os quatro tipos de
> usuário usam a mesma matriz entre tela e servidor. O Operador simples pode
> criar e salvar rascunhos, mas confirmação, separação, faturamento e efeitos de
> estoque dependem das permissões específicas liberadas pelo Gestor ou
> Administrador.

> Revisão 1.13.0.46: no laboratório local, o pedido confirmado pode ser ligado
> ao repositório comercial autenticado e avançar até separação ou faturamento.
> Cliente e itens são relidos no servidor; estoque permanece não integrado e a
> nota nasce apenas como rascunho, sem transmissão.

> Revisão 1.13.0.45: no laboratório local, **Preparar emissão** abre ou
> reencontra a emissão de uma NF-e persistida e pronta, após a Gestão confirmar
> sessão, empresa e permissão. A ação permanece em homologação e não reserva
> número, usa certificado, assina ou transmite.

> Revisão 1.13.0.44: as assinaturas nativas da Gestão passaram a distinguir App
> Store e Google Play, sem alterar o checkout web. A solicitação pública de
> exclusão definitiva da conta da Gestão fica em `/excluir-conta-gestao`; a
> exclusão de perfil no app continua separada e reversível por 30 dias.

> Revisão 1.13.0.43: no laboratório local, a Central Fiscal recebe da Gestão a
> lista autenticada de rascunhos e emissões da empresa ativa. O token permanece
> fora do protótipo; nenhum XML, certificado ou detalhe interno é exposto e não
> houve publicação de migração ou conexão real com a SEFAZ.

> Revisão 1.13.0.42: no laboratório local do futuro Vendas, a Central Fiscal
> atualiza a situação autenticada da emissão e libera XML ou DANFE somente
> quando o backend confirmar o arquivo e a permissão própria. A Gestão preserva sessão e empresa; o
> token não é entregue ao protótipo e a fila não possui ação no navegador.

> Revisão 1.13.0.41: a consulta autenticada e o executor interno da futura
> Central Fiscal foram preparados, mas seguem sem ligação com a tela, migração
> publicada, conector real ou acesso à SEFAZ.

> Revisão 1.13.0.40: recuperação sem retransmissão, `procNFe` e DANFE da
> futura NF-e foram validados somente no laboratório local. Não houve conexão
> externa, certificado real, API, tela ou migração publicada na Gestão Web.

> Revisão 1.13.0.39: lote, tentativa, protocolo e estados de retorno da futura
> NF-e foram validados apenas no laboratório local com transporte em memória.
> Não houve conexão externa, certificado real, API, tela ou migração publicada.

> Revisão 1.13.0.38: assinatura protegida, guarda imutável e estado `signed` da
> futura NF-e foram validados apenas no laboratório local com credencial
> sintética. Não houve certificado real, SEFAZ, API, tela ou migração publicada.

> Revisão 1.13.0.37: a montagem do XML definitivo e a prova efêmera de
> assinatura da futura NF-e foram validadas somente no laboratório local. Não
> houve certificado real, assinatura persistida, envio, API, tela ou migração
> publicada na Gestão Web.

> Revisão 1.13.0.36: a reserva interna de série e número da futura NF-e foi
> validada somente no PostgreSQL local e sem certificado, assinatura, envio,
> API, tela ou migração publicada na Gestão Web.

> Revisão 1.13.0.35: a preparação interna da NF-e foi validada somente no banco
> local do futuro Vendas, com regra tributária, pré-XML e XSD. O número não foi
> reservado e não houve certificado, assinatura, transmissão, tela, API ou
> migração publicada na Gestão Web.

> Revisão 1.13.0.34: a ligação interna entre rascunho comercial de NF-e e ciclo
> fiscal privado foi validada somente no PostgreSQL local. Ela cria apenas o
> estado inicial de homologação, sem número, XML, certificado, assinatura,
> transmissão, API, tela ou migração publicada na Gestão Web.

> Revisão 1.13.0.33: baixa de estoque, parcelas e rascunho fiscal do pedido
> foram validados somente no banco local do futuro Vendas. “Faturado” não
> significa nota emitida; não há tela, API ou migração publicada na Gestão Web.

> Revisão 1.13.0.32: confirmação, reserva, início da separação e cancelamento de
> pedido foram validados somente no PostgreSQL local do futuro Vendas. Não há
> tela, API, migração ou mudança operacional publicada na Gestão Web.

> Revisão 1.13.0.31.11: a cor do card Saldo do mês foi ajustada somente na
> Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.31.10: o refinamento visual dos botões Sugestões e Sair
> pertence somente à Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.31.09: o retorno visual dos botões Sugestões e Sair pertence
> somente à Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.31.08: as ações de Sugestões e Sair no rodapé do menu
> pertencem somente à Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.31.07: a preservação da despesa escolhida ao criar uma
> recorrência pertence somente à Gestão Mobile; sem alteração operacional na
> Gestão Web.

> Revisão 1.13.0.31.06: a identidade da aba do navegador passou a usar apenas
> o A oficial transparente. Não há alteração no uso da Gestão Web.

> Revisão 1.13.0.31.05: no menu lateral da Gestão Web, o título agora é
> somente **Menu**. As ações, permissões e ordem dos itens não foram alteradas.

> Revisão 1.13.0.31.04: o Laboratório de Marcas ganhou apenas a ação pública
> **Entrar**, que conduz à Gestão; o fluxo operacional da Gestão Web não muda.

> Revisão 1.13.0.31.03: a organização visual dos produtos inseridos no pedido
> pertence somente ao AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.31.02: a correção do recorte dos perfis disponíveis pertence
> somente à Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.31.01: o refinamento da sombra dos perfis disponíveis pertence
> somente à Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.31: a revisão visual do seletor de perfis pertence somente à
> Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.30: a página pública **Excluir conta da Gestão** explica como
> solicitar a exclusão definitiva da conta ou somente de dados específicos. A
> exclusão de apenas um perfil permanece disponível no app e preserva o login.

> Revisão 1.13.0.29: em **Controle de Ponto > Conformidade REP-P**, o Espelho
> e o comprovante baixado como PDF exibem um selo institucional de assinatura
> digital e orientam a validação em `validar.iti.gov.br`, sem expor o titular
> do certificado no texto visível. A impressão simples continua sem assinatura;
> o AFD traz no ZIP a orientação para validar o arquivo `.txt` com o `.p7s`.

> Revisão 1.13.0.28: em **Controle de Ponto > Funcionários**, as abas separam
> ativos e inativos. O desligamento leva a pessoa à lista de inativos e os
> relatórios e exportações continuam disponíveis para consultar seu histórico.

> Revisão 1.13.0.27: o desligamento no **Controle de Ponto** é decidido pelo
> cadastro próprio do funcionário. O vínculo técnico e o histórico ficam
> preservados, mas o CPF deixa de permitir novo acesso ao ponto.

> Revisão 1.13.0.26: ao inativar um funcionário do **Controle de Ponto**, o
> acesso e as novas marcações são encerrados primeiro pelos vínculos internos;
> o histórico permanece preservado mesmo se o bloqueio complementar do login
> estiver indisponível.

> Revisão 1.13.0.25: o popup de administração do **Controle de Ponto** foi
> ampliado no web para expor todas as abas do menu em telas amplas; em telas
> menores, ele continua adaptado à área visível.

> Revisão 1.13.0.24: no mobile, as seções da landing de **Gestão Financeira**
> ficam no menu ☰; no desktop, a navegação em linha permanece. Sem alteração
> operacional na Gestão Web.

> Revisão 1.13.0.23: o menu móvel da landing de **Gestão Financeira** escurece o
> conteúdo ao fundo e fecha ao tocar fora das ações; sem alteração operacional
> na Gestão Web.

> Revisão 1.13.0.22: a landing da **Gestão Financeira** ganhou no mobile o
> respiro entre o menu horizontal e o início do conteúdo; sem alteração
> operacional na Gestão Web.

> Revisão 1.13.0.21: os cartões das **Calculadoras** da landing preservam título
> e resumo na mesma posição ao serem selecionados; sem alteração operacional na
> Gestão Web.

> Revisão 1.13.0.20: na landing pública da **Gestão Financeira**, o menu voltou
> a incluir **Calculadoras**, levando às simulações financeiras abertas na mesma
> página; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.18: a exibição do nome real dos catálogos em PDF pertence à
> Divulgação do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.13.0.17: a filtragem de consignações ativas pertence ao
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.13.0.16: a leitura de PDFs em tela cheia pertence à Divulgação do
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.13.0.15: a ocultação do nome técnico dos arquivos pertence à
> Divulgação do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.13.0.14: a abertura progressiva e o cache por perfil pertencem aos
> aplicativos Gestão Mobile e AvantaVendas; sem impacto operacional na Gestão
> Web.

> Revisão 1.13.0.13: a padronização e a antecipação do carregamento pertencem
> à Gestão Mobile e ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.13.0.12: a confirmação imediata no botão de pedidos e recebimentos
> pertence ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.13.0.31: reserva, baixa pelo consumo real, liberação da sobra e
> estorno dos materiais da Ordem de Serviço foram validados somente no banco
> local. Não existe tela, API, migração ou estoque publicado na Gestão Web.

> Revisão 1.13.0.30: o ciclo de Ordem de Serviço foi validado somente no banco
> local, da conversão do orçamento à conclusão e aceite. Não existe tela, API,
> migração ou baixa de estoque publicada na Gestão Web.

> Revisão 1.13.0.29: orçamentos e pedidos do futuro Vendas ganharam persistência
> transacional apenas no laboratório local, com retratos históricos, numeração,
> idempotência e conversão única. Não há tela, API ou migração publicada e,
> portanto, não existe mudança operacional na Gestão Web.

> Revisão 1.13.0.28: o serviço server-side de clientes do futuro Vendas foi
> exercitado somente no banco local, com CNPJ, revisão fiscal, isolamento por
> empresa, versão concorrente e auditoria. Ele ainda não está ligado a uma tela,
> API publicada ou migração; portanto, não há mudança operacional na Gestão Web.

> Revisão 1.13.0.27: a persistência do futuro Vendas e Serviços foi estruturada
> e validada somente em Supabase local descartável. Clientes, operações, ordens
> de serviço, estoque, inventários e recebimentos ainda não estão disponíveis na
> Gestão Web; nenhuma migração remota ou item de menu foi publicado.

> Revisão 1.13.0.26: o laboratório local oculto `/vendas-lab` pode consumir,
> somente em desenvolvimento e com sessão válida, os itens ativos e publicados
> de Custos e Precificação pela tabela escolhida. A integração é somente leitura,
> não entrega custo interno, não integra estoque e não adiciona o Vendas ao menu.

> Revisão 1.13.0.25: o futuro módulo **Vendas e Serviços** agora possui contrato
> oficial e matriz granular na Gestão, ainda sem item de menu ou tela publicada.
> O SQL permanece como rascunho não aplicado; portanto, as permissões atuais da
> Gestão Web não mudaram operacionalmente.

> Revisão 1.13.0.24: sessão, empresa ativa e exceções de acesso do futuro Vendas
> foram validadas somente no laboratório separado. Nenhuma migração, tela ou
> permissão mudou na Gestão Web publicada; a rota fiscal permanece desligada.

> Revisão 1.13.0.23: armazenamento, acesso e restauração fiscal privados foram
> validados apenas no laboratório local do protótipo separado. A Gestão Web não
> ganhou rota pública, download fiscal nem conexão remota e segue sem impacto
> operacional.

> Revisão 1.13.0.22: retenção, backup e acesso auditado aos futuros arquivos
> fiscais foram estruturados apenas no protótipo separado, sem impacto
> operacional na Gestão Web e sem conexão remota.

> Revisão 1.13.0.21: a reconciliação da guarda fiscal foi validada apenas no
> laboratório do protótipo separado, sem impacto operacional na Gestão Web.

> Revisão 1.13.0.20: a guarda privada de XML e DANFE foi validada somente no
> laboratório do protótipo separado, sem mudança operacional na Gestão Web.

> Revisão 1.13.0.19: backup, restauração e concorrência do laboratório fiscal
> foram validados no protótipo separado, sem acesso ao banco remoto e sem impacto
> operacional na Gestão Web publicada.

> Revisão 1.13.0.18: o laboratório fiscal do protótipo separado foi executado em
> PostgreSQL/Supabase local, sem vínculo remoto e sem impacto operacional na
> Gestão Web publicada.

> Revisão 1.13.0.17: o adaptador transacional e a fila de recuperação fiscal
> foram preparados no protótipo separado de Vendas e Serviços, sem aplicar
> migração e sem impacto operacional na Gestão Web publicada.

> Revisão 1.13.0.16: o ciclo transacional e o rascunho privado de banco fiscal
> foram estruturados no protótipo separado de Vendas e Serviços, sem aplicar
> migração e sem impacto operacional na Gestão Web publicada.

> Revisão 1.13.0.15: o DANFE A4 foi estruturado e validado no protótipo separado
> de Vendas e Serviços; sem impacto operacional na Gestão Web publicada.

> Revisão 1.13.0.14: consulta de recibo/protocolo e montagem segura do `procNFe`
> foram estruturadas no protótipo separado de Vendas e Serviços; sem impacto
> operacional na Gestão Web publicada.

> Revisão 1.13.0.13: a preparação server-side da tentativa de NF-e foi
> estruturada no protótipo separado de Vendas e Serviços; sem impacto
> operacional na Gestão Web publicada.

> Revisão 1.13.0.12: o controle de séries, próximo número e inutilização foi
> estruturado no protótipo separado de Vendas e Serviços; sem impacto
> operacional na Gestão Web publicada nesta versão.

> Revisão 1.13.0.11: em **Custos e Precificação > Tabelas de preços**, criar
> uma tabela solicita somente o nome. **Exportar Excel** gera uma linha por
> produto com **Preço padrão** e uma coluna para cada tabela existente. Na
> importação, somente valores preenchidos são atualizados; células vazias e
> tabelas ausentes ficam preservadas. O formato anterior continua aceito.

> Revisão 1.13.0.10: em **Menu > Visual**, quem pode alterar a aparência pode
> usar **Restaurar visual padrão**. Após confirmar, a logo personalizada é
> removida, a cor retorna ao azul AvantaLab e o modo claro é ativado. Dados e a
> organização dos cards não são modificados. No **Balanço**, a coluna
> **Faturamento** mantém o verde sobre verde com contraste reforçado para mês e
> valor, também no modo noturno.

> Revisão 1.13.0.09: ao publicar materiais para a equipe, cada arquivo é
> validado antes do envio. Arquivos maiores que 100 MB são recusados com aviso
> em português, sem expor a resposta técnica do armazenamento.

> Revisão 1.13.0.08: o preparo e a tradução de falhas no compartilhamento de
> materiais pertencem ao AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.07: no **Balanço**, o mês atual do ano em exibição recebe um
> realce discreto e permanente em Despesas, Faturamento, A + B e Total em %.
> Passar o mouse sobre outro mês continua mostrando o destaque temporário; nos
> demais anos não há mês atual destacado.

> Revisão 1.13.0.06: a compactação do card Estoque consignado pertence ao
> AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.05: o novo padrão de avisos rápidos pertence ao AvantaVendas;
> sem alteração operacional na Gestão Web.

> Revisão 1.13.0.04: o botão de atualização localizada da Divulgação pertence
> ao AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.13.0.03: o preço de venda em **Custos e Precificação** pertence à
> operação interna da empresa. Em **Conteúdo AvantaVendas > Catálogo**, **Preço
> sugerido de revenda** é preenchido separadamente e define somente a sugestão
> enviada ao distribuidor no AvantaVendas. Alterar um não modifica o outro, e
> o custo interno da empresa não é exibido nem enviado nessa divulgação.

> Revisão 1.13.0.02: **Custos e Precificação > Tabelas de preços** permanece
> exclusivo da Gestão. O AvantaVendas não consulta essas tabelas nem as grava em
> clientes e pedidos; o pedido usa o preço sugerido recebido no catálogo e
> permite edição manual.

> Revisão 1.13.0.01: o reforço visual do processamento de lançamentos pertence
> à Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.13.0: em **Custos e Precificação > Tabelas de preços**, a tabela
> padrão acompanha o preço principal do produto. Use **Nova tabela** para criar
> políticas comerciais adicionais. **Exportar Excel** baixa Produtos e Tabelas
> de preços; depois dos ajustes, **Importar Excel** mostra uma prévia com novos
> produtos, atualizações e preços antes da confirmação. Não altere IDs nem datas
> técnicas da planilha. Se um produto mudou após a exportação, gere um arquivo
> novo para não sobrescrever trabalho mais recente.

> Revisão 1.12.1.18: o indicador durante alterações de lançamentos pertence à
> Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.17: a hierarquia das linhas do card de Despesas pertence à
> Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.16: o ajuste das duas linhas nas listas financeiras pertence à
> Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.15: a contenção de largura dos cards pertence à Gestão Mobile;
> sem alteração operacional na Gestão Web.

> Revisão 1.12.1.14: em **Gerenciar perfil** e no seletor de perfil, quem usa
> uma vaga de assinatura de outro perfil aparece como **Perfil vinculado**.
> O aviso informa que plano e vagas são administrados pelo perfil assinante,
> sem modificar o vínculo existente.

> Revisão 1.12.1.13: a retirada dos avisos redundantes de sucesso pertence ao
> AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.12: a correção do tom da seleção múltipla pertence ao
> AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.11: o refinamento visual da seleção múltipla pertence ao
> AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.10: o reposicionamento do botão de seleção múltipla pertence
> ao AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.09: a seleção múltipla de materiais pertence ao
> AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.08: a retirada da troca direta entre aplicativos pertence à
> Gestão Mobile e ao AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.07: em **Sistemas > Conteúdo AvantaVendas > Divulgação**, ao
> abrir uma pasta, os materiais já publicados e as subpastas aparecem na
> própria visão da pasta. Use **Voltar** para subir um nível; **Adicionar**
> mantém o mesmo envio de fotos, vídeos e PDFs já utilizado anteriormente.

> Revisão 1.12.1.06: a adaptação do card **Novo lançamento** ao teclado Android
> é exclusiva da Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.05: a correção da gravação de pedidos pertence ao
> AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.12.1.04: o AvantaProjetos passa a refletir a cor primária do perfil
> e a geometria oficial dos quadrantes. É um ajuste visual, sem alteração no
> cadastro, compartilhamento ou operação dos projetos.

> Revisão 1.12.1.03: o AvantaVendas passa a sinalizar visualmente o
> processamento do vínculo financeiro; sem outra alteração operacional na
> Gestão Web.

> Revisão 1.12.1.02: o AvantaVendas passa a enviar integralmente os valores
> recebidos ou vendidos conforme a escolha da conta; sem outra alteração
> operacional na Gestão Web.

> Revisão 1.12.1.01: a primeira vinculação financeira do AvantaVendas pode
> começar no período escolhido; sem outra alteração operacional na Gestão Web.

> Revisão 1.12.1: os resultados recebidos do AvantaVendas são identificados
> pela conta de vendas de origem; sem outra alteração operacional na Gestão Web.

> Revisão 1.12.0: **Custos e Precificação** está disponível em **Menu >
> Módulos** para perfis Empresa. Gestor Master ou Administrador instala sem
> cobrança no Business Pro ou em cortesia vigente; no Business, contrata por
> R$ 14,90 ao mês. O módulo abre em página própria e reúne Produtos e serviços,
> Insumos e recursos, Simulações e Histórico de custos. O cadastro de produtos
> e serviços é o mesmo do Catálogo: itens novos começam Em estudo, só aparecem
> para divulgação quando forem disponibilizados e a inativação vale nos dois
> locais. Operador Completo edita e Operador Simples somente visualiza. Remover
> ou cancelar o módulo preserva todos os cadastros e históricos.

> Revisão 1.11.0.01: ao editar um lançamento previsto para hoje ou uma data
> passada, escolha **Salvar previsto** ou **Confirmar hoje**. Confirmar
> efetiva somente aquela ocorrência; despesas fixas e recorrentes continuam
> programadas nos próximos períodos.

> Revisão 1.11.0: o card de estoque foi adicionado ao Dashboard do
> AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.10.2.02: o seletor de data do estoque foi padronizado no
> AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.10.2.01: o formato visual da data de estoque foi refinado no
> AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.10.2: o AvantaVendas passou a registrar a data própria das
> movimentações de estoque; sem alteração operacional na Gestão Web.

> Revisão 1.10.1: Aprovações do Vendas no Web usa os vínculos por conta de
> vendas e pedidos novos avisam gestores pelo sininho e push permitido.

> Revisão 1.10.0.03: a visibilidade de vínculos de conteúdo migrados pertence
> à Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.10.0.02: a consulta dos vínculos de conteúdo por conta de vendas
> pertence à Gestão Mobile; sem alteração operacional na Gestão Web.

> Revisão 1.10.0.01: a correção da lista de vínculos de conteúdo pertence à
> Gestão Mobile; sem alteração operacional na Gestão Web.
>
> Revisão 1.10.0: aprovações do Vendas Mobile também ficaram disponíveis na
> Gestão Mobile; sem alteração operacional na Gestão Web.
>
> Revisão 1.9.0.15: espaçamento no seletor de perfis é um ajuste visual do
> AvantaVendas; sem alteração operacional na Gestão Web.
>
> Revisão 1.9.0.14: mensagem pronta no compartilhamento de comprovantes é um
> ajuste do AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.9.0.13: a proteção de lançamentos por perfil ativo pertence ao
> AvantaVendas; sem alteração operacional na Gestão Web.

> Revisão 1.9.0.12: em **Escolher capa**, **Enviar capa privada** não publica o
> arquivo no AvantaVendas; **Imagens já publicadas** continuam disponíveis aos
> vendedores. A capa da pasta usa proporção 16:10.

> Revisão 1.9.0.11: em **Conteúdo AvantaVendas > Divulgação**, fotos, vídeos e
> PDFs podem ser arrastados para a pasta ativa. A imagem adicionada apenas como
> capa fica restrita à pasta e não aparece como material no AvantaVendas.

> Revisão 1.9.0.10: o cabeçalho do Dashboard do AvantaVendas ganhou acesso
> rápido à troca de perfil; sem alteração operacional na Gestão Web.

> Revisão 1.9.0.09: os atalhos públicos de cadastro voltaram ao rótulo
> “Começar grátis”; sem alteração operacional na Gestão Web.

> Revisão 1.9.0.08: a composição aprovada do cabeçalho público de planos foi
> aplicada; sem alteração operacional na Gestão Web.

> Revisão 1.9.0.07: a landing ganhou um modo local de ajuste dos planos; sem
> alteração operacional na Gestão Web.

> Revisão 1.9.0.06: o cabeçalho público de planos foi realinhado; sem alteração
> operacional na Gestão Web.

> Revisão 1.9.0.05: a faixa pública de planos teve sua leitura em linha
> refinada; sem alteração operacional na Gestão Web.

> Revisão 1.9.0.04: a área pública de planos foi condensada; sem alteração
> operacional na Gestão Web.

> Revisão 1.9.0.03: o cabeçalho público de planos foi reorganizado; sem
> alteração operacional na Gestão Web.

> Revisão 1.9.0.02: a faixa pública da Gestão Financeira foi compactada
> visualmente; sem alteração operacional na Gestão Web.

> Revisão 1.9.0.01: a navegação pública da Gestão Financeira foi reorganizada
> horizontalmente; sem alteração operacional na Gestão Web.

> Revisão 1.9.0: a landing pública foi separada entre Laboratório de Marcas e
> Gestão Financeira; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.15: o painel visual do Laboratório de Marcas foi ampliado para
> acomodar arcos mais altos; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.14: os arcos visuais do Laboratório de Marcas foram
> reposicionados acima dos marcos; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.13: os arcos visuais do Laboratório de Marcas foram afastados
> dos marcos e dos textos; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.12: a trajetória visual do Laboratório de Marcas passou a
> percorrer o espaço abaixo dos marcos; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.11: a trajetória visual do Laboratório de Marcas foi vinculada
> à grade dos quatro marcos; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.10: a trajetória visual do Laboratório de Marcas foi alinhada
> à base de cada marco; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.09: a explicação e a trilha visual do Laboratório de Marcas
> foram unificadas em quatro etapas; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.08: a progressão visual dos saltos do Laboratório de Marcas
> foi suavizada; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.07: as setas da trilha visual do Laboratório de Marcas foram
> centralizadas nos saltos; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.06: as setas da trilha visual do Laboratório de Marcas foram
> reforçadas; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.05: os saltos tracejados do Laboratório de Marcas foram
> refinados; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.04: as setas da trilha visual do Laboratório de Marcas foram
> reposicionadas; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.03: a trilha visual do Laboratório de Marcas passou a usar
> saltos curvos decorativos; sem alteração operacional na Gestão Web.

> Revisão 1.8.5.02: a trilha visual do Laboratório de Marcas foi refinada;
> sem alteração operacional na Gestão Web.

> Revisão 1.8.5.01: a trilha visual do Laboratório de Marcas foi reorganizada;
> sem alteração operacional na Gestão Web.

> Revisão 1.8.5: a landing pública passou a apresentar o Laboratório de Marcas
> e a Gestão Financeira como frentes distintas; sem alteração operacional na
> Gestão Web.

> Revisão 1.8.4.01: a seção pública **Nossos apps** passou a mostrar capturas
> reais dos dashboards dos aplicativos; sem alteração de orientação operacional.

> Revisão 1.8.4: a landing pública ganhou **Nossos apps**, com os aplicativos
> AvantaLab Gestão e AvantaVendas, links oficiais da App Store e indicação de
> Google Play em breve. A seção também pode ser aberta pelo menu superior.

> Revisão 1.8.3.01: refinamento visual do texto **Jornada Concluída** no botão
> central do Controle de Ponto; sem impacto operacional.

> Revisão 1.8.3: em **Assinatura**, um perfil que consome a vaga de outro pode
> escolher **Criar assinatura própria**. A confirmação abre os planos sem
> interromper o acesso compartilhado; a desvinculação e a devolução da vaga só
> acontecem após o pagamento confirmado. Checkout abandonado mantém o vínculo.
> Perfis em cortesia exigem revogação administrativa, e módulos avulsos ainda
> cobrados no plano de origem precisam ter a renovação cancelada antes.

> Revisão 1.8.2: criação de perfil e consumo de vaga são confirmados juntos no
> servidor. Um perfil que apenas recebeu assinatura compartilhada não repassa a
> quota nem gerencia o plano de origem; a tela de Assinatura orienta a acessar o
> perfil assinante. O Pessoal Premium da App Store reconhece até três perfis
> pessoais do próprio login. Repetir uma contratação reutiliza a cobrança
> pendente e não gera assinatura duplicada. Teste vigente não é encurtado ao
> iniciar ou cancelar o checkout. Cupons não substituem assinatura recorrente.
> Ao migrar Business para Business Pro, módulos avulsos deixam de renovar para
> evitar cobrança duplicada.

> Revisão 1.8.1: em **Gerenciar perfis > Criar novo perfil**, a Gestão verifica
> o plano e mostra as vagas disponíveis. Business e Business Pro usam uma vaga
> da assinatura do perfil atual sem abrir outro teste; somente Gestor Master e
> Administrador podem consumir essa quota. Se não houver assinatura elegível ou
> a quota estiver cheia, um novo perfil Empresa segue independente e oferece
> teste ou contratação própria. Perfis anteriores sem cobrança própria podem ser
> reconciliados nas vagas do mesmo Gestor Master, preservando o histórico.

> Revisão 1.8.0.05: a página experimental de créditos e suas operações de
> carteira e consulta foram retiradas da publicação. A busca de CNPJ usada na
> criação de perfis continua disponível e sem alteração operacional.

> Revisão 1.8.0.04: sugestões e dúvidas continuam registradas e acompanhadas
> pelo painel `/admin`. Foi retirada somente uma antiga notificação interna por
> SMS, sem alterar validação de telefone, cadastro ou recuperação de senha.

> Revisão 1.8.0.03: Recebimentos Presenciais usa exclusivamente os dados reais
> e persistidos do perfil. A retirada interna do antigo modo demonstrativo não
> altera cadastros, lançamentos, comprovantes nem o fluxo operacional.

> Revisão 1.7.3.37: correção técnica nas rotas do Controle de Ponto, sem
> alteração operacional na Gestão Web.

> Revisão 1.8.0.02: o aviso de acesso já existente recebeu destaque visual; o
> fluxo e a orientação funcional de compartilhamento permanecem os mesmos.

> Revisão 1.8.0.01: projetos compartilhados por diferentes contas aparecem no
> mesmo painel de **Projetos**, com empresa de origem e permissão no card. Quem
> não instalou o módulo vê um único botão **Projetos** com o selo
> **Compartilhado** e acessa somente o conteúdo recebido; não pode criar,
> importar ou administrar projetos. Ao instalar, o mesmo botão assume o modo
> completo e mantém os cards compartilhados. O link abre o projeto exato e o
> retorno preserva o perfil do convidado. Um membro ativo da própria empresa
> não recebe compartilhamento redundante; prevalece a hierarquia da equipe.

> Revisão 1.7.3.36: os campos e a ação de **Compartilhar acesso** ficaram cerca
> de 25% mais baixos visualmente, preservando alinhamento e área interativa. Em
> **Trocar perfil**, a atualização da lista também não altera mais a escolha.

> Revisão 1.7.3.35: **Compartilhar acesso** identifica o projeto da lista e
> bloqueia novo cadastro do mesmo e-mail naquele projeto. Se o vínculo já
> existir, ele é reapresentado sem alteração; a mesma pessoa pode participar de
> outros projetos normalmente. Módulos e protótipos em desenvolvimento foram
> isolados do build oficial, sem alterar os módulos ativos.

> Revisão 1.7.3.34: em **Compartilhar acesso**, a verificação fica ao lado do
> tipo de acesso, o X fecha e descarta o formulário, e campos, avisos e pessoas
> listadas usam uma composição mais compacta. A cópia é confirmada no botão.

> Revisão 1.7.3.33: **Copiar link** usa a área de transferência nativa do
> Chrome com limite de tempo e não confirma o método legado que podia retornar
> sucesso sem copiar.

> Revisão 1.7.3.32: corrigida a chamada do botão **Copiar link**, que agora
> executa a cópia e apresenta o retorno correspondente no próprio modal.

> Revisão 1.7.3.31: **Copiar link** usa a seleção visível do campo e o comando
> nativo validado no Chrome, evitando bloqueio sem retorno da área de
> transferência assíncrona.

> Revisão 1.7.3.30: o aviso de cópia só aparece após o sistema confirmar o
> conteúdo da área de transferência. Sem confirmação, o link é selecionado
> para cópia manual com **⌘C** ou **Ctrl+C**.

> Revisão 1.7.3.29: **Copiar link** só confirma a cópia após uma operação bem
> sucedida; o sistema prioriza a compatibilidade com o navegador em uso.

> Revisão 1.7.3.28: ao usar **Copiar link**, o modal confirma **Conteúdo
> copiado** e mantém uma orientação visível para o envio do link.

> Revisão 1.7.3.27: em **Pessoas com acesso**, use **Ver link** para membros
> autorizados ou **Novo link** para um convite pendente. Um novo convite
> invalida o link pendente anterior.

> Revisão 1.7.3.26: o modal **Compartilhar acesso** passou a usar o cabeçalho
> institucional colorido do AvantaLab; o fluxo operacional não mudou.

> Revisão 1.7.3.25: em **Compartilhar acesso**, a seção **Pessoas com acesso**
> mostra quem recebeu o projeto, o tipo de acesso e permite revogá-lo após
> confirmação.

> Revisão 1.7.3.24: ao copiar um link de compartilhamento de Projeto, o botão
> confirma **Link copiado** e informa que ele está pronto para encaminhar.

> Revisão 1.7.3.23: em Projetos, use **Compartilhar acesso** no menu de um
> projeto. O sistema verifica o e-mail, libera contas existentes ou gera um
> link copiável; o gestor pode revogar o acesso a qualquer momento.

> Revisão 1.7.3.22: backup e pontos de restauração por perfil são exclusivos
> do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.7.3.21: reorganização da sala exclusiva do AvantaVendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.7.3.20: ajuste visual exclusivo do card de cliente no
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.7.3.19: ajuste do formulário de cliente exclusivo do
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.7.3.18: em **Meus perfis > Criar novo perfil**, quem possui vaga
> em uma assinatura Business ou Business Pro cria o perfil usando o mesmo plano
> imediatamente, sem novo teste ou contratação. A tela informa as vagas que
> restarão; ao atingir o limite, orienta a contratação ou upgrade. Um perfil
> que recebeu uma vaga não pode criar outra pela mesma assinatura.

> Revisão 1.7.3.16: o **Balanço Geral** é somente de consulta. Para registrar
> uma receita, abra o mês ou use **Registrar entradas** no Dashboard; dia,
> origem e valor são obrigatórios. Referências históricas sem lançamento são
> preservadas como **Receita registrada anteriormente**.

> Revisão 1.7.3.15: remoção de texto exclusiva do Menu da Gestão Mobile; sem
> impacto operacional na Gestão Web. O ajuste do gesto de atualização da
> Divulgação também é exclusivo do AvantaVendas.

> Revisão 1.7.3.14: releitura de materiais exclusiva da interface do
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.7.3.13: inclusões, edições, exclusões e confirmações de receitas ou
> despesas exibem uma camada bloqueante com a operação em andamento até a
> resposta do servidor, impedindo solicitações repetidas.

> Revisão 1.7.3.12: em **Conteúdo AvantaVendas > Divulgação**, **Adicionar** abre
> diretamente o seletor de arquivos do computador ou aparelho, sem o menu
> intermediário. A mesma seleção aceita fotos, vídeos e PDFs.

> Revisão 1.7.3.12: ajuste de navegação exclusivo da Divulgação no
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.7.3.11: avisos de validação exclusivos do AvantaVendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.7.3.10: ajustes de perfis e compartilhamento exclusivos do
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.7.3.09: refinamento visual exclusivo do Menu da Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.7.3.08: ajuste de visibilidade exclusivo do Menu da Gestão Mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.7.3.07: reorganização exclusiva do Menu da Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.7.3.06: receitas passam a ser cadastradas somente como entradas
> individuais. O Balanço Geral exibe o faturamento consolidado sem permitir a
> edição direta de um total mensal. Valores manuais antigos são preservados
> como **Receita registrada anteriormente**.

> Revisão 1.7.3.05: preferências do perfil só são salvas depois de uma leitura
> válida. Em instabilidade, a Gestão preserva o que já está registrado e não
> trata o perfil como primeiro acesso; a conclusão do Tutorial acompanha a
> conta.

> Revisão 1.7.3.04: a limpeza de cobrança da cortesia também alcança
> assinaturas antigas registradas no histórico técnico; sem nova ação na tela.

> Revisão 1.7.3.03: ao liberar um perfil por **cortesia**, o sistema encerra
> cobranças abertas e remove os avisos de assinatura. O cadastro do cliente no
> provedor de pagamento é preservado para uma futura contratação.

> Revisão 1.7.3.02: contas compartilháveis e ajuste visual de perfil são
> exclusivos do AvantaVendas; sem impacto na Gestão Web.

> Revisão 1.7.3.01: ajuste exclusivo da edição de pagamentos no AvantaVendas;
> sem impacto na Gestão Web.

> Revisão 1.7.3: evolução das vendas e ajuste dos filtros são exclusivos do
> Dashboard do AvantaVendas; sem impacto na Gestão Web.

> Revisão 1.7.2.34: ajuste exclusivo da distribuição dos controles do filtro
> do Dashboard no AvantaVendas; sem impacto na Gestão Web.

> Revisão 1.7.2.33: ajuste exclusivo da largura dos filtros do Dashboard no
> AvantaVendas; sem impacto na Gestão Web.

> Revisão 1.7.2.32: ajuste exclusivo da organização visual do Dashboard no
> AvantaVendas; sem impacto na Gestão Web.

> Revisão 1.7.2.31: na Gestão Web, o menu também pode ser aberto pela etiqueta
> **Menu** na lateral esquerda. Em gráficos, passe o mouse sobre um mês para
> destacá-lo e ler seus valores com mais contraste; sem mudança nas informações
> ou ações disponíveis.

> Revisão 1.7.2.30: ajuste visual do botão **Início** para o azul-marinho de
> marca do AvantaLab no modo claro; sem alteração de operação.

> Cortesias empresariais seguem o plano selecionado pelo administrador, e
> aprovações comerciais atualizam o vínculo automaticamente.

> Revisão 1.7.2.29: ajuste visual do ícone SVG no botão **Início** do
> AvantaProjetos Web; sem alteração de operação.

> Revisão 1.7.2.28: ajuste visual do botão **‹ Início** no AvantaProjetos Web;
> sem alteração de operação.

> Revisão 1.7.2.27: no menu flutuante de um card do mapa, passe o mouse sobre
> uma ação para ver a dica visual padronizada do AvantaLab.

> Revisão 1.7.2.26: os avatares de participantes mostram o nome completo no
> tooltip em todas as visualizações de cards: projetos, mapa e kanban.

> Revisão 1.7.2.25: nos cards de projeto, passe o mouse sobre o avatar de um
> participante para ver seu nome completo.

> Revisão 1.7.2.24: em **Detalhes** do card, a seleção de **Responsáveis** usa
> checkboxes compactos, alinhados aos avatares e nomes.

> Revisão 1.7.2.23: em **Editar projeto**, a seção **Participantes** também
> permite cadastrar uma pessoa e incluí-la diretamente no projeto.

> Revisão 1.7.2.22: use **Participantes**, ao lado de **Novo projeto**, para
> cadastrar ou excluir pessoas antes de associá-las a projetos e tarefas.

> Revisão 1.7.2.21: no mapa, os cards podem ser movidos para cima da origem,
> além das demais direções disponíveis.

> Revisão 1.7.2.20: após concluir o ajuste das cores pré-definidas do mapa,
> cada bolinha mantém a visualização da cor escolhida e pode aplicá-la ao card.

> Revisão 1.7.2.19: a área de cores do card selecionado reúne as pré-definidas
> e a cor livre no mesmo bloco visual.

> Revisão 1.7.2.18: com um card selecionado, use **Cores pré-definidas** para
> aplicar uma cor salva; escolha **Ajustar** para definir as cinco bolinhas.

> Revisão 1.7.2.17: a descrição informada nos detalhes de um card também aparece
> diretamente no card do mapa.

> Revisão 1.7.2.16: no mapa, os cards podem ser arrastados livremente para a
> esquerda; o limite de posicionamento continua apenas no topo.

> Revisão 1.7.2.15: depois de definir o sucessor, confirme a remoção pelo botão
> **Excluir**.

> Revisão 1.7.2.14: na escolha de sucessor, use o campo destacado **Card
> sucessor** para selecionar o nó que herdará a posição.

> Revisão 1.7.2.13: ações de exclusão no AvantaProjetos usam fundo vermelho e
> texto branco, inclusive no modo claro.

> Revisão 1.7.2.12: ao excluir um nó com conectados, escolha **Excluir somente
> este nó** para indicar o sucessor na etapa seguinte, ou **Excluir nós
> conectados** para remover a sequência inteira.

> Revisão 1.7.2.11: ao excluir um nó, use **Excluir somente este nó**. Os
> dependentes permanecem; se houver mais de um card seguinte, escolha qual
> assume a posição na sequência.

> Revisão 1.7.2.10: durante o arraste de um card no mapa, as linhas de conexão
> acompanham sua posição imediatamente.

> Revisão 1.7.2.09: para desfazer uma relação, clique na linha entre os cards
> e escolha **Remover relação**. Os cards não são apagados; use **Desfazer**
> caso queira recuperar a conexão.

> Revisão 1.7.2.08: use **‹ Início** para retornar do AvantaProjetos à Gestão
> do mesmo perfil.

> Revisão 1.7.2.07: o seletor de modo escuro volta à posição lateral no card
> de **Ajustes**, em formato compacto **ON/OFF** com chave verde ou vermelha.

> Revisão 1.7.2.06: no card de **Ajustes**, o seletor de modo escuro usa uma
> faixa própria, mantendo o rótulo e o controle visíveis em qualquer estado.

> Revisão 1.7.2.05: o seletor de modo escuro do AvantaProjetos responde na
> hora e confirma a gravação em segundo plano; se houver falha, retorna ao
> estado anterior e informa o ocorrido.

> Revisão 1.7.2.04: AvantaProjetos abre com a tela de carregamento institucional.
> Gestor Master e Administrador usam o ícone de **Ajustes** para ativar ou
> desativar o modo escuro do perfil; a escolha vale também para o AvantaLab.
> No foco do Mapa, toda a tela continua disponível para navegação.

> Revisão 1.7.2.03: o AvantaProjetos usa somente o modo claro ou escuro salvo
> em **Menu > Visual** do perfil, nunca a aparência automática do computador.
> No Mapa de um projeto, **Ocultar cabeçalho** amplia a área de trabalho e
> **Exibir cabeçalho** permanece flutuante no canto superior direito.

> Revisão 1.7.2.02: em **Menu > Módulos**, Gestor Master e Administrador ativos
> visualizam o catálogo mesmo quando foram adicionados posteriormente ao perfil.
> Se o carregamento falhar, use **Tentar novamente**; o erro não significa que o
> perfil ficou sem módulos.

> Revisão 1.7.2.01: título, descrição, **Importar** e **Novo Projeto** ficam na
> mesma linha no cabeçalho principal do AvantaProjetos; sem mudança no fluxo
> operacional.

> Revisão 1.7.2: em **Conteúdo para a equipe > Divulgação**, selecione uma pasta
> principal e use **Escolher capa**. A capa pode ser escolhida entre as imagens
> de qualquer subpasta e pode ser trocada ou removida quando necessário.

> Revisão 1.7.1.04: renderização centralizada de PDF aplicada ao AvantaVendas;
> sem impacto operacional na Gestão Web.

> Revisão 1.7.1.03: centralização da pré-visualização de PDF aplicada ao
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.7.1.02: o topo do AvantaProjetos passou a usar o logo oficial do
> AvantaLab e o nome do perfil logo abaixo; sem mudança no fluxo operacional.

> Revisão 1.7.1.01: perfis empresariais com cortesia vigente liberam todos os
> módulos sem cobrança. Gestor Master ou Administrador ainda escolhe quais
> módulos instalar ou remover em **Menu > Módulos**.

> Revisão 1.7.1: **Projetos** é um módulo Web instalado em Menu > Módulos.
> Business contrata por R$ 14,90/mês e Business Pro instala sem cobrança
> adicional. Gestor e Administrador instalam ou removem; Operador Completo opera
> todo o conteúdo; Operador Simples somente visualiza. O botão Projetos abre uma
> tela total na mesma guia e **Voltar ao AvantaLab** retorna à Gestão. Cancelar a
> assinatura mantém o acesso até o fim pago; remover nunca apaga os dados.

> Revisão 1.7.0.28.12: exclusão reversível de perfil aplicada somente à Gestão
> Mobile; a Gestão Web não exibe essa ação.

> Revisão 1.7.0.28.11: otimização visual das ondas da sala do AvantaVendas;
> sem impacto operacional na Gestão Web.

> Revisão 1.7.0.28.10: fallback de limpeza do selo aplicado somente ao app
> iOS da Gestão; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.28.09: sincronização do selo de avisos aplicada somente à
> Gestão Mobile/iOS; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.28.08: redesign visual do comprovante de pedido compartilhado
> no AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.28.07: redesign visual do comprovante compartilhado no
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.28.06: listagem completa de funcionários aplicada ao card de
> Controle de Ponto da Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.28.05: ao salvar a edição de um aporte, a linha fecha sem exibir
> o aviso redundante **Aporte atualizado**. Erros continuam sendo informados;
> sem mudança na gravação ou na exclusão.

> Revisão 1.7.0.28.04: a edição do aporte permanece na própria linha e agora
> segue a composição compacta dos lançamentos de despesas, sem sobrepor campos
> nem ocultar as ações. Não houve mudança nas regras de salvar ou excluir.

> Revisão 1.7.0.28.03: em **Caixinha/Reserva financeira → Ver lançamentos**,
> clicar em um aporte transforma diretamente a própria linha em edição. Nela é
> possível salvar, cancelar ou excluir; a exclusão confirmada remove também a
> despesa vinculada ao aporte.

> Revisão 1.7.0.28.01: correção de foco restrita ao chat da Ava no
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.28: estabilidade do teclado aplicada ao chat mobile da Ava;
> sem impacto operacional na Gestão Web.

> Revisão 1.7.0.26: a Ava prioriza números disponíveis ao responder perguntas
> de resultado; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.25: reforço no retorno da pesquisa do AvantaVendas; sem impacto
> operacional na Gestão Web.

> Revisão 1.7.0.24: ajuste de pesquisa aplicado ao AvantaVendas; sem impacto
> operacional na Gestão Web.

> Revisão 1.7.0.23: correção do teclado aplicada ao modal do AvantaVendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.7.0.22: na aba **Facial** do Controle de Ponto, desmarcar um
> funcionário habilitado revela **Salvar alterações**. A remoção é imediata,
> reduz a próxima mensalidade e não abre pagamento; ao remover o último
> funcionário, o adicional é desativado imediatamente. Configurações antigas
> também podem ser reduzidas sem exigir uma nova contratação.

> Revisão 1.7.0.21: correção restrita à rolagem por toque do Menu da Gestão
> Mobile no Chrome para iPhone; sem mudança operacional na Gestão Web.

> Revisão 1.7.0.20: reversão restrita às tentativas de viewport da Gestão
> Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.19: reversão visual restrita à navegação da Gestão Mobile no
> navegador; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.18: correção restrita ao Menu da Gestão Mobile no navegador;
> sem impacto operacional na Gestão Web.

> Revisão 1.7.0.17: correção restrita à rolagem do Menu da Gestão Mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.7.0.16: correção restrita ao Menu da Gestão Mobile no navegador;
> sem impacto operacional na Gestão Web.

> Revisão 1.7.0.15: correção restrita à inicialização da Gestão Mobile no
> navegador; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.14: correção restrita ao Menu da Gestão Mobile no navegador;
> sem impacto operacional na Gestão Web.

> Revisão 1.7.0.13: em **Conteúdo para a equipe > Divulgação**, o gestor pode
> incluir PDFs nas pastas. O Google Cloud cria a capa da primeira página; o arquivo
> fica disponível para leitura e compartilhamento no Vendas Mobile. No iPhone,
> retornar do Arquivos mantém o conteúdo aberto e o seletor em português. PDFs
> enviados antes da correção da capa são processados novamente.

> Revisão 1.7.0.06: login, cadastro e preparação do perfil financeiro passam a
> recuperar o formulário em falhas inesperadas, sem manter ações bloqueadas.

> Revisão 1.7.0.05: tratamento adicional da criação inicial aplicado apenas à
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.7.0.04: correção do fluxo de criação inicial aplicada à Gestão
> Mobile; a Gestão Web já utilizava a rota segura e não muda operacionalmente.

> Revisão 1.7.0.03: a barra inferior da tela do funcionário fica ancorada na base
> quando houver espaço e mantém separação segura do card anterior em telas
> menores; sem mudança nas ações Sair, Ajustes ou Ajuda.

> Revisão 1.7.0.02: o fundo institucional também passou a compor a tela principal
> do funcionário, atrás da ação **Bater ponto**; sem alteração no registro ou nas
> validações de localização e reconhecimento facial.

> Revisão 1.7.0.01: o fundo da validação facial foi fixado em uma camada própria,
> preservando as ondas inferiores durante preparação e captura; sem impacto
> operacional nas regras de ponto ou reconhecimento.

> Revisão 1.7.0: a aba **Facial** apresenta resumo e cobrança separada de
> R$ 14,90 por funcionário ao mês. A seleção inicial só libera o cadastro após
> confirmação da Asaas. Inclusões no ciclo têm cobrança proporcional; remoções
> são imediatas e reduzem a próxima mensalidade, sem devolução ou crédito. Ao
> cancelar, o gestor escolhe usar até o fim do período pago ou desativar agora.
> Atrasos têm três dias de carência e nunca impedem a marcação comum do ponto.
> O fundo institucional da validação facial foi atualizado sem alterar o fluxo
> operacional, as permissões ou as regras de captura.

> Revisão 1.6.2.01: o cadastro facial conserva uma única imagem de referência
> no armazenamento privado. A captura realizada em cada batida é comparada em
> memória e descartada; permanecem somente os dados da verificação e do ponto.
> Para salvar a ativação, o gestor confirma que os funcionários serão informados
> e que a empresa possui procedimento alternativo para falhas na validação.

> Revisão 1.6.2: a validação facial do `/ponto` orienta o funcionário antes de
> abrir a câmera, mostra instruções simples durante a captura e aguarda o toque
> em **Continuar** após o sucesso. Só então a marcação pendente é registrada. Em
> caso de falha, **Tentar novamente** prepara uma nova sessão segura; **Cancelar**
> retorna ao ponto sem registrar.

> Revisão 1.6.1.157: em `/ponto`, **Ajuda** abre um guia interno com os passos
> de localização, registro, confirmação, facial e consulta do histórico. O X
> fecha o guia e devolve o funcionário à tela de ponto.

> Revisão 1.6.1.156: refinamento exclusivamente visual no `/ponto`; o painel
> cabe na altura do celular, mantém somente **Ajustes** no rodapé e preserva
> todas as ações, validações e regras de registro já documentadas.

> Revisão 1.6.1.155: no `/ponto`, a ação **Bater ponto** ocupa o centro do
> painel do funcionário. Entrada, refeição, retorno e saída aparecem ao redor,
> com estados concluído, próximo e pendente; localização, facial, registros,
> ajustes, ajuda e saída continuam acessíveis em cards e atalhos compactos.

> Revisão 1.6.1.154: ajuste de cabeçalho aplicado somente ao novo lançamento
> da Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.153: centralização da pílula de período aplicada somente ao
> novo lançamento da Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.152: seletor de período do novo lançamento aplicado somente à
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.151: estabilização do teclado aplicada somente ao novo pedido
> do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.150: durante a captura facial, Ponto seguro ocupa o platô e
> Cancelar permanece disponível durante toda a verificação.

> Revisão 1.6.1.149: ajuste do teclado aplicado somente ao card de novo pedido
> do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.148: na captura facial, a etiqueta Ponto seguro permanece
> inteira no platô, inclusive em telas estreitas.

> Revisão 1.6.1.147: o card AWS em `/admin` > **Consumo** foi simplificado para
> custos, créditos e indicadores faciais úteis, sem métricas técnicas do
> CloudWatch nem franquias específicas do Free Tier na apresentação. A coleta
> técnica permanece disponível internamente.

> Revisão 1.6.1.146: em `/admin` > **Consumo**, o card **AWS · Reconhecimento
> facial** reúne custo oficial do mês, créditos e Free Tier quando disponíveis,
> métricas do Rekognition e indicadores registrados pelo AvantaLab. A consulta
> é administrativa e mantém as credenciais somente no servidor.

> Revisão 1.6.1.145: a conclusão do Tutorial e a organização dos cards do
> resumo permanecem vinculadas à conta. Reinstalar o aplicativo não os restaura.

> Revisão 1.6.1.144: o limite da prova de vida facial é 70%; a comparação da
> identidade cadastrada continua em 90%.

> Revisão 1.6.1.143: a verificação facial ganhou interface AvantaLab, com
> orientação clara antes da câmera e retorno visível ao ponto em caso de erro.

> Revisão 1.6.1.142: mesmo se o celular conservar uma versão anterior do
> aplicativo, quem não estiver individualmente habilitado no facial segue para
> a marcação comum, sem aviso ou abertura de câmera.

> Revisão 1.6.1.141: a confirmação facial só é exigida do funcionário
> individualmente ativado no adicional. Sem ativação individual, a marcação
> segue normalmente e o botão facial não é exibido.

> Revisão 1.6.1.140: a câmera facial orienta em português sobre distância,
> centralização, luz e imobilidade antes de aceitar a prova de vida.
>
> Revisão 1.6.1.139: após a captura facial, o funcionário já pode guardar o
> celular enquanto o sistema confirma o resultado.
>
> Revisão 1.6.1.138: a confirmação facial está em português, pede o celular na
> vertical e aguarda o resultado da prova de vida antes de informar o desfecho.
>
> Revisão 1.6.1.137: funcionários selecionados podem cadastrar ou atualizar a
> face no próprio ponto; quando o adicional está habilitado, a marcação exige a
> confirmação guiada antes de ser registrada.
>
> Revisão 1.6.1.136: a infraestrutura facial está protegida no servidor, mas
> a câmera guiada ainda não foi liberada para o funcionário; a aba Facial
> permanece em preparação até essa entrega.
>
> Revisão 1.6.1.135: a aba Facial do Controle de Ponto prepara funcionários
> para reconhecimento facial, sem captura até a configuração da infraestrutura
> AWS, retenção segura e revisão jurídica.

> Revisão 1.6.1.134: uma despesa programada aparece como **Previsto** antes da
> data, **A confirmar** no dia e **Pendente** depois do vencimento. O card
> **Lançamentos a confirmar** mantém despesas vencidas até confirmação, edição
> ou exclusão. Enquanto pendente, o valor não integra totais, gráficos nem o
> resultado realizado; permanece somente no saldo previsto.

> Revisão 1.6.1.133: correção visual exclusiva da sala de botões do
> AvantaVendas; sem impacto operacional na Gestão Web ou no PWA da Gestão.

> Revisão 1.6.1.132: preparação do aplicativo Android independente do
> AvantaVendas; sem mudança operacional na Gestão Web nesta revisão.

> Revisão 1.6.1.131: em `/admin` > **Consumo**, o card Twilio informa saldo,
> gasto mensal e o resumo das verificações SMS dos últimos 30 dias. A consulta
> é administrativa e não expõe credenciais no navegador. Se o envio usar uma
> subconta, o saldo depende das credenciais de cobrança da conta principal.

> Revisão 1.6.1.130: ajuste exclusivo da troca entre aplicativos iOS; sem
> impacto operacional na Gestão Web ou no PWA.

> Revisão 1.6.1.129: correção da troca entre aplicativos exclusiva da Gestão
> Mobile no iOS; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.128: correção visual exclusiva das ações rápidas do
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.127: rótulo de aniversário e ordem das ações rápidas são
> exclusivos do AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.126: o sininho da agenda do dia é exclusivo do AvantaVendas;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.1.125: notificações nativas e indicador no ícone são exclusivos
> do aplicativo iOS instalado; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.124: correção da rolagem do painel de avisos exclusiva da
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.123: ajuste de área segura e rolagem do painel de avisos
> exclusivo da Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.122: cada aviso do sininho identifica o perfil financeiro de
> origem. Abrir ou fechar o painel não remove avisos; eles permanecem no
> sininho até **Fechar aviso** ou **Fechar todos**.

> Revisão 1.6.1.121: ajuste do agendamento exclusivo do AvantaVendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.1.120: após iniciar o acesso Web, a landing não reaparece
> durante o retorno de Google/Apple nem enquanto uma sessão ativa é retomada.
> A preparação permanece em uma única cena até abrir a Gestão; falhas devolvem
> o login com uma mensagem clara.

> Revisão 1.6.1.119: estabilização do acesso exclusiva da Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.1.118: no seletor de data de **Lançar aporte**, a data curta
> fica centralizada; sem mudança operacional.

> Revisão 1.6.1.117: no card **Caixinha/Reserva financeira**, o botão ao lado
> do olho recolhe tudo após Saldo e Aportes no mês. **Lançar aporte** identifica
> os campos de data, descrição e valor; a data aparece como `dd/mm/aa` e a
> edição de um lançamento permanece na mesma linha.

> Revisão 1.6.1.116: em **Ver lançamentos**, cada aporte mostra a data curta e
> pode ser editado na própria linha; a despesa vinculada é atualizada junto.

> Revisão 1.6.1.115: o aporte inicial da **Caixinha/Reserva financeira** fica
> recolhido até usar **Adicionar aporte inicial**. Depois, pode ser atualizado
> ou excluído. **Ver lançamentos** mostra os aportes normais com a data de cada
> um.

> Revisão 1.6.1.114: ao adicionar um aporte na **Caixinha** ou uma reserva, a
> data começa em hoje e pode ser alterada. O sistema cria a despesa na data
> escolhida, sem usar o mês que está aberto no dashboard.

> Revisão 1.6.1.113: ao criar um perfil Empresa, escolha **Usar 7 dias
> grátis** para liberar o Business Pro ou **Assinar agora** para abrir os
> planos logo após o cadastro. Assinar agora não cria uma assinatura expirada.
> Um perfil legado que tenha ficado expirado sem cobrança pode iniciar esse
> teste uma única vez no paywall.

> Revisão 1.6.1.112: Administrador e Operador Completo podem criar e consultar
> Pontos de restauração; somente Gestor Master restaura ou exclui um ponto.

> Revisão 1.6.1.111: Gestor Master encontra **Pontos de restauração** em
> **Menu > Configurações > Backup e restauração**. Os pontos preservam o estado
> completo do perfil e a restauração exige digitar **RESTAURAR**; o Excel
> continua sendo apenas o backup baixável.

> Revisão 1.6.1.110: o sininho avisa gestores e administradores sobre faturas
> recorrentes a vencer em 5, 2 e 0 dias e em atraso há 1, 3 e 7 dias. Escolher
> **Ver assinatura** no aviso abre o painel de Assinatura para regularização.

> Revisão 1.6.1.109: ajuste de pesquisa exclusivo do AvantaVendas; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.1.108: feedback de carregamento exclusivo da assinatura
> no aplicativo iOS; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.62.03: a marca das telas web de login e cadastro fica
> centralizada verticalmente; sem mudança operacional na Gestão Web.

> Revisão 1.6.1.107.62.02: o card de seleção de perfil após o login fica
> centralizado; sem mudança operacional na Gestão Web.

> Revisão 1.6.1.107.62.01: login e cadastro web usam a mesma posição de card
> e mantêm a marca centralizada; sem mudança operacional na Gestão Web.

> Revisão 1.6.1.107.62: permissão nativa de microfone, política de áudio e
> estabilização do build iOS; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.61: remoção da borda e da sombra lateral do card de
> identificação da Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.60: ajuste visual exclusivo do card de identificação do
> menu da Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.59: ajuste de área segura exclusivo do menu da Gestão
> Mobile no iOS; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.58: a seleção de perfil após login mantém o fundo visual
> institucional da transição, sem logotipo adicional; sem mudança operacional
> na Gestão Web.

> Revisão 1.6.1.107.57: depois de uma cortesia revogada, uma nova contratação
> segue normalmente para aguardar pagamento e é liberada após a confirmação;
> sem mudança nos passos do usuário na Gestão Web.

> Revisão 1.6.1.107.56: as telas web completas de **Carregando** e
> **Preparando acesso** mantêm marca e card centralizados; sem mudança
> operacional na Gestão Web.

> Revisão 1.6.1.107.55: correção exclusiva da preparação e do cancelamento
> OAuth nos aplicativos nativos; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.54: correção exclusiva da ponte nativa de compras no iOS;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.53: os carregamentos e telas públicas responsivas da Gestão
> adotam a cena oficial de marca separada e card centralizado; sem mudança
> operacional na Gestão Web.

> Revisão 1.6.1.107.52: contratação pessoal simplificada no web/PWA, sem
> impacto nas demais operações da Gestão Web.

> Revisão 1.6.1.107.51: padronização visual das entradas de Controle de Ponto
> e Recebimentos Presenciais; sem alteração operacional na Gestão Web.

> Revisão 1.6.1.107.50: ajuste visual exclusivo do Recebimentos Presenciais;
> sem alteração operacional na Gestão Web.

> Revisão 1.6.1.107.49: atualização de cache exclusiva do Controle de Ponto;
> sem alteração operacional na Gestão Web.

> Revisão 1.6.1.107.48: ajuste visual exclusivo do Controle de Ponto; sem
> alteração operacional na Gestão Web.

> Revisão 1.6.1.107.47: padronização visual de fundos e marca nas cenas de
> acesso; sem alteração operacional na Gestão Web.

> Revisão 1.6.1.107.46: tratamento de cancelamento OAuth exclusivo dos
> aplicativos nativos; sem mudança operacional na Gestão Web.

> Revisão 1.6.1.107.45: continuidade do OAuth nativo sem recarga da página;
> sem mudança operacional na Gestão Web.

> Revisão 1.6.1.107.44: ajuste restrito ao retorno OAuth do Google em
> aplicativos nativos; sem mudança operacional na Gestão Web.

> Revisão 1.6.1.107.43: início direto dos aplicativos nativos na Gestão
> Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.42: a entrada pública abre a Gestão Web no desktop e a
> Gestão Mobile em aparelhos móveis; sem impacto operacional dentro do Web.

> Revisão 1.6.1.107.41: abertura direta dos planos é exclusiva da Gestão
> Mobile no aplicativo iOS; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.40: ajuste visual exclusivo do cadastro no aplicativo
> nativo; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.39: regra exclusiva da conta controlada de revisão iOS;
> sem mudança operacional para os usuários da Gestão Web.

> Revisão 1.6.1.107.38: ajuste de rolagem exclusivo do Menu da Gestão Mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.37: mudança de localização exclusiva da Gestão Mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.1.107.36: ajuste de posicionamento exclusivo do cadastro mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.35: login e cadastro adotam a mesma ordem e as mesmas
> cores do acesso mobile, mantendo medidas adequadas ao desktop.

> Revisão 1.6.1.107.34: correção de compactação no cadastro mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.1.107.33: os seletores **Empresa/Pessoal** do cadastro foram
> reduzidos visualmente; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.32: refinamento visual dos placeholders de telefone e
> cupom; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.31: os seletores **Empresa/Pessoal** do cadastro foram
> reduzidos visualmente; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.30: os seletores **Empresa/Pessoal** do cadastro foram
> compactados visualmente; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.29: o seletor ativo **Empresa/Pessoal** do cadastro usa o
> azul padrão AvantaLab; sem mudança de fluxo operacional.

> Revisão 1.6.1.107.28: os seletores **Empresa** e **Pessoal** do cadastro
> foram compactados visualmente, sem alteração no fluxo de criação de perfil.

> Revisão 1.6.1.107.27: ajuste visual de placeholders no cadastro mobile; sem
> impacto operacional na Gestão Web.

> Revisão 1.6.1.107.26: no cadastro, os seletores **Empresa** e **Pessoal**
> adotam a mesma altura visual compacta dos campos e das ações sociais; sem
> mudança de fluxo operacional.

> Revisão 1.6.1.107.25: o card de cadastro oferece **Cadastrar com Google** e
> **Cadastrar com Apple**, usando a mesma conta-base e o mesmo fluxo seguro do
> login social. Os campos e a ação por SMS adotam a mesma altura visual compacta
> dos botões sociais.

> Revisão 1.6.1.107.24: cancelamento do login social corrigido na Gestão
> Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.23: rolagem do cadastro da Gestão Mobile ajustada somente
> no navegador; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.22: compactação horizontal do cadastro da Gestão Mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.21: padronização visual do fundo e logo no cadastro da
> Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.20: ajustes visuais no login, cadastro e header da landing
> mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.19: o acesso móvel sem sessão permanece na tela de login
> da Gestão Mobile; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.18: pelo navegador móvel, Entrar na landing abre a Gestão
> Mobile; o acesso Web continua na rota própria, sem decisão tardia de interface.

> Revisão 1.6.1.107.17: assinaturas pessoais da App Store passam a liberar os
> mesmos perfis pessoais no Web; o checkout web da Asaas permanece inalterado.

> Revisão 1.6.1.107.16: mensagem de meta atingida ajustada no AvantaVendas;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.15: o modelo atual de autenticação foi incorporado ao
> PADRÃO AVANTA 1.4.0 para novos sistemas; sem mudança operacional na Gestão.

> Revisão 1.6.1.107.14: removida a implementação React antiga da landing; a
> landing SEO da raiz é a única versão pública. Sem impacto operacional na
> Gestão Web.

> Revisão 1.6.1.107.13: removido o código inacessível da antiga landing interna
> da Gestão; a landing pública oficial permanece exclusivamente na raiz.

> Revisão 1.6.1.107.10: no iOS, os rótulos sociais são restaurados antes da
> espera pelo navegador nativo, garantindo o retorno limpo ao dispensar a folha.

> Revisão 1.6.1.107.09: o card restaura os rótulos sociais assim que o painel
> seguro abre, evitando carregamento residual quando o iOS não informa o
> cancelamento.

> Revisão 1.6.1.107.08: o cancelamento do painel seguro restaura os botões de
> Google e Apple sem manter um provedor em carregamento.

> Revisão 1.6.1.107.07: dispensar o painel seguro de Google ou Apple limpa o
> login pendente sem exibir um botão extra no card de acesso.

> Revisão 1.6.1.107.06: após login por Google ou Apple iniciado na Gestão,
> a sessão confirmada segue automaticamente para a tela de Gestão e seus
> perfis, sem uma segunda confirmação na landing pública. A rota Gestão abre
> diretamente no acesso; a landing pública oficial é a raiz do AvantaLab.

> Revisão 1.6.1.107.05: o Vendas também permite cancelar o login social
> pendente; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.04: cancelamento do login social nativo retorna à tela de
> acesso; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.03: o tema escuro salvo do AvantaVendas não se aplica às
> telas públicas de entrada; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107.02: a entrada também oferece **Continuar com Apple**. A
> conta Apple usa o mesmo fluxo de criação ou acesso de conta já existente; sem
> impacto nos acessos por e-mail, telefone ou Google.

> Revisão 1.6.1.107.01: botão de localização no card sem endereço do
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.107: celebração de meta e preenchimento de endereço por
> localização adicionados ao AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.106: a Ava orienta somente recursos efetivamente plugados ao
> sistema publicado; projetos em desenvolvimento ficam fora do guia.

> Revisão 1.6.1.105: contraste automático nos cards de seleção de perfil.

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

> Revisão 1.6.1.92: módulos só podem ser ativados nos planos empresariais;
> Business Pro instala sem cobrança e Business exige a assinatura mensal.
> sem impacto operacional até a ativação da cobrança no Gestão Web.
>
> Revisão 1.6.1.81: a progressão comercial entre planos foi esclarecida na
> página pública; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.80: preços anuais apresentados na página pública foram
> atualizados; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.79: refinamento de texto público do Business Pro; sem impacto
> operacional no Gestão Web.
>
> Revisão 1.6.1.78: refinamento visual do CTA público do Business Pro; sem
> impacto operacional no Gestão Web.
>
> Revisão 1.6.1.77: a página pública destaca o teste de 7 dias do Business Pro;
> sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.76: comunicação pública de planos e chamadas atualizadas; sem
> impacto operacional no Gestão Web.
>
> Revisão 1.6.1.75: refinamento de altura e navegação da página pública; sem
> impacto operacional no Gestão Web.
>
> Revisão 1.6.1.74: correção técnica dos estilos públicos de planos; sem
> impacto operacional no Gestão Web.
>
> Revisão 1.6.1.73: a comunicação comercial pública dos planos foi atualizada;
> sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.72: a página pública recebe o botão oficial de próxima rolagem;
> sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.71: refinamento tipográfico da seção pública de planos; sem
> impacto operacional no Gestão Web.
>
> Revisão 1.6.1.70: destinos do menu público são alinhados pelo conteúdo
> visível da seção; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.69: a rolagem do menu público passa a compensar o header fixo;
> sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.68: a navegação interna da página inicial em prévia recebe
> rolagem suave; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.67: página inicial em prévia passa a apresentar IA Ava e planos
> públicos; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.66: páginas públicas de informações passam a usar o logotipo
> oficial no cabeçalho; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.65: a Central de Suporte passa a oferecer retorno à página
> inicial; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.64: o retorno das páginas legais passa a usar a expressão
> Página inicial; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.63: páginas legais passam a oferecer retorno à Landing; sem
> impacto operacional no Gestão Web.
>
> Revisão 1.6.1.62: Landing em prévia recebe navegação mobile acessível,
> melhorias de acessibilidade nas calculadoras e Política de Cookies; sem
> impacto operacional no Gestão Web.
>
> Revisão 1.6.1.61: o painel ilustrativo da Landing em prévia passa a usar
> gráfico de barras de receitas e despesas; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.60: o conteúdo do balão demonstrativo da Ava na Landing em
> prévia foi centralizado verticalmente; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.59: o balão demonstrativo da Ava na Landing em prévia apresenta
> uma pergunta de saldo mensal; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.58: o balão demonstrativo da Ava no painel da Landing em prévia
> utiliza o arquivo oficial do logotipo; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.57: o card da IA Ava na Landing em prévia utiliza o arquivo
> oficial do logotipo; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.56: referência persistida de Total mensal no Gestão Mobile;
> sem impacto operacional na Gestão Web.

> Revisão 1.6.1.55: a Landing em prévia aplica o ícone institucional da IA Ava;
> sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.54: a Landing em prévia passa a divulgar Controle de Ponto e
> importação de despesas por faturas ou extratos; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.53: o texto institucional da Landing em prévia identifica a Ava
> como assistente de IA; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.52: a Landing em prévia passa a apresentar links públicos para
> Termos de Uso e Política de Privacidade; sem impacto operacional no Gestão Web.
>
> Revisão 1.6.1.51: os exemplos das calculadoras públicas passaram a ser
> placeholders, sem impacto operacional nos fluxos do Gestão Web.
>
> Revisão 1.6.1.50: a Landing em prévia inclui simulador público para financiar
> carro ou casa; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.49: o header da Landing em prévia sobrepõe o hero e o logo volta
> ao início; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.48: o header da Landing em prévia passa a ser transparente no
> topo; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.47: a troca de calculadora na Landing não desloca a página em
> telas amplas; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.46: a calculadora pública de CDI atualiza a Taxa DI pela série
> oficial do Banco Central; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.45: a Landing em prévia passa a oferecer calculadoras públicas
> de simulação; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.44: efeitos e backgrounds da prévia da Landing foram
> restaurados; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.43: adicionadas prévias públicas da Landing e da central de
> Calculadoras; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.42: ajuste visual no botão Desvincular perfil financeiro do
> AvantaVendas; sem impacto operacional na Gestão Web.

> Revisão 1.6.1.41: o hover das linhas do Relatório Contábil usa cinza ainda
> mais claro.

> Revisão 1.6.1.40: as linhas dos cards de Relatório Contábil usam hover cinza
> mais claro; os cabeçalhos MÊS e ano recebem contraste reforçado.

> Revisão 1.6.1.39: ao selecionar um funcionário específico no relatório de
> Controle de Ponto, o campo recebe destaque visual e foco reforçado.

> Revisão 1.6.1.38: Faltas no período passa a aparecer dentro do card
> Pontualidade na entrada, abaixo do horário previsto.

> Revisão 1.6.1.37: no seletor de ano do relatório de Controle de Ponto, o
> rótulo ANO fica centralizado abaixo do número.

> Revisão 1.6.1.36: os controles compactos do relatório de Controle de Ponto
> recebem nova redução de altura; Pontualidade na entrada permanece inalterada.

> Revisão 1.6.1.35: controles de período e Buscar registros do Controle de
> Ponto ficam mais compactos; Pontualidade na entrada mantém sua altura.

> Revisão 1.6.1.34: título e valor de Faltas no período no Controle de Ponto
> ficam centralizados como um único conjunto.

> Revisão 1.6.1.33: indicadores e horário previsto do card de Pontualidade na
> entrada no Controle de Ponto ficam centralizados.

> Revisão 1.6.1.32: no relatório do Controle de Ponto, De, Até e Buscar
> registros ficam na mesma linha em telas amplas.

> Revisão 1.6.1.31: o resumo de Pontualidade na entrada em Controle de Ponto
> informa Pontuais, Atrasos, Adiantados e o total de dias avaliados.

> Revisão 1.6.1.30: o destaque das linhas de dia em Controle de Ponto usa cinza
> claro; dias de falta continuam identificados em vermelho.

> Revisão 1.6.1.29: as linhas dos dias nos relatórios de Controle de Ponto
> recebem destaque ao passar o mouse, facilitando a leitura do registro ativo.

> Revisão 1.6.1.28: em Controle de Ponto > Relatórios, ao buscar um funcionário,
> cada dia de trabalho sem entrada aparece na lista como **Falta**, com borda e
> etiqueta vermelhas. Excel e PDF refletem a mesma situação.

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

> Revisão 1.6.1.02: as pastas de Conteúdo AvantaVendas > Divulgação mostram a
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
- No perfil Pessoal, **Caixinha** começa visível. No perfil Empresa, **Reserva financeira** começa oculta e pode ser exibida em Organizar blocos; ambas registram aportes como despesa na data escolhida no lançamento, iniciada em hoje.
- **Menu** concentra perfil, usuários, aparência, despesas/categorias,
  despesas fixas, backup/restauração e módulos. No Web, ele abre em uma gaveta
  lateral esquerda; Visual e Configurações expandem seus próprios subbotões.
- **Sobre** apresenta as principais novidades em marcos consolidados, sem listar
  ajustes exclusivamente técnicos.
- Um login pode ter perfis Empresa e Pessoal. As permissões dependem do vínculo:
  Gestor Master, Administrador e operadores não enxergam necessariamente as
  mesmas ações.
- Além de e-mail/senha e Google, a tela de entrada oferece **Continuar com
  Apple**. A autenticação Apple cria ou acessa a mesma conta AvantaLab conforme
  o e-mail informado pelo provedor.
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
- Para editar uma despesa já registrada, clique sua linha no card
  **Lançamentos do período**; o formulário abre na própria linha. **Cadastrar
  despesas** administra somente os tipos e categorias. Para uma recorrência
  inteira, use **Menu > Despesas fixas**.
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
  a aba **Facial** prepara o adicional: selecione os funcionários e confirme
  privacidade, alternativa de marcação e ausência de sanção automática. O
  preço informado é R$ 14,90 por funcionário ao mês, com referência de até 120
  verificações mensais. Somente o funcionário selecionado recebe o botão de
  cadastro; a marcação só exige a confirmação após o cadastro ficar ativo. Quem
  não estiver habilitado continua usando a marcação comum, sem bloqueio facial.
  a aba **Auditoria** mostra as marcações e as alterações de acesso registradas.
  O funcionário recebe um comprovante imediatamente após cada marcação e pode
  imprimi-lo; o código mostrado identifica o registro salvo no banco.
  Em **Conformidade REP-P**, gestores consultam e baixam os documentos AFD já
  emitidos para a própria empresa; **Gerar novo AFD** cria outra emissão do
  período e preserva todas as anteriores. Em homologação, os arquivos não têm
  validade legal.
  O botão **Disponibilizar manual** prepara o Manual do Sistema REP-P em PDF
  versionado e o inclui no mesmo histórico de documentos da empresa.
- **Operações de Campo** é instalado em **Menu > Módulos**. Depois de
  instalado, Gestor Master e Administrador usam **Menu > Recebimentos** para
  cadastrar empresas atendidas, pontos de cobrança e colaboradores, além de
  conferir, devolver, registrar divergências ou estornar recebimentos.
- A navegação de **Operações de Campo** segue a pílula deslizante do menu da Gestão e separa as
  áreas por cor. À esquerda, a ordem é **Visão geral**, **Resultados**,
  **Empresas** e **Colaboradores**. Acima das barras seguintes aparecem os
  rótulos **Recebimentos** — **Recebimentos**, **Conferência**, **Próximo a
  vencer** e **Inadimplentes** — e **Serviços** — **Realizados**, **Pendentes**,
  **Atrasados** e **Avisos**. Há um espaço visual antes do AvantaCard. A pílula
  muda para verde dentro de Serviços.
  A agenda é gerada a partir da **Execução do serviço** do cliente direto ou,
  quando aplicável, da programação herdada do Local agrupador. A estreia cria
  somente a agenda atual e dos próximos 30 dias, preservando dados antigos sem
  presumir serviços atrasados. Pendentes cuja data passou tornam-se Atrasados.
  **Avisos** lista somente avaliações Regulares ainda não tratadas; o gestor ou
  administrador conclui o aviso após resolver a situação.
- Em **Empresas**, use **Pesquisar empresas e locais…** ou **+ Nova empresa**.
  No início do cadastro, escolha **Cliente direto** ou **Local agrupador**.
  Cliente direto possui responsável, contato, e-mail, endereço, valor contratado
  e vencimento próprios, sem clientes abaixo. Para salvar um cliente, somente
  nome, valor contratado, dia de vencimento e execução do serviço são obrigatórios; os demais dados são
  opcionais. Local agrupador é um shopping,
  galeria ou condomínio: registra nome, endereço e a **Execução do serviço**,
  não gera cobrança e permite **+ Novo cliente no local**. Nesse cliente, a
  opção **Herdar a programação do local** inicia ativada e deixa as datas de
  execução somente para consulta; desative-a para selecionar uma programação
  própria. Em **Colaboradores**, use **+ Novo colaborador** e escolha ao menos
  uma permissão operacional no aplicativo: **Recebimentos**, **Serviços** e/ou
  **Agendamento**. **Comando por voz** é uma permissão complementar marcada por
  padrão; desmarque-a para retirar acionador, ajuda e faixa inferior somente do
  PWA daquele colaborador.
- No endereço, informe opcionalmente **Tipo de nível** — Andar, Piso, Subsolo,
  Térreo, Mezanino ou Outro nível — e depois o **Número / identificação** livre.
  Use, por exemplo, `Andar` + `12`, `Piso` + `G` ou `Subsolo` + `2`; para
  térreo, a identificação pode ficar vazia. Esses campos existem tanto em
  empresa/local quanto em cliente no local.
- Ao cadastrar ou editar um cliente — direto ou dentro de um local — informe o
  **Dia de vencimento** obrigatório. A cobrança é sempre mensal; em meses mais
  curtos, o sistema usa o último dia disponível. Em **Execução do serviço**,
  escolha a frequência semanal, quinzenal, mensal, trimestral, semestral ou anual
  e configure os dias aplicáveis como referência operacional do serviço. Essa
  configuração não altera o calendário financeiro. Ao trocar o dia de vencimento,
  o sistema substitui somente as previsões automáticas futuras ainda não recebidas
  e preserva atrasos, pagamentos e histórico anteriores.
  A primeira cobrança nunca antecede o cadastro; daí em diante o sistema cria
  parcelas mensais previstas e marca automaticamente como **Em atraso** as não recebidas
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
  que criou o acesso e, abaixo, o nome da operação atual. Com as duas
  permissões, ele escolhe **Recebimentos** ou **Serviços** logo após o login e
  usa **Trocar sistema** no topo para alternar sem sair. Em Serviços, **+ Registrar
  novo serviço** seleciona empresa e cliente/local, pede o nome de quem recebeu,
  exige assinatura em tela e então recebe a avaliação **Bom** ou **Regular**.
  A opção Regular permite informar **Nos conte sobre sua experiência** de forma
  opcional antes de enviar; o registro aparece em Realizados e seu aviso fica
  disponível ao gestor. Remover o módulo bloqueia novas entradas sem apagar os
  dados.
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
Regra preparada da referência (3.2.0.125, ainda não publicada): média aritmética de até oito preços totais comprovados na origem, sem completar a amostra com novas pesquisas. Parcelamento não exclui anúncio; usa-se o preço total, não a parcela.

> Revisão 3.2.0.126: sem impacto operacional na Gestão Web. Publicação do visual de carregamento do Vendas e compatibilidade da proteção com a Vercel atual, sem alterar plano/backend ou testes.

<!-- ava-version: 3.2.0.126 -->

Revisão 3.2.0.290: Link de compra compacto para telas pequenas; condição abre acima e as ações permanecem acessíveis. Sem mudança na regra de preços ou no compartilhamento.

Post Online 3.2.0.290: valor anunciado na linha 💰 *POR APENAS R$ …*, mantendo De como média consultada, sem percentual ou preço fixo.

Revisão 3.2.0.290: posts por imagem do perfil Saldão Aline incluem na legenda dois links de oferta (11 98304-4391 e 11 98788-5611), sem mensagem preenchida, seguidos do convite curto do grupo. Imagem, preços, posts Online e outras empresas preservados.

Revisão 3.2.0.290: post Online identifica a URL com *Link de compra:* em negrito no WhatsApp. Demais dados e posts de estoque não Online preservados.

Revisão 3.2.0.290: importação de despesas no mês preserva o centro de custo selecionado na revisão, rascunho e confirmação. Na tela independente, escolher o centro quando o perfil usar centros. Rascunhos de centros separados; não transferir lançamentos antigos nem repetir lotes para corrigir alocação sem conferência. Sessão expirada, erro ou confirmação incerta preservam a revisão. Sem impacto operacional no AvantaVendas e nos demais fluxos nativos.

Revisão 3.2.0.290: o tipo informado na planilha é preservado até carregar o cadastro do perfil; acentos, caixa e espaços não impedem reconhecimento. A seleção manual prevalece, e categoria de outro perfil exige revisão. Tabela sem repetir descrição/valor original, mantendo valores de conferência internamente e controles alinhados. Sem alteração de permissões, banco ou lançamentos existentes.

Refinamento 3.2.0.290: opção Automático no tipo de documento mantém a detecção automática e cabe no card. Sem alteração operacional nos demais ambientes.

Revisão 3.2.0.354: Vendas reutiliza a página de emissão ao corrigir uma nota rejeitada; exclusão operacional de rascunho conserva auditoria e libera apenas reserva não utilizada. Sem alteração no restante da Gestão.


### Revisão 3.2.0.355 — atendimento de Marketplaces

Em Anúncios / Marketplaces > Vendas, abra o pedido e use **Mensagens e atendimento**, na área Pós-venda. A conta é a vinculada à venda; o envio usa sua autorização na API, independentemente da conta aberta no navegador do Mercado Livre. Selecione a conversa da venda ou da reclamação. Na mediação, responda ao destinatário liberado pelo Mercado Livre. A consulta da conversa comercial não marca mensagens como lidas.

Digite a resposta (até 350 caracteres), anexe JPG/PNG/PDF ou GIF quando permitido e envie; cada arquivo tem limite de 3 MB. Algumas aberturas de conversa exigem escolher motivo ou template liberado pelo ML. Não orientar a contornar bloqueio de comprador, pagamento, Full, prazo, moderação ou mediação. Mensagem em revisão não significa mensagem entregue.

As soluções do caso vêm da consulta atual: autorizar devolução, reembolsar, oferecer um percentual autorizado, solicitar mediação, informar postagem/previsão e revisar o produto devolvido. O usuário revisa e confirma a ação. A revisão com problema exige motivo informado pelo ML; alguns motivos exigem evidência. Carrinho com vários pedidos não pode ser aprovado integralmente a partir da revisão de um único pedido; o relato de problema se limita ao pedido selecionado. Prova de postagem registrada não pode ser editada no ML. Não inventar rastreio, prazo ou condição do produto.

As solicitações ficam registradas ao recarregar o pedido. Se houver demora, retorno incerto ou análise, usar Atualizar atendimento, sem repetir o envio. O texto em edição é preservado durante consultas. Reembolso e revisão física não repõem o estoque automaticamente; a conferência de saldo e a entrada física seguem o fluxo existente. Fiscal permanece com o comportamento da base anterior.

### Revisão 3.2.0.358 — fechar avisos de venda

No popup Nova venda ou Venda pendente do módulo Marketplaces, **Entendi** fecha somente o pedido exibido e **Ver venda no AvantaLab** abre seus detalhes. **Fechar todos**, abaixo dessas ações, marca os avisos de venda existentes da empresa como lidos apenas para o usuário atual, inclusive os que não cabem na primeira página. A leitura fica salva após atualizar ou reabrir o módulo. Vendas que gerarem novos avisos depois do início da operação continuam aparecendo. Não cancela pedidos, não resolve pendências de sincronização e não movimenta estoque. Em falha, a mensagem permite tentar novamente; não informar sucesso antes da confirmação.

Revisão técnica 3.2.0.358 da página inicial: sem impacto operacional; conteúdo, aparência, acesso e navegação pública preservados.

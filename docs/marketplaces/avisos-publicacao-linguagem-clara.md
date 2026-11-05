# Avisos de publicação — revisão 3.2.0.71

Escopo: preparação e publicação do Web Marketplaces, incluindo respostas de validação do Mercado Livre. Não representa auditoria de todos os módulos do sistema. PADRÃO AVANTA v1.21.0. Local, não publicado.

## Contrato

- A mensagem principal explica o problema em português e a próxima ação possível. Campo só é destacado quando identificado na resposta ou no payload efetivamente enviado.
- Motivo e código originais sanitizados permanecem em “Detalhes técnicos (última tentativa)”, fechado por padrão. Não expor credenciais, corpo completo, URLs ou e-mails.
- Regra desconhecida não recebe tradução por suposição: orientar suporte e consulta aos detalhes. Ausência de referência não é sinônimo de campo obrigatório faltante.
- Advertências são preservadas nos detalhes, mas não viram campos bloqueantes. Na 3.2.0.71, o pré-validador POST /items/validate aceita HTTP 400 somente quando error é validation_error e a lista completa é não vazia/exclusivamente warning com código/mensagem válidos. Esse tratamento segue o contrato oficial de advertências não bloqueantes; resposta vazia/ambígua/mista, 422, criação e edição continuam recusadas. Ausência de causa não autoriza publicação.

Contrato oficial de validações: https://developers.mercadolivre.com.br/en_us/validations

Atributos read_only/inferred não devem ser enviados como editáveis: https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br/atributos
- Não apagar preenchimento, desconectar sessão, reenviar publicação ou alterar estoque ao apresentar aviso.

## Regras revisadas

- Garantia: quantidade positiva + unidade explícita (dias, meses ou anos). Exemplo 3 meses; número isolado é bloqueado antes do envio. Formato canônico sem inferir unidade.
- Preço: mínimo em reais quando inequivocamente informado; caso contrário revisar limites da categoria, sem inventar valor.
- Categoria, tipo de anúncio, condição e envio: escolher opção permitida. Exigência explícita de Mercado Envios recebe orientação específica.
- Fotos: ausência, limite de quantidade, dimensão e recusa genérica com orientações distintas.
- EAN: conferir código da embalagem; incompatibilidade com marca/categoria diferenciada de formato inválido.
- Características: campos obrigatórios, texto longo e valor não aceito; nomes conhecidos em português, identificador preservado para atributo desconhecido.
- Quantidade: conferir estoque físico Online e preparar novamente; publicação não cria unidades.
- Modelo da conta: falha relativa a family_name não transfere responsabilidade técnica ao usuário; orientar preparar novamente e suporte se persistir.
- Preparação: distinguir ficha de origem, revisão normal e campos bloqueantes, sem sugerir que preparar publique ou altere cadastro/estoque.
- Rede: consulta pode ser repetida; resultado de uma operação interrompida não é presumido. Conferir a lista antes de tentar novamente. Cancelamento mantém sua semântica, sem transformação em erro de conexão.

## Evidências e verificação

Validações oficiais: https://developers.mercadolivre.com.br/pt_br/guia-para-produtos/validacoes

Prazo: erro real fornecido pelo usuário, sale_term.invalid_value, exige número seguido de dias, meses ou anos.

Testes com provedor e banco simulados cobrem diagnóstico/segredos, mapeamento de campos, formulário, garantia local e recusas externas. Nenhum produto real é publicado durante a verificação.

# Pendências de estoque — revisão 59

PADRÃO AVANTA 1.20.0. Local, não publicado. Não exige migração.

O RPC autenticado continua autorizando o perfil e fornecendo os alertas de venda. O GET acrescenta detalhes em leitura, paginados e restritos à empresa, sem tokens, mensagens brutas do provedor ou dados de comprador. Eventos, fila de envio e conciliação são identificados por produto/EAN, conta, anúncio/pedido e origem. Código desconhecido admite ausência de descrição específica; não atribui automaticamente falha de conexão. Falha de detalhes é explícita e preserva os alertas, sem fingir vazio.

O cliente deixa de manter a primeira consulta congelada. Polling, realtime e retorno ao módulo renovam avisos; Atualizar avisos solicita uma leitura nova ao mesmo monitor, inclusive se já houver leitura em curso. Confirmar estoque solicita atualização pelo evento compartilhado. Nenhuma dessas ações processa vendas, reenvia estoque ou grava saldo. Consulta tem timeout, erro recuperável, cancelamento e descarte ao desmontar. Lista anterior fica sinalizada em falha.

O bloqueio de aumento deixa de consultar qualquer evento da empresa: considera o produto e todos os anúncios/contas vinculados ao mesmo saldo. Eventos de outros produtos não bloqueiam. Notificações de pedido/envio ainda sem conteúdo identificado são uma exceção de segurança limitada às contas relacionadas; um payload de webhook não basta para afirmar que o pedido é de outro produto. Notificação de item é identificada pelo anúncio. Erro/truncamento da conferência impede aumento; revisão, geração, política do anúncio e GET pós-envio continuam obrigatórios. Redução não depende dessa guarda.

Saldo físico confirmado após uma venda antiga não é descrito como ausente. Enquanto o worker ainda não conciliar seu evento, o texto informa conciliação sem nova baixa. O GET não altera estados para esconder o aviso. Falhas históricas já anteriores ao novo saldo não são exibidas como insuficiência atual.

Diagnóstico anterior somente leitura: Airfryer EAN 8720389031151 tinha saldo 1 confirmado, envio pendente com pending_sales. Evento sem saldo era do Ventilador Arno EAN 7895500763318. Não pressupor que esses estados permaneçam após o usuário confirmar o saldo; não executar nova entrada nem reprocessar pedido para teste.

Nova consulta em produção, somente leitura: ambos os produtos têm saldo 1 confirmado; eventos com pendência e fila de envio pendente da empresa retornaram vazios. A rotina resolveu os registros após a confirmação feita pelo usuário, sem intervenção de escrita do agente. O frontend antigo conservava a primeira resposta na área de avisos.

Validação local: 1.396 testes completos aprovados, zero falhas, e 29 testes direcionados aprovados (incluem monitor com realtime/sessão pendente, refresh agrupado, erro de rede, retorno tardio descartado, proteção do próprio produto e liberação de produtos diferentes). TypeScript e lint dos arquivos novos/monitor/API aprovados; cliente mantém um aviso preexistente de returnHref não usado. PADRÃO AVANTA e Ava aprovados. Prévia fictícia em `/marketplaces/validacao-pendencias`, bloqueada em produção, confirmou identificação, espera, resolução, recuperação e erro sem declarar vazio, nos temas claro/noturno. Sem publicação nesta etapa.

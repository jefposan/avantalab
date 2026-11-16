# AvantaPreços — referência manual (candidato 3.2.0.430)

Base: main a9400faa7d0552246976bf21407ac076adc3c217, conferida na rede. Checkout isolado /private/tmp/avanta-preco-manual-20261116; raiz compartilhada preservada. Sem publicar, consultar provedores pagos ou alterar banco de produção.

Defeitos reproduzidos no código: abrir pelo histórico sobrescrevia prices da resposta atual do servidor com prices do histórico; isso podia reapresentar o preço pesquisado anterior à edição manual. Durante a conferência de abertura, o botão Atualizar cálculos permanecia habilitado, mas o handler retornava sem ação por loading=true.

Correção: referência e sugestões atuais do cadastro têm precedência ao terminar a conferência. Contexto da consulta histórica só acompanha resultado com a mesma referência, sem repor sugestões antigas. Campo/botão manual ficam desabilitados durante loading, alinhados ao bloqueio do handler. Não muda layout, percentuais, preço nos anúncios, pesquisa externa, permissões, concorrência ou estoque.

Validação: teste da API edita referência de 200 para 250, confere sugestões de 125/175/225 (percentuais 50/70/90) e reabre cadastro em 250. Regressões executam o callback real da tela com cadastro mais recente, mesma referência/percentuais diferentes e resposta cancelada. 16 testes direcionados aprovados; segurança 715 aprovados. Padrão Avanta 1.23.1 e Ava aprovados. TypeScript executado após gerar tipos de rotas do Next no clone novo (RouteContext depende desses arquivos gerados).

Limite: cenários locais simulam API/banco ou banco de teste; não houve reprodução no navegador do cliente nem leitura/gravação de seu produto real. Não se afirma publicação ou aplicação em produção.

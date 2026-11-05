# 3.2.0.109 — Marketplaces: abertura leve, preparo no topo e prévia com foto

Autorização: responsável solicitou corrigir contagem/segunda carga, rolar Novo anúncio ao preparar e implantar o visual aprovado. Base de produção conferida: `dpl_2KUPLMNq4EdFcJkybVmwUszbQZ6w`, SHA `3ebb138a32fe64423293bd2ca6cf54089cb2585e` (3.2.0.104).

## Correções

- Produtos cadastrados usava a leitura pesada com card recolhido; contagem leve estava limitada a estoques. Agora usa `countOnly=1` em todos os casos. A API existente já faz `count: exact, head: true` sem fotos, vínculos, notas ou distribuição, com autorização empresarial preservada. A lista paginada usa `skipCount=1` e só começa ao expandir/pesquisar/abrir uma pendência explícita; não bloqueia a navegação pela contagem. Busca normalizada existente continua preservada.
- A sincronização de URL na Gestão substituía o `href` com contexto por uma URL simples depois da revalidação das concessões. Como o iframe é identificado pelo href, isso o remontava. Agora preserva o objeto se módulo, rota e empresa forem os mesmos. As validações anteriores continuam fechando o módulo quando a concessão for revogada ou a empresa mudar.
- Preparar anúncio usa o alinhamento compartilhado abaixo de cabeçalho/seletor, com foco em Novo anúncio antes e após preparar. O callback de preparo deixa de incrementar refreshKey: preparar não modifica as listas de produtos/anúncios/vendas.
- Entrega inclui visual 3.2.0.105–108: campos à esquerda e prévia flutuante com foto/rascunho à direita, ML e Magalu. Não inclui a rota de simulação de desenvolvimento no pacote publicado.

## Segurança e reversão

Sem mudança de OAuth, sessão, permissões, RLS, schema, banco ou dados reais nos testes. Não publica anúncios de produtos. Pacote isolado sobre a produção atual, sem enviar o checkout compartilhado ou outras manutenções. Ponto local da prévia anterior preservado em `output/restauracao-preparar-320107-20261023-9vJPM0/`. A base de produção 3.2.0.104 permanece recuperável pelo snapshot Git identificado e pelo deployment anterior; qualquer rollback de produção requer conferir a base vigente para preservar entregas posteriores.

## Estado

Implementado localmente; testes e preparação do pacote em andamento. Enviado/em build não significa no ar. Produção só pode ser comunicada após confirmar READY e domínio.

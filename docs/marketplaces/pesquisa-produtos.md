# Pesquisa de produtos cadastrados — Marketplaces Web

Versão local 3.1.0.37; PADRÃO AVANTA 1.19.2. Não publicada. Sem migração ou gravação em produção.

Refinamento local 3.1.0.38: atalho flutuante com 20% de opacidade em repouso e 100% no hover, foco visível do teclado e pressão/toque, sem animação ou mudança de operação. O valor inicial de 80% foi substituído por 20% a pedido do responsável antes da conclusão desta entrega.

## Uso

- Campo oficial CampoBusca no topo de Produtos e estoque, fora do conteúdo recolhido. Digitar expande os resultados na mesma lista; sem botão Pesquisar ou necessidade de Enter. × restaura a listagem normal.
- Nome, qualquer trecho da descrição, código interno e EAN; comparação por normalizarTexto, sem diferenciar acentos, cedilha, caixa ou espaços repetidos. Texto exibido/salvo não é alterado.
- Ler EAN usa o verde compartilhado, foca/seleciona o campo e indica ativação por aria-pressed. Leitor USB/Bluetooth em modo teclado: após o código completo válido, pausa de 100 ms inicia a pesquisa; demais entradas usam 300 ms. Funciona mesmo sem terminador Enter. Não há reconhecimento de dispositivo nem captura global do teclado; foco precisa estar neste campo. Escape desativa a indicação de leitura. Leitura seguinte substitui o código selecionado após o retorno, se o campo ainda estiver focado.
- Atalho flutuante Pesquisar produtos, inferior direito, expande, foca sem salto inicial e usa scrollMarketplaceRow para posicionar o card abaixo do cabeçalho/seletor fixos. Não reordena cards, não troca marketplace/empresa e respeita movimento reduzido. Em tela estreita conserva lupa e nome acessível; camadas de modal ficam acima do atalho.
- Resultados: foto ou Sem foto, nome clicável, descrição resumida, SKU, EAN, saldo físico (desconhecido diferente de zero) e preço cadastrado (zero diferente de ausente). Nome/Expandir abre os detalhes existentes, sem nova janela ou edição automática. Orientação de estoque permanece depois da lista.
- Consulta não acessa marketplaces/preços externos, inclui lote, anuncia, altera saldo ou mescla cadastro. Acesso somente leitura mantém busca/detalhes sem ações de gestão.

## Servidor e limites

API produtos mantém autenticação, permissão e empresa. Busca percorre projeções de leitura em páginas de até 200, filtra no servidor e depois obtém apenas a página de até 25 produtos completos e seus vínculos, sempre pela mesma empresa, excluindo arquivados. EAN exato tem prioridade, mas duplicados e demais correspondências não são escolhidos/mesclados silenciosamente. A lista vazia usa paginação direta do banco.

Sem nova função/índice ou migração nesta entrega: o texto acentuado é normalizado na varredura de leitura, sem enviar todo o catálogo ao navegador e sem cache global entre empresas. O custo cresce com o tamanho das descrições/catálogo. Limite de 20 s e sinal de cancelamento interrompem a busca; falha não entrega resultado parcial nem declara ausência. Para grandes catálogos, avaliar índice normalizado e consulta no banco numa entrega específica; não truncar dados para simular velocidade.

Cliente cancela imediatamente ao alterar termo, limpa resultados antigos durante a nova consulta e usa geração para descartar retornos tardios mesmo se o transporte ignorar AbortSignal. Atualizar permite recuperação explícita após erro. Cadastros/estoque continuam com suas proteções anteriores; testar com o perfil correto.

## Validação

- Prévia `/marketplaces/validacao-produtos`: apenas desenvolvimento; produção retorna 404. Usa ProductsStock e ProductSearchShortcut reais, com transporte fictício somente leitura e 31 cadastros em memória. Inclui descrição sem acento, EAN duplicado, página 2, preço/estoque zero/desconhecido e retenção/falha para corrida de consultas. Não substitui ensaio autenticado com os dados da empresa ou um leitor físico.
- Testes de serviço exercitam a implementação real com adaptador de banco em memória: empresa, arquivados, todos os registros, paginação, literal sem interpolação PostgREST, cancelamento, falha sem parcial e prioridade de EAN. Teste puro percorre mais de mil cadastros e páginas menores que o limite solicitado.
- Entrega aprovada em 1.316 testes completos, 25 direcionados, tipagem e build final isolado. Navegador: 320/430 px e desktop, claro/escuro; foco/posicionamento do atalho, campo recolhido visível, digitação/leitura sem Enter, EAN duplicado, descrição fora da página inicial, detalhes, limpeza/paginação, vazio, falha/recuperação e retorno antigo descartado. Leitor físico/ensaio autenticado não realizado pelo agente. Prova visual em `output/produtos/busca-automatica-atalho-local.png`.
- Instância de teste: `/private/tmp/avanta-busca-local-37.IFKSRR`, porta 3001 limitada a 127.0.0.1, com configuração passada ao processo sem arquivo de credenciais copiado. `/gestao` permite testar autenticado; a prévia usa somente memória. Servidor principal 3000 preservado. Não é pacote de publicação: estilos e documentos locais podem conter outros refinamentos da árvore compartilhada; preparar pacote isolado específico se houver autorização futura para publicar.

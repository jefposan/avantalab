# Lotes recebidos — AvantaPreços

Refinamento local **3.1.0.34**, ainda não publicado: CampoData separa dd/mm/aa visual do seletor nativo para impedir largura intrínseca/forma longa do iOS. Campo contido na coluna, data central, custo à direita e intervalo de 16 px. ISO completo, teclado/calendário e validações preservados. Datas curtas padronizadas no módulo e PDF; nenhum formato de outro módulo alterado. Teste real do iPhone pendente após publicar.

Refinamento local **3.1.0.33**, ainda não publicado: saída unificada por X/fundo/Escape durante rede/PDF, cancelamento de espera, limites de tempo e descarte de retorno tardio. Remoção pendente oferece Fechar painel. Não desfaz gravação já enviada: conferir o lote salvo antes de repetir. Prévia permite reter/liberar respostas e simular falha sem tocar no banco; não comprova causa exata do iOS da captura.

Validação da saída 33: suíte completa com 1.298 testes, 28 de lotes, lint, tipagem e verificadores aprovados. Navegador isolado confirmou consulta retida (X/fundo), falha (Escape), gravação retida (X e retorno tardio sem ativação), escolha de PDF (X), remoção retida (Fechar painel), timeout de 20 s, nova tentativa explícita e retorno de foco. Sem diálogos remanescentes; simulação em memória, sem sessão real de iPhone nem dados produtivos. Evidência local em `output/lotes/validacao-fechamento-painel.json`.

Refinamento local **3.1.0.32**, ainda não publicado: ações após os produtos em colunas iguais; Concluir conferência à esquerda e Continuar leituras neste lote à direita, verde. Concluídos mantêm reabertura explícita; permissões e operação inalteradas.

Refinamento local **3.1.0.31**, ainda não publicado: detalhe com Todos os lotes, Editar lote e Atualizar em colunas iguais preenchendo a linha. Acesso somente leitura mantém os dois botões permitidos igualmente distribuídos. Sem mudança nas ações.

Refinamento local **3.1.0.30**, ainda não publicado: card de lote ativo com nome acima, Ver lote e totais à esquerda e Voltar ao modo comum à direita; dois botões iguais na mesma linha preenchendo a largura útil. Contagem, abertura dos totais e pausa preservadas.

Publicação vigente confirmada: **3.1.0.29**, em 17/10/2026, deployment `dpl_2g4EjyhWk29C1SLSfyK8x4MAzfRF`, READY. Inclui refinamentos 27–29; notas locais abaixo são históricas. Domínio oficial conferido: versão, estilos, bundles web/PWA, cache e API protegida. Sem nova migração ou dados de teste produtivos; login/Vendas preservados.

Refinamento local **3.1.0.29**, ainda não publicado: lista com Atualizar à esquerda e Criar novo lote à direita; botões iguais ocupam toda a linha. Sem permissão de edição, somente Atualizar em largura total. Comportamento preservado.

Refinamento local **3.1.0.28**, ainda não publicado: Novo lote/Continuar lote existente e Cancelar/Criar e iniciar leituras ocupam duas colunas iguais em suas linhas completas. Ações de iniciar/retomar leituras usam o degradê verde do Ler EAN, por token compartilhado; edição mantém três ações. Fluxo e dados preservados.

Refinamento local **3.1.0.27**, ainda não publicado: data e valor na mesma linha com 16 px entre campos, largura limitada à coluna, data centralizada e valor alinhado à direita. Sem legenda Opcional; custo vazio continua permitido. Máscara monetária e cursor à direita preservados.

Publicação confirmada: **3.1.0.26**, em 17/10/2026, deployment `dpl_djiL4tFToPagz3YQzfZqhrJNNSvM`. Migração instalada em produção; notas de desenvolvimento seguintes são históricas. Verificação pública de versão, bundles web/PWA, cache e API protegida aprovada. Ensaio autenticado entre aparelhos pelo responsável.

Entrega local 3.1.0.22, PADRÃO AVANTA v1.19.2. Abertura habitual preservada. Topo do AvantaPreços com apenas **Criar Lote** e **Editar Lotes**, em duas colunas iguais na mesma linha e ocupando a largura útil. Sem destaque introdutório nem legenda de modo comum. **Editar Lotes** é o acesso aos lotes salvos anteriormente chamado Lotes recebidos; contador/totais e pausa do lote ativo ficam em área separada.

## Fluxo

Entrega local 3.1.0.25: no web, **Criar Lote** e **Editar Lotes** à esquerda das configurações. `PriceLotWebReader` usa `usePriceLotCapture` e a mesma API do PWA. Leitor USB/Bluetooth em modo teclado no campo focado, finalizado com Enter, ou entrada manual com Consultar e incluir. Não há captura global de teclas. Candidatos/continuações/pendências usam o mesmo item; referência manual disponível quando não identificado. Retomar relê o lote no servidor; Atualizar lote traz alterações de outro aparelho. Selecionar a mesma empresa e o mesmo lote permite alternar web/PWA sem importação. Prévia `validacao-lotes?modo=web` continua só memória fictícia; sincronização real depende da migração e implantação pendentes.

Refinamento local 3.1.0.24: data/custo na mesma linha. Custo usa a máscara compartilhada Avanta (123456 → 1.234,56), cursor à direita ao foco/clique e após digitar, conforme retificação do usuário. Backspace apaga progressivamente até vazio, sem travar em 0,00; vazio preservado como não informado. O valor salvo reaparece com separadores e duas casas decimais.

Refinamento local 3.1.0.23: formulário compacto, com observações em duas linhas iniciais. A edição mostra **Cancelar**, **Salvar** e **Salvar e continuar** na mesma linha; os dois últimos substituem os rótulos anteriores sem alterar as operações. Em concluídos, aviso explícito informa que continuar reabre o lote.

1. Criar lote: Data do lote e Valor de custo opcional em destaque, nome obrigatório, fornecedor/origem e observações. A mesma entrada oferece Continuar lote existente. Data do lote é escolhida pelo usuário e não é a data/hora de geração do PDF.
2. Cada consulta nova no modo de lote registra a leitura antes de consultar preço; EAN/código original preservado. Bipes repetidos são unidades distintas; quantidade também é corrigível na conferência. Leitor atual continua aceitando EAN, não QR arbitrário.
3. Cache, candidato e continuação resolvem a mesma leitura. Abrir histórico e atualizar pesquisa não contam unidades. Falha de gravação interrompe a consulta e é informada; entrega sem confirmação mantém o UUID para repetir o mesmo código sem duplicar enquanto a tela estiver aberta. Falha de pesquisa mantém item pendente no banco.
4. Consultar no item pendente conclui o mesmo registro. Correção manual do histórico não modifica preços já fotografados no lote; remover e refazer a leitura é uma alteração explícita da conferência.
5. Conferência, quantidades, totais e PDF pelo contador. Voltar ao modo comum pausa; lotes salvos podem ser retomados em Criar lote > Continuar lote existente ou Lotes recebidos. Lista mostra data/custo e ações Editar lote/Continuar leituras. Edição também oferece Salvar e continuar leituras, preservando ID e itens; concluídos usam Reabrir e continuar explicitamente. Retomada relê o lote e as permissões atuais; conclusão concorrente exige atualizar, não reabre por dedução. Nova abertura nunca ativa lote automaticamente.
6. Lotes recebidos também existe em Anúncios em marketplaces, sem depender da plataforma selecionada. Não há importação automática de estoque, criação de anúncio, compra ou lançamento financeiro.

## Valores e arquivo

- Cálculos em centavos, multiplicados pela quantidade; sugestões existentes de venda preservadas.
- Custo ausente é diferente de zero. Campo opcional em Criar lote/Editar informações. Rótulo **Lucro bruto** = receita projetada − custo do lote, podendo ser negativo; não é lucro líquido. Sem custo, não há valor de lucro.
- Qualquer preço pendente gera aviso e subtotais parciais, sem diferença bruta global.
- Gerar PDF oferece **Detalhado — todos os produtos** ou **Resumido — somente totais**, seguido de Gerar arquivo. A4 paisagem exato, margens de 5 mm, cabeçalho azul institucional repetido em duas linhas (empresa; geração, unidades, valor pago se informado), terceira faixa com três totais e lucros brutos. Sem parágrafo de estimativa. Detalhado: linhas de 36 pontos, fotos/descrição resumida/código e QR/quantidade/referência/preços de venda; resumido: uma página sem produtos nem carregamento de imagens. Nome empresarial salvo na criação. Imagem inacessível vira Sem foto, sem eliminar produto. Imagens são carregadas sem credenciais pelo navegador, não por proxy SSRF no servidor. Fornecedor/observações permanecem salvos e editáveis, mas não ocupam o cabeçalho exportado.
- PDF é regenerado dos registros salvos; rascunhos não persistidos não entram no arquivo. Estado dos preços permanece consistente com o lote, não com pesquisas futuras.

## Segurança e instalação

- Migração `20261016190000_marketplace_price_lots.sql`: duas tabelas privadas, RLS sem acesso direto de anon/authenticated e RPC somente service_role. FK composta impede item de outra empresa. UUID por leitura dá idempotência; lock de lote serializa captura e fechamento.
- APIs verificam sessão, vínculo regular ou operacional dedicado, empresa, módulo ativo/validade e, para vínculo regular, a autorização central de Marketplaces. Papéis de operação são preservados: Operador Simples não escreve. Consulta/preço vem do histórico da mesma empresa, não de valores arbitrários do cliente.
- Leitura detalhada percorre todas as páginas (inclusive mais de mil itens); listagem de lotes oferece Carregar mais. Não truncar relatório silenciosamente.
- Migração aplicada e registrada no Supabase de produção em 17/10/2026, após autorização de publicação. Conferidos RLS ativo nas duas tabelas, ausência de acesso direto por anon/authenticated e execução da função somente pelo servidor service_role. Tabelas reconhecidas pela API; nenhum lote real criado no deploy. Aplicação 3.1.0.26 publicada; nunca usar o preview como prova de gravação produtiva.
- Recuperação: reverter somente interface/rotas para a versão anterior, preservando tabelas e registros. Não executar DROP ao reverter a aplicação. Backup/exclusão de empresa seguem as políticas existentes.

## Validação local

- Refinamento 3.1.0.35, local, não publicado: em cada card de lote salvo, Editar lote/Continuar leituras ocupam uma linha em partes iguais, com texto centralizado. Continuidade usa o verde compartilhado do Ler EAN, inclusive Reabrir e continuar em concluídos; sem ação de continuidade, edição ocupa a linha toda. Mesma grade do detalhe, sem mudança de permissões ou operações. Prévia em 320/430 px e temas claro/escuro validada com lote fictício em memória.
- `node --no-warnings --experimental-strip-types --test tests/marketplaces/price-lots*.test.mjs`
- `scripts/validar-lote-pdf.mjs`: amostra sem dados reais usando o mesmo gerador, para inspeção visual.
- `/marketplaces/consulta/validacao-lotes`: componentes reais com transporte fictício em memória, somente em desenvolvimento; produção retorna 404. Não é tela para cadastrar o lote comprado.

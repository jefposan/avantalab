# Ofertas Saldão Aline

Extensão pública, gratuita para o visitante, da vitrine do perfil Saldão Aline no módulo Marketplaces. PADRAO-AVANTA 1.23.1; Web/PWA responsivo. Rota `/ofertas/saldao-aline`, navegação pública em página total, sem acesso à Gestão ou seus dados. Não cria outro módulo pago nem menus internos.

Servidor limita empresa e colunas; anon não recebe acesso a tabelas/RPCs privadas. Módulo desativado/expirado deixa vitrine vazia. Sem escrita, financeiro, reserva ou integração de checkout: compra acontece no anúncio oficial selecionado ou WhatsApp. Não envia mensagem automaticamente. Contatos e grupo expressamente autorizados pelo titular.

Saldo local confirmado por estoque, nunca soma anúncios. Online exige vínculo e anúncio ativos, conta conectada, moeda BRL, preço válido, saldo positivo e permalink HTTPS do marketplace. Um produto pode ter Online e Saldão no mesmo card, com blocos e saldos distintos. Mais de uma conta abre escolha, com preço/URL do mesmo anúncio, exibindo somente marketplace e preço, sem nomes de contas no DTO público. Estoque não Online soma apenas depósitos físicos locais. Desconhecido/zero/arquivado não aparece.

Saldão usa preço, condição e detalhe do último post salvo. Sem post com preço válido, usa a sugestão Médio calculada sobre a referência salva com os percentuais do perfil. Sem referência ou padrão válido, mostra Consulte o valor. Condição ausente pede consulta. Detalhes públicos são apenas os revisados/salvos no post, nunca notas internas. De utiliza preço de referência do cadastro; só mostra comparação quando maior que Por. Imagem usa foto pública do cadastro, sem arte antiga com preço desatualizado. Sem post não inventa condição.

Leitura paginada internamente e limitada; erro/limite falham explicitamente. Cliente pesquisa o catálogo inteiro (normalizado) e renderiza em grupos de 12. Cache Next compartilhado de 15s, revalidação em segundo plano; navegador consulta a cada 30s enquanto visível e ao recuperar foco. É atualização periódica, não garantia de tempo real do marketplace. Em falha as compras ficam bloqueadas, dados anteriores mantidos para orientação. Não há assinatura pública de tabelas nem cópia offline de saldo/preço.

PWA próprio: manifesto e service worker restritos à rota de ofertas, sem interceptar rede/cache. Instalação usa componentes oficiais, exige navegador compatível; não altera PWA Gestão/Vendas. Remover instalação não altera estoque. Ava somente orienta; não recebe custos, credenciais ou dados de clientes.

## Refinamentos 3.2.0.292

Logo oficial no topo; ícone aprovado com Ofertas. InstalarPwa reutilizado com rotuloBotao optativo, preservando rótulo padrão dos outros consumidores. Grupo e Instalar ficam lado a lado no mobile. Filtros comerciais Produto novo (Online) e Produto com detalhe ou avaria (Saldão) não alteram a condição cadastrada, mostrada separadamente. Compartilhar usa URL pública canônica com ?oferta=produto; ao abrir apresenta apenas o produto. Ver todas remove seleção. Oferta encerrada não reaparece por link antigo; informa indisponibilidade. Compartilhamento nativo ou cópia/fallback selecionável, sem envio automático.

No Web há botão Copiar link da oferta ao lado do compartilhamento, com confirmação Link copiado no próprio controle. No mobile o botão Compartilhar abre navigator.share diretamente no gesto, com URL específica; cancelamento é silencioso e não abre outra tela. Ausência/falha da API permite selecionar/copiar URL. A prévia Open Graph usa nome/foto e link da oferta disponível, sem nomes de contas.

## 3.2.0.293

Prévia social do catálogo geral: /ofertas/ofertas-saldao-aline-compartilhar-v1.jpg, JPEG 1200x630 e URL HTTPS absoluta. Oferta específica preserva imagem do produto; ausência usa marca. Filtros mobile em grade única de três colunas com 48px; texto do último ocupa duas linhas dentro da pílula. Nenhuma alteração de saldo, contato, preço, acesso ou gravação. WhatsApp pode manter a prévia anterior no próprio cache até uma nova leitura.

## 3.2.0.294

Topo compacto aprovado: identidade/grupo/instalação em uma faixa, título centralizado, busca com nome acessível e sem rótulo visual/subtítulo. Filtros oficiais BotaoAcaoCompacto com nomes completos em capitalização normal, face 32px e alvo 44px; fonte/padding responsivos para evitar quebra em 320px. Estoque/ordenar alinhados. Sem alteração das regras dos filtros, preço, dados, compra, contatos, compartilhamento/cópia, PWA ou capa social.

## 3.2.0.295

Contatos do catálogo usam offerContactUrl: valida os dois destinos autorizados e codifica uma mensagem no parâmetro text de wa.me. Produtos incluem nome e permalink da oferta; flutuante inclui apenas origem e pedido de informações. Não envia mensagens, altera estoque nem muda as legendas dos posts do AvantaPreços ou o convite do grupo. Atalho oficial compacto de topo acima do WhatsApp aparece com scrollY > 300; listener passivo com RAF e limpeza ao sair. Retorno preserva busca/filtros, foca o título sem salto e respeita prefers-reduced-motion.

## 3.2.0.296 — cabeçalho iPhone

Produção 295 inspecionada: cabeçalho branco, sem background-image/filter/backdrop/máscara/pseudo-elementos/sombra; apenas 8px de padding, viewport sem cover e theme-color vermelho. Hipótese para o relato: conteúdo sob o efeito de borda do sistema. O tratamento usa viewport-fit cover com padding env único no cabeçalho opaco sticky, canvas html/body branco limitado por data-ofertas-viewport e tema/manifesto brancos. Não cria overlay ou status-bar artificial nem altera shells de outros PWAs. Chrome não reproduz o efeito nativo; a correção precisa ser validada no iPhone antes de afirmar resolução completa.

## 3.2.0.302 — preço padrão e prioridade manual

O PWA resolve o Médio usando a referência local e as configurações do perfil, sem consultar Mercado Livre/OpenAI nem salvar cópia de preço por visitante. Atualizar referência manual ou percentuais muda o padrão na próxima leitura, respeitando o cache local de projeção de 15s; a referência não expira. Um post salvo sempre vence no Saldão e não altera o preço do anúncio Online.

Novas preparações ML/Magalu iniciam no Ideal. Preço digitado no formulário, anúncio existente ou copiado continuam sendo preços explícitos do Online; não são reprecificados silenciosamente. Comprar Online mostra sempre o preço do anúncio real já sincronizado. A geração de post em imagem inicia no Médio, permite digitação e recupera o valor da versão salva. Referência editada no cadastro continua referência, não é confundida com preço de venda absoluto. Os dois canais conservam estoque e elegibilidade existentes; nenhum novo anúncio nem estoque é criado ao bipar. Sem migração ou escrita externa automática.

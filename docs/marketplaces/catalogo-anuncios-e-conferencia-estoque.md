# Catálogo de anúncios e conferência física — 3.2.0.61

Implementação local, não publicada. Migração `20261022010000_marketplace_listing_catalog_import.sql` preparada e testada com PostgreSQL local/PGlite; não aplicada ao banco de produção.

## Tarjas

Tarja não depende da condição física nem da quantidade. Conta selecionada limita os vínculos considerados. Sem seleção, todas as contas do perfil participam.

Prioridade: Anunciado (ativo/publicado), Pausado, Em análise, Desativado (inativo/encerrado/cancelado). Todos excluídos, rascunhos ou sem vínculo reconhecido: sem tarja. Um anúncio ativo mantém Anunciado mesmo com outros pausados. A ficha expandida identifica cada conta e sua situação. Os filtros usam a mesma prioridade no banco, antes da paginação. Pílulas dos canais continuam indicando somente canais ativos.

## Importação de contas com anúncios

Cada anúncio salvo na sincronização passa pelo mesmo importador transacional, independentemente do conector. A descoberta continua paginada: não se promete importar toda a conta no instante do OAuth. Novos conectores devem salvar anúncios normalizados em `marketplace_listings`.

1. Vínculo já existente: preservar produto e conferir situação/quantidade **informada pelo anúncio**, sem alterar quantidade física ou reabrir pendência resolvida.
2. Publicação originada no sistema: preservar ID canônico e confirmação local.
3. Anúncio externo: buscar EAN válido único ou SKU exato no mesmo perfil. Divergências externas de título, condição ou voltagem não substituem o cadastro local único; ele prevalece, sem criar outro, e a conferência física fica pendente.
4. Identidade segura encontrada: vincular sem criar produto, sem substituir cadastro/foto/referência/saldos. Pedir conferência física Online mesmo que o produto já tenha um saldo local; preservá-lo até o usuário confirmar.
5. Sem cadastro correspondente: criar o cadastro, com saldo físico não confirmado. Não copiar a quantidade do anúncio nem somar contas.
6. Vários cadastros com o mesmo EAN/nome: manter todos, sem escolher um por suposição. Aviso Estoque a confirmar oferece os cadastros locais candidatos; gestor escolhe um e segue ao produto para conferir quantidade física. A escolha é transacional/idempotente e não informa quantidade nem encerra o aviso físico. Não unificar cadastros legados automaticamente. Variações ainda exigem cadastro por variação, sem agrupá-las num saldo por suposição.

O importador usa trava por empresa compartilhada com o cadastro de consultas do AvantaPreços para serializar anúncios simultâneos. Funções/tabela de pendências são restritas ao serviço; nenhuma permissão de edição do usuário é ampliada.

## Conferência de estoque

`listing_stock_review_at` é uma pendência separada, não uma substituição do saldo. Estoques offline/Saldão não são alterados. Web, AvantaPreços e avisos identificam a pendência. Usuário autorizado usa Ajustar estoque para confirmar a quantidade física **Online**, inclusive zero. Conferir depósito offline não encerra a revisão do Online.

Revisão de saldo avança ao criar a pendência; enviar formulário antigo exige recarregar. Workers de ML/Magalu não enviam quantidade nem pausa automática enquanto a pendência existir; reativação manual também exige conferência. Confirmar fisicamente limpa a pendência e permite o fluxo normal de sincronização. Uma nova venda não equivale a confirmação física. Atualizar preço, reconsultar anúncio e repetir recibo antigo não confirmam o estoque.

## Migração

A migração relembra os anúncios já salvos, atualiza situações divergentes nos vínculos e importa os ainda sem vínculo. Mantém saldos, movimentações, autoria e cadastros legados, incluindo eventuais duplicados que exigem revisão humana. Não faz chamadas aos marketplaces, não pausa anúncios e não executa publicação. Aplicar antes de disponibilizar o código, após a autorização da entrega. Na implantação, garantir que nenhum worker antigo esteja em execução durante a transição; a fila no banco retém jobs do produto pendente e a nova versão também valida a conferência antes de enviar. A confirmação física reenfileira o saldo.

## Ações de anúncio e confirmação remota

Corrigido guard que dependia da conta da ficha expandida e podia retornar sem enviar a confirmação. Empresa, conector, conta, anúncio e chave ficam registrados na confirmação do usuário. A ação independe da ficha aberta; contexto/permissão alterados falham com mensagem. Cliques simultâneos compartilham trava, sem repetir envio.

Pausar/reativar/encerrar/excluir usam os comandos oficiais de [sincronização de publicações do Mercado Livre](https://developers.mercadolivre.com.br/pt_br/produto-consulta-de-usuarios/produto-sincronizacao-de-publicacoes). Aceite do PUT não é sucesso final: nova consulta verifica estado. Pedidos incertos permanecem nos avisos e uma nova leitura persistida encerra a pendência quando comprova o resultado. Edições gravam os campos solicitados e só são confirmadas quando a releitura comprova todos os valores. Falha/timeout nunca autoriza reenviar cegamente nem anuncia sucesso.

Validação desta entrega é local, com banco PostgreSQL/PGlite e APIs simuladas. Nenhuma ação em anúncio real executada; teste operacional exige escolher anúncio/conta autorizado pelo responsável.

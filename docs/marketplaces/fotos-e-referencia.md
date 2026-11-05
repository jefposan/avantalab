# Fotos e pesquisa de referência — 3.1.0.48

PADRÃO AVANTA 1.19.2. Migração de auditoria instalada; interface candidata em validação. Recuperação produtiva dos 28 cadastros do perfil solicitado será executada pelo fluxo autenticado após promoção, sem prometer fotos recuperadas antes da conferência.

## Fotos

- O snapshot do ML retém URLs de fotos verificadas (HTTPS no domínio mlstatic.com); URLs HTTP desse CDN são normalizadas para HTTPS, sem construir fotos por ID. Limite de 12, deduplicação e rejeição de credenciais/esquemas/domínios estranhos.
- Importações antigas sem fotos consultam apenas o anúncio ligado ao produto, na conexão da mesma empresa. Identidade de seller/item/EAN e variações são conferidas antes de usar imagens. Variações não são unificadas por suposição.
- Importação/reimportação e Recuperar fotos preenchem somente a lista vazia. RPC enrich faz lock e revisão, preservando fotos manuais e todos os campos revisados. Recuperação não altera anúncios, preço, saldo, descrição ou lotes. Não há download/novo upload da imagem, só endereços verificados da origem.
- Recuperar fotos exige gestão, consulta cinco produtos vazios por lote usando cursor estável, sem varrer outras empresas. A interface informa recuperados e pendentes. Repetir não duplica nem substitui fotos. Feche detalhes/edições antes de iniciar.

## Referência de mercado

- Botão circular na pílula Referência, disponível a quem pode gerenciar produtos, sem elevar o card. Edição manual continua separada. Recolher detalhes antes de pesquisar evita descartar campos em edição.
- POST produtos/preco usa nome/EAN do cadastro salvo, não valores enviados pelo navegador. Reutiliza consultOpenAIWebPrices e a amostra de até cinco ofertas atuais/comparáveis do AvantaPreços. Banco calcula média arredondada a centavos; grava evidências, valor anterior e responsável por empresa.
- Só preço de referência e revisão do produto mudam. Nenhuma alteração de anúncio remoto, saldo, fotos, descrição ou histórico/lotes já salvos. Mínimo/médio/ideal são recalculados no card pelos percentuais configurados.
- Migração 20261019010000_marketplace_product_price_research.sql: API de gestão, RLS, grants apenas service_role, idempotência, uma pesquisa pendente por produto e cinco inícios/minuto por operador. Tentativas expiradas não gravam preço; edições concorrentes impedem sobrescrita. Sem oferta válida e falhas preservam referência anterior.
- Espera visível e sem duplicação. Timeout no navegador cancela só a espera, não garante desfazer gravação do servidor; atualizar a lista antes de nova tentativa. Nenhuma repetição automática da pesquisa paga. Web somente; não cria nova tela no PWA.

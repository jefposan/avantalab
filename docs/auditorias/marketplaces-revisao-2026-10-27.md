# Marketplaces — conflito ao trocar Clássico/Premium

Caso: Lenoxx PMP435, EAN 7897181903311, cadastro `629e15bf-0caf-4ad8-88a0-0e19ba8114a4`. Investigação e correção 3.2.0.238.

## Evidência da tentativa

- A revisão aberta mantinha Premium no rascunho, com todos os campos desabilitados e a mensagem, recolhida em Resultado do envio: “Um anúncio ou vínculo mudou durante a revisão. Recarregue antes de publicar.”
- A leitura dos quatro anúncios salvos ainda indicava `gold_special` (Clássico). Não havia ações de edição registradas em `marketplace_listing_actions` para esses quatro IDs na consulta. A interrupção ocorreu na pré-validação, antes de reservar/enviar a escrita de Premium.
- Uma segunda aba, aberta apenas para consulta, liberou os botões de ficha técnica e tipo de anúncio, sem tocar no rascunho anterior. Portanto o bloqueio global não correspondia a uma proibição permanente do Mercado Livre.

## Causa no código e limites da evidência

1. `freshEditor` calculava o hash da revisão com `item.last_updated` e o editor inteiro, incluindo preço, estoque, estimativas de tarifa, textos informativos e ordem das opções. Na edição comum, porém, só título, descrição e tipo podem ser enviados. Uma mudança nos dados de consulta bastava para recusar a troca de tipo, mesmo sem mudança nos campos editados. Fotos/ficha também dependiam de `last_updated` além dos valores reais, esquema e alcance.
2. O cliente marcava toda falha como `stale`; esse estado desabilitava todos os campos e ações de preparo, e a única recuperação descartava o rascunho. O motivo ficava recolhido no resultado.

O registro anterior não guardou os dois retratos que produziram o conflito. Não é possível afirmar retrospectivamente qual metadado específico mudou naquela tentativa. A auditoria de complementação do produto estava concluída às 13:54:47 UTC, com zero anúncios atualizados, e não comprova uma escrita automática do AvantaLab durante essa revisão. O mecanismo de falso conflito e a trava posterior são reproduzidos em testes de regressão.

## Correção

- Edição comum usa um estado de revisão restrito à identidade, conta, moeda, vínculo, situação, valores editados, permissões/limites e IDs dos tipos permitidos. Preço/estoque e estimativas informativas não entram nesse hash; edição individual mantém seu contrato anterior.
- Fotos/ficha continuam comparando conteúdo, variações, permissões, esquema e alcance; apenas o horário genérico deixa de causar conflito sozinho.
- Conflito detectado antes de qualquer PATCH faz uma nova leitura, preserva as escolhas e exige nova confirmação. Mudanças reais encontradas são mostradas. Vínculos e campos que perderam permissão continuam bloqueando o envio.
- Falha parcial/incerta interrompe próximos destinos. Conferir mantendo rascunho consulta a situação e conserva intenções, sem repetir escritas. Campos de preparo continuam acessíveis; publicação e upload continuam sujeitos à conferência.

## Notas diferentes

Na consulta salva às 20:51 UTC, o próprio Mercado Livre devolveu avaliações de quatro User Products distintos: JEFF 75, ADRIANO 64, ALINE 57, CIDY 57. Vídeo/promoção apareciam como pendências em ADRIANO/ALINE/CIDY, e Flex em ALINE/CIDY. Conteúdo comum não transforma os quatro anúncios e suas condições de venda em uma única avaliação.

O AvantaLab usava o mínimo das contas no medidor consolidado. A revisão passa a mostrar cada conta, anúncio, nota e horário de cálculo, identificando o consolidado como menor nota. Não calcula média, não iguala valores nem promete que Premium sozinho alcance 70.

## Validação

- Testes focados: 74 aprovados; cobertura adicional de apresentação das notas/datas por conta aprovada.
- Segurança: 472 aprovados. PADRÃO AVANTA 1.23.1 e Ava revisada para 3.2.0.238 aprovados. TypeScript do pacote isolado aprovado.
- Teste remoto incluído no pacote: duas leituras consecutivas do editor real e consulta das quatro notas, com bloqueio explícito de escritas nos anúncios. A execução remota e a publicação devem ser confirmadas no recibo do pipeline.

# Publicação autorizada — 3.2.0.62

Data: 21/10/2026. PADRÃO AVANTA v1.21.0.

Resumo: Marketplaces — contagem de estoque independente dos filtros; tarjas por situação; importação de anúncios preservando cadastro local e exigindo conferência física; confirmação de ações remotas; navegação da pendência agrupada à direita dos estoques.

- Pacote isolado da cadeia validada 3.2.0.58 → .59 → .60 → .61 → .62. Não inclui alterações paralelas da raiz.
- Migração necessária: `20261022010000_marketplace_listing_catalog_import.sql`. Mantém os saldos existentes, não copia unidades de anúncios e não altera anúncios remotos.
- Build de produção será enviado sem atribuição imediata dos domínios. Após aprovação, o fluxo automático obtém a trava da fila de estoque, aplica a migração em transação com verificações de preservação e promove a versão. Libera a trava somente após conferir a promoção.
- Se o build falhar, não aplica migração nem troca os domínios. Se a promoção falhar após a migração, registra erro e retém temporariamente a trava para intervenção; não anuncia publicação concluída.
- Versão e resumo descritivo acompanham os metadados da Vercel. Enviado/em build não significa publicado.
- Correção da identificação visível: snapshot Git local do pacote com título `3.2.0.62 — Marketplaces: estoque, tarjas, importação, confirmação de ações e avisos`; enviar também `githubCommitMessage` e SHA real desse snapshot, além dos metadados Avanta. Não modifica nem envia commits do repositório de trabalho. Primeiro build sem identificação Git, `dpl_C46zM9U22x7kWvTsywG7fSt7WYkp`, cancelado antes de migração/promoção para substituição.
- Sem upload nativo às lojas. Gestão Mobile e AvantaVendas preservados.
- Recibo operacional e resultado de migração: `/private/tmp/avanta-release62-status.json`. A autorização não é confirmação de que já está no ar.

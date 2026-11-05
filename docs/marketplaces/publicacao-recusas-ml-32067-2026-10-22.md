# 3.2.0.67 — Marketplaces: exibir motivo da recusa e indicar campo para ajuste

Publicação do sistema autorizada pelo responsável em 22/10/2026. PADRÃO AVANTA v1.21.0. Não há autorização nem execução de publicação de produto durante esta entrega.

Escopo: diagnóstico sanitizado de recusas ML 400/409/422 com motivo/código e identificação do campo por referência, código ou ID/índice do atributo enviado. Formulário mantém dados/chave, destaca campos/características e oferece Conferir campo. Resposta sem campo/motivo permanece explícita; não presume exigências ausentes.

Pacote isolado baseado na produção 3.2.0.66, preservando recuperação de acesso, sincronização, rodapé e AvantaVendas av191. Somente arquivos desta correção, testes, versão e documentação substituídos. Sem migração, alteração de sessão, permissões, plano ou dados do negócio. Não envia POST /items real, não publica produto e não altera anúncios durante a validação.

Testes usam provedores e banco simulados, incluindo recusa em /items/validate antes de qualquer cadastro/publicação. Manifesto em /private/tmp/avanta-release67-manifest.json; recibo em /private/tmp/avanta-release67-status.json. Envio à Vercel com promoção automática após build aprovado; em build não significa publicado.

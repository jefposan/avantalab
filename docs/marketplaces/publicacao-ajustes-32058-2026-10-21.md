# Publicação autorizada — 3.2.0.58

Data: 21/10/2026. PADRÃO AVANTA 1.21.0.

Resumo: Marketplaces — avisos por situação do anúncio, conferir e ajustar, sincronização compacta, gestão de anúncios pelo produto, tarja por conta ativa e expansão alinhada ao topo.

## Escopo

- Inclui as entregas locais 3.2.0.54 a 3.2.0.58, preservando a produção 3.2.0.53.
- Ignora falta de estoque de anúncios fora de venda, mantendo pendências reais de venda e de confirmação remota.
- Conferir e ajustar abre o item correto, na conta/plataforma correspondente, sem executar ajuste automático.
- Modal de sincronização compacto em duas colunas no Web; confirmação em etapa própria, paginação de anúncios e rolagem de segurança em telas pequenas/zoom. Conferência visual completa não foi confirmada no navegador local; os testes de estrutura e confirmações passaram.
- Produto oferece conferir situação, pausar, reativar com saldo Online, encerrar e excluir conforme estado/conector. Tarja só desaparece quando não há anúncio ativo em nenhuma conta. Preserva Saldão, cadastro e histórico.
- Expansão pelo título/seta alinha o início do produto abaixo dos marketplaces; recolher/atualizar não força rolagem.

## Segurança e validação

- Sem nova migração de banco ou alterações reais de anúncios/estoques para testar.
- Pacote isolado a partir da cadeia validada .53 → .54 → .55 → .56 → .57 → .58; 42 arquivos da entrega conferidos com a origem, sem divergências antes da preparação do envio.
- Versão, resumo e identificação da entrega acompanharão os metadados da Vercel.
- Gestão Mobile/AvantaVendas preservados, sem upload nativo às lojas.
- Envio autorizado com promoção automática após build aprovado. Enviado/em fila/em build não significa publicado.

O identificador do envio e seu estado inicial serão registrados após a resposta da Vercel.

# Publicação — estoque compacto e observações internas

Entrega3.2.0.37 autorizada em21/10/2026, incluindo revisões locais36–37.
Pacote isolado sobre3.2.0.35, preservando contas/status simplificados, leitor de
etiqueta, Gestão Mobile, AvantaVendas e integrações online já publicadas.

## Banco

Migração20261021030000 aplicada e registrada.99produtos e124saldos preservados,
assim como movimentos, recibos, vínculos, fila, usuários e definições das funções
originais de produto/estoque. Comparação por hash dentro da mesma transação.
Tabela de notas inicialmente vazia; RLS ativo, anônimo/autenticado sem leitura
direta ou execução do wrapper, service_role com acesso ao comando privado.
Sem comandos de teste sobre produtos reais, sem movimentação de saldo real.

## Validação

Pacote:670testes Marketplaces aprovados, incluindo SQL/PGlite; verificações
PADRÃO AVANTA1.20.0 e Ava3.2.0.37 aprovadas. Layout320/390px e tema escuro conferidos
no navegador, com imagem gerada de dados fictícios. Notas não são enviadas aos
anúncios, mas o usuário deve revisar Detalhes antes de compartilhar um post.

Logs/manifesto locais:/private/tmp/avanta-notes37-*. Estado da publicação será
registrado após o envio; este documento não confirma disponibilidade pública.

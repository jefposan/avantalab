# 3.2.0.114 — Marketplaces: publicação em várias contas

Base: produção 3.2.0.113, dpl_AHYfyn1NBuba6744pD5cxJfGsNBH.
Pacote isolado; raiz compartilhada e alterações de outros trabalhos não publicadas.

## Escopo aprovado

- Preparar a partir do produto sem seleção antecipada de destino.
- Escolher contas ao final em até três colunas, conforme a largura.
- Contas já anunciadas marcadas e bloqueadas; desmarcar nunca pausa ou exclui.
- Validação, frete, erros e resultado por conta; personalização comercial.
- EAN e saldo Online únicos; atualização comercial dos existentes exige confirmação.
- Reserva estável contra duplicação; respostas incertas não são reenviadas.
- Magalu mantém etapas assíncronas e conferência da tentativa exata.
- Estoque: tentativa prioritária após commit, fila durável e confirmação remota.
- Quantidade zero pausa; alterações de quantidade não reativam pausa manual.

## Validação local

- Tipagem e geração de rotas aprovadas.
- Padrão Avanta 1.21.0 e três manuais da Ava revistos para 3.2.0.114.
- Segurança: 441 testes no workspace e 429 disponíveis no pacote isolado aprovados.
- Marketplaces: 931/932 na primeira execução; única falha era rótulo antigo
  “Publicar em outra conta”. Expectativa atualizada para “Anunciar em mais contas”,
  preservando as verificações. Reexecução dos testes afetados e de integração:
  50 aprovados, sem falhas. Suíte completa permanece obrigatória no build remoto.
- Navegador local: três, duas e uma coluna; celular de 390px sem overflow horizontal.
- Ensaio fictício: duas contas concluídas, uma recusada; repetir atinge somente
  a recusada, sem recriar as concluídas. Origem permanece marcada e bloqueada.
- Nenhum produto, venda ou anúncio real criado nos testes.

## Banco

Aplicada somente 20261023050000_marketplace_multi_publication_targets, com
registro no histórico. Tabela nova acessível somente ao servidor, RLS ativo.
Antes/depois: 145 produtos, 50 vínculos; zero reservas. Sem modificação dos
registros existentes. Remoção de produto/conexão elimina apenas sua reserva,
nunca o histórico de publicação.

## Publicação e restauração

Snapshot de restauração 3.2.0.113 preservado em pacote isolado e bundle local.
Publicação autorizada do sistema, nunca de produto de teste. Não declarar
publicado antes de READY e promoção; envio concluído deve ser comunicado
imediatamente, com versão e resumo visível na Vercel.

Limite: APIs externas não oferecem transação atômica entre marketplaces.
Indisponibilidade ou vendas simultâneas podem atrasar a confirmação remota;
a fila durável e os avisos permanecem como contingência.

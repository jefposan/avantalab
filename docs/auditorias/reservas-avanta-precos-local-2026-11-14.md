# AvantaPreços — Reservas por estoque — candidato local 3.2.0.417

Estado: implementação candidata e migração de reservas somente locais, sem push ou publicação. Teste real autorizado de preço/estoque do mixer realizado pela interface de produção existente, com restauração dos valores. Não foi criada reserva em produção.

## Origem e restauração

- Main oficial consultada na rede em 14/11/2026: `80dd47f23cd7ba461629e4135b387b98dac2b54e`, versão 3.2.0.414.
- Cópia isolada: `/private/tmp/avanta-reservas-local`, branch `codex/avanta-precos-reservas`. O checkout compartilhado foi preservado.
- Ponto de restauração local: `restauracao/reservas-base-3.2.0.414`, no mesmo SHA da main usada como origem.
- Refinamento 416 parte do candidato local `8fa8808`, preservado em `restauracao/reservas-local-3.2.0.415`.
- O manifesto aponta ao deployment 414 que originou a fonte e lista somente a migração nova, pelo SHA-256. Isso não dispensa consultar novamente main, produção vigente e fila antes de qualquer futura integração/publicação.

## Fluxo e limites

1. Botão Reserva é o quarto da linha Ajustar estoque, Adicionar saldo, Venda, Reserva. Em 390 px os quatro estão na mesma linha e sem overflow; telas muito estreitas podem quebrar em duas linhas, preservando toque.
2. Nova reserva começa pela seleção explícita do estoque. Uma unidade disponível fixa a quantidade em 1; com mais unidades o usuário escolhe a quantidade. Comprador obrigatório, observação opcional, revisão e confirmação.
3. `quantity` permanece disponibilidade operacional. `reserved_quantity` registra unidades fisicamente presentes, bloqueadas. Total da consulta inclui ambas; saldos individuais mostram disponíveis e destacam reservado.
4. A reserva total impede venda/transferência comum das unidades bloqueadas; a parcial deixa o restante disponível. Produtos reservados continuam nas listas do estoque mesmo com disponível zero. A tarja oficial Reservado substitui a de publicação somente quando todo o saldo do escopo está reservado; reservas parciais mostram sua quantidade sem fingir que o anúncio foi pausado.
5. Minhas reservas reúne reservas ativas do produto para a equipe autorizada. Cancelar exige confirmação e libera uma vez. Concluir pede preço unitário/data e reutiliza a transação de venda direta, com ligação entre reserva e venda e sem dupla baixa. Sem vencimento automático ou edição de quantidade: cancelar e criar uma nova reserva é explícito.
6. Empresa/ator e permissão vêm da sessão; exige Registrar vendas ou papel gerencial. Mesma trava por empresa, trava de produto/saldo, revisões, recibos e RLS evitam mistura de perfis e repetição. Uma resposta incerta mantém a mesma chave no aparelho para recuperação.
7. Online enfileira disponibilidade na fila durável existente e mantém envio pendente até releitura do provedor. A reserva local não torna a alteração remota instantânea ou atômica entre contas. Com anúncios ligados, sincronização desativada impede nova reserva Online.
8. Cancelar autoriza aumento; reativação automática só é avaliada para pausa de estoque reconhecida como do sistema, posterior à reserva, na revisão exata liberada, sem ação manual posterior registrada. Mercado Livre exige releitura de quantidade/status; Magalu mantém 202 em processamento até releitura. Fulfillment, multiorigem, variações e demais limitações do conector permanecem pendentes, sem sucesso inventado.
9. Importação anúncio → local fica bloqueada com reserva Online ativa, para não recolocar unidades já bloqueadas por um saldo remoto antigo; local → anúncios continua disponível. A revisão do RPC protege uma reserva criada concorrentemente.
10. Reservas ativas protegem arquivamento/limpeza do produto, arquivamento do estoque e troca de qual depósito é Online. Históricos permanecem.

## Teste local

URL: http://127.0.0.1:3415/marketplaces/validacao-reservas

- PostgreSQL/WASM PGlite isolado; migração aplicada somente nesse banco.
- Dados fictícios: Online 3, Saldão 1; anúncios simulados JEFF, ALINE, CIDY, ADRIANO. Sem credenciais de produção ou operações reais.
- Reiniciar teste recria somente o cenário local. Processar anúncios simulados aplica o disponível atual aos quatro anúncios simulados; Simular falha de envio mantém a pendência.
- Pela interface: Saldão 1 → reservar 1 → disponível 0/Reservado → cancelar → 1; Online 3 → reservar 1 → 2 → envio falho → nova tentativa → quatro anúncios com 2; concluir pela reserva por R$ 189,00 → disponível continua 2, reservado 0, total físico cai de 4 para 3. Cenário reiniciado para avaliação do responsável.
- Tema escuro e quatro botões em viewport de 390 px conferidos. Captura do estado inicial preservada junto às imagens da conversa.

## Validação

- Regressão Marketplaces na 416: 1.492 aprovados de 1.495 testes, zero falhas, 3 ignorados pelo conjunto.
- Segurança na etapa 415: 712 aprovados, zero falhas; não foi repetida na alteração de rótulo da 416.
- Depois dos refinamentos finais: 45 testes de integração/estoque; 43 de reservas/worker/UI/publicação; 11 de movimentação e atualização aprovados, sem falhas. Os conjuntos se sobrepõem e não devem ser somados como testes únicos.
- SQL real testa repetição, concorrência por revisão, saldo insuficiente, venda comum de reservado, rollback integral, transferência bloqueada, conclusão/cancelamento único, permissões e isolamento por perfil.
- API testa sessão, Registrar vendas, empresa/ator autenticados, validação e bloqueio de importação remota sobre reservas.
- TypeScript, PADRÃO AVANTA 1.23.1, Ava e diff sem erros aprovados. Sem alteração em validações ou gate de publicação.
- Pipeline integrado da 416 exercita SQL de reservas, enfileiramento e trigger oficiais, fila persistida, worker e editor de produção contra quatro respostas remotas simuladas. Testa reserva parcial/total, cancelamento, retomada de pausa do sistema, conclusão sem dupla baixa, ajuste manual, resposta 200 ignorada, nova tentativa, geração antiga e confirmação de preço sem enviar estado/estoque junto. A rede simulada não substitui a evidência real abaixo.
- Pela API/interface local, uma reserva Saldão foi concluída por R$ 150,00 e apareceu em Histórico de vendas. Registro fictício; cenário reiniciado para Total 4, Online 3, Saldão 1 após a captura.

## Teste real autorizado — mixer EAN 7896443138355

Autorização do responsável: usar o mixer informado, inclusive contas diferentes de JEFF. Perfil Saldão Aline, produto Mixer Branco Mallory Robot 300. Operações feitas pela interface autenticada do AvantaLab em produção 3.2.0.414; conferência das respostas persistidas do provedor e da fila por leitura restrita ao produto. A versão candidata não foi publicada nem sua migração aplicada em produção.

| Conta | Anúncio | Preço inicial/final | Saldo final | Estado inicial/final |
| --- | --- | --- | --- | --- |
| ADRIANO | MLB7979361720 | R$ 93,50 | 2 | Pausado pelo vendedor |
| ALINE | MLB7979392656 | R$ 93,00 | 2 | Pausado pelo vendedor |
| JEFF | MLB5545688945 | R$ 92,00 | 2 | Pausado pelo vendedor |
| CIDY | MLB7979361890 | R$ 92,50 | 2 | Pausado pelo vendedor |

1. JEFF: preço R$ 92,00 → R$ 91,99, confirmado por releitura às 17:15:36 UTC; depois restaurado para R$ 92,00, confirmado às 17:19:12 UTC de 14/11/2026. Estoque 2 e pausa preservados; outras três contas sem alteração de preço.
2. Estoque Online: 2 → 1, revisão 7. Os quatro envios ficaram `synced`, sem erro, desejado 1, com releituras entre 17:23:14 e 17:23:17 UTC.
3. Reposição: 1 → 2, revisão 8. Os quatro envios ficaram `synced`, sem erro, desejado 2, com releituras entre 17:25:31 e 17:25:33 UTC. Interface reconferida: quatro anúncios pausados, 2 unidades cada.
4. Referência cadastrada R$ 130,00 preservada. Nenhuma venda, receita ou documento fiscal foi criado pelo teste real. Movimentações, revisões e horários de auditoria do teste permanecem registrados; não foram apagados.

Limite da evidência: preço real testado na JEFF; mudança de quantidade e reposição reais nas quatro contas. Todas estavam pausadas manualmente e assim permaneceram. Reserva/cancelamento/conclusão e pausa/retomada automática foram exercitados no banco e pipeline locais, não em produção. Não há alegação de teste real de Magalu, multiorigem, fulfillment ou outros produtos.

Capturas na pasta `reservas` dos artefatos da conversa: `mixer-real-restaurado.jpg` (produção restaurada), `historico-vendas-local.jpg` (venda fictícia no histórico) e `tela-local.jpg` (ações de reserva no celular).

## Ações existentes

Venda registra uma nova venda. Histórico de vendas (nome aplicado na 416 ao botão e à janela antes chamados Vendas diretas) abre as vendas manuais para consulta/cancelamento/devolução, incluindo as concluídas pela reserva. Outras saídas registra perda, avaria ou uso interno, sem venda. A operação interna continua sendo venda direta; a mudança de nome não altera seus lançamentos.

## Posição Web — refinamento 3.2.0.417

Reserva integrada à linha Editar / Reserva / Atualizar estoques da apresentação Web do componente compartilhado, consumido por Produtos cadastrados, Estoques e consulta Web do AvantaPreços. Mesma API e fluxo da versão de celular. Prévia local Mobile / Web agora troca a apresentação real do componente. No navegador, abertura exibiu Estoque de origem com Online e Saldão, e o fechamento devolveu foco a Reserva. Captura `reserva-web-previa.jpg`, com dados fictícios; sem nova publicação ou escrita real em contas.

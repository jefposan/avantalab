# AvantaPreços — Reservas por estoque — candidato local 3.2.0.415

Estado: implementação e validação somente locais. Sem push, publicação, migração em produção ou chamadas de escrita a marketplaces reais.

## Origem e restauração

- Main oficial consultada na rede em 14/11/2026: `80dd47f23cd7ba461629e4135b387b98dac2b54e`, versão 3.2.0.414.
- Cópia isolada: `/private/tmp/avanta-reservas-local`, branch `codex/avanta-precos-reservas`. O checkout compartilhado foi preservado.
- Ponto de restauração local: `restauracao/reservas-base-3.2.0.414`, no mesmo SHA da main usada como origem.
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

- Regressão Marketplaces: 1.484 aprovados, zero falhas, 3 ignorados pelo conjunto.
- Segurança: 712 aprovados, zero falhas.
- Depois dos refinamentos finais: 45 testes de integração/estoque; 43 de reservas/worker/UI/publicação; 11 de movimentação e atualização aprovados, sem falhas. Os conjuntos se sobrepõem e não devem ser somados como testes únicos.
- SQL real testa repetição, concorrência por revisão, saldo insuficiente, venda comum de reservado, rollback integral, transferência bloqueada, conclusão/cancelamento único, permissões e isolamento por perfil.
- API testa sessão, Registrar vendas, empresa/ator autenticados, validação e bloqueio de importação remota sobre reservas.
- TypeScript, PADRÃO AVANTA 1.23.1, Ava e diff sem erros aprovados. Sem alteração em validações ou gate de publicação.
- A integração real com provedores não foi exercida: chamadas do worker foram simuladas nos testes. Será necessário teste controlado autorizado no provedor antes de considerar a sincronização real verificada.

## Ações existentes

Venda registra uma nova venda. Vendas diretas abre o histórico para consulta/cancelamento/devolução. Outras saídas registra perda, avaria ou uso interno, sem venda. Foi sugerido ao responsável renomear Vendas diretas para Histórico de vendas; esse nome ainda não foi alterado nesta entrega.

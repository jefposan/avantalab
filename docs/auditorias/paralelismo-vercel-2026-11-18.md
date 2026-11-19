# Paralelismo de testes na máquina atual — 3.2.0.492

Autorização: otimizar e testar na máquina atual, sem aumentar recursos contratados.
Mudança isolada da main `b1121507532ddaa80512e747b2872d5c3fba86a3`.
PADRÃO AVANTA 1.24.0 consultado; sem alteração de interface.

## Referência medida

Produção 3.2.0.491, `dpl_Acrf4YzYC1krvmVTgJ7NQw27cF6a`:

- Enhanced fixa: 8 vCPUs, 16 GB. Cache restaurado da produção anterior.
- Suíte completa: 3.077 testes, 3.071 aprovados, seis ignorados pelo conjunto, zero falhas.
- Dois processos: 303.568 ms (5min04s).
- Compilação: 54 s. TypeScript: 64 s. Build total: 489 s (8min09s).

## Candidato

- Até quatro processos somente em VERCEL=1; teto local permanece dois.
- Limite pela CPU e pelo menor valor entre RAM total e restrição do processo.
- Orçamento conservador: 4 GiB de reserva e 2 GiB por processo; memória desconhecida mantém teto dois.
- Override local 1/2; na Vercel 1/2/3/4, sempre sujeito aos limites detectados.
- Nenhum teste omitido, cache de aprovação, dispensa de tipagem ou alteração de máquina/plano/concorrência de deployments.
- Preview não promove produção. Uma medição não estabelece ganho garantido para todos os builds.

## Resultado do preview

Deployment `dpl_9ApnjzAK1HPHqA5yE8jPgRkUJHZX`, snapshot
`0a40419177e80d6ebde6d0c92a82a1d6496f8c70`, aprovado (READY), sem promoção.

- Mesma Enhanced fixa de 8 vCPUs/16 GB; runtime detectou oito CPUs e 16,3 GiB.
- Cache restaurado da referência 3.2.0.491. Nenhuma dependência ou máquina alterada.
- 570 arquivos, quatro processos. 3.078 testes: 3.072 aprovados, seis ignorados pelo conjunto, zero falhas.
- Suíte: 121.398 ms (2min01s), ante 303.568 ms; redução observada de 60,0%.
- Build completo: 293 s (4min53s), ante 489 s; redução observada de 40,1%.
- O teste novo de limites acrescenta um caso à referência; não houve remoção de testes.
- A comparação é uma medição por configuração; carga compartilhada, rede e cache podem variar. Não estabelece ganho garantido nem teto rígido de consumo por processo.
- Computador local confirmado com dois processos apesar de oito CPUs disponíveis.

Recibo em output/pipeline do checkout canônico. Produção 3.2.0.491 preservada.
O candidato está pronto para a próxima integração/publicação autorizada, sem trocar o plano ou os recursos da máquina.

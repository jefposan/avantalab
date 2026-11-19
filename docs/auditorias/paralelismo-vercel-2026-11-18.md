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

Resultados remotos serão registrados no recibo de preview em output/pipeline.

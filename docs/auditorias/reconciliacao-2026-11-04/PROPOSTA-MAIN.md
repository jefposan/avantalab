# Proposta de retorno à main — 3.2.0.310

**Candidato local validado. Nenhum push, PR, merge, deploy ou alteração de banco
foi realizado por este trabalho.** A próxima ação proposta é enviar somente a
branch e abrir um PR em rascunho, após autorização explícita do responsável.

## Base e conteúdo

- Main oficial de partida: `027fd1e85dbad471146d0b1bb7556106f5787ced` (3.1.0).
- Produção funcional preservada: 3.2.0.309,
  `dpl_Dq1wCBwU92G354cov6BCiN4qrYt9`, snapshot
  `884bf1d716d5d203ded0828fe25fc7df92490fa9`.
- As fontes servidas em produção foram comparadas por hash; o espelho dedicado
  preserva os 2.314 arquivos. Doze fontes ausentes do Git original foram
  recuperadas do deployment. Os 118 arquivos omitidos pelo pacote web foram
  preservados da main, sem interpretar ausência no pacote como exclusão.
- Não foram importados arquivos do desenvolvimento paralelo não publicado.
- O candidato preserva a ancestralidade da main e não exige push forçado.

## Auditoria e limpeza

- Os 15 SQLs sem identificador remoto estão ligados a recursos presentes e usados
  pelo código publicado. Nenhum foi considerado descartável. A classificação
  provisória como material exclusivo de testes foi removida.
- Fontes preservadas byte a byte em `supabase/historico-sem-registro`, com hashes,
  inventário e referências. Testes e demonstração local consomem a fonte única.
  Não entram na fila automática de migrações nem são reaplicadas.
- As causas das outras 19 diferenças foram documentadas. Seis arquivos históricos
  foram reconciliados à sequência SQL registrada; cinco corrupções de registro
  são reproduzidas byte a byte; duas equivalências de formatação foram testadas;
  seis registros sem SQL integral têm evidências externas e limitações explícitas.
- Plano de SQL para esta entrega: `migrations: []`. Não aplicar repair, down ou
  limpeza de dados para alinhar o Git. O banco existente permanece inalterado.

## Proteção e validação

- Guarda de produção preparada: SHA exato da main consultado na rede, identidade
  oficial e plano SQL no mesmo commit. Fila, base e build completo mantidos.
  A proteção só passará ao fluxo canônico após integração autorizada.
- Build completo: 2.517 testes aprovados, zero falhas, seis ignorados pelo próprio
  conjunto (2.523); Next.js, TypeScript e geração de 234 páginas aprovados.
- Segurança: 505 testes aprovados. Infraestrutura: 38 aprovados.
- PADRÃO AVANTA 1.23.1, Ava e verificador offline de históricos aprovados.
- A versão 3.2.0.310 é candidata e precisa ser reavaliada se outra entrega chegar
  à produção antes da integração. Produção e fila foram reconferidas em leitura.

## Autorizações separadas e restauração

1. Autorizar envio da branch e PR em rascunho não autoriza merge, promoção ou banco.
2. Revisar o diff completo em `arquivos-candidato.json`, as ressalvas do
   `FECHAMENTO.md` e a decisão individual em `AUDITORIA-15-SQL.md`.
3. Antes de autorizar merge, confirmar se o GitHub/Vercel dispara produção
   automaticamente. Não disparar essa publicação sem autorização correspondente.
4. A raiz `/Users/JEFF/avantalab` contém trabalhos paralelos e não foi trocada,
   resetada ou sobrescrita. Novos trabalhos devem usar branches/worktrees da main
   atualizada; a raiz só deve ser sincronizada após preservar seus trabalhos.

Antes de integrar, não incorporar o candidato mantém main e produção intactas.
Depois do alinhamento, não reverter a importação inteira para o código 3.1.0:
correções devem ser novos commits sobre a linha atual, mantendo versão crescente.
O espelho 3.2.0.309 é referência funcional de restauração, sem desfazer banco ou
reexecutar migrações/limpezas. Qualquer publicação posterior exige autorização.

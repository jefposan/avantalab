# Reconciliação AvantaLab — candidato 3.2.0.310

**Estado: NÃO APTO PARA INTEGRAÇÃO.** Auditoria e candidato local; nenhum envio,
PR, merge, promoção, mudança de banco ou alteração do checkout canônico.
PADRÃO AVANTA consultado: 1.23.1. Data: 04/11/2026, America/Sao_Paulo.

## Produção e main

- Produção confirmada após a publicação paralela: **3.2.0.309**,
  `dpl_Dq1wCBwU92G354cov6BCiN4qrYt9`, READY/PROMOTED;
  `avantalab.com.br` aponta para esse deployment. O detalhe da Vercel também
  relaciona os demais domínios oficiais. Snapshot:
  `884bf1d716d5d203ded0828fe25fc7df92490fa9`.
- A publicação 3.2.0.309 não foi interrompida. A implementação isolada começou
  depois de confirmar a promoção e a fila livre.
- Main oficial: `027fd1e85dbad471146d0b1bb7556106f5787ced`, versão 3.1.0,
  confirmada por `git ls-remote` no GitHub.
- Clone: `/private/tmp/avanta-reconciliacao-20261104`;
  branch `codex/reconciliacao-producao-main-20261104`, criada da origin/main.
  Autor/committer configurados localmente: Jeff <jefposan@hotmail.com>;
  remoto oficial. Nenhuma troca/reset de branch da raiz compartilhada.
- A versão 3.2.0.310 é somente candidata. Precisa ser reavaliada se outra
  produção for promovida antes da integração.

## Inventário e seleção das fontes

- 383 deployments consultados em quatro páginas do histórico. No intervalo
  posterior ao commit da main, 241 READY/PROMOTED e quatro READY/STAGED;
  acrescentada a produção 3.2.0.309: **242 promovidos inventariados**.
  STAGED, ERROR, preview e trabalhos locais não serviram como base.
- 240 árvores históricas promovidas recuperadas da Vercel, além da árvore
  3.2.0.309. Uma árvore de fonte retorna 404 na API: corresponde precisamente
  ao commit da main e está disponível pelo objeto Git desse commit.
- 84 deployments históricos do intervalo não informam SHA Git nos metadados.
  Não foi inventado um SHA para eles: a comparação usa a árvore de fontes
  armazenada pelo provedor. Isso limita a rastreabilidade Git histórica.
- Os **2.314 arquivos de fonte** da produção 3.2.0.309 foram comparados por
  SHA-1 de conteúdo com o candidato antes das mudanças desta reconciliação:
  nenhuma divergência. Não é uma comparação do binário compilado.
- Doze arquivos publicados não pertenciam ao snapshot Git: o script principal
  mobile e onze imagens. Foram recuperados da fonte da Vercel e conferidos
  por hash. Nenhum deles veio do checkout compartilhado.
- Os 118 arquivos ausentes no pacote web foram preservados byte a byte da main:
  Android, iOS, imagens de apoio e um `.dockerignore`. Nenhuma dessas ausências
  foi interpretada como autorização de exclusão. Isso preserva fontes nativas
  históricas, sem afirmar que representam os binários atuais das lojas.
- Não foi feita uma união de pastas de trabalho. O candidato usa a árvore da
  produção vigente; os hashes históricos mostram arquivos conservados,
  substituídos ou ausentes na versão atual.

## Banco: fatos e pendências

- Projeto: `qzewxhdkwettnlmkjoqd`. Consultados a lista de migrações e
  `supabase_migrations.schema_migrations` com SELECT em transação read-only.
- **271 identificadores remotos**; candidato contém somente esses 271 arquivos
  em `supabase/migrations`. A 20261104190000 consta no remoto.
- O checkout canônico possui 16 identificadores locais sem registro remoto.
  Destes, 15 existiam no pacote publicado e foram excluídos deste candidato.
  O outro já não pertencia ao pacote e não foi importado. Os originais da raiz
  não foram alterados; cópias de auditoria ficam fora do candidato.
- Oito exclusões aparecem no diff contra a main, pois esses arquivos já estavam
  versionados nela. A justificativa é a ausência no histórico remoto, não uma
  autorização para descartar desenvolvimento paralelo.
- **252 conteúdos com equivalência lexical** ao SQL remoto. Essa comparação
  não é prova de bytes originais nem execução de SQL.
- **19 conteúdos exigem conferência complementar**: há seis registros com
  statements nulos, vazios ou apenas descritivos; outros contêm diferenças
  efetivas, SQL reformatado ou perdas de delimitadores/expressões com `$` no
  registro remoto. Não copiar registros inválidos como SQL executável.
- Nos chats “Módulo - Custos e precificação” e “Módulo - AvantaProjetos” foram
  localizados registros de preparação/aplicação das migrações 20261104160000
  e 20260807190000. A entrega 3.2.0.114 documenta a 20261023050000. Esses
  indícios complementam a auditoria, mas não resolvem todas as divergências.
- Nenhuma migration repair, aplicação de migração ou escrita no banco.
  `migrations: []` no manifesto: esta entrega não prevê SQL no banco.

## Proteção preparada no candidato

- Produção exige HEAD igual ao SHA **atual** de refs/heads/main consultado na
  rede, remoto oficial e autor/committer oficiais. Falha de rede bloqueia.
- Plano de migrações precisa estar versionado; cada SQL declarado deve ser blob
  regular do mesmo commit, com SHA-256 exato. O comando não aplica SQL.
- Main consultada novamente imediatamente antes do upload; alteração do pacote
  durante a conferência bloqueia. Fila, trava, base vigente e build completo
  continuam obrigatórios.
- `reconciliationStatus: blocked-audit` impede publicar este candidato.
- A proteção ainda **não está ativa no checkout canônico ou no provedor**.
  Envios diretos que contornem esse comando exigem proteção externa própria.

## Validações

- Dependências exatas instaladas no clone por npm ci; lockfile publicado difere
  do checkout canônico. Nenhuma instalação na raiz compartilhada.
- PADRÃO AVANTA e Ava: aprovados, manuais revisados para a candidata 3.2.0.310.
- Infraestrutura: **28 testes aprovados**, incluindo seis testes da nova guarda.
- Segurança: **493 aprovados, um falho** (494 testes). A falha exige o arquivo
  20261014050000, sem registro de aplicação remota.
- `npm run build`: gate completo executado com um processo de testes;
  **2.447 aprovados, 45 falhos, seis ignorados pelo próprio conjunto**
  (2.498 testes). O comando encerrou com erro antes de next build.
  As falhas decorrem de dependências dos SQLs excluídos, preservados os testes.
  Portanto **não há build de aplicação aprovado** para este candidato.
- Não foram removidos testes nem usados ignoreBuildErrors, cache de aprovação,
  aumento de máquina, force ou turbo.

- Diff contra a main antes deste inventário: 770 A, 8 D, 207 M. Relação explícita em `arquivos-candidato.json`.
- `git diff --check` aponta espaços/fins de linha herdados dos arquivos já
  publicados; não foram normalizados para não ampliar o escopo da reconciliação.

## Próximos passos e restauração

1. Resolver a proveniência/conteúdo dos 19 históricos divergentes, sem reparar
   o banco ou considerar rascunhos como migrações aplicadas.
2. Decisão expressa pendente: permitir que os 15 SQLs já presentes no pacote
   publicado sobrevivam exclusivamente como fixtures de teste, fora da pasta
   de migrações e sem aplicação, ou mantê-los totalmente fora do candidato.
   Nenhuma exceção foi presumida e nenhuma fixture foi incluída por enquanto.
3. Fechar o diff e os testes, executar build aprovado e conferir novamente
   produção, fila, main e versão antes de apresentar integração.
4. Somente após autorização explícita: push, PR e integração por commit normal,
   preservando a ancestralidade da main. Não há necessidade de force ou de
   alterar o histórico publicado. Os snapshots originais permanecem preservados
   no clone e a produção 309 está referenciada em refs/avanta-auditoria/producao-309.
5. Nova publicação deve usar exatamente o SHA então integrado à main e a base
   vigente. Integração no Git não equivale a publicação.

**Restauração nesta etapa:** não integrar o candidato; main e produção continuam
intactas. Depois de integração, correção por novo commit revisado, sem rollback
funcional para 3.1.0 e sem reaplicar ou desfazer migrações históricas. Não houve
mudança de banco a reverter nesta auditoria.

Evidências extensas: JSONs desta pasta; respostas originais, SQL remoto e logs
em `/private/tmp/avanta-reconciliacao-20261104-auditoria/` (fora do pacote).

# Reconciliação AvantaLab — candidato 3.2.0.310

**Estado: candidato local validado, auditorias concluídas quanto às causas e ao
uso dos 15 SQLs. Integração externa depende de revisão e autorização.** Auditoria e candidato local; nenhum envio,
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

## Espelho local fiel da produção

- Pasta durável: `/Users/JEFF/AvantaLab Projetos/espelhos/producao-3.2.0.309`.
- 2.314 fontes com bytes, hashes SHA-1/SHA-256 e conjunto de arquivos
  conferidos. Sem arquivos faltantes, alterados ou extras, exceto metadados
  Git locais. O verificador offline está ao lado da pasta.
- Snapshot local `b1cfcca524d7d6a42433fa7bd00847cbb93dd49c`, distinto do SHA
  da produção: incorpora também os 12 arquivos que faltavam no Git original.
- Espelho preservado sem instalar dependências ou gerar artefatos nele.
  Alterações e testes ocorrem somente no candidato separado.
- A fidelidade cobre as fontes do deployment, não dados de clientes, segredos,
  variáveis remotas ou binários nativos. Estrutura do schema public foi capturada
  separadamente em consulta somente de leitura.

## Banco: fatos e fechamento da auditoria

- Projeto: `qzewxhdkwettnlmkjoqd`. Consultados a lista de migrações e
  `supabase_migrations.schema_migrations` com SELECT em transação read-only.
- **271 identificadores remotos**; candidato contém somente esses 271 arquivos
  em `supabase/migrations`. A 20261104190000 consta no remoto.
- O checkout canônico possui 16 identificadores locais sem registro remoto.
  Quinze estavam no pacote publicado. A [auditoria individual](AUDITORIA-15-SQL.md)
  constatou estruturas presentes e uso pelo código de produção nos 15 casos;
  nenhum deles foi considerado obsoleto ou excluído do produto.
- Esses 15 SQLs estão em `supabase/historico-sem-registro`, com os mesmos bytes
  publicados e proveniência explícita. A classificação provisória como arquivos
  exclusivos de testes foi corrigida. Os testes usam a mesma fonte histórica do produto,
  sem duplicá-la nem colocá-la na fila automática de aplicação.
- O outro identificador local não fazia parte do pacote publicado e não foi
  importado. Os originais do checkout canônico permanecem intactos.
- Oito arquivos aparecem como saída do caminho antigo da main; são movimentos
  de fontes preservadas, não remoção de funcionalidades. Ausência no registro
  remoto não é usada como prova de ausência de estrutura ou de recurso ativo.
- **258 conteúdos com equivalência lexical** após restaurar seis fontes ao SQL
  registrado. Essa comparação não é execução de SQL.
- As 19 diferenças foram classificadas no [fechamento](FECHAMENTO.md): seis
  arquivos históricos restaurados, cinco corrupções de registro reproduzidas
  byte a byte, duas equivalências de formatação e seis registros sem SQL integral
  corroborados por evidências externas. As limitações documentais são explícitas.
- As fontes da primeira publicação dos recursos 3.2.0.62 e 3.2.0.114 coincidem
  com as atuais; o rascunho histórico de observações explica o escape divergente.
- A estrutura atual e a evolução posterior das funções estão preservadas nas
  evidências; nenhum SQL do arquivo de auditoria é instrução para execução.
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

## Validações finais

- Build completo aprovado: **2.517 testes passaram, zero falhas e seis ignorados**
  pelo próprio conjunto (2.523), compilação Next.js, TypeScript e geração de 234 páginas.
- Segurança: **505 aprovados**. Infraestrutura: **38 aprovados**, incluindo
  preservação dos 15 hashes e bloqueio de inclusão automática de fontes históricas.
- PADRÃO AVANTA 1.23.1, Ava e verificador offline das 19 diferenças aprovados.
- Dependências e configuração de build ficaram somente no pacote isolado;
  `.env.local` ignorado não foi versionado nem copiado ao espelho fiel.
- Nenhum teste removido/enfraquecido e nenhum bypass de tipagem, segurança ou build.
- Os 15 SQLs preservam todos os bytes publicados. Nenhuma funcionalidade ou
  estrutura do banco foi removida. A classificação provisória foi corrigida.
- Espaços/fins de linha herdados do pacote publicado continuam documentados;
  não foram normalizados em massa durante esta reconciliação.
- Proposta concreta de revisão: [PROPOSTA-MAIN.md](PROPOSTA-MAIN.md).

Diff final contra a main (movimentos mostrados como adição/exclusão): 805 A, 8 D, 217 M. Relação completa em
`arquivos-candidato.json`. Os 118 arquivos antes ausentes seguem preservados.

## Próximos passos e restauração

1. Revisar o [fechamento dos 19 casos](FECHAMENTO.md), incluindo as ressalvas
   documentais dos registros sem SQL integral. O banco não precisa de repair.
2. Auditoria dos 15 concluída: todos possuem vínculo com recursos presentes e
   usados. Preservar como fontes do produto em pasta própria; não tratá-los como
   código descartável nem como migrações pendentes para reaplicar.
3. Build completo aprovado e espelho local íntegro. Conferir novamente produção,
   fila, main e versão antes de qualquer integração; aceitar explicitamente
   os limites históricos documentados da auditoria de banco primeiro.
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

Candidato durável: `/Users/JEFF/AvantaLab Projetos/espelhos/reconciliacao-main-3.2.0.310`.
Seu commit preserva a ancestralidade da main; a branch validada local tem prefixo
`codex/`. O espelho de produção fica em pasta
separada. Não instalar dependências nem executar testes dentro do espelho fiel.

Evidências extensas: JSONs desta pasta; respostas originais, SQL remoto e logs
em `/private/tmp/avanta-reconciliacao-20261104-auditoria/` (fora do pacote).

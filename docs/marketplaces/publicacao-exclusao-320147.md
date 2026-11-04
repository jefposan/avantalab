# 3.2.0.147 — Marketplaces: confirmar exclusão de anúncios sem vínculo e separar EAN do título

Pedido adicional na mesma entrega: em Anunciados, a identificação passa a usar
linhas próprias para título/descrição, EAN e conta/vínculo. Ajuste exclusivo da
estrutura de texto existente, sem alterar filtros, agrupamento ou dados salvos.

Base verificada: 3.2.0.146, deployment dpl_9GaMEqssmrK9miUBmRDXSC8EuER2,
snapshot 00e316f371db02802be0cb7a79f9a244bbdd6f95. Pacote isolado,
sem incluir alterações pendentes do checkout ou novas permissões de usuários.

## Fluxo

Descoberta por vínculo ou EAN/UPC exato (inclusive variações) em todas as contas
da empresa com anúncios já sincronizados. Releitura remota dos candidatos antes
de qualquer ação. Não associa por nome, não cria vínculo local por suposição.
Conflitos com outro cadastro e variações de outro EAN bloqueiam o comando.
Sem EAN, não promete localizar anúncios sem vínculo.

Confirmação lista contas e IDs; checkbox mais botão destrutivo somente quando
há anúncios ainda não excluídos. ML: encerrar, reler, excluir, reler. Uma chamada
por anúncio, com auditoria e chaves determinísticas por tentativa/etapa. Não há
reenvio automático em erro ou incerteza. O cadastro é preservado até todas as
provas serem confirmadas e conferidas novamente sob trava na transação final.
Histórico retém também a identidade dos anúncios descobertos sem vínculo para
que a importação não recrie o cadastro. Vendas e financeiro preservados.

## Caso investigado — somente leitura remota

EAN 7898520002245, conta JEFF: MLB1625986010 e MLB1625992619 retornaram
status deleted e substatus deleted na atualização de 24/10/2026, 13:03:38–39
(America/Sao_Paulo). O filtro Todas exibia o histórico de excluídos, não anúncios
ativos. Nenhum anúncio real foi excluído ou publicado durante esta entrega.

## Verificação e publicação

Testes simulados de servidor, banco e interface; ambiente visual local não é
enviado à produção. Migração aditiva, sem apagar dados nem alterar planos/RLS.
Situação de build e promoção devem ser confirmadas antes de declarar publicado.

- Migração 20261024050000 aplicada após ensaio com rollback no Supabase,
  registrada no histórico; funções presentes e sem execução concedida a
  anon/authenticated. Descoberta autorizada conferida em leitura num produto
  existente. Nenhum produto/anúncio foi excluído para validar o banco.
- 36 testes focados de exclusão, descoberta, histórico, autorização e layout;
  453 testes de segurança do pacote; TypeScript/tipos de rota e verificadores
  PADRÃO AVANTA/Ava aprovados. No Chrome, confirmação obrigatória, sequência de
  duas contas antes do cadastro e preservação em falha simulada conferidas.
- EAN validado no DOM: começa abaixo do fim do título, em linha independente.
  Prévia local: /private/tmp/avanta147-exclusao-ean.png.

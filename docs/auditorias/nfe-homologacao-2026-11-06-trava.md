# NF-e de homologação — bloqueio ao preparar rascunho

Base: main `738c6ac014c00340abb631efb5513996fe392072`, produção 3.2.0.374.

## Evidência

- Série de homologação configurada em 2, próximo número 1. Produção preservada.
- Novo rascunho avulso salvo: `ee85338f-5c91-4a08-8b28-0ea7db067dcb`, total R$ 1.333,00, dois produtos. Não gera operação comercial, contas ou estoque.
- Ao confirmar Salvar e emitir, retorna `AV-COMMERCIAL-FISCAL-STORAGE`: falha anterior à transmissão. Não houve autorização ou nova rejeição SEFAZ nesta tentativa.
- Consulta administrativa somente de leitura confirmou que `avanta_vendas_runtime` possui SELECT, mas não UPDATE em nenhuma coluna de `public.vendas_fiscal_rascunhos`.
- O gatilho `fiscal_private.prevent_deleted_draft_emission()` é invoker e exige `SELECT ... FOR UPDATE` nessa tabela imutável, causando erro 42501 ao criar a emissão.

## Correção preparada

Migração `20261106203000_vendas_trava_rascunho.sql`: mantém a mesma trava de linha, executada somente pelo gatilho privado; não concede UPDATE ao runtime. Função sem argumentos, sem SQL dinâmico, `search_path=''`, contexto INSERT/tabela conferido, vínculo de empresa obrigatório e execução direta revogada. Mantém bloqueio de rascunho excluído.

## Validação local

- Teste PostgreSQL reproduz erro 42501 com papel restrito antes da correção.
- Após a migração, o mesmo INSERT funciona; UPDATE continua negado, outra empresa e rascunho excluído continuam bloqueados.
- 4 testes focados aprovados, incluindo nota avulsa sem faturamento/estoque e checkout pelo repositório real.
- 685 testes de segurança aprovados; verificadores PADRÃO AVANTA e Ava aprovados.

## Estado e retomada

Migração aplicada e registrada no Supabase em 06/11/2026, após autorização específica do titular. Arquivo no histórico conferido integralmente com a fonte versionada. Verificação remota: `prosecdef=true`, `search_path=""`, runtime sem UPDATE em qualquer coluna do rascunho e sem EXECUTE direto na função. RLS e sequência de produção preservados.

Publicação 3.2.0.375 e teste do mesmo rascunho de homologação em andamento. A sessão autenticada expirou antes da retomada; não houve novo envio após a migração até recuperar o acesso. Não reenviar a antiga tentativa 1/1 nem alterar sequência de produção.

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

## Resultado do teste em 3.2.0.376

- 3.2.0.375 publicada pela main no deployment `dpl_CSmCYzMojVuFDLKkgAzWXCcsVJmo`; 3.2.0.376 publicada no deployment `dpl_E9cdU5uSbwtiBCjA6LTPqVr1nUT9` com domínio oficial conferido.
- Após recuperar a sessão, a preparação abriu corretamente. O teste detectou reservas de outras notas atribuídas ao rascunho atual; 3.2.0.376 corrigiu o vínculo real e eliminou a conferência local demonstrativa de notas persistidas.
- NF-e série 2/número 1 autorizada em homologação em 06/11/2026 às 20:39:53 (São Paulo), protocolo `135260009867036`, total R$ 1.333,00, dois itens. Rascunho `8963fceb-8bd7-4dc6-9b96-4f3ecfdf5c48`.
- Interface abriu resultado com sucesso e ações Baixar/Compartilhar XML e DANFE. Fechar e reabrir a linha da nota manteve a autorização e os documentos, sem novo envio.
- Downloads reais conferidos em Downloads. XML processado nfeProc: tpAmb 2, cStat 100, série 2/número 1, protocolo correspondente, dois itens e total 1333.00. Emissão e saída possuem o mesmo instante completo 20:39:43-03:00.
- PDF de 11.160 bytes, válido, renderizado e revisado. Detectado detalhe de apresentação: indicador indIEDest 9 impresso como inscrição estadual. Correção do gerador preparada em 3.2.0.377; arquivo imutável da primeira autorização preservado.
- Antes/depois: 1 operação comercial, 1 conta a receber, 400 movimentos de estoque. Emissão avulsa não acrescentou faturamento/estoque. Produção fiscal continua bloqueada.
- 3.2.0.376: 14 testes focados e 686 de segurança aprovados. Build remoto: 2.755 testes, 2.749 aprovados, 6 ignorados, zero falhas; Next e TypeScript aprovados.

## Validação complementar do DANFE

3.2.0.377 corrige apenas a inscrição do destinatário no PDF: IE real, ISENTO quando indIEDest 2 sem IE, ou traço sem inscrição. Teste lê o PDF com leitor independente nos três cenários. 15 testes focados e 687 de segurança aprovados. Novo rascunho de homologação `9303eac3-ccfe-41b8-99b7-df2ee91a7c87`, R$ 99,00, salvo para testar o gerador após publicação. Nenhum SQL adicional; notas/XMLs/arquivos já autorizados não são regravados.

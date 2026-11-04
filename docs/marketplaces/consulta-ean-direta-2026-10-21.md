# EAN direto — AvantaPreços3.2.0.42

Correção da regressão da pesquisa unificada40, autorizada em21/10/2026.
PADRAO-AVANTA1.20.0. Sem mudança visual de componentes ou contrato de dados.

- EAN digitado na consulta ou recebido do leitor: produto identificado abre
  diretamente detalhes com preços e ações de estoque, sem clique intermediário.
- Cadastro existente e identificação externa têm o mesmo comportamento.
- Descrição: lista na tela principal, selecionar abre detalhes.
- Ambiguidade: escolher produto correto antes de abrir; ausência mantém pesquisa.
- Cancelar, Voltar, Nova pesquisa, prazo máximo e proteção contra resposta antiga
  são preservados. Atualizar histórico/preço não muda a navegação já aberta.

38 testes focados aprovados, incluindo cache/local, pesquisa externa por EAN,
cancelamento antes da resposta, ambiguidade/ausência, descrição e renderização
real de detalhes/preços. Verificadores PADRÃO AVANTA/Ava aprovados.

Correção local, sem publicação nem migração. A auditoria anterior do erro
Failed to fetch em Preparar anúncio é independente e não está implementada aqui.

# Conteúdo AvantaVendas — falha de rede ao consultar produtos

Versão candidata: **3.2.0.461**. PADRÃO AVANTA **1.23.1**.
Base oficial consultada na rede: `6df1be7c97db6ed7513fc76b16ea4ef7978df887`.
Branch isolada: `codex/catalogo-sem-rede`.

## Causa

O carregador inicializava produtos e catálogos como arrays vazios. Uma falha
da consulta encerrava o carregamento e mostrava o erro genérico. A apresentação
continuava tratando esses arrays como resposta válida: 0 produtos, nenhum
catálogo ativo e nenhum produto cadastrado. Exceções de transporte também não
tinham encerramento garantido do carregamento.

## Correção

- Diferencia dados ainda não consultados de resposta válida, inclusive vazia.
  Só uma resposta válida das duas consultas confirma a lista daquele perfil.
- Sem conexão identificada pelo navegador, mostra aviso e Tentar novamente
  sem enviar a consulta. Falha de transporte, prazo excedido e erro de
  consulta/acesso têm tratamento específico; o indicador 4G não garante acesso.
- Prazo de 15 segundos aborta a leitura. O evento online refaz a consulta;
  eventos offline, troca de contexto e desmontagem invalidam respostas antigas.
- Mantém dados já consultados nesta abertura e rascunhos. Não cria cache offline
  persistente nem permite usar dados de outra empresa como resposta atual.
- Não reenvia salvamentos ou exclusões ao reconectar. Preserva as regras
  existentes de permissões e distribuição; não altera banco ou produtos reais.

## Validação

- Seis regressões novas falharam antes da correção e passaram depois; os
  dez testes que já passavam continuaram aprovados, totalizando 16 no editor.
- Casos: abertura offline nos dois temas, navegador online sem transporte,
  resposta inválida/acesso negado, vazio confirmado, recuperação, rascunho,
  exceção, prazo de conexão e resposta antiga após reconectar.
- Seleção de catálogo, integração com Custos e autorização: 54 aprovados.
- Tipagem: `next typegen` e `tsc --noEmit --incremental false`: aprovados.
- PADRÃO AVANTA e Ava: aprovados para a versão candidata.
- Segurança: 768 testes aprovados, nenhuma falha.
- `git diff --check`: aprovado.

Escopo: editor compartilhado do Conteúdo AvantaVendas na Gestão Mobile/Web.
Teste controlado dos handlers reais; sem afirmar teste no binário nativo ou
alteração na sessão do cliente. Publicação autorizada pelo responsável. Base de produção conferida:
`dpl_4t95jmmQxns5AFSWSZWfgemjp5uK`. Integração e envio pelo pipeline oficial,
com promoção automática após build aprovado.

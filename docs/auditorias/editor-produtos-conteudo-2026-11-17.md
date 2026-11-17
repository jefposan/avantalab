# Conteúdo AvantaVendas — editor de produtos

Versão candidata: **3.2.0.460**. PADRÃO AVANTA **1.23.1**.
Branch: `codex/editor-produtos-mobile`, isolada da main oficial.
Base reconciliada: `4ea9023416df0e43463031aba1f373881f17ff56`.

## Comportamento

- Uma chave Ativo/Inativo substitui checkbox e botão Inativar. Não persiste
  ao tocar: altera o rascunho enviado por Salvar alterações.
- Chave, Excluir, Cancelar e Salvar alterações ocupam uma linha. Reutiliza
  BotaoAcaoCompacto; a chave compartilhada usa input nativo, teclado, foco,
  nome acessível e alvo mínimo de 44 px. Tema escuro conserva contraste.
- Salvar retorna à lista somente após a RPC confirmar o produto. Falha,
  retorno sem ID ou exceção conserva o editor e seus dados. Alterações
  posteriores ao início do envio permanecem abertas para novo salvamento.
- Excluir abre ModalConfirmacao. Cancelar a confirmação não envia a exclusão.
  Confirmar envia a RPC protegida existente; somente sucesso remove a linha
  local e retorna à lista. Falha conserva o rascunho. Pedidos e históricos
  continuam sob as regras existentes, sem mudança de banco ou permissões.
- Editar campos, alternar status e enviar imagem não fecham a edição.
  Cancelar descarta o rascunho e retorna à lista.

O componente é compartilhado entre Gestão Mobile e Web. Não altera o cadastro
próprio do aplicativo AvantaVendas nem requer binário novo nas lojas.

## Evidência

- Oito testes do editor executam handlers reais com rede controlada, incluindo
  ambos os temas, status sem gravação automática, salvar/excluir com falha,
  confirmação cancelada, alterações durante envio e preservação de SKU/preços.
- Quatorze testes de catálogo e autorização passaram; a seleção complementar
  de editor, integração com Custos e usuários passou com 50 testes.
- Segurança: 768 testes aprovados. A asserção de integração anterior que exigia
  a RPC de inativação foi ajustada para exigir salvamento explícito do status;
  a cobertura funcional verifica a chave e o payload, sem dispensar o gate.
- PADRÃO AVANTA, Ava e `git diff --check`: aprovados.
- Tipagem completa: `next typegen` e `tsc --noEmit --incremental false`: aprovados.
- Renderização local do rodapé real em Chrome isolado, com componentes e CSS
  da entrega: quatro controles na linha, sem corte interno, em 320/393/768 px;
  áreas de toque de pelo menos 44 px. Essa verificação é do rodapé, sem afirmar
  teste no binário nativo ou na sessão autenticada do cliente.

Sem alteração de produto real ou banco. Publicação autorizada pelo responsável.
Base de produção conferida: `dpl_2JQXPWEkt8LxoUZpf839EgKwkGeF`.
Integração e envio pelo pipeline oficial, com promoção automática após build aprovado.

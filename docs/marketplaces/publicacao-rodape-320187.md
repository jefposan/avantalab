# 3.2.0.187 — Marketplaces: ocultar atalhos do rodapé por 30 segundos

- Base de produção 3.2.0.186, deployment `dpl_HGTcjczJ5EFY1Eg7TbRzavfxvYXe`. Pacote isolado `/private/tmp/avanta187-footer-hide`.
- X compacto oficial à direita de Estoque, no grupo Vendas/Anunciados/Estoque. Oculta somente o grupo da esquerda para a esquerda e retorna automaticamente após 30 segundos, deslizando à direita. Sem persistência de preferência ou alteração de dados/filtros.
- Grupo oculto fica inert/aria-hidden; temporizador cancelado ao desmontar; preferência de movimento reduzido elimina a transição. Navegação e distância do rodapé preservadas.
- Dez testes focados e 471 de segurança aprovados no pacote isolado, além de TypeScript, PADRÃO AVANTA e Ava. Lint do componente sem erros. No checkout compartilhado, um teste de pesquisa encontrou alteração alheia em ProductsStock; não incluída no pacote. O mesmo teste passou na base isolada.
- Conferência local com o componente real: X depois de Estoque; grupo esquerdo oculto com visibility hidden/inert true, enquanto pesquisa à direita permaneceu visible, habilitada e fora de inert. Retorno automático confirmado no intervalo completo, com visibility visible e inert false. Evidências: `/private/tmp/avanta187-rodape-final.jpg` e `/private/tmp/avanta187-somente-esquerda-oculta.jpg`. Página temporária de teste não integra a entrega.
- Publicação pendente.

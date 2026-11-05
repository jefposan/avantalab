# 3.2.0.186 — Marketplaces: preservar confirmação de DC-e no próprio botão

- Base esperada 3.2.0.185, deployment `dpl_CHkhS9qED164tAmLFL8jxT66ctYw`. Pacote isolado `/private/tmp/avanta186-dce-status`.
- Solicitar DC-e vira DC-e solicitada no mesmo botão, sem ação. Registro independe da logística: permanece em envio programado e com etiqueta liberada. Aviso fiscal separado preserva diferenças entre pedido aceito, concluído, tentativa incerta e consulta indisponível.
- Abrir o pedido/Consultar etiqueta consulta somente GET de documento existente e salva a confirmação no retrato do pedido com proteção contra atualização concorrente. Não emite nem reenvia documento durante consulta. Reutiliza autorização existente e consulta pontual do pós-venda.
- Pedido final 9347426 estava pending/buffered e sem registro local de solicitação na investigação. Não presumir confirmação do ML com base no desaparecimento do botão. Nenhuma emissão fiscal real enviada durante diagnóstico ou testes.
- Validação: 29 testes focados, 471 de segurança, TypeScript, PADRÃO AVANTA e Ava aprovados. Lint sem erros, aviso preexistente de imagem HTML.
- Publicação pendente.

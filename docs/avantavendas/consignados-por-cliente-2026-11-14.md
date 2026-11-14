# Consignados por cliente — revisão local av201

- Produtos do card de Estoque consignado abrem os saldos ativos por cliente, agregando pedidos do mesmo cliente/produto. Mesma chave de produto do resumo; bonificações excluídas, sem gravação.
- Quantidade alterna maior/menor; Nome A–Z ordena alfabeticamente. Nome usa exatamente abrirClienteDashboard/renderCliente, como Clientes sem compra, sem ficha alternativa.
- Sobreposição limitada à origem de distribuição: sheet anterior permanece no DOM, inerte e fora da acessibilidade enquanto a ficha está aberta. Fechar restaura o mesmo nó, foco e scrollTop. Abertura de outra operação descarta o retorno para não deixar camadas/IDs duplicados.
- 196 testes do AvantaVendas aprovados; Chrome com dados fictícios em 320/390px e claro/escuro valida X/toque externo, posição/ordem e limites do viewport. Sem teste autenticado ou físico.
- Suíte geral local: 660 aprovados e uma falha preexistente de inclusão de artefatos na tipagem. Revalidar em pacote isolado antes de publicar. Validadores Ava/PADRÃO AVANTA/revisão av201 aprovados.
- Não publicado. Não inclui a correção do filtro de datas diagnosticada anteriormente.

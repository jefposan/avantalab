# 3.2.0.181 — Marketplaces: organizar documento, etiqueta e pós-venda

- Base de produção: 3.2.0.180, `dpl_FZADSsGgVBPbfmcewWxhpD1jqds3`, snapshot `5ec08afedccc79362e2e1793ada6bfa3c5f34438`.
- Pacote isolado `/private/tmp/avanta181-sale-layout`. Escopo: Vendas/SalePostSale, CSS local de organização, orientação Ava, versão e testes de apresentação. Sem alteração de backend, banco, emissão fiscal ou permissões.
- Faixa Documento e etiqueta com situação à esquerda e controles oficiais compactos à direita. Pendência: Emitir DC-e e Consultar etiqueta. Etiqueta pronta: Imprimir etiqueta. Já impressa: Reimprimir etiqueta. Sem emissão em pedido programado, cancelado ou outro provedor.
- Pós-venda com Atualizar junto ao título. Link externo identifica conta esperada, mantendo aviso sobre a sessão no navegador. Informações de reclamações, reembolsos e devoluções preservadas.
- Validação local: 29 testes focados, 471 de segurança, TypeScript e PADRÃO AVANTA/Ava aprovados. Lint sem erro, somente aviso preexistente de imagem HTML. Testes de renderização conferem pendente, pronta, impressa, cancelado e acesso de consulta.
- Publicação autorizada em 26/10/2026; snapshot, deployment e estado serão registrados após envio/conferência.

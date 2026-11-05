# 3.2.0.183 — Marketplaces: manter consulta de etiqueta em envio programado

- Complemento da entrega 3.2.0.182; base esperada `dpl_F6xjds33cgPH9D7w4e2umf9pLt66`. Pacote isolado `/private/tmp/avanta183-label-query`.
- Consultar etiqueta permanece disponível para envio programado e preparação, sem oferecer emissão fiscal indevida. Consulta relê o ML; impressão só aparece quando a logística permite. Mantém proteção contra nova DC-e da entrega anterior.
- Investigação da calculadora JEFF, pedido final 9347426: consulta pontual às 10:59 de 26/10/2026 confirmou envio pending/buffered, etiqueta indisponível, sem registro local dceEmission. Climatizador ADRIANO final 5988092 manteve impressão disponível. Não foi possível reproduzir a impressão temporária relatada na calculadora; não atribuir causa ao ML ou a resposta antiga sem evidência.
- Validação: 16 testes focados, 471 de segurança, TypeScript e verificadores PADRÃO AVANTA/Ava. Sem emissão fiscal nem impressão real durante os testes.
- Publicação pendente da conclusão da base anterior.

# 3.2.0.184 — Marketplaces: ampliar indicador e identificar conexão das contas

- Base 3.2.0.183, deployment `dpl_9zvwTL59d9gMbPfo8GUQnxhWcNfM`. Pacote isolado `/private/tmp/avanta184-accounts-loading`.
- Indicador oficial das contas usa tamanho normal 140 × 50px, antes compacto 48 × 20px, e mostra Conectando contas... abaixo. Cabeçalho reserva altura durante a espera, preservando centralização e quebra responsiva.
- Opções locais de CarregamentoDadosModulo mantêm os valores anteriores como padrão para todos os demais consumidores. Sem alteração no processo de conexão, autorização ou consulta.
- Validação: dez testes focados, 471 de segurança, TypeScript, PADRÃO AVANTA e Ava aprovados; lint do componente sem erro.
- Publicação pendente.

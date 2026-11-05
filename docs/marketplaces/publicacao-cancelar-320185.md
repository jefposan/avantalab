# 3.2.0.185 — Marketplaces: ajustar largura de Cancelar anúncio

- Pacote isolado `/private/tmp/avanta185-cancel-button`, base esperada 3.2.0.184, deployment `dpl_HffxXHJWJDJ1hjecmMDU2N2mSzbN`.
- Ações superiores de Novo anúncio têm largura mínima de 132px e quebra responsiva. Preserva texto completo, padding, mesma distribuição, altura e comportamento de habilitação/cancelamento.
- Conferência visual com o componente oficial e as regras reais de CSS em larguras de 274px e 220px, ativo e desativado: sem corte ou texto fora da borda; largura estreita empilha as ações. Evidência local `/private/tmp/avanta185-botoes.jpg`.
- Dois testes de cancelamento e 471 de segurança aprovados; verificadores PADRÃO AVANTA/Ava aprovados. Alteração funcional limitada ao CSS; nenhuma mudança em TypeScript.
- Publicação aguarda conclusão da base anterior.

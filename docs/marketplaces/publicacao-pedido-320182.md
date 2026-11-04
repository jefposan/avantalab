# 3.2.0.182 — Marketplaces: manter retorno e bloqueio após solicitar DC-e

- Base: produção 3.2.0.181, deployment `dpl_6UYrKoZ65DvrpYcztJmVZXvHDahC`. Pacote isolado `/private/tmp/avanta182-dce-feedback`.
- O registro fiscal persistido passa a integrar a venda pública. Depois da solicitação, Emitir DC-e fica inativo com rótulo DC-e solicitada e aviso para aguardar a liberação da etiqueta, inclusive ao reabrir/consultar. Consultar etiqueta continua disponível; liberação substitui a espera por Imprimir/Reimprimir.
- Erro incerto depois do envio preserva o bloqueio contra duplicidade. Falha confirmada antes do envio mantém recuperação. Documento já pendente/concluído no ML também registra a espera localmente. Sem nova rota, banco, permissão ou emissão fiscal real durante validação.
- Validação: 36 testes focados, 471 de segurança, TypeScript, PADRÃO AVANTA e Ava aprovados. Lint sem erros; aviso preexistente de imagem HTML.
- Publicação e confirmação remota pendentes.

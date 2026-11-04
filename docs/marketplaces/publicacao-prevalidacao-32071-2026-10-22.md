# 3.2.0.71 — Marketplaces: corrigir bloqueio por advertências e omitir atributos internos do ML

Autorização do responsável: acompanhar o deploy, tentar a publicação do WAP preparado e corrigir/publicar o sistema sem nova consulta durante sua ausência. Conta ALINEARAUJO677, ventilador WAP EAN 7899831311583, R$ 198,00, 1 unidade, Premium, novo, garantia de fábrica 3 meses. Não alterar os dados comerciais por suposição.

3.2.0.70 confirmada READY com domínios atribuídos. Reteste revelou categoria sugerida Lavadoras de Jato Elétricas (MLB120294); selecionada Ventiladores (MLB1645), confirmada na ficha de ventilador existente da mesma conta. Nenhuma publicação do WAP encontrada por EAN ou nome na lista sincronizada, nem vínculo no cadastro local.

Tentativa após corrigir categoria parou em POST /items/validate: HTTP 400/validation_error com todas as causas warning. A versão anterior filtrava esses avisos e mostrava recusa genérica. A 3.2.0.70 preservou os detalhes: atributos não modificáveis de eficiência de outros países e origem de medidas, perda de me1 e inclusão obrigatória de frete grátis. Não houve criação nessa tentativa, que foi bloqueada antes da auditoria/POST de criação.

Correção: tratar como não bloqueante somente resposta completa do pré-validador POST /items/validate, HTTP 400, error validation_error, lista não vazia exclusivamente warning com código/mensagem válidos. Não se aplica a criação/edição, respostas vazias, erros mistos ou outros estados. Criação continua exigindo ID e vendedor confirmados. Campos read_only e inferred da categoria não são enviados nem solicitados como obrigatórios; dados locais preservados.

Referências oficiais:

- https://developers.mercadolivre.com.br/en_us/validations
- https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br/atributos

PADRÃO AVANTA v1.21.0. Sem migração, plano, permissões ou sessão alterados. Pacote isolado a partir da 3.2.0.70, com promoção automática após build aprovado e versão/resumo nos metadados. Manifesto /private/tmp/avanta-release71-manifest.json; recibo /private/tmp/avanta-release71-status.json. Resultado da publicação real ainda depende do próximo reteste; não presumir sucesso a partir dos testes simulados.

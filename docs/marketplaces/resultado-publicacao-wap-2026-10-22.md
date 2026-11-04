# Resultado do reteste autorizado — WAP — 22/10/2026

## Confirmado

- Sistema 3.2.0.70: READY, aliases atribuídos, deploy dpl_AktAWMP61Db9TgyVk5ZEXyquZct1.
- Sistema 3.2.0.71: READY, aliases atribuídos, deploy dpl_DmeSWTshZv99rcUyxWmgwKRVZ2dh. Resumo registrado: “3.2.0.71 — Marketplaces: corrigir bloqueio por advertências e omitir atributos internos do ML”. Testes completos na Vercel: 1.740 aprovados, zero falhas; testes de Marketplaces no pacote: 791 aprovados.
- Anúncio criado e relido pela integração em 22/10/2026, aproximadamente 01:32, America/Sao_Paulo: MLB5442396961. Conta ALINE / ALINEARAUJO677 / seller 127679574. EAN 7899831311583.
- Estado confirmado: Ativo, sem substatus retornado. Preço R$ 198,00, quantidade disponível 1, Premium (gold_pro), Novo, categoria Ventiladores MLB1645. Descrição relida com sucesso, sem alteração manual durante a conferência.
- Produto local existente passou de Sem publicação para Anunciado, com 1 anúncio ativo vinculado. Quantidade física Online 1 preservada; cadastro único manteve 94 produtos locais. Nenhuma baixa de venda foi feita.
- Mercado Livre aplicou frete grátis obrigatório para o comprador. Consulta de estimativas retornou frete do vendedor R$ 58,75 e taxa R$ 31,68 (16%). Estimativas não são cobrança financeira lançada pelo AvantaLab e podem mudar segundo as regras do ML.

## Causa e correção

O pré-validador retornava HTTP 400/validation_error com lista composta somente por warning. O fluxo bloqueava a criação apesar de as advertências serem não bloqueantes segundo o contrato oficial. A 3.2.0.71 aceita essa situação somente em POST /items/validate, com lista completa e válida; erros reais, respostas ambíguas e falhas de criação/edição continuam recusados. Atributos read_only/inferred foram excluídos do envio sem apagar o cadastro.

A categoria sugerida para o nome incompleto do produto era Lavadoras de Jato Elétricas MLB120294. A tentativa foi corrigida para Ventiladores MLB1645, confirmada em um anúncio existente da mesma conta. Não foi criada nova tentativa na categoria errada após a identificação. Preço, saldo, condição e garantia informados pelo responsável foram preservados.

Não houve criação nas tentativas bloqueadas pelo pré-validador. Após a confirmação de MLB5442396961, não houve novo POST de criação. A consulta de edição foi aberta apenas para reler dados atuais e fechada sem salvar alterações.

## Evidências

- Anúncio: https://produto.mercadolivre.com.br/MLB-5442396961-wap-turbo-flow-turbo-mesa-e-parede-50-cm-preto-127v-8-_JM
- Captura do anúncio ativo: /private/tmp/avanta-wap-publicado-MLB5442396961.png.
- Captura do diagnóstico anterior: /private/tmp/avanta-wap-warnings70.png.
- Manifesto e recibo da versão: /private/tmp/avanta-release71-manifest.json e /private/tmp/avanta-release71-status.json.

Sem migração, alteração de plano, sessão, permissões ou publicação nativa. Nenhum outro produto foi publicado. A aba do módulo foi mantida no Chrome com o anúncio localizado para conferência.

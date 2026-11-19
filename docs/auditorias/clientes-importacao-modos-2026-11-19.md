# 3.2.0.500 — Importação de clientes

Base oficial bac5be57dc76d0a73f79ff200264df784fd00734 (3.2.0.498), pacote isolado. Checkout canônico e trabalhos paralelos preservados. PADRÃO AVANTA 1.24.0 consultado (fonte canônica local 1.23.1, oficial isolada atual 1.24.0).

- Aprovação do modal compacto e autorização de aplicação/publicação no chat. Inclui 499 pendente (contador fiscal e Excel de preços), sem execução de manutenção ou migração.
- Adicionar ignora documentos existentes e repetições no arquivo. Substituir exige editar, além de consultar/cadastrar, e confirmação explícita na revisão; atualiza por documento preservando ID/código, vendedor e tabela; ausentes somente inativados.
- Prévia SHA-256 vinculada à empresa, ator, modo, linhas normalizadas e, na substituição, snapshot ordenado da base (ID/documento/versão/situação/atualização). Rechecagem transacional sob trava; conflito não grava. Lote serializável, auditoria na mesma transação.
- Nenhuma exclusão física ou escrita em pedidos, documentos fiscais, arquivos ou históricos. Sem nova permissão ou mudança de esquema/RLS. A publicação não executa importação.
- Validação local: 721 testes de módulos aprovados, TypeScript aprovado. SQL real em PGlite cobre preservação de IDs/códigos/vínculos e outras empresas, prévia concorrente, rollback integral por falha na auditoria. 13 testes específicos aprovados. Seleção/teclado/fechamento e mobile 390px conferidos em harness sintético local, removido antes do commit. Captura /private/tmp/avanta-clientes-importacao-500.png.
- Publicação deve passar pelo comando oficial, main exata e build remoto completo; estado final será registrado no recibo ignorado output/pipeline.

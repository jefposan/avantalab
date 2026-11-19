# 3.2.0.501 — Correção local do leitor de clientes

Base main 87a73ab87f18099a4e42cf20cb8e1a11474ea28a, produção 3.2.0.500. Branch isolada codex/clientes-leitura-excel-20261119. Sem publicação ou escrita no banco.

Erro reproduzido: ExcelJS falha em workbook.sheets quando o XML válido usa prefixo x:workbook. Leitura passou a usar SheetJS, já utilizado pelo sistema, sem nova dependência e sem regravar os arquivos.

Primeira leitura local dos seis lotes de Downloads confirmou 500/500/500/500/500/33 linhas com metadata válida. Os arquivos foram regravados por outro processo durante a conferência (não por esta correção), passando a conter somente Instruções/Clientes, sem _Avanta: bloqueio de identificação mantido e mensagem orienta recuperar o modelo exportado. Arquivo de pendências conserva metadata, mas requer revisão de dados. Nenhum conteúdo pessoal copiado para testes, repositório ou documentação.

Regressão sintética reproduz exatamente a exceção no leitor antigo e compara todas as linhas/campos no novo, preservando zeros. Inclui mensagens em português para formato antigo/protegido, ZIP inválido, identificação ausente, fórmulas em identificação/cabeçalhos e exceções inesperadas/retornos técnicos. Limites, empresa, modelo, fórmulas e validações de dados mantidos.

Navegador local validado com arquivo sintético x:workbook: leitura concluída, nenhuma importação. Harness temporário removido. Validações de prévia, substituição e rollback permanecem cobertas pelos testes existentes.

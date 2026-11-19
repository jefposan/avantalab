# Candidata local 3.2.0.499 — não publicar

PADRÃO AVANTA 1.24.0. Base remota consultada: `bac5be57dc76d0a73f79ff200264df784fd00734`, versão publicada 3.2.0.498. Alterações isoladas, sem push ou upload, conforme solicitação expressa.

- Menu: único contador em Notas Fiscais. Conta registros sem conclusão, inclusive preparação, fila, processamento, rejeição e falha. Estados authorized/artifacts_stored/danfe_ready/canceled e cancelados locais são excluídos. Selo limitado a 99+ com valor exato acessível. Sem consulta adicional ou gravação para contar; retornos válidos atualizam o estado local, ignorando versões antigas e identidade divergente.
- Excel: continua sendo gerado pelo exportador da aplicação; apresentação final com ExcelJS já instalado, carregado somente ao exportar. Cores/fontes/linhas no padrão do modelo de clientes. Colunas e linhas de Produtos, tipos numéricos, zeros, códigos textuais e metadados foram comparados após salvar/reler com o importador SheetJS. A aba técnica permanece veryHidden; contrato AVANTALAB-CUSTOS-3 inalterado.
- QA: arquivo sintético gerado pela função da aplicação e importado/renderizado por artifact-tool para comparar antes/depois e revisar Produtos/Instruções; nenhuma alteração de planilha real ou dado empresarial. Prévia não é dado de produção. CUA confirmou o indicador na tela local demonstrativa.
- 718 testes de módulos aprovados; sete testes diretamente afetados executados novamente após refinamento final, todos aprovados. TypeScript, lint dos novos auxiliares, PADRÃO AVANTA e Ava aprovados. Gate completo de produção não executado, pois não há publicação autorizada.

Sem SQL, mudança de acesso/permissões ou repetição da manutenção de arquivamento anterior. A pasta canônica com trabalhos paralelos foi preservada. Antes de eventual publicação, consultar novamente main/produção e reavaliar numeração.

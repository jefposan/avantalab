# 3.2.0.66 — Gestão Web: recuperação do acesso sem apagar sessão

Publicação autorizada pelo responsável. PADRÃO AVANTA v1.21.0.

Diagnóstico no Chrome: falha CORS na validação `/auth/v1/user`, seguida de espera em Preparando acesso. Consultas públicas externas e preflight retornaram CORS correto; não há evidência de configuração permanentemente bloqueada. O tratamento antigo aguardava sem timeout e tentava logout local ao receber erro.

Correção: validação inicial getSession/getUser limitada a 15 segundos, recuperação na cena oficial com Tentar novamente e sem logout por erro de validação. O botão recarrega a mesma URL, preservando o armazenamento e evitando reaproveitar uma execução pendente. Timeout/erro não concede acesso por dados locais e não avança com resposta tardia.

Sem migração ou alteração de dados, nativos, permissões ou contratos dos conectores. Pacote isolado parte da produção 3.2.0.65 e preserva os demais arquivos, incluindo rodapé e AvantaVendas av191. Recibo em `/private/tmp/avanta-release66-status.json`; manifesto/testes em `/private/tmp/avanta-release66-manifest.json`.

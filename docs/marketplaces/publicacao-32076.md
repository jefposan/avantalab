# Publicação 3.2.0.76 — 2026-10-22

Identificação na Vercel: **3.2.0.76 — Marketplaces e AvantaPreços: exclusão segura, recuperação de erros e conclusão da publicação**.

Entrega autorizada das pendências .73–.76: recuperação após recusa/timeout sem travar formulário, erro de EAN direcionado ao campo do anúncio, encerramento da preparação/retorno ao topo após sucesso confirmado e exclusão/arquivamento de produtos com histórico preservado e conferência dos anúncios em todas as contas vinculadas.

Migração `20261022160000_marketplace_product_removal` aplicada no projeto vinculado com autorização. Preservados 119 produtos, 45 vínculos e 146 saldos; zero operações de remoção executadas. Não houve criação, pausa, encerramento ou publicação de produto/anúncio nos testes ou nesta entrega.

Validação: bateria isolada com 1.779 testes aprovados, nenhum erro e um ignorado; 11 testes de remoção aprovados; TypeScript do escopo, PADRÃO AVANTA 1.21.0 e manuais da Ava 3.2.0.76 aprovados. Alertas de lint preexistentes identificados no registro de exclusão, sem alterações de autenticação fora do escopo.

Pacote isolado baseado na publicação .72, sem incluir mudanças não relacionadas do diretório de trabalho. Publicação de produção com promoção automática após build aprovado. Envio/build não equivale a estar no ar; estado e identificadores ficam no recibo da entrega.

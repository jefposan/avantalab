# 3.2.0.188 — Marketplaces: preservar histórico fiscal e integrar documentos e etiquetas

Base: produção 3.2.0.187, deployment dpl_BRsGzhpjNc3vWcQNQjAQ1BW2sgcE. Pacote isolado: /private/tmp/avanta188-fiscal. PADRÃO AVANTA 1.23.0.

## Alterações

- Histórico fiscal em tabelas próprias, com RLS e acesso apenas pelo servidor. Reserva única por envio impede DC-e/NF-e concorrentes entre abas, contas ou pedidos de um mesmo envio. Dados de empresa, conta, pedido e envio são conferidos; autor e hash do XML ficam na operação. XML, CPF/CNPJ e tokens não são registrados no diagnóstico.
- Recibos legados preservados. Sincronização usa controle de versão; gatilhos impedem apagar o recibo legado e o conservam também durante a transição entre versões.
- Confirmação conhecida e falha da última consulta são independentes. 404 significa recurso não localizado e não autoriza reenvio por si só. Primeira DC-e exige pendência fiscal atual e declaração explícita do responsável; resultado incerto conserva a reserva. Recusa definitiva tem código e permite recuperação.
- Consulta de DC-e inclui substatus, documentos e rejeições. Downloads de PDF/XML/JSON usam caminhos fixos e protegidos. Nenhuma URL retornada pelo provedor é seguida arbitrariamente.
- NF-e: consulta por pedido, metadados de nota importada por envio, XML/DANFE quando oferecidos pelo provedor, importação de XML autorizado e substituição antes da impressão. Estrutura, namespace, modelo 55, produção, autorização e emitente são conferidos; DTD/XXE são recusados. O ML/SEFAZ continua responsável pela autenticidade e validação fiscal definitiva. A substituição só conclui quando a consulta retorna a chave esperada.
- Solicitação ao Faturador exige confirmação de PJ contribuinte, certificado A1 e configuração fiscal, identidade CNPJ relida e conferência das orders do mesmo seller no carrinho. OAuth não comprova onboarding do Faturador. Não configura certificado ou tributação automaticamente.
- Eventos invoices e shipments reconciliam documentos, com validação do recurso e da conta. A consulta não envia documento fiscal.
- Faixa Documento e etiqueta preserva o mesmo botão DC-e solicitada inativo. Documentos fiscais agrupa estados, arquivos e NF-e; o perfil PF/PJ é informado apenas se confirmado pela API. Etiqueta continua dependente do envio. Buffering à meia-noite UTC preserva o dia civil, sem converter 27/10 em 26/10.

## Validação local

- Testes SQL reais em PGlite: reserva, vínculo entre empresas/contas, RLS, recibo legado e preservação após atualização.
- Funções reais de serviço com API simulada e banco SQL: concorrência entre emissão e sincronização, reload, 400/401/403/404/409/422/429/5xx, timeout, reserva que falha, importação/substituição, carrinho e arquivos de outro pedido.
- Transporte real isolado: códigos/correlação seguros, sem mensagens brutas, XML original e bloqueio de redirecionamento fiscal.
- Interface renderizada: estados, ações por permissão, espera, arquivos, computador e largura de celular, com tema escuro. Prévia local não faz chamadas reais.
- Segurança: 471 aprovados. PADRÃO AVANTA e manuais da Ava aprovados. TypeScript aprovado após gerar os tipos de rotas do Next; lint sem erros, dois avisos já existentes.
- Bateria ampliada de Marketplaces: 1.153 testes, 1.141 aprovados, dez falhas em simulações antigas de persistência e dois ignorados. Simulações adaptadas ao novo contrato; os 28 testes das áreas afetadas foram repetidos e aprovados. A suíte completa remota permanece obrigatória, sem exclusões.

## Publicação e conferência real

Migração aplicada via editor SQL do projeto oficial e concluída com sucesso. SHA-256: ab38d3d373b2af1af6facc5cf0115af88f7aba2e130918705b6d60acd5b4baa7. Dois recibos existentes preservados em operações e estados fiscais. Envio pendente; confirmar READY e domínio antes de declarar publicado. Testes de produção somente de leitura na JEFF, pedido 2000019139347426. Não emitir NF-e/DC-e nem imprimir fisicamente como teste.

A calculadora não tem recibo histórico recuperável no retrato anterior: não reconstruir um aceite fictício nem transferir recibo de outra conta. A correção preserva evidências futuras e apresenta a informação realmente retornada pela API.

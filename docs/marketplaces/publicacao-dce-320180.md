# 3.2.0.180 — Marketplaces: emitir DC-e no pedido e consultar liberação da etiqueta

- Base de produção confirmada: `dpl_3rdvgfLJC1HSsthXAs79MQrEQHXP`, versão 3.2.0.179, snapshot `145a21e601cf10f9f3d883a7c04dd67ceac827e9`.
- Pacote isolado: `/private/tmp/avanta180-dce-package`. Conteúdo da base preservado; somente vendas/DC-e, testes, versão e orientação Ava alterados. Git da raiz não é enviado.
- Emitir DC-e dentro do pedido expandido, após o aviso fiscal e antes de Pós-venda. Confirmação oficial informa perfil fiscal e prazo; resultado permanece no modal.
- Servidor confere empresa, conta, pedido pago, envio `ready_to_ship/invoice_pending`, Mercado Envios e logística compatível. Consulta fiscal precedente evita repetir emissão pendente/concluída. Tentativa e identificador no snapshot do pedido; comparação de revisão reserva apenas uma chamada concorrente. Resposta incerta não é reenviada automaticamente.
- Consultar liberação da etiqueta relê o pedido/envio e atualiza a linha. Imprimir/reimprimir continuam pelo PDF oficial, após liberação do ML. Envio programado não é pendência fiscal.
- Limites operacionais: mensagens, cancelamento, reclamação, aceite de devolução e reembolso ainda dependem do ML; pós-venda aqui é consulta. Não incluído download separado do PDF/XML da DC-e.
- Validação local: testes executáveis de serviço (conta alheia, status/logística, pendente/concluído, erro desconhecido, timeout, falha de persistência, concorrência), renderização do componente real com dados fictícios, regressão de impressão/pós-venda. Segurança: 471 aprovados no pacote. TypeScript, lint (somente aviso de img preexistente), PADRÃO AVANTA 1.23.0 e Ava aprovados.
- Nenhuma DC-e real emitida nem pedido/anúncio real alterado nos testes. A emissão real depende da aceitação e autorização do Mercado Livre para a conta.
- Publicação autorizada pelo responsável em 26/10/2026; estado remoto será registrado após envio e conferência.

# Atendimento diretamente pelo pedido — 3.2.0.355

Preparação aprovada inicialmente sobre 3.2.0.353, incorporada à produção mais recente 3.2.0.354 (`c20cf90a366c395dd88fab745c1ab1f1912c98a6`) para a entrega 3.2.0.355. Preserva a correção fiscal da página de emissão e a exclusão operacional de rascunhos. Publicação e teste controlado autorizados pelo responsável em 06/11/2026.

## Uso preparado

Na venda de Mercado Livre, a área Pós-venda oferece **Mensagens e atendimento**. A abertura mostra conta e pedido, histórico da conversa comercial e os casos de reclamação associados. A conversa comercial é consultada com `mark_as_read=false`. O usuário escolhe a conversa; no caso de mediação, o destinatário é somente o liberado pelo ML. O token sempre vem da conexão vinculada à venda, independentemente da conta aberta no navegador.

A resposta é texto simples, com até 350 caracteres. Anexos JPG/PNG/PDF (e GIF na conversa comercial) têm limite local de 3 MB por arquivo e até cinco por mensagem. O download passa pelo servidor autenticado em fluxo, sem revelar tokens ou buscar URLs fornecidas pelo cliente. O arquivo precisa existir no histórico autorizado da conversa. Anexos preparados para outro pedido, canal ou finalidade e uploads expirados são recusados.

Motivos, cotas e templates vêm da consulta atual do Mercado Livre. Um template não é editado pelo conteúdo do navegador. Conversas bloqueadas continuam bloqueadas e mostram a razão disponível. Mensagem recebida para revisão não é apresentada como entregue.

As soluções aparecem somente quando a conta está autorizada pelo ML: devolução, reembolso integral, oferta parcial entre as opções atuais, mediação, comprovante de postagem por Correios/transportadora, previsão de postagem e revisão física da devolução. Cada solução abre a confirmação com pedido, conta e caso. A oferta parcial é revalidada por percentual e valor antes do envio. Prova de postagem não pode ser alterada após envio, conforme contrato do ML. O registro de uma revisão ou reembolso não repõe o estoque físico.

A revisão física valida o Return e os pedidos associados. Motivos vêm do ML e evidências são obrigatórias quando exigidas. Não é permitido aprovar todo um carrinho a partir do detalhe de um único pedido. O relato de problema em um carrinho usa apenas o pedido selecionado e motivos aplicáveis a um pedido.

## Registro e prevenção de repetição

A migração aditiva `20261106043000_marketplace_post_sale_commands.sql` cria duas tabelas privadas: solicitações e metadados de anexos. Não modifica tabelas de estoque, pedidos, fiscal, permissões existentes ou o comando Resolver. Texto integral e tokens não são gravados na trilha de solicitações.

Cada tentativa tem ID, hash de conteúdo/contexto, ator, empresa, conexão, venda, canal, ação e situação. Índices únicos impedem reenvio da mesma tentativa e da mesma solução e serializam pendências da mesma categoria. Uma mensagem em moderação não congela as soluções do caso; uma solução incerta impede outra solução, preservando a consulta e a conversa quando o próprio ML a permitir.

Timeout, retorno incompleto ou 5xx de escrita ficam registrados como resultado incerto. Não há repetição automática do POST. Consultas seguintes podem confirmar a mensagem por recibo ou conteúdo/contexto, ou reconhecer o resultado observado da solução. A interface distingue recibo recebido de resultado conferido por observação. Uma pendência continua visível mesmo fora das trinta operações recentes. Nova confirmação por outro cliente durante o POST não produz uma falsa falha de gravação.

Enquanto aberta na página mais recente, a conversa atualiza a cada 30 segundos, sem acumular leituras concorrentes e preservando o texto em edição. A leitura de páginas anteriores permanece estável até a atualização manual. Consultas antigas são descartadas na troca de canal e desmontagem. Soluções confirmadas atualizam também o acompanhamento do pedido pelo serviço existente.

## Limites explícitos

- A integração preparada é Mercado Livre Brasil. Magalu conserva o painel e o comportamento existentes.
- Casos operáveis são verificados como reclamações de recurso `order`, vinculadas ao pedido/vendedor. Recursos de pagamento/envio/compra sem essa associação confirmada não recebem uma ação financeira presumida.
- A consulta apresenta até cinco casos recentes e informa quando o histórico não está completo. A conversa comercial oferece paginação.
- Aprovação integral de carrinho, canais de entrega em mãos/digital, ações futuras desconhecidas e restrições decididas pelo ML não são simuladas como operações disponíveis nesta entrega. O link da plataforma e o acompanhamento anterior permanecem acessíveis.
- Nova autorização pode ser necessária se a conta não tiver os recursos de comunicação/reclamações/devoluções. Um bloqueio de política não se resolve fingindo autorização ou substituindo a conta.

## Validação e publicação

Testes locais de domínio, transporte, renderização e PostgreSQL/WASM cobrem propriedade do pedido/caso, destinatários, moderação, cotas, templates, anexos, idempotência, timeout, concorrência, reembolsos, carrinho e preservação de estoque. Os testes de regressão incluem pós-venda anterior, classificação de pedidos e worker de estoque. Resultado final e logs ficam no registro da entrega em `output/marketplaces-pos-venda-2026-11-06/`.

A prévia visual usa os componentes implementados e dados fictícios. O enquadramento de leitura expande os detalhes para avaliar a posição e o estilo; o pedido real mantém sua região de rolagem existente. Há versões clara, noturna e móvel.

O build local completo terminou com sucesso: 2.660 testes aprovados, zero falhas, seis testes condicionais ignorados pelo runner existente, TypeScript e 235 páginas concluídos. A revisão suplementar da migração preserva a exclusão normal de usuários (o ator histórico passa a nulo, sem apagar o registro); seus quatro testes PostgreSQL passaram. O conjunto direcionado final e os logs constam no registro da entrega. Após aprovação, a publicação exige revalidar base, fila e versão, aplicar a migração aditiva revisada, conferir credenciais e testar o contrato real num ambiente autorizado. A Vercel não exportou os segredos classificados como Secret no teste local; não houve cópia de chaves nem ampliação de acesso. Nesta preparação nenhuma mensagem foi enviada a comprador e nenhuma solução real ou migração produtiva foi executada. Não afirmar validação ponta a ponta da API antes dessa conferência.

## Referências oficiais consultadas em 06/11/2026

- [Mensagens e arquitetura MLB 2026](https://developers.mercadolivre.com.br/mensagens-post-venda).
- [Bloqueios de conversa](https://developers.mercadolivre.com.br/pt_br/mensagens-bloqueadas).
- [Motivos, cotas e templates](https://developers.mercadolivre.com.br/pt_br/pt_br/motivos-para-se-comunicar).
- [Mensagens e anexos de reclamação](https://developers.mercadolivre.com.br/pt_br/gerenciar-mensagem-de-uma-eclamacao).
- [Soluções da reclamação](https://developers.mercadolivre.com.br/pt_br/gerenciar-resolucao-de-reclamacoes).
- [Revisão de devoluções](https://developers.mercadolivre.com.br/pt_br/gerenciar-devolucoes).
- [Provas e promessa de envio](https://developers.mercadolivre.com.br/pt_br/gerenciar-evidencias-de-reclamacoes).
- [Limites de requisição e download em fluxo](https://vercel.com/docs/functions/limitations), [orientação de streaming](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).


## Controle da publicação 3.2.0.355

O build de produção executa a suíte completa e depois `scripts/validar-atendimento-jeff.mjs`, antes de compilar o Next e promover o domínio. O plano fixa a empresa, a conexão JEFF e o vendedor esperado. O teste usa os serviços reais, confirma `/users/me`, o grant de comunicação/escrita e amostras de pedidos próprios com mensagens, política de resposta e histórico de reclamações. Reclamações incompletas ou solicitação real pendente bloqueiam a validação. O gate não substitui a autenticação das rotas do produto.

As credenciais permanecem no ambiente de produção já autorizado. O transporte controlado bloqueia envios comerciais, reembolsos e qualquer escrita de negócio. Somente a renovação OAuth existente e a persistência da própria credencial JEFF são admitidas, quando necessárias. Logs contêm contagens, estados e códigos; não contêm tokens nem texto de compradores. A consulta usa `mark_as_read=false`.

Falha do controle encerra o build sem promover o domínio. O resultado real, a migração, os testes e a confirmação do domínio são registrados em `output/marketplaces-pos-venda-publicacao-355/`. Nenhum teste de leitura comprova o envio real de mensagem ou a execução financeira: essas operações continuam exigindo decisão do usuário na interface e são cobertas por testes locais de contrato, autorização e idempotência.

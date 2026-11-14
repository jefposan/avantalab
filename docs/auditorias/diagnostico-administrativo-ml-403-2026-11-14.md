# Diagnóstico administrativo de acesso ML — 3.2.0.423

## Origem e restauração

Base oficial `04dd966b3a09f5d2559458a69b41a7fa520e204a` (3.2.0.422), consultada na rede. Domínio oficial conferido READY no deployment `dpl_7MrcDdrjntCy7EvBQ5DjEcgPYjEK`. Trabalho isolado em `/private/tmp/avanta-precos-ml-local`, branch `codex/diagnostico403-jeff-20261114`; tag anterior à edição `restauracao/diagnostico403-base-main-20261114`. Sem alteração do checkout compartilhado. Preserva amostra reduzida, reservas e os ajustes AvantaVendas av203.

PADRÃO AVANTA 1.23.1 e guia Route Handler do Next local consultados. Sem interface nova ou autenticação alternativa; usa a página administrativa e o endpoint existentes.

## Diagnóstico implementado

`POST /api/modulos/marketplaces/diagnostico-precos` continua exigindo `authorizeMarketplace(..., 'connections')`, com administrador/gestor master ativo, módulo e conta da mesma empresa. Entrada não aceita URL, método, app de terceiro, preço ou estoque como comando. Usa a configuração do app no servidor. Confirma `users/me` com seller/site da conexão antes das demais consultas.

Compara catálogo, busca geral por modelo/EAN, busca dos próprios anúncios, busca por seller_id, app/grant autorizados e um item próprio/um item de outro vendedor retornado no catálogo. Só caminhos GET definidos pelo servidor, no máximo 16 leituras distintas, prazo global de 45 segundos, sem nova chamada igual na mesma execução e sem repetição automática em 403. Identidade divergente interrompe antes de consultar recursos adicionais. Resposta sem cache.

O observador opcional de `mlRequest` não altera o contrato das chamadas normais, JSON, XML, fiscal ou mutações. Só pode ser usado com GET sem corpo/XML, sem seguir redirecionamento. Captura status, IDs de correlação, códigos técnicos conhecidos e PolicyAgent quando efetivamente retornado. Usa mensagens literais permitidas, não texto livre. Corpo excedente, HTML, propriedades desconhecidas, cookies, tokens, segredos, mensagens livres e dados pessoais são omitidos. A resposta original continua disponível ao tratamento normal. Esse recibo não é anexado aos erros das rotas comuns.

## Execução real autorizada pela JEFF

Reutiliza `installControlledFetch` do controle de produção já existente. O manifesto agenda esta versão e fixa empresa/conexão/seller JEFF; não contém segredo. O script só roda no build de produção com as configurações existentes na Vercel, depois dos testes, sem exportar variáveis para o computador/preview. Versões futuras sem plano correspondente não executam o controle. Nenhuma nova porta de autenticação ou tarefa recorrente foi criada.

A guarda permite leituras no ML/Supabase e a manutenção normal da credencial, limitada à conexão escolhida. Bloqueia qualquer escrita comercial, RPC, alteração em produto/saldo/anúncio e origem externa. Registra contagens de GETs, refreshes e atualizações de credencial separadamente; não chamar manutenção OAuth de alteração de preço ou estoque. Não grava média/referência nem modifica permissões. Os códigos 403 das sondagens são resultado diagnóstico esperado, não confirmação automática de causa ou falha do produto. A identidade JEFF e a ausência de escritas proibidas precisam ser confirmadas para concluir o controle.

Eventos de build usam prefixos `AVANTA_ML_ACCESS_CHECK`, `APP`, `PROBE` e `RESPONSE`, em linhas limitadas e somente com campos sanitizados. A origem é explicitamente `vercel-production-build`: não afirmar que o IP do build é o IP de uma função em execução. O endpoint administrativo permite depois repetir a leitura na origem de runtime, sob a sessão normal do administrador.

## Validação local

- 40 testes focados aprovados: recibos/omissão de segredos, limite de corpo, resposta original preservada, caminhos/conta/app, identidade antes de tudo, grant filtrado, controles administrativos em execução e contrato normal do adaptador.
- Marketplaces: 1.520 testes, 1.517 aprovados, três skips preexistentes, zero falhas. Após essa execução, um teste adicional da guarda real bloqueou PUT/POST no ML, PATCH de preço/saldo, RPC e origem externa antes do envio; os sete testes desse arquivo passaram. Não somar novamente os testes repetidos.
- Segurança: 714 aprovados, zero falhas. TypeScript, Padrão Avanta, Ava e revisão av203 aprovados; diff sem erros.
- Execução local do script confirmou o estado agendado, sem executar rede real ou copiar segredos. A prova autenticada será capturada na publicação autorizada e não é substituída por fixtures.

Sem migração de banco nesta entrega. Publicação autorizada pela main, com build integral e promoção automática após aprovação. Conferir READY, SHA e domínio antes de declarar no ar. Logs locais em `/private/tmp/avanta-423-diagnostico/`; resultados reais e limites devem ser registrados após a execução, sem inventar liberação do 403.

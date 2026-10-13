# Anúncios em marketplaces

Módulo Web e PWA por empresa para conectar contas de marketplaces, preparar publicações por EAN e consultar produtos e preços.

## Segurança

- Identificação local de contas em `marketplace_connection_labels`, sem
  alterar nome oficial ou tokens. Migração `20261012190000` aplicada ao
  Supabase AvantaLab em 12/10/2026 com autorização; RLS e privilégios
  verificados. PATCH exige gerenciamento de conexões e mesma empresa;
  tabela acessível apenas pelo backend. Incluída na entrega Web 3.0.0.10.
- Nunca coleta, transmite, persiste ou registra a senha do marketplace.
- A primeira integração é Mercado Livre por OAuth 2.0 Authorization Code + PKCE.
- `Client Secret`, access token e refresh token ficam apenas no servidor. Os tokens persistidos usam criptografia em repouso com chave externa versionada; nunca chegam ao navegador, logs ou contexto da Ava.
- A publicação é uma ação explícita, idempotente e auditada. Antes do POST no provedor, o servidor relê permissões, empresa, conexão, catálogo e requisitos atuais.

Para habilitar a conexão no ambiente, o servidor precisa receber
`MERCADOLIVRE_CLIENT_ID`, `MERCADOLIVRE_CLIENT_SECRET`,
`MERCADOLIVRE_OAUTH_REDIRECT_URI` e `MARKETPLACE_SECRETS_KEY` (32 bytes em
base64url) como variáveis secretas. Elas não pertencem a `NEXT_PUBLIC_*`, a
logs, preferências de navegador ou banco de dados sem criptografia.

Não há integração externa de GTIN ativa nesta versão. O fallback do cadastro por
EAN usa apenas produtos ativos dos catálogos da própria empresa e não exige
credenciais adicionais no ambiente.

## Implementado e validado

- Refinamento 3.0.0.02: Novo anúncio usa somente Publicar na conta para
  apresentar nome local, nome oficial e ID, sem campo de identificação duplicado.
  Edição pelo lápis e solicitação após conexão preservadas. Sem publicação.
- Refinamento 3.0.0.01: identificação somente leitura em Novo anúncio; lápis
  oficial antes de Renovar abre edição inline na conta, com salvar/cancelar.
  Após nova conexão ML, callback informa o ID (sem credenciais) no popup e
  no fallback; UI relê conexões autenticadas e só abre a conta confirmada da
  empresa. Renovação não abre identificação. Sem nova migração/publicação.
- **Produtos e estoque** (1.51.0): cadastro separado por empresa, SKU local,
  EAN opcional, fotos, descrição, atributos e opções da ficha de publicação.
  Importação do cache é parcial; **Consultar ficha do anúncio** busca os dados
  atuais e completa apenas os campos ausentes, sem confirmar estoque. Não
  associa produtos por título/EAN e não soma quantidades entre anúncios.
- Estoque físico começa desconhecido na importação. O usuário confirma ou
  ajusta a contagem; RPC registra histórico e usa revisão para impedir
  sobrescritas concorrentes. Zero confirmado é diferente de saldo desconhecido.
  Um cadastro pendente pode ser arquivado ao mover seus vínculos ao produto
  correto, com confirmação explícita e sem somar estoque.
- Primeira publicação validada registra um produto local antes de criar no ML.
  Outras contas recebem anúncios vinculados ao mesmo produto. Se houver falha
  parcial, a auditoria retém o produto local e ID confirmado; não repetir envio.
  Preparação a partir do cadastro relê empresa, ficha e opções da conta destino.
- Migração `20261011200000_marketplace_local_products.sql` aplicada ao projeto
  `qzewxhdkwettnlmkjoqd` em 11/10/2026, sem tocar no saldo dos marketplaces.
  Saldo local ainda não tem reservas/baixa de vendas/sincronização com ML ou
  AvantaVendas. Variações exigem implementação específica antes de importar/copiar.

- Conexão Mercado Livre por OAuth, sem senha no AvantaLab.
- Lista por empresa e conta, cache isolado, busca, situação e detalhes.
- Consulta manual e automática a cada minuto enquanto a página estiver visível.
- Renovação de tokens no backend com lease, criptografia e persistência do par novo.
- Controles de pausar/reativar, encerrar/excluir com confirmação, permissões,
  validação de proprietário e auditoria. Não foram testados em anúncios reais
  para preservar o estado dos produtos existentes.
- Migração `20261005140000_marketplace_listing_management.sql` aplicada ao projeto
  AvantaLab em 2026-10-05; consulta real da conta existente trouxe sete anúncios.
- Taxa/frete são estimativas quando disponíveis. Falha de obtenção não vira zero.
- O editor inline apresenta título, preço, estoque e descrição antes do EAN,
  respeitando permissões atuais da integração. Falha na consulta mantém título,
  preço e estoque do cache visíveis, mas bloqueia alterações e salvamento.
- A migração `20261005190000_marketplace_listing_edit.sql` habilita a auditoria
  de edição; aplicar antes de testar salvamentos reais. GET não altera anúncios.
- O PWA Marketplaces Mobile, em `/marketplaces/consulta`, usa o mesmo login,
  empresa e conexão Mercado Livre do módulo.
  Ele não possui fluxo OAuth próprio, não recebe tokens no cliente e permite
  leitura por câmera, EAN manual, pesquisa textual, comparação e histórico.
- A média considera ofertas ativas do mesmo produto de catálogo e seus preços
  atuais; sem amostra, usa as referências oficiais disponíveis na ficha. As
  sugestões são calculadas sobre a média: mínimo 50%, médio 70% e ideal 90%.
- A consulta automática de preço usa a API Merchant do Google Shopping da
  DataForSEO apenas no servidor. O Mercado Livre continua responsável pela
  identificação do produto e pela conexão da empresa; o título confirmado da
  ficha é a consulta enviada ao Google Shopping, enquanto o EAN permanece na
  validação. `DATAFORSEO_API_LOGIN`,
  `DATAFORSEO_API_PASSWORD` e `DATAFORSEO_PRICE_LOOKUP_ENABLED` são secrets de
  produção e nunca podem ser expostos ao navegador, ao banco ou a logs.
- O estado temporário `Task In Queue` da DataForSEO mantém uma continuação
  criptografada, vinculada à empresa e à conta selecionada. O PWA acompanha a
  mesma tarefa automaticamente, sem interpretar a fila como recusa e sem criar
  nova consulta cobrável durante a espera. Em **Consultar novamente** de
  histórico, a rota usa apenas o produto já salvo e Google Shopping — nunca
  inicia outra identificação no Mercado Livre. Acompanhamentos podem durar até
  três minutos e preservam a amostra válida da vitrine caso a ficha detalhada
  de vendedores termine vazia. Uma tarefa `20000` sem qualquer oferta é
  finalizada como consulta sem preços. Respostas sem
  resultado (`40102`) e parciais (`40106`) são resultados concluídos; falhas
  reais de execução, validação, limite ou indisponibilidade retornam mensagem
  específica dentro do resultado que está sendo atualizado.
- A migração `20261005213000_marketplace_price_consultations.sql` registra o
  histórico por empresa com RLS e acesso direto revogado de anon/authenticated.
- A migração `20261006162000_marketplace_price_history_reuse.sql` complementa
  esse histórico com data da última pesquisa e data de ajuste manual. O mesmo
  EAN reutiliza primeiro a referência isolada da empresa; **Últimas consultas**
  entrega somente as 20 mais recentes e **Produtos precificados** concentra a
  base completa com busca e ordenação. Produto sem ficha pode virar uma
  referência manual, que calcula 50%, 70% e 90% e pode ser pesquisada depois
  no Google Shopping sem repetir a identificação no Mercado Livre.

## Limites atuais

- `Pesquisar` consulta primeiro o catálogo do Mercado Livre e, na ausência de ficha, os produtos ativos cadastrados no perfil da empresa. Após revisão da ficha e preenchimento dos campos obrigatórios, `Publicar` executa a criação mediante ação explícita do usuário.
- A automação de estoque depende da migração `20261012010000_marketplace_inventory_sync.sql`,
  da publicação das rotas e da execução do script de ativação do agendador abaixo.
  Conferir o heartbeat e as pendências antes de afirmar operação em produção.
- Outras contas podem ser vinculadas por OAuth e escolhidas no seletor; a
  validação ao vivo usou somente a conta que já estava conectada. Uma ficha
  publicada pode ser preparada para outra conta conectada da mesma empresa,
  sempre com revisão e confirmação independentes.
- Todas as listas do módulo usam o seletor AvantaLab ancorado imediatamente
  abaixo do campo, com teclado, foco visível, rolagem e adaptação a mobile.

## Fluxo de publicação

1. Gestor ou administrador conecta a conta no domínio oficial do marketplace.
2. Operador autorizado seleciona a conta e informa o EAN.
   O botão de código de barras arma leitores USB/Bluetooth em modo teclado;
   o sufixo Enter enviado pelo equipamento inicia a validação.
3. O conector consulta o catálogo do Mercado Livre. Se não houver ficha, consulta os produtos ativos do perfil, usa o preditor oficial do Mercado Livre e solicita os campos obrigatórios ausentes.
4. O usuário confirma em `Publicar`; o backend revalida os dados e registra o resultado.
5. Depois de publicada, a ficha pode ser preparada em outra conta conectada.
   Preço, descrição, estoque, garantia e atributos permanecem editáveis, mas o
   destino é consultado e validado novamente antes de uma nova confirmação.
6. Em **Anunciados**, **Publicar em outra conta** relê o item e a descrição
   atuais da origem no Mercado Livre e abre esse mesmo rascunho revisável no
   destino. A preparação não cria anúncio e nunca atravessa empresas.
   Anúncio original sem EAN usa a ficha ativa do catálogo ou a categoria,
   título, imagens e atributos atuais do anúncio tradicional. Não cria GTIN
   fictício: só exige código/motivo quando o Mercado Livre exigir. A origem
   é relida e autorizada na mesma empresa antes da publicação; não basta
   enviar um identificador de catálogo/origem pelo navegador. O validador
   oficial ainda pode recusar exigências condicionais da conta e categoria.

Outros marketplaces aparecem como integrações planejadas até que seus contratos e credenciais oficiais sejam configurados.

## Mercado Livre: ativação do ambiente

### Carga inicial do estoque local

`produtos/estoque-anuncios` consulta o estoque atual dos anúncios vinculados,
com autorização de gestão por empresa. Revisão sem gravação em lotes de três
produtos e cursor por ID; somente ativos com quantidade positiva, sem variações.
Mais de uma origem exige escolha de um anúncio, nunca soma. Confirmação relê
vínculo, conta, vendedor, quantidade e revisão; preserva saldos já definidos,
inclusive zero. Usa a RPC atômica existente e registra origem no histórico.
Falhas parciais não são zero nem sucesso. Após a ativação da automação, o saldo
definido passa a alimentar os anúncios vinculados elegíveis.
Vincular anúncios iguais antes da carga; importar ficha permanece separado.

### Automação do estoque e novas vendas — 2.0.0

1. Aplicar a migração aditiva e publicar a aplicação. Não reenviar vendas históricas
   para simular movimentação: o marco inicial é deliberado. Um saldo físico ajustado
   define novo marco, considerando absorvidos os pedidos anteriores à contagem.
2. Confirmar que POST sem credencial para `/api/cron/marketplaces` responde **401**.
3. Aplicar `supabase/operations/marketplace_inventory_scheduler.sql`: `pg_cron`/`pg_net`,
   agenda de 30 segundos criada **desativada**, chave exclusiva privada gerada no banco.
   Pode ser configurada antes da publicação; ativar apenas após o teste 401 da rota,
   com `select cron.alter_job(jobid,active:=true) from cron.job where jobname='avantalab-marketplace-inventory-v1';`.
   O job
   envia essa chave, nunca service_role ou token ML. Manter `net` fora dos schemas
   expostos pela Data API e a rotina sem execução para anon/authenticated. O pg_net
   gerenciado não permite revogar suas permissões como postgres: logins diretos ao
   banco podem ler seus cabeçalhos temporários e devem ser restritos a serviços
   confiáveis. Não criar RPC pública de leitura dessa fila. Um lease de 75 segundos e
   limite de rota de 60 segundos evitam workers simultâneos; prioridades alternadas.
   Conferir que a API responde `406/PGRST106` para o schema `net`, sem consultar
   cabeçalhos. Limitação documentada em
   [permissões do pg_net gerenciado](https://supabase.com/docs/guides/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16).
4. No DevCenter manter webhook `/api/webhooks/mercado-livre` com `orders_v2`,
   `shipments` e `items`. Falha ao guardar a fila retorna 503. O callback responde
   antes de processar (`after`). Pedidos são relidos e o vendedor é verificado.
5. Conferir `cron.job_run_details` e `marketplace_inventory_worker.finished_at`
   sem selecionar tokens. Interromper de forma recuperável desativando apenas
   `avantalab-marketplace-inventory-v1` em `cron.job`; não apagar tabelas/histórico.

Baixas por pedido/item são atômicas com histórico e outbox. Nenhuma quantidade
de conta é somada. Itens recebidos alteram cache/vínculo, não provocam baixa por
diferença de estoque. A fila compara revisão local, verifica vendedor e modelo,
manda somente `available_quantity` e confirma via GET. Valores incertos,
multiorigem/Full, kits, variações, produto sem vínculo/saldo ou UP cujos anúncios
não estão unificados permanecem pendentes. Não reativar pausas manuais. Saldo
remoto menor após venda não é aumentado por tentativa de sincronização.
Vendas sem webhook são recuperadas por janela paginada fixa com sobreposição
de uma hora (os filtros de data ML têm precisão horária), persistindo fila antes
do cursor. Estoque continua sujeito ao atraso das APIs e vendas simultâneas entre
plataformas; não oferecer garantia de consistência instantânea/zero overselling.

`marketplace_sale_alerts`/`marketplace_sale_alert_reads` guardam avisos por item
e leitura por usuário; não são os contadores filtrados de pedidos. Realtime
privado transmite apenas sinal sem conteúdo; API relê com autorização por empresa.
Conferência de dez segundos/foco recupera sinais. Popup reutiliza `ModalConfirmacao`,
espera modal/edição finalizar, mostra dados do pedido e abre permalink validado,
com consulta ao provedor se não houver cache. Fechar não marca envio. Gestão e
módulos Web com empresa na URL recebem avisos; PWAs operacionais e Gestão Mobile
imperativa não recebem push nesta entrega. Provedores futuros exigem adaptadores.

### Configuração

#### Magalu — OAuth habilitado em produção 3.0.0.18 (operações ainda pendentes)

- Em 3.0.0.18, usuário autorizou a publicação dos refinamentos e ativação do
  OAuth para consentimento da loja. Flag de produção `MAGALU_OAUTH_ENABLED=true`
  neste deploy; no local permanece falsa (cofre real não exportável).
  Nenhuma aplicação/credencial foi recriada, escopo ampliado ou estoque alterado.
  Após deploy, validar a origem/rota protegida e iniciar pelo botão autenticado.
  Consentimento real depende do responsável e sua organização seller. A marca
  continua Em preparação pelas operações ainda pendentes, não por OAuth desligado.

- Preparação anterior (3.0.0.15), mantida como registro: banco verificado no projeto
  Supabase AvantaLab em 12/10/2026; contas/pendências ML preservadas, RLS ativo
  e sem acesso anon/authenticated. Nenhum estoque ou token existente alterado.
- Credenciais Magalu configuradas para produção na Vercel; client secret como
  Secret (não exportável). Flag `MAGALU_OAUTH_ENABLED=false` até publicação
  expressamente autorizada. A chave do cofre existente não foi alterada.
  No local, essa chave não está disponível: testes usam fixtures isoladas,
  não os tokens reais nem um novo cofre ligado ao banco de produção.
- Callback confirmado comunica somente à origem e à janela que iniciou o
  fluxo, atualiza contas e pede identificação; popup fecha. Sem opener,
  retorna ao módulo com empresa e ID confirmados, sem código/token na URL.
  Listagem e desconexão aceitam ML/Magalu, sempre restritas à empresa.
  Loja autorizada fica `attention`/`magalu_connector_pending`, identificável,
  com texto explícito de sincronização pendente e sem usar renovação ML.
  Falta consentimento de loja real e adaptadores de anúncios/vendas/estoque.
  Aviso da rotina automática identifica o ML mesmo quando outra marca está
  selecionada; não implica atividade ou sincronização Magalu.

- Evolução 2.2.0: seletor é contexto de contas/anúncios/destinos, não apenas
  destino da conexão. Helper testável filtra pelo provider e rejeita conta
  fora da seleção. Payloads legados sem provider pertencem ao Mercado Livre.
  Não muda o endpoint nem ativa adaptadores pendentes; consultas de Anunciados
  fora do ML não executam rotas ML. Produtos e estoque/vínculos mantêm todas
  as informações; apenas seus destinos de publicação são filtrados.
- Header fixo e barra nativa sticky no ancestral de conteúdo completo,
  offsets medidos por ResizeObserver; corpo com overflow restrito à página
  deste módulo para corrigir sticky. Detalhes respeitam ambas as faixas.
  Vendas e avisos continuam gerais. Sem publicação.

- Refinamento 2.1.0.04: contas em linhas compactas; branding usa `provider`
  da conexão (payloads legados sem provider continuam Mercado Livre), não o
  seletor de destino. Preserva campos completos, avisos, ações e renovação
  interna; quebra responsiva evita corte. Ações globais no cabeçalho da lista.
  Não altera rotas, permissões, tokens, estoques nem ativa outros marketplaces.

- Refinamento 2.1.0.03: configuração em dois blocos horizontais de largura
  integral, Marketplace primeiro e Novo anúncio abaixo, separados por 24px.
  Seis marcas por linha no desktop, três em telas intermediárias e duas no
  celular. Mudança somente de CSS, sem desmontar estados ou ativar integrações.

- Refinamento visual 2.1.0.02: botões do seletor com identidade das seis marcas,
  logos locais e fontes documentadas em `public/images/marketplaces/README.md`.
  Nome acessível preservado, seleção com borda/check e disponibilidade textual.
  Não ativa novos conectores. A disposição compacta das contas foi apenas
  simulada e não mudou os cards reais. Sem publicação.

- Refinamento 2.1.0.01: seletor determina só destino de “Conectar outra conta”,
  incluindo Magalu. Listas, cabeçalho, contas e Novo anúncio permanecem montados
  e inalterados. A conta de publicação continua independente. Endpoint e URL
  de autorização validados por plataforma. Preparação é informada apenas ao
  tentar conectar enquanto o backend não estiver ativado.
- Aplicação **AvantaLab** criada via IDM oficial em 12/10/2026 no ID pessoal
  do desenvolvedor. UUID público `d7fdb3df-be33-4f3b-bf4b-23061e254b66`.
  Lista oficial confirmou os três escopos abaixo em AVAILABLE. Não houve
  exigência de CNPJ nesta criação; isso não comprova habilitação de uma loja
  seller nem homologação completa da integração. Não criar aplicação duplicada.
- Início privado: `POST /api/modulos/marketplaces/conexoes/magalu/iniciar`,
  JSON `{ empresaId }`, Bearer AvantaLab e Origin do mesmo ambiente. Só Gestor
  Master/Administrador de empresa com o módulo ativo. Reutiliza o botão de conexão.
- Retorno implementado: `/api/modulos/marketplaces/conexoes/magalu/callback`.
  Cadastro inicial da aplicação usa
  `http://localhost:3000/api/modulos/marketplaces/conexoes/magalu/callback`.
  Em 3.0.0.15, adicionado também
  `https://avantalab.com.br/api/modulos/marketplaces/conexoes/magalu/callback`
  na aplicação existente, preservando o local. Rota já publicada, flag falsa;
  aguardar publicação autorizada dos ajustes/ativação antes do teste real.
- Variáveis exclusivamente no servidor: `MAGALU_CLIENT_ID`,
  `MAGALU_CLIENT_SECRET`, `MAGALU_OAUTH_REDIRECT_URI`, `MAGALU_OAUTH_ENABLED`.
  Flag ausente/falsa bloqueia o fluxo. Reutiliza `MARKETPLACE_SECRETS_KEY`;
  nunca regenerar essa chave para habilitar outra plataforma.
  No desenvolvimento, `MAGALU_LOCAL_CREDENTIALS_FILE` pode apontar somente para
  `.codex/magalu/client-credentials.json`, gerado pelo IDM com modo 0600 e pasta
  0700, fora do Git. Esse fallback não existe em produção; produção exige
  credenciais no gerenciador de segredos/variáveis server-side. Flag local
  permanece falsa até autorização de teste com uma loja e banco preparado.
- `20261012160000_marketplace_magalu_oauth.sql` aplicada ao Supabase remoto
  em 3.0.0.15, sem ativar conexão ou adaptadores. RLS e privilégios privados
  verificados e preservados; migração também validada com SQL real em PGlite.
- State de 10 minutos, consumo atômico, PKCE S256, binding por cookie HttpOnly
  SameSite Lax e por pendência. Retorno depende da origem/callback exatos e da
  configuração usada no início; revalida administrador/módulo antes de trocar
  o código e novamente antes de salvar. Cancela sem alterar contas existentes.
- Solicita somente `open:order-order-seller:read`,
  `open:portfolio-skus-seller:read`, `open:portfolio-stocks-seller:read`.
  A loja deve escolher a organização seller (`choose_tenants=true`). Conta
  pessoal do desenvolvedor não comprova elegibilidade/acesso de loja.
- Troca no endpoint fixo `https://id.magalu.com/oauth/token`, sem redirects.
  Metadados são lidos exclusivamente do token obtido diretamente desse endpoint
  TLS, não de JWT fornecido pelo cliente. Exige subject GENPUB.uuid, audiência
  Marketplace, validade e escopos de consulta completos; formato divergente
  falha de forma fechada e requer conferência do contrato real antes de ativar.
- Tokens AES-256-GCM no cofre existente. Respostas não carregam tokens/código,
  não imprimem erros brutos e removem a query do histórico da aba de retorno.
  Falha ou repetição não sinaliza sucesso. Autorização completa fica `attention`
  / `magalu_connector_pending`, para não anunciar sincronização inexistente.
- Interface, workers e estoque do Mercado Livre permanecem restritos ao ML.
  Falta implementar/testar os adaptadores Magalu e uma autorização de loja real.
  Testes de retorno usam respostas simuladas; não equivalem a homologação real.

Fontes oficiais: [criação de aplicação](https://developers.magalu.com/docs/first-steps/create-an-application/create-application/index.html)
e [consentimento OAuth](https://developers.magalu.com/docs/first-steps/create-an-application/authentication-authorization/index.html).

Cadastre no DevCenter a URL exata de retorno:
`https://SEU-DOMINIO/api/modulos/marketplaces/conexoes/mercado-livre/callback`.
Para desenvolvimento local, registre a URL local correspondente antes de testar.
O callback aceita apenas uma pendência válida por até dez minutos, confere
`state`, usa o `code_verifier` do PKCE e consome a pendência antes de persistir
a credencial. A rotação do refresh token substitui ambos os tokens na mesma
atualização, pois o refresh token do Mercado Livre é de uso único.

## Recuperação da migração

A migração é aditiva, transacional e limita o tempo de espera por bloqueios.
Em erro, a transação inteira é revertida. Após sucesso, uma reversão da aplicação
deve preservar as novas colunas/tabelas e o cache/histórico, desabilitando apenas
o uso das rotas se necessário. Não executar DROP nem apagar credenciais para
reverter a interface. RLS permanece ativo e anon/authenticated não têm acesso
direto às tabelas; a service role é exclusiva do backend autorizado por empresa.

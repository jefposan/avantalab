# Anúncios em marketplaces

Módulo Web e PWA por empresa para conectar contas de marketplaces, preparar publicações por EAN e consultar produtos e preços.

## Segurança

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
  mesma tarefa automaticamente até concluir, sem interpretar a fila como
  recusa e sem criar nova consulta cobrável durante a espera.
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
- Cron e webhook não foram ativados; o cache não se atualiza com o módulo fechado.
- Outras contas podem ser vinculadas por OAuth e escolhidas no seletor; a
  validação ao vivo usou somente a conta que já estava conectada.
- Todas as listas do módulo usam o seletor AvantaLab ancorado imediatamente
  abaixo do campo, com teclado, foco visível, rolagem e adaptação a mobile.

## Fluxo de publicação

1. Gestor ou administrador conecta a conta no domínio oficial do marketplace.
2. Operador autorizado seleciona a conta e informa o EAN.
   O botão de código de barras arma leitores USB/Bluetooth em modo teclado;
   o sufixo Enter enviado pelo equipamento inicia a validação.
3. O conector consulta o catálogo do Mercado Livre. Se não houver ficha, consulta os produtos ativos do perfil, usa o preditor oficial do Mercado Livre e solicita os campos obrigatórios ausentes.
4. O usuário confirma em `Publicar`; o backend revalida os dados e registra o resultado.

Outros marketplaces aparecem como integrações planejadas até que seus contratos e credenciais oficiais sejam configurados.

## Mercado Livre: ativação do ambiente

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

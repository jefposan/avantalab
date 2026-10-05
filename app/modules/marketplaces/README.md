# Anúncios em marketplaces

Módulo web por empresa para conectar contas de marketplaces e preparar publicações por EAN.

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

## Limites atuais

- `Validar e preparar` consulta o catálogo do Mercado Livre sem publicar. Após revisão da ficha e preenchimento dos campos obrigatórios, `Publicar` executa a criação mediante ação explícita do usuário.
- Cron e webhook não foram ativados; o cache não se atualiza com o módulo fechado.
- Outras contas podem ser vinculadas por OAuth e escolhidas no seletor; a
  validação ao vivo usou somente a conta que já estava conectada.

## Fluxo de publicação

1. Gestor ou administrador conecta a conta no domínio oficial do marketplace.
2. Operador autorizado seleciona a conta e informa o EAN.
3. O conector consulta o catálogo, apresenta a ficha e solicita preço e campos obrigatórios ausentes.
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

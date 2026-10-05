# Anúncios em marketplaces

Módulo web por empresa para conectar contas de marketplaces e preparar publicações por EAN e preço.

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

## Fluxo

1. Gestor ou administrador conecta a conta no domínio oficial do marketplace.
2. Operador autorizado informa EAN e valor de venda.
3. O conector consulta o catálogo e devolve somente os campos obrigatórios ausentes.
4. O usuário confirma a publicação; o backend executa a chamada e grava o resultado idempotente.

Outros marketplaces aparecem como integrações planejadas até que seus contratos e credenciais oficiais sejam configurados.

## Mercado Livre: ativação do ambiente

Cadastre no DevCenter a URL exata de retorno:
`https://SEU-DOMINIO/api/modulos/marketplaces/conexoes/mercado-livre/callback`.
Para desenvolvimento local, registre a URL local correspondente antes de testar.
O callback aceita apenas uma pendência válida por até dez minutos, confere
`state`, usa o `code_verifier` do PKCE e consome a pendência antes de persistir
a credencial. A rotação futura do refresh token deve substituir ambos os tokens
na mesma atualização, pois o refresh token do Mercado Livre é de uso único.

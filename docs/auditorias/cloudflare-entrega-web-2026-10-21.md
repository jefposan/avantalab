# Auditoria Cloudflare e entrega Web — 21/10/2026

Status: **configuração auditada; correções aplicadas e verificadas em produção**.
PADRÃO AVANTA consultado: 1.20.0. Sem redeploy da aplicação, versão nova, purga,
migração, alteração de DNS, modo SSL ou WAF. Sem impacto operacional na Ava.

## Entrega aplicada após login no painel

Autorização de 21/10/2026: corrigir WWW e ajustar infraestrutura sem comprometer
login/acessos. A aba autenticada foi localizada após o titular abrir outra aba.

### Alterações

- **WWW na Vercel**: vinculado ao projeto existente, verificado e certificado
  emitido com renovação automática (90 dias na consulta). Redirect 308 para
  `avantalab.com.br`, mantendo caminhos e queries. Nenhum DNS foi alterado.
- **Cache Rule** `AvantaLab - Sessao APIs e versoes sem cache`, ID
  `4e5b9bdcc9894c858ef180a68ff5bd93`: bypass para APIs privadas, entradas de
  login/app/módulos, scripts mobile, workers, versões, auth/OAuth, RSC e
  requisições com Authorization. Browser TTL respeita a origem nessa regra.
  Exceções públicas por caminho: `/api/taxa-cdi` e `/api/usuarios-ativos`.
  Não inclui indiscriminadamente os arquivos estáticos versionados.
- **Response Header Rule** `AvantaLab - Tipo de conteudo seguro`, ID
  `7e4efa395f1542e18ac03a2f60c0fbaf`: `X-Content-Type-Options: nosniff`.
- **Response Header Rule** `AvantaLab - Referrer padrao sem sobrescrever origem`,
  ID `5c3fb5c4419d479ba4ee7df349507b6f`: `strict-origin-when-cross-origin` somente
  se a origem não envia Referrer-Policy. Expressão:
  `not any(http.response.headers["referrer-policy"][*] ne "")`.
  Políticas específicas, como no-referrer do callback Magalu, são preservadas.
- **Response Header Rule** `AvantaLab - APIs privadas nao armazenar`, ID
  `b6af2ed2f9ab4d9295894d6c26fe161b`: APIs, exceto as duas públicas acima,
  recebem `Cache-Control: private, no-store, no-cache, max-age=0, must-revalidate`,
  inclusive nos erros. A Cache Rule protege a decisão na borda; a transformação
  de resposta protege o cliente e não é substituta do bypass.

As quatro regras Cloudflare constam ativas. Sem novo custo, plugin ou credencial.

### Conferido e preservado

- Registros A/CNAME/CAA e proxy existentes; WWW já apontava para a Vercel, mas
  não estava vinculado ao projeto/certificado. Full (strict), certificado
  universal ativo, redirecionamento HTTPS e TLS 1.3 preservados.
- Mínimo TLS ainda 1.0: elevar para 1.2 fica para avaliação de clientes legados;
  não alterado nesta entrega para não comprometer acessos existentes.
- HTTP/2, HTTP/3, HTTP/2 para origem, IPv6 e WebSockets ativos. 0-RTT desligado.
- Cache Standard, Browser Cache TTL global de 4 h preservado; regra restrita
  respeita a origem nas rotas protegidas. Query strings preservadas.
- Antes: zero Cache Rules/Response Rules; agora uma regra de bypass, nenhuma
  Cache Response Rule. Zero Page Rules legadas e zero Workers Routes.
- WAF/DDoS gerenciados e Browser Integrity Check preservados. Sem ligar Bot
  Fight Mode, Under Attack ou Hotlink Protection.
- Rocket Loader, Cloudflare Fonts, Speed Brain, Early Hints, Always Online,
  Development Mode e Crawler Hints seguem desligados. Sem plano pago,
  reescrita de scripts ou especulação de navegação.
- Aviso sobre e-mail sem registros anotado, mas MX/SPF/DKIM/DMARC não foram
  configurados por suposição: dependem do provedor/remetentes definidos.

### Testes e limites

- Nova execução: **50 leituras, zero erros de transporte, zero alertas** nas
  categorias verificadas. Relatório:
  `/private/tmp/avanta-cloudflare-auditoria-final-20261021.json`.
- WWW `/`, `/gestao?entrar=1` e `/mobile?origem=auditoria`: 308 para a mesma
  rota/query do domínio oficial. Destino HTTPS 200.
- Respostas amostradas com nosniff e Referrer-Policy. APIs privadas 401/403,
  agora com private/no-store; login 200/no-store; RSC separado de HTML;
  mobile/worker/versão fora do cache, estáticos com hash e JS/CSS Vendas em HIT.
- Callback Magalu sem state válido: resposta controlada 200, no-store,
  no-referrer e CSP preservados. Sem conexão de conta ou troca de token.
- API pública de contagem mantém `public, max-age=300`. Vercel consome s-maxage
  na borda; sua ausência no cabeçalho ao navegador não é regressão de cache.
- A aba Gestão disponível estava no login: **não havia sessão autenticada para
  testar navegação interna**. Não houve logout, senha informada, acesso a
  armazenamento de credenciais ou login simulado. Teste completo Google/Apple
  e uso físico em iOS/Android permanece com o titular.
- 7 testes locais do auditor, PADRÃO AVANTA e Ava aprovados. Sem build, pois
  nenhuma alteração funcional ou deploy da aplicação foi feito nesta tarefa.
- Comprovante: `output/cloudflare-protecoes-ativas-20261021.png`.

### Recuperação e versão

- Snapshots antes/depois e expressões preparadas em
  `/private/tmp/avanta-cloudflare-20261021-fK7IWI/`, arquivos 0600.
- Se houver regressão comprovada, desativar apenas a regra específica pelos IDs
  acima e repetir os testes. Não apagar regras de terceiros nem purgar tudo.
- WWW/certificado são correção independente. Não removê-los para reverter
  uma regra Cloudflare: a configuração anterior causava 526.
- Versão 3.2.0.28 preservada: manutenção direta de infraestrutura, sem código
  novo ou binário. Minificação/divisão dos scripts mobile é melhoria posterior,
  não implementada por reescrita no proxy. Login, permissões e dados inalterados.

## Histórico da primeira etapa — somente leitura

## Evidências e limites

- 50 GETs públicos em 7 hostnames, incluindo WWW, 17 páginas de entrada,
  códigos mobile, Vendas, service workers, versão e amostras de JS/CSS com hash.
  Sem cookies, tokens, sessão de cliente, dados financeiros ou escrita no banco.
- Relatório gerado: `/private/tmp/avanta-cloudflare-auditoria-20261021.json`.
  Reprodução: `node scripts/auditar-entrega-web.mjs CAMINHO-RELATORIO.json`.
  O comando retorna código 1 se houver erro de rede/origem; achados não indicam
  automaticamente vulnerabilidade. Medidas são do Mac, não benchmark de celular.
- Vercel: tela Domains e listagem de certificados consultadas somente para
  leitura. Nameservers públicos: olga.ns.cloudflare.com / valentin.ns.cloudflare.com.
- O painel Cloudflare abriu em `/login`; não foi possível inspecionar DNS de
  origem, regras, WAF, modo SSL, Workers, métricas, contas ou plano privado.
- O inventário é amostral, não cobre todo endpoint, todos os usuários, todas as
  configurações privadas, navegação autenticada ou falhas de lógica de negócio.

## Achados confirmados

### Prioridade alta: WWW com erro 526

`https://www.avantalab.com.br/` respondeu 526. A Cloudflare documenta esse erro
como falha na validação do certificado da origem. A Vercel não listou WWW nos
domínios vinculados ao projeto nem nos nomes da listagem de certificados.
Isso é consistente com vínculo/certificado ausente, mas o destino DNS de origem
precisa ser conferido no painel antes de concluir a causa e corrigir.

Não reduzir SSL/TLS para Full/Flexible, não desativar o proxy e não alterar
nameservers como atalho. Conferir DNS, vínculo/redirect WWW → domínio principal
e emissão do certificado, preservando paths e query strings aplicáveis.

### Entrega e compressão já operacionais

- Todos os 7 hostnames responderam com `server: cloudflare`. Os 6 sem WWW
  responderam 200 nas páginas testadas, com HSTS e anúncio HTTP/3.
- HTML, JS e CSS das amostras 200 chegam com Brotli. Os HTMLs de entrada dos
  módulos transferiram aproximadamente 4–5 KiB; o mobile, cerca de 13 KiB.
- Assets Next com hash retornaram cache HIT e política de um ano/immutable;
  releituras também confirmaram cache. A política é adequada a conteúdo com hash.
- HTML ficou DYNAMIC; código mobile e workers, BYPASS; endpoints de versão,
  DYNAMIC. Não foi observado HIT indevido nesses conteúdos mutáveis.
- Requisição pública RSC a `/modulos?_rsc=auditoria`, com `RSC: 1`, retornou
  `text/x-component`, separada do HTML e sem HIT Cloudflare na amostra.
- Não foi encontrado Rocket Loader no HTML amostrado. Isso não comprova seu
  estado em todas as regras privadas.

### Cabeçalhos podem ser padronizados

Em grande parte das amostras faltaram `X-Content-Type-Options: nosniff` e uma
`Referrer-Policy` explícita. HSTS já está ativo nos 6 hostnames funcionais.
APIs de acesso/usuários negaram chamadas sem login, mas algumas respostas de
erro vieram com política pública revalidável, não `no-store`. Na amostra não
houve cache compartilhado nem divulgação de dados; recomenda-se endurecimento
coerente das respostas autenticadas e seus erros.

Não aplicar CSP, X-Frame-Options, bloqueio de câmera/microfone/localização ou
Cache Everything global sem testar popups, iframes, apps, OAuth e integrações.
Há APIs públicas intencionalmente cacheáveis, como taxa CDI e contagem pública;
não substituir todas as políticas indiscriminadamente.

### Peso e execução no mobile

- `mobile-app.js`: cerca de 1.048 KiB descompactado e 225 KiB transferidos na
  leitura pública; Vendas `app.js`: 653 KiB e 150 KiB; CSS: 277 KiB e 53 KiB.
- Scripts próprios distribuídos diretamente não recebem a mesma minificação
  dos bundles Next. Simulação local, apenas em memória, removendo espaços e
  comentários, reduziu Brotli de nível máximo de 166.172 para 145.028 bytes na
  Gestão e 115.350 para 107.199 no Vendas. Esses números locais não são promessa
  de ganho real na rede nem substituem teste funcional/performance em aparelho.
- O código da Gestão força rede/no-store para código mobile por decisão anterior
  de compatibilidade de login/dados. Não retirar a proteção sem desenhar URLs
  imutáveis reais, publicação coerente e regressões de clientes antigos.
- Próxima melhoria de aplicação: minificação no build e carregamento sob demanda
  dos recursos pesados, com medição em aparelhos lentos e preservação da sessão.

## Pendências antes de aplicar mudanças no Cloudflare

1. Titular entrar na aba Cloudflare aberta; não compartilhar senha/token no chat.
2. Fotografar/registrar configurações atuais para reversão: DNS do projeto sem
   alterar e-mail/outros serviços, SSL, cache/page/configuration/compression rules,
   redirecionamentos, Workers/routes, segurança/WAF, protocolos e otimizações.
3. Corrigir WWW na origem/redirect após confirmar o DNS e a configuração atual.
4. Preservar cache para assets com hash e query de versão; bypass para sessão,
   APIs privadas, OAuth, workers e versões. Preservar parâmetros e cabeçalhos RSC.
5. Não ligar Rocket Loader/minificação no proxy para reescrever scripts do app.
6. Não ativar plano pago, regra invasiva, rate limit genérico ou bloqueio de bots
   que interfira em login, apps, callbacks ou webhooks sem avaliar impactos.
7. Validar mudanças pequenas, registrar reversão e repetir auditoria HTTPS;
   qualquer ajuste de aplicação exige publicação isolada e testes próprios.

## Fontes técnicas

- [Cloudflare — controle de cache da origem](https://developers.cloudflare.com/cache/concepts/cache-control/)
- [Cloudflare — compressão](https://developers.cloudflare.com/speed/optimization/content/compression/)
- [Cloudflare — erro 526](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-526/)
- [Vercel — Cloudflare na frente da Vercel](https://vercel.com/kb/guide/cloudflare-with-vercel)
- Guias locais Next 16.2.6: `cdn-caching.md`, `headers.md`, `compress.md`,
  `poweredByHeader.md`. Dupla CDN exige preservar cache keys/headers; não migrar
  DNS nem desativar proteção com base só em recomendação genérica do provedor.

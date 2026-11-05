# Ofertas e preparação — preços padrão por canal

Versão local 3.2.0.302. PADRÃO AVANTA 1.23.1. Sem publicação, migração ou alteração de anúncios remotos.

## Regra solicitada

Referência permanece no cadastro e só muda por ação explícita de ajuste/pesquisa. Sem valor de venda explícito, novas preparações Online usam Ideal e Ofertas Saldão usa Médio. Percentuais são os configurados no perfil, sem fixar 70/90 no cálculo. Alterar referência manual ou percentuais recalcula padrões em novas leituras/preparações. Não existe TTL de referência, nova pesquisa externa ou escrita no marketplace ao consultar/bipar.

A regra não confunde preço de referência com preço de venda manual: referência editada é a base; valor no formulário do anúncio pertence ao Online; valor digitado e salvo no post pertence ao post/PWA Saldão e não modifica Online. Post existente tem prioridade e não é substituído quando a referência ou percentuais mudam.

Preços de anúncios existentes/copiados são explícitos e preservados. Novos formulários ML/Magalu começam no Ideal, continuam editáveis e só enviam o preço após a confirmação normal de publicação. Nenhum reprecificador em massa foi acionado. Comprar Online continua mostrando o preço efetivo do anúncio sincronizado, sem divergência entre vitrine e destino. Produtos sem anúncio elegível e estoques sem saldo continuam obedecendo às regras de visibilidade existentes.

## Implementação

- Ofertas: projectOffers recebe percentuais; servidor lê configurações do perfil junto dos dados locais. Sem post com preço válido, clearance.priceCents usa Médio. Sem referência válida permanece sem preço.
- Novo post: Por inicia com Médio, De continua referência. A versão salva é recuperada e tem prioridade. O post não grava preço em cadastro/anúncio.
- ML: preparação do produto local lê percentuais e inicia form.price no Ideal; retorno da referência continua separado. Formulário manual e origem de cópia mantidos.
- Magalu: prepara priceCents no Ideal recebido das configurações do perfil; sem configurações não inventa valor. Cópia recupera o preço explícito da origem. O fornecedor não é alterado ao abrir o formulário.
- Cache público passa a v3 para a projeção nova; mantém intervalo de 15s apenas para leitura do banco, sem expiração ou atualização externa da referência.

## Validação

- 212 testes de Ofertas/post/publicação ML/Magalu: aprovados.
- 60 testes adicionais de referência local/configurações/interface: aprovados.
- Quatro casos de preparação Magalu com referência, percentuais personalizados e ausência de configuração/referência: aprovados.
- Segurança: 472 aprovados. PADRÃO AVANTA e Ava validados.
- TypeScript dos arquivos alterados e dependências: aprovado com os mesmos critérios do tsconfig, em projeto temporário que não inclui validadores de desenvolvimento alheios. Arquivo temporário removido.
- TypeScript global: bloqueado por erro fora do escopo em .next/dev/types/app/page.ts, que rejeita a exportação AvantaLandingPage de app/page.tsx. Nenhuma supressão, ignoreBuildErrors ou mudança na configuração oficial. Deve ser resolvido antes de build/publicação de um pacote que inclua essa landing page.

Não houve teste de escrita no Mercado Livre/Magalu nem modificação de preço em produção. Entrega local; publicação não realizada.

## Preparação para publicação autorizada

Pacote isolado /private/tmp/avanta302-offer-prices sobre a produção 3.2.0.300 (55bf0de7f19da33277bab25b7c3248a595242c15, deployment dpl_9LJALbU4t3uPoSEkvMHR2JZVGFG1). Trabalho de impressão .301 e demais pendências locais não incluídos. A checagem TypeScript global do pacote limpo passou após next typegen; o erro anterior é restrito aos artefatos de desenvolvimento da raiz compartilhada. Nenhuma supressão ou configuração oficial de testes/tipos foi alterada. Segurança do pacote: 471 aprovados. Percentuais atuais conferidos por leitura: mínimo 50%, médio 70%, ideal 90%. Produção/publicação serão confirmadas no recibo do pipeline.

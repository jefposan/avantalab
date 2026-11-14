# 3.2.0.424 — complemento de preços com pesquisa web

Publicação autorizada pelo responsável. Migração aplicada e registrada em produção; envio do código pela main em preparação.
Base: main 236f911c7b692413712b818262c9a86c5739ed95 (3.2.0.423).
Restauração: tag local restauracao/precos-complemento-base-20261114.
PADRÃO AVANTA 1.23.1. Checkout canônico e trabalhos paralelos preservados.

## Comportamento

- Pesquisa completa no catálogo ML primeiro, conservando a análise de variantes,
  contas próprias, vendedores, duplicatas, extremos e dispersão.
- Abaixo de três vendedores, pesquisa web com gpt-5.4-mini, máximo de duas
  chamadas da ferramenta e oito lojas. Prompt prioriza Google Shopping, sem
  alegar acesso garantido à sua grade. Sem DataForSEO.
- Chave de cache separada das consultas antigas; usa as reservas, limites e
  contabilização existentes por empresa. Abrir produto/histórico ou resultados
  não inicia pesquisa paga.
- Cada complemento precisa de leitura pública da página de origem, com produto,
  variante, disponibilidade e preço comprovados. O valor primário prevalece sobre
  o resumo da IA. Sem cookies, execução de JS ou bypass; DNS fixado, limite de
  bytes, redirecionamento e timeout pelo leitor existente.
- Uma oferta por domínio de loja; ofertas externas do ML são recusadas para não
  repetir contas/vendedores. Menor valor confirmado por domínio. Esse critério
  não identifica automaticamente a mesma pessoa jurídica em lojas distintas.
- Combina ofertas, nunca médias. Na falha do complemento usa o ML válido, mesmo
  com uma oferta. Sem nenhuma prova válida conserva a referência. Consulta ML
  parcial/para revisão não é substituída por uma amostra seletiva.
- Mantém ficha técnica, anúncios, estoques, reservas e permissões. As rotas e
  os clientes de pesquisa têm prazo compatível com as duas etapas; persistência
  mantém revisão, trava e idempotência existentes.
- Fontes/resultados continuam recolhidos; o painel distingue ML direto de
  complemento web, com quantidade aceita e falha quando houver.

## Banco e liberação

SQL novo: 20261114230000_marketplace_price_web_complement.sql. Atualiza o comando
backend para aceitar recibos combinados, conservando a validação ML e acesso
somente service_role. Não reescreve históricos ou saldos. Validado em PostgreSQL descartável via PGlite e aplicado em produção com guarda da definição anterior e registro atômico. Migrações já aplicadas não foram alteradas.
A migração foi autorizada junto da publicação e aplicada antes do envio. Antes de integrar,
reconferir main/produção e preservar qualquer entrega posterior à base.

## Validação local

- Suíte de Marketplaces: 1.533 aprovados, zero falhas, três ignorados existentes.
- 22 cenários novos aprovados, incluindo provedor com HTTP simulado, controles
  de consumo/cache, validação primária, médias, extremos, cancelamento e SQL real.
- Regressão direcionada após refinamentos: 63 aprovados; os três cenários
  estatísticos adicionais passaram no conjunto de 15 do orquestrador.
- Segurança: 714 aprovados, zero falhas.
- TypeScript, PADRÃO AVANTA, Ava e git diff --check aprovados.
- Não executou teste pago real nem alterou preços/estoque reais. Publicação autorizada em preparação.
  Cobertura da pesquisa web/Google Shopping depende das fontes acessíveis;
  teste simulado não comprova quantidade de lojas para cada EAN em produção.

A execução administrativa JEFF agendada somente para 3.2.0.423 foi retirada do
manifesto desta entrega; o diagnóstico continua disponível, sem novo agendamento.

## Conferência do banco antes do envio

Migração 20261114230000 registrada; contrato combinado confirmado. Privilégios:
anon=false, authenticated=false, service_role=true. Permanecem 209 produtos e
83 pesquisas antes/depois; nenhuma pesquisa ou alteração comercial nesta etapa.
Backup da definição anterior e recibos preservados no registro local da entrega.

# AvantaPreços — consulta direta do Mercado Livre — candidato local 3.2.0.420

Estado: implementado e validado localmente; sem push, publicação ou migração em produção nesta etapa. Não houve alteração real de referência, anúncio, estoque, reserva, venda ou financeiro pelo teste desta entrega.

## Origem e restauração

- Base oficial: main `9dd92bafc7916a6657e431f72a01386a61e77fcf`, versão 3.2.0.419. Download das lojas, dashboard AvantaVendas e reservas recentes preservados.
- Isolamento: `/private/tmp/avanta-precos-ml-local`, branch `codex/precos-diretos-ml`. Checkout compartilhado preservado, sem troca de branch/reset.
- Restauração: tag local `restauracao/precos-ml-base-main-20261114`, criada antes dos ajustes.
- Leitura da Vercel após os testes confirmou domínio oficial READY no deployment `dpl_4BN3iYSXo9WbyxCCkEZmrwxbLGCc`, mesmo SHA da base. Manifesto usa esse deployment e o hash da única migração nova. A base deve ser reconferida antes de uma publicação futura pela main.
- PADRÃO AVANTA consultado/validado: 1.23.1. Guias Next 16.2.6 de componente cliente e Route Handler consultados.

## Comportamento implementado

Atualizar preço usa somente GETs de identificação e ofertas do catálogo ML, pela conexão autorizada do perfil. Não usa busca geral `/sites/MLB/search`, OpenAI, Google Shopping, scraping ou fallback pago automático. Abrir produto/histórico reutiliza a referência salva. Expandir os resultados mostra os dados da consulta registrada, sem nova pesquisa externa.

Ver resultados da pesquisa inicia recolhido no celular e na Web, incluindo consulta Web por lote e cadastro/estoque expandido. Dentro: data, total informado, linhas consultadas, vendedores considerados, média, mediana, faixa, exclusões e links dos anúncios. Resultados antigos continuam identificados como pesquisa anterior. Atualizar preço permanece disponível e separado do editor de preços anunciados. Completar com IA da ficha técnica permanece uma ação separada; esta entrega não elimina IA dos demais módulos.

Antes de calcular: catálogo ativo e de variante final, conferência do EAN quando fornecido pelo catálogo, nome/modelo e atributos conhecidos (incluindo tensão/cor/capacidade). Identificação inconclusiva não vira preço. Ofertas devem conter item/vendedor válidos, preço total positivo em BRL e condição nova. Inatividade/indisponibilidade explícita é excluída; ausência de quantidade privada de terceiro não é interpretada como zero.

Paginação de 20 em 20 até 200 ofertas. Total alterado, página repetida/ausente/incompleta, sobreposição de IDs que impeça cobrir o total e total superior ao teto resultam em consulta parcial, sem substituir a referência. Considera o menor preço retornado por vendedor, exclui contas próprias do perfil e duplicatas. Para quatro ou mais vendedores aplica limites de Tukey (1,5 IQR); com IQR zero, faixa 50%–150% da mediana. Após filtros, requer ao menos três vendedores; dispersão superior a 3 vezes entre mínimo/máximo exige conferência. Usa a média aritmética de todos os vendedores restantes, arredondada em centavos. Esses filtros reduzem distorções, sem garantir cobertura total ou um preço universal de mercado.

Erro, insuficiência ou consulta parcial preserva referência anterior. A atualização explícita mantém o controle de permissão, revisão, limite, trava, repetição e isolamento do comando existente. Recibo é persistido com a tentativa do produto. Consultas iniciais com preço também guardam evidência no histórico; identificação inicial sem referência pode mostrar resultado transitório, sendo a pesquisa explícita do cadastro o caminho persistido. Nenhum envio de preço ou estoque aos anúncios ocorre ao pesquisar a referência.

## Banco e segurança

Migração nova `supabase/migrations/20261114190000_marketplace_ml_price_research.sql`, somente preparada e exercitada com SQL real em PGlite descartável. Adiciona recibos JSON e origem mercadolivre_catalog no histórico, amplia a capacidade do comando existente para 200 e cria wrapper service_role com prova mínima de catálogo, ofertas/fontes, vendedores únicos e exclusão das contas próprias. Mantém autorização, RLS, revisão e idempotência existentes. Não executa migrações históricas sem registro em produção.

Prévia `/marketplaces/validacao-precos-ml` e sua API usam dados fictícios em banco descartável, sem tokens/contas reais. Página/API retornam 404 em produção; API também recusa origem que não seja localhost. Não fazem chamadas ao Mercado Livre ou à IA. A migração exige aplicação autorizada antes do futuro deploy; não há autorização nova de publicação nesta solicitação.

## Evidência real e seus limites

Teste diagnóstico somente de leitura no perfil Saldão Aline: EAN 7909569454787, Electrolux EBL1500 127V Cinza, catálogo MLB56235019. JEFF, ALINE, CIDY e ADRIANO retornaram identificação e a primeira página de ofertas com HTTP 200. Cada catálogo informou 49 ofertas e entregou 20 na primeira página. A busca geral retornou 403; não foi utilizada como fallback. Contextos de conta mostraram preços diferentes; as quatro amostras não foram somadas como vendedores distintos. Nenhum preço foi gravado a partir desse diagnóstico.

A paginação completa 0/20/40 foi validada com respostas locais controladas, não com credenciais extraídas ou uma leitura real das 49 ofertas. Portanto não se afirma cobertura de todo EAN, conta ou categoria. A evidência real permanece em `/Users/JEFF/avantalab/output/diagnostico-precos-ml-2026-11-14/`; o diagnóstico existente não calcula nem grava a referência nova.

Fontes oficiais consultadas: https://developers.mercadolivre.com.br/buscador-de-produtos e https://developers.mercadolivre.com.br/pt_br/publicacao-de-produtos/itens-e-buscas . Preços são do contexto retornado para a conta consultada, sem frete personalizado; os campos privados de terceiros podem não ser oferecidos pela API.

## Validação local

- Suíte Marketplaces: 1.505 testes, 1.502 aprovados, três preexistentes ignorados, zero falhas. Inclui regressão de reservas, estoque, sincronização, preço anunciado e acesso. Não somar testes focados novamente.
- Dentro dessa suíte: seis testes do coletor/cálculo (49 ofertas, paginação, teto, variante, filtros, insuficiência, falha e cancelamento); quatro do SQL novo (média além de oito, persistência, revisão, idempotência, permissões, isolamento e referência/estoque preservados).
- Segurança: 714 aprovados, zero falhas. Dois testes adicionais confirmam bloqueio da prévia/API em produção e host externo antes de ler o corpo ou iniciar o banco fictício. Após reforçar a cobertura de IDs únicos na paginação, 41 testes focados foram repetidos e aprovados; incluídos no conjunto já descrito, exceto os dois novos de bloqueio.
- TypeScript, PADRÃO AVANTA, Ava e diff sem erros verificados.
- Navegador: 390 × 844 e largura Web, tema claro/escuro, Enter/Espaço, recolhimento inicial e após nova consulta, reabertura sem consulta externa e manutenção da referência para um vendedor, consulta parcial e acesso negado. Override de viewport removido.
- Prévia usa 49 linhas fictícias: 24 vendedores válidos, R$ 214,00; exclui uma conta própria, 23 duplicações de vendedor e um extremo. Valores não são o resultado real do diagnóstico.
- Capturas: `precos-ml/consulta-recolhida-celular.jpg`, `consulta-expandida-celular.jpg`, `consulta-recolhida-web.jpg`, `consulta-expandida-web.jpg`, nos artefatos desta conversa.

Esta evidência local não substitui o build integral e a conferência da main exigidos para uma publicação futura.

## Liberação autorizada — preparação da publicação

O responsável autorizou a publicação da entrega 3.2.0.420. Main consultada na rede permanece `9dd92bafc7916a6657e431f72a01386a61e77fcf`, correspondente à produção READY `dpl_4BN3iYSXo9WbyxCCkEZmrwxbLGCc`; fila livre. Versão e ajustes recentes preservados. Snapshot local validado: `1a8815df20fa7d3e960b0220d08884e22676bc56`.

Migração 20261114190000 aplicada e registrada atomicamente no projeto oficial qzewxhdkwettnlmkjoqd. Fingerprints dos 209 produtos (preço, estoque, revisão) e 304 saldos preservados; 212 consultas, 78 pesquisas e zero reservas mantidos. O conteúdo registrado coincide com a fonte. Função anterior preservada integralmente, exceto o teto autorizado de ofertas; execução do novo wrapper negada a anon/authenticated e permitida a service_role. RLS das tabelas preservada. Nenhum preço, anúncio ou estoque alterado pela migração.

Evidências antes/aplicação/depois, definição original e restauração em `/private/tmp/avanta-420-auditoria/`. O código anterior é compatível com as colunas aditivas enquanto o build é concluído. Não apagar recibos produzidos após a liberação. Integração Git não equivale à publicação; build integral remoto e conferência READY/domínio ainda obrigatórios.

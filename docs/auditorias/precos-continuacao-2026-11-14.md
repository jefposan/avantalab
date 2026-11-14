# 3.2.0.425 — continuar a pesquisa após descartar ofertas

Candidato local sobre a main 378ddab426e12ad191c6ba22890878d52afed6a7
(3.2.0.424). Publicação autorizada pela main, em preparação. Sem nova migração ou alteração de preços/estoques reais.
Restauração local: restauracao/precos-continuacao-base-20261114.
PADRÃO AVANTA 1.23.1. Checkout canônico e trabalhos paralelos preservados.

## Causas corrigidas

A pesquisa complementar fazia uma única rodada. Se a validação descartasse a
única candidata, encerrava usando o ML. O prompt ainda continha a orientação
herdada de não buscar para completar a quantidade. Além disso, somente ofertas
com preço preenchido no JSON chegavam ao leitor de origem: outros links citados
pela ferramenta eram ignorados.

## Comportamento

1. Coleta ML primeiro. Três vendedores válidos dispensam completamente IA.
2. Abaixo disso, pesquisa com IA e confere também os links citados, mesmo sem
   preço no JSON. Até 16 páginas candidatas por rodada; prioriza URLs com modelo.
   Cada página exige a mesma prova primária de preço, variante e disponibilidade.
3. Se a amostra ainda não atingir três ofertas consideradas, faz uma segunda
   rodada, informando a quantidade faltante, mudando termos e excluindo domínios
   anteriores. O servidor também rejeita repetições, mesmo se a IA desobedecer.
4. Preserva ofertas comprovadas entre rodadas. Falha posterior não descarta as
   anteriores. Máximo de duas requisições IA, oito lojas complementares e o
   prazo global já existente; sem retry automático de quota/autorização/erro.
5. Usa as ofertas válidas disponíveis se não atingir a meta. Estatística e
   bloqueio por dispersão permanecem; nunca converte simples link em preço.

Cache separado por versão do fluxo, rodada e domínios. Cada rodada passa pelo
controle/cache/limites e registro de consumo existentes por empresa. Limite de
requisições não é promessa de teto fixo em dólares. Sem DataForSEO, scraping de
grade autenticada, cookies ou bypass de bloqueios. Google Shopping permanece
uma prioridade do prompt, sem garantia de acesso completo pela pesquisa web.

Os resultados recolhidos agora explicam quantidade de rodadas, fontes candidatas
verificadas, ofertas aceitas, descartes e motivo de encerramento. Não há mudança
na geometria da interface. Abrir produto/histórico continua sem consulta paga.

## Validação

- Regressões de Marketplaces: 1.547 aprovadas, zero falhas, três ignoradas,
  antes do refinamento de aproveitamento das fontes citadas.
- Regressão final direcionada: 93 aprovadas, zero falhas, incluindo 33 cenários
  de complemento/provedor/SQL, leitura de origem, cache, permissões e APIs.
- Provedor simulado reproduz: primeira loja indisponível, segunda rodada com
  duas alternativas válidas, domínio excluído, preservação da primeira rodada,
  JSON vazio com links úteis, erro/cancelamento/limites e consumo separado.
- Nenhuma nova consulta paga real ou escrita comercial durante os testes.
  Os testes não demonstram dezenas de ofertas disponíveis para esse EAN.
- Sem alteração de SQL; contrato combinado da 3.2.0.424 preservado.

Segurança: 714 aprovados, zero falhas. PADRÃO AVANTA, Ava e diff sem erros.
A main e a produção foram reconferidas: 3.2.0.424 e fila livre, preservando a base.
TypeScript local: aprovado, sem erros.

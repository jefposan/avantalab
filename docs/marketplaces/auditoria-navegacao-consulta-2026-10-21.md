# Auditoria de navegação — AvantaPreços

Data: 21/10/2026. Base: 3.2.0.39. PADRAO-AVANTA 1.20.0.
Escopo: análise e simulação dos controladores reais, sem alterar fluxo, banco,
saldo ou consultas externas. Não foi reproduzida uma sessão autenticada no
aparelho do relato; portanto não se atribui uma causa única ao episódio.

## Resultado

Existem três áreas condicionais na mesma URL, não duas rotas de pesquisa:
início, catálogo e detalhes. A busca por descrição abre o catálogo; EAN e internet
usam o controlador de consulta e podem abrir detalhes ou escolhas no início.
Isso diverge da orientação de uma única área principal para pesquisar.

Fonte: `app/marketplaces/consulta/MarketplaceMobileApp.tsx`, linhas 646–730.
O catálogo possui “Nova consulta” para voltar (687). O início não tem Voltar,
pois é a raiz. Não foi encontrado um segundo formulário EAN/descrição que,
por definição, seja uma tela intermediária sem retorno. Não há evidência
suficiente para afirmar que esse foi exatamente o estado visto no aparelho.

## Problemas confirmados

### 1. Pesquisa em andamento pode perder seu Cancelar

“Ver produtos e estoque” permanece acionável durante a pesquisa (726).
`openPricedProducts` (556–560) abre o catálogo e limpa o resultado sem abortar a
consulta ou mudar sua geração. O catálogo não renderiza `PriceSearchProgress`.
Logo, a pesquisa continua, mas seu Cancelar desaparece. Uma resposta posterior
é aceita e pode fazer a interface saltar do catálogo aos detalhes sem novo clique.

Reprodução controlada: iniciar pesquisa com resposta retida, abrir catálogo,
verificar sinal não abortado, liberar resposta e observar resultado aceito.
Confirmado executando os controladores extraídos do arquivo real.

### 2. Voltar do catálogo invalida resultado, mas não encerra a pesquisa

“Nova consulta” incrementa a geração e libera `loading`, mas não aborta o
controlador nem limpa `searchCancelable` (687). O resultado tardio não será
aplicado, porém o trabalho e o estado de cancelamento podem ficar desencontrados.

### 3. Esperas sem limite/cancelamento em operações auxiliares

- Catálogo (402–413): aborta ao sair/trocar filtros, mas não tem prazo máximo.
  Uma resposta que não termina deixa a lista carregando; o retorno existe.
- Abrir últimas consultas (383–396): requisição sem sinal de cancelamento ou
  prazo máximo. Detalhes são exibidos imediatamente, mas ficam carregando;
  Voltar continua disponível enquanto não houver outra gravação.
- Salvar referência (527–540): mantém `savingPrice` durante a gravação **e** a
  atualização do histórico, ambas sem prazo máximo. Voltar e Nova pesquisa ficam
  desabilitados enquanto `savingPrice` está ativo. Mesmo com a gravação concluída,
  uma atualização de histórico pendurada pode manter esses controles bloqueados.

O último caso é um caminho comprovado para bloqueio dos controles de navegação,
mas não prova que tenha sido a origem do episódio descrito.

### 4. Prazo da pesquisa não cobre uma requisição individual parada

O limite de três minutos do controlador é verificado entre as requisições.
Não limita sozinho um `await request` que nunca termina. O Cancelar da versão39
libera o aplicativo e impede respostas antigas de substituir o resultado,
desde que permaneça visível. Atualizar preço cadastrado já possui limite de65s.

## O que foi validado

Quatro testes diagnósticos locais passaram usando os controladores reais:

1. Troca para catálogo durante pesquisa, Cancelar ausente nessa área e aceitação
   da resposta tardia.
2. Histórico sem sinal de cancelamento e com carregamento retido.
3. Descrição abre catálogo; retorno não aborta a consulta ativa.
4. Gravação concluída, histórico ainda pendente e `savingPrice` ainda bloqueando
   a navegação até essa etapa terminar.

Script diagnóstico temporário: `/private/tmp/avanta-navigation-audit.mjs`.
Esses testes comprovam comportamentos atuais indesejados; não são regressões
para preservar esses comportamentos no produto.

O pacote publicado separadamente já passou por680 testes, TypeScript e
verificadores PADRÃO AVANTA/Ava. Esta auditoria não introduziu código funcional,
não alterou permissões e não consumiu pesquisa externa.

## Correção recomendada para aprovação

- Manter início com EAN, descrição, internet e resultados na própria área de
  pesquisa. Abrir detalhes apenas ao selecionar um produto encontrado, conforme
  a orientação do responsável. Revisar separadamente o acesso explícito a todos
  os produtos, para não remover uma funcionalidade por inferência.
- Centralizar a saída/cancelamento: toda troca de área deve abortar ou concluir
  explicitamente o trabalho anterior e invalidar respostas atrasadas.
- Exibir Cancelar em qualquer área onde ainda exista pesquisa ativa, inclusive
  ao restaurar estados. Nunca vincular sua presença somente ao formulário.
- Adicionar limites às consultas auxiliares e finalizar o estado de gravação
  sem aguardar uma atualização secundária de histórico.
- Para gravações com resposta incerta, conferir o estado salvo antes de repetir;
  cancelar a interface não deve prometer desfazer uma gravação já recebida.
- Cobrir rede lenta, falha, resposta antiga, troca de filtro, fechar câmera,
  alternar aplicativo e repetição de pesquisa nos testes da correção.

Não aplicado nesta auditoria: a solicitação foi publicar o pacote aprovado e,
em seguida, diagnosticar o fluxo. Correções de navegação ficam separadas da39.

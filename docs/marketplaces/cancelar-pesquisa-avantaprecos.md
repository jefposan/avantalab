# Cancelar pesquisa — AvantaPreços3.2.0.38 (local)

Durante pesquisa na internet ou atualização de preço, a tela inicial/resultado
mostra indicador padrão e Cancelar. Permanece disponível quando o produto já foi
identificado e as ofertas continuam pendentes, mesmo havendo referência anterior.

Cancelar aborta requisições do aparelho e o intervalo entre continuações. A geração
é invalidada antes do abort; respostas/finalizações antigas não mudam o resultado
nem liberam uma pesquisa nova indevidamente. Controles são liberados sincronamente,
sem esperar a rede; foco volta ao acionador e Pesquisa cancelada é anunciada.

Voltar, Nova pesquisa, mudança de perfil e desmontagem também interrompem a busca
anterior. O abort é conferido depois de obter a sessão para não iniciar um fetch
que já foi cancelado durante a autenticação.

Limites: interromper o cliente não revoga garantidamente uma tarefa externa já
aceita, nem desfaz cadastro, histórico, preço ou leitura de lote já confirmados.
Não representa estorno, exclusão ou cancelamento de venda. Não inicia novos polls
após cancelar. Produto/valores já visíveis são preservados; pode consultar de novo.

Validação:675testes Marketplaces aprovados, incluindo resposta tardia, cancelamento
durante polling, nova consulta concorrente, atualização de referência e cancelamento
durante obtenção de sessão. Preview sem pesquisa externa em
/marketplaces/consulta/validacao-pesquisa, bloqueada em produção. Navegador390px:
controle aparece, cancela e permite editar/consultar novamente imediatamente.

PADRÃO AVANTA1.20.0/Ava3.2.0.38 aprovados; novos componentes/helpers sem erros de lint.
Sem migração ou publicação nesta revisão. Logs:/private/tmp/avanta-cancel38-*.

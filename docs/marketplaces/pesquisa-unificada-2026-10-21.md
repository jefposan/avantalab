# Pesquisa unificada do AvantaPreços — 3.2.0.40

Correção autorizada após a auditoria de21/10, PADRAO-AVANTA1.20.0.

## Fluxo

- Início mantém EAN, descrição, internet, leitores e últimas dez consultas.
- Resultados da busca aparecem nessa mesma área; selecionar abre detalhes.
- “Ver produtos e estoque” expande o catálogo no início, com ordenação,
  paginação, erros e repetição; não abre outra tela de pesquisa. O campo de
  descrição permanece disponível para pesquisar novamente.
- Detalhes mantêm Voltar e Nova pesquisa; esta abre o leitor pelo gesto original.
- Cancelar aparece também na busca local/abertura de produto. Trocar de pesquisa
  cancela a anterior e impede aplicar respostas tardias. Limpar resultados encerra
  a busca local sem apagar o termo digitado.

## Recuperação e segurança

Wrapper limitado cobre sessão/fetch/leitura do corpo; leitura25s e escrita65s.
Abertura de cadastro/histórico também25s. Continuação externa preserva a mesma
tarefa, agora com prazo total de3min e cancelamento imediato no aparelho.
Tempo excedido não confirma falha de gravação no servidor: conferir os dados
antes de repetir. Não se promete desfazer gravação já recebida.

Salvar referência bloqueia duplo clique e libera controles após a gravação,
sem esperar o histórico secundário. Atualizações antigas de histórico são
descartadas por geração, inclusive ao trocar perfil.

Sem migração, cadastro novo automático adicional, alterações de saldo, anúncio,
permissões, financeiro ou recursos nativos. Web/Gestão Mobile/AvantaVendas
preservados fora do PWA AvantaPreços. Pacote isolado sobre39 inclui Cancelar/×.

Testes: controladores reais com rede retida, cancelamento, resposta antiga,
abertura de histórico/catálogo, duplo clique, salvamento independente do histórico,
timeout de operação que ignora abort e renderização do componente real com dados
fictícios. Não consome consultas externas nem usa credenciais de usuários.

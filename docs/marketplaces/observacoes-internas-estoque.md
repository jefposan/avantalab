# Estoque e observações internas — revisão local3.2.0.36

## Entrega3.2.0.37 autorizada em21/10/2026

Migração20261021030000 aplicada e registrada no banco real, com99produtos e
124saldos preservados. Hashes dos dados e definições originais conferidos na
transação; notas vazias, RLS ativo e acesso direto anônimo/autenticado negado.
Publicação Web autorizada, em preparação. Notas de migração não aplicada abaixo
são históricas das revisões locais; não reaplicar. Auditoria da entrega em
publicacao-observacoes-estoque-2026-10-21.md.

Refinamento local3.2.0.37: a versão compacta prevalece sobre a descrição visual
inicial. Estoque/operação ficam lado a lado também no celular; quantidade divide
a linha com o saldo atual. Cabeçalho tonal do perfil, nota em duas linhas, ajuda
curta e ações separadas. Largura aproveitada sem diminuir alvos. Persistência,
privacidade, post e migração não mudam; sem aplicação/publicação.

Pedido transferido do chat de manutenção em21/10/2026. Não publicado e nenhuma
migração aplicada ao banco real. Ajustes3.2.0.35 de contas/status preservados.

## Uso

Adicionar saldo/Ajustar estoque/Transferir usam setores distintos: estoque e
operação; quantidade com −, campo e +; observações; Cancelar/Concluir. Seletores
empilham em colunas estreitas, com quantidade e ações sempre separadas.

Observação opcional de até160caracteres pertence ao produto do perfil, não a um
usuário ou depósito. Aparece no produto consultado e no detalhamento Web. Gravar
exige a permissão vigente de estoque. Usuário de consulta pode ler sem editar.
Não substituir descrição do produto, atributos, avaria do anúncio ou observação
de uma venda por este campo.

Criar post aguarda carregar a observação correspondente ao produto/perfil e
preenche Detalhes. Usuário revisa, altera ou remove antes de gerar a imagem.
Mudar Detalhes não salva de volta no cadastro. Mantida no post, a observação
aparece publicamente na imagem compartilhada; a ajuda informa essa consequência.

## Persistência e privacidade

Migração preparada:20261021030000_marketplace_product_internal_notes.sql.
Tabela separada, RLS e revogação de acesso direto anônimo/autenticado. APIs
autenticadas consultam por empresa e IDs explícitos. As allowlists de publicação
e os serviços de anúncio não leem notas. Histórico/descrição pública preservados.

Novo wrapper transacional chama o RPC de estoque existente, sem substituí-lo nem
copiar suas guardas. Ator, permissão, empresa e recibo são revalidados inclusive
no replay. Nota tem revisão própria entre depósitos; uma revisão antiga ou erro
de gravação reverte saldo, nota, fila e recibo. Repetição bem-sucedida não restaura
nota antiga. Resposta incerta no cliente mantém chave e conteúdo da tentativa.

Tabela ausente mantém a movimentação anterior, com notas desativadas e ajuda.
Outras falhas não se tornam observação vazia. Antes de aplicar em produção,
conferir a migração aditiva contra as funções efetivamente instaladas; não
substituir o RPC original ou suas guardas extras.

## Validação local

-670testes Marketplaces aprovados; PostgreSQL/PGlite confirma atomicidade,
  isolamento, replay, remoção da nota, revisões, permissão revogada e preservação
  do RPC original/descrição/fila. Testes adicionais conferem seleção do wrapper,
  texto máximo, leitura privada e ausência em payloads online.
- TypeScript com configuração sem artefatos nativos aprovado. PADRÃO AVANTA
  v1.20.0 e Ava3.2.0.36 aprovados. Lint dos componentes/serviços novos sem erros;
  ProductPost mantém avisos existentes de imagem nativa.
- Prévia fictícia local:/marketplaces/consulta/validacao-estoque. Salvar/reabrir,
  preenchimento editável, fechamento e geração da imagem conferidos no navegador.
  Edição no post não altera nota do produto. Sem compartilhar externamente.
- Layout390/320px e desktop1280px, tema claro/escuro conferidos. Prévia não prova
  persistência no banco real nem substitui teste físico do responsável.

Logs locais:/private/tmp/avanta-notes36-*. Imagens emoutput/marketplaces/.

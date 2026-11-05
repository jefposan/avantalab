# Ler etiqueta — AvantaPreços (local 3.2.0.31)

## Entrega autorizada — 3.2.0.34

Publicação solicitada em21/10/2026, incluindo leitura QR, resultado com foto,
descrição, EAN/código e pesquisa prioritária nas vendas de todas as contas do
perfil. Pacote isolado sobre a entrega3.2.0.30, sem migração ou configuração de
credenciais locais. Notas de não publicação abaixo descrevem as revisões locais
anteriores. A prévia fictícia permanece bloqueada em produção.

Revisão local3.2.0.34 (prevalece sobre a exigência inicial de conexão): a pesquisa
primeiro procura o ID do envio nas vendas registradas no Marketplaces do perfil,
entre todas as contas e períodos. Venda local dispensa OAuth ativo e seleção de
conta; consulta foto/EAN da mesma conta registrada, sem adivinhar por nome. Só se
não encontrar venda local consulta as contas ML conectadas. Falha de banco gera
erro, não ausência. Outro perfil ou outra plataforma nunca entra na pesquisa.
Sem migração/publicação e sem movimentação de venda, cadastro ou estoque.

Revisão local3.2.0.33: Ler etiqueta à esquerda e Ler EAN à direita; ordem de
teclado igual à visual. Não altera captura, consulta ou resultado; não publicado.

Revisão local3.2.0.32: o resultado também apresenta Código da etiqueta (ID do envio
lido no QR) e EAN do produto. EAN é validado na ficha/variação da mesma conta;
quando ausente, aparece Não informado. Não presume que SKU seja EAN, nem usa o
GTIN de outra variação. Mantém somente Fechar e não realiza conferência por bipagem.
Essa revisão prevalece sobre a descrição inicial de somente foto/descrição abaixo.

Na página inicial, Ler etiqueta fica ao lado de Ler EAN. Ao abrir, autorizar a
câmera do aparelho e apontar para o QR da etiqueta Mercado Livre. A leitura é
automática: resultado mostra somente foto e descrição dos produtos do pacote.
O único botão do resultado é Fechar; Escape e clique externo também fecham.

Não pede EAN do produto, não mostra preços, destinatário ou dados pessoais e não
altera cadastro, histórico de preços, venda, estoque ou situação do despacho.
Não encaminha comandos para ML nem movimenta lotes. Não substitui emissão fiscal.

O QR é interpretado no aparelho e somente seu ID de envio chega ao servidor.
Nenhuma URL do QR é aberta. A API confere acesso do perfil e remetente na conta
conectada, depois consulta `/shipments/{id}/items`. Usa a imagem do anúncio/variação
da mesma conta; falta de foto não inicia pesquisa por nome nem inventa associação.
Pacotes com vários produtos mostram cada produto/variação, sem duplicar a linha.

Erros de câmera, autorização ou consulta aparecem no mesmo modal, com Fechar.
Fechar/reabrir permite nova leitura; câmera/consulta anterior são interrompidas e
respostas atrasadas não reabrem o resultado. Conferência funciona com permissão
de consulta; não exige Editar estoque.

Prévia local: `/marketplaces/consulta/validacao-etiqueta`. Resultado fictício e
foto pública de exemplo, não é a venda da etiqueta enviada. Rota retorna404 em
produção. Botão Simular QR lido serve só para avaliar layout e fechamento.

Sem publicação ou migração. Configuração local atual não contém a chave do cofre
OAuth. A exportação ampla de variáveis de produção foi bloqueada pela revisão de
segurança; não contornar. Para teste autenticado real, solicitar autorização para
uma configuração local mínima e segura, sem publicar nem expor segredos.

## Validação local

- 660 testes de Marketplaces aprovados, incluindo QR, isolamento, ausência de
  preços/dados de destinatário, vários itens, variações e rota de consulta.
- TypeScript, PADRÃO AVANTA1.20.0 e verificação Ava aprovados.
- Prévia no navegador a390px: botão, foto, descrição, único Fechar, tema escuro,
  Escape e restauração de foco conferidos. Resultado simulado; não comprova
  captura física em iPhone/Android nem consulta autenticada à etiqueta real.
- Lint dos arquivos novos sem erros; aviso de imagem nativa. MarketplaceMobileApp
  mantém dois erros preexistentes de set-state-in-effect, confirmados também na
  fonte da entrega3.2.0.30, fora das linhas alteradas. Não foram corrigidos aqui.

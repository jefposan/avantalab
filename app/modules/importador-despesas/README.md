# Importador de despesas

Rota web de prévia: `/importador-despesas`.

No fluxo principal da Gestão Web, a mesma revisão é aberta pelo botão
**Arquivo** ao criar um lançamento. Imagens continuam no fluxo de nota única;
PDF, CSV, TXT, XLS e XLSX abrem a análise com progresso percentual e conferência
em popup antes de qualquer gravação.

## Prévia web

- Lê CSV, TXT, XLS, XLSX e PDF.
- Em PDF, envia o documento completo por uma rota autenticada à Responses API.
  A primeira análise usa `gpt-5.6-terra` com raciocínio médio. Somente quando a
  resposta fica incompleta, não identifica despesas ou diverge do total do
  documento, a rota repete a leitura uma vez com `gpt-5.6-sol` e raciocínio
  alto.
- A análise percorre páginas e colunas independentes, distingue extratos de
  faturas e exclui limites, simulações, compras futuras e campos de resumo.
- Em faturas, apresenta despesas e estornos/créditos em áreas separadas. Um
  estorno só é preparado como receita quando o usuário o selecionar.
- A resposta só é liberada quando despesas menos estornos conferem com o total
  identificado no documento, com tolerância máxima de dois centavos.
- Permite informar manualmente o tipo do documento antes do upload, substituindo
  a detecção automática quando necessário.
- Permite revisar descrição, tipo, seleção e valor a lançar de cada despesa.
- O valor original reconhecido é preservado para a conferência, permitindo
  lançar somente uma parte de uma compra compartilhada sem invalidar o total do
  documento.
- Quando aberta pelo novo lançamento, bloqueia a confirmação caso a soma não
  confira, oferece cancelar/refazer no topo e move foco e rolagem até o primeiro
  tipo de despesa pendente.
- Carrega os perfis financeiros acessíveis e os tipos de despesa cadastrados no
  perfil escolhido. Na confirmação, cria os lançamentos reais com data, tipo,
  descrição e valor.
- A confirmação usa um único lote transacional e uma chave por item para que uma
  repetição ou nova tentativa não duplique despesas já inseridas.
- Na Gestão Web, salva e retoma a revisão pelo botão **Continuar importação
  salva**. O rascunho preserva seleção, tipo, descrição, valor ajustado e total
  neste navegador; o documento original não é armazenado.

## Para integrar em produção

A persistência local mantém somente o rascunho. Nesta etapa, o arquivo original
não é armazenado no AvantaLab: PDFs de extrato e fatura são descartados da
memória do navegador e do servidor após a análise; são persistidos apenas os
lançamentos confirmados e seus identificadores técnicos de importação. Uma
entrega futura pode avaliar arquivo privado, política de retenção, tamanho,
auditoria e visualização sem alterar este contrato. Como o PDF é enviado com
suas páginas visuais, arquivos digitalizados também podem ser analisados; a
mesma conferência matemática continua obrigatória. Para a análise de PDF,
configure `OPENAI_API_KEY` (ou `OPENAI_API_KEY_AVA`) no
ambiente do servidor. `OPENAI_IMPORT_PRIMARY_MODEL` e
`OPENAI_IMPORT_PRIMARY_REASONING` configuram a análise econômica;
`OPENAI_IMPORT_FALLBACK_MODEL` e `OPENAI_IMPORT_FALLBACK_REASONING` configuram
a contingência. A rota exige sessão
autenticada, não armazena a resposta na OpenAI e nunca confirma lançamentos sem
revisão do usuário.

Os estornos/créditos continuam separados e não são inseridos como receita nesta
versão. Essa integração deve ser entregue com seu próprio fluxo de confirmação.

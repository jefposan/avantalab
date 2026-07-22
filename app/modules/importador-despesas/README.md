# Importador de despesas

Rota web de prévia: `/importador-despesas`.

## Prévia web

- Lê CSV, TXT, XLS, XLSX e PDF.
- Em PDF, envia o documento completo por uma rota autenticada à Responses API,
  usando `gpt-5.6-sol` com análise visual e raciocínio alto por padrão.
- A análise percorre páginas e colunas independentes, distingue extratos de
  faturas e exclui limites, simulações, compras futuras e campos de resumo.
- Em faturas, apresenta despesas e estornos/créditos em áreas separadas. Um
  estorno só é preparado como receita quando o usuário o selecionar.
- A resposta só é liberada quando despesas menos estornos conferem com o total
  identificado no documento, com tolerância máxima de dois centavos.
- Permite informar manualmente o tipo do documento antes do upload, substituindo
  a detecção automática quando necessário.
- Permite revisar descrição, tipo e seleção de cada despesa.
- Carrega os perfis financeiros acessíveis e os tipos de despesa cadastrados no
  perfil escolhido. Na confirmação, cria os lançamentos reais com data, tipo,
  descrição e valor.
- A confirmação usa um único lote transacional e uma chave por item para que uma
  repetição ou nova tentativa não duplique despesas já inseridas.
- Persiste rascunhos neste dispositivo com a chave versionada
  `avanta:importador-despesas:v1`.

## Para integrar em produção

A persistência local mantém somente o rascunho. Nesta etapa, o arquivo original
não é armazenado no AvantaLab: após a análise, são persistidos apenas os
lançamentos confirmados e seus identificadores técnicos de importação. Uma
entrega futura pode avaliar arquivo privado, política de retenção, tamanho,
auditoria e visualização sem alterar este contrato. Como o PDF é enviado com
suas páginas visuais, arquivos digitalizados também podem ser analisados; a
mesma conferência matemática continua obrigatória. Para a análise de PDF,
configure `OPENAI_API_KEY` (ou `OPENAI_API_KEY_AVA`) no
ambiente do servidor. `OPENAI_IMPORT_MODEL` e `OPENAI_IMPORT_REASONING` permitem
alterar somente o modelo e o esforço deste processador. A rota exige sessão
autenticada, não armazena a resposta na OpenAI e nunca confirma lançamentos sem
revisão do usuário.

Os estornos/créditos continuam separados e não são inseridos como receita nesta
versão. Essa integração deve ser entregue com seu próprio fluxo de confirmação.

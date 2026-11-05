# Qualidade dos anúncios — cobertura de correções

Revisão: 24/10/2026 — entrega 3.2.0.140.
Implementação validada com respostas simuladas; sem alterações em produtos reais nos testes.

## Objetivo

Centralizar no AvantaLab a leitura dos objetivos reais e o máximo de correções
permitidas pela API, sem depender da página do anúncio. Não prometer cobertura
universal: autenticação renovada, restrições de catálogo, atributos fixos,
políticas e recursos sem API podem exigir intervenção na plataforma.

## Cobertura atual e ampliação

| Objetivo | Situação / caminho |
| --- | --- |
| Título / nome de família, descrição, preço e tipo | Editor existente, autorização e política remota. Atalhos da qualidade implementados localmente em .139. |
| Fotos | Editor implementado: imagens atuais/limite da categoria, upload JPG/PNG até 2,5 MB, ordem/capa e remoção. Preserva imagens associadas a variações; confirma ordem e IDs por releitura de todos os anúncios afetados. Preparar upload não altera o anúncio. |
| Características / ficha técnica | Editor implementado com esquema, opções, unidades e tags da categoria. Preserva atributos intocados no PUT, protege identidade/EAN/marca/modelo e atributos de variação/fixos/multivalorados. Confirma valores e preservação por releitura. |
| Garantia e condições comerciais | Mapear objetivo real ao recurso permitido, com validação de unidade, taxas/custos e confirmação explícita. Não alterar frete/preço automaticamente. |
| Estoque | Usar exclusivamente fluxo físico/local existente, com conferência real e sincronização idempotente. Nunca inventar quantidade para elevar nota. |
| Clips, recursos especiais, catálogo e políticas | Verificar endpoint/permissões/elegibilidade para a conta e objetivo retornado. Sem evidência de suporte, mostrar restrição e orientação; não inventar uma operação ou marcar objetivo como resolvido. |

## Guardas obrigatórias

- Nota, nível, datas, objetivos e progresso vêm do ML; não recalcular nota nem
  assumir que 70 corresponde a um limite universal de cor.
- Antes da escrita: revalidar empresa, conta, anúncio, titular e versão remota.
- Identificar modelo legado, UP, catálogo e variações. Fotos/atributos/nome
  compartilhados podem propagar a outros itens do mesmo User Product.
- Mostrar os anúncios afetados antes de confirmar; bloquear escrita quando não
  for possível determinar o alcance. Não copiar dados entre contas sem seleção.
- Preservar valores atuais, imagens, atributos não editados e rascunhos.
- Reutilizar executor auditado, idempotência e confirmação por releitura. Timeout
  não é sucesso nem motivo para repetição automática.
- Objetivo só aparece cumprido quando o ML retornar essa situação; informar
  atraso de recálculo. Atualização manual, sem polling de toda a base.
- Prévia funcional em `/marketplaces/validacao-qualidade` usa somente dados fictícios,
  incluindo recusa e nova tentativa. Não envia alterações nem funciona em produção.
- Catálogo, kits, situação não elegível, alcance UP incompleto ou características
  intocadas divergentes entre anúncios bloqueiam escrita. Reserva auditada de todos
  os anúncios afetados evita edição concorrente; resultado incerto não é repetido.

## Fontes oficiais consultadas

- Qualidade e objetivos: https://developers.mercadolivre.com.br/pt_br/qualidade-das-publicacoes
- Imagens: https://developers.mercadolivre.com.br/pt_br/trabalhar-com-imagens
- Esquema e atualização de atributos: https://developers.mercadolivre.com.br/pt_br/atributos
- Modelo/propagação UP: https://developers.mercadolivre.com.br/pt_br/preco-variacao

Validados: isolamento de conta/empresa, legado/UP, concorrência, preservação,
confirmação remota simulada, falhas e nova tentativa da interface. A primeira
correção real deve continuar explícita pelo usuário; nenhuma escrita de negócio
foi feita como parte da publicação do sistema. Recursos sem API permanecem orientados.

# 3.2.0.329 — Herança fiscal por produto

Entrega local, sem publicação. PADRÃO AVANTA 1.23.1.

## Comportamento

- Novos produtos usam os padrões fiscais do perfil empresarial. A escolha é guardada em `usar_fiscal_empresa`; não copia os códigos da empresa para os produtos.
- Exceções manuais por campo têm prioridade em modo personalizado; campos vazios usam a empresa/regra da operação. Ao retornar ao modo empresa, exceções guardadas deixam de ser aplicadas sem serem apagadas.
- Registros legados/importados sem escolha explícita conservam seus códigos próprios quando existentes. Origem nacional padrão isolada não caracteriza personalização.
- NCM, CEST e unidade são próprios do produto. Unidade tributável vazia usa a unidade comercial.
- CFOP segue a matriz publicada/revisada da operação e UF. Exceções interno/interestadual somente se aplicam ao destino correspondente; CFOP incompatível bloqueia a preparação.
- O servidor obtém os padrões atuais pela empresa autenticada. Retratos comerciais guardam a escolha/exceções do catálogo confiável, ignorando fiscal enviado pelo navegador. Preparações já concluídas continuam sujeitas às proteções de idempotência/imutabilidade existentes.
- O catálogo da Gestão mostra códigos efetivos e encaminha edição ao cadastro oficial de Custos. Não existe gravação fiscal simulada no catálogo integrado.

## Verificação

- Segurança na raiz compartilhada: 531 aprovados; pacote isolado: 530 aprovados. Diferença preexistente de um teste na raiz, não excluído do pacote durante esta entrega.
- 22 testes fiscais focados aprovados; 39 testes de herança/integração de Custos aprovados.
- Migração executada em PostgreSQL PGlite descartável: preserva registros, campos e RLS; opção e CFOP persistem após leitura; CFOP interestadual inválido é rejeitado.
- `next typegen` e `tsc --noEmit --incremental false` aprovados no pacote isolado. A raiz mantém erro preexistente de tipos gerados em `.next/dev/types/app/page.ts` por `AvantaLandingPage`, não alterado nesta tarefa.
- ESLint do escopo sem erros (84 avisos existentes nos arquivos abrangidos).
- PADRÃO AVANTA e manuais Ava aprovados para 3.2.0.329.
- Prévia gerada do JSX/CSS reais conferida em desktop, tema escuro e viewport 390 × 844 sem transbordamento horizontal. Alternância do seletor exercitada pelo handler real. Prévia usa dados fictícios, não comprova gravação remota.

## Estado da entrega

- Migração `20261105180000_produto_heranca_fiscal_empresa.sql` preparada, ainda não aplicada ao banco publicado. Leituras continuam compatíveis antes da migração; gravação com a nova escolha exige a migração e não a descarta silenciosamente.
- Nenhum dado empresarial, certificado, regra fiscal publicada, nota, estoque ou receita alterado nos testes.
- Nenhuma assinatura/transmissão fiscal, publicação Vercel ou alteração Git da raiz.
- O suporte efetivo dos códigos tributários na emissão continua limitado pelas validações do gerador de XML; personalizar não libera regimes/códigos ainda não suportados.

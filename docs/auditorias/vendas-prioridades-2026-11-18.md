# Vendas e Serviços — cinco prioridades da auditoria

Entrega 3.2.0.484.01. Base ae80e5663dee0377dcd964e3296707140d5983f1 / produção dpl_BE3UrWpA5EPkwvQVbwqNJS3S6mjC.

- Custos: projeção da resposta no servidor para operações, OS, estoque e ciclo comercial; snapshots persistidos preservados. Custos e margens derivados não aparecem nos relatórios/CSV sem concessão.
- Descontos: política por empresa protegida por settings.edit, versionada, padrão 15%. Serviço valida item, total e redução do preço de referência; aprovação exige sales.approve_discount. Interface integrada grava a política no servidor, sem confiar em preferência local. Nenhuma regra tributária é modificada.
- Fiscal: listas indicam e desabilitam códigos que o gerador já recusava (CSOSN diferente de 102, ICMS normal e PIS/COFINS tributados). Dados já gravados continuam visíveis e não são substituídos. Nenhuma ampliação tributária nesta entrega.
- Histórico: ponte percorre todas as páginas, sem cortes de 100/200 após a recepção. Centro fiscal mescla as páginas dos rascunhos completos e incompletos em ordem estável. Os relatórios existentes recebem a carga integral; não houve reformulação dos relatórios ou implantação de novos indicadores/agregadores. Erro ou repetição de página interrompe a carga, sem tratá-la como completa.
- CNPJ: reutiliza validação oficial existente da Central de Consultas; máscara, API, cadastros, consultas e restrições de persistência aceitam letras. CPF e formatos numéricos mantidos. Destinatário XML preserva letras. Emitente com letras permanece bloqueado explicitamente: homologar chave, assinatura, eventos e DANFE é etapa fiscal separada, não anunciada como suportada.

Migração 20261118160000: tabela privada de política comercial (RLS, sem concessões aos papéis de navegador), ampliação do formato CNPJ em clientes, fornecedores e cadastro do perfil. Sem UPDATE/DELETE de dados existentes, notas, tributos, séries, números ou certificados.

Validação: 688 testes de módulos/consultas/perfis aprovados; nove regressões específicas (incluindo HTTP sem sessão/sem permissão, versão concorrente e migração real em PGlite) aprovadas; TypeScript, PADRÃO AVANTA e Ava aprovados. Orquestrador fiscal e resiliência sintéticos aprovados, zero transmissões de notas reais. Build completo obrigatório na Vercel, sem salto de testes.

Preservações: DANFE, backup e histórico, edição de cliente/produto, herança tributária, exceções por nota, série/número e ambientes. Venda rápida, build por módulo e demais itens da auditoria continuam fora do escopo.

Fechamento da implementação: migração aplicada em transação única e registrada no histórico em 18/11/2026. Leitura posterior confirmou RLS ativa e ausência de SELECT para authenticated na política. Respostas paginadas de perfil anterior são descartadas e operações integradas não voltam a cortar o histórico durante atualizações. Os 19 testes finais de regressão dirigida passaram; nenhum documento fiscal real foi transmitido pelos testes.

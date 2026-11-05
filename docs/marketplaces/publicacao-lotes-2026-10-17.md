# Publicação de lotes — 17/10/2026

Status: **publicado e conferido no domínio oficial**. Migração instalada; deployment final promovido e READY.

- Versão: 3.1.0.26, PADRÃO AVANTA v1.19.2.
- Base preservada: produção 3.1.0.18-av186, deployment dpl_FLK71QrZiyRufDkPABPkhLQMtYPw.
- Pacote isolado: `/private/tmp/avanta-lotes-publicacao.gJNbsb`. Somente os arquivos de lotes, seus pontos de entrada web/PWA, testes e documentação. Não inclui filtros de vendas nem outras alterações locais de trabalhos diferentes.
- Migração: `20261016190000_marketplace_price_lots.sql`, registrada em `supabase_migrations.schema_migrations`, no projeto Supabase já vinculado ao AvantaLab.
- RLS ativo; anon sem SELECT, authenticated sem INSERT nem EXECUTE direto, service_role com EXECUTE. API REST reconhece ambas as tabelas vazias. Nenhum lote de teste produtivo criado, nem alteração de anúncios/estoque/histórico.
- Pacote isolado: 1.280 testes, TypeScript, PADRÃO AVANTA e Ava aprovados. Arquivos do login mobile e AvantaVendas idênticos à base por SHA-256.
- Candidato final: dpl_djiL4tFToPagz3YQzfZqhrJNNSvM, inclui orientação da Ava atualizada após a instalação da migração. Primeiro candidato não promovido: dpl_4j9ySmAqQER2RPq69PPi8DPCqs4S.
- Recuperação: promover a base anterior se necessário, mantendo as novas tabelas/dados de lotes. Não remover lotes como parte de rollback da interface.
- Conferência final e pública: avantalab.com.br retorna 3.1.0.26; bundles web/PWA contêm Criar Lote e Editar Lotes; service worker usa cache 3.1.0.26; API exige autenticação. Arquivos do login mobile e AvantaVendas idênticos à base por SHA-256. Produção aponta para dpl_djiL4tFToPagz3YQzfZqhrJNNSvM, READY.
- Pendente somente o ensaio autenticado entre aparelhos pelo responsável. Nenhuma conta foi autenticada nem nenhum lote produtivo de teste foi criado durante a publicação.

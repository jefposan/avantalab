# Exclusão e arquivamento de produtos — 3.2.0.76

## Fluxo atual — 3.2.0.77 (local, não publicado)

Substitui o fluxo .76 descrito abaixo. Sem anúncio vinculado, Excluir produto abre apenas a confirmação final, sem checkbox ou painel intermediário. Saldo desconhecido não impede; não é preciso confirmar zero, ajustar saldo ou registrar saída fictícia. Saldo positivo também pode ser removido mediante a confirmação que informa a exclusão dos saldos do cadastro escolhido.

Após confirmar, a linha do produto é apagada de `marketplace_products`, junto de saldos, notas, fontes e consultas associadas. Não há arquivamento como substituto dessa ação. Exclusão é por UUID/empresa, nunca por título/EAN; outros cadastros semelhantes não são apagados.

Vendas/movimentações preservam seus snapshots e IDs por uma referência técnica independente (`marketplace_product_history_keys`, somente IDs de empresa/produto), sem manter o cadastro ativo ou alterar receitas. Novas movimentações exigem cadastro existente, protegido por trava da linha. A auditoria de exclusão conserva a operação e sua chave, não oferece o produto nas listas.

Com anúncios em qualquer conta, encerrar/excluir explicitamente primeiro; pausa ainda permite venda futura e não é exclusão. A conferência ocorre automaticamente antes da confirmação e novamente no servidor antes de remover. Sem vínculo, não consulta plataforma ou exige conta conectada. Erro real de conexão ou alteração concorrente não é tratado como inexistência de anúncio. Magalu sem encerramento via API mostra o acesso ao portal, sem simular sucesso.

Migrações novas: `20261022180000_marketplace_product_delete_simple.sql` e `20261022181000_marketplace_search_accents.sql`, somente preparadas/testadas em isolamento; nenhuma aplicação em produção nesta revisão. Busca usa normalização oficial para acentos/cedilha e termos separados; projeção SQL de anúncios normaliza também registros legados, antes da paginação, preservando textos originais.

As seções abaixo são registro histórico da entrega .76 e não devem orientar a exclusão simplificada.

Entrega 3.2.0.76 autorizada posteriormente: migração aplicada preservando cadastros e saldos; publicação do sistema em preparação. As notas de implementação local abaixo registram o estado anterior à autorização. Nenhum produto foi publicado ou removido.

## Onde encontrar

Web: expandir produto em Estoques ou Produtos cadastrados → Excluir produto.
AvantaPreços: abrir produto consultado → ações de estoque → Excluir produto.
Disponível para gestor master, administrador e operador completo do módulo. A liberação dedicada de estoque não concede exclusão.

## Conferência e confirmação

1. Mostra saldos, histórico e todos os anúncios vinculados, em todas as contas, sem filtro de conta da lista.
2. Confere cada anúncio na plataforma. Consulta falha, conta desconectada, situação desconhecida ou anúncio ativo bloqueiam a remoção.
3. Permite pausar/encerrar explicitamente cada anúncio pelas ações existentes. Não muda anúncios automaticamente ao remover cadastro; é necessário conferir novamente após cada ação.
4. Saldo em qualquer estoque (inclusive depósito arquivado), quantidade desconhecida e operações pendentes bloqueiam. Registrar a movimentação correta ou confirmar a quantidade real antes de continuar.
5. Exige ciência e confirmação final. Servidor relê todas as contas; trava linhas/valida revisão, nome, histórico e provas recentes antes de gravar.

Sem histórico/vínculo e com saldo zero: exclusão definitiva do cadastro, com auditoria da operação. Com histórico/vínculos: arquiva o produto, preservando vendas, movimentos, consultas, vínculos e anúncios. Sai das listas/buscas ativas e atalhos de últimas consultas, mas os registros históricos permanecem. Não existe restauração automática; importação do vínculo arquivado e criação automática pelo mesmo EAN são impedidas.

## Segurança e limites

- API compartilhada `POST /api/modulos/marketplaces/produtos/excluir`, ações review/remove. Autorização de gestão por empresa, sem nova permissão implícita.
- Provas vêm do servidor, nunca do navegador; conta/vínculo alterados invalidam conferência. Adaptação reutiliza os conectores de integração existentes, com verificação de titularidade.
- RPCs restritas ao service_role; trilha de auditoria protegida por RLS. Referências de histórico são consideradas dinamicamente pelas FKs; novas tabelas também impedem exclusão física.
- Chave idempotente evita repetir exclusão em resposta perdida. A confirmação não tenta novamente automaticamente. Timeout libera a interface e orienta conferir antes de repetir.
- Impede novas ações/publicações concorrentes para o cadastro removido, e descarta sincronizações futuras. Produto arquivado continua sem reativação/edição pelo cadastro; encerramento/pausa dos anúncios ainda pode ser solicitado.
- Sem EAN ou vínculo, não se presume identidade por título. A conferência cobre anúncios vinculados ao cadastro, não anúncios externos jamais importados ou associados ao sistema.
- Migração `20261022160000_marketplace_product_removal.sql` preparada; validação SQL em PGlite e conectores simulados, sem credenciais, dados reais ou chamadas destrutivas externas.

## Validação local

- Bateria completa na cópia isolada com as pendências .73–.76: 1.780 testes, 1.779 aprovados, nenhum erro e um ignorado. Os 11 testes específicos de remoção passaram; incluem SQL real em PGlite, todas as contas, falha remota, dados alterados, repetição e confirmação/cancelamento da interface.
- TypeScript dos componentes/API/serviços alterados e lint dos arquivos novos: aprovados. PADRÃO AVANTA 1.21.0 e manuais da Ava 3.2.0.76: aprovados.
- Lint ampliado dos componentes existentes ainda aponta os mesmos sete erros e dez avisos da base .72, conferidos lado a lado, sem novos apontamentos desta entrega. Não houve alteração de autenticação ou efeitos de navegação para corrigir esses itens fora do escopo.
- Organização visual conferida no Chrome com componentes reais renderizados e dados fictícios, sem chamar APIs ou alterar anúncios.

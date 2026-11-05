# Post do produto — 3.2.0.223

Criar post oferece foto do cadastro, galeria ou câmera. Campos de descrição, voltagem, condição, detalhes e preços são revisados antes de Gerar e salvar. A arte e a foto editável são arquivos privados no Supabase Storage; os campos e versões ficam em marketplace_product_posts por empresa/produto. Não é usado armazenamento persistente no navegador.

Reabrir recupera a última versão para compartilhar ou editar. Editar gera nova versão; preço e descrição não são sobrescritos silenciosamente com alterações do cadastro. Compartilhamento nativo recebe PNG e legenda com descrição, De ~valor~ e Por *valor*. Compatibilidade final depende do aplicativo de destino. Baixar imagem é mantido. Nenhuma mensagem é enviada automaticamente pelo servidor.

A API usa a autorização existente do AvantaPreços e valida empresa/produto, imagens reais e limites. RPC exclusiva do servidor confere acesso ativo, revisão e tentativa idempotente. Duas edições simultâneas não se sobrescrevem. Produtos/estoque/anúncios não são alterados. Fotos e versões anteriores são preservadas; upload interrompido não publica metadados e pode ser retomado pela mesma tentativa. Arquivos sem metadados após interrupção definitiva são privados; limpeza futura deve conferir referências, nunca apagar por data sem conferir vínculos.

Restauração: restaurar aplicação 3.2.0.219, mantendo tabela e bucket aditivos para não perder posts gerados após a entrega. Não executar DROP nem remoção de arquivos no rollback normal.

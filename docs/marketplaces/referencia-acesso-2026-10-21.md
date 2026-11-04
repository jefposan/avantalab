# Referência do AvantaPreços — 3.2.0.48

PADRÃO AVANTA 1.20.0. Autorizado liberar edição manual e pesquisa de preço a todos os usuários ativos do AvantaPreços da empresa.

- Ajustar preço médio/Atualizar cálculos e Atualizar preço disponíveis nos detalhes; não retorna formulário de cálculo manual à entrada.
- API valida vínculo ativo (regular ou dedicado) e módulo ativo. Cadastro compartilhado recebe referência nova; não altera estoque, anúncio remoto nem lotes salvos.
- RPC exclusiva de preço mantém revisão e recibo auditado. RPC geral de cadastro/estoque não recebe novas permissões. Pesquisa mantém amostra, limites, concorrência e auditoria.
- Migração 20261021050000 aplicada em transação. Hashes de seis tabelas preservados, incluindo 109 produtos e 136 saldos. Funções gerais de produto/estoque preservadas.
- 714 testes de Marketplaces aprovados na raiz e no pacote isolado, incluindo renderização com perfil consulta_precos e SQL real de edição/pesquisa, acesso revogado, empresa incorreta, módulo inativo, concorrência e proteção do estoque.
- Pacote isolado baseado em 3.2.0.47, sem incluir outras alterações do checkout compartilhado. Publicação autorizada com promoção automática após aprovação do build; envio não confirma que está no ar.

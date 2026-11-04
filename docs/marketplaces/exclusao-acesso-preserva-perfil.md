# Exclusão de acesso e base do perfil

Revisão local 3.1.0.56; PADRÃO AVANTA 1.20.0. Não publicada.

## Propriedade e autoria

Produtos e demais cadastros pertencem a `empresa_id`; `created_by`, `stock_confirmed_by` e `actor_id` registram autoria, não propriedade. A exclusão física de `auth.users` era bloqueada pelas referências de produtos/movimentações. Não remover essas referências ou seus registros para contornar o bloqueio.

O novo fluxo retira o acesso dedicado do AvantaPreços sem apagar sua identidade técnica: revoga `marketplace_price_users.ativo` primeiro (o autorizador consulta esse vínculo inclusive com JWT existente), bloqueia a autenticação, remove o login da identificação de acesso e do diretório global, e retira somente o vínculo dedicado da lista. Fotos, preços, saldos, produtos, consultas, lotes, itens e auditorias não são escritos. A identidade técnica mantém seu nome e metadados de origem, mas fica bloqueada. O login fica livre para outro cadastro; o UUID novo e a empresa escolhida não herdam produtos da empresa anterior.

Antes de qualquer escrita, o serviço confirma empresa, identidade exclusiva `restricted_app=avantaprecos`, ausência de vínculos regulares/outras empresas e que não é o próprio gestor. Permissão de gestor master/administrador continua sendo exigida na rota. Contas comuns/compartilhadas precisam de outro fluxo de administração, sem bloqueio global por este endpoint.

## Falhas e retomada

Não há transação entre a API Auth e as tabelas. Por isso, o vínculo é revogado antes do bloqueio Auth; uma falha posterior não devolve acesso. A lista mantém o registro enquanto a retirada não terminar, permitindo repetir Excluir. Mensagem distingue acesso já bloqueado de exclusão finalizada. Nenhuma falha provoca exclusão física, limpeza de produtos ou reativação automática. Após resposta incerta, atualizar a lista antes de repetir; vínculo já removido deixa de aparecer.

Nenhuma migração ou alteração de FK é necessária. Não foi executada exclusão/bloqueio de usuário produtivo nos testes. O login JEFF da Tridium e seus dados não foram modificados nesta etapa.

## Testes

Testes do serviço real com adaptador Supabase sobre PGlite e migrações reais de acesso/produtos/lotes: exclusão física antiga reproduz bloqueio de FK; retirada nova preserva integralmente produtos de duas empresas, saldo, foto manual, autoria, movimentos, recibos, consulta, lote e item. Novo usuário reutiliza login em outra empresa sem levar os cadastros. Escopo incorreto, conta comum, vínculos compartilhados e autoexclusão recusados sem escrita. Falhas em bloqueio Auth, liberação do login ou retirada do vínculo deixam acesso revogado e nova tentativa conclui preservando todos os dados.

Suíte completa: 1.378 aprovados, zero falhas. Tipagem, lint dos arquivos alterados e verificadores PADRÃO AVANTA/Ava aprovados. Prévia fictícia com o componente real confirmou dois cliques, atualização da lista e mensagem de preservação; nenhuma chamada produtiva. Evidência em `output/marketplaces/exclusao-acesso-preserva-perfil-56.jpg`.

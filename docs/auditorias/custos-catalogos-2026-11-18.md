# Custos e Precificação — entrega 3.2.0.486

- Branch isolada criada da main oficial; entrega rebaseada sobre `99770b418c6702af2563885c1ed4d3cf1e100c67`, preservando as cinco prioridades de Vendas e Serviços do chat paralelo e a correção do mock de validação CNPJ exigida pelo build completo.
- Numeração de Custos avançada de candidata 485 para 486 após a entrega paralela assumir 485. Nenhuma troca de branch do checkout compartilhado.
- Cadastro administrativo independente dos destinos: Todos ou catálogo escolhido, acesso Gerenciar produtos e chaves oficiais por destino.
- Tabelas de preços e exportação limitadas aos catálogos ativos em Vendas e Serviços, sem excluir cadastros ou preços armazenados.
- Reajuste segue o mesmo escopo no servidor. A função anterior foi comparada integralmente com a fonte antes da atualização.
- Migração exclusiva `20261118180000_reajuste_somente_catalogos_locais_ativos.sql`. O identificador inicial 20261118120000 coincidia com o backup de notas: seu registro foi corrigido para a fonte original do backup, sem reexecutar esse SQL, e Custos foi registrado separadamente em 180000. Consulta posterior confirmou os dois nomes e identificadores corretos.
- A migração substitui somente a função: não executa reajustes, não apaga produtos e não altera notas ou publicação própria do AvantaVendas.
- Validação após integrar Vendas: 844 testes de segurança aprovados; 35 testes dirigidos aprovados; TypeScript, PADRÃO AVANTA 1.24.0 e Ava aprovados. Lint sem erros, com avisos preexistentes de hooks.
- Verificação visual autenticada pendente: ambiente local na porta 3215 não possuía sessão. Nenhuma credencial foi copiada do navegador de produção.
- Publicação depende da main exata, fila livre e base de produção atual; não contornar as guardas.

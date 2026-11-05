# Publicação — ficha web do AvantaPreços3.2.0.41

Autorizada em21/10/2026. PADRAO-AVANTA1.20.0. Base40 READY com domínios atribuídos,
incluindo avantalab.com.br. Sem outras alterações locais dos aplicativos.

Pacote isolado `/private/tmp/avanta-facts41.ujVdep`, definido por
`/private/tmp/avanta-facts41-validation.json`. Código funcional coincide com os
arquivos testados.699 testes Marketplaces aprovados;24 testes focados repetidos
antes da entrega; TypeScript sem erros e verificadores PADRÃO/Ava aprovados.

Migração20261021040000 aplicada usando o SQL canônico em transação com guardas:
hash esperado da função anterior, trava de publicação e comparação de hashes
dos registros em10tabelas antes/depois.102produtos,129saldos preservados; funções
de estoque originais preservadas. Função anterior guardada para recuperação em
`/private/tmp/avanta-facts41-before.json` sem exportar dados dos produtos.
Execução em `/private/tmp/avanta-facts41-apply.json`; conferência em
`/private/tmp/avanta-facts41-check.json`. Não houve pesquisa em massa nem correção
retroativa dos produtos: Atualizar preço passa a completar os dados encontrados.

Envio à Vercel autorizado para produção com promoção automática após build
aprovado. Upload/build não significa publicação concluída. Estado será registrado
após envio. Sem binário novo, alteração de saldo/anúncio ou integração financeira.

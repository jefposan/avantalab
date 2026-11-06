# 3.2.0.331 — Correção das pendências fiscais

- Tela real da versão 3.2.0.327 conferida: Regra fiscal da operação estava Pronto. Os avisos pendentes eram classificação das mercadorias, tributação dos itens e serviço de emissão.
- Herança e CFOP por operação/UF corrigidos na entrega 3.2.0.330. Exceção IBS/CBS limitada à NF-e do Simples em 2026, sem inventar códigos tributários.
- Conferência passa a usar o estado atual do executor; indicador legado do certificado só é fallback quando não há resposta atual.
- Revisar para emissão mostra somente pendências, identifica produto/campo e oferece a ação correspondente. Abrir detalhes continua sendo consulta.
- Editar produto abre o cadastro identificado no perfil autorizado, aguarda carregamento e não substitui edições posteriores. Cadastro ambíguo ou de outro perfil não é aberto arbitrariamente.
- Retorno ao módulo restaura a conferência da mesma nota pelo armazenamento já separado por perfil.
- Prévia atualiza somente classificação antes da preparação; valores, quantidades, descontos, origem e identidade permanecem preservados. Emissões preparadas, numeradas e posteriores não recebem dados atuais do catálogo na prévia.
- Nenhuma nota transmitida, número reservado, receita gerada ou estoque alterado nos testes.

## Validação do pacote

- 540 testes de segurança aprovados no pacote isolado; cinco testes de cadastro do perfil aprovados.
- Tipagem do pacote isolado aprovada, ESLint sem erros, PADRÃO AVANTA e Ava verificados.
- O build completo remoto permanece obrigatório. A primeira tentativa 3.2.0.330 foi bloqueada por um teste que exigia o nome de uma função substituída; o teste agora confere padrões da empresa e exceções efetivas, sem dispensar o gate.
- A emissão continua condicionada ao fluxo fiscal persistido, à validação XML e à confirmação explícita existente. Estes testes não certificam autorização na SEFAZ nem funcionamento de todos os regimes fiscais.

## Banco e base

As migrações 20261105180000 e 20261105190000 já foram aplicadas: 343 produtos atuais da Tridium herdando a empresa, dois backups e um cadastro excluído preservado. Códigos, NCM/CEST e preços mantiveram a mesma impressão digital. Não há nova migração na 3.2.0.331. Base de publicação: produção 3.2.0.327, deployment dpl_EH7i9vRfLWxTxgo8a8Ggq2khVPwB.

# Custos e Precificação — protótipo em `/custos`

Rota interna de protótipo para validar o fluxo de montagem de custos antes de
qualquer integração com dados, permissões ou módulos do AvantaLab.

## Escopo atual

- Cadastro local de insumos.
- Menu `⋯` para edição inline e exclusão confirmada de insumos; itens em uso
  também saem da composição quando excluídos.
- Campos monetários usam máscara contínua em reais e mantêm duas casas decimais
  durante toda a digitação.
- Carteira local com sete produtos de exemplo e insumos compartilhados.
- Faixa horizontal de cards selecionáveis e busca por produto na Visão geral.
- Cadastro de novos produtos como rascunho, com nome, apresentação e parâmetros
  iniciais de custos e preço.
- Produto recém-criado abre com composição vazia para inclusão dos insumos.
- Visão geral consolidada com quantidade de produtos, composições validadas,
  rascunhos e insumos efetivamente utilizados.
- Seleção do produto em análise na Visão geral, Composição e Simulador.
- Composição e parâmetros independentes para cada produto.
- Quantidade e perda por componente.
- Rateio percentual de custos indiretos.
- Simulação de impostos, taxas, margem e preço de venda.
- Comparação de cenários.
- Meta mensal de vendas calculada a partir das despesas operacionais, margem de
  contribuição e lucro desejado.
- Acompanhamento do ponto de equilíbrio, vendas realizadas, progresso e valor
  restante da meta.
- Persistência somente no navegador.
- Migração automática dos dados locais anteriores para o modelo com vários
  produtos, preservando insumos e a composição já editada.

O protótipo não possui banco, login, APIs ou conexão funcional com o ERP.
Na tela Meta de vendas, os dados operacionais são manuais nesta fase; a
integração futura deve usar os lançamentos classificados do AvantaLab.

## Execução

```bash
cd /Users/JEFF/avantalab
npm run dev
```

A prévia local abre em `http://localhost:3000/custos`.

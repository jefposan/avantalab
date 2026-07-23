# Modelo de importação de produtos

O sistema deverá permitir baixar um arquivo modelo em `.xls` ou `.xlsx`.

O vendedor poderá preencher esse arquivo e importar produtos de qualquer marca.

## Colunas sugeridas

| Coluna | Obrigatório | Exemplo | Observação |
|---|---:|---|---|
| marca | não | Tridium | Nome da marca/empresa |
| categoria | não | Cosméticos | Criada automaticamente se não existir |
| sku | não | TRI-001 | Código interno opcional |
| nome | sim | Shampoo X | Nome do produto |
| descricao | não | Shampoo hidratante | Texto livre |
| preco | sim | 49,90 | Preço de venda |
| preco_promocional | não | 39,90 | Opcional |
| estoque | não | 10 | Opcional na V1 |
| unidade | não | un | Unidade de venda |
| imagem_url | não | https://... | Imagem opcional |
| ativo | não | sim | sim/não |

## Regras de importação

- Produto sem nome deve ser rejeitado.
- Produto sem preço deve ser rejeitado.
- Categoria inexistente pode ser criada automaticamente.
- Se o SKU já existir para o usuário, o sistema deve perguntar ou atualizar.
- A importação deve gerar um relatório:
  - total de linhas;
  - produtos importados;
  - produtos ignorados;
  - erros encontrados.


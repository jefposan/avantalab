# 3.2.0.471 — Edição exclusiva do item da nota (local)

Base: origin/main 3.2.0.468. Inclui os trabalhos locais 469 (CFOP) e 470 (padrões da empresa). Nenhuma publicação ou alteração de cadastro em produção efetuada.

## Comportamento

O lápis no item da emissão abre Dados, ICMS, IPI, PIS e COFINS. Aplicar mantém os valores exclusivamente no retrato fiscal da nota; Cancelar não aplica o formulário temporário. Cadastro permanente continua em ação separada, sujeita à permissão do catálogo. Os códigos selecionados continuam sujeitos às validações fiscais e ao gerador; a interface não significa suporte a todos os regimes de cálculo.

IPI desta entrega cobre classificações sem destaque (IPINT), com enquadramento. IPI com destaque, ICMS diferente do CSOSN 102 e contribuições tributadas sem base/alíquota apuradas permanecem bloqueados. Nenhuma alíquota é escolhida automaticamente.

## Verificações

- Suíte geral: 3035 testes, 3029 aprovados, 6 ignorados, zero falhas.
- Reexecução dos módulos afetados após refinamentos: 37 aprovados; inclui criação avulsa com NCM apenas na nota, preservação do catálogo, permissões, concorrência dos padrões, edição e XML/XSD.
- TypeScript sem erros; PADRÃO AVANTA 1.24.0 e conhecimento Ava revisados.
- Navegador local: cancelar preserva a descrição; aplicar CST PIS 08 atualiza somente o item; reabrir conserva a alteração. Popup conferido a 390 px sem transbordamento horizontal.
- PISNT/COFINSNT 08 e IPINT 53 com cEnq 999 passam no XSD oficial preservado no projeto. Testes usam dados sintéticos, sem transmissão à SEFAZ.

Prévia: http://127.0.0.1:3049/vendas-lab/emissao. Padrões: http://127.0.0.1:3049/vendas-lab/configuracoes-fiscais. Prévias de desenvolvimento não persistem dados de produção.

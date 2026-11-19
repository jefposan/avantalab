# Custos — Excel seletivo (candidato 3.2.0.490)

Base: origin/main `aba282dcbbbb10e79b138bd595e1905ea364fa67`, confirmada na rede.
Implementação isolada; checkout canônico e trabalho paralelo preservados.
PADRÃO AVANTA 1.24.0 no pacote; fonte canônica local consultada também (1.23.1).

## Contrato

- Exportar abre modal oficial para escolher campos e tabelas. Dados cadastrais opcionais ficam recolhidos para priorizar a seleção de preços.
- Código e Nome identificam; Nome só é editável quando selecionado. IDs/datas ocultos são obrigatórios e metadados ficam veryHidden.
- Importação parcial por ID da empresa, sem mover catálogos. Nomes/códigos iguais em catálogos diferentes não confundem a identidade.
- Coluna ausente não atualiza o cadastro. Textos vazios limpam campos escolhidos; preços vazios são ignorados, zero é válido. Custo, alíquota e situações selecionadas exigem valores válidos.
- Prévia sem escrita; confirmação atômica; erro em qualquer linha desfaz todo o lote. Validação de empresa, acesso, exclusão lógica e concorrência no servidor.
- Histórico para preço padrão e tabelas adicionais. Preços adicionais não alteram cadastro nem preço de divulgação.
- Arquivos v2 aceitos para atualização de IDs existentes. Este fluxo não cria produtos novos: usar cadastro ou importação de novo catálogo.
- Erro de importação é contextual; repetir revalida o arquivo retido. Erro de aplicação permanece na confirmação. Erro de exportação aparece no modal.

## Validação

- 46 testes focados aprovados (incluindo PostgreSQL/PGlite real da nova RPC), depois 14 testes de contrato/importação e regressões finais.
- Segurança: 852 aprovados, zero falhas.
- TypeScript e ESLint sem erros; aviso de efeito de PriceEditor preexistente.
- PADRÃO AVANTA e Ava aprovados.
- Navegador local: modal visualmente conferido, nenhuma seleção desabilita exportação, seleção apenas Atacado gera arquivo correto.
- Arquivo gerado reaberto: Código, Nome e Preço · Atacado; IDs e datas ocultos; metadados veryHidden. A formatação ignora ISS quando a coluna não é selecionada.
- Rota sintética de QA removida. Arquivo sintético movido de Downloads para `/private/tmp/avanta-excel-seletivo-qa-atacado.xlsx`; planilhas reais intactas.

## Implantação autorizada

Migração `20261119010000_custos_excel_seletivo_multicatalogo.sql` aplicada no Supabase oficial e registrada na mesma transação, após autorização de publicação. Função confirmada; execução anônima negada e autenticada permitida, com validação interna de acesso e empresa.
Conferência produtiva encontrou dados legados não preenchidos. A validação agora considera somente campos enviados; teste PostgreSQL com tipo/custo/ISS ausentes aprovado, preservando-os.
Nenhuma importação de dados reais foi executada. Main e produção de base reconfirmadas em `aba282dcbbbb10e79b138bd595e1905ea364fa67` / `dpl_AW2PuZnrw2rjD9yoChp8UWmiCT7p`.
Publicação segue pelo pipeline oficial com gate remoto completo e promoção automática após aprovação; recibo final em output/pipeline do checkout canônico.

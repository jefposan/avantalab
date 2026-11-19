# 3.2.0.508 — Impressão de pedidos

Base: origin/main e12ae6e0159ef107eecb2a37fe12dc7e9faa8efe (3.2.0.507).
Pacote isolado; checkout canônico e trabalhos paralelos preservados.
PADRÃO AVANTA consultado: 1.24.0.

## Escopo

- Imprimir pedido gera o PDF e solicita a impressão nativa, sem diálogo intermediário de geração.
- Formatos reais A4/A5 definidos em Ajustes > Comercial, com A4 como padrão compatível.
- Logo do perfil, identificação da empresa e cliente, condições, itens e totais; cabeçalhos repetidos e paginação para documentos longos.
- Não expõe custos ou observações internas. Não modifica pedido, estoque, financeiro ou fiscal.
- Compartilhamento continua usando o PDF; etiquetas permanecem adiadas.

## Validação

- 982 testes de segurança aprovados; 12 testes focados aprovados, incluindo dimensões, logo, último item, privacidade, limpeza e bloqueio de clique repetido.
- TypeScript sem erros. Padrão Avanta, Ava, acesso Web/mobile, interface e revisão AvantaVendas aprovados.
- PDFs demonstrativos A4/A5 de 4 e 75 itens renderizados e inspecionados; nenhum dado real alterado.
- Chrome local: geração e chamada automática verificadas com pedido fictício. A interface nativa de impressão não foi exposta integralmente à automação; não houve impressão física. O usuário ainda confirma impressora/papel no navegador.
- Aguardar prontidão do visualizador após load evita chamada antecipada; URLs e frames temporários são removidos após impressão ou prazo limite.
- Sem migração de banco ou envio às lojas.

Gate integral e resultado de produção registrados no recibo oficial da publicação.

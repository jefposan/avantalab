# Anunciados — foto e EAN

Revisão local 3.1.0.54, PADRÃO AVANTA 1.20.0. Não publicada nesta etapa.

- Identificação mostra foto à esquerda e, à direita, nome, conta/código do anúncio e EAN na linha abaixo. O SKU continua no modelo e na busca, mas sai dessa apresentação resumida; não é usado como substituto do EAN.
- `ProductThumbnail` é o mesmo componente de Produtos e estoque: 56 × 56, imagem contida, texto alternativo e fallback Sem foto. Chave pela URL reinicia o estado de erro quando a foto muda. Ausência de EAN mostra Não informado.
- Lê somente as fotos/EAN retornados no snapshot do anúncio. Não procura produtos pelo nome, não altera fotos manuais, anúncios, saldos ou permissões. Anúncios antigos sem esses dados podem precisar da ação Atualizar existente; não há sincronização ou escrita produtiva de teste.
- Componentes reais validados em `/marketplaces/validacao-anunciados`, somente desenvolvimento (404 em produção), com dados e ilustração fictícios. Imagem ausente e imagem com erro retornam Sem foto; EAN ausente permanece explícito. Temas claro/noturno conferidos.
- Dois testes de identificação adicionados, contrato de edição atualizado após a extração do componente. Suíte completa: 1.373 aprovados, zero falhas. Tipagem do app, lint dos componentes e verificadores PADRÃO AVANTA/Ava aprovados.
- Evidência: `output/marketplaces/anunciados-foto-ean-54.jpg`. Não confundir a ilustração de teste com foto real recuperada do anúncio do responsável.

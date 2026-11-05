# Preparar anúncio — prévia com foto · 3.2.0.108

Aplicado em 23/10/2026 ao formulário real do Web, Mercado Livre e Magalu. Sem publicação do sistema, anúncios, banco, OAuth ou homologação nova.

- Esquerda: campos existentes, labels/controles alinhados, alturas de 44px e espaçamento consistente. Topo, datas e seletor de marketplaces não foram alterados.
- Direita: Prévia do anúncio com ProductThumbnail oficial, imagem selecionada/foto da ficha, título, preço destacado, quantidade, categoria, identificação e condições. Descrição/características e ficha técnica expansíveis. Magalu acompanha o título/imagem editados e mantém medidas em cm/g.
- Prévia deriva somente do estado do formulário, sem consulta, persistência ou envio extra. Não representa confirmação de publicação nem cópia exata da aparência externa. Campos/validações/confirmação/idempotência preservados.
- Foto ausente ou com falha usa fallback do componente existente. Mudança de URL reinicia somente a miniatura. Tema escuro, zoom/coluna única, impressão e rolagem da prévia preservados.
- Laboratório existente recebeu ilustração SVG local para conferir a foto sem buscar imagens no ML; produto real usa sua foto real.

## Ponto de restauração

`output/restauracao-preparar-320107-20261023-9vJPM0/LEIA-ME.md` identifica a cópia anterior, versão 3.2.0.107, criada antes das edições. TAR conferido por listagem e SHA-256. O teste `publication-simulation.test.mjs` tem cópia complementar `.antes` na mesma pasta, salva antes de sua alteração.

Para voltar, solicitar **Restaurar Preparar anúncio para o ponto 3.2.0.107 de 23/10/2026**. Reversão limitada a esta entrega; não usar reset/checkout global ou sobrescrever edições posteriores. Novos arquivos desta entrega: este registro e `public/images/simulacao-ventilador.svg`. O ponto contém os estados locais não publicados anteriores; não depende de commit Git.

## Verificação

- 64 testes focados aprovados, incluindo formulário real/simulado, foto, descrição/atributos na prévia, frete, limpeza no sucesso e fluxo Magalu.
- 441 testes de segurança aprovados. TypeScript sem erros; ESLint sem erros, quatro avisos preexistentes de imagens/dependência de efeito.
- PADRÃO AVANTA 1.21.0 e Ava 3.2.0.108 validados. Prévias estáticas de ML claro/escuro/pendências e Magalu renderizadas com JSX/CSS reais.
- Chrome: foto completa, edição de preço/quantidade refletida na prévia, campos EAN/categoria com topo idêntico e 44px de altura. Captura em `output/preparar-anuncio-previa-320108.jpg`. Dados fictícios; nenhum clique de envio real.
- Sem build completo/deploy nesta etapa. A integração real com ML continua dependendo da configuração OAuth do ambiente.

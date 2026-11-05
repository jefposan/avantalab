# Marketplaces — expansão exclusiva dos cinco blocos

Versão local 3.2.0.240. Publicação expressamente suspensa pelo responsável em 27/10/2026. Não enviar até nova autorização.

## Escopo confirmado

Vendas, Anunciados, Estoque, Produtos cadastrados e Resultados. A regra não foi ampliada para Contas conectadas, detalhes internos nem outros módulos.

## Implementação

Um identificador único no MarketplacesClient determina qual bloco está expandido. Abrir outro substitui esse identificador; recolher o próprio bloco permite deixar todos fechados. Um fechamento atrasado de outro bloco não remove o novo destino. Mudança de empresa não reutiliza o estado anterior e callbacks antigos são descartados.

Botões de cabeçalho/rodapé, buscas, atalhos e destinos de pendências usam o mesmo controle. Os conteúdos continuam montados e ocultos com hidden, preservando filtros e operações. Prévias isoladas conservam estado local. As ações existentes de recolhimento pelo rodapé mantêm restauração de foco. Mantém objetivos ocultos da versão 3.2.0.239, já publicada e verificada no navegador.

## Validação local

- 52 testes do escopo aprovados, incluindo todas as combinações entre os cinco blocos e fechamento atrasado de bloco anterior.
- PADRÃO AVANTA 1.23.1 e Ava revisada para 3.2.0.240 aprovados.
- 471 testes de segurança do pacote isolado aprovados, zero falhas. TypeScript completo com tipos de rotas gerados aprovado. Nenhum build completo local adicional foi necessário.
- Testes executados no pacote isolado /private/tmp/avanta240-exclusive-panels-local, aplicado sobre o snapshot 010b7506fdfe0ffb98f79447927fea4e7c887b40. Alterações pendentes de outras frentes na raiz foram preservadas e não incluídas no pacote.
- Sem build remoto e sem teste da expansão exclusiva na produção, conforme instrução de não publicar. Antes de um envio futuro autorizado, revalidar a base vigente e executar o build completo remoto obrigatório.

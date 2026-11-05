# Marketplaces — referências no topo e rolagem da preparação

Entrega local 3.2.0.241, incluindo a expansão exclusiva dos cinco blocos preparada na 3.2.0.240. Publicação suspensa por instrução do responsável; não enviar até nova autorização.

## Alteração

Preparação do Mercado Livre e Magalu usa a referência salva no cadastro e os percentuais do perfil para apresentar Mínimo, Média e Ideal. Reutiliza ProductSalePrices; a coluna de comparação não acompanha nem modifica o preço de venda digitado. Sem referência ou percentuais, não inventa números.

O topo fica fora da rolagem dos campos. A coluna esquerda reutiliza DetalhesRolaveis, com teclado, foco e altura da viewport; a prévia ocupa a direita no desktop e as áreas se empilham em tela estreita. O quadro mantém cabeçalho e colunas juntos ao mover a página, sem sobrepor os campos. Tema escuro e impressão preservados.

O ML retorna referencePriceCents no resultado de preparação/cópia a partir do cadastro já consultado. Revalidação e salvamento da ficha mantêm essa leitura; não há nova pesquisa de preço, gravação de referência, alteração de estoque ou envio ao marketplace nesta entrega.

## Conferência

- Suíte do escopo existente: 148 casos; seis incompatibilidades de estrutura/carregador foram corrigidas sem novos casos nem remoção de verificações. Os três arquivos afetados foram repetidos: 50 aprovados, zero falhas; os outros 98 já estavam aprovados.
- Segurança do pacote isolado: 471 aprovados, zero falhas. TypeScript completo e geração dos tipos de rota aprovados. PADRÃO AVANTA 1.23.1 e Ava 3.2.0.241 validados.
- Prévia visual temporária, sem efeitos ou operações reais: dados fictícios, referência R$ 250,00 e percentuais 50/70/90 produzem R$ 125/175/225, com preço de venda separado em R$ 199,00. Não integra o gate nem modifica fixtures/helper persistidos.
- Navegador: coluna esquerda passou de scrollTop 0 a 801 mantendo o topo em 162px. Sem sobreposição dos campos ao rolar a página. Tela 390px: largura do documento e conteúdo iguais, sem rolagem horizontal; tema escuro e preparação Magalu conferidos. Override de viewport restaurado.
- Screenshot: /private/tmp/avanta241-preparacao-desktop.png. Também conferida prévia mobile em /private/tmp/avanta241-preparacao-mobile.png.
- Pacote isolado /private/tmp/avanta241-preparation-prices, derivado do snapshot local 3.2.0.240; alterações pendentes alheias da raiz preservadas. Sem build remoto, push ou upload. Antes de envio futuro autorizado, conferir base de produção e executar o build remoto completo obrigatório.

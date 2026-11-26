# Importação seletiva de preços — 3.2.0.529 local

## Origem e preservação

Base oficial consultada na rede: main `ebee54e9a57711870e44faec8699fbed77f96afc`, versão 3.2.0.527. Checkout canônico `/Users/JEFF/avantalab` permanece na sua branch original, com versão local 3.2.0.363 e trabalhos paralelos preservados. Impressão compacta 3.2.0.528 permanece no checkout anterior, sem ser incorporada nesta entrega.

Desenvolvimento local isolado: `/private/tmp/avanta-precos-importacao-20261126`, branch `codex/importacao-precos-seletiva`. Nenhum push, merge remoto, aplicação de migração remota ou publicação autorizado nesta etapa.

PR #44 lida e comparada, sem merge nem cherry-pick. Aproveitado o conceito de destino por tabela e identificação prioritária pelo código. Não aproveitada a remoção da concorrência da rotina SQL antiga nem a edição de campos cadastrais dentro desta importação. Nova rotina exclusiva de preços; rotina antiga preservada para seus demais consumidores.

## Fluxo

Modal oficial, chave oficial por tabela, seletor desabilitado quando inativa; todas iniciam desativadas. Sugestão de origem ao ativar; permite alterar livremente a origem e reutilizar a mesma coluna em vários destinos. Limpar seleção, Cancelar e Revisar importação no rodapé. Sem botão Somente padrão, contagem no rodapé da seleção ou bloco com nome do arquivo e identificação das colunas.

Revisão consulta preços atuais no servidor. Exibe correspondências e cada preço anterior/novo. Confirmar envia o mesmo payload e sua revisão; mudança de produto, preço ou tabela exige nova conferência. Operação transacional, histórico com origem importacao e arquivo no registro da importação. Não cria produtos, não recebe campos cadastrais nem altera estrutura das tabelas.

Tabelas inativas não recebem gravações. **Sem modificar a regra existente de herança:** tabelas sem preço específico acompanham o padrão. Se o padrão for alterado, a tela informa essa regra; não cria registros em tabelas não selecionadas para congelá-las. Quando um destino selecionado coincide com o padrão antigo, mas o padrão mudará no mesmo lote, materializa o preço escolhido nesse destino para manter a revisão correta.

## Validação segura

- Planilhas externas, AvantaLab v2/v3 antigas, aba legada separada, zero, vazios, coluna não selecionada com erro, nomes antigos, duplicidades, ambiguidades, empresa divergente e cabeçalhos normalizados.
- Migração `20261126223000_custos_importar_somente_precos.sql` executada em PostgreSQL/WASM PGlite isolado, sem acesso aos dados reais. Testes de preview sem escrita, aplicação, no-op, preservação de estoque/fiscal/nome/código, histórico, empresa, permissão, conflito após revisão e rollback por falha no histórico.
- UI real montada apenas no laboratório localhost:3000, rota de validação fora desta entrega: dados sintéticos e transporte de confirmação simulado. Fluxos de ativar/desativar, origem compartilhada, voltar à seleção, revisão e confirmação conferidos no navegador. Desktop e celular 390 px sem overflow de página; contraste escuro corrigido localmente.
- Evidências visuais em `/Users/JEFF/avantalab/output/previas/importacao-precos/implementacao-local-desktop.jpg` e `implementacao-local-mobile-escuro.jpg` (primeira captura ainda contém bloco de arquivo removido posteriormente).

## Banco e publicação

Migração aditiva preparada, sem apagar dados; cria apenas a nova RPC e suas concessões equivalentes às rotinas de Custos existentes. **Não aplicada no Supabase remoto.** O módulo real poderá ler a seleção localmente, mas a revisão/gravação contra o banco real depende dessa aplicação futura. A validação atual usa banco isolado e transporte simulado; nenhum preço real foi alterado.

Não publicado, não sincronizado com GitHub. Não confundir esta implementação local com a versão que está no domínio oficial.

## Resultado final das verificações

`npm run build` concluído com saída 0: 3.308 testes, 3.302 aprovados, seis ignorados e nenhuma falha; webpack compilado em 36,7 s, TypeScript e geração das páginas concluídos. PADRÃO AVANTA 1.24.0, Ava 3.2.0.529 e diff verificados. Dois testes antigos de contrato foram atualizados para seguir o modal extraído e o parser novo, mantendo as verificações de exportação e concorrência.

Consulta somente de leitura confirmou `origin/main` no SHA de base e o domínio oficial ainda associado a `dpl_53YJrFMiWrrwnTw5mVbLLHV4Meys`, versão 3.2.0.527. Nenhuma publicação realizada.

A pedido do titular, uma alternativa em duas colunas foi renderizada separadamente em `/Users/JEFF/avantalab/output/previas/importacao-precos/proposta-duas-colunas.jpg`. É uma proposta visual, ainda não aplicada ao componente funcional; preserva a decisão pendente sobre a compactação.

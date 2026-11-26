# Estoque mínimo, avisos e controle — validação local

Entrega ainda não publicada. Banco remoto não alterado.

- Ações de Estoque: Configurar estoque mínimo, leitura do valor atual e gravação somente com confirmação. Valores não negativos, até três casas decimais; permissão stock.adjust; conflito concorrente e repetição tratados.
- Sino no topo: avisos derivados do disponível menor ou igual ao mínimo positivo. Serviços e produtos/empresa com controle desativado não entram. Atalho abre Estoque filtrado no produto e a entrada com quantidade em foco; sem permissão de entrada, apenas consulta.
- Ajustes > Vendas e serviços > Estoque: chave única da empresa ativa. Sem chave por produto ou pedido; sem seletores de locais. Alternância confirmada pelo servidor, sem sucesso otimista; desligar inclusive com reservas mantém saldos, mínimos, reservas e histórico intactos. Novos movimentos são bloqueados enquanto desligado.
- Migração 20261126210000 preparada e testada no PostgreSQL simulado; não aplicada no Supabase. Reaplicação preserva controles desativados.
- Bloqueios verificados no serviço/SQL, incluindo novas reservas e movimentações; estornos e histórico permanecem preservados.
- Navegador localhost:3000: sino exibiu 10 avisos reais da Tridium; atalho selecionou BOTÔNIX na entrada; mínimo atual 50 carregado no diálogo; controle geral apareceu em Ajustes. Nenhuma entrada, configuração ou nota foi gravada durante a inspeção.
- Validações: TypeScript, PADRÃO AVANTA 1.24.0, Ava, testes SQL de mínimo/controle/isolamento/reservas/reaplicação e regressões de estoque opcional, estoque posterior, prontidão operacional e leitura local.
- O laboratório continua em modo de consulta: POST/PATCH/PUT/DELETE de Vendas/Fiscal não são encaminhados ao servidor oficial. Portanto salvar na inspeção com dados reais permanece bloqueado; gravações foram validadas somente em PGlite.

Antes de futura publicação autorizada: reconciliar main e deployment vigentes, conferir e aplicar a migração declarada pelo procedimento oficial e executar o gate completo. Não publicar sem nova solicitação do titular.

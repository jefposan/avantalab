# 3.2.0.515 — Vendas e Serviços: pedidos, recebimentos e interface

Entrega autorizada pelo responsável em 24/11/2026, após revisão na prévia local.
Base oficial: d3bc69e079b56ffc6e984f4f927f63d96e694e20 (3.2.0.514).
Produção usada como base: dpl_9woAkts53VMUT3fCNcfe9a1wF2rZ.
PADRÃO AVANTA consultado: 1.24.0. Checkout principal preservado.

## Conteúdo

- Três indicadores compactos: estoque, faturamento e fiscal; verde concluído e cinza claro pendente.
- Avisos acima dos popups; margens visíveis e conteúdo rolável em telas baixas.
- Cabeçalho fixo com compensação pela altura real; iframe integrado limitado à área disponível.
- Consignado sem parcelas/vencimento obrigatório e sem geração automática de contas a receber.
- Recebimentos sincronizados antes da confirmação de sucesso dos pedidos; respostas antigas descartadas.
- Coluna Data do pedido no lugar do UUID; datas em dd/mm/aaaa e filtro Em aberto por saldo pendente.
- Estorno de faturamento do pedido inteiro, com confirmação e permissões; bloqueia valores recebidos, preserva estoque/fiscal/histórico e permite refaturar sem repetir a baixa.
- Remoção dos avisos introdutórios de Recebimentos e Estoque; confirmação do estorno com texto aprovado.

## Verificação

Testes transacionais usam PostgreSQL isolado (PGlite): faturar, estornar, refaturar e cancelar,
com preservação do histórico, parcelas antigas e estoque. Tipagem, validadores Avanta/Ava,
filtros, sincronização da ponte, concorrência de snapshots e permissões conferidos localmente.
Rolagem no navegador: cabeçalho top=0 com scrollY=281 no desktop e scrollY=2697 no mobile;
alturas compensadas de 80px/64px. Popups com margem de 16px em telas de 480px e 360px.

Sem nova migração. A migração de restauração da entrega 514 já estava aplicada; não reaplicar.
Nenhum pedido real foi criado/faturado/estornado para validar a entrega. A prévia usa dados
fictícios; os testes de gravação usam banco isolado. O gate completo será executado na Vercel.
Recibo de envio, SHA, resultado remoto e métricas ficam no registro ignorado output/pipeline.

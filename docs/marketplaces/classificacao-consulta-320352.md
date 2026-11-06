# Marketplaces - classificação e consulta automática - 3.2.0.353

**Correção aprovada pelo responsável. Publicação autorizada em 06/11/2026; registro final vinculado ao recibo de entrega.**

## Escopo acordado

Corrigir a classificação dos pedidos e as tentativas repetidas, preservando Resolver, Conferir saldos e a consulta automática. Fiscal fora desta entrega. Esta versão substitui a proposta de suspensão de consultas da revisão isolada anterior.

## Base e restauração

- Base de fontes 3.2.0.351, commit `d9da5093945b395df5360211bad278f1853727fb`.
- Pacote isolado de publicação `/private/tmp/avanta353-marketplaces-publicacao`, sem alterar os fontes da raiz compartilhada.
- Bundle completo da base criado e verificado antes das edições em `/Users/JEFF/avantalab/backups/pontos-restauracao/marketplaces-classificacao-consulta-2026-11-05/base-351.bundle`.
- Produção 3.2.0.351 e fila foram revalidadas antes do preparo. A correção aprovada foi renumerada de 352 para 353 para evitar conflito com outro trabalho em preparação; nenhum comportamento adicional foi incluído.

## Comportamento

| Situação | Antes | Preparado nesta entrega |
|---|---|---|
| ML confirma coleta/postagem/centro de distribuição, mas mantém `ready_to_ship` | Filtro e aviso ainda podiam pedir despacho | Grupo Em trânsito, texto e ação de etiqueta coerentes; atualização periódica continua até concluir |
| Mesma divergência de saldo, sem autorização de reposição | Nova tentativa contabilizada a cada consulta, com intervalo máximo de 15 minutos | Continua pendente e consultando; repetição do mesmo diagnóstico não infla o contador e agenda próxima leitura em 30 minutos |
| Saldo corrigido diretamente no ML | Próxima rodada reconhece o resultado | Mantém a releitura automática. Observação validada que alcança ou ultrapassa o alvo antecipa a rodada, sem autorizar aumento |
| Resolver confirma uma nova tentativa | Nova geração, envio prioritário e conferência de retorno | Mesmo fluxo, sem introduzir espera de 30 minutos nessa nova confirmação |
| API indisponível, retorno incerto ou bloqueio técnico | Backoff e proteções existentes | Mantidos; contador continua registrando novas tentativas técnicas |

- Não existe coluna `requires_review`, suspensão definitiva ou novo estado manual de estoque neste pacote.
- Anúncios pausados continuam sem novo aviso apenas por diferença de saldo. Nenhuma pausa é desfeita automaticamente.
- Reconhecer quantidade externa não baixa venda, não muda saldo físico local e não confirma `synced` sem a verificação existente do worker.
- A correção de classificação considera sinais explícitos de avanço do envio. Estados de preparação, pagamento, cancelamento, devolução e pós-venda preservam sua prioridade.
- O evento de anúncio passa pelo GET e validação de seller já existentes antes da observação no banco. O payload do webhook não autoriza atualização de quantidade.

## Preservação do fluxo e do fiscal

Os hashes de dez arquivos foram comparados com a base 351 e permanecem iguais, incluindo StockSync/Resolver, seu serviço de confirmação, o envio após commit, o painel e os textos das pendências, e os serviços/rotas fiscais de Marketplaces.

Evidência: `output/marketplaces-classificacao-consulta-2026-11-05/fluxos-preservados.json` na raiz compartilhada.

A conferência de produção identificou a proteção `usuario_area_rpc_restricao` na observação de anúncio; a migração preserva esse bloqueio de acesso, com teste executável de recusa.

## Validação

- 71 testes direcionados aprovados, zero falhas: resolução de saldos, notificações, isolamento, correção externa, preservação de pausa, retry técnico, equivalência SQL/TypeScript e continuidade até concluir o pedido.
- 603 testes de segurança aprovados, zero falhas.
- PADRÃO AVANTA 1.23.1 e manuais da Ava 3.2.0.353 validados.
- Lint sem erros; aviso preexistente de parâmetro não utilizado em teste.
- Prévia estática com os componentes existentes e dados fictícios: desktop claro/noturno e largura móvel de 390px sem transbordamento horizontal. Nenhum painel novo ou alteração na posição dos controles.
- Build local completo da revisão aprovada: 2.624 testes aprovados, zero falhas e seis testes condicionais ignorados pelo runner existente; compilação, TypeScript e geração de 234 páginas concluídos. A embalagem 353 repetiu os 71 testes focados e os 603 de segurança, incluindo a proteção de área vigente; o gate completo remoto continua obrigatório. Nenhum gate foi removido ou contornado.

## Publicação futura

1. Obter autorização do responsável; não publicar somente porque os testes passaram.
2. Conferir novamente produção, fila, versão e base, incorporando somente este escopo à base vigente.
3. Fazer backup das definições das funções/views afetadas e conferir invariantes de saldo/eventos antes de aplicar a migração preparada `20261105234500_marketplace_shipment_retry.sql`.
4. A migração atualiza classificação e o agendamento da conferência após observação validada. Não cria coluna ou estado na fila, não modifica regra de baixa ou o comando do Resolver.
5. Usar o pipeline oficial, com identificação Git e gate remoto completo. Conferir os retornos sem escolher saldo físico pelo usuário.

## Referência

[Mercado Livre: gerenciamento de envios, estados e substatus](https://developers.mercadolivre.com.br/pt_br/gerenciamento-de-envios).

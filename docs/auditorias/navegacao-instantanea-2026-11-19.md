# 3.2.0.496 — Menu compacto e abertura imediata

Base: main `b165835e9bd2cf9befb0747446733b427e35c871`, produção
`dpl_4ePfnHShcmkYPbTyt1mLN7QqGkxp` (3.2.0.495). Pacote isolado em
`/private/tmp/avanta-custos-catalogos-20261118`; raiz canônica preservada.
PADRÃO AVANTA consultado: 1.24.0. Sem SQL ou alteração de máquina/build.

## Apresentação não é autorização

- Abertura do botão apenas alterna o painel, sem consulta. Usa a prévia do login
  por usuário/empresa, observável via `useSyncExternalStore`. A seleção exige
  HTTP autenticado novo (sem reutilizar recuperação em andamento), confirmação
  do mesmo usuário e política de dispositivo antes da rota oficial.
- Respostas antigas não podem ressuscitar módulos/vínculos removidos. Logout
  remove a prévia antes de notificar seus consumidores; troca de empresa ou
  usuário não mistura os perfis. Erro de rede não vira liberação.
- Cache em sessionStorage continua com chave v1 e validade de 30 minutos;
  campo opcional de revisão mantém compatibilidade com prévias anteriores.
  Recuperações confirmadas renovam a apresentação. Não armazena tokens.

## Atualização sem esperar outro clique

- Instalação/remoção na Gestão atualiza a prévia após confirmação e avisa os
  assinantes; storage sincroniza o host com seus iframes. APIs de ativação,
  remoção, cancelamento, pagamento e permissões emitem evento Realtime.
- Ativação legada por RPC na Web e no mobile também avisa os assinantes.
  O mobile usa o transporte já disponível, com fallback sem bloquear ativação;
  nenhum plugin, permissão do sistema ou publicação nativa foi adicionado.
- Canal por empresa carrega somente aviso vazio de invalidação. Mesmo um aviso
  forjado só pode pedir nova leitura autenticada; nunca concede um acesso.
  Coalescência limita disparos; consultas de recuperação são deduplicadas.
- Janelas conectadas atualizam a lista em segundo plano, inclusive aberta.
  Reconexão/foco e recuperação de até um minuto cobrem eventos perdidos e
  vencimentos. Sem conexão não se promete sincronização imediata. Prévia ausente
  em entrada direta prepara a lista uma vez, independentemente do clique.
- Falha do aviso não desfaz instalação/remoção já confirmada, nem altera período
  pago ou regras comerciais. Política de autorização permanece no servidor.

## Evidências

- Testes executáveis contam zero consultas em abrir/reabrir, bloqueiam destino
  revogado/dispositivo recusado e verificam rota oficial após validação.
- Cobrem cache observável, outro usuário/empresa, storage entre janelas,
  respostas fora de ordem, logout, deduplicação, seleção com consulta forçada,
  falha HTTP e limpeza do canal. Fixtures de API receberam o novo notificador;
  as verificações anteriores de segurança foram mantidas.
- Suíte local de módulos/usuários/cobrança: 774 aprovados, zero falhas.
- Transporte Realtime real: emissor servidor e receptor em canal temporário
  aleatório receberam aviso vazio com sucesso; nenhum registro, módulo ou
  permissão de cliente alterado. Canais removidos após a verificação.
- Layout compacto já verificado em desktop/mobile/escuro: painel 320px, seis
  linhas de 44px e nenhuma descrição; mesma lista autorizada e selo Atual.

Esta entrega inclui a compactação aprovada que ainda não havia sido publicada.
A suíte completa, compilação e guardas do pipeline remoto continuam obrigatórias.

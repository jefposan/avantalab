# Changelog

## Em desenvolvimento

- Mobile: ajuste de contraste do botão Configuracoes no modo escuro e refinamento do arraste do Kanban com placeholder invisível e auto-scroll.
- Versionamento: ajustes grandes apos a 1.3.5 consolidados na linha 1.3.6.x, com micro ajustes na quarta casa.
- Admin: lista de perfis reorganizada com tipo, situacao e origem do acesso; acao Resetar removida da interface.
- Admin: Liberar passa a conceder cortesia com acesso ilimitado ou periodo definido, e Revogar aparece apenas para cortesia/cupom vigente.
- Cobranca: migracao adicionada para liberar todos os perfis existentes por cortesia sem prazo.
- Web: AvantaShell atualizado com silhueta frontal em SVG continuo, removendo a emenda visual da curva do plato.
- Web: AvantaShell separado da skin visual; o padrao passa a fornecer somente a modelagem do header/recorte.
- Web: card de Lancamentos Mensais do dashboard aplicado ao formato AvantaShell mantendo a paleta do sistema.
- Web: ajuste fino do AvantaShell no dashboard com header mais baixo, quina esquerda quadrada, borda esquerda restaurada e chapa de fundo com cor primaria esmaecendo para transparente.
- Web: ano do card de Lancamentos Mensais movido para o topo direito do header AvantaShell.
- Web: ajustes aprovados do AvantaShell consolidados em preset reutilizavel para aplicar o mesmo padrao em outros cards.
- Web e mobile: area de assinatura com plano, proximo vencimento, historico de faturas, segunda via, troca de ciclo e cancelamento da renovacao.
- Cobranca: carencia de tres dias para pagamentos vencidos, com aviso persistente ate pagamento ou cancelamento.
- Cobranca: cancelamento preserva o acesso ate o fim do periodo efetivamente pago.
- Cobranca: webhooks idempotentes, historico financeiro e conciliacao automatica com a Asaas.
- Ponto: respeita a situacao da assinatura da empresa, mantendo acesso durante a carencia.

## 1.3.5 - 2026-07-03

- Web: novo resumo diario do Controle de Ponto no dashboard.
- Web: Kanban do dashboard e graficos mais fluido e organizado.
- Mobile: sessao mais estavel com Manter conectado.
- Mobile: menu redesenhado, com novos icones, cores e controles.
- Mobile: modo escuro aprimorado, incluindo a adaptacao do card da Ava.
- Mobile: header renovado, com seletor de periodo mais legivel.
- Web e mobile: cards, popups e menus com a nova identidade visual assimetrica.
- Web e mobile: Ava e tutoriais atualizados com os recursos atuais do sistema.
- Web e mobile: diversas correcoes de navegacao, rolagem, animacoes e responsividade.
- Push: comunicados, agenda e despesas separados dos lembretes exclusivos do PWA Ponto.

## 1.3.4 - 2026-07-02

- Web e mobile: cadastro de despesas padronizado, com nomes de despesas e categorias em formato de frase e edicao disponivel na lista web.
- Web e mobile: avisos de receitas e despesas previstas permanecem visiveis ate confirmacao ou exclusao.
- Web: o sininho recebe em tempo real os avisos de despesas destinados a toda a empresa.
- Push: usuarios vinculados a varios perfis recebem os avisos de despesas de cada perfil em seus aparelhos inscritos.
- Web e mobile: o primeiro login tolera falhas transitorias ao carregar perfis sem encerrar uma sessao valida.
- Dashboard web: novo card de controle de ponto com atrasos, faltas e jornadas incompletas atualizados em tempo real.
- Novos perfis de empresa e pessoais recebem uma lista inicial de despesas totalmente editavel e excluivel.
- Mobile: arrastar cards do dashboard bloqueia temporariamente o gesto de puxar para atualizar.
- Mobile: o grafico por tipo de despesa permite abrir os lancamentos que compoem cada total.
- Web: os blocos de despesas de cada mes permitem consultar os lancamentos que compoem seus valores e percentuais.
- Ava mobile: chat fullscreen com cabecalho fixo, campo ajustado ao teclado, nova conversa e retorno ao dashboard sem recarregar.
- Admin: painel responsivo reorganizado, mensagens arquivaveis e historico de disparos.
- Ponto: lembretes opcionais de entrada e saida, enviados antes e no horario quando o registro estiver pendente.
- Web: ajustada a posicao do menu de Ajustes para acompanhar a altura reduzida do header principal.

## 1.3.1 - 2026-06-22

- Agenda web/mobile: exclusao sincronizada, confirmacao ao excluir no web e atualizacao em tempo real.
- /admin: disparo de avisos (push + sino) para todos os usuarios; sino do web passa a ler as notificacoes do Supabase.
- Ava (IA) atualizada para gpt-4o com prompt revisado; balao periodico de boas-vindas da Ava no web.
- Tutorial reescrito (desktop e mobile) com a Ava em destaque e recursos atuais.
- Correcoes mobile: campo coberto pelo teclado (Android), scroll de cards, menu de Configuracoes (rolagem e sub-botoes).
- Header web: indicador deslizante das abas; card do chat com header colorido.
- Troca de perfil no web com loading imediato.
- Limpeza: removido componente ChatIA nao utilizado.

## 1.3.0 - 2026-06-22

- Notificacoes push (PWA mobile): inscricao por aparelho, service worker, sino com contador de nao lidas e badge no icone; convite para ativar na primeira abertura.
- Agenda no servidor (Supabase) com disparo automatico diario de push para lembretes do dia; exclusao de lembretes e de ocorrencias unicas.
- Agenda sincronizada entre web e mobile (mesmo perfil compartilha os lembretes).
- Botao de notificacoes vira "Ativar / Desativar"; icones de Agenda e Notificacoes padronizados em SVG.

## 1.2.5 - 2026-06-21

- Cadastro de despesas (mobile): ao tocar numa despesa da lista para abrir as opcoes/editar, a lista interna mantem a posicao do scroll em vez de voltar ao topo. Corrige o container de rolagem correto (lista de despesas cadastradas dentro do modal).

## 1.2.4 - 2026-06-21

- Corrigido de fato o scroll do cadastro de despesas no mobile: ao tocar numa despesa para editar, a lista mantem a posicao (preserva o scroll do container interno do modal) em vez de voltar ao topo.

## 1.2.3 - 2026-06-21

- Corrigido o scroll da lista de despesas no mobile: ao abrir acoes ou editar um lancamento, a lista mantem a posicao em que estava em vez de voltar ao topo.

## 1.2.2 - 2026-06-21

- Ajustado aviso de confirmacao da importacao limpa do backup.
- Mobile passa a abrir no ultimo perfil financeiro selecionado pelo usuario.

## 1.2.1 - 2026-06-21

- Ajustada a escolha do modo de restauracao do backup para opcoes compactas com selecao por radio.

## 1.2.0 - 2026-06-21

- Restauracao de backup com escolha entre atualizar dados e importar copia limpa substituindo os dados financeiros pelo backup.
- Modo substituir protegido por confirmacao textual e ponto de restauracao antes da importacao.

## 1.1.4 - 2026-06-21

- Logo removida do conteudo do backup para evitar base64 truncado e erro no Excel.

## 1.1.3 - 2026-06-21

- Corrigido erro de limite de caracteres do Excel ao gerar ponto de restauração.

## 1.1.2 - 2026-06-21

- Corrigida importação de entradas no backup restaurado e mensagens de erro da restauração.

## 1.1.1 - 2026-06-21

- Corrigida seleção de arquivo na restauração de backup.

## 1.1.0 - 2026-06-21

- Backup completo em Excel estruturado para portabilidade e restauração.
- Importação conservadora de backup em modo adicionar dados ausentes.
- Geração de ponto de restauração antes da importação.

## 1.0.1 - 2026-06-21

- Corrigido espaçamento e destaque ativo do menu web no header.

## 1.0.0 - 2026-06-21

- Versão base oficial do AvantaLab Gestão.
- Sistema web e mobile com login, perfis financeiros, lançamentos, dashboard, relatórios e backup inicial.

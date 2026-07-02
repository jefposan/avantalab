# Changelog

## 1.3.9 - 2026-07-02

- Ava mobile: o chat agora abre em portal fullscreen sobre o dashboard, mantendo a pagina montada para que voltar e inicio fechem o chat sem recarregar no Android ou iOS.

## 1.3.8 - 2026-07-02

- Ava mobile: adicionado botao SVG para iniciar uma nova conversa e limpar o historico atual.
- Ava mobile: os botoes voltar e inicio retornam ao dashboard pela mesma navegacao, sem recarregar a pagina mobile.

## 1.3.7 - 2026-07-02

- Ava mobile: eliminado o deslocamento automatico ao focar o campo no iOS e Android; o header fica fixo diretamente no viewport e somente conversa e campo se acomodam ao teclado.

## 1.3.6 - 2026-07-02

- Ava mobile: o teclado agora ajusta somente a area interna da conversa e o campo de digitacao, mantendo o header fixo e o shell do chat imovel.

## 1.3.5 - 2026-07-02

- Ava mobile: chat movido definitivamente para uma rota fullscreen independente, com header fixo, mensagens rolaveis e campo de digitacao ancorado acima do teclado.
- Ava mobile: bloqueio completo do scroll e fundo opaco durante a conversa, com ajuste de altura pelo VisualViewport no Android e iOS.

## 1.3.4 - 2026-06-23

- Web: ajustada a posicao do menu de Ajustes para acompanhar a nova altura reduzida do header principal.

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

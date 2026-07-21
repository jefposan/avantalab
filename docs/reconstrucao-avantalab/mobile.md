# Mobile (`/mobile`) — estrutura e comportamento

Implementação: `public/mobile-app.js` (~12.600 linhas, JavaScript vanilla, IIFE).
Monta HTML em strings; `render()` reconstrói o `innerHTML` de `#mobile-root` a cada
mudança de estado (objeto único `state`). A página Next `app/mobile/page.tsx` é só a
casca: injeta `data-supabase-url`, `data-supabase-anon-key`, `data-cobranca-ativa`,
`data-app-version`, um bloco `<style>` com animações e o dark mode `.mobile-dark`,
e carrega `/mobile-supabase.js` + `/mobile-app.js?v=NNN`.

## Comportamentos estruturais

- Desktop (largura ≥1024, UA não mobile, fora de standalone) é redirecionado para `/`.
- Sem conexão/config → tela "Conexão necessária".
- Service worker `public/mobile-sw.js`: cache do shell (network-first para navegação/API), push handler, `CACHE_NAME='avantalab-mobile-vNNN'`.
- Pull-to-refresh próprio (puxada longa com indicador de progresso).
- Sessão: "Manter conectado" = 30 dias renováveis; último perfil lembrado em `localStorage`.

## Telas de acesso (função `telaAcesso`/`state`)

`telaBoasVindas` → `telaLogin` (e-mail/login + senha; Google OAuth; mostrar senha) →
`telaSenha` (recuperação por SMS) → `telaCadastro` (nome, perfil, e-mail, DDI+telefone
com verificação SMS, senha, termos, cupom) → `telaCriarPerfilInicial` (tipo
empresa/pessoal; trial/assinar quando cobrança ativa) → `telaCadastroPerfilMobile`
(cadastro fiscal 7 dias) → `telaTelefoneObrigatorioMobile` (contas sem telefone
confirmado) → `telaPaywallMobile`/`telaPaywallSelecaoMobile` (cobrança) →
`telaRedirecionandoPonto` (papel funcionario_ponto → `/ponto`) → `telaApp`.

## Tela principal (`telaApp`)

- Header fixo: hambúrguer (`#menu-toggle`), "Olá, [nome]" + "Bem-vindo ao AvantaLab", sino (`#avisos-dashboard`) à direita; abaixo, grid com card do ano (`anoHeaderHtml()`, `<select id="ano">` transparente sobreposto) e seletor de mês (`#mes-anterior`/`#mes-proximo`); linha "ⓘ Período ativo • Mês/Ano". Conteúdo usa `padding-top` fixo (152px dashboard / 168px agenda) — ajustar junto com a altura do header. IDs com handlers não podem mudar.
- Dashboard: cards ordenáveis/ocultáveis (Menu > Organizar resumo), valores financeiros iniciam ocultos (olho para revelar; preferência `avantalab_web_iniciar_valores_ocultos` análoga no web). Cards: resumo financeiro, saldo, a confirmar, evolução mensal, registrar entradas, caixinha, meus perfis (troca rápida), ponto (gestor) e acesso ao Vendas Mobile quando módulo ativo (`vendasMobileModuloAtivo`).
- Barra inferior fixa: Início | atalho esquerdo | Lançar (central) | atalho direito | Menu. Atalhos laterais personalizáveis (Menu > Organizar atalhos): perfil, agenda, modo escuro, despesas fixas. Início fecha telas e volta ao dashboard; Menu alterna o menu lateral.

## Menu lateral (`menuLateralHtml`)

Itens confirmados: Agenda, Avisos e notificações, Mostrar/ocultar cards, Organizar
atalhos, Cadastrar despesas, Despesas fixas, Instruções sobre categorias, Tutorial,
Vendas Mobile (quando ativo). Também: perfil (editar/criar/trocar/excluir), usuários
(criar/vincular/editar), backup (via `BackupMobileBridge`, React), assinatura/premium
(`abrirAssinaturaMobile`, `abrirPremiumMobile`), feedback, sobre/changelog, tour,
notificações push (opt-in), sair.

## Funcionalidades financeiras

Paridade com o web (mesmas tabelas): lançar despesa (avulsa/futura/parcelada/fixa),
receitas (entrada diária/total mensal), confirmar previstas, caixinha, duplicados,
notas por foto (câmera + `ler-lancamento-foto`), busca nos lançamentos, despesas
fixas (recorrências com projeção), relatórios simplificados nos cards. Realtime do
Supabase mantém web e mobile sincronizados; recarga automática quando o dia vira
(`diaUltimoCarregamento`).

## Agenda

Calendário mensal com marcadores distintos para lembretes e despesas; seleção de dia
lista os itens; lembrete com repetição diária/semanal/quinzenal/mensal/anual;
exclusão de ocorrência única; formulário `agendaFormAberto`. Sincronizada com
`agenda_itens` para o push diário do servidor.

## Ava no mobile

Botão/atalho abre tela independente em tela cheia (`/mobile/ava`, React
`AvaChatClient` + ponte `AvaMobileBridge`). Também há chat embutido no estado
(`chatIA*`) com gravação de áudio (Whisper). Header fixo, ajuste ao teclado, conversa
mantida na sessão até "Nova conversa". Detalhes em [ava-e-ia.md](ava-e-ia.md).

## Diferenças relevantes web × mobile

- Web usa React/kanban dnd-kit; mobile é HTML string + drag próprio.
- Dark mode no mobile é classe `.mobile-dark` com overrides `!important` (definidos na casca `page.tsx`).
- O paywall e o premium têm telas próprias no mobile (mesma lógica `cobranca.ts` espelhada em JS).
- Backup/restauração e conteúdo do Vendas usam "bridges" React montadas fora do root vanilla (`BackupMobileBridge`, `VendasMobileConteudoBridge`).

## Regras de manutenção

- Validar com `node --check public/mobile-app.js` antes de publicar.
- Preservar IDs com handlers; bump de `CACHE_NAME` no `mobile-sw.js` e `?v=` em `app/mobile/page.tsx` apenas ao fechar pacote de mudanças.

# Interface e Design System

## Identidade

- Cor institucional: **#003E73** (azul AvantaLab) — theme color dos PWAs, `cor_primaria` padrão dos perfis, bordas de botões do header web.
- Cada perfil personaliza `cor_primaria` (e logo); derivações de cor via `color-mix` a partir dela (padrão AvantaShell).
- Vendas Mobile tem paleta própria teal: `--azul #00b3a9`, `--ciano #30c7d6`, hover `#009990`, fundo `#f8fafc`, texto `#0f172a`, muted `#64748b`, borda `#dbe5ef`, sombra teal suave; theme color do manifest `#55b9b1`/`#003E73`.

## Tipografia (`app/globals.css`)

- Família: system stack + Inter (`--av-font-family`; fonte via `app/lib/fonts.ts`).
- Tokens: pesos body 400 / control 500 / subtitle 500 / title 600; line-heights 1.5/1.2/1.35/1.2; letter-spacing de título −0.01em.
- Classe global `.typography-system` aplica a hierarquia; `font-black/bold` são normalizados para o peso de título (600).

## Cards — padrão AvantaShell (quando solicitado)

Fonte: `planejamento/padrao-avanta-card.md`; componente `app/components/AvantaCard.tsx`
(+`AvantaCard.module.css`); preset `criarAvantaShellPreset({corPrimaria, darkMode})`;
demo `/avanta-card-demo`. Anatomia: CHAPA (card de trás, largura total, título) +
CORPO (frente, topo reto no vale, subida ao platô em "S" contínua feita por um único
`<path>` SVG `viewBox 0 0 1000 108`) + PLATÔ (~25% do topo direito, só controles:
alça de arrasto 2×3 pontinhos e menu "…"). Tokens: `--topo 78px`, `--raio 30px`,
`--plato-w 25%` (reduzidos no breakpoint 640px). Regras: shell não define cor
(skin vem da tela por variáveis `--avanta-*`); nunca recriar a curva com CSS;
sem bordas de 1px internas; subcards usam raio menor (hierarquia de raios).
Usar AvantaCard/AvantaShell quando solicitado pelo usuário ou exigido por
briefing, manifesto ou especificação. Nos demais cards, manter tipografia,
tokens, superfícies, raios, responsividade e acessibilidade gerais do sistema.

## Web (Gestão)

- Header escuro (slate-800/900) com botões de ajuste pequenos (text-xs, bold, borda na `cor_primaria`, ícones SVG inline 3.5), tooltips (`Tooltip.tsx`, posição bottom).
- Dashboard kanban: colunas com drag (dnd-kit), cards expandem para largura total, encaixe reorganiza durante o arraste; menu por card (Expandir/Reduzir/Remover bloco); lápis "Organizar blocos".
- Popups arrastáveis pelo cabeçalho, limitados à viewport (`DraggableModalCard`); scroll lock (`WebPopupScrollLock`, classe `av-popup-scroll-lock`).
- Dark mode do web controlado por `configuracoes.dark_mode`.
- Landing: `LandingPage.tsx` + `LandingPage.module.css`, fundos em `public/images/landing/` (hero webp/png, logo).

## Mobile (`/mobile`)

- Fundo fixo `bg-avantalab-mobile-1080x1920.webp` (image-set com PNG; `background-attachment: fixed`, scroll no iOS), cartões glass (bg-white/25 + blur) nas telas de acesso.
- Dark mode: classe `.mobile-dark` com overrides `!important` (fundos → #0f172a, bordas → rgba(148,163,184,.28), textos → #f8fafc/#cbd5e1), inclusive inputs.
- Animações nomeadas na casca: menu lateral (menuSlideIn/Out + overlay), chat Ava (avaBounce/avaPulse/avaFadeUp/avaSlideIn), agenda (agendaInProx/Prev), pull-to-refresh (spin + glow "ready"), submenus de configurações (configSubIn/Out).
- Sub-botões de Configurações com marcador • (`.cfg-sub-group`).
- Valores financeiros iniciam ocultos com ícone de olho.

## Vendas Mobile

- Cards/sheets: borda 1px `rgba(219,229,239,.95)`, fundo branco, sombra teal, `backdrop-filter: blur(14px)`; raio ~12px; bottom-sheets bloqueiam scroll (`sheet-open`, body fixed).
- Clique: `button.button-pressed` → `scale(0.965)` 110ms.
- Tema escuro: classe `dark-theme` no `<html>`, persistida no estado local.
- Sala de botões com ícones PNG dedicados (assets `1_Dashboard.png`…`9_Informações.png`, `home-button.png`). O fundo é integralmente CSS: base clara/escura e duas ondas orgânicas que nascem no rodapé e se estendem até a região intermediária nas cores AvantaLab (`#0A1F44`, `#1687D9` e `#00A6C8`). As próprias curvas alteram intensamente geometria, inclinação, altura, escala e posição em ciclos contínuos independentes (`vendas-wave-dance-one` e `vendas-wave-dance-two`), com linhas e pontos luminosos acompanhando a deformação. No tema claro, contornos e manchas usam opacidade maior para permanecerem visíveis; no escuro, conservam a saturação luminosa. Em `prefers-reduced-motion: reduce`, essas animações são desativadas.
- O popup **Novo lançamento**, aberto pelo botão `+` do menu inferior, apresenta Pedido e Pagamento como ações paralelas da mesma família cromática: Pedido em azul-marinho → azul (`#0A1F44` → `#1267B1`) e Pagamento em azul → turquesa (`#1687D9` → `#00A6C8`). Ambos preservam texto e SVG brancos, borda translúcida e sombras equivalentes.
- Menu inferior com ícones SVG inline (`svgIcon`) — estáveis, sem sprite remoto.
- Tela "Preparando acesso" (splash) durante bootstrap dos scripts.

## Logos e regras de uso

| Arquivo | Uso |
|---|---|
| `public/images/AvantaLab_pos.png` | logo positiva (fundo claro) |
| `public/images/AvantaLab_neg.png` | logo negativa (fundo escuro) |
| `AvantaLab_pos_vendas.png` / `AvantaLab_neg_vendas.png` | variantes Vendas |
| `logo padrão AvantaLab.png` | logo padrão |
| `ava-logo-principal/fundo-claro/fundo-escuro.png` | Ava (escolher pela luminosidade do fundo) |
| `vendas-mobile/assets/logo-vendas-claro/escuro.png` | Vendas Mobile por tema |

Regra: tema claro usa logo "pos"/"claro"; tema escuro usa "neg"/"escuro".

## Estados e acessibilidade

- Botões de senha com alternância mostrar/ocultar (ícone eye/eye-off + aria-label).
- Carregamentos: telas "Preparando acesso" padronizadas (web `TelaCarregandoSistema`, mobile/ponto/vendas com card glass central), spinners `.loader`.
- Badges de status: Previsto (despesas/receitas futuras), status de pedidos e pagamentos no Vendas, chips de status no /admin.
- Desativados: opacidade reduzida + cursor bloqueado (padrão Tailwind) — detalhes por tela.

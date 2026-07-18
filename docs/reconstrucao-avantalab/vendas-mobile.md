# Vendas Mobile (`/mobile/vendas`)

PWA para vendedor autônomo/porta a porta. Fonte: `vendas_mobile/app/` (app.js ~4.400
linhas vanilla JS, styles.css ~2.000 linhas, config.js, supabase-client.js, sw.js,
manifest.webmanifest, assets). O build (`scripts/sync-vendas-mobile.mjs`, executado em
`npm run dev/build`) copia tudo para `public/vendas-mobile/` — NUNCA editar a cópia.
A página `app/mobile/vendas/page.tsx` injeta `window.VENDAS_MOBILE_CONFIG`
(URL/anon key do Supabase) e carrega os scripts em cadeia com `?v=<assetVersion>`
(constante `assetVersion` na própria página; atualizar a cada release de assets).
Regras de banco e RPCs: [banco-supabase.md](banco-supabase.md);
regras de negócio: [fluxos-e-regras.md](fluxos-e-regras.md) §6–§7 e §9.

## Autenticação e acesso

- `supabase-client.js` expõe `window.VendasDb` com storageKey próprio (`avantalab-vendas-mobile-auth`): signIn e-mail/telefone, signUp (etapas: dados → verificação SMS via `/api/vendas/telefone/confirmar`), Google OAuth (`signInWithGoogle` com redirect de volta ao app; flag `google_connecting` em sessionStorage), recuperação de senha (`/api/vendas/senha/*` + `resetPasswordForEmail`).
- Após login, `loadAll()`: busca acesso (`meus_acessos_vendas_mobile_rpc` + última solicitação); sem acesso → tela de solicitação por código `AVA-XXXXXXXX` (`solicitar_acesso_vendas_mobile_rpc`) com estado "Aguardando aprovação"; com acesso → verifica módulo ativo (`modulo_vendas_mobile_ativo_rpc`), carrega vínculos comerciais e perfis financeiros, e sincroniza catálogo (`sincronizar_catalogo_vendas_mobile_rpc`).
- Módulo desativado (`moduloVendasAtivo=false`) → app em modo leitura (backup), escrita bloqueada pelo RLS.
- Estado persistido em `localStorage` (`avantalab.vendas_mobile.v1`).

## Sala de botões (home) e navegação

- Grade de botões com ícones PNG (assets `1_Dashboard.png` … `9_Informações.png`), ordem padrão `SALA_BOTOES_PADRAO`: Dashboard, Clientes, Produtos, Pedidos, Pagamentos, Agenda, Novidades, Divulgação, Informações. Modo organizar: lápis liga arrastar-e-soltar (pointer events), ordem salva em `state.ordemSalaBotoes`.
- Na abertura com sessão válida, o app mantém **Preparando acesso** enquanto `loadAll()` consulta o Supabase e pré-carrega/decodifica os nove PNGs da sala e as duas versões do logo, em paralelo. A sala só é renderizada ao final desse conjunto; cada imagem possui limite de segurança de 7 s para uma falha de rede não prender o acesso. Assim não deve existir sala parcialmente vazia em cache frio.
- `jszip.min.js` não participa mais do carregamento inicial: `carregarBibliotecaZip()` o busca somente quando o usuário inicia uma importação de pacote ZIP.
- A tela **Preparando acesso** usa o mesmo fundo do login, mas fixa a altura e o pseudo-elemento do fundo durante todo o processo: não há animação, redimensionamento ou reposicionamento visual do background. Em mudança de orientação, `orientationchange` reconstrói a sala após 240 ms; a troca de breakpoint em `resize` também é detectada. Isso impede que o menu lateral temporário da paisagem deixe a grade corrompida ao voltar ao retrato.
- Menu inferior fixo: Início (sala) | atalho esquerdo | atalho direito | Menu. Atalhos configuráveis (`ATALHOS_INFERIORES_VENDAS`): Modo escuro (padrão esq.), Dashboard, Clientes, Produtos, Pedidos, Pagamentos, Agenda (padrão dir.), Divulgação — organizados em Configurações > Organizar atalhos.
- Abas (`state.aba`): `dashboard`, `clientes`, `produtos`, `vendas` (pedidos), `vender`/`pagamentos`, `novo-pedido`, `consignado`, `agenda`, `divulgacao`, `novidades`, `informacoes`, `importar`, `resumo`, `configuracoes`.
- Botão "Abrir Gestão" leva ao `/mobile` (`abrirGestao`).

## Telas

### Dashboard
Filtro por período (início/fim, mês de referência), meta do período (`metaMensal`),
indicadores: total vendido, nº de pedidos, ticket médio, unidades, Top 10 Produtos,
Top 10 Clientes, rentabilidade (usa `preco_custo` dos itens), estoque consignado,
clientes inativos (dias configuráveis `dashboardDiasInativos`), aniversariantes
(destaque rotativo `cardsClientesEmDestaque`), movimento financeiro.

### Clientes
Cadastro/edição (nome, documento, telefone/WhatsApp com botão direto
`abrirWhatsappCliente`, e-mail, endereço com busca CEP `campoCepCliente` e link de
mapas `abrirMapasCliente`, data de nascimento com limite de data, observações),
busca, ordem alfabética alternável, ficha do cliente com histórico de pedidos,
pagamentos (conta-corrente com saldo), agendamentos (`abrirAgendamentoCliente`) e
ações rápidas (novo pedido, pagamento).

### Produtos e catálogo
Lista com imagens, busca, ativar/desativar; cadastro compacto (marca, categoria,
SKU, nome — preserva siglas/nomes compostos —, descrição, preço, custo, promocional,
unidade, imagem convertida para webp e enviada ao bucket `vendas-produtos`);
importação XLSX (`carregarBibliotecaExcel` + modelo CSV `baixarModeloCsv`, registro
em `vendas_mobile_importacoes`); pacotes (Tridium demo `data/tridium-package.json`,
gerenciar pacotes próprios, importar pacote ZIP com imagens, exportar catálogo em ZIP
— ação alinhada ao título do catálogo); controle de estoque opcional por produto
(entrada/ajuste via `movimentar_estoque_vendas_mobile_rpc`, histórico de movimentos).

### Pedidos e vendas
Novo pedido (geral ou a partir do cliente): carrinho, quantidades, desconto por item
e total, itens bonificados, forma de pagamento informativa, observações; consignados:
pedido consignado com estoque consignado por cliente, conversão em venda
(`conversaoConsignadoRascunho`, status `convertida`), retorno. Lista de pedidos com
filtros (`filtroPedidos`), paginação (`limitePedidos`), editar e excluir com
confirmação. Não há cancelamento lógico de pedido: excluir remove definitivamente o
registro e atualiza os cálculos. No comprovante, Compartilhar usa azul claro,
Editar azul suave, Fechar neutro e Excluir vermelho.

Os comprovantes de pedido e consignado apresentam os itens em tabela compacta:
**Produto | Qtd | Preço | Total**. A tipografia e a distribuição seguem o padrão da
Tridium App; o produto pode quebrar em mais de uma linha, enquanto quantidade,
preço e total permanecem alinhados em colunas. Itens bonificados preservam a
etiqueta e exibem preço como `—` e total `R$ 0,00`.

Ao abrir um item em **Ver detalhes > Consignado, Pedidos ou Pagamentos**, o
comprovante recebe o contexto da aba e da página carregada. Fechar pelo botão ou
X retorna para a mesma lista; ao excluir um pedido confirmado, a lista é reaberta
já atualizada, sem obrigar o usuário a reiniciar a navegação pelo card do cliente.

### Pagamentos
Lançamento por cliente (valor, desconto, forma, data, observações) com saldo
anterior/final calculado; edição/exclusão com confirmação; lista por cliente
ordenada pelo último pagamento; comprovante de pagamento (tela).

### Agenda
Calendário mensal, agendamentos por cliente (visita etc.), mover item de data,
aniversários dos próximos N dias (`agendaAlertaAniversarioDias` configurável),
formulário inline, animações de transição.

### Novidades / Divulgação / Informações
Novidades: publicações da empresa do vínculo comercial ativo (histórico congelado
após desvinculação). Divulgação: pastas/subpastas e materiais (imagem/vídeo, capa
automática; expandir material, download "Arquivo hospedado"). Informações: conteúdos
globais do produto. Fontes: `vendas_mobile_conteudos`, `vendas_mobile_divulgacao_*`.

### Configurações (seções confirmadas no código)
Dados do usuário; Celular da conta (atualizar telefone com SMS); Senha da conta
AvantaLab; Aparência (modo escuro `temaEscuro`); Organizar atalhos; Meta do período;
Rentabilidade; Catálogo de produtos; Controle de estoque; Empresas e conteúdos
(vínculos comerciais: ativo + histórico, flags novidades/divulgação/catálogo,
"Desligar catálogo" com opção de remover produtos, novo vínculo por código);
Destino financeiro (perfil financeiro independente + "Confirmar destino");
Integração com Gestão (base de receita: por recebimentos ou por pedidos — só o
gestor do perfil financeiro altera); Aplicativo Web PWA (instalar/atualizar,
`atualizacaoPwaPendente`); Resetar sistema (digitar "RESETAR"; backup automático);
Sair (confirmação).

## Regras visuais e PWA

- Paleta em `:root` do styles.css: primário `--azul #00b3a9` (teal), `--ciano #30c7d6`, fundo `#f8fafc`, cards brancos com borda `#dbe5ef` e sombra teal suave; raio ~12px; gradiente hero teal→azul; tema escuro por classe `dark-theme` no `<html>`.
- Feedback de toque: classe `button-pressed` (scale 0.965); sheets bloqueiam scroll do body (`sheet-open`); ícones SVG inline via `svgIcon()` (estáveis, sem sprite externo).
- Manifest: nome "Vendas AvantaLab", start_url `/mobile/vendas`, theme `#003E73`, ícones `vendas-icon-*.png`. SW (`sw.js`): cache `avantalab-vendas-mobile-vN`, estratégia network-first com fallback ao cache.
- Logos específicas: `logo-vendas-claro.png` / `logo-vendas-escuro.png`.

## Cálculo e sincronização

- Receita → Gestão: automática por triggers no banco (por dia, base recebidos/vendidos), entrada "Vendas Mobile" imutável no Gestão. Consignado não conta como venda até a conversão; cancelados/convertidos fora da base "vendidos".
- Estoque: RPC garante trilha (saldo anterior/final); venda/cancelamento/consignação movimentam o saldo quando `estoque_controlado` — implementação da baixa automática no app: PENDENTE DE CONFIRMAÇÃO (conferir handlers de pedido em `app.js`).
- Catálogo: sincronização é aditiva e deduplication por `_catalogo_recebimentos`; excluir produto recebido marca recebimento como `removido` (não volta sozinho).

## Validações de formulário (principais)

- Cliente: nome obrigatório; nascimento limitado a datas passadas; CEP 8 dígitos via `/api/cep`.
- Produto: nome e preço > 0; custo ≥ 0; imagem ≤ 5 MB (jpeg/png/webp→webp).
- Pedido: ao menos 1 item; quantidades > 0; desconto ≥ 0.
- Pagamento: valor ≥ 0; data obrigatória.
- Cadastro de conta: senha com requisitos exibidos (`atualizarRequisitosSenhaCadastro`), SMS com contador de reenvio (`segundosReenvioSmsCadastro`).

# Preços e aparência — entrega local 3.1.0.44

Publicada na versão 3.1.0.47. PADRÃO AVANTA 1.19.2. Migração instalada e conferida em produção em 18/10/2026, sem registros de teste; detalhes em publicacao-precos-2026-10-18.md. Notas de desenvolvimento abaixo são históricas.

## Contrato

- Referência do card é o preço do cadastro local, editável por quem pode gerenciar produtos. Não é automaticamente a média de ofertas. Salvar usa a revisão existente do produto para impedir sobrescrita concorrente e não altera anúncios externos nem saldo.
- Mínimo/médio/ideal = referência × percentual / 100, arredondado a centavos. Padrões 50%, 70%, 90%, não descontos adicionais nem margem de lucro. Valores ausentes/configuração indisponível exibem traço, não zero inventado.
- Configurações do AvantaPreços mantém usuários e adiciona percentuais/aparência. Percentuais numéricos de 0,01 a 1.000 com até duas casas, mínimo ≤ médio ≤ ideal; regras no cliente, servidor e banco. Apenas gestor_master/administrador grava; leitores autorizados consomem.
- Settings por empresa via GET/PUT /api/modulos/marketplaces/precos/configuracoes, sem cache. Revisão otimista; duas edições concorrentes não se sobrescrevem. Falha mantém contexto e permite nova tentativa explícita.
- Aparência por empresa: profile/light/dark/system. Profile recebe o tema do shell; no PWA recebe dark_mode do perfil pela API. System acompanha prefers-color-scheme e eventos do aparelho. Não existe regra automática de 18h na implementação anterior inspecionada; nenhum horário fixo foi inventado.
- API de consulta e edição manual do histórico leem a configuração atual para novos cálculos. Histórico aberto e lotes salvos não são recalculados; lotes conservam o retrato salvo. O PWA mostra os valores gravados sem os rótulos fixos antigos 50/70/90, evitando atribuir percentuais novos a registros históricos.

## Banco e testes locais

Migração: supabase/migrations/20261018190000_marketplace_price_settings.sql. Tabela marketplace_price_settings com PK empresa, valores ordenados, revisão e auditoria de atualização. RLS; sem acesso direto para anon/authenticated, service_role somente pela API autorizada. Não altera tabelas de pedidos, histórico ou estoque.

Enquanto a tabela não existe, somente 42P01/PGRST205 permitem compatibilidade com os padrões e storageReady=false; interface avisa e não simula gravação. Outros erros retornam falha explícita.

Prévia /marketplaces/validacao-produtos usa componentes reais com dados fictícios em memória: edição de referência e configurações não acessam o banco. É exclusivamente desenvolvimento e retorna 404 em produção. Ensaiar com 200,00: 50/70/90 → 100/140/180; 60/80/100 → 120/160/200.

Antes de publicar: preparar pacote sobre a produção vigente, instalar a migração com autorização de publicação, conferir permissões e realizar ensaio autenticado Web/PWA. Não publicar a árvore compartilhada inteira.

## Validação local

- Suíte completa: 1.337 testes aprovados; rodada final direcionada de preços, consulta, interface, PWA e lotes: 62 aprovados.
- Migração executada em PGlite nos testes, incluindo regras de percentuais, RLS e bloqueio de leitura direta por authenticated. Não foi executada no Supabase de produção.
- Chrome: referência 200,00 recalcula 100/140/180; configuração 60/80/100 recalcula 120/160/200; validação de ordem, tema claro/noturno/automático e fechamento por Escape conferidos na demonstração em memória. Card em 320 px usa os três preços e não provoca overflow horizontal (documento 320 px).
- ESLint dos novos componentes, hook, serviço e endpoint aprovado. Verificadores PADRÃO AVANTA 1.19.2 e Ava 3.1.0.44 aprovados. Os três erros de efeitos já existentes no componente PWA não foram alterados nesta entrega.
- TypeScript do código app/ e declarações types/ aprovado com configuração temporária, sem mudar o tsconfig oficial. A conferência exclui artefatos outputs/ e o validador de desenvolvimento gerado de app/page.ts, já documentados como pendências externas a esta entrega.
- Evidências em output/marketplaces/precos-venda-44.png e configuracoes-precos-44.png. Sem publicação, build produtivo ou ensaio autenticado contra o banco real nesta entrega.
# Configurações compactas — revisão local 3.1.0.52

Em 19/10/2026, o modal Web foi compactado: título somente Configurações; Preços de venda e Aparência em setores lado a lado, Usuários abaixo. Removida a explicação de percentual solicitada pelo responsável, sem alterar o cálculo. Nome, login, senha e Salvar ocupam a mesma linha; na edição, Cancelar precede Salvar. Usuários aparecem um por página, com contagem e navegação, sem exclusão de dados. Permissões existentes não mudaram.

Validação: componente real com dados fictícios em `/marketplaces/validacao-configuracoes` (404 em produção), sem criar ou excluir login real. Notebook 1366 × 600 e largura 768 × 600: card de aproximadamente 495 px, sem rolagem vertical/horizontal; campos e ações de edição têm 44 px e a mesma posição vertical. Navegação/edição/cancelamento, inclusão fictícia, tema escuro, X/Escape e retorno do foco conferidos. Lista longa não aumenta a altura. Em viewport excepcionalmente pequena/zoom, rolagem de segurança mantém os controles acessíveis, sem cortar conteúdo.

Dois testes novos de renderização/estrutura e cinco de regras/API/banco aprovados; suíte completa com 1.368 aprovados, zero falhas. Tipagem do app e lint dos componentes aprovados; PADRÃO AVANTA 1.19.2/Ava revisados. Evidência: `output/marketplaces/configuracoes-compactas-52.jpg`. Não publicado; sem migração ou mudança funcional no PWA, Gestão nativa e AvantaVendas.

## Cabeçalho e ações compactas — revisão local 3.1.0.53

Topo na cor do perfil, com contraste de texto calculado; X em SVG centralizado no botão. O componente oficial compartilhado `BotaoAcaoCompacto`, documentado no PADRÃO AVANTA 1.20.0, padroniza as ações deste modal: face de 32 px, fonte de 13 px e alvo de clique mínimo de 44 px. Não houve substituição global dos botões do sistema.

Validação visual nos temas claro e noturno: X, face e alvo com o mesmo centro; ações com a mesma escala; card de aproximadamente 495 px, sem rolagem em 1366 × 600. Fechar restaura o foco ao acionador. Suíte completa: 1.371 testes aprovados, zero falhas. Tipagem, lint, PADRÃO AVANTA e Ava aprovados. Evidência: `output/marketplaces/configuracoes-acoes-53.jpg`. Somente local, não publicado; sem alteração de banco ou permissões.


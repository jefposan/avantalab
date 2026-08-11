import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const [aplicacao, estilos, versao, cliente, rotaExclusao, gestorConteudo, migracaoCapa, migracaoVinculo, migracaoRealtime, migracaoExclusao] = await Promise.all([
  readFile(resolve(raiz, 'app/avantavendas/sistema/app.js'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/sistema/styles.css'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/version.ts'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/sistema/supabase-client.js'), 'utf8'),
  readFile(resolve(raiz, 'app/api/vendas/conta/route.ts'), 'utf8'),
  readFile(resolve(raiz, 'app/components/NovidadesVendasModal.tsx'), 'utf8'),
  readFile(resolve(raiz, 'supabase/migrations/20260807193000_capa_pasta_divulgacao_vendas_mobile.sql'), 'utf8'),
  readFile(resolve(raiz, 'supabase/migrations/20260807210000_ativar_vinculo_comercial_aprovado.sql'), 'utf8'),
  readFile(resolve(raiz, 'supabase/migrations/20260807223000_vinculo_vendas_mobile_realtime.sql'), 'utf8'),
  readFile(resolve(raiz, 'supabase/migrations/20260810183000_exclusao_conta_avantavendas.sql'), 'utf8'),
]);

const falhas = [];
const exigir = (condicao, mensagem) => {
  if (!condicao) falhas.push(mensagem);
};
const inicioOndaUm = estilos.indexOf('@keyframes vendas-wave-dance-one');
const inicioOndaDois = estilos.indexOf('@keyframes vendas-wave-dance-two');
const fimOndas = estilos.indexOf('@media (prefers-reduced-motion: reduce)', inicioOndaDois);
const ondaUm = estilos.slice(inicioOndaUm, inicioOndaDois);
const ondaDois = estilos.slice(inicioOndaDois, fimOndas);

const acaoPagamento = '<button class="secondary quick-action-button quick-action-payment" onclick="abrirNovoPagamentoGeral()">';
const acaoPedido = '<button class="primary quick-action-button quick-action-order" onclick="abrirNovoPedidoGeral()">';

exigir(
  aplicacao.includes('function abrirAvisoAcessoVendas(titulo, mensagem, campoId = \'\')')
    && aplicacao.includes('role="alertdialog" aria-modal="true"')
    && aplicacao.includes('campo.focus({ preventScroll: true })')
    && aplicacao.includes('<form novalidate onsubmit="entrarSistema(event)"')
    && aplicacao.includes('class="login-register-form" novalidate onsubmit="criarConta(event)"')
    && aplicacao.includes('value="${escapeAttr(loginRascunho.senha)}"')
    && aplicacao.includes('value="${escapeAttr(cadastroRascunho.confirmarSenha)}"')
    && !aplicacao.includes("erro.textContent = 'As senhas não coincidem.'")
    && estilos.includes('.login-screen > form { max-height: none; overflow: hidden; }'),
  'Login e cadastro devem usar avisos modais, preservar valores e devolver o foco sem criar rolagem no formulário.',
);
exigir(
  aplicacao.includes('settings-delete-account-card')
    && aplicacao.includes('function abrirExclusaoContaVendas()')
    && aplicacao.includes("String(valorConfirmacao || '').trim().toUpperCase() !== 'EXCLUIR'")
    && aplicacao.includes('contaVendasExcluidaNestaSessao = true')
    && aplicacao.includes('await limparTodosCachesVendasUsuario();')
    && aplicacao.includes('function renderContaVendasExcluida()')
    && aplicacao.includes('function renderAtivacaoContaVendas()')
    && cliente.includes("fetch('/api/vendas/conta'")
    && rotaExclusao.includes("rpc('excluir_conta_avantavendas_rpc'")
    && rotaExclusao.includes(".from('vendas-produtos')")
    && rotaExclusao.includes('.remove(uploads.slice(inicio, inicio + 100))')
    && cliente.includes('contaVendasAusente: true')
    && !cliente.includes("await criarContaVendas('Minha conta de vendas');")
    && migracaoExclusao.includes('create or replace function public.excluir_conta_avantavendas_rpc')
    && migracaoExclusao.includes('historico_financeiro_preservado')
    && migracaoExclusao.includes('login_avantalab_preservado')
    && migracaoExclusao.includes("'uploads_para_excluir', v_uploads_para_excluir")
    && migracaoExclusao.includes("to_regclass('public.feedbacks')")
    && migracaoExclusao.includes("to_regclass('public.vendas_mobile_instalacoes')")
    && migracaoExclusao.includes("to_regclass('public.vendas_mobile_publicacoes')")
    && migracaoExclusao.includes("delete from public.vendas_mobile_pacotes")
    && migracaoExclusao.includes('perform public.desvincular_receitas_vendas_mobile_usuario(v_user_id, v_empresa_id, false)'),
  'A exclusão deve ser explícita, remover somente o perfil do Vendas e preservar login, Gestão e histórico financeiro.',
);
exigir(
  aplicacao.includes('function memorizarPesquisaClientes()')
    && aplicacao.includes('function restaurarPesquisaClientes()')
    && aplicacao.includes('function contextoPesquisaClientesParaLancamento()')
    && aplicacao.includes('function restaurarPesquisaClientesDoLancamento(contexto)')
    && aplicacao.includes('pesquisaClientesRetorno: contextoPesquisaClientesParaLancamento()')
    && aplicacao.includes('restaurarPesquisaClientesDoLancamento(rascunho.pesquisaClientesRetorno)')
    && aplicacao.includes('if (state.aba === \'clientes\') memorizarPesquisaClientes();')
    && aplicacao.includes('onclick="prepararNovaBuscaClientes(this)"')
    && !aplicacao.includes('limparPesquisaClientesAoEntrar()'),
  'A busca de Clientes deve ser preservada após lançamentos e limpa somente ao iniciar uma nova pesquisa.',
);
exigir(
  aplicacao.includes('function ajustarSheetTransacaoAoTeclado(wrap)')
    && aplicacao.includes('function atualizarAlturaEstruturalSheetTransacao(wrap)')
    && aplicacao.includes('const alturas = [window.innerHeight, document.documentElement?.clientHeight]')
    && aplicacao.includes("window.visualViewport?.addEventListener('resize'")
    && aplicacao.includes('window.clearTimeout(wrap.__temporizadorAjusteTransacao)')
    && aplicacao.includes('agendarAjusteSheetTransacao(wrap, 180)')
    && aplicacao.includes("wrap.style.setProperty('--transaction-sheet-offset'")
    && estilos.includes('transform: translate3d(0, var(--transaction-sheet-offset, 0px), 0);')
    && !estilos.includes('.client-transaction-backdrop { top: 0; bottom: auto;'),
  'O modal de pedido deve cobrir toda a tela e mover apenas o card para manter o campo focado acima do teclado.',
);
exigir(
  aplicacao.includes('<label for="cliNascimento">${svgIconEstavel(\'cake\')}<span>Data de Aniversário</span></label>')
    && aplicacao.includes("toast('Informe a data de aniversário no formato dd/mm.')"),
  'O cadastro do cliente deve identificar Data de Aniversário com o SVG de bolo.',
);
exigir(
  aplicacao.includes(acaoPagamento)
    && aplicacao.includes(acaoPedido)
    && aplicacao.indexOf(acaoPagamento) < aplicacao.indexOf(acaoPedido),
  'Pagamento deve ficar à esquerda e Pedido à direita no card do botão +.',
);
exigir(
  estilos.includes('.quick-action-button.quick-action-payment.secondary')
    && estilos.includes('--vendas-pagamento: #1F8A9E;')
    && estilos.includes('background: var(--vendas-pagamento);')
    && estilos.includes('.quick-action-button.quick-action-order.primary')
    && estilos.includes('--vendas-pedido: #1687D9;')
    && estilos.includes('background: var(--vendas-pedido);')
    && estilos.includes('.client-payment { background: var(--vendas-pagamento); }')
    && estilos.includes('.client-order { background: var(--vendas-pedido); }'),
  'As ações rápidas devem reutilizar as cores de Pagamento e Pedido do card do cliente.',
);
exigir(
  inicioOndaUm >= 0
    && inicioOndaDois > inicioOndaUm
    && fimOndas > inicioOndaDois
    && estilos.includes('will-change: transform, opacity;')
    && !ondaUm.includes('background-position:')
    && !ondaUm.includes('border-radius:')
    && !ondaDois.includes('background-position:')
    && !ondaDois.includes('border-radius:'),
  'As ondas da sala devem animar somente propriedades compostas, sem repintar gradientes ou geometria a cada quadro.',
);
exigir(
  aplicacao.includes('function carregarPdfMaterialDivulgacao()')
    && aplicacao.includes('window.__avantalabCarregarPdfJs()')
    && aplicacao.includes("pagina.className = 'material-preview-pdf-page'")
    && aplicacao.includes('larguraDisponivel / viewportBase.width')
    && aplicacao.includes('alturaDisponivel / viewportBase.height')
    && aplicacao.includes("pagina.getAnnotations({ intent: 'display' })")
    && estilos.includes('.material-preview-pdf-page {')
    && estilos.includes('place-items: center;')
    && !aplicacao.includes('class="material-preview-pdf"></iframe>')
    && !aplicacao.includes('#view=Fit'),
  'A pré-visualização de PDF deve renderizar páginas centralizadas sem depender do leitor nativo do navegador.',
);
exigir(
  aplicacao.includes('await navigator.share({ files: [arquivo] });')
    && aplicacao.includes('try { await navigator.share({ files: [arquivo] }); return true; }')
    && !aplicacao.includes("text: 'Material de divulgação'")
    && !/navigator\.share\(\{[^}]*\b(?:title|text)\s*:/.test(aplicacao),
  'Os compartilhamentos do AvantaVendas devem enviar somente o arquivo, sem texto ou título automáticos.',
);
exigir(
  cliente.includes('pasta_pai_id, capa_material_id, nome')
    && gestorConteudo.includes(".update({ capa_material_id: materialId })")
    && gestorConteudo.includes("item.tipo === 'imagem' && idsSubpastasCapa.has(item.pasta_id)")
    && migracaoCapa.includes('add column if not exists capa_material_id uuid')
    && migracaoCapa.includes('Somente pastas principais podem receber uma capa personalizada.')
    && migracaoCapa.includes('A capa precisa estar publicada dentro de uma subpasta desta pasta principal.')
    && aplicacao.includes("item.id === pasta.capa_material_id && item.tipo === 'imagem'"),
  'A capa da pasta principal deve ser escolhida na Gestão entre imagens de suas subpastas e exibida no AvantaVendas.',
);
exigir(
  aplicacao.includes('function prepararExibicaoSalaBotoesNoDom()')
    && aplicacao.includes("sala.classList.add('is-loading-images')")
    && aplicacao.includes("sala.classList.add('images-ready')")
    && aplicacao.includes("'/avantavendas/recursos/assets/menu/13_Configurações.png'")
    && aplicacao.includes("'/avantavendas/recursos/assets/menu/14_Sair.png'")
    && estilos.includes('.mobile-menu.is-loading-images .mobile-menu-card::before')
    && estilos.includes('@keyframes vendas-button-preloader'),
  'A sala deve manter loadings locais e revelar todos os botões somente depois que as imagens estiverem prontas.',
);
exigir(
  migracaoVinculo.includes("v_deve_ativar := new.papel = 'vendedor'")
    && migracaoVinculo.includes('and empresa_id <> new.empresa_id')
    && migracaoVinculo.includes('set ativo = true,')
    && migracaoVinculo.includes("where solicitacao.status = 'aprovada'")
    && migracaoVinculo.includes('and vinculo.desvinculado_em is null'),
  'Uma aprovação por código deve ativar o novo vínculo comercial e reparar aprovações anteriores que ficaram inativas.',
);
exigir(
  cliente.includes('async function assinarAtualizacoesVinculo(aoAtualizar)')
    && cliente.includes("table: 'vendas_mobile_solicitacoes_acesso', filter: `user_id=eq.${user.id}`")
    && cliente.includes("table: 'vendas_mobile_acessos', filter: `user_id=eq.${user.id}`")
    && cliente.includes("table: 'vendas_mobile_vinculos_comerciais', filter: `user_id=eq.${user.id}`")
    && aplicacao.includes('function atualizarVinculoAprovadoAutomaticamente()')
    && aplicacao.includes('INTERVALO_VERIFICACAO_APROVACAO_MS = 15000')
    && aplicacao.includes("document.addEventListener('visibilitychange'")
    && aplicacao.includes('Esta tela será atualizada automaticamente após a aprovação.')
    && aplicacao.includes('Conteúdos atualizados.')
    && migracaoRealtime.includes('alter publication supabase_realtime add table public.vendas_mobile_solicitacoes_acesso')
    && migracaoRealtime.includes('alter publication supabase_realtime add table public.vendas_mobile_acessos')
    && migracaoRealtime.includes('alter publication supabase_realtime add table public.vendas_mobile_vinculos_comerciais'),
  'A aprovação deve chegar em tempo real e ter verificação periódica enquanto o usuário aguarda.',
);
exigir(
  aplicacao.includes('<button class="filter-button" onclick="aplicarFiltroDashboard()">${svgIcon(\'filter\')}<span>Filtrar</span></button><button class="current-month" onclick="irMesAtual()">')
    && aplicacao.includes('<section class="month-switcher"><div><button aria-label="Mês anterior"')
    && !aplicacao.includes('</div><button class="current-month" onclick="irMesAtual()">${svgIcon(\'calendar\')}')
    && estilos.includes('grid-template-columns: minmax(0,3fr) minmax(0,3fr) minmax(106px,1.5fr) minmax(112px,1.5fr);')
    && estilos.includes('.dashboard-sticky-head .date-filter .filter-button, .dashboard-sticky-head .date-filter .current-month { width: 100%; min-width: 0; justify-content: center; }')
    && estilos.includes('.dashboard-sticky-head .month-switcher { display: flex; width: 100%; justify-content: center;')
    && estilos.includes('width: calc(100% - var(--dashboard-action-width) - 7px);'),
  'O filtro do Dashboard deve manter início, fim, Filtrar e Mês atual na primeira linha, com o seletor mensal centralizado abaixo.',
);
exigir(
  versao.includes("AVANTAVENDAS_ASSET_REVISION = '41'"),
  'A revisão estática do AvantaVendas deve invalidar o cache da interface anterior.',
);

if (falhas.length) {
  throw new Error(`Interface do AvantaVendas inválida:\n- ${falhas.join('\n- ')}`);
}

console.log('Interface do AvantaVendas validada.');

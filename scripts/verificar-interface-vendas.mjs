import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const [aplicacao, estilos, comprovantePedido, cliente, rotaExclusao, rotaVerificacaoSms, rotaRecuperacaoSenha, rotaRedefinicaoSenha, gestorConteudo, migracaoCapa, migracaoVinculo, migracaoRealtime, migracaoExclusao, migracaoContaAutomatica] = await Promise.all([
  readFile(resolve(raiz, 'app/avantavendas/sistema/app.js'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/sistema/styles.css'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/sistema/order-receipt-v2.js'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/sistema/supabase-client.js'), 'utf8'),
  readFile(resolve(raiz, 'app/api/vendas/conta/route.ts'), 'utf8'),
  readFile(resolve(raiz, 'app/api/sms/verificar-codigo/route.ts'), 'utf8'),
  readFile(resolve(raiz, 'app/api/vendas/senha/enviar-codigo/route.ts'), 'utf8'),
  readFile(resolve(raiz, 'app/api/vendas/senha/redefinir/route.ts'), 'utf8'),
  readFile(resolve(raiz, 'app/components/NovidadesVendasModal.tsx'), 'utf8'),
  readFile(resolve(raiz, 'supabase/migrations/20260807193000_capa_pasta_divulgacao_vendas_mobile.sql'), 'utf8'),
  readFile(resolve(raiz, 'supabase/migrations/20260807210000_ativar_vinculo_comercial_aprovado.sql'), 'utf8'),
  readFile(resolve(raiz, 'supabase/migrations/20260807223000_vinculo_vendas_mobile_realtime.sql'), 'utf8'),
  readFile(resolve(raiz, 'supabase/migrations/20260810183000_exclusao_conta_avantavendas.sql'), 'utf8'),
  readFile(resolve(raiz, 'supabase/migrations/20260811120000_conta_inicial_automatica_vendas.sql'), 'utf8'),
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
    && estilos.includes('.login-screen > form { max-height: none; overflow: hidden; }')
    && estilos.includes('.login-field { position: relative; display: flex; width: 100%; min-width: 0; align-items: center; }')
    && estilos.includes('min-width: 0; height: 44px; flex: 1 1 auto;')
    && estilos.includes('padding: 0 14px 0 40px;')
    && estilos.includes('.login-field.password-field input { padding-right: 44px; }'),
  'Login e cadastro devem usar avisos modais, preservar valores, devolver o foco e aproveitar toda a largura dos campos sem criar rolagem no formulário.',
);
exigir(
  aplicacao.includes("abrirAvisoRecuperacaoSenhaVendas('Usuário não localizado', 'Confirme o e-mail digitado.')")
    && aplicacao.includes('retomarRecuperacaoSenhaAposAviso')
    && aplicacao.includes("document.getElementById('recuperarEmail')")
    && rotaRecuperacaoSenha.includes(".from('usuarios_contas')")
    && rotaRecuperacaoSenha.includes("mensagem: 'Usuário não localizado. Confirme o e-mail digitado.'")
    && rotaRedefinicaoSenha.includes(".from('usuarios_contas')")
    && rotaRedefinicaoSenha.includes('updateUserById(conta.user_id'),
  'A recuperação de senha deve consultar o diretório central, avisar quando o usuário não existe e devolver o foco ao e-mail preservado.',
);
exigir(
  aplicacao.includes('function abrirAvisoContaJaCadastradaVendas()')
    && aplicacao.includes('id="accountAlreadyRegisteredTitle">Conta já cadastrada</h2>')
    && aplicacao.includes('>Ir para o login</button>')
    && aplicacao.includes('>Recuperar senha</button>')
    && aplicacao.includes('if (ehErroContaJaCadastradaVendas(error)) abrirAvisoContaJaCadastradaVendas();')
    && aplicacao.includes('/user already registered|already registered|user already exists|email.*already.*registered/i'),
  'Conta existente deve abrir o aviso em português com ações para login e recuperação de senha.',
);
exigir(
  aplicacao.includes('Código da empresa (opcional)')
    && aplicacao.includes('Use apenas para solicitar acesso a Novidades, Divulgação e produtos publicados pela empresa.')
    && cliente.includes("empresa_id: null,\n          empresa_nome: 'Conta independente'")
    && cliente.includes('autonomo: true')
    && cliente.includes('const contaInicial = await garantirContaVendas();')
    && cliente.includes("rpc('garantir_conta_vendas_mobile_rpc')")
    && migracaoContaAutomatica.includes("values ('Minha conta de vendas', v_user_id)")
    && migracaoContaAutomatica.includes("values (v_conta.id, v_user_id, 'proprietario')"),
  'Login comum deve aceitar conta independente, preparar a conta operacional automaticamente e manter o código empresarial opcional.',
);
exigir(
  aplicacao.includes('autocapitalize="words"')
    && aplicacao.includes('function formatarNomeCompletoCadastro(nome, preservarEspacamento = false)')
    && aplicacao.includes("toLocaleUpperCase('pt-BR')")
    && aplicacao.includes('onblur="normalizarNomeCadastroVendas(this)"')
    && aplicacao.includes('const nome = campoNome\n    ? normalizarNomeCadastroVendas(campoNome)')
    && aplicacao.includes('function limparCodigoSmsCadastro()')
    && aplicacao.includes('onclick="limparCodigoSmsAoEditar(this)"')
    && aplicacao.includes("valor('cadastroCodigoSms').replace(/\\D/g, '').slice(0, 10)")
    && aplicacao.includes("botao.classList.toggle('is-ready', !aguardando)")
    && aplicacao.includes('if (confirmandoCadastroSms) return;')
    && aplicacao.includes("botao.disabled = true; botao.textContent = 'Validando...'")
    && aplicacao.includes('if (!cadastroSmsValidado) {')
    && aplicacao.includes('cadastroSmsValidado = true;')
    && aplicacao.includes('if (!cadastroPendente || segundosReenvioSmsCadastro > 0 || reenviandoSmsCadastro) return;')
    && aplicacao.includes('Reenviar código em <span id="smsContador">${segundosReenvioSmsCadastro}</span>s')
    && estilos.includes('.sms-confirm-form .sms-resend.is-ready')
    && rotaVerificacaoSms.includes("String(codigo || '').replace(/\\D/g, '').slice(0, 10)")
    && rotaVerificacaoSms.includes('Code: codigoNormalizado'),
  'Cadastro deve capitalizar o nome e o SMS deve contar 60 segundos, limpar códigos antigos, liberar a pílula e validar somente dígitos.',
);
exigir(
  aplicacao.includes('settings-delete-account-card')
    && aplicacao.includes('class="danger settings-header-exit" onclick="abrirConfirmacaoSair()"')
    && !aplicacao.includes('settings-card settings-exit-card')
    && !estilos.includes('.settings-exit-card')
    && aplicacao.includes('function abrirExclusaoContaVendas()')
    && aplicacao.includes("String(valorConfirmacao || '').trim().toUpperCase() !== 'EXCLUIR'")
    && aplicacao.includes('await limparTodosCachesVendasUsuario();')
    && aplicacao.includes('await sairSistema(`/avantavendas?${AVISO_EXCLUSAO_CONCLUIDA_PARAM}=1`)')
    && aplicacao.includes('function abrirAvisoExclusaoContaConcluida()')
    && aplicacao.includes('function voltarInicioAposExclusaoVendas()')
    && aplicacao.includes("window.location.replace('/avantavendas?entrar=1')")
    && aplicacao.includes('sheet-backdrop-static')
    && estilos.includes('.access-validation-icon.is-success')
    && !aplicacao.includes('function renderContaVendasExcluida()')
    && !aplicacao.includes('abrirGestaoAposExclusaoVendas')
    && !estilos.includes('.deleted-sales-account-screen')
    && !aplicacao.includes('function renderAtivacaoContaVendas()')
    && cliente.includes("fetch('/api/vendas/conta'")
    && rotaExclusao.includes("rpc('excluir_conta_avantavendas_rpc'")
    && rotaExclusao.includes(".from('vendas-produtos')")
    && rotaExclusao.includes('.remove(uploads.slice(inicio, inicio + 100))')
    && cliente.includes("rpc('garantir_conta_vendas_mobile_rpc')")
    && cliente.includes("const vendasStorageKey = 'avantalab-vendas-mobile-auth'")
    && cliente.includes('storageKey: vendasStorageKey')
    && cliente.includes("auth.signOut({ scope: 'local' })")
    && !cliente.includes('sharedStorageKey')
    && !cliente.includes('projectRef')
    && cliente.includes('emailRedirectTo: retornoCadastroVendas()')
    && cliente.includes('const contaInicial = await garantirContaVendas();')
    && !cliente.includes('contaVendasAusente: true')
    && migracaoContaAutomatica.includes('create or replace function public.garantir_conta_vendas_mobile_rpc()')
    && migracaoContaAutomatica.includes('pg_advisory_xact_lock')
    && migracaoContaAutomatica.includes('grant execute on function public.garantir_conta_vendas_mobile_rpc() to authenticated')
    && migracaoExclusao.includes('create or replace function public.excluir_conta_avantavendas_rpc')
    && migracaoExclusao.includes("'uploads_para_excluir', v_uploads_para_excluir")
    && migracaoExclusao.includes("to_regclass('public.feedbacks')")
    && migracaoExclusao.includes("to_regclass('public.vendas_mobile_instalacoes')")
    && migracaoExclusao.includes("to_regclass('public.vendas_mobile_publicacoes')")
    && migracaoExclusao.includes("delete from public.vendas_mobile_pacotes")
    && migracaoExclusao.includes('perform public.desvincular_receitas_vendas_mobile_usuario(v_user_id, v_empresa_id, false)')
    && migracaoExclusao.includes('historico_financeiro_preservado')
    && migracaoExclusao.includes('login_avantalab_preservado')
    && rotaExclusao.includes('loginAvantaLabPreservado')
    && rotaExclusao.includes('gestaoPreservado')
    && !rotaExclusao.includes('admin.auth.admin.deleteUser')
    && !rotaExclusao.includes('identidadeExcluida'),
  'Vendas e Gestão devem manter sessões locais separadas; a exclusão remove somente a conta do Vendas e preserva os demais serviços.',
);
exigir(
  aplicacao.includes("'rotate-ccw': '<path")
    && aplicacao.includes("'user-x': '<path")
    && aplicacao.includes("settings-reset-card\"><h3>${svgIconEstavel('rotate-ccw')} Resetar sistema")
    && aplicacao.includes("settings-delete-account-card\"><h3>${svgIconEstavel('user-x')} Excluir conta do Vendas")
    && aplicacao.includes('Todos os dados da sua conta no AvantaVendas serão excluídos permanentemente.')
    && aplicacao.includes('os dados excluídos não poderão ser recuperados.')
    && !aplicacao.includes("${svgIcon('warning')} Resetar sistema")
    && !aplicacao.includes("${svgIcon('warning')} Excluir conta do Vendas"),
  'Os cards destrutivos devem exibir SVGs estáveis e específicos, sem contêiner de ícone vazio.',
);
exigir(
  aplicacao.includes("const REDIRECT_OAUTH_NATIVO_VENDAS = 'br.com.avantalab.vendas://auth/callback'")
    && aplicacao.includes("let loginSocialPendente = lerLoginSocialPendenteVendas()")
    && aplicacao.includes("window.Capacitor?.isNativePlatform?.()")
    && aplicacao.includes("App.addListener('appUrlOpen'")
    && aplicacao.includes("Browser.addListener('browserFinished'")
    && aplicacao.includes("callbackUrl.protocol !== 'br.com.avantalab.vendas:'")
    && aplicacao.includes("callbackUrl.hostname !== 'auth'")
    && aplicacao.includes("callbackUrl.pathname !== '/callback'")
    && aplicacao.includes("window.VendasDb.exchangeCodeForSession(codigo)")
    && aplicacao.includes("window.VendasDb.setSession(accessToken, refreshToken)")
    && aplicacao.includes("window.VendasDb.iniciarOAuthNativo(provedor, REDIRECT_OAUTH_NATIVO_VENDAS)")
    && aplicacao.includes("function entrarComApple() { return entrarComProvedorSocialVendas('apple'); }")
    && aplicacao.includes('Cancelar e voltar ao login')
    && !aplicacao.includes('let conectandoGoogle =')
    && cliente.includes('options: { redirectTo, skipBrowserRedirect: true }')
    && cliente.includes('requireClient().auth.exchangeCodeForSession(code)')
    && cliente.includes('requireClient().auth.setSession({'),
  'Google e Apple devem compartilhar o fluxo OAuth nativo seguro, com deep link validado, retorno PKCE/tokens e cancelamento recuperável.',
);
exigir(
  aplicacao.includes('function prepararAlturaPreparacao()')
    && aplicacao.includes("campoAtivo.closest('.login-screen')")
    && aplicacao.includes('campoAtivo.blur()')
    && aplicacao.includes("document.documentElement.style.removeProperty('--vendas-preparing-height')")
    && aplicacao.includes('sessionStorage.removeItem(PREPARING_VIEWPORT_HEIGHT_KEY_LEGACY)')
    && !aplicacao.includes("style.setProperty('--vendas-preparing-height'")
    && !aplicacao.includes('window.visualViewport?.height || window.innerHeight')
    && estilos.includes('.login-screen.preparing-access-screen {\n  --access-scene-height: var(--vendas-viewport-height);\n  position: fixed;\n  inset: 0;')
    && estilos.includes('height: auto;\n  min-height: 0;\n  flex: none;'),
  'Preparando acesso deve cobrir toda a viewport e nunca congelar a altura reduzida pelo teclado.',
);
exigir(
  estilos.includes('.dark-theme .settings-sales-account-field select')
    && estilos.includes("stroke='%23f8fafc'")
    && estilos.includes('background-repeat: no-repeat; background-position: right 14px center; background-size: 14px 16px;'),
  'O seletor de conta ativa no tema escuro deve exibir uma única seta branca alinhada à direita.',
);
exigir(
  aplicacao.includes("const URL_APP_GESTAO = 'br.com.avantalab.app://auth/callback?origem=vendas'")
    && aplicacao.includes("const URL_WEB_GESTAO = 'https://app.avantalab.com.br/mobile?origem=vendas'")
    && aplicacao.includes('AppLauncher.canOpenUrl({ url: URL_APP_GESTAO })')
    && aplicacao.includes('AppLauncher.openUrl({ url: URL_APP_GESTAO })')
    && aplicacao.includes("Browser.open({ url: URL_WEB_GESTAO, presentationStyle: 'fullscreen' })")
    && aplicacao.includes('onclick="abrirGestaoMobileVendas()"')
    && !aplicacao.includes('function renderSeletorPerfilGestaoVendas()')
    && !aplicacao.includes("window.location.assign('/avantavendas/gestao?origem=vendas')")
    && !cliente.includes("rpc('meus_perfis_gestao_para_troca_rpc')"),
  'A troca para a Gestão deve apenas abrir o app independente e usar o navegador como contingência, sem selecionar perfis ou incorporar a Gestão no Vendas.',
);
exigir(
  estilos.includes(".settings-sales-account-field select { width: 100%;")
    && estilos.includes("stroke='%23132b45'")
    && estilos.includes("appearance: none; -webkit-appearance: none;")
    && estilos.includes(".dark-theme .settings-sales-account-field select {")
    && estilos.includes("stroke='%23f8fafc'"),
  'O seletor de conta deve usar setas SVG legíveis nos temas claro e escuro.',
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
  comprovantePedido.includes('function desenharRodapeEmPilula(ctx, conteudo, y)')
    && comprovantePedido.includes("retangulo(ctx, xPilula, y - 47, larguraPilula, 72, 36, '#FFFFFF', '#DCE6F0')")
    && comprovantePedido.includes('desenharRodapeEmPilula(ctx, `${titulo} • ${clienteExibido}`, yRodape)')
    && !comprovantePedido.includes('yRodape + 35')
    && aplicacao.includes('const larguraPilulaRodape = Math.min(936')
    && aplicacao.includes("ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = '#DCE6F0'")
    && comprovantePedido.includes('function primeiroNomeClienteComprovante(nome)')
    && comprovantePedido.includes('const clienteExibido = primeiroNomeClienteComprovante(cliente)')
    && aplicacao.includes('function primeiroNomeClienteComprovante(nome)')
    && aplicacao.includes('function detalheQuantidadeItemComprovante(item)')
    && aplicacao.includes("if (!Number.isFinite(quantidade) || quantidade < 2) return '';")
    && aplicacao.includes('secundario: detalheQuantidadeItemComprovante(item)')
    && comprovantePedido.includes("'Valor do pedido', 276, yPedido + 160")
    && comprovantePedido.includes("'Saldo atual', 276, ySaldo + 160")
    && comprovantePedido.includes("'Pedido registrado com sucesso!', LARGURA / 2, 444")
    && comprovantePedido.includes("alinhamento: 'center', largura: 500, linhaBase: 'middle'")
    && comprovantePedido.includes("card(ctx, yPedido, 251, '', 'PEDIDO REGISTRADO')")
    && comprovantePedido.includes("card(ctx, ySaldo, 251, '', 'SITUAÇÃO APÓS O LANÇAMENTO')")
    && comprovantePedido.includes("texto(ctx, titulo, LARGURA / 2, y + 43, { tamanho: 28, peso: 800, cor: '#0A2F6B', alinhamento: 'center', largura: 880, linhaBase: 'middle' })")
    && comprovantePedido.includes("icone(ctx, 'confirmado', 208, yPedido + 151")
    && comprovantePedido.includes("icone(ctx, 'grafico', 208, ySaldo + 151")
    && !comprovantePedido.includes("texto(ctx, 'Pedido confirmado'")
    && !comprovantePedido.includes("texto(ctx, 'Valor que permanece em aberto'")
    && !comprovantePedido.includes("texto(ctx, 'Seu pedido foi confirmado no sistema.'")
    && aplicacao.includes('const temSubtituloPrincipal = Boolean(linhaPrincipal.subtitulo)')
    && aplicacao.includes('const temSubtituloSaldo = Boolean(linhaSaldo.subtitulo)')
    && aplicacao.includes("etiqueta: 'Pedido registrado com sucesso!'")
    && aplicacao.includes("ctx.fillText(linhaPrincipal.tituloDestaque || 'Lançamento registrado', largura / 2, y + 13)")
    && aplicacao.includes("ctx.fillText('Situação após o lançamento', largura / 2, y + 13)")
    && !aplicacao.includes("linhaSaldo.subtitulo || 'Valor que permanece em aberto'")
    && aplicacao.includes("const clienteExibido = /pedido/i.test(String(titulo || ''))"),
  'O comprovante de pedido deve omitir ícones e textos redundantes, manter os ícones nos campos de valor, ocultar quantidade unitária, centralizar a mensagem de sucesso e os títulos dos cards nos dois eixos, usar somente o primeiro nome da cliente e manter o rodapé dentro de uma pílula branca opaca, inclusive no fallback.',
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
  estilos.includes('.mobile-menu-card { width: 90%; min-height: 0; justify-self: center; overflow: visible; aspect-ratio: 1 / 1;')
    && estilos.includes('.mobile-menu-card img { object-fit: contain;')
    && estilos.includes('.mobile-menu-card { height: auto; min-height: 0; aspect-ratio: 1 / 1;')
    && !estilos.includes('.mobile-menu-card { min-height: 123px;'),
  'Os botões da sala devem permanecer quadrados em telas Android estreitas, sem altura mínima ou imagem deformada.',
);
exigir(
  aplicacao.includes("botao.closest('.mobile-menu') && !botao.matches('.mobile-menu-card:not(.is-organizable)')")
    && estilos.includes('.mobile-menu-card.button-pressed:not(.is-organizable) { transform: translateY(4px) scale(.94) !important;')
    && estilos.includes('@media (prefers-reduced-motion: reduce) { .mobile-menu-card.button-pressed:not(.is-organizable) { transition: none !important; }'),
  'Os nove botões principais da sala devem afundar ao toque, sem interferir no modo de reorganização e respeitando movimento reduzido.',
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
if (falhas.length) {
  throw new Error(`Interface do AvantaVendas inválida:\n- ${falhas.join('\n- ')}`);
}

console.log('Interface do AvantaVendas validada.');

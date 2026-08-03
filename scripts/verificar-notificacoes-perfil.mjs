import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const [mobile, web, cabecalho, versao] = await Promise.all([
  readFile(resolve(raiz, 'public/mobile-app.js'), 'utf8'),
  readFile(resolve(raiz, 'app/gestao/page.tsx'), 'utf8'),
  readFile(resolve(raiz, 'app/components/AppHeader.tsx'), 'utf8'),
  readFile(resolve(raiz, 'app/lib/version.ts'), 'utf8'),
]);

const falhas = [];
const exigir = (condicao, mensagem) => {
  if (!condicao) falhas.push(mensagem);
};

exigir(
  mobile.includes("select('id, empresa_id, titulo, corpo, url, tipo, lida, criado_em')")
    && mobile.includes("db.from('empresas').select('id, nome').in('id', empresaIds)")
    && mobile.includes("perfil_nome: nomesPorEmpresa[empresaIdAviso]"),
  'A Gestão Mobile deve resolver e apresentar o perfil de origem de cada aviso.',
);
exigir(
  web.includes("select('id, empresa_id, titulo, corpo, tipo')")
    && web.includes("supabase.from('empresas').select('id, nome').in('id', empresaIds)")
    && web.includes('perfilNome: nomesPorEmpresa.get(notificacaoEmpresaId)'),
  'A Gestão Web deve resolver e apresentar o perfil de origem de cada aviso.',
);
exigir(
  mobile.includes('Perfil: ')
    && cabecalho.includes('Perfil: {aviso.perfilNome}'),
  'Web e Mobile devem identificar visualmente o perfil em cada aviso.',
);
exigir(
  !mobile.includes('function marcarNotificacoesComoLidas()')
    && !web.includes('function marcarNotificacoesLidasWeb()')
    && web.includes('notificacoesWeb.forEach((n) => {')
    && mobile.includes("state.visao === 'home' && state.notificacoesNaoLidas > 0"),
  'Abrir ou fechar o painel não pode remover nem ocultar avisos automaticamente.',
);
exigir(
  mobile.includes('aria-label="Fechar aviso"')
    && mobile.includes('Fechar todas')
    && cabecalho.includes('aria-label="Fechar aviso"')
    && cabecalho.includes('Fechar todos'),
  'O fechamento explícito de um ou de todos os avisos deve existir nos dois ambientes.',
);
exigir(
  mobile.includes("padding-top:calc(env(safe-area-inset-top,0px) + 12px)")
    && mobile.includes("height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 106px);max-height:680px")
    && mobile.includes("? 'flex min-h-0 flex-1 flex-col overflow-hidden p-4'")
    && mobile.includes('id="notificacoes-lista-scroll" data-preserve-scroll')
    && mobile.includes('grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain')
    && mobile.includes('touch-action:pan-y')
    && mobile.includes('flex shrink-0 items-center justify-between gap-2 pb-2'),
  'O painel Mobile deve respeitar a área segura, manter o cabeçalho fixo e fornecer altura efetiva para a rolagem dos avisos.',
);
exigir(
  versao.includes("APP_VERSION = '1.6.1.124'"),
  'A versão precisa registrar a nova regra de avisos.',
);

if (falhas.length) {
  throw new Error(`Avisos por perfil inválidos:\n- ${falhas.join('\n- ')}`);
}

console.log('Avisos por perfil e fechamento explícito validados.');

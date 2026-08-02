import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const falhas = [];

async function ler(caminho) {
  return readFile(resolve(raiz, caminho), 'utf8');
}

function exigir(condicao, mensagem) {
  if (!condicao) falhas.push(mensagem);
}

const [autenticacao, retorno, estadoRetorno, landing, gestao, carregamento] = await Promise.all([
  ler('app/hooks/useAuth.ts'),
  ler('app/components/RedirecionamentoPosOAuth.tsx'),
  ler('app/lib/oauth-retorno.ts'),
  ler('app/page.tsx'),
  ler('app/gestao/page.tsx'),
  ler('app/components/TelaCarregandoAcesso.tsx'),
]);

exigir(
  autenticacao.includes("redirectTo: `${window.location.origin}/?retorno=gestao`"),
  'O OAuth Web da Gestão precisa identificar explicitamente seu retorno na raiz.',
);
exigir(
  retorno.includes("useState<'verificando' | 'publico'>('verificando')") &&
    retorno.includes("if (estado === 'publico') return null"),
  'A landing precisa nascer protegida até a verificação da sessão terminar.',
);
exigir(
  retorno.includes('if (data.session)') &&
    retorno.includes("window.location.replace(retornoSolicitado ? '/gestao' : destinoSessaoAtiva())"),
  'Uma sessão ativa na raiz deve seguir diretamente para a Gestão adequada ao dispositivo.',
);
exigir(
  retorno.includes('TEMPO_LIMITE_RETORNO_MS') &&
    retorno.includes('TEMPO_LIMITE_VERIFICACAO_MS') &&
    retorno.includes('oauthErro=') &&
    retorno.includes("window.location.replace(`/gestao?entrar=1"),
  'Erro ou expiração do retorno OAuth precisam devolver um login operável.',
);
exigir(
  estadoRetorno.includes("window.sessionStorage.removeItem(CHAVE_LOGIN_SOCIAL_PENDENTE)") &&
    retorno.includes('limparEstadoRetornoOauthGestao()'),
  'O retorno OAuth deve limpar também a intenção social antes de navegar.',
);
exigir(
  landing.indexOf('<RedirecionamentoPosOAuth />') < landing.indexOf('<main className='),
  'A proteção de sessão deve ficar fora e antes da estrutura visível da landing.',
);
exigir(
  gestao.includes("const erroOauth = parametros.get('oauthErro')") &&
    gestao.includes('setAuthErro(erroOauth)'),
  'A Gestão precisa apresentar ao usuário o erro amigável recebido do callback.',
);
exigir(
  gestao.includes("import TelaCarregandoAcesso, { FundoAcessoResponsivo }") &&
    !gestao.includes('function TelaCarregandoSistema(') &&
    gestao.includes('mensagem="Preparando seu perfil financeiro..."'),
  'A entrada e a preparação do perfil precisam usar a mesma cena compartilhada.',
);
exigir(
  carregamento.includes('data-avantalab-acesso-carregando="1"') &&
    retorno.includes('<TelaCarregandoAcesso'),
  'A raiz e a Gestão precisam compartilhar o componente oficial de carregamento.',
);

if (falhas.length) {
  throw new Error(`Fluxo de acesso Web inválido:\n- ${falhas.join('\n- ')}`);
}

console.log('Fluxo de acesso Web validado.');

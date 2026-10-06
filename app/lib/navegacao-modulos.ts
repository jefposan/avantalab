export type ContextoNavegacaoModulo = {
  destino: string;
  empresaId: string;
  empresa: {
    nome: string;
    corPrimaria: string;
    temaEscuro: boolean;
    logoUrl?: string;
  };
  perfil: 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples';
  podeEditar: boolean;
  podeGerenciarModulo: boolean;
};

const CHAVE_CONTEXTO_NAVEGACAO = 'avantalab.navegacao-modulos.v1';
const CHAVE_CONTEXTO_URL = '__avctx';
const DURACAO_CONTEXTO_MS = 30 * 60 * 1000;
export const MENSAGEM_RETORNO_MODULO_EMBUTIDO = 'AVANTALAB_MODULO_EMBUTIDO_RETORNAR_V1';

type ContextoArmazenado = ContextoNavegacaoModulo & { expiraEm: number };

function validarContexto(bruto: string | null, destino: string, empresaId?: string): ContextoNavegacaoModulo | null {
  if (!bruto) return null;

  try {
    const contexto = JSON.parse(bruto) as Partial<ContextoArmazenado>;
    if (
      contexto.destino !== destino
      || typeof contexto.empresaId !== 'string'
      || (empresaId && contexto.empresaId !== empresaId)
      || typeof contexto.expiraEm !== 'number'
      || contexto.expiraEm < Date.now()
      || !contexto.empresa
      || typeof contexto.empresa.nome !== 'string'
      || typeof contexto.empresa.corPrimaria !== 'string'
      || typeof contexto.empresa.temaEscuro !== 'boolean'
      || !['gestor_master', 'administrador', 'operador_completo', 'operador_simples'].includes(String(contexto.perfil))
      || typeof contexto.podeEditar !== 'boolean'
      || typeof contexto.podeGerenciarModulo !== 'boolean'
    ) return null;

    return contexto as ContextoNavegacaoModulo;
  } catch {
    return null;
  }
}

/**
 * Lê a prévia visual também no servidor, antes da hidratação do iframe.
 * Ela evita uma segunda tela de validação durante a navegação interna, mas
 * nunca substitui a autorização dos endpoints protegidos nem as políticas RLS.
 */
export function lerContextoVisualModulo(bruto: string | undefined, destino: string, empresaId?: string) {
  return validarContexto(bruto ?? null, destino, empresaId);
}

/**
 * Mantém o contexto da navegação interna na aba autenticada. Nunca concede
 * acesso: endpoints protegidos e políticas RLS continuam autorizando cada ação.
 */
export function prepararNavegacaoModulo(contexto: ContextoNavegacaoModulo) {
  if (typeof window === 'undefined') return;

  try {
    const valor: ContextoArmazenado = { ...contexto, expiraEm: Date.now() + DURACAO_CONTEXTO_MS };
    window.sessionStorage.setItem(CHAVE_CONTEXTO_NAVEGACAO, JSON.stringify(valor));
  } catch {
    // A navegação continua normal quando o navegador impede sessionStorage.
  }
}

export function consumirNavegacaoModulo(destino: string, empresaId?: string): ContextoNavegacaoModulo | null {
  if (typeof window === 'undefined') return null;

  try {
    const bruto = window.sessionStorage.getItem(CHAVE_CONTEXTO_NAVEGACAO);
    const contextoLocal = validarContexto(bruto, destino, empresaId);
    if (contextoLocal) return contextoLocal;

    // O parâmetro transporta apenas o contexto visual até o iframe. No acesso
    // direto, a rota ainda confirma acesso no servidor; operações internas
    // continuam protegidas no servidor e no banco de dados.
    return lerContextoVisualModulo(new URLSearchParams(window.location.search).get(CHAVE_CONTEXTO_URL) ?? undefined, destino, empresaId);
  } catch {
    return null;
  }
}

/** Remove o contexto visual junto com o encerramento explícito da sessão. */
export function limparNavegacaoModulos() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(CHAVE_CONTEXTO_NAVEGACAO);
  } catch {
    // O logout continua mesmo quando o navegador impede sessionStorage.
  }
}

/** Cria a URL interna do iframe sem transportar credenciais nem conceder acesso. */
export function criarHrefModuloEmbutido(rota: string, contexto: ContextoNavegacaoModulo) {
  const url = new URL(rota, window.location.origin);
  const contextoTransportavel: ContextoNavegacaoModulo = {
    ...contexto,
    empresa: {
      nome: contexto.empresa.nome,
      corPrimaria: contexto.empresa.corPrimaria,
      temaEscuro: contexto.empresa.temaEscuro,
    },
  };
  url.searchParams.set('empresaId', contexto.empresaId);
  // A marca completa permanece no sessionStorage da navegação. Nunca a levamos
  // na URL: logotipos em data URI podem ter megabytes e o navegador bloqueia o
  // iframe antes mesmo de a rota oficial do módulo ser carregada.
  url.searchParams.set(CHAVE_CONTEXTO_URL, JSON.stringify({ ...contextoTransportavel, expiraEm: Date.now() + DURACAO_CONTEXTO_MS }));
  return `${url.pathname}${url.search}`;
}

/**
 * Quando um módulo de página total está aberto dentro da Gestão, devolve o
 * controle ao shell que permaneceu montado. Em acesso direto, o módulo usa o
 * retorno de rota normal.
 */
export function solicitarRetornoAoModuloHospedeiro() {
  if (typeof window === 'undefined' || window.parent === window) return false;
  window.parent.postMessage({ type: MENSAGEM_RETORNO_MODULO_EMBUTIDO }, window.location.origin);
  return true;
}

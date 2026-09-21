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
const DURACAO_CONTEXTO_MS = 15_000;
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
 * O resultado serve exclusivamente para evitar um salto de layout; acesso
 * efetivo sempre é confirmado pela rota protegida do módulo.
 */
export function lerContextoVisualModulo(bruto: string | undefined, destino: string, empresaId?: string) {
  return validarContexto(bruto ?? null, destino, empresaId);
}

/**
 * Mantém somente uma prévia visual curta entre páginas internas. Nunca concede
 * acesso: cada módulo confirma sessão e permissões novamente no servidor.
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
    window.sessionStorage.removeItem(CHAVE_CONTEXTO_NAVEGACAO);
    const contextoLocal = validarContexto(bruto, destino, empresaId);
    if (contextoLocal) return contextoLocal;

    // Iframes possuem contexto de sessão próprio. Este parâmetro leva só uma
    // prévia visual de curta duração; a rota ainda confirma acesso no servidor.
    return lerContextoVisualModulo(new URLSearchParams(window.location.search).get(CHAVE_CONTEXTO_URL) ?? undefined, destino, empresaId);
  } catch {
    return null;
  }
}

/** Cria a URL interna do iframe sem transportar credenciais nem conceder acesso. */
export function criarHrefModuloEmbutido(rota: string, contexto: ContextoNavegacaoModulo) {
  const url = new URL(rota, window.location.origin);
  url.searchParams.set('empresaId', contexto.empresaId);
  url.searchParams.set(CHAVE_CONTEXTO_URL, JSON.stringify({ ...contexto, expiraEm: Date.now() + DURACAO_CONTEXTO_MS }));
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

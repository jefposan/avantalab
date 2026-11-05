import type { SupabaseClient, User } from '@supabase/supabase-js';

export type ProvedorOAuthMobile = 'google' | 'apple';
export type EstadoOAuthMobile = {
  tentativa: number;
  etapa: 'ocioso' | 'social' | 'callback' | 'sessao-pronta' | 'erro' | 'cancelado';
  provider?: ProvedorOAuthMobile;
};
export type RetornoOAuthMobile = {
  status: 'concluido' | 'cancelado' | 'erro';
  tentativa: number;
  provider?: ProvedorOAuthMobile;
  usuario?: User;
  mensagem?: string;
};
type Dependencias = {
  cliente: () => SupabaseClient | undefined;
  abrir: (url: string) => Promise<unknown>;
  fechar: () => Promise<unknown>;
  emitir: (retorno: RetornoOAuthMobile) => void;
  estado: (estado: EstadoOAuthMobile) => void;
  diagnostico: (etapa: string, tentativa: number) => void;
  timer: (acao: () => void, ms: number) => ReturnType<typeof setTimeout>;
  limparTimer: (timer: ReturnType<typeof setTimeout>) => void;
};
const REDIRECT = 'br.com.avantalab.app://auth/callback';
const ERRO_REDE = 'Não foi possível confirmar o login agora. Confira sua conexão e tente novamente.';

/** Um único dono da sessão. Não guarda tokens fora do cliente Supabase. */
export function criarControladorOAuthMobile(d: Dependencias) {
  let atual: EstadoOAuthMobile = { tentativa: 0, etapa: 'ocioso' };
  let contador = 0;
  let operacoesPendentes = 0;
  let fechamentosPendentes = 0;
  let timerFechamento: ReturnType<typeof setTimeout> | undefined;
  const recebidos = new Set<string>(); // Memória do documento, nunca logs/storage.
  const emAndamento = () => atual.etapa === 'social' || atual.etapa === 'callback';
  const mesma = (t: EstadoOAuthMobile) => atual === t && emAndamento();
  const limparFechamento = () => {
    if (timerFechamento !== undefined) d.limparTimer(timerFechamento);
    timerFechamento = undefined;
  };
  function atualizar(t: EstadoOAuthMobile, etapa: EstadoOAuthMobile['etapa']) {
    t.etapa = etapa;
    d.estado({ ...t });
    d.diagnostico(etapa, t.tentativa);
  }
  function nova(provider?: ProvedorOAuthMobile) {
    limparFechamento();
    atual = { tentativa: ++contador, etapa: 'social', provider };
    atualizar(atual, 'social');
    return atual;
  }
  async function fechar() {
    fechamentosPendentes++;
    const p = Promise.resolve().then(d.fechar).finally(() => { fechamentosPendentes--; });
    try { await prazo(p, 8000); }
    catch { /* Já fechado/indisponível; nunca desfazer sessão confirmada. */ }
  }
  function falhar(t: EstadoOAuthMobile, mensagem = ERRO_REDE) {
    if (!mesma(t)) return;
    limparFechamento();
    atualizar(t, 'erro');
    d.emitir({ status: 'erro', tentativa: t.tentativa, provider: t.provider, mensagem });
  }
  async function prazo<T>(p: Promise<T>, ms = 45000): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([p, new Promise<never>((_, rejeitar) => {
        timer = d.timer(() => rejeitar(Object.assign(new Error(ERRO_REDE), { code: 'prazo_oauth' })), ms);
      })]);
    } finally { if (timer !== undefined) d.limparTimer(timer); }
  }
  async function esperarCliente(t: EstadoOAuthMobile) {
    let esperaClienteTimer: ReturnType<typeof setTimeout> | undefined;
    const espera = new Promise<SupabaseClient>((resolver, rejeitar) => {
      const verificar = () => {
        if (!mesma(t)) { rejeitar(new Error('tentativa_encerrada')); return; }
        const cliente = d.cliente();
        if (cliente) { resolver(cliente); return; }
        esperaClienteTimer = d.timer(verificar, 100);
      };
      verificar();
    });
    try { return await prazo(espera); }
    finally { if (esperaClienteTimer !== undefined) d.limparTimer(esperaClienteTimer); }
  }
  async function operacao<T>(executar: () => Promise<T>) {
    operacoesPendentes++;
    // O prazo limita a UI, não cancela o SDK. Não iniciar outra autenticação
    // sobre uma chamada antiga ainda capaz de persistir sua sessão.
    const p = Promise.resolve().then(executar).finally(() => { operacoesPendentes--; });
    return prazo(p);
  }
  function transitorio(erro: unknown) {
    const e = erro as { status?: number; name?: string; message?: string; code?: string };
    if (e?.code === 'prazo_oauth') return false;
    if (e?.status && e.status >= 400 && e.status < 500 && e.status !== 429) return false;
    return e?.status === 429 || (e?.status || 0) >= 500 ||
      /fetch|network|timeout|rede|conex|AuthRetryableFetchError/i.test(`${e?.name || ''} ${e?.message || ''}`);
  }
  async function aplicarSessao(t: EstadoOAuthMobile, url: URL, cliente: SupabaseClient) {
    const parametro = (nome: string) => url.searchParams.get(nome) ?? new URLSearchParams(url.hash.slice(1)).get(nome);
    const codigo = parametro('code');
    const access_token = parametro('access_token');
    const refresh_token = parametro('refresh_token');
    // PKCE é uso único: não trocar de novo após uma resposta incerta.
    const limite = codigo ? 1 : 2;
    for (let tentativa = 0; tentativa < limite; tentativa++) {
      if (!mesma(t)) return;
      try {
        const resultado = await operacao(async () => {
          const resposta = await (codigo
            ? cliente.auth.exchangeCodeForSession(codigo)
            : cliente.auth.setSession({ access_token: access_token!, refresh_token: refresh_token! }));
          // Cancelamento durante a rede não pode deixar uma sessão tardia
          // persistida e reaparecer autenticado na próxima abertura.
          if (atual === t && t.etapa === 'cancelado' && resposta.data.session && !resposta.error) {
            await cliente.auth.signOut({ scope: 'local' });
          }
          return resposta;
        });
        if (resultado.error) throw resultado.error;
        if (!resultado.data.session?.user) throw new Error('sessao_nao_confirmada');
        return resultado.data.session.user;
      } catch (erro) {
        if (tentativa + 1 >= limite || !transitorio(erro) || !mesma(t)) throw erro;
        d.diagnostico('repeticao_rede', t.tentativa);
      }
    }
  }
  async function iniciar(provider: ProvedorOAuthMobile, preparacao: Promise<unknown> = Promise.resolve()) {
    if (emAndamento() || operacoesPendentes || fechamentosPendentes) throw new Error('A confirmação anterior ainda está sendo encerrada. Aguarde e tente novamente.');
    const t = nova(provider);
    try {
      await prazo(preparacao);
      if (!mesma(t)) return;
      const cliente = await esperarCliente(t);
      if (!mesma(t)) return;
      const { data, error } = await operacao(() => cliente.auth.signInWithOAuth({
        provider, options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
      }));
      if (!mesma(t)) return;
      if (error || !data.url) throw error || new Error('url_oauth_ausente');
      await prazo(d.abrir(data.url));
    } catch {
      falhar(t, 'Não foi possível iniciar o login social. Confira sua conexão e tente novamente.');
    }
  }
  async function receber(endereco: string) {
    let url: URL;
    try { url = new URL(endereco); } catch { return; }
    if (url.protocol !== 'br.com.avantalab.app:' || url.hostname !== 'auth' || url.pathname !== '/callback') return;
    const parametro = (nome: string) => url.searchParams.get(nome) ?? new URLSearchParams(url.hash.slice(1)).get(nome);
    const erro = parametro('error');
    const descricao = parametro('error_description');
    const codigo = parametro('code');
    const token = parametro('access_token');
    const refresh = parametro('refresh_token');
    if (url.searchParams.get('origem') === 'vendas' && !erro && !descricao && !codigo && !token && !refresh) return;
    if (recebidos.has(endereco) || atual.etapa === 'callback' || atual.etapa === 'sessao-pronta' || atual.etapa === 'cancelado' || atual.etapa === 'erro') return;
    recebidos.add(endereco);
    if (recebidos.size > 16) recebidos.delete(recebidos.values().next().value!);
    const t = atual.etapa === 'social' ? atual : nova();
    limparFechamento();
    atualizar(t, 'callback'); // Antes de await: fechamento não cancela retorno.
    try {
      if (erro || descricao) {
        if (erro === 'access_denied') {
          atualizar(t, 'cancelado');
          d.emitir({ status: 'cancelado', tentativa: t.tentativa, provider: t.provider });
        } else falhar(t, 'O provedor não conseguiu concluir o login. Tente novamente.');
        return;
      }
      if (!codigo && (!token || !refresh)) {
        falhar(t, 'O retorno do login veio incompleto. Tente novamente.'); return;
      }
      const cliente = await esperarCliente(t);
      if (!mesma(t)) return;
      const usuario = await aplicarSessao(t, url, cliente);
      if (!mesma(t) || !usuario) return;
      atualizar(t, 'sessao-pronta');
      d.emitir({ status: 'concluido', tentativa: t.tentativa, provider: t.provider, usuario });
    } catch { falhar(t); }
    finally { if (atual === t) await fechar(); }
  }
  function navegadorFechado() {
    if (atual.etapa !== 'social' || timerFechamento !== undefined) return;
    const t = atual;
    // TAB_HIDDEN/retomada não provam cancelamento. Falta de retorno é erro.
    timerFechamento = d.timer(() => {
      timerFechamento = undefined;
      if (mesma(t) && t.etapa === 'social') falhar(t, 'O navegador foi fechado sem confirmar o acesso. Tente novamente ou cancele para voltar ao login.');
    }, 8000);
  }
  async function cancelar() {
    if (!emAndamento()) return;
    const t = atual;
    limparFechamento();
    atualizar(t, 'cancelado');
    d.emitir({ status: 'cancelado', tentativa: t.tentativa, provider: t.provider });
    await fechar();
  }
  return { iniciar, receber, navegadorFechado, cancelar, emAndamento,
    ocupado: () => emAndamento() || operacoesPendentes > 0 || fechamentosPendentes > 0, estado: () => ({ ...atual }) };
}

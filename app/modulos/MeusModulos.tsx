'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { destinoAposLogin, hrefModulo } from '@/app/lib/acessos-usuario';
import { validarSessaoDoDispositivo } from '@/app/lib/sessao-acesso-cliente';
import { guardarPreviaModulos, lerPreviaModulos, limparPreviaModulos } from '@/app/lib/retorno-modulos';
import { limparNavegacaoModulos, prepararNavegacaoModulo, type ContextoNavegacaoModulo } from '@/app/lib/navegacao-modulos';
import { REGISTRO_MODULOS } from '@/app/lib/modulos-registro';
import TelaCarregandoAcesso from '@/app/components/TelaCarregandoAcesso';
import SelecaoModulos from '@/app/components/SelecaoModulos';

export type PerfilModulos = { empresa: { id: string; nome: string; corPrimaria: string; temaEscuro: boolean; logoUrl?: string; logoAdiada?: boolean }; nomeUsuario: string; perfil: string; dashboard: boolean; planoAtivo: boolean; modulos: Array<{ id: string; nome: string; descricao: string; icone: string }> };

/** Reaproveita somente a imagem já lida; concessões sempre vêm da resposta nova. */
export function preservarLogoPerfil(novo: PerfilModulos, anterior: PerfilModulos | null): PerfilModulos {
  if (!novo.empresa.logoAdiada || !anterior || anterior.empresa.id !== novo.empresa.id || anterior.empresa.logoAdiada) return novo;
  return { ...novo, empresa: { ...novo.empresa, logoUrl: anterior.empresa.logoUrl, logoAdiada: false } };
}
const observarPrevia = () => () => {};
function perfilAnterior() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('retorno') === '1' ? lerPreviaModulos(params.get('empresaId') || '')?.perfil || null : null;
}
export async function buscarAcessosUsuario(empresaId?: string, opcoes: { adiarLogos?: boolean; logoAposDashboard?: boolean; registrarPrevia?: boolean } = {}) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sua sessão expirou. Entre novamente.');
  const parametros = new URLSearchParams();
  if (empresaId) parametros.set('empresaId', empresaId);
  if (opcoes.logoAposDashboard) parametros.set('logos', 'dashboard');
  else if (opcoes.adiarLogos ?? !empresaId) parametros.set('logos', 'adiadas');
  const response = await fetch(`/api/acessos-usuario?${parametros}`, { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.mensagem || 'Não foi possível carregar os acessos.');
  const perfis = body.perfis as PerfilModulos[];
  if (opcoes.registrarPrevia !== false) guardarPreviaModulos(data.session.user.id, perfis, empresaId);
  return perfis;
}


export default function MeusModulos() {
  const router = useRouter();
  const [perfis, setPerfis] = useState<PerfilModulos[]>([]);
  const [perfil, setPerfil] = useState<PerfilModulos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState('');
  const previa = useSyncExternalStore(observarPrevia, perfilAnterior, () => null);
  useEffect(() => {
    if (!perfil?.empresa.logoAdiada) return;
    const id = perfil.empresa.id;
    let vigente = true;
    // A lista já está liberada; a imagem de um único perfil não bloqueia a navegação.
    void buscarAcessosUsuario(id, { registrarPrevia: false }).then(lista => {
      if (!vigente) return;
      const confirmado = lista.find(p => p.empresa.id === id);
      if (!confirmado) { setPerfil(null); setError('Este perfil não está disponível.'); return; }
      // A imagem atrasada nunca substitui permissões de uma revalidação mais nova.
      setPerfil(atual => atual?.empresa.id === id ? { ...atual, empresa: { ...atual.empresa, logoUrl: confirmado.empresa.logoUrl, logoAdiada: false } } : atual);
    }).catch(() => { /* Sem imagem, o nome do perfil continua disponível. */ });
    return () => { vigente = false; };
  }, [perfil?.empresa.id, perfil?.empresa.logoAdiada]);
  async function carregar(silencioso = false) {
    if (!silencioso) setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams(window.location.search);
      const solicitado = params.get('empresaId');
      const lista = await buscarAcessosUsuario(silencioso && solicitado ? solicitado : undefined);
      setPerfis(silencioso && solicitado ? lerPreviaModulos(solicitado)?.perfis || lista : lista);
      const escolhido = lista.find(p => p.empresa.id === solicitado) || (lista.length === 1 ? lista[0] : null);
      setPerfil(escolhido);
      // Somente a entrada pós-login faz autoabertura; Início sempre exibe a seleção.
      if (params.get('entrada') === '1' && escolhido) {
        const sessao = await validarSessaoDoDispositivo(escolhido.empresa.id, 'entrar');
        if (!sessao.ok || !sessao.ativa) throw new Error(sessao.mensagem || 'Não foi possível confirmar sua sessão.');
        router.replace(destinoAposLogin(escolhido.empresa.id, escolhido.dashboard, escolhido.modulos.map(m => m.id)));
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar os módulos.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const solicitado = params.get('empresaId') || '';
    const temPrevia = params.get('retorno') === '1' && Boolean(lerPreviaModulos(solicitado));
    const inicio = window.setTimeout(() => void carregar(temPrevia), 0);
    const subscription = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { limparPreviaModulos(); router.replace('/gestao?entrar=1'); } });
    const conferir = async () => { try { const id = new URLSearchParams(window.location.search).get('empresaId'); const lista = await buscarAcessosUsuario(id || undefined, { adiarLogos: true }); setPerfis(id ? lerPreviaModulos(id)?.perfis || lista : lista); setPerfil(atual => { const novo = atual && lista.find(p => p.empresa.id === atual.empresa.id); return novo ? preservarLogoPerfil(novo, atual) : null; }); } catch { /* A abertura revalida e mostra o erro. */ } };
    const timer = window.setInterval(() => void conferir(), 30000);
    const foco = () => void conferir(); window.addEventListener('focus', foco);
    return () => { clearTimeout(inicio); clearInterval(timer); window.removeEventListener('focus', foco); subscription.data.subscription.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  function abrir(id: string) {
    const escolhido = perfil || previa;
    if (!escolhido || opening) return;
    setOpening(id); setError('');
    try {
      if (id === 'dashboard' ? !escolhido.dashboard : !escolhido.modulos.some(m => m.id === id)) throw new Error('Este acesso não está liberado.');
      if (['gestor_master', 'administrador', 'operador_completo', 'operador_simples'].includes(escolhido.perfil)) {
        const papel = escolhido.perfil as ContextoNavegacaoModulo['perfil'];
        const permissao = REGISTRO_MODULOS.find(m => m.id === id)?.permissoes[papel];
        prepararNavegacaoModulo({ destino: id, empresaId: escolhido.empresa.id, empresa: escolhido.empresa, perfil: papel, podeEditar: Boolean(permissao && permissao !== 'visualizar'), podeGerenciarModulo: permissao === 'administrar' });
      }
      router.prefetch(`/modulos?empresaId=${encodeURIComponent(escolhido.empresa.id)}&retorno=1`);
      router.push(id === 'dashboard' ? `/gestao?empresaId=${encodeURIComponent(escolhido.empresa.id)}` : hrefModulo(id, escolhido.empresa.id));
      // A navegação não aguarda rede. A política de dispositivos continua ativa;
      // dados e operações são autorizados pelos endpoints e pelas políticas RLS.
      void validarSessaoDoDispositivo(escolhido.empresa.id, 'entrar').then(sessao => {
        if (!sessao.ok || !sessao.ativa) router.replace(`/modulos?empresaId=${encodeURIComponent(escolhido.empresa.id)}`);
      }).catch(() => router.replace(`/modulos?empresaId=${encodeURIComponent(escolhido.empresa.id)}`));
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir o módulo.'); setOpening(''); }
  }
  async function sair() { limparNavegacaoModulos(); await supabase.auth.signOut({ scope: 'local' }); router.replace('/gestao?entrar=1'); }
  if (loading && !previa) return <TelaCarregandoAcesso titulo="Preparando seus módulos" mensagem="Confirmando suas liberações…" />;
  const perfilVisivel = loading ? previa : perfil;
  const perfisVisiveis = loading && previa ? lerPreviaModulos(previa.empresa.id)?.perfis || [previa] : perfis;
  return <SelecaoModulos perfis={perfisVisiveis} perfil={perfilVisivel} error={error} opening={opening} onAbrir={id => void abrir(id)} onSelecionarPerfil={p => { setPerfil(p); router.replace(`/modulos?empresaId=${encodeURIComponent(p.empresa.id)}`); }} onTrocarPerfil={() => router.replace('/gestao')} onTentarNovamente={() => void carregar()} onSair={() => void sair()} />;
}

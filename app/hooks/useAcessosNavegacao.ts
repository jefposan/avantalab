'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { supabase } from '@/app/lib/supabase';
import { CHAVE_PREVIA_MODULOS, atualizacaoPreviaModulos, lerPreviaModulos, limparPreviaModulos, observarPreviaModulos, sincronizarPreviaModulos } from '@/app/lib/retorno-modulos';
import { atualizarAcessosNavegacao, CANAL_ACESSOS_MODULOS, EVENTO_ACESSOS_MODULOS } from '@/app/lib/navegacao-acessos-cliente';

export function useAcessosNavegacao(empresaId: string) {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [falha, setFalha] = useState<{ empresaId: string; usuarioId: string; mensagem: string } | null>(null);
  const escopo = useRef({ empresaId, usuarioId });
  useEffect(() => { escopo.current = { empresaId, usuarioId }; }, [empresaId, usuarioId]);
  const perfil = useSyncExternalStore(observarPreviaModulos, useCallback(() => usuarioId ? lerPreviaModulos(empresaId, usuarioId)?.perfil || null : null, [empresaId, usuarioId]), () => null);
  const atualizar = useCallback(async () => {
    if (!usuarioId || !empresaId) return;
    const vigente = () => escopo.current.empresaId === empresaId && escopo.current.usuarioId === usuarioId;
    try { await atualizarAcessosNavegacao(empresaId, usuarioId); if (vigente()) setFalha(null); }
    catch (error) { if (vigente()) setFalha({ empresaId, usuarioId, mensagem: error instanceof Error ? error.message : 'Não foi possível atualizar os acessos.' }); }
  }, [empresaId, usuarioId]);

  useEffect(() => {
    let ativo = true;
    let eventoRecebido = false;
    void supabase.auth.getSession().then(({ data }) => { if (ativo && !eventoRecebido) setUsuarioId(data.session?.user.id || null); }).catch(() => { if (ativo) setUsuarioId(null); });
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      eventoRecebido = true;
      if (evento === 'SIGNED_OUT') limparPreviaModulos();
      setUsuarioId(sessao?.user.id || null);
    });
    return () => { ativo = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!usuarioId || !empresaId) return;
    let ativo = true;
    let agendado: ReturnType<typeof setTimeout> | undefined;
    let ultimaConsulta = 0;
    const atualizarSilencioso = () => {
      if (!ativo || agendado) return;
      agendado = setTimeout(() => { agendado = undefined; if (ativo) { ultimaConsulta = Date.now(); void atualizar(); } }, Math.max(100, 1000 - (Date.now() - ultimaConsulta)));
    };
    // Lista do login aparece sem rede. Entrada direta sem prévia prepara uma vez.
    if (!lerPreviaModulos(empresaId, usuarioId)) atualizarSilencioso();
    const canal = supabase.channel(`${CANAL_ACESSOS_MODULOS}${empresaId}`)
      .on('broadcast', { event: EVENTO_ACESSOS_MODULOS }, atualizarSilencioso)
      .subscribe(status => { if (status === 'SUBSCRIBED') atualizarSilencioso(); });
    const storage = (event: StorageEvent) => { if (event.key === CHAVE_PREVIA_MODULOS || event.key === null) sincronizarPreviaModulos(); };
    window.addEventListener('storage', storage);
    window.addEventListener('focus', atualizarSilencioso);
    window.addEventListener('online', atualizarSilencioso);
    // Recuperação silenciosa para eventos perdidos e vencimentos, nunca ao abrir.
    const intervalo = window.setInterval(() => { if (Date.now() - atualizacaoPreviaModulos(empresaId, usuarioId) >= 60_000) atualizarSilencioso(); }, 60_000);
    return () => { ativo = false; clearTimeout(agendado); clearInterval(intervalo); window.removeEventListener('storage', storage); window.removeEventListener('focus', atualizarSilencioso); window.removeEventListener('online', atualizarSilencioso); void supabase.removeChannel(canal); };
  }, [empresaId, usuarioId, atualizar]);

  return { perfil, usuarioId, atualizar, erro: falha?.empresaId === empresaId && falha.usuarioId === usuarioId ? falha.mensagem : '' };
}

'use client';

import { Capacitor } from '@capacitor/core';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import ModuloHeader from '../components/ModuloHeader';
import { supabase } from '../lib/supabase';
import { criarRepoSupabase } from '../recebimentos/data/repo';

const RecebimentosClient = dynamic(() => import('../recebimentos/RecebimentosClient'));
type Acesso = { empresa: { id: string; nome: string; corPrimaria: string; temaEscuro: boolean; logoUrl?: string }; perfil: string };

export default function OperacoesCampoNativoBridge() {
  const [empresaId, setEmpresaId] = useState('');
  const [acesso, setAcesso] = useState<Acesso | null>(null);
  const [erro, setErro] = useState('');
  const painel = useRef<HTMLElement>(null);
  const repo = useMemo(() => acesso ? criarRepoSupabase(acesso.empresa.id) : null, [acesso]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const abrir = (event: Event) => {
      const id = (event as CustomEvent<{ empresaId?: string }>).detail?.empresaId || '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return;
      setAcesso(null); setErro(''); setEmpresaId(id);
    };
    const fechar = () => setEmpresaId('');
    window.addEventListener('avantalab:open-operacoes-nativo', abrir);
    window.addEventListener('avantalab:close-native-modules', fechar);
    return () => {
      window.removeEventListener('avantalab:open-operacoes-nativo', abrir);
      window.removeEventListener('avantalab:close-native-modules', fechar);
    };
  }, []);
  useEffect(() => {
    if (!empresaId) return;
    const controller = new AbortController();
    const limite = window.setTimeout(() => controller.abort(), 15000);
    let ativo = true;
    const root = document.getElementById('mobile-root');
    const focoAnterior = document.activeElement as HTMLElement | null;
    if (root) root.inert = true;
    painel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const subscription = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') setEmpresaId(''); });
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('Sua sessão expirou. Entre novamente no app.');
        const resposta = await fetch(`/api/modulos/acesso?empresaId=${encodeURIComponent(empresaId)}&moduloId=recebimentos_presencial`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: 'no-store', signal: controller.signal,
        });
        const dados = await resposta.json();
        if (!resposta.ok || !['gestor_master', 'administrador'].includes(dados.perfil)) throw new Error(dados.mensagem || 'Este módulo não está liberado para seu usuário.');
        if (ativo) setAcesso(dados);
      } catch (falha) {
        if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir o módulo. Volte e tente novamente.');
      }
    })();
    return () => { ativo = false; window.clearTimeout(limite); controller.abort(); subscription.data.subscription.unsubscribe(); if (root) root.inert = false; focoAnterior?.focus(); };
  }, [empresaId]);
  if (!empresaId) return null;
  return <section ref={painel} aria-label="Operações de Campo" className={`fixed inset-0 z-[15000] overflow-auto ${acesso?.empresa.temaEscuro ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`} style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
    <ModuloHeader empresa={acesso?.empresa || { nome: 'Operações de Campo', corPrimaria: '#003E73', temaEscuro: false }} onBack={() => setEmpresaId('')} returnAriaLabel="Voltar ao início do app" />
    {erro ? <p role="alert" className="p-5 text-sm">{erro}</p> : acesso && repo ? <RecebimentosClient repo={repo} integrado perfilInicial={acesso.perfil === 'gestor_master' ? 'gestor' : 'administrador'} darkMode={acesso.empresa.temaEscuro} corPrimaria={acesso.empresa.corPrimaria} nomeEmpresa={acesso.empresa.nome} rascunhoEscopo={`app:${empresaId}`} /> : <p role="status" className="p-5 text-sm">Preparando Operações de Campo…</p>}
  </section>;
}

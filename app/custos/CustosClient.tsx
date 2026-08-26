'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import TelaCarregandoAcesso from '@/app/components/TelaCarregandoAcesso';
import { supabase } from '@/app/lib/supabase';
import { Icon } from '@/app/projetos/components/Icon';
import { Modal } from '@/app/projetos/components/Modal';
import CustosWorkspace from './CustosWorkspace';
import styles from './custos.module.css';

export type CustosAccess = {
  empresa: { id: string; nome: string; corPrimaria: string; temaEscuro: boolean };
  perfil: 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples';
  podeEditar: boolean;
  podeGerenciarModulo: boolean;
};

export default function CustosClient({ companyId }: { companyId: string }) {
  const demonstracao = process.env.NODE_ENV === 'development' && !companyId;
  const [access, setAccess] = useState<CustosAccess | null>(() => demonstracao ? {
    empresa: { id: 'demo-local', nome: 'Demonstração local', corPrimaria: '#003E73', temaEscuro: false },
    perfil: 'gestor_master', podeEditar: true, podeGerenciarModulo: true,
  } : null);
  const [error, setError] = useState('');
  const [ajustesAbertos, setAjustesAbertos] = useState(false);
  const [atualizandoTema, setAtualizandoTema] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    let ativo = true;
    const verificar = async () => {
      if (demonstracao) return;
      if (!companyId) { setError('Selecione um perfil empresarial na Gestão antes de abrir Custos e Precificação.'); return; }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setError('Sua sessão não está disponível. Volte ao AvantaLab e entre novamente.'); return; }
      const resposta = await fetch(`/api/modulos/acesso?empresaId=${encodeURIComponent(companyId)}&moduloId=custos`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await resposta.json().catch(() => ({}));
      if (!ativo) return;
      if (!resposta.ok) { setError(json.mensagem || 'Não foi possível abrir este módulo.'); return; }
      setAccess(json as CustosAccess);
    };
    void verificar();
    return () => { ativo = false; };
  }, [companyId, demonstracao]);

  useEffect(() => {
    if (!demonstracao) return;
    const timer = window.setTimeout(() => {
      const temaEscuro = window.localStorage.getItem('avantalab:custos:aparencia:v1') === 'escuro';
      if (temaEscuro) setAccess((atual) => atual ? { ...atual, empresa: { ...atual.empresa, temaEscuro: true } } : atual);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [demonstracao]);

  useEffect(() => {
    if (!mensagem) return;
    const timer = window.setTimeout(() => setMensagem(''), 4800);
    return () => window.clearTimeout(timer);
  }, [mensagem]);

  if (error) return <main className={styles.accessState}><div><span aria-hidden="true">◇</span><h1>Custos e Precificação</h1><p>{error}</p><Link href="/gestao">‹ Início</Link></div></main>;
  if (!access) return <TelaCarregandoAcesso titulo="Validando acesso" mensagem="Confirmando o módulo e seu perfil…" />;

  const alterarTema = async () => {
    if (atualizandoTema || !access.podeGerenciarModulo) return;
    const temaEscuroAnterior = access.empresa.temaEscuro;
    const temaEscuro = !temaEscuroAnterior;
    setAccess({ ...access, empresa: { ...access.empresa, temaEscuro } });
    setAtualizandoTema(true);
    try {
      if (demonstracao) {
        window.localStorage.setItem('avantalab:custos:aparencia:v1', temaEscuro ? 'escuro' : 'claro');
      } else {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Sua sessão não está disponível. Volte ao AvantaLab e entre novamente.');
        const resposta = await fetch('/api/modulos/custos/ajustes', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ empresaId: companyId, temaEscuro }),
        });
        const json = await resposta.json().catch(() => ({}));
        if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível atualizar o modo visual.');
      }
      setMensagem(temaEscuro ? 'Modo escuro ativado para este perfil.' : 'Modo claro ativado para este perfil.');
    } catch (falha) {
      setAccess({ ...access, empresa: { ...access.empresa, temaEscuro: temaEscuroAnterior } });
      setMensagem(falha instanceof Error ? falha.message : 'Não foi possível atualizar o modo visual.');
    } finally { setAtualizandoTema(false); }
  };

  return <main className={`${styles.root} ${access.empresa.temaEscuro ? styles.dark : ''} typography-system`} style={{ '--custos-brand': access.empresa.corPrimaria } as React.CSSProperties}>
    <header className={styles.moduleHeader}>
      <Link href={companyId ? `/gestao?empresaId=${encodeURIComponent(companyId)}` : '/gestao'} className={styles.moduleExit} aria-label="Voltar ao Dashboard do AvantaLab"><Icon name="back" size={16} /> Início</Link>
      <div className={styles.moduleIdentity}>
        <Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" width={160} height={40} loading="eager" className={styles.moduleLogo} />
        <span>{access.empresa.nome}</span>
      </div>
      <div className={styles.moduleHeaderActions}>
        {access.podeGerenciarModulo && <button type="button" className={styles.moduleSettingsButton} onClick={() => setAjustesAbertos(true)} aria-label="Abrir ajustes de Custos e Precificação" title="Ajustes"><Icon name="settings" size={18} /></button>}
        {demonstracao ? <span className={styles.readOnlyBadge}>Teste local</span> : !access.podeEditar && <span className={styles.readOnlyBadge}>Somente visualização</span>}
      </div>
    </header>
    <CustosWorkspace companyId={companyId || 'demo-local'} access={access} demonstracao={demonstracao} />
    <Modal open={ajustesAbertos} onClose={() => setAjustesAbertos(false)} title="Ajustes de Custos e Precificação" description="Preferências do perfil que também orientam a aparência no AvantaLab.">
      <section className={styles.settingsSection} aria-label="Ajustes visuais">
        <div><strong>Modo escuro</strong><p>Aplica a aparência escura a este perfil no AvantaLab e nos módulos compatíveis.</p></div>
        <button type="button" className={styles.settingsThemeSwitch} role="switch" aria-label="Modo escuro" aria-checked={access.empresa.temaEscuro} aria-busy={atualizandoTema || undefined} onClick={() => void alterarTema()} disabled={atualizandoTema}>
          <span>{access.empresa.temaEscuro ? 'ON' : 'OFF'}</span><i aria-hidden="true" />
        </button>
      </section>
    </Modal>
    {mensagem && <div className={styles.themeToast} role="status" aria-live="polite">{mensagem}</div>}
  </main>;
}

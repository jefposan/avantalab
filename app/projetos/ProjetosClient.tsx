'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import TelaCarregandoAcesso from '@/app/components/TelaCarregandoAcesso';
import { useProjectCollection } from './hooks/useProjectCollection';
import { SupabaseProjectRepository } from './services/supabase-repository';
import styles from './projetos.module.css';
import { ProjectHome } from './components/ProjectHome';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { Icon } from './components/Icon';
import { Modal } from './components/Modal';
import type { ProfileRole } from './types';

type ModuleAccess = {
  empresa: { id: string; nome: string; corPrimaria: string; temaEscuro: boolean };
  perfil: ProfileRole;
  podeEditar: boolean;
  podeGerenciarModulo: boolean;
  expiraEm: string | null;
};

function ProjectApp({ companyId, access, onAccessChange }: { companyId: string; access: ModuleAccess; onAccessChange: (next: ModuleAccess) => void }) {
  const repository = useMemo(() => new SupabaseProjectRepository(), []);
  const { collection, setCollection, loaded, saveState, message, setMessage, undo, redo, canUndo, canRedo } = useProjectCollection(companyId, repository, access.podeEditar);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [mapaEmFoco, setMapaEmFoco] = useState(false);
  const [ajustesAbertos, setAjustesAbertos] = useState(false);
  const [atualizandoTema, setAtualizandoTema] = useState(false);
  const activeProject = collection.projects.find((project) => project.id === activeProjectId) ?? null;

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 5200);
    return () => window.clearTimeout(timer);
  }, [message, setMessage]);

  if (!loaded) return <TelaCarregandoAcesso titulo="Preparando projetos" mensagem="Carregando os dados do perfil com segurança…" />;

  const voltarParaProjetos = () => {
    setMapaEmFoco(false);
    setActiveProjectId(null);
  };

  const alterarTema = async () => {
    if (atualizandoTema || !access.podeGerenciarModulo) return;
    const temaEscuroAnterior = access.empresa.temaEscuro;
    const temaEscuro = !temaEscuroAnterior;
    const proximoAcesso = { ...access, empresa: { ...access.empresa, temaEscuro } };
    onAccessChange(proximoAcesso);
    setAtualizandoTema(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão não está disponível. Volte ao AvantaLab e entre novamente.');
      const resposta = await fetch('/api/modulos/projetos/ajustes', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId: companyId, temaEscuro }),
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível atualizar o modo visual.');
      setMessage(temaEscuro ? 'Modo escuro ativado para este perfil.' : 'Modo claro ativado para este perfil.');
    } catch (error) {
      onAccessChange({ ...access, empresa: { ...access.empresa, temaEscuro: temaEscuroAnterior } });
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o modo visual.');
    } finally { setAtualizandoTema(false); }
  };

  return <main className={`${styles.root} ${access.empresa.temaEscuro ? styles.darkTheme : ''} ${mapaEmFoco ? styles.mapFocusMode : ''} typography-system`} style={{ '--project-profile-color': access.empresa.corPrimaria } as React.CSSProperties}>
    <header className={styles.moduleHeader}>
      <Link href={`/gestao?empresaId=${encodeURIComponent(companyId)}`} className={styles.moduleExit} aria-label="Sair do AvantaProjetos e voltar ao AvantaLab">Sair</Link>
      <div className={styles.moduleIdentity}>
        <Image
          src="/images/logo-avantalab-oficial.png"
          alt="AvantaLab — Do zero ao operacional"
          width={160}
          height={40}
          loading="eager"
          className={styles.moduleLogo}
        />
        <span>{access.empresa.nome}</span>
      </div>
      <div className={styles.moduleHeaderActions}>
        {access.podeGerenciarModulo && <button type="button" className={styles.moduleSettingsButton} onClick={() => setAjustesAbertos(true)} aria-label="Abrir ajustes do AvantaProjetos" title="Ajustes"><Icon name="settings" size={18} /></button>}
        {!access.podeEditar && <span className={styles.readOnlyBadge}>Somente visualização</span>}
      </div>
    </header>
    <div className={styles.moduleContent}>
      {activeProject ? <ProjectWorkspace readOnly={!access.podeEditar} project={activeProject} people={collection.people} saveState={saveState} onBack={voltarParaProjetos} onChange={(next) => setCollection((current) => ({ ...current, projects: current.projects.map((project) => project.id === next.id ? next : project) }))} onUndo={() => { if (!undo()) setMessage('Não há alterações para desfazer.'); }} onRedo={() => { if (!redo()) setMessage('Não há alterações para refazer.'); }} canUndo={canUndo} canRedo={canRedo} onMessage={setMessage} mapaEmFoco={mapaEmFoco} onMapaEmFocoChange={setMapaEmFoco} /> : <ProjectHome readOnly={!access.podeEditar} collection={collection} onChange={(next) => setCollection(next)} onOpen={setActiveProjectId} onMessage={setMessage} />}
    </div>
    <Modal open={ajustesAbertos} onClose={() => setAjustesAbertos(false)} title="Ajustes do AvantaProjetos" description="Preferências do perfil que também orientam a aparência no AvantaLab.">
      <section className={styles.settingsSection} aria-label="Ajustes visuais">
        <div><strong>Modo escuro</strong><p>Aplica a aparência escura a este perfil no AvantaLab e nos módulos compatíveis.</p></div>
        <button type="button" className={styles.settingsThemeSwitch} role="switch" aria-label="Modo escuro" aria-checked={access.empresa.temaEscuro} aria-busy={atualizandoTema || undefined} onClick={() => void alterarTema()} disabled={atualizandoTema}>
          <span>{access.empresa.temaEscuro ? 'ON' : 'OFF'}</span><i aria-hidden="true" />
        </button>
      </section>
    </Modal>
    {message && <div className={styles.toast} role="status" aria-live="polite">{message}</div>}
  </main>;
}

export default function ProjetosClient({ companyId }: { companyId: string }) {
  const [access, setAccess] = useState<ModuleAccess | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const verify = async () => {
      if (!companyId) { setError('Selecione um perfil empresarial na Gestão antes de abrir Projetos.'); return; }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setError('Sua sessão não está disponível. Volte ao AvantaLab e entre novamente.'); return; }
      const response = await fetch(`/api/modulos/acesso?empresaId=${encodeURIComponent(companyId)}&moduloId=projetos`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok) { setError(json.mensagem || 'Não foi possível abrir este módulo.'); return; }
      setAccess(json as ModuleAccess);
    };
    void verify();
    return () => { active = false; };
  }, [companyId]);

  if (error) return <main className={styles.accessState}><div><span aria-hidden="true">◇</span><h1>AvantaProjetos</h1><p>{error}</p><Link href="/gestao">Sair</Link></div></main>;
  if (!access) return <TelaCarregandoAcesso titulo="Validando acesso" mensagem="Confirmando o módulo e seu perfil…" />;
  return <ProjectApp companyId={companyId} access={access} onAccessChange={setAccess} />;
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { PROJECT_FILE_VERSION, type ProfileRole, type ProjectCollection, type SharedProjectSummary } from './types';

type ModuleAccess = {
  empresa: { id: string; nome: string; corPrimaria: string; temaEscuro: boolean };
  perfil: ProfileRole;
  podeEditar: boolean;
  podeGerenciarModulo: boolean;
  expiraEm: string | null;
  compartilhado?: boolean;
  compartilhamentos?: Array<{ projetoId: string; acesso: 'editor' | 'observador' }>;
  retornoEmpresaId?: string | null;
};

type SharedContext = { id: string; nome: string; corPrimaria: string; temaEscuro: boolean };
type SharedProjectsState = 'loading' | 'ready' | 'error';

function ProjectModuleHeader({ companyName, returnCompanyId, showSettings = false, onSettings, badge }: {
  companyName: string;
  returnCompanyId: string;
  showSettings?: boolean;
  onSettings?: () => void;
  badge?: string;
}) {
  return <header className={styles.moduleHeader}>
    <Link href={`/gestao?empresaId=${encodeURIComponent(returnCompanyId)}`} className={styles.moduleExit} aria-label="Voltar ao início do AvantaLab"><Icon name="back" size={16} /> Início</Link>
    <div className={styles.moduleIdentity}>
      <Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" width={160} height={40} loading="eager" className={styles.moduleLogo} />
      <span>{companyName}</span>
    </div>
    <div className={styles.moduleHeaderActions}>
      {showSettings && <button type="button" className={styles.moduleSettingsButton} onClick={onSettings} aria-label="Abrir ajustes do AvantaProjetos" title="Ajustes"><Icon name="settings" size={18} /></button>}
      {badge && <span className={styles.readOnlyBadge}>{badge}</span>}
    </div>
  </header>;
}

function ProjectApp({ companyId, returnCompanyId, initialProjectId, access, onAccessChange, sharedProjects, sharedProjectsState }: {
  companyId: string;
  returnCompanyId: string;
  initialProjectId: string;
  access: ModuleAccess;
  onAccessChange: (next: ModuleAccess) => void;
  sharedProjects: SharedProjectSummary[];
  sharedProjectsState: SharedProjectsState;
}) {
  const router = useRouter();
  const repository = useMemo(() => new SupabaseProjectRepository(), []);
  const { collection, setCollection, loaded, saveState, message, setMessage, undo, redo, canUndo, canRedo } = useProjectCollection(companyId, repository, access.podeEditar);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initialProjectId || null);
  const [mapaEmFoco, setMapaEmFoco] = useState(false);
  const [ajustesAbertos, setAjustesAbertos] = useState(false);
  const [atualizandoTema, setAtualizandoTema] = useState(false);
  const activeProject = collection.projects.find((project) => project.id === activeProjectId) ?? null;
  const effectiveReturnCompanyId = returnCompanyId || access.retornoEmpresaId || companyId;
  const activeSharedAccess = access.compartilhamentos?.find((item) => item.projetoId === activeProjectId)?.acesso;
  const activeProjectReadOnly = access.compartilhado ? activeSharedAccess !== 'editor' : !access.podeEditar;

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 5200);
    return () => window.clearTimeout(timer);
  }, [message, setMessage]);

  if (!loaded) return <TelaCarregandoAcesso titulo="Preparando projetos" mensagem="Carregando os dados do perfil com segurança…" />;

  const voltarParaProjetos = () => {
    setMapaEmFoco(false);
    if (access.compartilhado && effectiveReturnCompanyId !== companyId) {
      router.push(`/projetos?empresaId=${encodeURIComponent(effectiveReturnCompanyId)}`);
      return;
    }
    setActiveProjectId(null);
  };

  const openSharedProject = (project: SharedProjectSummary) => {
    router.push(`/projetos?empresaId=${encodeURIComponent(project.companyId)}&projetoId=${encodeURIComponent(project.projectId)}&retornoEmpresaId=${encodeURIComponent(effectiveReturnCompanyId)}`);
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
    <ProjectModuleHeader companyName={access.empresa.nome} returnCompanyId={effectiveReturnCompanyId} showSettings={access.podeGerenciarModulo} onSettings={() => setAjustesAbertos(true)} badge={activeProject ? activeProjectReadOnly ? 'Somente visualização' : access.compartilhado ? 'Projeto compartilhado' : undefined : access.compartilhado ? 'Acesso compartilhado' : !access.podeEditar ? 'Somente visualização' : undefined} />
    <div className={styles.moduleContent}>
      {activeProject ? <ProjectWorkspace readOnly={activeProjectReadOnly} project={activeProject} people={collection.people} saveState={saveState} onBack={voltarParaProjetos} onChange={(next) => setCollection((current) => ({ ...current, projects: current.projects.map((project) => project.id === next.id ? next : project) }))} onUndo={() => { if (!undo()) setMessage('Não há alterações para desfazer.'); }} onRedo={() => { if (!redo()) setMessage('Não há alterações para refazer.'); }} canUndo={!activeProjectReadOnly && canUndo} canRedo={!activeProjectReadOnly && canRedo} onMessage={setMessage} mapaEmFoco={mapaEmFoco} onMapaEmFocoChange={setMapaEmFoco} /> : <ProjectHome readOnly={!access.podeEditar || access.compartilhado === true} collection={collection} onChange={(next) => setCollection(next)} onOpen={setActiveProjectId} onMessage={setMessage} sharedProjects={sharedProjects} sharedProjectsState={sharedProjectsState} onOpenShared={openSharedProject} sharedAccessOnly={access.compartilhado === true} />}
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

function SharedProjectsHub({ companyId, context, projects, state }: { companyId: string; context: SharedContext; projects: SharedProjectSummary[]; state: SharedProjectsState }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const collection = useMemo<ProjectCollection>(() => ({ version: PROJECT_FILE_VERSION, companyId, people: [], projects: [] }), [companyId]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 5200);
    return () => window.clearTimeout(timer);
  }, [message]);
  const openSharedProject = (project: SharedProjectSummary) => {
    router.push(`/projetos?empresaId=${encodeURIComponent(project.companyId)}&projetoId=${encodeURIComponent(project.projectId)}&retornoEmpresaId=${encodeURIComponent(companyId)}`);
  };
  return <main className={`${styles.root} ${context.temaEscuro ? styles.darkTheme : ''} typography-system`} style={{ '--project-profile-color': context.corPrimaria } as React.CSSProperties}>
    <ProjectModuleHeader companyName={context.nome} returnCompanyId={companyId} badge="Acesso compartilhado" />
    <div className={styles.moduleContent}>
      <ProjectHome collection={collection} onChange={() => {}} onOpen={() => {}} onMessage={setMessage} readOnly sharedProjects={projects} sharedProjectsState={state} onOpenShared={openSharedProject} sharedAccessOnly />
    </div>
    {message && <div className={styles.toast} role="status" aria-live="polite">{message}</div>}
  </main>;
}

export default function ProjetosClient({ companyId, initialProjectId = '', returnCompanyId = '' }: { companyId: string; initialProjectId?: string; returnCompanyId?: string }) {
  const [access, setAccess] = useState<ModuleAccess | null>(null);
  const [sharedOnly, setSharedOnly] = useState(false);
  const [sharedProjects, setSharedProjects] = useState<SharedProjectSummary[]>([]);
  const [sharedProjectsState, setSharedProjectsState] = useState<SharedProjectsState>('loading');
  const [sharedContext, setSharedContext] = useState<SharedContext>({ id: companyId, nome: 'Projetos compartilhados', corPrimaria: '#003E73', temaEscuro: false });
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const verify = async () => {
      if (!companyId) { setError('Selecione um perfil empresarial na Gestão antes de abrir Projetos.'); return; }
      setAccess(null);
      setSharedOnly(false);
      setError('');
      setSharedProjectsState('loading');
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setError('Sua sessão não está disponível. Volte ao AvantaLab e entre novamente.'); return; }
      const headers = { Authorization: `Bearer ${token}` };
      const [accessResponse, sharedResponse] = await Promise.all([
        fetch(`/api/modulos/acesso?empresaId=${encodeURIComponent(companyId)}&moduloId=projetos`, { headers }),
        fetch(`/api/modulos/projetos/compartilhados?empresaId=${encodeURIComponent(returnCompanyId || companyId)}`, { headers, cache: 'no-store' }),
      ]);
      const [accessJson, sharedJson] = await Promise.all([accessResponse.json().catch(() => ({})), sharedResponse.json().catch(() => ({}))]);
      if (!active) return;
      if (sharedResponse.ok) {
        const projects = Array.isArray(sharedJson.projetos) ? sharedJson.projetos as SharedProjectSummary[] : [];
        setSharedProjects(projects);
        setSharedContext(sharedJson.contexto || { id: companyId, nome: 'Projetos compartilhados', corPrimaria: '#003E73', temaEscuro: false });
        setSharedProjectsState('ready');
        if (!accessResponse.ok && projects.length > 0) { setSharedOnly(true); return; }
      } else {
        setSharedProjects([]);
        setSharedProjectsState('error');
      }
      if (!accessResponse.ok) { setError(accessJson.mensagem || 'Não foi possível abrir este módulo.'); return; }
      setAccess(accessJson as ModuleAccess);
    };
    void verify();
    return () => { active = false; };
  }, [companyId, returnCompanyId]);

  if (error) return <main className={styles.accessState}><div><span aria-hidden="true">◇</span><h1>AvantaProjetos</h1><p>{error}</p><Link href={`/gestao?empresaId=${encodeURIComponent(returnCompanyId || companyId)}`}>‹ Início</Link></div></main>;
  if (sharedOnly) return <SharedProjectsHub companyId={returnCompanyId || companyId} context={sharedContext} projects={sharedProjects} state={sharedProjectsState} />;
  if (!access) return <TelaCarregandoAcesso titulo="Validando acesso" mensagem="Confirmando o módulo e os projetos compartilhados…" />;
  return <ProjectApp companyId={companyId} returnCompanyId={returnCompanyId} initialProjectId={initialProjectId} access={access} onAccessChange={setAccess} sharedProjects={sharedProjects} sharedProjectsState={sharedProjectsState} />;
}

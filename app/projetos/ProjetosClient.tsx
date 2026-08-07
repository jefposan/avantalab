'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useProjectCollection } from './hooks/useProjectCollection';
import { SupabaseProjectRepository } from './services/supabase-repository';
import styles from './projetos.module.css';
import { ProjectHome } from './components/ProjectHome';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import type { ProfileRole } from './types';

type ModuleAccess = {
  empresa: { id: string; nome: string; corPrimaria: string };
  perfil: ProfileRole;
  podeEditar: boolean;
  expiraEm: string | null;
};

function ProjectApp({ companyId, access }: { companyId: string; access: ModuleAccess }) {
  const repository = useMemo(() => new SupabaseProjectRepository(), []);
  const { collection, setCollection, loaded, saveState, message, setMessage, undo, redo, canUndo, canRedo } = useProjectCollection(companyId, repository, access.podeEditar);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const activeProject = collection.projects.find((project) => project.id === activeProjectId) ?? null;

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 5200);
    return () => window.clearTimeout(timer);
  }, [message, setMessage]);

  if (!loaded) return <main className={styles.loadingState}><div aria-hidden="true" /><h1>Preparando seus projetos</h1><p>Carregando os dados do perfil com segurança…</p></main>;

  return <main className={`${styles.root} typography-system`} style={{ '--project-profile-color': access.empresa.corPrimaria } as React.CSSProperties}>
    <header className={styles.moduleHeader}>
      <Link href={`/gestao?empresaId=${encodeURIComponent(companyId)}`} className={styles.moduleBack}>← Voltar ao AvantaLab</Link>
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
      {!access.podeEditar && <span className={styles.readOnlyBadge}>Somente visualização</span>}
    </header>
    <div className={styles.moduleContent}>
      {activeProject ? <ProjectWorkspace readOnly={!access.podeEditar} project={activeProject} people={collection.people} saveState={saveState} onBack={() => setActiveProjectId(null)} onChange={(next) => setCollection((current) => ({ ...current, projects: current.projects.map((project) => project.id === next.id ? next : project) }))} onUndo={() => { if (!undo()) setMessage('Não há alterações para desfazer.'); }} onRedo={() => { if (!redo()) setMessage('Não há alterações para refazer.'); }} canUndo={canUndo} canRedo={canRedo} onMessage={setMessage} /> : <ProjectHome readOnly={!access.podeEditar} collection={collection} onChange={(next) => setCollection(next)} onOpen={setActiveProjectId} onMessage={setMessage} />}
    </div>
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

  if (error) return <main className={styles.accessState}><div><span aria-hidden="true">◇</span><h1>AvantaProjetos</h1><p>{error}</p><Link href="/gestao">Voltar ao AvantaLab</Link></div></main>;
  if (!access) return <main className={styles.loadingState}><div aria-hidden="true" /><h1>Validando acesso</h1><p>Confirmando o módulo e seu perfil…</p></main>;
  return <ProjectApp companyId={companyId} access={access} />;
}

'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { calculateProjectProgress, createId, removeParticipantFromCollection, removeProjectFromCollection, validateProjectImport } from '../domain/project';
import { createProjectFromTemplate } from '../data/demo';
import { STATUS_LABELS, type Project, type ProjectCollection, type ProjectStatus, type ProjectTemplate } from '../types';
import styles from '../projetos.module.css';
import { Icon } from './Icon';
import { Modal } from './Modal';
import Tooltip from '@/app/components/Tooltip';
import { supabase } from '@/app/lib/supabase';

const TEMPLATE_OPTIONS: Array<[ProjectTemplate, string, string]> = [
  ['blank', 'Projeto em branco', 'Comece apenas com o nó principal.'],
  ['commercial', 'Planejamento comercial', 'Objetivos, estratégia, equipe e indicadores.'],
  ['campaign', 'Campanha de vendas', 'Do planejamento ao acompanhamento dos resultados.'],
  ['product-launch', 'Lançamento de produto', 'Pesquisa, produto, comunicação e pós-lançamento.'],
  ['visits', 'Organização de visitas', 'Roteiro, clientes e retornos.'],
  ['client-growth', 'Expansão da carteira', 'Prospecção, conversão e retenção.'],
  ['monthly', 'Planejamento mensal', 'Estrutura inicial por semanas.'],
  ['stages', 'Projeto com etapas', 'Descoberta, planejamento, execução e entrega.'],
  ['free-map', 'Mapa livre de ideias', 'Um espaço leve para começar a pensar.'],
];

const PROJECT_ICON_OPTIONS = [
  ['◇', 'Projeto'],
  ['✦', 'Destaque'],
  ['★', 'Favorito'],
  ['◎', 'Objetivo'],
  ['⚑', 'Marco'],
  ['✓', 'Entrega'],
  ['⏱', 'Prazo'],
  ['⌁', 'Fluxo'],
  ['↗', 'Crescimento'],
  ['⌂', 'Empresa'],
  ['♟', 'Estratégia'],
  ['⚙', 'Operação'],
  ['✎', 'Conteúdo'],
  ['✉', 'Comunicação'],
  ['☏', 'Contato'],
  ['¤', 'Financeiro'],
  ['%', 'Campanha'],
  ['☀', 'Ideia'],
  ['☁', 'Planejamento'],
  ['♜', 'Gestão'],
  ['✈', 'Viagem'],
  ['⚒', 'Construção'],
  ['▦', 'Dados'],
  ['⚡', 'Agilidade'],
  ['♥', 'Pessoas'],
  ['∞', 'Continuidade'],
] as const;

type ProjectShare = {
  id: string;
  nome: string;
  email: string;
  acesso: 'editor' | 'observador';
  situacao: 'ativo' | 'pendente' | 'revogado';
  criado_em?: string;
};

function dateLabel(value: string | null) {
  if (!value) return 'Sem prazo';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function participantInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '';
  const second = parts.length > 1 ? parts.at(-1) ?? '' : first.slice(1, 2);
  return `${first.charAt(0)}${second.charAt(0)}`.toLocaleUpperCase('pt-BR');
}

function settingsButtonStyle(color: string): CSSProperties {
  const rawColor = color.trim().replace('#', '');
  const normalizedColor = rawColor.length === 3
    ? rawColor.split('').map((character) => `${character}${character}`).join('')
    : rawColor;
  const validColor = /^[0-9a-f]{6}$/i.test(normalizedColor);
  const red = validColor ? Number.parseInt(normalizedColor.slice(0, 2), 16) : 0;
  const green = validColor ? Number.parseInt(normalizedColor.slice(2, 4), 16) : 31;
  const blue = validColor ? Number.parseInt(normalizedColor.slice(4, 6), 16) : 68;
  const perceivedBrightness = (red * 299 + green * 587 + blue * 114) / 1000;
  const lightBackground = perceivedBrightness >= 155;
  const toneTarget = lightBackground ? 0 : 255;
  const mixChannel = (channel: number, amount: number) => Math.round(channel * (1 - amount) + toneTarget * amount);
  const tone = [mixChannel(red, .18), mixChannel(green, .18), mixChannel(blue, .18)];
  const hoverTone = [mixChannel(red, .24), mixChannel(green, .24), mixChannel(blue, .24)];
  const relativeLuminance = (channels: number[]) => {
    const [r, g, b] = channels.map((channel) => {
      const normalized = channel / 255;
      return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
    });
    return r * .2126 + g * .7152 + b * .0722;
  };
  const toneLuminance = relativeLuminance(tone);
  const navyLuminance = relativeLuminance([10, 31, 68]);
  const whiteContrast = 1.05 / (toneLuminance + .05);
  const navyContrast = (toneLuminance + .05) / (navyLuminance + .05);

  return {
    '--card-settings-color': navyContrast > whiteContrast ? '#0A1F44' : '#FFFFFF',
    '--card-settings-background': `rgb(${tone.join(' ')})`,
    '--card-settings-hover-background': `rgb(${hoverTone.join(' ')})`,
  } as CSSProperties;
}

function ProjectIconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className={styles.iconField}>
    <span>Ícone</span>
    <div className={styles.iconPicker} aria-label="Ícones disponíveis">
      {PROJECT_ICON_OPTIONS.map(([icon, label]) => <button
        type="button"
        key={icon}
        className={`${styles.iconOption} ${value === icon ? styles.iconOptionSelected : ''}`}
        aria-label={`Selecionar ícone: ${label}`}
        aria-pressed={value === icon}
        title={label}
        onClick={() => onChange(icon)}
      >
        <span aria-hidden="true">{icon}</span>
      </button>)}
    </div>
    <small>Selecionado: {PROJECT_ICON_OPTIONS.find(([icon]) => icon === value)?.[1] ?? 'Projeto'}</small>
  </div>;
}

export function ProjectHome({ collection, onChange, onOpen, onMessage, readOnly = false }: {
  collection: ProjectCollection;
  onChange: (next: ProjectCollection) => void;
  onOpen: (projectId: string) => void;
  onMessage: (message: string) => void;
  readOnly?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'todos'>('todos');
  const [assignee, setAssignee] = useState('todos');
  const [dateFilter, setDateFilter] = useState('todos');
  const [display, setDisplay] = useState<'cards' | 'list'>('cards');
  const [section, setSection] = useState<'all' | 'favorites' | 'active' | 'completed' | 'archived'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [participantManagerOpen, setParticipantManagerOpen] = useState(false);
  const [actionProject, setActionProject] = useState<string | null>(null);
  const [confirmProject, setConfirmProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#1F8A9E', icon: '◇', startDate: new Date().toISOString().slice(0, 10), dueDate: '', participants: ['ana'], template: 'blank' as ProjectTemplate });
  const [editForm, setEditForm] = useState({ name: '', description: '', color: '#1F8A9E', icon: '◇', status: 'ideia' as ProjectStatus, startDate: '', dueDate: '', participants: [] as string[] });
  const [participantRegistrationOpen, setParticipantRegistrationOpen] = useState(false);
  const [participantDraft, setParticipantDraft] = useState({ name: '', color: '#1F8A9E' });
  const [participantError, setParticipantError] = useState('');
  const [participantToDeleteId, setParticipantToDeleteId] = useState<string | null>(null);
  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [shareForm, setShareForm] = useState({ name: '', email: '', access: 'editor' });
  const [shareState, setShareState] = useState<{ message: string; link: string; found: boolean } | null>(null);
  const [shareCopyStatus, setShareCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [sharing, setSharing] = useState(false);
  const [projectShares, setProjectShares] = useState<ProjectShare[]>([]);
  const [projectSharesState, setProjectSharesState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [shareToRevoke, setShareToRevoke] = useState<ProjectShare | null>(null);
  const [revokingShare, setRevokingShare] = useState(false);
  const [regeneratingShareId, setRegeneratingShareId] = useState<string | null>(null);

  const participantToDelete = collection.people.find((person) => person.id === participantToDeleteId) ?? null;

  useEffect(() => {
    const projectId = shareProject?.id;
    if (!projectId) return;
    let cancelled = false;
    const loadShares = async () => {
      setProjectSharesState('loading');
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Sua sessão expirou.');
        const response = await fetch(`/api/modulos/projetos/compartilhamentos?empresaId=${encodeURIComponent(collection.companyId)}&projetoId=${encodeURIComponent(projectId)}`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.mensagem || 'Não foi possível carregar os acessos.');
        if (!cancelled) {
          setProjectShares(Array.isArray(json.compartilhamentos) ? json.compartilhamentos : []);
          setProjectSharesState('ready');
        }
      } catch {
        if (!cancelled) setProjectSharesState('error');
      }
    };
    void loadShares();
    return () => { cancelled = true; };
  }, [collection.companyId, shareProject?.id]);
  const participantUsage = useMemo(() => {
    if (!participantToDeleteId) return { projects: 0, tasks: 0 };
    return {
      projects: collection.projects.filter((project) => project.participantIds.includes(participantToDeleteId) || project.nodes.some((node) => node.assigneeIds.includes(participantToDeleteId))).length,
      tasks: collection.projects.reduce((total, project) => total + project.nodes.filter((node) => node.assigneeIds.includes(participantToDeleteId)).length, 0),
    };
  }, [collection.projects, participantToDeleteId]);

  const counts = useMemo(() => ({
    all: collection.projects.length,
    favorites: collection.projects.filter((project) => project.favorite && !project.archivedAt).length,
    active: collection.projects.filter((project) => ['ideia', 'planejado', 'em_andamento', 'aguardando'].includes(project.status) && !project.archivedAt).length,
    completed: collection.projects.filter((project) => project.status === 'concluido' && !project.archivedAt).length,
    archived: collection.projects.filter((project) => project.archivedAt).length,
  }), [collection.projects]);

  const projects = useMemo(() => collection.projects.filter((project) => {
    const normalized = `${project.name} ${project.description}`.toLocaleLowerCase('pt-BR');
    const inSection = section === 'all' ? !project.archivedAt
      : section === 'favorites' ? project.favorite && !project.archivedAt
      : section === 'active' ? ['ideia', 'planejado', 'em_andamento', 'aguardando'].includes(project.status) && !project.archivedAt
      : section === 'completed' ? project.status === 'concluido' && !project.archivedAt
      : Boolean(project.archivedAt);
    const dueMatches = dateFilter === 'todos' || (dateFilter === 'com_prazo' ? Boolean(project.dueDate) : !project.dueDate);
    return inSection && (!query || normalized.includes(query.toLocaleLowerCase('pt-BR'))) && (status === 'todos' || project.status === status)
      && (assignee === 'todos' || project.participantIds.includes(assignee)) && dueMatches;
  }), [collection.projects, section, query, status, assignee, dateFilter]);

  const updateProject = (id: string, update: (project: Project) => Project) => onChange({
    ...collection,
    projects: collection.projects.map((project) => project.id === id ? update(project) : project),
  });

  const closeCreateProject = () => {
    setCreateOpen(false);
    setParticipantRegistrationOpen(false);
    setParticipantError('');
    setParticipantToDeleteId(null);
  };

  const addParticipant = () => {
    const name = participantDraft.name.trim();
    if (name.length < 2) {
      setParticipantError('Informe um nome com pelo menos 2 caracteres.');
      return;
    }
    if (collection.people.some((person) => person.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) {
      setParticipantError('Este participante já está cadastrado. Selecione-o na lista abaixo.');
      return;
    }

    const person = { id: createId('person'), name, initials: participantInitials(name), color: participantDraft.color };
    onChange({ ...collection, people: [...collection.people, person] });
    if (editingProject) setEditForm((current) => ({ ...current, participants: [...current.participants, person.id] }));
    else if (!participantManagerOpen) setForm((current) => ({ ...current, participants: [...current.participants, person.id] }));
    setParticipantDraft({ name: '', color: '#1F8A9E' });
    setParticipantError('');
    setParticipantRegistrationOpen(false);
    onMessage(participantManagerOpen ? `${name} foi cadastrado.` : `${name} foi cadastrado e selecionado.`);
  };

  const deleteParticipant = () => {
    if (!participantToDelete) return;
    onChange(removeParticipantFromCollection(collection, participantToDelete.id));
    setForm((current) => ({ ...current, participants: current.participants.filter((id) => id !== participantToDelete.id) }));
    if (assignee === participantToDelete.id) setAssignee('todos');
    setParticipantToDeleteId(null);
    onMessage(`${participantToDelete.name} foi excluído.`);
  };

  const openProjectEditor = (project: Project) => {
    setEditForm({
      name: project.name,
      description: project.description,
      color: project.color,
      icon: project.icon,
      status: project.status,
      startDate: project.startDate,
      dueDate: project.dueDate ?? '',
      participants: [...project.participantIds],
    });
    setEditingProject(project);
    setActionProject(null);
  };

  const submitProjectEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingProject || !editForm.name.trim()) return;
    updateProject(editingProject.id, (project) => ({
      ...project,
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      color: editForm.color,
      icon: editForm.icon,
      status: editForm.status,
      startDate: editForm.startDate,
      dueDate: editForm.dueDate || null,
      participantIds: editForm.participants,
      updatedAt: new Date().toISOString(),
    }));
    setEditingProject(null);
    onMessage('Projeto atualizado.');
  };

  const deleteProject = () => {
    if (!projectToDelete) return;
    onChange(removeProjectFromCollection(collection, projectToDelete.id));
    setProjectToDelete(null);
    setActionProject(null);
    onMessage('Projeto excluído definitivamente.');
  };

  const createShare = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shareProject || sharing) return;
    setSharing(true);
    setShareState(null);
    setShareCopyStatus('idle');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente para compartilhar o projeto.');
      const response = await fetch('/api/modulos/projetos/compartilhamentos', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId: collection.companyId, projetoId: shareProject.id, nome: shareForm.name, email: shareForm.email, acesso: shareForm.access }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.mensagem || 'Não foi possível compartilhar este projeto.');
      setShareState({ message: json.mensagem, link: json.link, found: json.encontrado === true });
      if (json.compartilhamento) {
        setProjectShares((current) => [json.compartilhamento as ProjectShare, ...current.filter((item) => item.id !== json.compartilhamento.id)]);
        setProjectSharesState('ready');
      }
      onMessage(json.encontrado ? 'Acesso ao projeto liberado.' : 'Convite de acesso criado.');
    } catch (error) {
      setShareState({ message: error instanceof Error ? error.message : 'Não foi possível compartilhar este projeto.', link: '', found: false });
    } finally { setSharing(false); }
  };

  const copyShareLink = async () => {
    if (!shareState?.link) return;
    const linkInput = document.getElementById('share-link-input') as HTMLInputElement | null;
    try {
      if (!navigator.clipboard?.writeText || !navigator.clipboard.readText) throw new Error('Cópia indisponível.');
      await navigator.clipboard.writeText(shareState.link);
      if (await navigator.clipboard.readText() !== shareState.link) throw new Error('A cópia não foi confirmada.');
      setShareCopyStatus('copied');
      onMessage('Conteúdo copiado.');
    } catch {
      linkInput?.focus();
      linkInput?.select();
      setShareCopyStatus('manual');
      onMessage('A cópia não foi confirmada. O link foi selecionado para você copiar manualmente.');
    }
  };

  const showProjectLink = (person: ProjectShare) => {
    if (!shareProject) return;
    const link = `${window.location.origin}/projetos?empresaId=${encodeURIComponent(collection.companyId)}&projetoId=${encodeURIComponent(shareProject.id)}`;
    setShareCopyStatus('idle');
    setShareState({ found: true, link, message: `Link de acesso de ${person.nome} pronto para copiar. Ele só funcionará para pessoas já autorizadas neste projeto.` });
  };

  const regenerateInviteLink = async (person: ProjectShare) => {
    if (regeneratingShareId) return;
    setRegeneratingShareId(person.id);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente para gerar o convite.');
      const response = await fetch('/api/modulos/projetos/compartilhamentos', {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId: collection.companyId, id: person.id, acao: 'renovar_convite' }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.mensagem || 'Não foi possível gerar um novo link.');
      setShareCopyStatus('idle');
      setShareState({ found: false, link: json.link, message: json.mensagem });
      onMessage('Novo link de convite gerado.');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível gerar um novo link.');
    } finally { setRegeneratingShareId(null); }
  };

  const revokeShare = async () => {
    if (!shareToRevoke || revokingShare) return;
    setRevokingShare(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente para revogar o acesso.');
      const response = await fetch('/api/modulos/projetos/compartilhamentos', {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId: collection.companyId, id: shareToRevoke.id }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.mensagem || 'Não foi possível revogar o acesso.');
      setProjectShares((current) => current.filter((item) => item.id !== shareToRevoke.id));
      setShareToRevoke(null);
      onMessage(`Acesso de ${shareToRevoke.nome} revogado.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível revogar o acesso.');
    } finally { setRevokingShare(false); }
  };

  const submitProject = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const project = createProjectFromTemplate({
      name: form.name.trim(), description: form.description.trim(), color: form.color, icon: form.icon,
      startDate: form.startDate, dueDate: form.dueDate || null, participantIds: form.participants,
      template: form.template, companyId: collection.companyId,
    });
    onChange({ ...collection, projects: [project, ...collection.projects] });
    closeCreateProject();
    setForm((current) => ({ ...current, name: '', description: '', icon: '◇', dueDate: '', template: 'blank' }));
    onOpen(project.id);
  };

  const duplicate = (project: Project) => {
    const idMap = new Map(project.nodes.map((node) => [node.id, createId('node')]));
    const copy: Project = {
      ...structuredClone(project), id: createId('project'), name: `${project.name} — cópia`, favorite: false,
      archivedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      nodes: project.nodes.map((node) => ({ ...structuredClone(node), id: idMap.get(node.id) as string, parentId: node.parentId ? idMap.get(node.parentId) ?? null : null })),
      connections: project.connections.map((edge) => ({ ...edge, id: createId('edge'), sourceId: idMap.get(edge.sourceId) as string, targetId: idMap.get(edge.targetId) as string })),
    };
    const projects = [...collection.projects];
    const sourceIndex = projects.findIndex((item) => item.id === project.id);
    projects.splice(sourceIndex < 0 ? projects.length : sourceIndex + 1, 0, copy);
    onChange({ ...collection, projects });
    onMessage('Projeto duplicado.');
  };

  const importFile = async (file: File) => {
    try {
      if (file.size > 5_000_000) throw new Error('O arquivo excede o limite de 5 MB.');
      const value: unknown = JSON.parse(await file.text());
      const project = validateProjectImport(value, collection.companyId);
      onChange({ ...collection, projects: [project, ...collection.projects] });
      onMessage('Projeto importado com segurança.');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível importar o arquivo.');
    }
  };

  const renderProjectActions = (project: Project, list = false) => readOnly ? <span className={styles.readOnlyAction}>Visualizar</span> : <div className={`${styles.cardMenuWrap} ${list ? '' : styles.cardSettingsWrap}`}>
    <button type="button" className={list ? styles.actionsButton : styles.cardSettingsButton} style={list ? undefined : settingsButtonStyle(project.color)} onClick={() => setActionProject(actionProject === project.id ? null : project.id)} aria-label={`Configurações de ${project.name}`} aria-expanded={actionProject === project.id} title={`Configurações de ${project.name}`}><Icon name="settings" size={16} /></button>
    {actionProject === project.id && <div className={`${styles.cardMenu} ${list ? styles.listCardMenu : styles.topCardMenu}`}>
      <button type="button" onClick={() => { setActionProject(null); onOpen(project.id); }}>Abrir projeto</button>
      <button type="button" onClick={() => openProjectEditor(project)}>Editar projeto</button>
      <button type="button" onClick={() => { setShareProject(project); setShareForm({ name: '', email: '', access: 'editor' }); setShareState(null); setShareCopyStatus('idle'); setProjectShares([]); setProjectSharesState('loading'); setActionProject(null); }}>Compartilhar acesso</button>
      <button type="button" onClick={() => { duplicate(project); setActionProject(null); }}>Duplicar</button>
      <button type="button" onClick={() => { updateProject(project.id, (item) => ({ ...item, favorite: !item.favorite })); setActionProject(null); }}>{project.favorite ? 'Desfavoritar' : 'Favoritar'}</button>
      <button type="button" onClick={() => { setConfirmProject(project); setActionProject(null); }}>{project.archivedAt ? 'Restaurar' : 'Arquivar'}</button>
      <button type="button" className={styles.destructiveMenuItem} onClick={() => { setProjectToDelete(project); setActionProject(null); }}>Excluir projeto</button>
    </div>}
  </div>;

  return <div className={styles.home}>
    <header className={styles.homeHeader}>
      <span className={styles.eyebrow}>AvantaProjetos</span>
      <div className={styles.homeHeaderMain}>
        <div className={styles.homeTitleLine}><h1>Projetos</h1><p>Transforme ideias em planos visuais, tarefas e entregas.</p></div>
        {!readOnly && <div className={styles.headerActions}>
          <label className={`${styles.secondaryButton} ${styles.headerCompactAction} ${styles.headerImportAction}`} tabIndex={0}><Icon name="upload" size={16} /> Importar<input type="file" accept="application/json,.json" aria-label="Importar projeto" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.currentTarget.value = ''; }} /></label>
          <button type="button" className={`${styles.secondaryButton} ${styles.headerCompactAction} ${styles.headerImportAction}`} onClick={() => { setParticipantManagerOpen(true); setParticipantRegistrationOpen(true); setParticipantError(''); }}><Icon name="people" size={16} /> Participantes</button>
          <button type="button" className={`${styles.primaryButton} ${styles.headerCompactAction} ${styles.headerCreateAction}`} onClick={() => setCreateOpen(true)}><Icon name="plus" size={17} /> Novo Projeto</button>
        </div>}
      </div>
    </header>

    <nav className={styles.projectSections} aria-label="Categorias de projetos">
      {([['all', 'Recentes'], ['favorites', 'Favoritos'], ['active', 'Ativos'], ['completed', 'Concluídos'], ['archived', 'Arquivados']] as const).map(([id, label]) => <button type="button" key={id} className={section === id ? styles.activeSection : ''} onClick={() => setSection(id)}>{label}<span>{counts[id]}</span></button>)}
    </nav>

    <section className={styles.filters} aria-label="Filtros de projetos">
      <label className={styles.searchField}><span className={styles.srOnly}>Pesquisar projetos</span><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por nome" /></label>
      <label><span className={styles.srOnly}>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | 'todos')}><option value="todos">Todos os status</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span className={styles.srOnly}>Responsável</span><select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="todos">Todos responsáveis</option>{collection.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      <label><span className={styles.srOnly}>Prazo</span><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}><option value="todos">Todas as datas</option><option value="com_prazo">Com data final</option><option value="sem_prazo">Sem data final</option></select></label>
      <div className={styles.displayToggle} aria-label="Tipo de visualização"><button type="button" className={display === 'cards' ? styles.activeToggle : ''} onClick={() => setDisplay('cards')} aria-label="Exibir em cards"><Icon name="grid" size={18} /></button><button type="button" className={display === 'list' ? styles.activeToggle : ''} onClick={() => setDisplay('list')} aria-label="Exibir em lista"><Icon name="list" size={18} /></button></div>
    </section>

    {!projects.length ? <div className={styles.emptyState}><span>◇</span><h2>Nenhum projeto encontrado</h2><p>{readOnly ? 'Ainda não há projetos disponíveis neste perfil.' : 'Ajuste os filtros ou crie um novo projeto para começar.'}</p>{!readOnly && <button type="button" className={styles.primaryButton} onClick={() => setCreateOpen(true)}>Novo projeto</button>}</div>
      : display === 'cards' ? <div className={styles.projectGrid}>{projects.map((project) => {
        const progress = calculateProjectProgress(project);
        const people = project.participantIds.map((id) => collection.people.find((person) => person.id === id)).filter(Boolean);
        return <article key={project.id} className={styles.projectCard}>
          {renderProjectActions(project)}
          <button type="button" className={styles.projectCardMain} onClick={() => onOpen(project.id)} aria-label={`Abrir ${project.name}`}>
            <span className={styles.projectCover} style={{ background: project.color }}><span>{project.icon}</span><small>{project.archivedAt ? 'Arquivado' : STATUS_LABELS[project.status]}</small></span>
            <span className={styles.projectCardBody}><strong>{project.name}</strong><span>{project.description || 'Projeto sem descrição.'}</span></span>
          </button>
          {!readOnly && <button type="button" className={`${styles.favoriteButton} ${project.favorite ? styles.favoriteActive : ''}`} onClick={() => updateProject(project.id, (item) => ({ ...item, favorite: !item.favorite }))} aria-label={project.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Icon name="star" size={17} fill={project.favorite ? 'currentColor' : 'none'} /></button>}
          <div className={styles.projectMeta}><div className={styles.avatarStack}>{people.slice(0, 3).map((person) => person && <Tooltip key={person.id} texto={person.name} posicao="top" wrapperClassName={styles.avatarTooltip}><span style={{ background: person.color }}>{person.initials}</span></Tooltip>)}</div><span>{project.nodes.filter((node) => node.type === 'tarefa').length} tarefas</span><span>{dateLabel(project.dueDate)}</span></div>
          <div className={styles.progressRow}><div><i style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></div>
          <footer className={styles.projectFooter}><small>Alterado {dateLabel(project.updatedAt)}</small></footer>
        </article>;
      })}</div> : <div className={styles.projectList} role="table"><div className={styles.projectListHead} role="row"><span>Projeto</span><span>Status</span><span>Tarefas</span><span>Progresso</span><span>Prazo</span><span>Ações</span></div>{projects.map((project) => <div className={styles.projectListRow} role="row" key={project.id}><button type="button" onClick={() => onOpen(project.id)}><i style={{ background: project.color }}>{project.icon}</i><span><strong>{project.name}</strong><small>{project.description || 'Sem descrição'}</small></span></button><span>{STATUS_LABELS[project.status]}</span><span>{project.nodes.filter((node) => node.type === 'tarefa').length}</span><span>{calculateProjectProgress(project)}%</span><span>{dateLabel(project.dueDate)}</span>{renderProjectActions(project, true)}</div>)}</div>}

    <Modal open={createOpen} onClose={closeCreateProject} title="Novo projeto" description="Escolha um modelo editável ou comece em branco." wide>
      <form className={styles.projectForm} onSubmit={submitProject}>
        <div className={styles.formGrid}>
          <label>Nome<input required maxLength={120} autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Planejamento comercial" /></label>
          <label>Descrição opcional<input maxLength={600} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Objetivo principal do projeto" /></label>
          <div className={styles.projectMetaFields}>
            <label>Cor<input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label>
            <label>Data inicial<input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
            <label>Data final opcional<input type="date" min={form.startDate} value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
          </div>
          <ProjectIconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
        </div>
        <fieldset>
          <legend>Participantes</legend>
          <div className={styles.participantHeader}>
            <p>Selecione quem participará deste projeto.</p>
            <button type="button" className={`${styles.secondaryButton} ${styles.participantAddButton}`} aria-expanded={participantRegistrationOpen} aria-controls="participant-registration" onClick={() => { setParticipantRegistrationOpen((open) => !open); setParticipantError(''); }}><Icon name="plus" size={16} /> Cadastrar participante</button>
          </div>
          {participantRegistrationOpen && <div className={styles.participantRegistration} id="participant-registration" role="group" aria-label="Cadastro de participante">
            <div className={styles.participantFields}>
              <label>Nome do participante<input autoFocus maxLength={80} value={participantDraft.name} onChange={(event) => { setParticipantDraft({ ...participantDraft, name: event.target.value }); setParticipantError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addParticipant(); } }} placeholder="Ex.: Maria Silva" aria-invalid={Boolean(participantError)} aria-describedby={participantError ? 'participant-error' : undefined} /></label>
              <label>Cor<input type="color" value={participantDraft.color} onChange={(event) => setParticipantDraft({ ...participantDraft, color: event.target.value })} /></label>
              <div className={styles.participantActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => { setParticipantRegistrationOpen(false); setParticipantError(''); }}>Cancelar</button>
                <button type="button" className={styles.primaryButton} onClick={addParticipant}>Adicionar</button>
              </div>
            </div>
            {participantError && <p className={styles.fieldError} id="participant-error" role="alert">{participantError}</p>}
          </div>}
          {participantToDelete && <div className={styles.participantDeleteConfirm} role="group" aria-label={`Confirmar exclusão de ${participantToDelete.name}`}>
            <div><strong>Excluir {participantToDelete.name}?</strong><p>{participantUsage.projects || participantUsage.tasks ? `A pessoa será removida de ${participantUsage.projects} projeto(s) e ${participantUsage.tasks} tarefa(s).` : 'Este participante ainda não está vinculado a projetos ou tarefas.'}</p></div>
            <div><button type="button" className={styles.secondaryButton} onClick={() => setParticipantToDeleteId(null)}>Cancelar</button><button type="button" className={styles.dangerButton} onClick={deleteParticipant}>Excluir</button></div>
          </div>}
          {collection.people.length ? <div className={styles.checkboxGrid}>{collection.people.map((person) => <div className={styles.participantOption} key={person.id}>
            <label><input type="checkbox" checked={form.participants.includes(person.id)} onChange={() => setForm({ ...form, participants: form.participants.includes(person.id) ? form.participants.filter((id) => id !== person.id) : [...form.participants, person.id] })} /><span className={styles.participantAvatar} style={{ background: person.color }}>{person.initials}</span><span className={styles.participantName} title={person.name}>{person.name}</span></label>
            <button type="button" className={`${styles.iconButton} ${styles.participantDeleteButton}`} aria-label={`Excluir participante ${person.name}`} title={`Excluir ${person.name}`} onClick={() => { setParticipantRegistrationOpen(false); setParticipantError(''); setParticipantToDeleteId(person.id); }}><Icon name="trash" size={17} /></button>
          </div>)}</div> : <p className={styles.participantEmpty}>Nenhum participante cadastrado.</p>}
        </fieldset>
        <fieldset><legend>Modelo inicial</legend><div className={styles.templateGrid}>{TEMPLATE_OPTIONS.map(([id, title, description]) => <label key={id} className={form.template === id ? styles.templateSelected : ''}><input type="radio" name="template" value={id} checked={form.template === id} onChange={() => setForm({ ...form, template: id })} /><strong>{title}</strong><span>{description}</span></label>)}</div></fieldset>
        <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={closeCreateProject}>Cancelar</button><button type="submit" className={styles.primaryButton}>Criar projeto</button></div>
      </form>
    </Modal>

    <Modal open={participantManagerOpen} onClose={() => { setParticipantManagerOpen(false); setParticipantRegistrationOpen(false); setParticipantError(''); setParticipantToDeleteId(null); }} title="Participantes" description="Cadastre pessoas para atribuí-las a projetos e tarefas.">
      <section className={styles.participantManager} aria-label="Gerenciar participantes">
        <div className={styles.participantRegistration} role="group" aria-label="Cadastro de participante">
          <div className={styles.participantFields}>
            <label>Nome do participante<input autoFocus maxLength={80} value={participantDraft.name} onChange={(event) => { setParticipantDraft({ ...participantDraft, name: event.target.value }); setParticipantError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addParticipant(); } }} placeholder="Ex.: Maria Silva" aria-invalid={Boolean(participantError)} aria-describedby={participantError ? 'participant-manager-error' : undefined} /></label>
            <label>Cor<input type="color" value={participantDraft.color} onChange={(event) => setParticipantDraft({ ...participantDraft, color: event.target.value })} /></label>
            <div className={styles.participantActions}><button type="button" className={styles.primaryButton} onClick={addParticipant}>Adicionar</button></div>
          </div>
          {participantError && <p className={styles.fieldError} id="participant-manager-error" role="alert">{participantError}</p>}
        </div>
        {participantToDelete && <div className={styles.participantDeleteConfirm} role="group" aria-label={`Confirmar exclusão de ${participantToDelete.name}`}><div><strong>Excluir {participantToDelete.name}?</strong><p>{participantUsage.projects || participantUsage.tasks ? `A pessoa será removida de ${participantUsage.projects} projeto(s) e ${participantUsage.tasks} tarefa(s).` : 'Este participante ainda não está vinculado a projetos ou tarefas.'}</p></div><div><button type="button" className={styles.secondaryButton} onClick={() => setParticipantToDeleteId(null)}>Cancelar</button><button type="button" className={styles.dangerButton} onClick={deleteParticipant}>Excluir</button></div></div>}
        {collection.people.length ? <div className={styles.participantManagerList}>{collection.people.map((person) => <div key={person.id}><span className={styles.participantAvatar} style={{ background: person.color }}>{person.initials}</span><strong>{person.name}</strong><button type="button" className={`${styles.iconButton} ${styles.participantDeleteButton}`} aria-label={`Excluir participante ${person.name}`} title={`Excluir ${person.name}`} onClick={() => setParticipantToDeleteId(person.id)}><Icon name="trash" size={17} /></button></div>)}</div> : <p className={styles.participantEmpty}>Nenhum participante cadastrado.</p>}
      </section>
    </Modal>

    <Modal open={Boolean(editingProject)} onClose={() => setEditingProject(null)} title="Editar projeto" description="Atualize os dados gerais sem alterar a estrutura do projeto." wide>
      <form className={styles.projectForm} onSubmit={submitProjectEdit}>
        <div className={styles.formGrid}>
          <label>Nome<input required maxLength={120} autoFocus value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label>
          <label>Descrição opcional<input maxLength={600} value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} /></label>
          <div className={`${styles.projectMetaFields} ${styles.editMetaFields}`}>
            <label>Cor<input type="color" value={editForm.color} onChange={(event) => setEditForm({ ...editForm, color: event.target.value })} /></label>
            <label>Status<select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as ProjectStatus })}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Data inicial<input type="date" required value={editForm.startDate} onChange={(event) => setEditForm({ ...editForm, startDate: event.target.value })} /></label>
            <label>Data final opcional<input type="date" min={editForm.startDate} value={editForm.dueDate} onChange={(event) => setEditForm({ ...editForm, dueDate: event.target.value })} /></label>
          </div>
          <ProjectIconPicker value={editForm.icon} onChange={(icon) => setEditForm({ ...editForm, icon })} />
        </div>
        <fieldset>
          <legend>Participantes</legend>
          <div className={styles.participantHeader}>
            <p>Selecione quem participa deste projeto.</p>
            <button type="button" className={`${styles.secondaryButton} ${styles.participantAddButton}`} aria-expanded={participantRegistrationOpen} aria-controls="edit-participant-registration" onClick={() => { setParticipantRegistrationOpen((open) => !open); setParticipantError(''); }}><Icon name="plus" size={16} /> Cadastrar participante</button>
          </div>
          {participantRegistrationOpen && <div className={styles.participantRegistration} id="edit-participant-registration" role="group" aria-label="Cadastro de participante">
            <div className={styles.participantFields}>
              <label>Nome do participante<input autoFocus maxLength={80} value={participantDraft.name} onChange={(event) => { setParticipantDraft({ ...participantDraft, name: event.target.value }); setParticipantError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addParticipant(); } }} placeholder="Ex.: Maria Silva" aria-invalid={Boolean(participantError)} aria-describedby={participantError ? 'edit-participant-error' : undefined} /></label>
              <label>Cor<input type="color" value={participantDraft.color} onChange={(event) => setParticipantDraft({ ...participantDraft, color: event.target.value })} /></label>
              <div className={styles.participantActions}><button type="button" className={styles.secondaryButton} onClick={() => { setParticipantRegistrationOpen(false); setParticipantError(''); }}>Cancelar</button><button type="button" className={styles.primaryButton} onClick={addParticipant}>Adicionar</button></div>
            </div>
            {participantError && <p className={styles.fieldError} id="edit-participant-error" role="alert">{participantError}</p>}
          </div>}
          {collection.people.length ? <div className={styles.checkboxGrid}>{collection.people.map((person) => <div className={styles.participantOption} key={person.id}>
            <label><input type="checkbox" checked={editForm.participants.includes(person.id)} onChange={() => setEditForm({ ...editForm, participants: editForm.participants.includes(person.id) ? editForm.participants.filter((id) => id !== person.id) : [...editForm.participants, person.id] })} /><span className={styles.participantAvatar} style={{ background: person.color }}>{person.initials}</span><span className={styles.participantName} title={person.name}>{person.name}</span></label>
          </div>)}</div> : <p className={styles.participantEmpty}>Nenhum participante cadastrado.</p>}
        </fieldset>
        <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={() => setEditingProject(null)}>Cancelar</button><button type="submit" className={styles.primaryButton}>Salvar alterações</button></div>
      </form>
    </Modal>

    <Modal open={Boolean(shareProject)} onClose={() => setShareProject(null)} title="Compartilhar acesso" description={shareProject ? `Convide uma pessoa para trabalhar somente em “${shareProject.name}”.` : ''} headerTone="accent">
      <form className={styles.projectForm} onSubmit={createShare}>
        <div className={styles.formGrid}>
          <label>Nome completo<input required maxLength={120} autoFocus value={shareForm.name} onChange={(event) => setShareForm({ ...shareForm, name: event.target.value })} placeholder="Ex.: Maria Silva" /></label>
          <label>E-mail<input required type="email" autoCapitalize="none" value={shareForm.email} onChange={(event) => setShareForm({ ...shareForm, email: event.target.value })} placeholder="nome@empresa.com" /></label>
          <label>Acesso<select value={shareForm.access} onChange={(event) => setShareForm({ ...shareForm, access: event.target.value })}><option value="editor">Pode editar o projeto</option><option value="observador">Somente visualizar</option></select></label>
        </div>
        <p className={styles.participantEmpty}>Se a pessoa já tiver conta AvantaLab, o acesso será liberado na hora. Caso contrário, você receberá um link de convite para encaminhar manualmente.</p>
        {shareState && <section className={styles.shareResult} role="status"><strong>{shareState.found ? 'Conta encontrada' : 'Convite criado'}</strong><p>{shareState.message}</p>{shareState.link && <div><input id="share-link-input" readOnly value={shareState.link} aria-label="Link para compartilhar" /><button type="button" className={`${styles.secondaryButton} ${shareCopyStatus === 'copied' ? styles.shareCopyConfirmed : ''}`} onClick={() => void copyShareLink} aria-live="polite">{shareCopyStatus === 'copied' ? '✓ Conteúdo copiado' : 'Copiar link'}</button></div>}{shareCopyStatus === 'copied' && <small className={styles.shareCopyMessage} role="status">Conteúdo copiado e confirmado. O link está pronto para enviar por WhatsApp, e-mail ou mensagem.</small>}{shareCopyStatus === 'manual' && <small className={styles.shareCopyMessage} role="alert">A cópia não foi confirmada. O link foi selecionado: pressione ⌘C ou Ctrl+C para copiar.</small>}</section>}
        <section className={styles.sharePeople} aria-labelledby="share-people-title">
          <div><h3 id="share-people-title">Pessoas com acesso</h3><p>Gerencie quem pode abrir este projeto.</p></div>
          {projectSharesState === 'loading' && <p className={styles.sharePeopleEmpty}>Carregando acessos…</p>}
          {projectSharesState === 'error' && <p className={styles.sharePeopleEmpty} role="alert">Não foi possível carregar os acessos agora.</p>}
          {projectSharesState === 'ready' && projectShares.length === 0 && <p className={styles.sharePeopleEmpty}>Nenhuma pessoa recebeu acesso a este projeto.</p>}
          {projectShares.length > 0 && <div className={styles.sharePeopleList}>{projectShares.map((person) => <div key={person.id}>
            <span className={styles.sharePersonAvatar} aria-hidden="true">{participantInitials(person.nome)}</span>
            <span className={styles.sharePersonInfo}><strong>{person.nome}</strong><small>{person.email}</small></span>
            <span className={`${styles.shareStatus} ${person.situacao === 'pendente' ? styles.shareStatusPending : ''}`}>{person.situacao === 'pendente' ? 'Convite pendente' : person.acesso === 'editor' ? 'Pode editar' : 'Visualiza'}</span>
            <span className={styles.sharePersonActions}>{person.situacao === 'pendente'
              ? <button type="button" className={styles.shareLinkButton} disabled={regeneratingShareId === person.id} onClick={() => void regenerateInviteLink(person)}>{regeneratingShareId === person.id ? 'Gerando…' : 'Novo link'}</button>
              : <button type="button" className={styles.shareLinkButton} onClick={() => showProjectLink(person)}>Ver link</button>}
              <button type="button" className={styles.shareRevokeButton} onClick={() => setShareToRevoke(person)}>Revogar</button>
            </span>
          </div>)}</div>}
        </section>
        <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={() => setShareProject(null)}>Fechar</button><button type="submit" className={styles.primaryButton} disabled={sharing}>{sharing ? 'Verificando…' : 'Verificar e adicionar'}</button></div>
      </form>
    </Modal>

    <Modal open={Boolean(shareToRevoke)} onClose={() => { if (!revokingShare) setShareToRevoke(null); }} title="Revogar acesso?" description="A pessoa perderá o acesso a este projeto imediatamente.">
      <div className={styles.confirmContent}><p><strong>{shareToRevoke?.nome}</strong> não poderá mais abrir nem alterar este projeto.</p><div className={styles.modalActions}><button type="button" className={styles.secondaryButton} disabled={revokingShare} onClick={() => setShareToRevoke(null)}>Cancelar</button><button type="button" className={styles.dangerButton} disabled={revokingShare} onClick={() => void revokeShare()}>{revokingShare ? 'Revogando…' : 'Revogar acesso'}</button></div></div>
    </Modal>

    <Modal open={Boolean(confirmProject)} onClose={() => setConfirmProject(null)} title={confirmProject?.archivedAt ? 'Restaurar projeto?' : 'Arquivar projeto?'} description={confirmProject?.archivedAt ? 'O projeto voltará para a lista de ativos.' : 'O projeto poderá ser restaurado depois.'}>
      <div className={styles.confirmContent}><p><strong>{confirmProject?.name}</strong></p><div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={() => setConfirmProject(null)}>Cancelar</button><button type="button" className={styles.primaryButton} onClick={() => { if (!confirmProject) return; updateProject(confirmProject.id, (item) => ({ ...item, archivedAt: item.archivedAt ? null : new Date().toISOString(), updatedAt: new Date().toISOString() })); setConfirmProject(null); onMessage(confirmProject.archivedAt ? 'Projeto restaurado.' : 'Projeto arquivado.'); }}>{confirmProject?.archivedAt ? 'Restaurar' : 'Arquivar'}</button></div></div>
    </Modal>

    <Modal open={Boolean(projectToDelete)} onClose={() => setProjectToDelete(null)} title="Excluir projeto definitivamente?" description="Esta ação não poderá ser desfeita.">
      <div className={styles.confirmContent}><p><strong>{projectToDelete?.name}</strong></p><p>O projeto e seus {projectToDelete?.nodes.length ?? 0} item(ns), conexões e atividades serão removidos dos dados locais.</p><div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={() => setProjectToDelete(null)}>Cancelar</button><button type="button" className={styles.dangerButton} onClick={deleteProject}>Excluir definitivamente</button></div></div>
    </Modal>
  </div>;
}

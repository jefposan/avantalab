'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateProjectProgress, connectHierarchy, createId, exportProject, getDescendantIds, layoutProject, wouldCreateHierarchyCycle } from '../domain/project';
import { NODE_TYPE_LABELS, PRIORITY_LABELS, PRIORITIES, STATUS_LABELS, STATUSES, type ConnectionType, type MapDirection, type Person, type Project, type ProjectNode, type ProjectView, type SaveState } from '../types';
import styles from '../projetos.module.css';
import { DetailsPanel } from './DetailsPanel';
import { Icon } from './Icon';
import { KanbanView } from './KanbanView';
import { ListView } from './ListView';
import { MapCanvas } from './MapCanvas';
import { Modal } from './Modal';

function downloadJson(project: Project) {
  const blob = new Blob([JSON.stringify(exportProject(project), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${project.name.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'projeto'}.avanta.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function saveLabel(state: SaveState, readOnly: boolean) {
  if (readOnly) return 'Somente visualização';
  if (state === 'saving') return 'Salvando…';
  if (state === 'error') return 'Falha ao salvar';
  if (state === 'offline') return 'Sem conexão · alterações não enviadas';
  if (state === 'saved') return 'Todas as alterações salvas';
  return 'Pronto para editar';
}

export function ProjectWorkspace({ project, people, saveState, onBack, onChange, onUndo, onRedo, canUndo, canRedo, onMessage, mapaEmFoco, onMapaEmFocoChange, readOnly = false }: {
  project: Project;
  people: Person[];
  saveState: SaveState;
  onBack: () => void;
  onChange: (project: Project) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onMessage: (message: string) => void;
  mapaEmFoco: boolean;
  onMapaEmFocoChange: (ativo: boolean) => void;
  readOnly?: boolean;
}) {
  const [view, setView] = useState<ProjectView>('mapa');
  const [direction, setDirection] = useState<MapDirection>('horizontal');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [priorityFilter, setPriorityFilter] = useState('todos');
  const [assigneeFilter, setAssigneeFilter] = useState('todos');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [deadlineFilter, setDeadlineFilter] = useState('todos');
  const [searchHighlight, setSearchHighlight] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [deleteNode, setDeleteNode] = useState<ProjectNode | null>(null);
  const [replacementNodeId, setReplacementNodeId] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<'choice' | 'successor'>('choice');
  const [clipboardNode, setClipboardNode] = useState<ProjectNode | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const progress = calculateProjectProgress(project);
  const detailsNode = detailsId ? project.nodes.find((node) => node.id === detailsId) ?? null : null;
  const deleteNodeChildren = useMemo(() => deleteNode ? project.nodes.filter((node) => node.parentId === deleteNode.id) : [], [deleteNode, project.nodes]);
  const searchResults = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return [];
    return project.nodes.filter((node) => {
      const personNames = node.assigneeIds.map((id) => people.find((person) => person.id === id)?.name ?? '').join(' ');
      return `${node.title} ${node.description} ${node.tags.join(' ')} ${personNames}`.toLocaleLowerCase('pt-BR').includes(term)
        && (statusFilter === 'todos' || node.status === statusFilter)
        && (priorityFilter === 'todos' || node.priority === priorityFilter)
        && (assigneeFilter === 'todos' || node.assigneeIds.includes(assigneeFilter))
        && (typeFilter === 'todos' || node.type === typeFilter);
    }).slice(0, 12);
  }, [project.nodes, people, query, statusFilter, priorityFilter, assigneeFilter, typeFilter]);

  const filteredProject = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const nodes = project.nodes.filter((node) => {
      const deadlineMatches = deadlineFilter === 'todos'
        || (deadlineFilter === 'atrasados' && Boolean(node.dueDate && node.dueDate < today && node.status !== 'concluido'))
        || (deadlineFilter === 'concluidos' && node.status === 'concluido')
        || (deadlineFilter === 'sem_responsavel' && !node.assigneeIds.length)
        || (deadlineFilter === 'com_prazo' && Boolean(node.dueDate))
        || (deadlineFilter === 'sem_prazo' && !node.dueDate);
      return (statusFilter === 'todos' || node.status === statusFilter)
        && (priorityFilter === 'todos' || node.priority === priorityFilter)
        && (assigneeFilter === 'todos' || node.assigneeIds.includes(assigneeFilter))
        && (typeFilter === 'todos' || node.type === typeFilter)
        && deadlineMatches;
    });
    const ids = new Set(nodes.map((node) => node.id));
    return { ...project, nodes, connections: project.connections.filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId)) };
  }, [project, statusFilter, priorityFilter, assigneeFilter, typeFilter, deadlineFilter]);

  const mutate = useCallback((transform: (current: Project) => Project) => {
    if (readOnly) return;
    const next = transform(project);
    onChange({ ...next, updatedAt: new Date().toISOString() });
  }, [project, onChange, readOnly]);

  const updateNode = useCallback((nodeId: string, update: Partial<ProjectNode>) => mutate((current) => ({
    ...current,
    nodes: current.nodes.map((node) => node.id === nodeId ? { ...node, ...update, updatedAt: new Date().toISOString() } : node),
    activities: [{ id: createId('activity'), nodeId, action: 'Nó atualizado', detail: 'Dados sincronizados entre mapa, lista e Kanban.', at: new Date().toISOString() }, ...current.activities].slice(0, 80),
  })), [mutate]);

  const createNode = useCallback((parentId: string | null, type: ProjectNode['type'], title: string, position: { x: number; y: number }) => {
    const now = new Date().toISOString();
    const id = createId('node');
    const node: ProjectNode = {
      id, parentId, type, title, description: '', color: type === 'etapa' ? '#1F8A9E' : '#5B7C91', icon: type === 'etapa' ? '◫' : '✓',
      status: 'ideia', priority: 'sem_prioridade', assigneeIds: [], startDate: null, dueDate: null, progress: 0,
      tags: [], checklist: [], comments: 0, attachments: 0, collapsed: false, position, createdAt: now, updatedAt: now,
    };
    mutate((current) => ({ ...current, nodes: [...current.nodes, node], connections: parentId ? [...current.connections, { id: createId('edge'), sourceId: parentId, targetId: id, type: 'hierarquica', label: '' }] : current.connections, activities: [{ id: createId('activity'), nodeId: id, action: 'Nó criado', detail: title, at: now }, ...current.activities] }));
    setSelectedIds(new Set([id]));
    return id;
  }, [mutate]);

  const addChild = useCallback((nodeId: string) => {
    const parent = project.nodes.find((node) => node.id === nodeId);
    if (!parent) return;
    createNode(parent.id, parent.type === 'projeto' ? 'etapa' : 'tarefa', parent.type === 'projeto' ? 'Nova etapa' : 'Nova tarefa', direction === 'horizontal' ? { x: parent.position.x + 310, y: parent.position.y + 132 } : { x: parent.position.x + 260, y: parent.position.y + 190 });
  }, [project.nodes, createNode, direction]);

  const addSibling = useCallback((nodeId: string) => {
    const source = project.nodes.find((node) => node.id === nodeId);
    if (!source) return;
    createNode(source.parentId, source.type, `Novo ${NODE_TYPE_LABELS[source.type].toLocaleLowerCase('pt-BR')}`, direction === 'horizontal' ? { x: source.position.x, y: source.position.y + 142 } : { x: source.position.x + 278, y: source.position.y });
  }, [project.nodes, createNode, direction]);

  const duplicateNode = useCallback((nodeId: string) => {
    const source = project.nodes.find((node) => node.id === nodeId);
    if (!source) return;
    const id = createId('node');
    const now = new Date().toISOString();
    const copy: ProjectNode = { ...structuredClone(source), id, title: `${source.title} — cópia`, position: { x: source.position.x + 28, y: source.position.y + 132 }, createdAt: now, updatedAt: now };
    mutate((current) => ({ ...current, nodes: [...current.nodes, copy], connections: copy.parentId ? [...current.connections, { id: createId('edge'), sourceId: copy.parentId, targetId: id, type: 'hierarquica', label: '' }] : current.connections }));
    setSelectedIds(new Set([id]));
  }, [project.nodes, mutate]);

  const connect = useCallback((sourceId: string, targetId: string, type: ConnectionType) => {
    try {
      if (project.connections.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId && edge.type === type)) throw new Error('Essa conexão já existe.');
      if (type === 'hierarquica') onChange(connectHierarchy(project, sourceId, targetId));
      else mutate((current) => ({ ...current, connections: [...current.connections, { id: createId('edge'), sourceId, targetId, type: 'livre', label: 'relacionado a' }] }));
      onMessage(type === 'hierarquica' ? 'Hierarquia atualizada.' : 'Conexão livre criada.');
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Não foi possível criar a conexão.'); }
  }, [project, mutate, onChange, onMessage]);

  const reconnect = useCallback((edgeId: string, targetId: string) => {
    const edge = project.connections.find((item) => item.id === edgeId);
    if (!edge) return;
    try {
      if (edge.type === 'hierarquica' && wouldCreateHierarchyCycle(project.nodes, edge.sourceId, targetId)) throw new Error('Essa reconexão criaria um ciclo hierárquico.');
      if (project.connections.some((item) => item.id !== edgeId && item.sourceId === edge.sourceId && item.targetId === targetId && item.type === edge.type)) throw new Error('Essa conexão já existe.');
      const previousTargetId = edge.targetId;
      mutate((current) => ({
        ...current,
        nodes: edge.type === 'hierarquica' ? current.nodes.map((node) => {
          if (node.id === previousTargetId && node.parentId === edge.sourceId) return { ...node, parentId: null };
          if (node.id === targetId) return { ...node, parentId: edge.sourceId };
          return node;
        }) : current.nodes,
        connections: current.connections
          .filter((item) => !(edge.type === 'hierarquica' && item.id !== edgeId && item.targetId === targetId && item.type === 'hierarquica'))
          .map((item) => item.id === edgeId ? { ...item, targetId } : item),
      }));
      onMessage('Conexão atualizada.');
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Não foi possível reconectar.'); }
  }, [project.connections, project.nodes, mutate, onMessage]);

  const removeConnection = useCallback((edgeId: string) => {
    const edge = project.connections.find((item) => item.id === edgeId);
    if (!edge || edge.type !== 'livre') return;
    mutate((current) => ({
      ...current,
      connections: current.connections.filter((item) => item.id !== edgeId),
      activities: [{ id: createId('activity'), nodeId: null, action: 'Relação removida', detail: 'A conexão livre foi desfeita sem remover os cards.', at: new Date().toISOString() }, ...current.activities].slice(0, 80),
    }));
    setSelectedEdgeId(null);
    onMessage('Relação removida. Os cards foram mantidos.');
  }, [project.connections, mutate, onMessage]);

  const addComment = useCallback((nodeId: string, content: string) => mutate((current) => ({
    ...current,
    nodes: current.nodes.map((node) => node.id === nodeId ? { ...node, comments: node.comments + 1, updatedAt: new Date().toISOString() } : node),
    activities: [{ id: createId('activity'), nodeId, action: 'Comentário', detail: content.slice(0, 1000), at: new Date().toISOString() }, ...current.activities].slice(0, 80),
  })), [mutate]);

  const requestDeleteNode = useCallback((node: ProjectNode) => {
    const children = project.nodes.filter((item) => item.parentId === node.id);
    setDeleteNode(node);
    setReplacementNodeId(children[0]?.id ?? null);
    setDeleteStep('choice');
  }, [project.nodes]);

  const confirmDelete = useCallback(() => {
    if (!deleteNode) return;
    const successor = deleteNodeChildren.find((node) => node.id === replacementNodeId) ?? null;
    if (deleteNodeChildren.length && !successor) { onMessage('Escolha o card que assumirá a posição deste nó.'); return; }
    mutate((current) => {
      const nodes = current.nodes.filter((node) => node.id !== deleteNode.id).map((node) => {
        if (successor && node.id === successor.id) return { ...node, parentId: deleteNode.parentId, updatedAt: new Date().toISOString() };
        if (successor && node.parentId === deleteNode.id) return { ...node, parentId: successor.id, updatedAt: new Date().toISOString() };
        return node;
      });
      const hierarchy = nodes.flatMap((node) => node.parentId ? [current.connections.find((edge) => edge.type === 'hierarquica' && edge.sourceId === node.parentId && edge.targetId === node.id) ?? { id: createId('edge'), sourceId: node.parentId, targetId: node.id, type: 'hierarquica' as const, label: '' }] : []);
      const freeConnections = current.connections.filter((edge) => edge.type === 'livre' && edge.sourceId !== deleteNode.id && edge.targetId !== deleteNode.id);
      return { ...current, nodes, connections: [...hierarchy, ...freeConnections], activities: [{ id: createId('activity'), nodeId: null, action: 'Nó removido', detail: successor ? `${deleteNode.title} removido; ${successor.title} assumiu a posição.` : `${deleteNode.title} removido.`, at: new Date().toISOString() }, ...current.activities].slice(0, 80) };
    });
    setDeleteNode(null); setReplacementNodeId(null); setDeleteStep('choice'); setSelectedIds(new Set()); setDetailsId(null); onMessage(successor ? 'Nó removido. Os dependentes foram preservados.' : 'Nó removido. Use Desfazer para recuperá-lo.');
  }, [deleteNode, deleteNodeChildren, replacementNodeId, mutate, onMessage]);

  const confirmDeleteConnected = useCallback(() => {
    if (!deleteNode) return;
    const descendants = getDescendantIds(project.nodes, deleteNode.id);
    const remove = new Set([deleteNode.id, ...descendants]);
    mutate((current) => ({ ...current, nodes: current.nodes.filter((node) => !remove.has(node.id)), connections: current.connections.filter((edge) => !remove.has(edge.sourceId) && !remove.has(edge.targetId)), activities: [{ id: createId('activity'), nodeId: null, action: 'Nós conectados removidos', detail: `${deleteNode.title}${descendants.size ? ` e ${descendants.size} dependente(s)` : ''}.`, at: new Date().toISOString() }, ...current.activities].slice(0, 80) }));
    setDeleteNode(null); setReplacementNodeId(null); setDeleteStep('choice'); setSelectedIds(new Set()); setDetailsId(null); onMessage('Nó e dependentes removidos. Use Desfazer para recuperá-los.');
  }, [deleteNode, project.nodes, mutate, onMessage]);

  const pasteNode = useCallback(() => {
    if (!clipboardNode) return;
    const selected = selectedIds.size === 1 ? project.nodes.find((node) => selectedIds.has(node.id)) : null;
    const id = createId('node');
    const parentId = selected?.id ?? clipboardNode.parentId;
    const copy = { ...structuredClone(clipboardNode), id, parentId, title: `${clipboardNode.title} — cópia`, position: selected ? { x: selected.position.x + 310, y: selected.position.y + 132 } : { x: clipboardNode.position.x + 32, y: clipboardNode.position.y + 32 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mutate((current) => ({ ...current, nodes: [...current.nodes, copy], connections: parentId ? [...current.connections, { id: createId('edge'), sourceId: parentId, targetId: id, type: 'hierarquica', label: '' }] : current.connections }));
    setSelectedIds(new Set([id]));
  }, [clipboardNode, selectedIds, project.nodes, mutate]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches('input,textarea,select,[contenteditable="true"]')) return;
      const modifier = event.metaKey || event.ctrlKey;
      const selected = selectedIds.size === 1 ? project.nodes.find((node) => selectedIds.has(node.id)) : null;
      if (readOnly) { if (event.key === '?' || (event.key === '/' && event.shiftKey)) setHelpOpen(true); return; }
      if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) onRedo(); else onUndo(); }
      else if (modifier && event.key.toLowerCase() === 'c' && selected) { event.preventDefault(); setClipboardNode(structuredClone(selected)); onMessage('Nó copiado.'); }
      else if (modifier && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteNode(); }
      else if (event.key === 'Tab' && selected) { event.preventDefault(); if (event.shiftKey) addSibling(selected.id); else addChild(selected.id); }
      else if ((event.key === 'Delete' || event.key === 'Backspace') && selected) { event.preventDefault(); requestDeleteNode(selected); }
      else if (event.key === '?' || (event.key === '/' && event.shiftKey)) setHelpOpen(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedIds, project.nodes, onUndo, onRedo, addSibling, addChild, pasteNode, onMessage, readOnly, requestDeleteNode]);

  const navigateDetails = (directionStep: -1 | 1) => {
    if (!detailsId) return;
    const index = project.nodes.findIndex((node) => node.id === detailsId);
    const next = project.nodes[(index + directionStep + project.nodes.length) % project.nodes.length];
    if (next) { setDetailsId(next.id); setSelectedIds(new Set([next.id])); }
  };

  const alterarVisualizacao = (proximaVisualizacao: ProjectView) => {
    setView(proximaVisualizacao);
    if (proximaVisualizacao !== 'mapa') onMapaEmFocoChange(false);
  };

  const alternarFocoNoMapa = () => {
    if (!mapaEmFoco) { setDetailsId(null); setFilterOpen(false); }
    onMapaEmFocoChange(!mapaEmFoco);
  };

  return <div className={styles.workspace}>
    <header className={styles.workspaceHeader}>
      <button type="button" className={styles.backButton} onClick={onBack} aria-label="Voltar aos projetos"><Icon name="back" /></button>
      <div className={styles.projectIdentity}><span style={{ background: project.color }}>{project.icon}</span><div><strong>{project.name}</strong><small>{progress}% concluído</small></div></div>
      <nav className={styles.viewTabs} aria-label="Visualizações do projeto">{([['mapa', 'map', 'Mapa'], ['lista', 'list', 'Lista'], ['kanban', 'board', 'Kanban']] as const).map(([id, icon, label]) => <button type="button" key={id} className={view === id ? styles.activeView : ''} onClick={() => alterarVisualizacao(id)}><Icon name={icon} size={17} />{label}</button>)}</nav>
      <div className={styles.saveIndicator} data-state={saveState} role="status" aria-live="polite"><i />{saveLabel(saveState, readOnly)}</div>
      <div className={styles.workspaceActions}><button type="button" className={styles.iconButton} onClick={() => setHelpOpen(true)} aria-label="Ajuda e atalhos"><Icon name="help" /></button>{!readOnly && <button type="button" className={styles.secondaryButton} onClick={() => downloadJson(project)}><Icon name="download" size={17} /> Exportar</button>}{view === 'mapa' && <button type="button" className={styles.mapFocusToggle} onClick={alternarFocoNoMapa} aria-pressed={mapaEmFoco} title="Ocultar cabeçalho e ampliar o mapa"><Icon name="fit" size={17} /><span>Ocultar cabeçalho</span></button>}</div>
    </header>

    <div className={styles.workspaceToolbar}>
      <div className={styles.nodeSearch}><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nós, etiquetas ou pessoas" aria-label="Buscar no projeto" />{query && <button type="button" onClick={() => { setQuery(''); setSearchHighlight(null); }} aria-label="Limpar busca">×</button>}{searchResults.length > 0 && <div className={styles.searchResults}>{searchResults.map((node) => <button type="button" key={node.id} onClick={() => { setSearchHighlight(node.id); setSelectedIds(new Set([node.id])); if (view !== 'mapa') setDetailsId(node.id); setQuery(''); }}><i style={{ background: node.color }}>{node.icon}</i><span><strong>{node.title}</strong><small>{NODE_TYPE_LABELS[node.type]} · {STATUS_LABELS[node.status]}</small></span></button>)}</div>}</div>
      <div className={styles.toolbarButtons}><button type="button" className={filterOpen ? styles.toolbarActive : ''} onClick={() => setFilterOpen(!filterOpen)}><Icon name="filter" size={17} /> Filtros</button>{view === 'mapa' && !readOnly && <><button type="button" onClick={() => { const next = layoutProject(project, direction); onChange(next); onMessage('Mapa reorganizado.'); }}><Icon name="layout" size={17} /> Reorganizar</button><select aria-label="Direção do mapa" value={direction} onChange={(event) => { const next = event.target.value as MapDirection; setDirection(next); onChange(layoutProject(project, next)); }}><option value="horizontal">Esquerda → direita</option><option value="vertical">Cima → baixo</option></select></>}{!readOnly && <><button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Desfazer"><Icon name="undo" size={17} /></button><button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Refazer"><Icon name="redo" size={17} /></button></>}</div>
      {filterOpen && <div className={styles.filterPanel}><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todos">Todos</option>{STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label><label>Prioridade<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="todos">Todas</option>{PRIORITIES.map((value) => <option key={value} value={value}>{PRIORITY_LABELS[value]}</option>)}</select></label><label>Responsável<select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}><option value="todos">Todos</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>Tipo<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="todos">Todos</option>{Object.entries(NODE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Prazo e condição<select value={deadlineFilter} onChange={(event) => setDeadlineFilter(event.target.value)}><option value="todos">Todos</option><option value="atrasados">Atrasados</option><option value="concluidos">Concluídos</option><option value="sem_responsavel">Sem responsável</option><option value="com_prazo">Com prazo</option><option value="sem_prazo">Sem prazo</option></select></label></div>}
    </div>

    <main className={`${styles.workspaceContent} ${detailsNode ? styles.withDetails : ''}`}>
      <div className={styles.primaryView}>{view === 'mapa' ? <MapCanvas readOnly={readOnly} project={filteredProject} people={people} selectedIds={selectedIds} selectedEdgeId={selectedEdgeId} direction={direction} searchHighlight={searchHighlight} onSelectionChange={setSelectedIds} onEdgeSelect={setSelectedEdgeId} onMoveNode={(id, position) => updateNode(id, { position })} onRenameNode={(id, title) => updateNode(id, { title })} onUpdateColor={(id, color) => updateNode(id, { color })} onCreateChild={addChild} onCreateSibling={addSibling} onDuplicate={duplicateNode} onOpenDetails={(id) => setDetailsId(id)} onToggleCollapse={(id) => { const node = project.nodes.find((item) => item.id === id); if (node) updateNode(id, { collapsed: !node.collapsed }); }} onDelete={(id) => { const node = project.nodes.find((item) => item.id === id); if (node) requestDeleteNode(node); }} onConnect={connect} onReconnect={reconnect} onDeleteConnection={removeConnection} onMessage={onMessage} /> : view === 'lista' ? <ListView readOnly={readOnly} project={filteredProject} people={people} query={query} onUpdate={updateNode} onOpen={(id) => { setDetailsId(id); setSelectedIds(new Set([id])); }} /> : <KanbanView readOnly={readOnly} project={filteredProject} people={people} query={query} onUpdate={updateNode} onOpen={(id) => { setDetailsId(id); setSelectedIds(new Set([id])); }} />}</div>
      {detailsNode && <DetailsPanel readOnly={readOnly} key={detailsNode.id} project={project} node={detailsNode} people={people} onUpdate={(update) => updateNode(detailsNode.id, update)} onAddComment={(content) => addComment(detailsNode.id, content)} onClose={() => setDetailsId(null)} onNavigate={navigateDetails} />}
    </main>

    {view === 'mapa' && mapaEmFoco && <button type="button" className={styles.mapFocusToggleFloating} onClick={alternarFocoNoMapa} aria-label="Exibir cabeçalho do mapa" title="Exibir cabeçalho"><Icon name="fit" size={18} /><span>Exibir cabeçalho</span></button>}

    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Atalhos do Mapa de Projetos" description="Os atalhos são ignorados enquanto você edita um campo.">
      <div className={styles.shortcutList}>{[['Tab', 'Adicionar nó filho'], ['Shift + Tab', 'Adicionar nó irmão'], ['Duplo clique', 'Editar título'], ['Enter', 'Confirmar edição'], ['Esc', 'Cancelar ou fechar'], ['Delete / Backspace', 'Excluir com confirmação'], ['⌘/Ctrl + C', 'Copiar nó'], ['⌘/Ctrl + V', 'Colar nó'], ['⌘/Ctrl + Z', 'Desfazer'], ['⌘/Ctrl + Shift + Z', 'Refazer'], ['Botão direito', 'Abrir menu de ações']].map(([keys, action]) => <div key={keys}><kbd>{keys}</kbd><span>{action}</span></div>)}</div>
    </Modal>

    <Modal open={Boolean(deleteNode)} onClose={() => { setDeleteNode(null); setReplacementNodeId(null); setDeleteStep('choice'); }} title={deleteStep === 'choice' ? 'Excluir nó' : 'Escolher sucessor'} description={deleteStep === 'choice' ? 'Defina como a sequência deve continuar.' : 'O sucessor assume a posição do nó removido.'}>
      {deleteNode && <div className={styles.deleteNodeDialog}>
        {deleteStep === 'choice' ? <>
          <div className={styles.deleteNodeSummary}><span aria-hidden="true">!</span><p><strong>{deleteNode.title}</strong> será removido. {deleteNodeChildren.length ? `${deleteNodeChildren.length} nó(s) conectado(s) podem ser preservados ou removidos junto.` : 'Este nó não possui dependentes.'}</p></div>
          <div className={`${styles.deleteNodeActions} ${deleteNodeChildren.length ? styles.deleteNodeActionsConnected : ''}`}><button type="button" className={styles.secondaryButton} onClick={() => { setDeleteNode(null); setReplacementNodeId(null); }}>Cancelar</button>{deleteNodeChildren.length > 0 && <button type="button" className={styles.secondaryButton} onClick={() => setDeleteStep('successor')}>Excluir somente este nó</button>}<button type="button" className={styles.dangerButton} onClick={deleteNodeChildren.length ? confirmDeleteConnected : confirmDelete}>{deleteNodeChildren.length ? 'Excluir nós conectados' : 'Excluir nó'}</button></div>
        </> : <>
          <div className={styles.deleteNodeSummary}><span aria-hidden="true">→</span><p>Escolha o card que herdará a posição de <strong>{deleteNode.title}</strong>. Os demais permanecerão conectados a ele.</p></div>
          <label className={styles.deleteNodeSelect}>Card sucessor<select value={replacementNodeId ?? ''} onChange={(event) => setReplacementNodeId(event.target.value || null)}><option value="">Selecione um card</option>{deleteNodeChildren.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select></label>
          {replacementNodeId && <p className={styles.deleteNodeSuccessor}><strong>{deleteNodeChildren.find((node) => node.id === replacementNodeId)?.title}</strong> assumirá esta posição.</p>}
          <div className={styles.deleteNodeActions}><button type="button" className={styles.secondaryButton} onClick={() => setDeleteStep('choice')}>Voltar</button><button type="button" className={styles.dangerButton} onClick={confirmDelete} disabled={!replacementNodeId}>Excluir</button></div>
        </>}
      </div>}
    </Modal>
  </div>;
}

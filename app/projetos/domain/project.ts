import {
  NODE_TYPES,
  PRIORITIES,
  PROJECT_FILE_VERSION,
  STATUSES,
  type MapDirection,
  type Project,
  type ProjectCollection,
  type ProjectConnection,
  type ProjectExport,
  type ProjectNode,
} from '../types';

const NODE_WIDTH = 224;
const NODE_HEIGHT = 132;

export function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

export function removeParticipantFromCollection(collection: ProjectCollection, participantId: string) {
  const updatedAt = new Date().toISOString();
  return {
    ...collection,
    people: collection.people.filter((person) => person.id !== participantId),
    projects: collection.projects.map((project) => {
      const participantIds = project.participantIds.filter((id) => id !== participantId);
      let nodesChanged = false;
      const nodes = project.nodes.map((node) => {
        if (!node.assigneeIds.includes(participantId)) return node;
        nodesChanged = true;
        return { ...node, assigneeIds: node.assigneeIds.filter((id) => id !== participantId), updatedAt };
      });
      if (participantIds.length === project.participantIds.length && !nodesChanged) return project;
      return { ...project, participantIds, nodes, updatedAt };
    }),
  };
}

export function removeProjectFromCollection(collection: ProjectCollection, projectId: string) {
  return { ...collection, projects: collection.projects.filter((project) => project.id !== projectId) };
}

export function getChildren(nodes: ProjectNode[], parentId: string | null) {
  return nodes.filter((node) => node.parentId === parentId);
}

export function getDescendantIds(nodes: ProjectNode[], nodeId: string) {
  const result = new Set<string>();
  const visit = (parentId: string) => {
    getChildren(nodes, parentId).forEach((child) => {
      if (result.has(child.id)) return;
      result.add(child.id);
      visit(child.id);
    });
  };
  visit(nodeId);
  return result;
}

export function wouldCreateHierarchyCycle(nodes: ProjectNode[], sourceId: string, targetId: string) {
  if (sourceId === targetId) return true;
  return getDescendantIds(nodes, targetId).has(sourceId);
}

export function connectHierarchy(project: Project, sourceId: string, targetId: string) {
  if (wouldCreateHierarchyCycle(project.nodes, sourceId, targetId)) {
    throw new Error('Essa conexão criaria um ciclo na hierarquia.');
  }
  const target = project.nodes.find((node) => node.id === targetId);
  if (!target) throw new Error('Nó de destino não encontrado.');
  const now = new Date().toISOString();
  const nodes = project.nodes.map((node) => node.id === targetId ? { ...node, parentId: sourceId, updatedAt: now } : node);
  const connections = project.connections
    .filter((connection) => !(connection.type === 'hierarquica' && connection.targetId === targetId))
    .concat({ id: createId('edge'), sourceId, targetId, type: 'hierarquica', label: '' });
  return { ...project, nodes, connections, updatedAt: now };
}

export function addNodeToProject(project: Project, node: ProjectNode): Project {
  if (project.nodes.some((item) => item.id === node.id)) throw new Error('Já existe um nó com este identificador.');
  if (node.parentId && !project.nodes.some((item) => item.id === node.parentId)) throw new Error('O nó pai não existe neste projeto.');
  const connections = node.parentId
    ? [...project.connections, { id: createId('edge'), sourceId: node.parentId, targetId: node.id, type: 'hierarquica' as const, label: '' }]
    : project.connections;
  return { ...project, nodes: [...project.nodes, node], connections, updatedAt: new Date().toISOString() };
}

export function updateProjectNode(project: Project, nodeId: string, update: Partial<ProjectNode>): Project {
  if (!project.nodes.some((node) => node.id === nodeId)) throw new Error('Nó não encontrado.');
  const now = new Date().toISOString();
  return { ...project, nodes: project.nodes.map((node) => node.id === nodeId ? { ...node, ...update, id: node.id, updatedAt: now } : node), updatedAt: now };
}

export function moveProjectNode(project: Project, nodeId: string, position: { x: number; y: number }) {
  return updateProjectNode(project, nodeId, { position: { x: Math.max(0, Math.round(position.x)), y: Math.max(0, Math.round(position.y)) } });
}

export function addFreeConnection(project: Project, sourceId: string, targetId: string, label = ''): Project {
  if (sourceId === targetId) throw new Error('Uma conexão precisa ligar dois nós diferentes.');
  if (!project.nodes.some((node) => node.id === sourceId) || !project.nodes.some((node) => node.id === targetId)) throw new Error('Um dos nós da conexão não existe.');
  if (project.connections.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId && edge.type === 'livre')) throw new Error('Essa conexão livre já existe.');
  return { ...project, connections: [...project.connections, { id: createId('edge'), sourceId, targetId, type: 'livre', label: cleanText(label, 80) }], updatedAt: new Date().toISOString() };
}

export function setProjectArchived(project: Project, archived: boolean): Project {
  return { ...project, archivedAt: archived ? new Date().toISOString() : null, updatedAt: new Date().toISOString() };
}

export function completeProjectNode(project: Project, nodeId: string, completed = true) {
  return updateProjectNode(project, nodeId, { status: completed ? 'concluido' : 'em_andamento', progress: completed ? 100 : 0 });
}

export function nodeOwnProgress(node: ProjectNode) {
  if (node.status === 'concluido') return 100;
  if (node.status === 'cancelado') return 0;
  if (node.checklist.length) {
    return clampProgress((node.checklist.filter((item) => item.completed).length / node.checklist.length) * 100);
  }
  return clampProgress(node.progress);
}

export function calculateNodeProgress(nodes: ProjectNode[], nodeId: string, visited = new Set<string>()): number {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node || visited.has(nodeId)) return 0;
  const nextVisited = new Set(visited).add(nodeId);
  const children = getChildren(nodes, nodeId);
  if (!children.length) return nodeOwnProgress(node);
  return clampProgress(children.reduce((sum, child) => sum + calculateNodeProgress(nodes, child.id, nextVisited), 0) / children.length);
}

export function calculateProjectProgress(project: Project) {
  const work = project.nodes.filter((node) => node.type === 'tarefa' || node.type === 'marco');
  if (!work.length) {
    const roots = getChildren(project.nodes, null);
    return roots.length ? clampProgress(roots.reduce((sum, node) => sum + calculateNodeProgress(project.nodes, node.id), 0) / roots.length) : 0;
  }
  return clampProgress(work.reduce((sum, node) => sum + nodeOwnProgress(node), 0) / work.length);
}

export function visibleNodeIds(nodes: ProjectNode[]) {
  const hidden = new Set<string>();
  nodes.filter((node) => node.collapsed).forEach((node) => getDescendantIds(nodes, node.id).forEach((id) => hidden.add(id)));
  return new Set(nodes.filter((node) => !hidden.has(node.id)).map((node) => node.id));
}

export function layoutProject(project: Project, direction: MapDirection): Project {
  const roots = getChildren(project.nodes, null);
  const positions = new Map<string, { x: number; y: number }>();
  let leafIndex = 0;
  const levelGap = direction === 'horizontal' ? 310 : 190;
  const siblingGap = direction === 'horizontal' ? 142 : 278;

  const walk = (node: ProjectNode, depth: number): number => {
    const children = getChildren(project.nodes, node.id);
    const lane = children.length
      ? children.map((child) => walk(child, depth + 1)).reduce((sum, item) => sum + item, 0) / children.length
      : leafIndex++;
    positions.set(node.id, direction === 'horizontal'
      ? { x: 88 + depth * levelGap, y: 72 + lane * siblingGap }
      : { x: 72 + lane * siblingGap, y: 72 + depth * levelGap });
    return lane;
  };
  roots.forEach((root) => walk(root, 0));
  project.nodes.filter((node) => !positions.has(node.id)).forEach((node) => {
    positions.set(node.id, { x: 88, y: 72 + leafIndex++ * siblingGap });
  });
  return {
    ...project,
    nodes: project.nodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position })),
    updatedAt: new Date().toISOString(),
  };
}

export function connectionPath(source: ProjectNode, target: ProjectNode, direction: MapDirection) {
  if (direction === 'vertical') {
    const sx = source.position.x + NODE_WIDTH / 2;
    const sy = source.position.y + NODE_HEIGHT;
    const tx = target.position.x + NODE_WIDTH / 2;
    const ty = target.position.y;
    const mid = (sy + ty) / 2;
    return `M ${sx} ${sy} C ${sx} ${mid}, ${tx} ${mid}, ${tx} ${ty}`;
  }
  const sx = source.position.x + NODE_WIDTH;
  const sy = source.position.y + NODE_HEIGHT / 2;
  const tx = target.position.x;
  const ty = target.position.y + NODE_HEIGHT / 2;
  const mid = (sx + tx) / 2;
  return `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${tx} ${ty}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, max = 5000) {
  return typeof value === 'string' ? value.replace(/[<>\u0000-\u001f]/g, '').slice(0, max) : '';
}

export function validateProjectImport(value: unknown, companyId: string): Project {
  if (!isRecord(value) || value.kind !== 'avantalab-project-map') throw new Error('O arquivo não é uma exportação do AvantaProjetos.');
  if (value.version !== PROJECT_FILE_VERSION) throw new Error(`Versão de arquivo incompatível. Esperado: ${PROJECT_FILE_VERSION}.`);
  if (!isRecord(value.project)) throw new Error('O arquivo não contém um projeto válido.');
  const raw = value.project;
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.connections)) throw new Error('Nós ou conexões ausentes no arquivo.');
  if (raw.nodes.length > 5000) throw new Error('O arquivo excede o limite seguro de 5.000 nós.');
  const ids = new Set<string>();
  const now = new Date().toISOString();
  const nodes: ProjectNode[] = raw.nodes.map((item, index) => {
    if (!isRecord(item)) throw new Error(`Nó inválido na posição ${index + 1}.`);
    const originalId = cleanText(item.id, 120) || createId('node');
    let id = originalId;
    while (ids.has(id)) id = createId('node');
    ids.add(id);
    const type = NODE_TYPES.includes(item.type as never) ? item.type as ProjectNode['type'] : 'ideia';
    const status = STATUSES.includes(item.status as never) ? item.status as ProjectNode['status'] : 'ideia';
    const priority = PRIORITIES.includes(item.priority as never) ? item.priority as ProjectNode['priority'] : 'sem_prioridade';
    const position = isRecord(item.position) ? item.position : {};
    return {
      id,
      parentId: typeof item.parentId === 'string' ? cleanText(item.parentId, 120) : null,
      type,
      title: cleanText(item.title, 180) || 'Sem título',
      description: cleanText(item.description),
      color: /^#[0-9a-f]{6}$/i.test(String(item.color)) ? String(item.color) : '#1F8A9E',
      icon: cleanText(item.icon, 12),
      status,
      priority,
      assigneeIds: Array.isArray(item.assigneeIds) ? item.assigneeIds.filter((id): id is string => typeof id === 'string').slice(0, 50) : [],
      startDate: typeof item.startDate === 'string' ? item.startDate.slice(0, 10) : null,
      dueDate: typeof item.dueDate === 'string' ? item.dueDate.slice(0, 10) : null,
      progress: clampProgress(Number(item.progress)),
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => cleanText(tag, 40)).filter(Boolean).slice(0, 30) : [],
      checklist: Array.isArray(item.checklist) ? item.checklist.filter(isRecord).slice(0, 200).map((check) => ({
        id: cleanText(check.id, 120) || createId('check'), title: cleanText(check.title, 180), completed: check.completed === true,
      })) : [],
      comments: Math.max(0, Number(item.comments) || 0),
      attachments: Math.max(0, Number(item.attachments) || 0),
      collapsed: item.collapsed === true,
      position: { x: Number(position.x) || 0, y: Number(position.y) || 0 },
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : now,
      updatedAt: now,
    };
  });
  const byOriginalId = new Map(raw.nodes.map((item, index) => [isRecord(item) ? cleanText(item.id, 120) : '', nodes[index].id]));
  const connections: ProjectConnection[] = raw.connections.filter(isRecord).map((item): ProjectConnection => ({
    id: createId('edge'),
    sourceId: byOriginalId.get(cleanText(item.sourceId, 120)) ?? '',
    targetId: byOriginalId.get(cleanText(item.targetId, 120)) ?? '',
    type: item.type === 'hierarquica' ? 'hierarquica' : 'livre',
    label: cleanText(item.label, 80),
  })).filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId) && edge.sourceId !== edge.targetId);
  const projectId = createId('project');
  return {
    id: projectId,
    companyId,
    name: `${cleanText(raw.name, 120) || 'Projeto importado'} (importado)`,
    description: cleanText(raw.description, 600),
    color: /^#[0-9a-f]{6}$/i.test(String(raw.color)) ? String(raw.color) : '#0A1F44',
    icon: cleanText(raw.icon, 12) || '◇',
    status: 'planejado',
    favorite: false,
    archivedAt: null,
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate.slice(0, 10) : null,
    participantIds: [],
    colorPresets: Array.isArray(raw.colorPresets) ? raw.colorPresets.slice(0, 5).map((color) => /^#[0-9a-f]{6}$/i.test(String(color)) ? String(color) : '') : ['', '', '', '', ''],
    nodes: nodes.map((node) => ({ ...node, parentId: node.parentId ? byOriginalId.get(node.parentId) ?? null : null })),
    connections,
    activities: [{ id: createId('activity'), nodeId: null, action: 'Projeto importado', detail: 'Arquivo JSON validado e sanitizado.', at: now }],
    createdAt: now,
    updatedAt: now,
  };
}

export function exportProject(project: Project): ProjectExport {
  return { kind: 'avantalab-project-map', version: PROJECT_FILE_VERSION, exportedAt: new Date().toISOString(), project };
}

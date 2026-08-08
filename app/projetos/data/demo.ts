import { createId, layoutProject } from '../domain/project';
import {
  PROJECT_FILE_VERSION,
  type Person,
  type Project,
  type ProjectCollection,
  type ProjectConnection,
  type ProjectNode,
  type ProjectTemplate,
} from '../types';

export const DEMO_COMPANY_ID = 'empresa-demo-avantalab';

export const DEMO_PEOPLE: Person[] = [
  { id: 'ana', name: 'Ana Martins', initials: 'AM', color: '#1F8A9E' },
  { id: 'bruno', name: 'Bruno Rocha', initials: 'BR', color: '#0A1F44' },
  { id: 'carla', name: 'Carla Dias', initials: 'CD', color: '#8B5CF6' },
  { id: 'diego', name: 'Diego Lima', initials: 'DL', color: '#B45309' },
];

const now = '2026-08-07T12:00:00.000Z';

function node(
  id: string,
  parentId: string | null,
  title: string,
  type: ProjectNode['type'],
  options: Partial<ProjectNode> = {},
): ProjectNode {
  return {
    id,
    parentId,
    title,
    type,
    description: '',
    color: type === 'projeto' ? '#0A1F44' : type === 'etapa' ? '#1F8A9E' : '#5B7C91',
    icon: type === 'projeto' ? '◇' : type === 'etapa' ? '◫' : type === 'marco' ? '◆' : type === 'ideia' ? '✦' : '✓',
    status: 'planejado',
    priority: 'normal',
    assigneeIds: [],
    startDate: '2026-08-03',
    dueDate: null,
    progress: 0,
    tags: [],
    checklist: [],
    comments: 0,
    attachments: 0,
    collapsed: false,
    position: { x: 0, y: 0 },
    createdAt: now,
    updatedAt: now,
    ...options,
  };
}

const campaignNodes: ProjectNode[] = [
  node('launch', null, 'Campanha de lançamento', 'projeto', { status: 'em_andamento', assigneeIds: ['ana', 'bruno'], description: 'Lançamento da nova linha comercial Avanta.' }),
  node('planning', 'launch', 'Planejamento', 'etapa', { status: 'concluido', assigneeIds: ['ana'], dueDate: '2026-08-09', collapsed: false }),
  node('audience', 'planning', 'Definir público e metas', 'tarefa', { status: 'concluido', priority: 'alta', assigneeIds: ['ana'], checklist: [{ id: 'aud-1', title: 'Revisar personas', completed: true }, { id: 'aud-2', title: 'Aprovar metas', completed: true }] }),
  node('budget', 'planning', 'Aprovar orçamento', 'marco', { status: 'concluido', priority: 'urgente', assigneeIds: ['bruno'] }),
  node('materials', 'launch', 'Materiais de divulgação', 'etapa', { status: 'em_andamento', assigneeIds: ['carla'], dueDate: '2026-08-18' }),
  node('landing', 'materials', 'Landing page', 'tarefa', { status: 'em_andamento', priority: 'alta', assigneeIds: ['carla'], dueDate: '2026-08-14', progress: 65, tags: ['digital', 'lançamento'], comments: 4, attachments: 2, checklist: [{ id: 'land-1', title: 'Texto aprovado', completed: true }, { id: 'land-2', title: 'Imagens finais', completed: true }, { id: 'land-3', title: 'Publicar versão de teste', completed: false }] }),
  node('sales-kit', 'materials', 'Kit da equipe comercial', 'tarefa', { status: 'aguardando', priority: 'normal', assigneeIds: ['carla', 'bruno'], dueDate: '2026-08-17', tags: ['vendas'] }),
  node('team', 'launch', 'Equipe comercial', 'etapa', { status: 'em_andamento', assigneeIds: ['bruno'] }),
  node('training', 'team', 'Treinamento do time', 'tarefa', { status: 'planejado', priority: 'alta', assigneeIds: ['bruno'], dueDate: '2026-08-20', checklist: [{ id: 'train-1', title: 'Preparar roteiro', completed: true }, { id: 'train-2', title: 'Agendar encontro', completed: false }] }),
  node('clients', 'launch', 'Clientes', 'etapa', { status: 'planejado', assigneeIds: ['diego'] }),
  node('segment', 'clients', 'Segmentar carteira', 'tarefa', { status: 'em_andamento', assigneeIds: ['diego'], progress: 35, dueDate: '2026-08-15' }),
  node('launch-day', 'launch', 'Lançamento', 'marco', { status: 'planejado', priority: 'urgente', assigneeIds: ['ana', 'bruno'], dueDate: '2026-08-25' }),
  node('results', 'launch', 'Acompanhamento de resultados', 'etapa', { status: 'ideia', assigneeIds: ['ana'], dueDate: '2026-09-10' }),
  node('dashboard', 'results', 'Painel de indicadores', 'ideia', { status: 'ideia', assigneeIds: ['ana'], tags: ['métricas'] }),
  node('note', 'launch', 'Manter comunicação simples e direta', 'observacao', { status: 'ideia', color: '#7C6F55' }),
];

const campaignConnections: ProjectConnection[] = [...campaignNodes.filter((item) => item.parentId).map((item) => ({
  id: `edge-${item.parentId}-${item.id}`,
  sourceId: item.parentId as string,
  targetId: item.id,
  type: 'hierarquica' as const,
  label: '',
})),
  { id: 'edge-free-landing-training', sourceId: 'landing', targetId: 'training', type: 'livre' as const, label: 'apoia treinamento' },
  { id: 'edge-free-segment-kit', sourceId: 'segment', targetId: 'sales-kit', type: 'livre' as const, label: 'orienta' },
];

function baseProject(options: Partial<Project> & Pick<Project, 'id' | 'name'>): Project {
  const { id, name, ...overrides } = options;
  return {
    id,
    companyId: DEMO_COMPANY_ID,
    name,
    description: '',
    color: '#0A1F44',
    icon: '◇',
    status: 'planejado',
    favorite: false,
    archivedAt: null,
    startDate: '2026-08-07',
    dueDate: null,
    participantIds: ['ana'],
    colorPresets: ['', '', '', '', ''],
    nodes: [],
    connections: [],
    activities: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export const CAMPAIGN_PROJECT = layoutProject(baseProject({
  id: 'campanha-lancamento',
  name: 'Campanha de lançamento',
  description: 'Planejamento visual da campanha comercial do segundo semestre.',
  color: '#1F8A9E',
  icon: '✦',
  status: 'em_andamento',
  favorite: true,
  dueDate: '2026-09-10',
  participantIds: ['ana', 'bruno', 'carla', 'diego'],
  nodes: campaignNodes,
  connections: campaignConnections,
  activities: [
    { id: 'act-1', nodeId: 'landing', action: 'Checklist atualizado', detail: 'Carla concluiu “Imagens finais”.', at: '2026-08-07T10:42:00.000Z' },
    { id: 'act-2', nodeId: 'segment', action: 'Responsável definido', detail: 'Diego assumiu a segmentação da carteira.', at: '2026-08-06T15:18:00.000Z' },
  ],
}), 'horizontal');

function summaryProject(id: string, name: string, status: Project['status'], color: string, taskCount: number, completed: number, archived = false): Project {
  const root = node(`${id}-root`, null, name, 'projeto', { status });
  const tasks = Array.from({ length: taskCount }, (_, index) => node(
    `${id}-task-${index}`,
    root.id,
    `Atividade ${index + 1}`,
    'tarefa',
    { status: index < completed ? 'concluido' : status, progress: index < completed ? 100 : 0, assigneeIds: [index % 2 ? 'ana' : 'bruno'] },
  ));
  return layoutProject(baseProject({
    id, name, color, status, nodes: [root, ...tasks],
    connections: tasks.map((task) => ({ id: `edge-${root.id}-${task.id}`, sourceId: root.id, targetId: task.id, type: 'hierarquica', label: '' })),
    archivedAt: archived ? '2026-07-20T14:00:00.000Z' : null,
    updatedAt: archived ? '2026-07-20T14:00:00.000Z' : '2026-08-05T16:30:00.000Z',
  }), 'horizontal');
}

export function createDemoCollection(): ProjectCollection {
  return {
    version: PROJECT_FILE_VERSION,
    companyId: DEMO_COMPANY_ID,
    people: DEMO_PEOPLE,
    projects: [
      structuredClone(CAMPAIGN_PROJECT),
      summaryProject('visitas-agosto', 'Roteiro de visitas — Agosto', 'em_andamento', '#376B87', 9, 4),
      summaryProject('expansao-carteira', 'Expansão da carteira Sul', 'planejado', '#7C6F55', 7, 1),
      summaryProject('planejamento-julho', 'Planejamento mensal — Julho', 'concluido', '#477A5B', 12, 12),
      summaryProject('campanha-inverno', 'Campanha de inverno', 'cancelado', '#7A677A', 6, 2, true),
    ],
  };
}

const templateBranches: Record<ProjectTemplate, string[]> = {
  blank: [],
  commercial: ['Objetivos', 'Estratégia', 'Equipe', 'Indicadores'],
  campaign: ['Planejamento', 'Conteúdo', 'Canais', 'Lançamento', 'Resultados'],
  'product-launch': ['Pesquisa', 'Produto', 'Comunicação', 'Vendas', 'Pós-lançamento'],
  visits: ['Preparação', 'Roteiro', 'Clientes', 'Retornos'],
  'client-growth': ['Diagnóstico', 'Segmentos', 'Prospecção', 'Conversão', 'Retenção'],
  monthly: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
  stages: ['Descoberta', 'Planejamento', 'Execução', 'Entrega'],
  'free-map': ['Primeira ideia'],
};

export function createProjectFromTemplate(input: {
  name: string;
  description: string;
  color: string;
  icon: string;
  startDate: string;
  dueDate: string | null;
  participantIds: string[];
  template: ProjectTemplate;
  companyId: string;
}): Project {
  const createdAt = new Date().toISOString();
  const projectId = createId('project');
  const rootId = createId('node');
  const root = node(rootId, null, input.name, 'projeto', { createdAt, updatedAt: createdAt, status: 'planejado', assigneeIds: input.participantIds });
  const children = templateBranches[input.template].map((title) => node(createId('node'), rootId, title, input.template === 'free-map' ? 'ideia' : 'etapa', { createdAt, updatedAt: createdAt }));
  return layoutProject({
    ...baseProject({ id: projectId, name: input.name }),
    companyId: input.companyId,
    description: input.description,
    color: input.color,
    icon: input.icon || '◇',
    startDate: input.startDate,
    dueDate: input.dueDate,
    participantIds: input.participantIds,
    nodes: [root, ...children],
    connections: children.map((child) => ({ id: createId('edge'), sourceId: rootId, targetId: child.id, type: 'hierarquica', label: '' })),
    activities: [{ id: createId('activity'), nodeId: null, action: 'Projeto criado', detail: `Modelo: ${input.template}.`, at: createdAt }],
    createdAt,
    updatedAt: createdAt,
  }, 'horizontal');
}

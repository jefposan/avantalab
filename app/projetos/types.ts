export const PROJECT_FILE_VERSION = 1 as const;

export const NODE_TYPES = ['projeto', 'etapa', 'tarefa', 'marco', 'ideia', 'observacao'] as const;
export const STATUSES = ['ideia', 'planejado', 'em_andamento', 'aguardando', 'concluido', 'cancelado'] as const;
export const PRIORITIES = ['sem_prioridade', 'baixa', 'normal', 'alta', 'urgente'] as const;

export type NodeType = (typeof NODE_TYPES)[number];
export type ProjectStatus = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type ConnectionType = 'hierarquica' | 'livre';
export type MapDirection = 'horizontal' | 'vertical';
export type ProjectView = 'mapa' | 'lista' | 'kanban';
export type ProfileRole = 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples';

export type Person = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type ChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
};

export type ProjectNode = {
  id: string;
  parentId: string | null;
  type: NodeType;
  title: string;
  description: string;
  color: string;
  icon: string;
  status: ProjectStatus;
  priority: Priority;
  assigneeIds: string[];
  startDate: string | null;
  dueDate: string | null;
  progress: number;
  tags: string[];
  checklist: ChecklistItem[];
  comments: number;
  attachments: number;
  collapsed: boolean;
  position: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
};

export type ProjectConnection = {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  label: string;
};

export type Activity = {
  id: string;
  nodeId: string | null;
  action: string;
  detail: string;
  at: string;
};

export type Project = {
  id: string;
  companyId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  status: ProjectStatus;
  favorite: boolean;
  archivedAt: string | null;
  startDate: string;
  dueDate: string | null;
  participantIds: string[];
  colorPresets: string[];
  nodes: ProjectNode[];
  connections: ProjectConnection[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectCollection = {
  version: typeof PROJECT_FILE_VERSION;
  companyId: string;
  people: Person[];
  projects: Project[];
};

export type ProjectExport = {
  kind: 'avantalab-project-map';
  version: typeof PROJECT_FILE_VERSION;
  exportedAt: string;
  project: Project;
};

export type ProjectTemplate =
  | 'blank'
  | 'commercial'
  | 'campaign'
  | 'product-launch'
  | 'visits'
  | 'client-growth'
  | 'monthly'
  | 'stages'
  | 'free-map';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  ideia: 'Ideia',
  planejado: 'Planejado',
  em_andamento: 'Em andamento',
  aguardando: 'Aguardando',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  sem_prioridade: 'Sem prioridade',
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  projeto: 'Projeto',
  etapa: 'Etapa',
  tarefa: 'Tarefa',
  marco: 'Marco',
  ideia: 'Ideia',
  observacao: 'Observação',
};

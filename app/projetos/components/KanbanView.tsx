'use client';

import { STATUS_LABELS, STATUSES, type Person, type Project, type ProjectNode } from '../types';
import styles from '../projetos.module.css';
import Tooltip from '@/app/components/Tooltip';

export function KanbanView({ project, people, query, onUpdate, onOpen, readOnly = false }: {
  project: Project;
  people: Person[];
  query: string;
  onUpdate: (nodeId: string, update: Partial<ProjectNode>) => void;
  onOpen: (nodeId: string) => void;
  readOnly?: boolean;
}) {
  const cards = project.nodes.filter((node) => node.type === 'tarefa' || node.type === 'marco').filter((node) => !query || `${node.title} ${node.description} ${node.tags.join(' ')}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  return <div className={styles.kanban} aria-label="Quadro Kanban por status">{STATUSES.map((status) => {
    const items = cards.filter((node) => node.status === status);
    return <section key={status} className={styles.kanbanColumn}
      onDragOver={(event) => { if (readOnly) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
      onDrop={(event) => { if (readOnly) return; event.preventDefault(); const nodeId = event.dataTransfer.getData('text/avanta-node'); if (nodeId) onUpdate(nodeId, { status, progress: status === 'concluido' ? 100 : project.nodes.find((node) => node.id === nodeId)?.progress ?? 0 }); }}>
      <header><span data-status={status} /><strong>{STATUS_LABELS[status]}</strong><small>{items.length}</small></header>
      <div>{items.map((node) => {
        const assigned = node.assigneeIds.map((id) => people.find((person) => person.id === id)).filter(Boolean).slice(0, 3);
        return <article key={node.id} draggable={!readOnly} onDragStart={(event) => { if (readOnly) return; event.dataTransfer.setData('text/avanta-node', node.id); event.dataTransfer.effectAllowed = 'move'; }}>
          <button type="button" onClick={() => onOpen(node.id)}><span className={styles.kanbanType}>{node.icon} {node.type === 'marco' ? 'Marco' : 'Tarefa'}</span><strong>{node.title}</strong>{node.description && <p>{node.description}</p>}<div className={styles.tagList}>{node.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div><footer><div className={styles.avatarStack}>{assigned.map((person) => person && <Tooltip key={person.id} texto={person.name} posicao="top" wrapperClassName={styles.avatarTooltip}><span style={{ background: person.color }}>{person.initials}</span></Tooltip>)}</div><span>{node.dueDate ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${node.dueDate}T12:00:00`)) : 'Sem prazo'}</span></footer></button>
        </article>;
      })}{!items.length && <p className={styles.kanbanEmpty}>{readOnly ? 'Nenhuma tarefa' : 'Arraste uma tarefa para cá'}</p>}</div>
    </section>;
  })}</div>;
}

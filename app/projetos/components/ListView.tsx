'use client';

import { useMemo } from 'react';
import { NODE_TYPE_LABELS, PRIORITY_LABELS, PRIORITIES, STATUS_LABELS, STATUSES, type Person, type Project, type ProjectNode } from '../types';
import styles from '../projetos.module.css';

function flatten(nodes: ProjectNode[]) {
  const result: Array<{ node: ProjectNode; depth: number }> = [];
  const visit = (parentId: string | null, depth: number) => nodes.filter((node) => node.parentId === parentId).forEach((node) => { result.push({ node, depth }); visit(node.id, depth + 1); });
  visit(null, 0);
  const seen = new Set(result.map((item) => item.node.id));
  nodes.filter((node) => !seen.has(node.id)).forEach((node) => result.push({ node, depth: 0 }));
  return result;
}

export function ListView({ project, people, query, onUpdate, onOpen, readOnly = false }: {
  project: Project;
  people: Person[];
  query: string;
  onUpdate: (nodeId: string, update: Partial<ProjectNode>) => void;
  onOpen: (nodeId: string) => void;
  readOnly?: boolean;
}) {
  const rows = useMemo(() => flatten(project.nodes).filter(({ node }) => !query || `${node.title} ${node.description} ${node.tags.join(' ')} ${node.assigneeIds.map((id) => people.find((person) => person.id === id)?.name ?? '').join(' ')}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [project.nodes, query, people]);
  return <div className={styles.listView}>
    <div className={styles.taskTable} role="table" aria-label="Lista hierárquica de tarefas">
      <div className={styles.taskTableHead} role="row"><span>Item</span><span>Status</span><span>Prioridade</span><span>Responsável</span><span>Prazo</span></div>
      {rows.map(({ node, depth }) => <div key={node.id} className={styles.taskTableRow} role="row">
        <button type="button" onClick={() => onOpen(node.id)} style={{ paddingLeft: `${16 + depth * 24}px` }}><i style={{ background: node.color }}>{node.icon}</i><span><strong>{node.title}</strong><small>{NODE_TYPE_LABELS[node.type]}</small></span></button>
        <select disabled={readOnly} aria-label={`Status de ${node.title}`} value={node.status} onChange={(event) => onUpdate(node.id, { status: event.target.value as ProjectNode['status'], progress: event.target.value === 'concluido' ? 100 : node.progress })}>{STATUSES.map((value) => <option value={value} key={value}>{STATUS_LABELS[value]}</option>)}</select>
        <select disabled={readOnly} aria-label={`Prioridade de ${node.title}`} value={node.priority} onChange={(event) => onUpdate(node.id, { priority: event.target.value as ProjectNode['priority'] })}>{PRIORITIES.map((value) => <option value={value} key={value}>{PRIORITY_LABELS[value]}</option>)}</select>
        <select disabled={readOnly} aria-label={`Responsável principal de ${node.title}`} value={node.assigneeIds[0] ?? ''} onChange={(event) => onUpdate(node.id, { assigneeIds: event.target.value ? [event.target.value, ...node.assigneeIds.filter((id) => id !== event.target.value)] : [] })}><option value="">Sem responsável</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
        <input disabled={readOnly} aria-label={`Prazo de ${node.title}`} type="date" value={node.dueDate ?? ''} onChange={(event) => onUpdate(node.id, { dueDate: event.target.value || null })} />
      </div>)}
    </div>
    {!rows.length && <div className={styles.emptyState}><h2>Nenhum item encontrado</h2><p>Limpe a pesquisa ou ajuste os filtros.</p></div>}
  </div>;
}

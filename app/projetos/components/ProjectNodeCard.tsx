'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { NODE_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS, type Person, type ProjectNode } from '../types';
import { getChildren, nodeOwnProgress } from '../domain/project';
import styles from '../projetos.module.css';

export const ProjectNodeCard = memo(function ProjectNodeCard({
  node, allNodes, people, selected, highlighted, onSelect, onPointerDown, onRename, onContextMenu, readOnly = false,
}: {
  node: ProjectNode;
  allNodes: ProjectNode[];
  people: Person[];
  selected: boolean;
  highlighted: boolean;
  onSelect: (event: React.MouseEvent) => void;
  onPointerDown: (event: React.PointerEvent) => void;
  onRename: (title: string) => void;
  onContextMenu: (event: React.MouseEvent) => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const progress = nodeOwnProgress(node);
  const childrenCount = getChildren(allNodes, node.id).length;
  const assignees = node.assigneeIds.map((id) => people.find((person) => person.id === id)).filter(Boolean).slice(0, 3);
  const late = Boolean(node.dueDate && node.status !== 'concluido' && new Date(`${node.dueDate}T23:59:59`) < new Date());

  useEffect(() => { setTitle(node.title); }, [node.title]);
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

  const finish = () => {
    const next = title.trim();
    if (next && next !== node.title) onRename(next);
    else setTitle(node.title);
    setEditing(false);
  };

  return <div
    className={`${styles.mapNode} ${selected ? styles.mapNodeSelected : ''} ${highlighted ? styles.mapNodeHighlighted : ''} ${node.status === 'concluido' ? styles.mapNodeCompleted : ''}`}
    style={{ left: node.position.x, top: node.position.y, '--node-color': node.color } as React.CSSProperties}
    role="button" tabIndex={selected ? 0 : -1} aria-label={`${NODE_TYPE_LABELS[node.type]}: ${node.title}. ${STATUS_LABELS[node.status]}`}
    onClick={onSelect} onPointerDown={onPointerDown} onContextMenu={onContextMenu}
    onDoubleClick={(event) => { if (readOnly) return; event.stopPropagation(); setEditing(true); }}
  >
    <div className={styles.nodeAccent} />
    <header><span className={styles.nodeIcon}>{node.icon || '◇'}</span><span>{NODE_TYPE_LABELS[node.type]}</span>{childrenCount > 0 && <small aria-label={`${childrenCount} nós filhos`}>{node.collapsed ? `+${childrenCount}` : childrenCount}</small>}</header>
    {editing ? <input ref={inputRef} className={styles.nodeTitleInput} value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} onBlur={finish} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter') finish(); if (event.key === 'Escape') { setTitle(node.title); setEditing(false); } }} aria-label="Título do nó" /> : <strong className={styles.nodeTitle}>{node.title}</strong>}
    {node.description && <p className={styles.nodeDescription}>{node.description}</p>}
    <div className={styles.nodeBadges}><span data-status={node.status}>{STATUS_LABELS[node.status]}</span>{node.priority !== 'sem_prioridade' && <span data-priority={node.priority}>{PRIORITY_LABELS[node.priority]}</span>}{late && <span className={styles.lateBadge}>Atrasado</span>}</div>
    <footer><div className={styles.avatarStack}>{assignees.map((person) => <span key={person!.id} style={{ background: person!.color }}>{person!.initials}</span>)}{!assignees.length && <span className={styles.emptyAvatar}>—</span>}</div><div className={styles.nodeIndicators}>{node.checklist.length > 0 && <span>☑ {node.checklist.filter((item) => item.completed).length}/{node.checklist.length}</span>}{node.comments > 0 && <span>◌ {node.comments}</span>}{node.attachments > 0 && <span>⌕ {node.attachments}</span>}</div><span className={styles.nodeProgress}>{progress}%</span></footer>
  </div>;
});

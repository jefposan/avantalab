'use client';

import { useState } from 'react';
import { createId, nodeOwnProgress } from '../domain/project';
import { NODE_TYPE_LABELS, NODE_TYPES, PRIORITY_LABELS, PRIORITIES, STATUS_LABELS, STATUSES, type Person, type Project, type ProjectNode } from '../types';
import styles from '../projetos.module.css';
import { Icon } from './Icon';

export function DetailsPanel({ project, node, people, onUpdate, onAddComment, onClose, onNavigate, readOnly = false }: {
  project: Project;
  node: ProjectNode;
  people: Person[];
  onUpdate: (update: Partial<ProjectNode>) => void;
  onAddComment: (content: string) => void;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
  readOnly?: boolean;
}) {
  const [tag, setTag] = useState('');
  const [checkTitle, setCheckTitle] = useState('');
  const [comment, setComment] = useState('');
  const progress = nodeOwnProgress(node);

  const updateChecklist = (id: string, completed: boolean) => onUpdate({ checklist: node.checklist.map((item) => item.id === id ? { ...item, completed } : item) });

  return <aside className={styles.detailsPanel} aria-label={`Detalhes de ${node.title}`}>
    <header className={styles.detailsHeader}><div><span>{NODE_TYPE_LABELS[node.type]}</span><strong>Detalhes</strong></div><div><button type="button" className={styles.iconButton} onClick={() => onNavigate(-1)} aria-label="Nó anterior">‹</button><button type="button" className={styles.iconButton} onClick={() => onNavigate(1)} aria-label="Próximo nó">›</button><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Fechar detalhes"><Icon name="close" /></button></div></header>
    <fieldset disabled={readOnly} className={`${styles.detailsScroll} ${styles.detailsFieldset}`}>
      <label className={styles.detailTitle}>Título<input value={node.title} maxLength={180} onChange={(event) => onUpdate({ title: event.target.value })} /></label>
      <label>Descrição<textarea rows={4} maxLength={5000} value={node.description} onChange={(event) => onUpdate({ description: event.target.value })} placeholder="Contexto, resultado esperado e observações" /></label>
      <div className={styles.detailGrid}><label>Tipo<select value={node.type} onChange={(event) => onUpdate({ type: event.target.value as ProjectNode['type'] })}>{NODE_TYPES.map((value) => <option key={value} value={value}>{NODE_TYPE_LABELS[value]}</option>)}</select></label><label>Status<select value={node.status} onChange={(event) => onUpdate({ status: event.target.value as ProjectNode['status'], progress: event.target.value === 'concluido' ? 100 : node.progress })}>{STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label><label>Prioridade<select value={node.priority} onChange={(event) => onUpdate({ priority: event.target.value as ProjectNode['priority'] })}>{PRIORITIES.map((value) => <option key={value} value={value}>{PRIORITY_LABELS[value]}</option>)}</select></label><label>Cor<input type="color" value={node.color} onChange={(event) => onUpdate({ color: event.target.value })} /></label><label>Data inicial<input type="date" value={node.startDate ?? ''} onChange={(event) => onUpdate({ startDate: event.target.value || null })} /></label><label>Data final<input type="date" min={node.startDate ?? undefined} value={node.dueDate ?? ''} onChange={(event) => onUpdate({ dueDate: event.target.value || null })} /></label></div>

      <section className={styles.detailSection}><div className={styles.detailSectionTitle}><strong>Progresso</strong><span>{progress}%</span></div><div className={styles.detailProgress}><i style={{ width: `${progress}%` }} /></div>{!node.checklist.length && node.status !== 'concluido' && <input aria-label="Percentual de conclusão" type="range" min="0" max="100" value={node.progress} onChange={(event) => onUpdate({ progress: Number(event.target.value) })} />}</section>

      <fieldset className={styles.detailSection}><legend>Responsáveis</legend><div className={styles.peopleChecks}>{people.map((person) => <label key={person.id}><input type="checkbox" checked={node.assigneeIds.includes(person.id)} onChange={() => onUpdate({ assigneeIds: node.assigneeIds.includes(person.id) ? node.assigneeIds.filter((id) => id !== person.id) : [...node.assigneeIds, person.id] })} /><span style={{ background: person.color }}>{person.initials}</span>{person.name}</label>)}</div></fieldset>

      <section className={styles.detailSection}><strong>Etiquetas</strong><div className={styles.tagList}>{node.tags.map((item) => <button type="button" key={item} onClick={() => onUpdate({ tags: node.tags.filter((tagItem) => tagItem !== item) })} title="Remover etiqueta">{item} ×</button>)}</div><form className={styles.inlineForm} onSubmit={(event) => { event.preventDefault(); const next = tag.trim(); if (next && !node.tags.includes(next)) onUpdate({ tags: [...node.tags, next] }); setTag(''); }}><input value={tag} maxLength={40} onChange={(event) => setTag(event.target.value)} placeholder="Nova etiqueta" aria-label="Nova etiqueta" /><button type="submit">Adicionar</button></form></section>

      <section className={styles.detailSection}><div className={styles.detailSectionTitle}><strong>Checklist</strong><span>{node.checklist.filter((item) => item.completed).length}/{node.checklist.length}</span></div><div className={styles.checklist}>{node.checklist.map((item) => <label key={item.id}><input type="checkbox" checked={item.completed} onChange={(event) => updateChecklist(item.id, event.target.checked)} /><span>{item.title}</span><button type="button" onClick={() => onUpdate({ checklist: node.checklist.filter((check) => check.id !== item.id) })} aria-label={`Remover ${item.title}`}>×</button></label>)}</div><form className={styles.inlineForm} onSubmit={(event) => { event.preventDefault(); const title = checkTitle.trim(); if (title) onUpdate({ checklist: [...node.checklist, { id: createId('check'), title, completed: false }] }); setCheckTitle(''); }}><input value={checkTitle} maxLength={180} onChange={(event) => setCheckTitle(event.target.value)} placeholder="Novo item" aria-label="Novo item do checklist" /><button type="submit">Adicionar</button></form></section>

      <section className={styles.detailSection}><div className={styles.detailSectionTitle}><strong>Comentários</strong><span>{node.comments}</span></div><div className={styles.commentHistory}>{project.activities.filter((activity) => activity.nodeId === node.id && activity.action === 'Comentário').slice(0, 5).map((activity) => <blockquote key={activity.id}>{activity.detail}<time>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(activity.at))}</time></blockquote>)}</div><form className={styles.commentForm} onSubmit={(event) => { event.preventDefault(); const content = comment.trim(); if (!content) return; onAddComment(content); setComment(''); }}><textarea value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Registre uma atualização" aria-label="Novo comentário" /><button type="submit" className={styles.secondaryButton}>Comentar</button></form></section>

      <section className={styles.detailSection}><div className={styles.detailSectionTitle}><strong>Anexos</strong><span>{node.attachments}</span></div><button type="button" className={styles.secondaryButton} disabled title="Disponível após ativar a persistência segura">Adicionar anexo</button><small>O envio será habilitado na integração com o Supabase Storage.</small></section>

      <section className={styles.detailSection}><strong>Histórico recente</strong><div className={styles.activityList}>{project.activities.filter((activity) => !activity.nodeId || activity.nodeId === node.id).slice(0, 6).map((activity) => <div key={activity.id}><i /><span><strong>{activity.action}</strong><small>{activity.detail}</small></span><time>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(activity.at))}</time></div>)}{!project.activities.length && <p>Nenhuma alteração registrada nesta demonstração.</p>}</div></section>
    </fieldset>
    {!readOnly && <footer className={styles.detailsFooter}><button type="button" className={styles.primaryButton} onClick={() => onUpdate({ status: node.status === 'concluido' ? 'em_andamento' : 'concluido', progress: node.status === 'concluido' ? node.progress : 100 })}><Icon name="check" size={17} />{node.status === 'concluido' ? 'Reabrir tarefa' : 'Marcar como concluída'}</button></footer>}
  </aside>;
}

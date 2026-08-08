'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { connectionPath, visibleNodeIds } from '../domain/project';
import type { ConnectionType, MapDirection, Person, Project, ProjectNode } from '../types';
import styles from '../projetos.module.css';
import { Icon } from './Icon';
import { ProjectNodeCard } from './ProjectNodeCard';

type Viewport = { x: number; y: number; scale: number };
type ConnectDraft = { sourceId: string; type: ConnectionType; reconnectEdgeId?: string } | null;

const WORLD_WIDTH = 5200;
const WORLD_HEIGHT = 3600;

function isCanvasInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(
    'button, input, select, textarea, label, [role="button"], [role="toolbar"], [data-canvas-overlay="true"]',
  ));
}

export function MapCanvas({
  project, people, selectedIds, selectedEdgeId, direction, searchHighlight,
  onSelectionChange, onEdgeSelect, onMoveNode, onRenameNode, onCreateChild, onCreateSibling,
  onUpdateColor, onDuplicate, onOpenDetails, onToggleCollapse, onDelete, onConnect, onReconnect, onDeleteConnection, onMessage, readOnly = false,
}: {
  project: Project;
  people: Person[];
  selectedIds: Set<string>;
  selectedEdgeId: string | null;
  direction: MapDirection;
  searchHighlight: string | null;
  onSelectionChange: (ids: Set<string>) => void;
  onEdgeSelect: (id: string | null) => void;
  onMoveNode: (id: string, position: { x: number; y: number }) => void;
  onRenameNode: (id: string, title: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onCreateChild: (id: string) => void;
  onCreateSibling: (id: string) => void;
  onDuplicate: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onDelete: (id: string) => void;
  onConnect: (sourceId: string, targetId: string, type: ConnectionType) => void;
  onReconnect: (edgeId: string, targetId: string) => void;
  onDeleteConnection: (edgeId: string) => void;
  onMessage: (message: string) => void;
  readOnly?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 48, y: 42, scale: 0.9 });
  const [pan, setPan] = useState<{ pointerId: number; x: number; y: number; origin: Viewport } | null>(null);
  const [drag, setDrag] = useState<{ pointerId: number; nodeId: string; x: number; y: number; origin: { x: number; y: number } } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [connectDraft, setConnectDraft] = useState<ConnectDraft>(null);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const visible = useMemo(() => visibleNodeIds(project.nodes), [project.nodes]);
  const nodes = useMemo(() => project.nodes.filter((node) => visible.has(node.id)).map((node) => dragPosition?.nodeId === node.id ? { ...node, position: { x: dragPosition.x, y: dragPosition.y } } : node), [project.nodes, visible, dragPosition]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const selectedNode = selectedIds.size === 1 ? project.nodes.find((node) => selectedIds.has(node.id)) ?? null : null;

  const zoomAt = useCallback((nextScale: number, clientX?: number, clientY?: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setViewport((current) => {
      const scale = Math.max(0.25, Math.min(2.2, nextScale));
      const px = (clientX ?? rect.left + rect.width / 2) - rect.left;
      const py = (clientY ?? rect.top + rect.height / 2) - rect.top;
      const worldX = (px - current.x) / current.scale;
      const worldY = (py - current.y) / current.scale;
      return { scale, x: px - worldX * scale, y: py - worldY * scale };
    });
  }, []);

  const fitView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !nodes.length) return;
    const minX = Math.min(...nodes.map((node) => node.position.x));
    const minY = Math.min(...nodes.map((node) => node.position.y));
    const maxX = Math.max(...nodes.map((node) => node.position.x + 224));
    const maxY = Math.max(...nodes.map((node) => node.position.y + 112));
    const scale = Math.max(0.25, Math.min(1.25, Math.min((rect.width - 96) / (maxX - minX || 1), (rect.height - 96) / (maxY - minY || 1))));
    setViewport({ scale, x: (rect.width - (maxX - minX) * scale) / 2 - minX * scale, y: (rect.height - (maxY - minY) * scale) / 2 - minY * scale });
  }, [nodes]);

  const centerNode = useCallback((node: ProjectNode) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setViewport((current) => ({ ...current, x: rect.width / 2 - (node.position.x + 112) * current.scale, y: rect.height / 2 - (node.position.y + 56) * current.scale }));
  }, []);

  useEffect(() => { if (searchHighlight) { const node = project.nodes.find((item) => item.id === searchHighlight); if (node) centerNode(node); } }, [searchHighlight, project.nodes, centerNode]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (pan && event.pointerId === pan.pointerId) setViewport({ ...pan.origin, x: pan.origin.x + event.clientX - pan.x, y: pan.origin.y + event.clientY - pan.y });
      if (drag && event.pointerId === drag.pointerId) setDragPosition({ nodeId: drag.nodeId, x: drag.origin.x + (event.clientX - drag.x) / viewport.scale, y: Math.max(0, drag.origin.y + (event.clientY - drag.y) / viewport.scale) });
    };
    const end = (event: PointerEvent) => {
      if (pan?.pointerId === event.pointerId) setPan(null);
      if (drag?.pointerId === event.pointerId) {
        if (dragPosition) onMoveNode(drag.nodeId, { x: Math.round(dragPosition.x), y: Math.round(dragPosition.y) });
        setDrag(null); setDragPosition(null);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
  }, [pan, drag, dragPosition, viewport.scale, onMoveNode]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('resize', close); };
  }, [contextMenu]);

  const selectNode = (event: React.MouseEvent, nodeId: string) => {
    event.stopPropagation();
    if (connectDraft) {
      if (nodeId === connectDraft.sourceId) { setConnectDraft(null); onMessage('Conexão cancelada.'); return; }
      if (connectDraft.reconnectEdgeId) onReconnect(connectDraft.reconnectEdgeId, nodeId);
      else onConnect(connectDraft.sourceId, nodeId, connectDraft.type);
      setConnectDraft(null);
      return;
    }
    const multi = event.metaKey || event.ctrlKey || event.shiftKey;
    if (!multi) onSelectionChange(new Set([nodeId]));
    else {
      const next = new Set(selectedIds);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      onSelectionChange(next);
    }
    onEdgeSelect(null);
    if (readOnly) onOpenDetails(nodeId);
  };

  const startConnect = (type: ConnectionType) => {
    if (!selectedNode) return;
    setConnectDraft({ sourceId: selectedNode.id, type });
    onMessage(type === 'hierarquica' ? 'Selecione o nó que será filho.' : 'Selecione o nó relacionado.');
  };

  const mapBounds = useMemo(() => {
    if (!nodes.length) return { minX: 0, minY: 0, width: 1, height: 1 };
    const minX = Math.min(...nodes.map((node) => node.position.x));
    const minY = Math.min(...nodes.map((node) => node.position.y));
    return { minX, minY, width: Math.max(1, Math.max(...nodes.map((node) => node.position.x + 224)) - minX), height: Math.max(1, Math.max(...nodes.map((node) => node.position.y + 112)) - minY) };
  }, [nodes]);

  return <div ref={containerRef} className={`${styles.canvas} ${pan ? styles.canvasPanning : ''}`} tabIndex={0} aria-label="Mapa visual do projeto" onWheel={(event) => { event.preventDefault(); zoomAt(viewport.scale * (event.deltaY > 0 ? 0.9 : 1.1), event.clientX, event.clientY); }} onPointerDown={(event) => {
    if (event.button !== 0 || isCanvasInteractiveTarget(event.target)) return;
    onSelectionChange(new Set());
    onEdgeSelect(null);
    setContextMenu(null);
    setPan({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin: viewport });
  }}>
    <div className={styles.canvasGrid} style={{ backgroundPosition: `${viewport.x}px ${viewport.y}px`, backgroundSize: `${24 * viewport.scale}px ${24 * viewport.scale}px` }} />
    <div className={styles.canvasWorld} style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT, transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}>
      <svg className={styles.connections} width={WORLD_WIDTH} height={WORLD_HEIGHT} aria-hidden="true">
        <defs><marker id="arrow-project" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#5b7c91" /></marker></defs>
        {project.connections.filter((edge) => visible.has(edge.sourceId) && visible.has(edge.targetId)).map((edge) => {
          const source = nodeMap.get(edge.sourceId); const target = nodeMap.get(edge.targetId);
          if (!source || !target) return null;
          const path = connectionPath(source, target, direction);
          return <g key={edge.id} className={`${styles.edge} ${edge.type === 'livre' ? styles.freeEdge : ''} ${selectedEdgeId === edge.id ? styles.selectedEdge : ''}`} onClick={(event) => { event.stopPropagation(); onEdgeSelect(edge.id); onSelectionChange(new Set()); }} role="button" tabIndex={-1}>
            <path className={styles.edgeHit} d={path} />
            <path className={styles.edgeLine} d={path} markerEnd={edge.type === 'livre' ? 'url(#arrow-project)' : undefined} />
            {edge.label && <text x={(source.position.x + target.position.x) / 2 + 112} y={(source.position.y + target.position.y) / 2 + 46}>{edge.label}</text>}
          </g>;
        })}
      </svg>
      {nodes.map((node) => <ProjectNodeCard readOnly={readOnly} key={node.id} node={node} allNodes={project.nodes} people={people} selected={selectedIds.has(node.id)} highlighted={searchHighlight === node.id} onSelect={(event) => selectNode(event, node.id)} onPointerDown={(event) => { if (readOnly || event.button !== 0 || connectDraft) return; event.stopPropagation(); onSelectionChange(new Set([node.id])); setDrag({ pointerId: event.pointerId, nodeId: node.id, x: event.clientX, y: event.clientY, origin: node.position }); }} onRename={(title) => onRenameNode(node.id, title)} onContextMenu={(event) => { event.preventDefault(); if (readOnly) return; event.stopPropagation(); onSelectionChange(new Set([node.id])); setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY }); }} />)}
    </div>

    <div className={styles.canvasControls} data-canvas-overlay="true" aria-label="Controles do mapa"><button type="button" onClick={() => zoomAt(viewport.scale * 1.15)} aria-label="Aumentar zoom"><Icon name="zoomIn" /></button><button type="button" onClick={() => zoomAt(viewport.scale / 1.15)} aria-label="Diminuir zoom"><Icon name="zoomOut" /></button><button type="button" onClick={fitView} aria-label="Ajustar projeto à tela"><Icon name="fit" /></button><span>{Math.round(viewport.scale * 100)}%</span></div>
    <div className={styles.miniMap} aria-hidden="true">{nodes.map((node) => <i key={node.id} style={{ left: `${((node.position.x - mapBounds.minX) / mapBounds.width) * 132}px`, top: `${((node.position.y - mapBounds.minY) / mapBounds.height) * 76}px`, background: node.color }} />)}</div>

    {connectDraft && <div className={styles.connectHint} role="status"><span>{connectDraft.reconnectEdgeId ? 'Reconectando ligação' : connectDraft.type === 'hierarquica' ? 'Criando relação pai e filho' : 'Criando conexão livre'}</span><button type="button" onClick={() => setConnectDraft(null)}>Cancelar</button></div>}

    {selectedNode && !readOnly && <div className={styles.nodeActionBar} role="toolbar" aria-label={`Ações de ${selectedNode.title}`}>
      <button type="button" onClick={() => onCreateChild(selectedNode.id)} title="Adicionar filho (Tab)"><Icon name="child" /><span>Filho</span></button>
      <button type="button" onClick={() => onCreateSibling(selectedNode.id)} title="Adicionar irmão (Shift+Tab)"><Icon name="sibling" /><span>Irmão</span></button>
      <button type="button" onClick={() => startConnect('hierarquica')} title="Conexão hierárquica"><Icon name="link" /><span>Filho</span></button>
      <button type="button" onClick={() => startConnect('livre')} title="Conexão livre"><Icon name="link" /><span>Relacionar</span></button>
      <label className={styles.colorAction} title="Alterar cor"><span className={styles.srOnly}>Alterar cor</span><input type="color" value={selectedNode.color} onChange={(event) => onUpdateColor(selectedNode.id, event.target.value)} /></label>
      <button type="button" onClick={() => onDuplicate(selectedNode.id)} title="Duplicar"><Icon name="copy" /><span>Duplicar</span></button>
      <button type="button" onClick={() => onOpenDetails(selectedNode.id)} title="Abrir detalhes"><Icon name="chevron" /><span>Detalhes</span></button>
      {project.nodes.some((node) => node.parentId === selectedNode.id) && <button type="button" onClick={() => onToggleCollapse(selectedNode.id)} title={selectedNode.collapsed ? 'Expandir ramificação' : 'Recolher ramificação'}><span>{selectedNode.collapsed ? '⊞' : '⊟'}</span><span>{selectedNode.collapsed ? 'Expandir' : 'Recolher'}</span></button>}
      <button type="button" className={styles.destructiveAction} onClick={() => onDelete(selectedNode.id)} title="Excluir"><Icon name="trash" /><span>Excluir</span></button>
    </div>}

    {selectedEdgeId && !readOnly && <div className={styles.edgeActionBar} data-canvas-overlay="true"><span>{project.connections.find((edge) => edge.id === selectedEdgeId)?.type === 'livre' ? 'Conexão livre' : 'Conexão hierárquica'}</span><button type="button" onClick={() => { const edge = project.connections.find((item) => item.id === selectedEdgeId); if (edge) setConnectDraft({ sourceId: edge.sourceId, type: edge.type, reconnectEdgeId: edge.id }); }}>Reconectar destino</button>{project.connections.find((edge) => edge.id === selectedEdgeId)?.type === 'livre' && <button type="button" className={styles.destructiveAction} onClick={() => onDeleteConnection(selectedEdgeId)}>Remover relação</button>}</div>}

    {contextMenu && !readOnly && <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} onPointerDown={(event) => event.stopPropagation()}><button type="button" onClick={() => { onCreateChild(contextMenu.nodeId); setContextMenu(null); }}>Adicionar filho</button><button type="button" onClick={() => { onCreateSibling(contextMenu.nodeId); setContextMenu(null); }}>Adicionar irmão</button><button type="button" onClick={() => { onOpenDetails(contextMenu.nodeId); setContextMenu(null); }}>Abrir detalhes</button><button type="button" onClick={() => { onDuplicate(contextMenu.nodeId); setContextMenu(null); }}>Duplicar</button><button type="button" className={styles.menuDanger} onClick={() => { onDelete(contextMenu.nodeId); setContextMenu(null); }}>Excluir</button></div>}
  </div>;
}

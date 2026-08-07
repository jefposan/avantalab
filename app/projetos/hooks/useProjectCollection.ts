'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectRepository } from '../services/repository';
import { PROJECT_FILE_VERSION, type ProjectCollection, type SaveState } from '../types';

const MAX_HISTORY = 60;
function emptyCollection(companyId: string): ProjectCollection {
  return { version: PROJECT_FILE_VERSION, companyId, people: [], projects: [] };
}

export function useProjectCollection(companyId: string, repository: ProjectRepository, canEdit: boolean) {
  const [collection, setCollectionState] = useState<ProjectCollection>(() => emptyCollection(companyId));
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState('');
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });
  const historyRef = useRef<ProjectCollection[]>([]);
  const futureRef = useRef<ProjectCollection[]>([]);
  const collectionRef = useRef(collection);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { collectionRef.current = collection; }, [collection]);

  useEffect(() => {
    let active = true;
    repository.load(companyId)
      .then((saved) => {
        if (!active) return;
        const next = saved ?? emptyCollection(companyId);
        collectionRef.current = next;
        setCollectionState(next);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os projetos.'))
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [companyId, repository]);

  useEffect(() => {
    if (!loaded || !canEdit) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const stateTimer = setTimeout(() => setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saving'), 0);
    saveTimerRef.current = setTimeout(() => {
      repository.save(collection)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 650);
    return () => { clearTimeout(stateTimer); if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [canEdit, collection, loaded, repository]);

  useEffect(() => {
    const online = () => setSaveState('saved');
    const offline = () => setSaveState('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  const setCollection = useCallback((update: ProjectCollection | ((current: ProjectCollection) => ProjectCollection), record = true) => {
    const current = collectionRef.current;
    const next = typeof update === 'function' ? update(current) : update;
    if (next === current) return;
    if (record) {
      historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), structuredClone(current)];
      futureRef.current = [];
    }
    collectionRef.current = next;
    setCollectionState(next);
    setHistoryCounts({ undo: historyRef.current.length, redo: futureRef.current.length });
  }, []);

  const undo = useCallback(() => {
    const previous = historyRef.current.pop();
    if (!previous) return false;
    futureRef.current.push(structuredClone(collectionRef.current));
    collectionRef.current = previous;
    setCollectionState(previous);
    setHistoryCounts({ undo: historyRef.current.length, redo: futureRef.current.length });
    return true;
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return false;
    historyRef.current.push(structuredClone(collectionRef.current));
    collectionRef.current = next;
    setCollectionState(next);
    setHistoryCounts({ undo: historyRef.current.length, redo: futureRef.current.length });
    return true;
  }, []);

  return {
    collection,
    setCollection,
    loaded,
    saveState,
    message,
    setMessage,
    undo,
    redo,
    canUndo: canEdit && historyCounts.undo > 0,
    canRedo: canEdit && historyCounts.redo > 0,
  };
}

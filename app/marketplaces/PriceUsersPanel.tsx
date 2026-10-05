'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import styles from './marketplaces.module.css';

type PriceUser = { id: string; user_id: string; nome: string; login: string; ativo: boolean; created_at: string; updated_at: string };
type Draft = { nome: string; login: string; senha: string };
const emptyDraft: Draft = { nome: '', login: '', senha: '' };

export default function PriceUsersPanel({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const [users, setUsers] = useState<PriceUser[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<PriceUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');

  const api = useCallback(async (options?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    const response = await fetch(`/api/modulos/marketplaces/precos/usuarios${options?.method ? '' : `?empresaId=${encodeURIComponent(companyId)}`}`, {
      ...options,
      cache: 'no-store',
      headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Não foi possível concluir.');
    return body;
  }, [companyId]);

  const load = useCallback(async () => {
    setLoading(true); setMessage('');
    try { const body = await api(); setUsers(Array.isArray(body.users) ? body.users : []); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os usuários.'); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => {
    const quadro = window.requestAnimationFrame(() => { void load(); });
    return () => window.cancelAnimationFrame(quadro);
  }, [load]);

  function startEdit(user: PriceUser) {
    setEditing(user); setDraft({ nome: user.nome, login: user.login, senha: '' }); setMessage(''); setConfirmDelete('');
  }

  function cancelEdit() {
    setEditing(null); setDraft(emptyDraft); setMessage(''); setConfirmDelete('');
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      await api({ method: editing ? 'PATCH' : 'POST', body: JSON.stringify({ empresaId: companyId, ...(editing ? { id: editing.id } : {}), ...draft }) });
      setMessage(editing ? 'Usuário atualizado.' : 'Usuário criado.'); setEditing(null); setDraft(emptyDraft); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  }

  async function remove(user: PriceUser) {
    if (confirmDelete !== user.id) { setConfirmDelete(user.id); setMessage('Clique novamente em Excluir para confirmar.'); return; }
    setSaving(true); setMessage('');
    try { await api({ method: 'DELETE', body: JSON.stringify({ empresaId: companyId, id: user.id }) }); setConfirmDelete(''); if (editing?.id === user.id) cancelEdit(); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível excluir.'); }
    finally { setSaving(false); }
  }

  return <div className={styles.userModalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={styles.userModal} role="dialog" aria-modal="true" aria-labelledby="price-users-title">
      <header className={styles.userModalHeader}><div><p className={styles.eyebrow}>AvantaPreços</p><h2 id="price-users-title">Usuários da consulta</h2></div><button type="button" className={styles.iconAction} onClick={onClose} aria-label="Fechar">×</button></header>
      <form className={styles.userForm} onSubmit={save}>
        <label>Nome<input value={draft.nome} onChange={(event) => setDraft((value) => ({ ...value, nome: event.target.value }))} autoComplete="off" placeholder="Nome do usuário" /></label>
        <label>Login<input value={draft.login} onChange={(event) => setDraft((value) => ({ ...value, login: event.target.value.toLowerCase() }))} autoCapitalize="none" autoComplete="off" placeholder="Ex.: consultaloja" /></label>
        <label>Senha<input type="password" value={draft.senha} onChange={(event) => setDraft((value) => ({ ...value, senha: event.target.value }))} autoComplete="new-password" placeholder={editing ? 'Deixe vazio para manter' : 'Mínimo de 8 caracteres'} /></label>
        <div className={styles.userFormActions}><button className={styles.primary} type="submit" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Incluir usuário'}</button>{editing && <button type="button" onClick={cancelEdit}>Cancelar</button>}</div>
      </form>
      {message && <p className={styles.userMessage} role="status">{message}</p>}
      <div className={styles.userList} aria-label="Usuários cadastrados">
        {loading ? <p>Carregando usuários…</p> : users.length ? users.map((user) => <article key={user.id}><div><strong>{user.nome}</strong><span>Login: {user.login}</span></div><div><button type="button" onClick={() => startEdit(user)}>Editar</button><button type="button" className={confirmDelete === user.id ? styles.deleteConfirm : ''} disabled={saving} onClick={() => void remove(user)}>{confirmDelete === user.id ? 'Confirmar exclusão' : 'Excluir'}</button></div></article>) : <p>Nenhum usuário cadastrado.</p>}
      </div>
    </section>
  </div>;
}

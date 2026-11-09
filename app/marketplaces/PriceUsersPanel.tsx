'use client';

import { type CSSProperties, FormEvent, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import { corTextoSobreFundo } from '@/app/lib/cores-avanta';
import PriceCalculationSettings from './PriceCalculationSettings';
import type { PriceSettings } from '@/app/modules/marketplaces/price-settings';
import type { PriceSettingsRequest } from './usePriceSettings';
import styles from './marketplaces.module.css';

type PriceUser = { id: string; user_id: string; nome: string; login: string; ativo: boolean; can_edit_stock?: boolean; can_register_sales?: boolean; created_at: string; updated_at: string };
type Draft = { nome: string; login: string; senha: string; can_edit_stock: boolean; can_register_sales: boolean };
const emptyDraft: Draft = { nome: '', login: '', senha: '', can_edit_stock: false, can_register_sales: false };

export default function PriceUsersPanel({ companyId, onClose, settings, settingsError, onSettingsSaved, onReloadSettings, dark = false, brand = '#003E73', request }: { companyId: string; onClose: () => void; settings: PriceSettings | null; settingsError: string; onSettingsSaved: (settings: PriceSettings) => void; onReloadSettings: () => void; dark?: boolean; brand?: string; request?: PriceSettingsRequest }) {
  const [users, setUsers] = useState<PriceUser[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<PriceUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const userEditDirty = Boolean(editing && (draft.nome !== editing.nome || draft.login !== editing.login || draft.senha || draft.can_edit_stock !== (editing.can_edit_stock === true) || draft.can_register_sales !== (editing.can_register_sales === true)));
  const settingsRequest = useCallback(async (path: string, options?: RequestInit) => {
    if (request) return request(path, options);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    const response = await fetch(path, { ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Não foi possível salvar as configurações.');
    return body;
  }, [request]);

  const api = useCallback(async (options?: RequestInit) => {
    const path = `/api/modulos/marketplaces/precos/usuarios${options?.method ? '' : `?empresaId=${encodeURIComponent(companyId)}`}`;
    if (request) return request(path, options);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    const response = await fetch(path, {
      ...options,
      cache: 'no-store',
      headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Não foi possível concluir.');
    return body;
  }, [companyId, request]);

  const load = useCallback(async () => {
    setLoading(true); setMessage('');
    try { const body = await api(); const items = Array.isArray(body.users) ? body.users : []; setUsers(items); setUserPage(page => Math.min(page, Math.max(1, items.length))); return true; }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os usuários.'); return false; }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => {
    const quadro = window.requestAnimationFrame(() => { void load(); });
    return () => window.cancelAnimationFrame(quadro);
  }, [load]);

  function startEdit(user: PriceUser) {
    setEditing(user); setDraft({ nome: user.nome, login: user.login, senha: '', can_edit_stock: user.can_edit_stock === true, can_register_sales: user.can_register_sales === true }); setMessage(''); setConfirmDelete('');
  }

  function cancelEdit() {
    setEditing(null); setDraft(emptyDraft); setMessage(''); setConfirmDelete('');
  }

  async function save(event: FormEvent) {
    event.preventDefault(); if (saving) return; setSaving(true); setMessage('');
    const target = editing;
    const submitted = { ...draft };
    try {
      const result = await api({ method: target ? 'PATCH' : 'POST', body: JSON.stringify({ empresaId: companyId, ...(target ? { id: target.id } : {}), ...submitted }) });
      if (target && result.user?.id !== target.id) throw new Error('Não foi possível confirmar o usuário atualizado. Reabra as configurações para conferir antes de salvar novamente.');
      if (target) {
        setUsers(current => current.map(user => user.id === target.id ? result.user : user));
        setEditing(result.user); setDraft({ nome: result.user.nome, login: result.user.login, senha: '', can_edit_stock: result.user.can_edit_stock === true, can_register_sales: result.user.can_register_sales === true });
      } else { setEditing(null); setDraft(emptyDraft); await load(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  }

  async function remove(user: PriceUser) {
    if (saving) return;
    if (confirmDelete !== user.id) { setConfirmDelete(user.id); setMessage('Excluir remove somente o acesso. Produtos, estoque, consultas e lotes permanecem neste perfil. Clique em Confirmar exclusão.'); return; }
    setSaving(true); setMessage('');
    try { const result = await api({ method: 'DELETE', body: JSON.stringify({ empresaId: companyId, id: user.id }) }); setConfirmDelete(''); if (editing?.id === user.id) cancelEdit(); const loaded = await load(); setMessage(loaded ? result.message || 'Acesso excluído. Os dados permanecem no perfil.' : 'Acesso excluído. Os dados permanecem no perfil; reabra as configurações para atualizar a lista.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível excluir.'); }
    finally { setSaving(false); }
  }

  function changeUserPage(delta: number) {
    if (saving || loading || userEditDirty) return;
    cancelEdit(); setUserPage(page => page + delta);
  }

  return <CardExpandidoModal aberto rotulo="Configurações do AvantaPreços" onFechar={onClose}><div className={`${styles.settingsModalScope} ${dark ? styles.dark : ''}`} style={{ '--brand': brand, '--av-action-on-brand': corTextoSobreFundo(brand) } as CSSProperties}>
    <section className={styles.userModal}>
      <header className={styles.userModalHeader}><h2 id="price-users-title">Configurações</h2><BotaoAcaoCompacto variante="discreto" somenteIcone onClick={onClose} aria-label="Fechar configurações"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></BotaoAcaoCompacto></header>
      {settings ? <PriceCalculationSettings key={`${companyId}:${settings.revision}`} companyId={companyId} settings={settings} request={settingsRequest} onReload={onReloadSettings} onSaved={value => { onSettingsSaved(value); setMessage('Configurações salvas.'); }} /> : <div role={settingsError ? 'alert' : 'status'}>{settingsError || 'Carregando configurações…'}{settingsError && <BotaoAcaoCompacto onClick={onReloadSettings}>Tentar novamente</BotaoAcaoCompacto>}</div>}
      <section className={styles.priceUsersSector} aria-labelledby="price-users-section-title">
      <div className={styles.priceUsersHeading}><h3 id="price-users-section-title">Usuários da consulta <span>{users.length}</span></h3>{users.length > 1 && <nav aria-label="Páginas dos usuários" className={styles.priceUsersPagination}><BotaoAcaoCompacto somenteIcone aria-label="Usuário anterior" disabled={saving || loading || userEditDirty || userPage <= 1} onClick={() => changeUserPage(-1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg></BotaoAcaoCompacto><span role="status">{userPage} de {users.length}</span><BotaoAcaoCompacto somenteIcone aria-label="Próximo usuário" disabled={saving || loading || userEditDirty || userPage >= users.length} onClick={() => changeUserPage(1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></BotaoAcaoCompacto></nav>}</div>
      <p id="price-user-edit-scope" className={styles.help}>{editing ? `Editando somente: ${editing.nome} (${editing.login})` : 'Novo usuário — as opções abaixo pertencem somente ao novo acesso.'}</p>
      <form key={editing?.id || 'new-user'} className={styles.userForm} onSubmit={save} aria-describedby="price-user-edit-scope" aria-label={editing ? 'Editar usuário da consulta' : 'Criar usuário da consulta'}>
        <label>Nome<input disabled={saving} value={draft.nome} onChange={(event) => setDraft((value) => ({ ...value, nome: event.target.value }))} autoComplete="off" placeholder="Nome do usuário" /></label>
        <label>Login<input disabled={saving} value={draft.login} onChange={(event) => setDraft((value) => ({ ...value, login: event.target.value.toLowerCase() }))} autoCapitalize="none" autoComplete="off" placeholder="Ex.: consultaloja" /></label>
        <label>Senha<input disabled={saving} type="password" value={draft.senha} onChange={(event) => setDraft((value) => ({ ...value, senha: event.target.value }))} autoComplete="new-password" placeholder="****" /></label>
        <label className={styles.stockPermission}><input type="checkbox" disabled={saving} checked={draft.can_edit_stock} onChange={event => { const checked = event.target.checked; setDraft(value => ({ ...value, can_edit_stock: checked })); }} />Editar estoque</label>
        <label className={styles.stockPermission}><input type="checkbox" disabled={saving} checked={draft.can_register_sales} onChange={event => { const checked = event.target.checked; setDraft(value => ({ ...value, can_register_sales: checked })); }} />Registrar vendas</label>
        <div className={styles.userFormActions}>{editing && <BotaoAcaoCompacto disabled={saving} onClick={cancelEdit}>Cancelar</BotaoAcaoCompacto>}<BotaoAcaoCompacto variante="primario" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</BotaoAcaoCompacto></div>
      </form>
      {message && <p className={styles.userMessage} role="status">{message}</p>}
      <div className={styles.userList} aria-label="Usuários cadastrados">
        {loading ? <p>Carregando usuários…</p> : users.length ? users.slice(userPage - 1, userPage).map((user) => <article key={user.id} aria-label={`Usuário ${user.nome}, login ${user.login}`}><div><strong title={user.nome}>{user.nome}</strong><span title={user.login}>Login: {user.login}</span><span>Editar estoque: {user.can_edit_stock === true ? 'Permitido' : 'Não permitido'}</span><span>Registrar vendas: {user.can_register_sales === true ? 'Permitido' : 'Não permitido'}</span></div><div><BotaoAcaoCompacto disabled={saving} onClick={() => startEdit(user)}>Editar</BotaoAcaoCompacto><BotaoAcaoCompacto variante="destrutivo" data-confirming={confirmDelete === user.id || undefined} disabled={saving} onClick={() => void remove(user)}>{confirmDelete === user.id ? 'Confirmar exclusão' : 'Excluir'}</BotaoAcaoCompacto></div></article>) : <p>Nenhum usuário cadastrado.</p>}
      </div>
      </section>
    </section>
  </div></CardExpandidoModal>;
}

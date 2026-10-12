'use client';

import { useEffect, useRef, useState } from 'react';
import { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import { ACCOUNT_LABEL_LIMIT, validateAccountLabel } from './account-identification';
import styles from './marketplaces.module.css';

export type AccountLabelResult = { connectionId: string; local_label: string; local_label_updated_at: string };

export default function AccountIdentification({ companyId, account, canEdit, available, onSaved, onCancel }: { companyId: string; account: MarketplaceAccount; canEdit: boolean; available: boolean; onSaved: (result: AccountLabelResult) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const value = draft ?? account?.local_label ?? '';
  const disabled = !account || !canEdit || !available;

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
    input.current?.closest('form')?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, []);

  async function save() {
    if (!account || disabled || pending.current) return;
    let label: string;
    try { label = validateAccountLabel(value); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Confira a identificação.'); return; }
    if (label === (account.local_label ?? '')) { onCancel(); return; }
    pending.current = true; setSaving(true); setNotice('');
    try {
      const result = await marketplaceClientRequest('conexoes/identificacao', { empresaId: companyId, connectionId: account.id, local_label: label }, AbortSignal.timeout(15_000), 'PATCH') as AccountLabelResult;
      onSaved(result);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.'); }
    finally { pending.current = false; setSaving(false); }
  }

  return <form className={styles.accountIdentificationEditor} aria-label={`Editar identificação de ${account.seller_name || account.seller_reference}`} onSubmit={event => { event.preventDefault(); void save(); }} onKeyDown={event => { if (event.key === 'Escape' && !pending.current) { event.preventDefault(); onCancel(); } }}>
    <label className={styles.accountIdentification}>Identificação da conta
      <input ref={input} type="text" aria-label="Identificação da conta" value={value} maxLength={ACCOUNT_LABEL_LIMIT} disabled={disabled || saving} placeholder="Ex.: Loja Centro ou 01" autoComplete="off" aria-describedby={`account-identification-status-${account.id}`} onChange={event => { setDraft(event.target.value); setNotice(''); }} />
    </label>
    <div className={styles.accountIdentificationActions}>
      <button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton}`} disabled={saving} onClick={onCancel}>Cancelar</button>
      <button type="submit" className={`${styles.renewalAction} ${styles.compactConnectionButton} ${styles.renewalPrimary}`} disabled={disabled || saving}>{saving ? 'Salvando…' : 'Salvar identificação'}</button>
    </div>
    <small id={`account-identification-status-${account.id}`} role="status">{!available ? 'Identificação temporariamente indisponível.' : notice}</small>
  </form>;
}

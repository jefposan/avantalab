'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './marketplaces.module.css';

export type AccountOption = { id: string; name: string; detail: string };

export default function MarketplaceAccountPicker({ label, value, options, placeholder, disabled = false, onChange }: { label: string; value: string; options: AccountOption[]; placeholder: string; disabled?: boolean; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const labelId = `${listId}-label`;
  const valueId = `${listId}-value`;
  const selected = options.find((option) => option.id === value);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [open]);

  function moveFocus(event: React.KeyboardEvent, direction: number) {
    const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || []);
    if (!items.length) return;
    event.preventDefault();
    if (!open) { setOpen(true); requestAnimationFrame(() => { const buttons = root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]'); buttons?.[direction < 0 ? buttons.length - 1 : 0]?.focus(); }); return; }
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(index + direction + items.length) % items.length].focus();
  }

  return <div ref={root} className={styles.accountPicker}>
    <span id={labelId} className={styles.accountPickerLabel}>{label}</span>
    <button ref={trigger} type="button" className={styles.accountPickerTrigger} aria-labelledby={`${labelId} ${valueId}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} disabled={disabled || !options.length} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === 'ArrowDown') moveFocus(event, 1); if (event.key === 'ArrowUp') moveFocus(event, -1); }}>
      <span id={valueId}>{selected ? `${selected.name} · ${selected.detail}` : placeholder}</span><span aria-hidden="true">▾</span>
    </button>
    {open && <div id={listId} className={styles.accountPickerList} role="listbox" aria-labelledby={labelId} onKeyDown={(event) => { if (event.key === 'ArrowDown') moveFocus(event, 1); if (event.key === 'ArrowUp') moveFocus(event, -1); }}>
      {options.map((option) => <button key={option.id} type="button" role="option" aria-selected={option.id === value} onClick={() => { onChange(option.id); setOpen(false); trigger.current?.focus(); }}><span>{option.name}</span><small>{option.detail}</small></button>)}
    </div>}
  </div>;
}

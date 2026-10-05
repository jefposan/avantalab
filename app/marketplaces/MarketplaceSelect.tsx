'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './marketplaces.module.css';

export type MarketplaceSelectOption = { value: string; label: string; detail?: string };

type Props = {
  id?: string;
  label: string;
  value: string;
  options: MarketplaceSelectOption[];
  placeholder: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  onChange: (value: string) => void;
};

export default function MarketplaceSelect({ id, label, value, options, placeholder, disabled = false, error, className = '', onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const controlId = id || `${generatedId}-control`;
  const listId = `${generatedId}-listbox`;
  const labelId = `${generatedId}-label`;
  const valueId = `${generatedId}-value`;
  const errorId = `${generatedId}-error`;
  const selected = options.find((option) => option.value === value);
  const visibleOpen = open && !disabled;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function focusOption(position: 'first' | 'last' | 'next' | 'previous') {
    const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || []);
    if (!items.length) return;
    if (position === 'first' || position === 'last') {
      items[position === 'first' ? 0 : items.length - 1]?.focus();
      return;
    }
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const direction = position === 'next' ? 1 : -1;
    items[(current + direction + items.length) % items.length]?.focus();
  }

  function openAndFocus(position: 'first' | 'last') {
    setOpen(true);
    requestAnimationFrame(() => focusOption(position));
  }

  return <div ref={root} className={`${styles.selectField} ${className}`.trim()}>
    <span id={labelId} className={styles.selectLabel}>{label}</span>
    <div className={styles.selectControl}>
      <button
        ref={trigger}
        id={controlId}
        type="button"
        className={styles.selectTrigger}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-describedby={error ? errorId : undefined}
        data-invalid={error ? 'true' : undefined}
        aria-haspopup="listbox"
        aria-expanded={visibleOpen}
        aria-controls={listId}
        disabled={disabled || !options.length}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); if (visibleOpen) focusOption('next'); else openAndFocus('first'); }
          if (event.key === 'ArrowUp') { event.preventDefault(); if (visibleOpen) focusOption('previous'); else openAndFocus('last'); }
          if (event.key === 'Home' && visibleOpen) { event.preventDefault(); focusOption('first'); }
          if (event.key === 'End' && visibleOpen) { event.preventDefault(); focusOption('last'); }
        }}
      >
        <span id={valueId}>{selected ? `${selected.label}${selected.detail ? ` · ${selected.detail}` : ''}` : placeholder}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {visibleOpen && <div
        id={listId}
        className={styles.selectList}
        role="listbox"
        aria-labelledby={labelId}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); focusOption('next'); }
          if (event.key === 'ArrowUp') { event.preventDefault(); focusOption('previous'); }
          if (event.key === 'Home') { event.preventDefault(); focusOption('first'); }
          if (event.key === 'End') { event.preventDefault(); focusOption('last'); }
          if (event.key === 'Tab') setOpen(false);
        }}
      >
        {options.map((option) => <button
          key={option.value || '__empty'}
          type="button"
          className={styles.selectOption}
          role="option"
          aria-selected={option.value === value}
          onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}
        ><span>{option.label}</span>{option.detail && <small>{option.detail}</small>}</button>)}
      </div>}
    </div>
    {error && <small id={errorId} className={styles.selectError} role="alert">{error}</small>}
  </div>;
}

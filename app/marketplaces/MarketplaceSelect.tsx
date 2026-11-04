'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import styles from './marketplaces.module.css';
import Tooltip from '@/app/components/Tooltip';

export type MarketplaceSelectOption = { value: string; label: string; detail?: string };

type BaseProps = {
  id?: string;
  label: string;
  ariaLabel?: string;
  options: MarketplaceSelectOption[];
  placeholder: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  tooltipText?: string;
  tooltipPosition?: 'top' | 'bottom';
  leadingIcon?: ReactNode;
  detailAsBadge?: boolean;
};

type Props = BaseProps & (
  | { value: string; onChange: (value: string) => void; values?: never; onValuesChange?: never }
  | { values: string[]; onValuesChange: (values: string[]) => void; value?: never; onChange?: never }
);

export default function MarketplaceSelect(props: Props) {
  const { id, label, ariaLabel, options, placeholder, disabled = false, error, className = '', tooltipText, tooltipPosition = 'top', leadingIcon, detailAsBadge = false } = props;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const controlId = id || `${generatedId}-control`;
  const listId = `${generatedId}-listbox`;
  const labelId = `${generatedId}-label`;
  const valueId = `${generatedId}-value`;
  const errorId = `${generatedId}-error`;
  const values = props.values;
  const selected = values === undefined ? options.find((option) => option.value === props.value) : undefined;
  const selectedLabels = values?.map(value => options.find(option => option.value === value)?.label).filter((value): value is string => Boolean(value));
  const visibleValue = values === undefined ? '' : !selectedLabels?.length ? placeholder : selectedLabels.length === 1 ? selectedLabels[0] : `${selectedLabels.length} marketplaces`;
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

  const button = <button
        ref={trigger}
        id={controlId}
        type="button"
        className={styles.selectTrigger}
        aria-label={!label ? ariaLabel || placeholder : undefined}
        aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
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
        <span id={valueId} className={leadingIcon || detailAsBadge ? styles.selectValueWithIcon : undefined}>{leadingIcon}{values !== undefined ? visibleValue : detailAsBadge && selected ? <><span>{selected.label}</span>{selected.detail && <small className={styles.selectCount}>{selected.detail}</small>}</> : selected ? `${selected.label}${selected.detail ? ` · ${selected.detail}` : ''}` : placeholder}</span>
        <span aria-hidden="true">▾</span>
      </button>;
  return <div ref={root} className={`${styles.selectField} ${className}`.trim()}>
    {label && <span id={labelId} className={styles.selectLabel}>{label}</span>}
    <div className={styles.selectControl}>
      {tooltipText ? <Tooltip texto={tooltipText} posicao={tooltipPosition} wrapperClassName="w-full" desativado={visibleOpen}>{button}</Tooltip> : button}
      {visibleOpen && <div
        id={listId}
        className={styles.selectList}
        role="listbox"
        aria-multiselectable={values === undefined ? undefined : true}
        aria-label={label || ariaLabel || placeholder}
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
          aria-selected={values === undefined ? option.value === props.value : option.value ? values.includes(option.value) : values.length === 0}
          onClick={() => {
            if (values !== undefined) {
              props.onValuesChange(option.value ? values.includes(option.value) ? values.filter(value => value !== option.value) : [...values, option.value] : []);
              return;
            }
            props.onChange(option.value);
            setOpen(false);
            trigger.current?.focus();
          }}
        ><span className={styles.selectOptionMain}><span>{option.label}</span>{values !== undefined && (option.value ? values.includes(option.value) : values.length === 0) && <span aria-hidden="true">✓</span>}</span>{option.detail && <small>{option.detail}</small>}</button>)}
      </div>}
    </div>
    {error && <small id={errorId} className={styles.selectError} role="alert">{error}</small>}
  </div>;
}

'use client';

import type { InputHTMLAttributes, Ref } from 'react';
import { formatarMoedaDigitada } from '@/app/lib/formatters';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> & {
  value: string;
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
};

export function posicionarCursorMoeda(input: HTMLInputElement) {
  input.setSelectionRange(input.value.length, input.value.length);
  // Safari e o commit controlado do React podem reposicionar a seleção.
  requestAnimationFrame(() => {
    if (input.isConnected && input.ownerDocument.activeElement === input) {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });
}

/** Campo monetário oficial: centavos, agrupamento pt-BR e cursor à direita. */
export default function CampoMoeda({ value, onChange, inputRef, onFocus, onClick, style, ...props }: Props) {
  return <input {...props} ref={inputRef} type="text" inputMode="numeric" autoComplete={props.autoComplete ?? 'off'}
    data-av-money="true" style={{ ...style, textAlign: 'right' }} value={formatarMoedaDigitada(value)}
    onFocus={event => { posicionarCursorMoeda(event.currentTarget); onFocus?.(event); }}
    onClick={event => { posicionarCursorMoeda(event.currentTarget); onClick?.(event); }}
    onChange={event => {
      const input = event.currentTarget;
      const formatted = formatarMoedaDigitada(input.value);
      input.value = formatted;
      onChange(formatted);
      posicionarCursorMoeda(input);
    }} />;
}

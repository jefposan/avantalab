'use client';

import type { InputHTMLAttributes, Ref } from 'react';

type CampoBuscaProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> & {
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  classNameControle?: string;
  rotuloLimpar?: string;
  inputRef?: Ref<HTMLInputElement>;
};

/** Campo oficial para pesquisas textuais do AvantaLab. */
export default function CampoBusca({
  value,
  onChange,
  className = '',
  classNameControle = '',
  rotuloLimpar = 'Limpar pesquisa',
  inputRef,
  ...inputProps
}: CampoBuscaProps) {
  return <span className={`avanta-campo-busca ${classNameControle}`.trim()}>
    <input {...inputProps} ref={inputRef} className={className} type="search" value={value} onChange={(event) => onChange(event.target.value)} />
    {value && <button type="button" className="avanta-campo-busca-limpar" onClick={() => onChange('')} aria-label={rotuloLimpar}>×</button>}
  </span>;
}

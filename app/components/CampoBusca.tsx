'use client';

import type { InputHTMLAttributes } from 'react';

type CampoBuscaProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> & {
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  classNameControle?: string;
  rotuloLimpar?: string;
};

/** Campo oficial para pesquisas textuais do AvantaLab. */
export default function CampoBusca({
  value,
  onChange,
  className = '',
  classNameControle = '',
  rotuloLimpar = 'Limpar pesquisa',
  ...inputProps
}: CampoBuscaProps) {
  return <span className={`avanta-campo-busca ${classNameControle}`.trim()}>
    <input {...inputProps} className={className} type="search" value={value} onChange={(event) => onChange(event.target.value)} />
    {value && <button type="button" className="avanta-campo-busca-limpar" onClick={() => onChange('')} aria-label={rotuloLimpar}>×</button>}
  </span>;
}

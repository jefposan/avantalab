'use client';
import { REGISTRO_MODULOS } from '@/app/lib/modulos-registro';
import { moduloPermitidoParaPapel, type LiberacoesUsuario } from '@/app/lib/acessos-usuario';

export default function AcessosUsuarioCampos({ value, onChange, perfil, disabled = false }: { value: LiberacoesUsuario; onChange: (v: LiberacoesUsuario) => void; perfil: string; disabled?: boolean }) {
  const master = perfil === 'gestor_master';
  return <fieldset disabled={disabled || master} className="grid grid-cols-1 gap-x-4 gap-y-1 rounded-xl border border-current/15 p-3 sm:grid-cols-2">
    <legend className="px-1 text-sm font-semibold">Acessos deste usuário</legend>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={master || value.dashboard} onChange={e => onChange({ ...value, dashboard: e.target.checked })} /><span>Financeiro</span></label>
    {REGISTRO_MODULOS.map(m => { const permitido = moduloPermitidoParaPapel(m.id, perfil); return <label key={m.id} className={`flex min-h-11 items-center gap-3 ${permitido ? '' : 'opacity-60'}`}><input type="checkbox" disabled={!permitido} checked={master || (permitido && value.modulos.includes(m.id))} onChange={e => onChange({ ...value, modulos: e.target.checked ? [...value.modulos, m.id] : value.modulos.filter(id => id !== m.id) })} /><span>{m.nome}{!permitido && <small className="block">Indisponível para este tipo de usuário.</small>}</span></label>; })}
    <p className="mt-2 text-xs opacity-80 sm:col-span-2">{master ? 'O Gestor Master mantém acesso ao Financeiro e aos módulos.' : 'Financeiro controla os dados e as ações financeiras deste perfil. Os demais módulos seguem as liberações abaixo e precisam estar instalados e ativos.'}</p>
  </fieldset>;
}

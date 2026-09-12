'use client';

import { useState } from 'react';
import DraggableModalCard from './DraggableModalCard';
import type { CentroCusto } from '@/app/lib/database';

type Props = {
  aberto: boolean;
  centros: CentroCusto[];
  corPrimaria: string;
  darkMode: boolean;
  salvando?: boolean;
  onFechar: () => void;
  onCriar: (nome: string) => Promise<{ ok: boolean; mensagem?: string }>;
  onAtualizar: (id: string, campos: { nome?: string; ativo?: boolean }) => Promise<boolean>;
};

export default function CentrosCustoModal({ aberto, centros, corPrimaria, darkMode, salvando = false, onFechar, onCriar, onAtualizar }: Props) {
  const [nome, setNome] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [mensagem, setMensagem] = useState('');

  if (!aberto) return null;
  const salvar = async () => {
    const resultado = await onCriar(nome);
    setMensagem(resultado.mensagem || '');
    if (resultado.ok) setNome('');
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-slate-950/60 px-4 py-6" onClick={(event) => { if (event.target === event.currentTarget) onFechar(); }}>
      <DraggableModalCard className={`flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <div data-modal-drag-handle className="flex shrink-0 cursor-grab items-center justify-between gap-4 px-5 py-4 text-white active:cursor-grabbing" style={{ backgroundColor: corPrimaria }}>
          <div><p className="text-[10px] font-black uppercase tracking-widest text-white/70">Financeiro do perfil</p><h2 className="text-base font-black">Centros de custo</h2></div>
          <button type="button" onClick={onFechar} aria-label="Fechar centros de custo" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl hover:bg-white/25">×</button>
        </div>
        <div className="space-y-5 overflow-y-auto p-5">
          <div className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
            <label htmlFor="novo-centro-custo" className={`mb-2 block text-xs font-black uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Novo centro</label>
            <div className="flex gap-2">
              <input id="novo-centro-custo" value={nome} maxLength={80} onChange={(event) => setNome(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void salvar(); }} placeholder="Ex.: Loja 01 ou 100" className={`h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm font-semibold outline-none focus:ring-2 ${darkMode ? 'border-slate-600 bg-slate-700 text-white focus:ring-slate-500' : 'border-slate-300 bg-white text-slate-800 focus:ring-slate-300'}`} />
              <button type="button" disabled={salvando || !nome.trim()} onClick={() => void salvar()} className="h-11 rounded-xl px-4 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: corPrimaria }}>{salvando ? 'Salvando…' : 'Adicionar'}</button>
            </div>
            <p className={`mt-2 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Use texto ou número. O centro escolhido será aplicado aos novos lançamentos.</p>
            {mensagem && <p role="status" className="mt-2 text-xs font-bold text-red-500">{mensagem}</p>}
          </div>
          <div className="space-y-2">
            {centros.length === 0 ? <p className={`rounded-xl px-3 py-5 text-center text-sm font-semibold ${darkMode ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>Nenhum centro cadastrado.</p> : centros.map((centro) => (
              <div key={centro.id} className={`flex items-center gap-3 rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                <div className="min-w-0 flex-1">
                  {editando === centro.id ? <input autoFocus value={nomeEdicao} maxLength={80} onChange={(event) => setNomeEdicao(event.target.value)} className={`h-9 w-full rounded-lg border px-2 text-sm font-bold ${darkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-800'}`} /> : <p className={`truncate text-sm font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{centro.nome}</p>}
                  <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-wide ${centro.ativo ? 'text-emerald-600' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{centro.is_principal ? 'Principal · sempre ativo' : centro.ativo ? 'Ativo' : 'Pausado'}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {centro.is_principal ? null : editando === centro.id ? <><button type="button" onClick={() => void onAtualizar(centro.id, { nome: nomeEdicao.trim() }).then((ok) => { if (ok) setEditando(null); })} className="h-9 rounded-lg px-2 text-[10px] font-black uppercase text-white" style={{ backgroundColor: corPrimaria }}>Salvar</button><button type="button" onClick={() => setEditando(null)} className={`h-9 rounded-lg border px-2 text-[10px] font-black uppercase ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600'}`}>Cancelar</button></> : <><button type="button" onClick={() => { setEditando(centro.id); setNomeEdicao(centro.nome); }} className={`h-9 rounded-lg border px-2 text-[10px] font-black uppercase ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600'}`}>Editar</button><button type="button" onClick={() => void onAtualizar(centro.id, { ativo: !centro.ativo })} className={`h-9 rounded-lg px-2 text-[10px] font-black uppercase ${centro.ativo ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{centro.ativo ? 'Pausar' : 'Ativar'}</button></>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DraggableModalCard>
    </div>
  );
}

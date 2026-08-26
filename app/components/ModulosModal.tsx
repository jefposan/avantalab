'use client';
import React from 'react';
import DraggableModalCard from './DraggableModalCard';
import type { AcessoComercialModulo } from '@/app/lib/modulos-acesso-comercial';

export type Modulo = {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  perfis: string[];
  precoMensal?: number;
};

interface ModulosModalProps {
  aberto: boolean;
  onFechar: () => void;
  modulos: Modulo[]; // já filtrados pelo tipo de perfil
  ativos: string[];
  carregando: boolean;
  erro: string | null;
  onTentarNovamente: () => void;
  acaoEmId: string | null; // módulo em processamento (instalando/removendo)
  onInstalar: (id: string) => void;
  onDesinstalar: (id: string) => void;
  darkMode: boolean;
  corPrimaria: string;
  acessoComercial: AcessoComercialModulo;
  podeGerenciar: boolean;
  cancelamentos: Record<string, string>;
}

function iconeModulo(icone: string): string {
  const mapa: Record<string, string> = {
    relogio: '🕐',
    vendas: '🛒',
    recebimentos: '💵',
    crm: '👥',
    custos: '🧮',
    projetos: '◇',
  };
  return mapa[icone] || '▣';
}

export default function ModulosModal({
  aberto,
  onFechar,
  modulos,
  ativos,
  carregando,
  erro,
  onTentarNovamente,
  acaoEmId,
  onInstalar,
  onDesinstalar,
  darkMode,
  corPrimaria,
  acessoComercial,
  podeGerenciar,
  cancelamentos,
}: ModulosModalProps) {
  if (!aberto) return null;

  const card = darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const itemBorda = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />

      <DraggableModalCard className={`relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${card}`}>
        {/* Header */}
        <div data-modal-drag-handle className="flex cursor-grab items-start justify-between gap-3 px-5 py-4 text-white active:cursor-grabbing" style={{ background: 'linear-gradient(135deg, #020617, #003E73)' }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.65)' }}>AvantaLab</p>
            <h2 className="mt-0.5 text-lg font-black leading-tight text-white">Módulos</h2>
            <p className="mt-0.5 text-xs font-semibold text-cyan-50/80">Adicione recursos ao seu perfil financeiro.</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-black text-white transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Fechar"
          >×</button>
        </div>

        {/* Catálogo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          {carregando && modulos.length === 0 ? (
            <p className={`py-8 text-center text-sm font-semibold ${textMuted}`}>Carregando módulos...</p>
          ) : erro ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center" role="alert">
              <p className={`max-w-sm text-sm font-semibold ${textMuted}`}>{erro}</p>
              <button
                type="button"
                onClick={onTentarNovamente}
                className="rounded-xl px-4 py-2 text-xs font-black text-white shadow transition hover:brightness-110"
                style={{ backgroundColor: corPrimaria }}
              >Tentar novamente</button>
            </div>
          ) : modulos.length === 0 ? (
            <p className={`py-8 text-center text-sm font-semibold ${textMuted}`}>Nenhum módulo disponível para este perfil.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {modulos.map((m) => {
                const instalado = ativos.includes(m.id);
                const processando = acaoEmId === m.id;
                const cancelamentoEm = cancelamentos[m.id];
                const business = acessoComercial === 'business';
                const businessPro = acessoComercial === 'business_pro';
                const cortesia = acessoComercial === 'cortesia';
                const liberado = acessoComercial === 'liberado';
                const disponivelNoPlano = Boolean(acessoComercial);
                const preco = (m.precoMensal ?? 14.9).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                return (
                  <article
                    key={m.id}
                    className={`flex aspect-square min-h-0 min-w-0 flex-col rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${itemBorda}`}
                    style={{
                      backgroundColor: darkMode
                        ? `color-mix(in srgb, ${corPrimaria} 7%, #0f172a)`
                        : `color-mix(in srgb, ${corPrimaria} 4%, #ffffff)`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${corPrimaria} 14%, ${darkMode ? '#0f172a' : '#ffffff'})`,
                          color: corPrimaria,
                        }}
                        aria-hidden="true"
                      >
                        {iconeModulo(m.icone)}
                      </span>
                      {instalado && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                          Instalado
                        </span>
                      )}
                    </div>

                    <div className="mt-4 min-h-0 flex-1">
                      <h3 className="text-base font-black leading-tight">{m.nome}</h3>
                      <p className={`mt-1 line-clamp-3 text-xs leading-relaxed ${textMuted}`}>{m.descricao}</p>
                    </div>

                    <div className="mt-3">
                      <p className={`mb-2 min-h-7 text-[11px] font-bold leading-tight ${textMuted}`}>
                        {cancelamentoEm
                          ? `Acesso até ${new Intl.DateTimeFormat('pt-BR').format(new Date(cancelamentoEm))}`
                          : cortesia
                            ? 'Liberado por cortesia'
                            : liberado
                              ? 'Disponível para instalação'
                              : businessPro
                                ? 'Incluso no Business Pro'
                                : business
                                  ? `${preco} por mês`
                                  : 'Disponível no Business e Business Pro'}
                      </p>
                      {instalado ? (
                        <button
                          type="button"
                          disabled={processando || !podeGerenciar || Boolean(cancelamentoEm)}
                          onClick={() => onDesinstalar(m.id)}
                          className="min-h-11 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-50"
                        >{processando ? '...' : cancelamentoEm ? 'Cancelamento agendado' : business ? 'Cancelar assinatura' : 'Remover'}</button>
                      ) : (
                        <button
                          type="button"
                          disabled={processando || !podeGerenciar || !disponivelNoPlano}
                          onClick={() => onInstalar(m.id)}
                          className="min-h-11 w-full rounded-xl px-3 py-2 text-xs font-black text-white shadow transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                          style={{ backgroundColor: corPrimaria, outlineColor: corPrimaria }}
                        >{processando ? '...' : business ? `Assinar ${preco}` : businessPro || cortesia || liberado ? 'Instalar' : 'Indisponível'}</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </DraggableModalCard>
    </div>
  );
}

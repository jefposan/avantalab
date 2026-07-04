'use client';
import React, { useRef, useState, useEffect } from 'react';
import Tooltip from './Tooltip';

interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  acao?: () => void | Promise<void>;
  acaoTexto?: string;
  naoLida?: boolean;
}

interface LogoSettings {
  scale: number;
  x: number;
  y: number;
}

interface AppHeaderProps {
  darkMode: boolean;
  textMuted: string;
  textStrong: string;
  bgCard: string;
  corPrimaria: string;
  textoSobreCorPrimaria: string;
  bordaSobreCorPrimaria: string;
  corEhClara: (cor: string) => boolean;
  estiloTemaPrimario: React.CSSProperties;
  abaAtiva: string;
  setAbaAtiva: React.Dispatch<React.SetStateAction<string>>;
  ajustesAberto: boolean;
  setAjustesAberto: React.Dispatch<React.SetStateAction<boolean>>;
  menuResponsivoAberto: boolean;
  setMenuResponsivoAberto: React.Dispatch<React.SetStateAction<boolean>>;
  painelAvisosAberto: boolean;
  setPainelAvisosAberto: React.Dispatch<React.SetStateAction<boolean>>;
  anoSelecionado: string;
  setAnoSelecionado: React.Dispatch<React.SetStateAction<string>>;
  setMesAtivo: React.Dispatch<React.SetStateAction<string | null>>;
  alertasSistema: Aviso[];
  onExcluirAviso?: (id: string) => void;
  onLimparAvisos?: () => void;
  calcAberta: boolean;
  setCalcAberta: React.Dispatch<React.SetStateAction<boolean>>;
  confirmarLogout: () => void;
  logoUrl: string;
  logoSettings: LogoSettings;
  setModalEmpresasAberto: React.Dispatch<React.SetStateAction<boolean>>;
  agendaHojeCount: number;
  onAbrirAgenda: () => void;
}

const ABAS = ['Dashboard', 'Balanço Geral', 'Gráficos', 'Por Categoria', 'Relatório'] as const;

export default function AppHeader({
  darkMode, textMuted, textStrong, bgCard,
  corPrimaria, textoSobreCorPrimaria, bordaSobreCorPrimaria,
  corEhClara, estiloTemaPrimario,
  abaAtiva, setAbaAtiva, ajustesAberto, setAjustesAberto,
  menuResponsivoAberto, setMenuResponsivoAberto,
  painelAvisosAberto, setPainelAvisosAberto,
  anoSelecionado, setAnoSelecionado, setMesAtivo,
  alertasSistema,
  onExcluirAviso,
  onLimparAvisos,
  calcAberta, setCalcAberta,
  confirmarLogout, logoUrl, logoSettings,
  setModalEmpresasAberto,
  agendaHojeCount, onAbrirAgenda,
}: AppHeaderProps) {
  const itensMenu = [
    { aba: 'Dashboard', label: 'Início' },
    { aba: 'Balanço Geral', label: 'Balanço' },
    { aba: 'Gráficos', label: 'Gráficos' },
    { aba: 'Por Categoria', label: 'Categorias' },
    { aba: 'Relatório', label: 'Relatório' },
  ] as const;

  // Indicador deslizante do menu (a "pilula" que escorrega ate a aba ativa)
  const navRef = useRef<HTMLElement>(null);
  const [indicador, setIndicador] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const calcular = () => {
      let ativoEl: HTMLButtonElement | null = null;
      nav.querySelectorAll<HTMLButtonElement>('[data-aba]').forEach((b) => {
        if (b.getAttribute('data-aba') === abaAtiva) ativoEl = b;
      });
      if (ativoEl) {
        const el = ativoEl as HTMLButtonElement;
        setIndicador({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
      }
    };
    calcular();
    window.addEventListener('resize', calcular);
    return () => window.removeEventListener('resize', calcular);
  }, [abaAtiva]);

  return (
    <>
      {/* ── MENU RESPONSIVO (gaveta lateral mobile) ── */}
      {menuResponsivoAberto && (
        <div
          className="fixed inset-0 z-[1200] bg-black/50 lg:hidden"
          onClick={() => setMenuResponsivoAberto(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className={`flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto border-r p-4 shadow-2xl ${
              darkMode
                ? 'border-slate-700 bg-slate-900 text-slate-100'
                : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.25em] ${textMuted}`}>
                  AvantaLab
                </p>
                <h2 className={`mt-1 text-lg font-black ${textStrong}`}>Menu</h2>
              </div>
              <button
                type="button"
                onClick={() => setMenuResponsivoAberto(false)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl font-black transition cursor-pointer ${
                  darkMode
                    ? 'border-slate-700 text-slate-100 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title="Fechar menu"
              >
                ×
              </button>
            </div>

            <div className="space-y-1">
              {itensMenu.map((item) => (
                <button
                  key={item.aba}
                  type="button"
                  onClick={() => {
                    setAbaAtiva(item.aba);
                    setMenuResponsivoAberto(false);
                    if (item.aba === 'Dashboard') setMesAtivo(null);
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm font-black transition cursor-pointer ${
                    abaAtiva === item.aba
                      ? ''
                      : darkMode
                        ? 'hover:bg-slate-800 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  style={abaAtiva === item.aba ? estiloTemaPrimario : undefined}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className={`my-3 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => { setCalcAberta(true); setMenuResponsivoAberto(false); }}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm font-black transition cursor-pointer ${
                  darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                Calculadora
              </button>
              <button
                type="button"
                onClick={() => { setMenuResponsivoAberto(false); setModalEmpresasAberto(true); }}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm font-black transition cursor-pointer ${
                  darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                Perfil
              </button>
              <button
                type="button"
                onClick={() => { setMenuResponsivoAberto(false); confirmarLogout(); }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm font-black text-red-600 transition hover:bg-red-50 cursor-pointer"
              >
                Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── HEADER PRINCIPAL ── */}
      <header
        className={`print-ocultar ${bgCard} sticky top-0 z-[900] w-full max-w-full overflow-hidden border-b px-3 py-2 shadow-[0_4px_18px_rgba(15,23,42,0.10)] sm:px-4 lg:px-6 xl:px-8 xl:py-3 relative`}
        style={{ borderBottomColor: darkMode ? '#334155' : 'transparent', borderBottomWidth: '1px' }}
      >
        <div className="mx-auto flex min-h-[68px] w-full min-w-0 max-w-7xl items-center gap-3 px-0 sm:min-h-[72px] sm:gap-4 xl:min-h-[88px] xl:gap-6 xl:px-8">
          {/* LOGO */}
          {logoUrl !== '__blank__' && (
          <div
            className="relative flex h-[60px] w-40 shrink-0 cursor-pointer items-center justify-center sm:h-[68px] sm:w-48 xl:h-[82px] xl:w-64"
            onClick={() => { setAbaAtiva('Dashboard'); setMesAtivo(null); setMenuResponsivoAberto(false); }}
          >
            {logoUrl ? (
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="absolute"
                  style={{
                    transform: `translate(${logoSettings.x}px, ${logoSettings.y}px) scale(${logoSettings.scale / 100})`,
                    objectFit: 'contain',
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                  }}
                />
              </div>
            ) : (
              <>
                <div
                  className="absolute pointer-events-none rounded-lg"
                  style={{ inset: '2px', border: `2px dashed ${darkMode ? '#475569' : '#cbd5e1'}` }}
                />
                <span className="relative px-3 text-center leading-snug text-slate-500">
                  <span className="block text-[11px] font-semibold">Acesse os Ajustes e adicione sua</span>
                  <span className="mt-1 block text-base font-black tracking-wide">LOGOMARCA</span>
                </span>
              </>
            )}
          </div>
          )}

          {/* Hamburger mobile */}
          <button
            type="button"
            onClick={() => setMenuResponsivoAberto(true)}
            className={`xl:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-2xl font-black transition cursor-pointer ${
              darkMode
                ? 'border-slate-700 text-slate-100 hover:bg-slate-800'
                : 'border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Abrir menu"
          >
            ☰
          </button>

          {/* Área direita */}
          <div className="flex-1 flex flex-col gap-3 xl:gap-5 min-w-0">
            <div className="relative hidden min-w-0 items-center gap-3 xl:flex">
              {/* Nav principal (centralizado no espaco entre logo e controles) */}
              <div className="flex min-w-0 flex-1 justify-center">
              <nav
                ref={navRef}
                className={`relative grid w-full min-w-0 max-w-[560px] grid-cols-5 gap-2 rounded-xl border p-1 shadow-sm ${
                  darkMode ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-slate-50'
                }`}
              >
                {/* Pilula deslizante atras da aba ativa */}
                {indicador && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute z-0 rounded-lg shadow-sm transition-all duration-300 ease-out"
                    style={{
                      left: indicador.left,
                      top: indicador.top,
                      width: indicador.width,
                      height: indicador.height,
                      backgroundColor: corPrimaria,
                    }}
                  />
                )}
                {itensMenu.map((item) => {
                  const ativo = abaAtiva === item.aba;
                  return (
                    <button
                      key={item.aba}
                      type="button"
                      data-aba={item.aba}
                      onClick={() => {
                        setAjustesAberto(false);
                        setPainelAvisosAberto(false);
                        setMesAtivo(null);
                        setAbaAtiva(item.aba);
                        setMenuResponsivoAberto(false);
                      }}
                      className={`relative z-[1] whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-colors active:scale-[0.98] cursor-pointer ${
                        ativo
                          ? ''
                          : darkMode
                            ? 'text-slate-300 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900'
                      }`}
                      style={ativo ? { color: textoSobreCorPrimaria } : undefined}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              </div>

              {/* Controles lado direito */}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {/* Seletor de ano */}
                <Tooltip texto="Ano de referência dos lançamentos e relatórios." posicao="bottom">
                <div
                  className={`flex h-9 items-center gap-2 rounded-lg border px-2.5 shadow-sm ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 text-slate-100'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-wide ${textMuted}`}>Ano</span>
                  <select
                    value={anoSelecionado}
                    onChange={(e) => setAnoSelecionado(e.target.value)}
                    className="bg-transparent text-sm font-black outline-none cursor-pointer"
                    style={{ color: corEhClara(corPrimaria) ? '#0f172a' : corPrimaria }}
                  >
                    {Array.from(
                      { length: new Date().getFullYear() + 5 - 2024 + 1 },
                      (_, i) => (2024 + i).toString()
                    ).map((ano) => (
                      <option key={ano} value={ano} className="bg-white text-slate-800">{ano}</option>
                    ))}
                  </select>
                </div>
                </Tooltip>

                {/* Controle radial de acoes rapidas */}
                <div
                  className={`relative grid h-[92px] w-[92px] shrink-0 grid-cols-2 grid-rows-2 gap-[2px] overflow-hidden rounded-full border-2 shadow-[0_8px_18px_rgba(15,23,42,0.18)] ${
                    darkMode ? 'border-slate-600 bg-slate-600' : 'border-white bg-white'
                  }`}
                  aria-label="Ações rápidas"
                >
                  <Tooltip texto="Abra a agenda de compromissos." posicao="left" wrapperClassName="h-full w-full">
                    <button
                      type="button"
                      onClick={onAbrirAgenda}
                      aria-label="Agenda"
                      className="relative flex h-full w-full items-center justify-center bg-[#104F86] text-white transition duration-200 hover:brightness-110 active:brightness-90 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white cursor-pointer"
                    >
                      <svg className="h-[18px] w-[18px] translate-x-1 translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {agendaHojeCount > 0 && (
                        <span className="absolute left-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-cyan-300 px-0.5 text-[8px] font-black leading-none text-slate-900 shadow">
                          {agendaHojeCount > 9 ? '9+' : agendaHojeCount}
                        </span>
                      )}
                    </button>
                  </Tooltip>

                  <Tooltip texto="Troque ou gerencie seus perfis financeiros." posicao="right" wrapperClassName="h-full w-full">
                    <button
                      type="button"
                      onClick={() => { setAjustesAberto(false); setPainelAvisosAberto(false); setModalEmpresasAberto(true); }}
                      aria-label="Trocar perfil"
                      className="flex h-full w-full items-center justify-center bg-[#0E7490] text-white transition duration-200 hover:brightness-110 active:brightness-90 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white cursor-pointer"
                    >
                      <svg className="h-[19px] w-[19px] -translate-x-1 translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="8" r="3.5" strokeWidth="2" />
                        <path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </Tooltip>

                  <Tooltip texto="Abra a calculadora." posicao="left" wrapperClassName="h-full w-full">
                    <button
                      type="button"
                      onClick={() => setCalcAberta(!calcAberta)}
                      aria-label="Calculadora"
                      className={`flex h-full w-full items-center justify-center text-white transition duration-200 hover:brightness-110 active:brightness-90 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white cursor-pointer ${calcAberta ? 'bg-[#52647C]' : 'bg-[#64748B]'}`}
                    >
                      <svg className="h-[19px] w-[19px] translate-x-1 -translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5" y="3" width="14" height="18" rx="2" strokeWidth="2" />
                        <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </Tooltip>

                  <Tooltip texto="Avisos e novidades do sistema." posicao="right" wrapperClassName="h-full w-full">
                    <button
                      type="button"
                      onClick={() => { setAjustesAberto(false); setPainelAvisosAberto((prev) => !prev); }}
                      aria-label="Avisos do sistema"
                      className={`relative flex h-full w-full items-center justify-center text-white transition duration-200 hover:brightness-110 active:brightness-90 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white cursor-pointer ${painelAvisosAberto ? 'bg-[#0B625E]' : 'bg-[#0F766E]'}`}
                    >
                      <svg className="h-[19px] w-[19px] -translate-x-1 -translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                      </svg>
                      {alertasSistema.filter((a) => a.naoLida).length > 0 && (
                        <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-black leading-none text-white shadow">
                          {alertasSistema.filter((a) => a.naoLida).length > 9 ? '9+' : alertasSistema.filter((a) => a.naoLida).length}
                        </span>
                      )}
                    </button>
                  </Tooltip>

                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 top-1/2 z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-inner ${
                      darkMode ? 'border-slate-500 bg-slate-900' : 'border-white bg-slate-100'
                    }`}
                  />
                </div>

                {/* Ajustes */}
                <Tooltip texto="Abra os ajustes do sistema." posicao="bottom">
                <button
                  type="button"
                  onClick={() => { setPainelAvisosAberto(false); setAjustesAberto(!ajustesAberto); }}
                  className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black uppercase tracking-wide shadow-sm transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                    ajustesAberto
                      ? 'text-white'
                      : darkMode
                        ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  style={ajustesAberto ? { backgroundColor: '#475569', borderColor: '#475569' } : undefined}
                >
                  <svg
                    className={`h-4 w-4 transition-transform duration-300 ${ajustesAberto ? 'rotate-90' : 'rotate-0'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3"
                      d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.451 2.451 1.724 1.724 0 001.066 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.451 2.451 1.724 1.724 0 00-2.573 1.066 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.451-2.451 1.724 1.724 0 00-1.066-2.573 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.451-2.451 1.724 1.724 0 002.573-1.066z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3"
                      d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z" />
                  </svg>
                  Ajustes
                </button>
                </Tooltip>

                {/* Sair */}
                <button
                  type="button"
                  onClick={confirmarLogout}
                  className={`h-9 rounded-lg border px-3 text-xs font-black uppercase tracking-wide shadow-sm transition active:scale-[0.98] cursor-pointer ${
                    darkMode
                      ? 'border-red-800/50 bg-red-950/30 text-red-300 hover:bg-red-900/50'
                      : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  Sair
                </button>
              </div>
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{ backgroundColor: corPrimaria }}
            />
          </div>
        </div>
      </header>

      {/* ── PAINEL DE AVISOS ── */}
      {painelAvisosAberto && (
        <>
          <div
            className="fixed inset-0 z-[8400] bg-black/40"
            onClick={() => setPainelAvisosAberto(false)}
          />
          <div
            className={`fixed inset-x-3 top-[92px] z-[8500] max-h-[calc(100dvh-108px)] w-auto max-w-sm overflow-hidden rounded-2xl border shadow-2xl sm:left-auto sm:right-4 sm:w-80 xl:right-8 xl:top-[135px] ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria, borderColor: bordaSobreCorPrimaria }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-wide">Avisos e notificações</h3>
                  <p className="text-[11px] opacity-80">
                    {alertasSistema.length === 0
                      ? 'Nenhum aviso'
                      : (alertasSistema.filter((a) => a.naoLida).length > 0
                          ? `${alertasSistema.filter((a) => a.naoLida).length} não lido(s) de ${alertasSistema.length}`
                          : `${alertasSistema.length} aviso(s)`)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {onLimparAvisos && alertasSistema.some((a) => String(a.id).startsWith('notif-')) && (
                    <button
                      type="button"
                      onClick={() => onLimparAvisos()}
                      className="rounded-lg border px-2 py-1 text-[11px] font-black uppercase tracking-wide transition hover:brightness-110"
                      style={{ borderColor: bordaSobreCorPrimaria, color: textoSobreCorPrimaria }}
                      title="Apagar todos os avisos"
                    >
                      Limpar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPainelAvisosAberto(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border transition hover:brightness-110"
                    style={{ borderColor: bordaSobreCorPrimaria, color: textoSobreCorPrimaria }}
                    aria-label="Fechar"
                    title="Fechar"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-3">
              {alertasSistema.length === 0 ? (
                <div className={`rounded-xl p-4 text-sm ${textMuted}`}>Tudo certo por enquanto.</div>
              ) : (
                <div className="space-y-3">
                  {alertasSistema.map((aviso) => (
                    <div
                      key={aviso.id}
                      className={`rounded-xl border p-3 ${
                        aviso.naoLida
                          ? (darkMode ? 'border-cyan-700 bg-slate-800/70' : 'border-cyan-200 bg-cyan-50/60')
                          : (darkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50')
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`flex min-w-0 items-center gap-1.5 text-sm font-black ${textStrong}`}>
                          {aviso.naoLida && <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-500" />}
                          <span className="min-w-0 truncate">{aviso.titulo}</span>
                        </h4>
                        {String(aviso.id).startsWith('notif-') && onExcluirAviso && (
                          <button
                            type="button"
                            onClick={() => onExcluirAviso(aviso.id)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                            aria-label="Excluir aviso"
                            title="Excluir aviso"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                      <p className={`mt-1 text-xs leading-relaxed ${textMuted}`}>{aviso.mensagem}</p>
                      {aviso.acao && aviso.acaoTexto && (
                        <button
                          type="button"
                          onClick={async () => { setPainelAvisosAberto(false); await aviso.acao?.(); }}
                          className="mt-3 w-full rounded-lg px-3 py-2 text-xs font-bold shadow-sm transition hover:brightness-110 cursor-pointer"
                          style={estiloTemaPrimario}
                        >
                          {aviso.acaoTexto}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>

  );
}

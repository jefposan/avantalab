'use client';
import React from 'react';

interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  acao?: () => void | Promise<void>;
  acaoTexto?: string;
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
  nomeEmpresaAtual: string;
  alertasSistema: Aviso[];
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
  nomeEmpresaAtual, alertasSistema,
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
        className={`print-ocultar ${bgCard} sticky top-0 z-[900] shadow-[0_4px_18px_rgba(15,23,42,0.10)] border-b px-8 pt-1 pb-4 relative overflow-hidden`}
        style={{ borderBottomColor: darkMode ? '#334155' : 'transparent', borderBottomWidth: '1px' }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-6 xl:gap-6 xl:px-8 min-h-[72px] xl:min-h-[88px]">
          {/* LOGO */}
          {logoUrl !== '__blank__' && (
          <div
            className="w-44 h-[72px] xl:w-64 xl:h-[88px] flex items-center justify-center relative cursor-pointer shrink-0 mb-2"
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
            className={`lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-2xl font-black transition cursor-pointer ${
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
            <div className="relative hidden items-center gap-3 lg:flex">
              {/* Nav principal */}
              <nav
                className={`relative grid min-w-[450px] grid-cols-5 gap-1 rounded-xl border p-1 shadow-sm ${
                  darkMode ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-slate-50'
                }`}
              >
                {itensMenu.map((item) => {
                  const ativo = abaAtiva === item.aba;
                  return (
                    <button
                      key={item.aba}
                      type="button"
                      onClick={() => {
                        setAjustesAberto(false);
                        setPainelAvisosAberto(false);
                        setMesAtivo(null);
                        setAbaAtiva(item.aba);
                        setMenuResponsivoAberto(false);
                      }}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-all active:scale-[0.98] cursor-pointer ${
                        ativo
                          ? 'shadow-sm'
                          : darkMode
                            ? 'text-slate-300 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900'
                      }`}
                      style={ativo ? { backgroundColor: corPrimaria, color: textoSobreCorPrimaria } : undefined}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Controles lado direito */}
              <div className="ml-auto flex items-center gap-2">
                {/* Seletor de ano */}
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

                {/* Calculadora */}
                <button
                  type="button"
                  onClick={() => setCalcAberta(!calcAberta)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Calculadora"
                >
                  <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>

                {/* Agenda */}
                <button
                  type="button"
                  onClick={onAbrirAgenda}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Agenda"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {agendaHojeCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-black leading-none text-white shadow-md">
                      {agendaHojeCount > 9 ? '9+' : agendaHojeCount}
                    </span>
                  )}
                </button>

                {/* Avisos */}
                <button
                  type="button"
                  onClick={() => { setAjustesAberto(false); setPainelAvisosAberto((prev) => !prev); }}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Avisos do sistema"
                >
                  <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                  </svg>
                  {alertasSistema.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white shadow-md">
                      {alertasSistema.length}
                    </span>
                  )}
                </button>

                {/* Ajustes */}
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
                  title="Abrir ajustes"
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

            {/* Faixa colorida inferior */}
            <div
              className="absolute bottom-0 left-0 right-0 h-5 text-xs font-semibold z-10"
              style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}
            >
              <div className="mx-auto flex h-full w-full max-w-[1280px] items-center px-8">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate font-black">Olá, {nomeEmpresaAtual || 'Empresa'}</span>
                </div>
              </div>
            </div>
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
            className={`fixed right-8 top-[135px] w-80 overflow-hidden rounded-2xl border shadow-2xl z-[8500] ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria, borderColor: bordaSobreCorPrimaria }}
            >
              <h3 className="text-sm font-black uppercase tracking-wide">Avisos do sistema</h3>
              <p className="text-[11px] opacity-80">
                {alertasSistema.length > 0
                  ? `${alertasSistema.length} aviso(s) pendente(s)`
                  : 'Nenhum aviso pendente'}
              </p>
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
                        darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <h4 className={`text-sm font-black ${textStrong}`}>{aviso.titulo}</h4>
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

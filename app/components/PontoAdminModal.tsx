'use client';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export type FuncionarioPonto = {
  id: string;
  user_id: string;
  nome: string;
  login: string;
  cargo: string;
  ativo: boolean;
  hora_entrada: string | null;
  hora_saida: string | null;
};

export type RegistroPonto = {
  tipo: string;
  registrado_em: string;
  dia: string;
  distancia_m: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type PontoConfig = {
  latitude: number | null;
  longitude: number | null;
  raio_m: number;
} | null;

interface PontoAdminModalProps {
  aberto: boolean;
  onFechar: () => void;
  funcionarios: FuncionarioPonto[];
  carregando: boolean;
  onCriar: (dados: { nome: string; login: string; senha: string; cargo: string; horaEntrada?: string; horaSaida?: string }) => Promise<{ erro: boolean; mensagem?: string }>;
  onAtualizar: (id: string, dados: { cargo: string; horaEntrada?: string; horaSaida?: string; ativo: boolean }) => Promise<{ erro: boolean; mensagem?: string }>;
  config: PontoConfig;
  onSalvarConfig: (dados: { latitude: number; longitude: number; raio_m: number }) => Promise<{ erro: boolean; mensagem?: string }>;
  onCarregarRegistros: (funcionarioUserId: string, dataInicioISO: string) => Promise<RegistroPonto[]>;
  darkMode: boolean;
  corPrimaria: string;
}

export default function PontoAdminModal({
  aberto,
  onFechar,
  funcionarios,
  carregando,
  onCriar,
  onAtualizar,
  config,
  onSalvarConfig,
  onCarregarRegistros,
  darkMode,
  corPrimaria,
}: PontoAdminModalProps) {
  const [aba, setAba] = useState<'lista' | 'novo' | 'local' | 'relatorios'>('lista');
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [cargo, setCargo] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSaida, setHoraSaida] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [raio, setRaio] = useState('100');
  const [capturando, setCapturando] = useState(false);
  const [salvandoLocal, setSalvandoLocal] = useState(false);
  const [msgLocal, setMsgLocal] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editCargo, setEditCargo] = useState('');
  const [editEntrada, setEditEntrada] = useState('');
  const [editSaida, setEditSaida] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [msgEdit, setMsgEdit] = useState<string | null>(null);

  const [relFuncId, setRelFuncId] = useState('');
  const [relPeriodo, setRelPeriodo] = useState<'semana' | 'mes' | 'ano'>('mes');
  const [relRegistros, setRelRegistros] = useState<RegistroPonto[]>([]);
  const [relCarregando, setRelCarregando] = useState(false);

  const TOLERANCIA_MIN = 10;

  useEffect(() => {
    if (config) {
      setLat(config.latitude != null ? String(config.latitude) : '');
      setLng(config.longitude != null ? String(config.longitude) : '');
      setRaio(String(config.raio_m || 100));
    }
  }, [config]);

  if (!aberto) return null;

  const card = darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const itemBorda = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputCls = `h-10 w-full rounded-lg border px-3 text-sm outline-none ${darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-800'}`;

  const enviar = async () => {
    setMsg(null);
    if (!nome.trim() || !login.trim() || senha.length < 8) {
      setMsg({ tipo: 'erro', texto: 'Preencha nome, login e senha (mín. 8 caracteres).' });
      return;
    }
    setEnviando(true);
    const r = await onCriar({ nome: nome.trim(), login: login.trim(), senha, cargo: cargo.trim(), horaEntrada: horaEntrada || undefined, horaSaida: horaSaida || undefined });
    setEnviando(false);
    if (r.erro) {
      setMsg({ tipo: 'erro', texto: r.mensagem || 'Não foi possível cadastrar.' });
    } else {
      setMsg({ tipo: 'ok', texto: 'Funcionário cadastrado!' });
      setNome(''); setLogin(''); setSenha(''); setCargo(''); setHoraEntrada(''); setHoraSaida('');
      setAba('lista');
    }
  };

  const abrirEdicao = (f: FuncionarioPonto) => {
    setEditId(f.id);
    setEditCargo(f.cargo || '');
    setEditEntrada(f.hora_entrada ? f.hora_entrada.slice(0, 5) : '');
    setEditSaida(f.hora_saida ? f.hora_saida.slice(0, 5) : '');
    setEditAtivo(f.ativo);
    setMsgEdit(null);
  };

  const salvarEdicao = async (id: string) => {
    setMsgEdit(null);
    setSalvandoEdit(true);
    const r = await onAtualizar(id, { cargo: editCargo.trim(), horaEntrada: editEntrada || undefined, horaSaida: editSaida || undefined, ativo: editAtivo });
    setSalvandoEdit(false);
    if (r.erro) setMsgEdit(r.mensagem || 'Não foi possível salvar.');
    else setEditId(null);
  };

  const horaBrasilia = (ts: string) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', hour12: false });
  const minutosDoDia = (hhmm: string) => { const [h, m] = hhmm.slice(0, 5).split(':').map(Number); return h * 60 + m; };

  const carregarRelatorio = async (funcId: string, periodo: 'semana' | 'mes' | 'ano') => {
    if (!funcId) { setRelRegistros([]); return; }
    setRelCarregando(true);
    const hoje = new Date();
    const inicio = new Date(hoje);
    if (periodo === 'semana') inicio.setDate(hoje.getDate() - 7);
    else if (periodo === 'mes') inicio.setMonth(hoje.getMonth() - 1);
    else inicio.setFullYear(hoje.getFullYear() - 1);
    const iso = inicio.toISOString().slice(0, 10);
    const regs = await onCarregarRegistros(funcId, iso);
    setRelRegistros(regs);
    setRelCarregando(false);
  };

  type DiaRel = { dia: string; entrada?: string; saida?: string; distancia: number | null; statusEntrada: 'pontual' | 'atraso' | 'adiantado' | 'sem' };
  const funcSel = funcionarios.find((f) => f.user_id === relFuncId) || null;
  const diasRel: DiaRel[] = (() => {
    const mapa: Record<string, RegistroPonto[]> = {};
    relRegistros.forEach((r) => { (mapa[r.dia] = mapa[r.dia] || []).push(r); });
    return Object.keys(mapa).sort().reverse().map((dia) => {
      const regs = mapa[dia];
      const entradaReg = regs.find((r) => r.tipo === 'entrada');
      const saidaReg = [...regs].reverse().find((r) => r.tipo === 'saida');
      const distancia = entradaReg?.distancia_m ?? regs[0]?.distancia_m ?? null;
      let statusEntrada: DiaRel['statusEntrada'] = 'sem';
      if (entradaReg && funcSel?.hora_entrada) {
        const diff = minutosDoDia(horaBrasilia(entradaReg.registrado_em)) - minutosDoDia(funcSel.hora_entrada);
        statusEntrada = diff > TOLERANCIA_MIN ? 'atraso' : diff < -TOLERANCIA_MIN ? 'adiantado' : 'pontual';
      }
      return { dia, entrada: entradaReg ? horaBrasilia(entradaReg.registrado_em) : undefined, saida: saidaReg ? horaBrasilia(saidaReg.registrado_em) : undefined, distancia, statusEntrada };
    });
  })();
  const totalComHorario = diasRel.filter((d) => d.statusEntrada !== 'sem').length;
  const pontuais = diasRel.filter((d) => d.statusEntrada === 'pontual').length;
  const atrasos = diasRel.filter((d) => d.statusEntrada === 'atraso').length;
  const pctPontual = totalComHorario ? Math.round((pontuais / totalComHorario) * 100) : 0;

  const rotuloStatus = (s: DiaRel['statusEntrada']) => s === 'pontual' ? 'Pontual' : s === 'atraso' ? 'Atraso' : s === 'adiantado' ? 'Adiantado' : '-';
  const rotuloPeriodo = relPeriodo === 'semana' ? 'Última semana' : relPeriodo === 'mes' ? 'Último mês' : 'Último ano';
  const slugNome = (t: string) => (t || 'funcionario').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const dataBr = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
  const resumoPontualidade = funcSel?.hora_entrada ? `${pctPontual}% (${pontuais} pontuais, ${atrasos} atrasos de ${totalComHorario} dias)` : 'Não avaliada';
  const horarioPrevisto = funcSel?.hora_entrada ? `${funcSel.hora_entrada.slice(0, 5)} às ${funcSel.hora_saida ? funcSel.hora_saida.slice(0, 5) : '-'}` : 'Não definido';

  const gerarRelatorioXlsx = () => {
    if (!funcSel) return;
    const cabecalho = [
      ['Relatório de Ponto'],
      ['Funcionário', funcSel.nome],
      ['Cargo', funcSel.cargo || '-'],
      ['Período', rotuloPeriodo],
      ['Horário previsto', horarioPrevisto],
      ['Pontualidade na entrada', resumoPontualidade],
      [],
      ['Data', 'Entrada', 'Saída', 'Distância (m)', 'Status'],
    ];
    const linhas = diasRel.map((d) => [dataBr(d.dia), d.entrada || '--:--', d.saida || '--:--', d.distancia != null ? Math.round(d.distancia) : '', rotuloStatus(d.statusEntrada)]);
    const ws = XLSX.utils.aoa_to_sheet([...cabecalho, ...linhas]);
    ws['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ponto');
    XLSX.writeFile(wb, `ponto_${slugNome(funcSel.nome)}_${relPeriodo}.xlsx`);
  };

  const gerarRelatorioPdf = () => {
    if (!funcSel) return;
    const esc = (t: string) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Record<string, string>)[c]);
    const corStatus = (s: DiaRel['statusEntrada']) => s === 'pontual' ? '#047857' : s === 'atraso' ? '#b91c1c' : s === 'adiantado' ? '#b45309' : '#64748b';
    const linhas = diasRel.map((d) => `<tr><td>${dataBr(d.dia)}</td><td>${d.entrada || '--:--'}</td><td>${d.saida || '--:--'}</td><td>${d.distancia != null ? Math.round(d.distancia) + ' m' : '-'}</td><td style="color:${corStatus(d.statusEntrada)};font-weight:700">${rotuloStatus(d.statusEntrada)}</td></tr>`).join('');
    const html = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>Ponto - ${esc(funcSel.nome)}</title><style>
      *{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}body{margin:24px;color:#0f172a}
      h1{font-size:18px;margin:0 0 2px}.sub{color:#64748b;font-size:12px;margin:0 0 14px}
      .meta{font-size:12px;margin:2px 0}.meta b{display:inline-block;min-width:150px}
      table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
      th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left}th{background:#f1f5f9;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
      .rod{margin-top:18px;color:#94a3b8;font-size:10px}
    </style></head><body>
      <h1>Relatório de Ponto</h1><p class="sub">${esc(rotuloPeriodo)}</p>
      <p class="meta"><b>Funcionário:</b> ${esc(funcSel.nome)}</p>
      <p class="meta"><b>Cargo:</b> ${esc(funcSel.cargo || '-')}</p>
      <p class="meta"><b>Horário previsto:</b> ${esc(horarioPrevisto)}</p>
      <p class="meta"><b>Pontualidade na entrada:</b> ${esc(resumoPontualidade)}</p>
      <table><thead><tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Distância</th><th>Status</th></tr></thead><tbody>${linhas}</tbody></table>
      <p class="rod">Gerado pelo AvantaLab em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Tolerância de pontualidade: ${TOLERANCIA_MIN} min.</p>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const capturarLocal = () => {
    setMsgLocal(null);
    if (!navigator.geolocation) { setMsgLocal({ tipo: 'erro', texto: 'Geolocalização indisponível neste navegador.' }); return; }
    setCapturando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(String(pos.coords.latitude)); setLng(String(pos.coords.longitude)); setCapturando(false); setMsgLocal({ tipo: 'ok', texto: 'Localização capturada.' }); },
      () => { setCapturando(false); setMsgLocal({ tipo: 'erro', texto: 'Não foi possível obter a localização. Permita o acesso ou digite manualmente.' }); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const salvarLocal = async () => {
    setMsgLocal(null);
    const la = parseFloat(lat), lo = parseFloat(lng), ra = parseInt(raio, 10);
    if (isNaN(la) || isNaN(lo)) { setMsgLocal({ tipo: 'erro', texto: 'Latitude/longitude inválidas.' }); return; }
    setSalvandoLocal(true);
    const r = await onSalvarConfig({ latitude: la, longitude: lo, raio_m: isNaN(ra) || ra <= 0 ? 100 : ra });
    setSalvandoLocal(false);
    setMsgLocal(r.erro ? { tipo: 'erro', texto: r.mensagem || 'Não foi possível salvar.' } : { tipo: 'ok', texto: 'Local da empresa salvo!' });
  };

  const abas: Array<['lista' | 'novo' | 'local' | 'relatorios', string]> = [['lista', 'Funcionários'], ['novo', 'Novo'], ['local', 'Local'], ['relatorios', 'Relatórios']];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />

      <div className={`relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl ${card}`}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg, #020617, #003E73)' }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.65)' }}>Controle de Ponto</p>
            <h2 className="mt-0.5 text-lg font-black leading-tight text-white">Administração</h2>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-black text-white transition hover:bg-white/25" aria-label="Fechar">×</button>
        </div>

        <div className={`flex gap-2 border-b px-4 pt-3 ${itemBorda}`}>
          {abas.map(([a, label]) => (
            <button
              key={a}
              type="button"
              onClick={() => { setAba(a); setMsg(null); setMsgLocal(null); }}
              className="rounded-t-lg px-2.5 py-2 text-[11px] font-black uppercase tracking-wide"
              style={aba === a ? { color: corPrimaria, borderBottom: `2px solid ${corPrimaria}` } : { color: darkMode ? '#94a3b8' : '#64748b' }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {aba === 'lista' && (
            carregando ? (
              <p className={`py-8 text-center text-sm font-semibold ${textMuted}`}>Carregando...</p>
            ) : funcionarios.length === 0 ? (
              <p className={`py-8 text-center text-sm font-semibold ${textMuted}`}>Nenhum funcionário cadastrado. Use a aba "Novo".</p>
            ) : (
              <div className="grid gap-2">
                {funcionarios.map((f) => (
                  <div key={f.id} className={`rounded-xl border p-3 ${itemBorda}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-sm font-black text-cyan-700">{(f.nome || '?').charAt(0).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{f.nome}</p>
                        <p className={`truncate text-xs ${textMuted}`}>{f.login}{f.cargo ? ' · ' + f.cargo : ''}{f.hora_entrada ? ' · ' + f.hora_entrada.slice(0, 5) + (f.hora_saida ? '–' + f.hora_saida.slice(0, 5) : '') : ''}</p>
                      </div>
                      {!f.ativo && <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">Inativo</span>}
                      <button type="button" onClick={() => (editId === f.id ? setEditId(null) : abrirEdicao(f))} className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-wide" style={{ color: corPrimaria }}>{editId === f.id ? 'Fechar' : 'Editar'}</button>
                    </div>

                    {editId === f.id && (
                      <div className={`mt-3 grid gap-2 border-t pt-3 ${itemBorda}`}>
                        <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Cargo
                          <input className={inputCls} value={editCargo} onChange={(e) => setEditCargo(e.target.value)} placeholder="ex: Vendedor" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Entrada
                            <input className={inputCls} type="time" value={editEntrada} onChange={(e) => setEditEntrada(e.target.value)} />
                          </label>
                          <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Saída
                            <input className={inputCls} type="time" value={editSaida} onChange={(e) => setEditSaida(e.target.value)} />
                          </label>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-bold">
                          <input type="checkbox" checked={editAtivo} onChange={(e) => setEditAtivo(e.target.checked)} className="h-4 w-4" />
                          Funcionário ativo
                        </label>
                        <button type="button" onClick={() => salvarEdicao(f.id)} disabled={salvandoEdit} className="mt-1 h-10 rounded-xl text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{salvandoEdit ? 'Salvando...' : 'Salvar alterações'}</button>
                        {msgEdit && <p className="text-xs font-bold text-red-600">{msgEdit}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {aba === 'novo' && (
            <div className="grid gap-3">
              <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Nome
                <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do funcionário" />
              </label>
              <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Login
                <input className={inputCls} value={login} onChange={(e) => setLogin(e.target.value)} placeholder="ex: joao.silva" autoCapitalize="none" />
              </label>
              <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Senha (mín. 8)
                <input className={inputCls} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha de acesso" />
              </label>
              <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Cargo (opcional)
                <input className={inputCls} value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="ex: Vendedor" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Entrada prevista
                  <input className={inputCls} type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} />
                </label>
                <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Saída prevista
                  <input className={inputCls} type="time" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} />
                </label>
              </div>
              <button type="button" onClick={enviar} disabled={enviando} className="mt-1 h-11 rounded-xl text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{enviando ? 'Cadastrando...' : 'Cadastrar funcionário'}</button>
              {msg && <p className={`text-xs font-bold ${msg.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.texto}</p>}
            </div>
          )}

          {aba === 'local' && (
            <div className="grid gap-3">
              <p className={`text-xs ${textMuted}`}>Defina a localização da empresa. O funcionário só consegue bater o ponto dentro do raio definido.</p>
              <button type="button" onClick={capturarLocal} disabled={capturando} className="h-10 rounded-xl border px-3 text-xs font-black uppercase tracking-wide transition disabled:opacity-60" style={{ borderColor: corPrimaria, color: corPrimaria }}>{capturando ? 'Capturando...' : 'Usar minha localização atual'}</button>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Latitude
                  <input className={inputCls} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-23.5..." />
                </label>
                <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Longitude
                  <input className={inputCls} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-46.6..." />
                </label>
              </div>
              <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">Raio permitido (metros)
                <input className={inputCls} type="number" value={raio} onChange={(e) => setRaio(e.target.value)} placeholder="100" />
              </label>
              <button type="button" onClick={salvarLocal} disabled={salvandoLocal} className="mt-1 h-11 rounded-xl text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{salvandoLocal ? 'Salvando...' : 'Salvar local da empresa'}</button>
              {msgLocal && <p className={`text-xs font-bold ${msgLocal.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msgLocal.texto}</p>}
              <p className={`text-[11px] ${textMuted}`}>Dica: para pegar as coordenadas exatas, abra o Google Maps no local, toque/clique com o botão direito e copie a latitude/longitude.</p>
            </div>
          )}

          {aba === 'relatorios' && (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <select
                  className={inputCls}
                  value={relFuncId}
                  onChange={(e) => { setRelFuncId(e.target.value); carregarRelatorio(e.target.value, relPeriodo); }}
                >
                  <option value="">Selecione o funcionário</option>
                  {funcionarios.map((f) => <option key={f.user_id} value={f.user_id}>{f.nome}</option>)}
                </select>
                <div className="flex gap-1">
                  {(['semana', 'mes', 'ano'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setRelPeriodo(p); if (relFuncId) carregarRelatorio(relFuncId, p); }}
                      className="flex-1 rounded-lg py-1.5 text-[11px] font-black uppercase tracking-wide"
                      style={relPeriodo === p ? { backgroundColor: corPrimaria, color: '#fff' } : { backgroundColor: darkMode ? '#1e293b' : '#f1f5f9', color: darkMode ? '#94a3b8' : '#64748b' }}
                    >{p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Ano'}</button>
                  ))}
                </div>
              </div>

              {!relFuncId ? (
                <p className={`py-6 text-center text-sm font-semibold ${textMuted}`}>Selecione um funcionário para ver os registros.</p>
              ) : relCarregando ? (
                <p className={`py-6 text-center text-sm font-semibold ${textMuted}`}>Carregando...</p>
              ) : diasRel.length === 0 ? (
                <p className={`py-6 text-center text-sm font-semibold ${textMuted}`}>Nenhum registro no período.</p>
              ) : (
                <>
                  {funcSel?.hora_entrada ? (
                    <div className={`grid gap-2 rounded-xl border p-3 ${itemBorda}`}>
                      <div className="flex items-center justify-between text-xs font-black">
                        <span>Pontualidade na entrada</span>
                        <span style={{ color: corPrimaria }}>{pctPontual}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: darkMode ? '#334155' : '#e2e8f0' }}>
                        <div className="h-full rounded-full" style={{ width: pctPontual + '%', backgroundColor: '#10b981' }} />
                      </div>
                      <div className="flex gap-3 text-[11px] font-bold">
                        <span className="text-emerald-600">{pontuais} pontual{pontuais === 1 ? '' : 'is'}</span>
                        <span className="text-red-600">{atrasos} atraso{atrasos === 1 ? '' : 's'}</span>
                        <span className={textMuted}>de {totalComHorario} dia{totalComHorario === 1 ? '' : 's'}</span>
                      </div>
                      <p className={`text-[10px] ${textMuted}`}>Horário previsto: {funcSel.hora_entrada.slice(0, 5)} às {funcSel.hora_saida ? funcSel.hora_saida.slice(0, 5) : '—'} (tolerância {TOLERANCIA_MIN} min)</p>
                    </div>
                  ) : (
                    <p className={`rounded-xl border p-3 text-[11px] ${itemBorda} ${textMuted}`}>Sem horário previsto cadastrado — a pontualidade não pode ser avaliada. Edite na lista de funcionários.</p>
                  )}

                  <div className="flex gap-2">
                    <button type="button" onClick={gerarRelatorioXlsx} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Excel
                    </button>
                    <button type="button" onClick={gerarRelatorioPdf} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-rose-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      PDF
                    </button>
                  </div>

                  <div className="grid gap-1.5">
                    {diasRel.map((d) => (
                      <div key={d.dia} className={`flex items-center gap-3 rounded-xl border p-2.5 text-xs ${itemBorda}`}>
                        <div className="w-14 shrink-0 font-black">{d.dia.slice(8, 10)}/{d.dia.slice(5, 7)}</div>
                        <div className="flex-1">
                          <p className="font-bold">{d.entrada || '--:--'} → {d.saida || '--:--'}</p>
                          {d.distancia != null && <p className={`text-[10px] ${textMuted}`}>{Math.round(d.distancia)}m da empresa</p>}
                        </div>
                        {d.statusEntrada !== 'sem' && (
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
                            style={d.statusEntrada === 'pontual' ? { backgroundColor: '#d1fae5', color: '#047857' } : d.statusEntrada === 'atraso' ? { backgroundColor: '#fee2e2', color: '#b91c1c' } : { backgroundColor: '#fef3c7', color: '#b45309' }}>
                            {d.statusEntrada === 'pontual' ? 'Pontual' : d.statusEntrada === 'atraso' ? 'Atraso' : 'Adiant.'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

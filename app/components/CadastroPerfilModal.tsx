'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ESTADOS_BRASIL,
  REGIMES_TRIBUTARIOS,
  TIPOS_EMPRESA,
  type CadastroPerfil,
  type StatusCadastroPerfil,
} from '../lib/cadastro-perfil';

type DadosCobranca = { nome: string; cpfCnpj: string; email: string; telefone: string };

type Props = {
  aberto: boolean;
  empresaId: string;
  statusInicial?: StatusCadastroPerfil | null;
  contexto: 'lembrete' | 'bloqueio' | 'paywall' | 'edicao';
  ciclo?: 'mensal' | 'anual' | null;
  onLembrarDepois?: () => void;
  onCancelar?: () => void;
  onConcluido: (status: StatusCadastroPerfil, cobranca: DadosCobranca) => void | Promise<void>;
};

const VAZIO: CadastroPerfil = {
  empresa_id: '', nome_fantasia: '', nome_responsavel: '', razao_social: '', tipo_documento: 'cnpj', documento: '',
  tipo_empresa: '', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', telefone: '',
  whatsapp: '', email_empresa: '', site: '', instagram: '', inscricao_estadual: '', inscricao_estadual_isento: false,
  inscricao_municipal: '', inscricao_municipal_isento: false, regime_tributario: '', obrigatorio_em: '', concluido_em: null,
};

export default function CadastroPerfilModal({ aberto, empresaId, statusInicial, contexto, ciclo, onLembrarDepois, onCancelar, onConcluido }: Props) {
  const [status, setStatus] = useState<StatusCadastroPerfil | null>(statusInicial || null);
  const [dados, setDados] = useState<CadastroPerfil>(statusInicial?.cadastro || VAZIO);
  const [carregando, setCarregando] = useState(!statusInicial);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erro, setErro] = useState('');
  const [statusAutoSave, setStatusAutoSave] = useState('');
  const autoSaveEmAndamento = useRef(false);
  const autoSavePendente = useRef<CadastroPerfil | null>(null);

  useEffect(() => {
    if (!aberto || !empresaId) return;
    if (statusInicial) return;
    let ativo = true;
    const carregar = async () => {
      setCarregando(true);
      try {
        const { data: sessao } = await (await import('../lib/supabase')).supabase.auth.getSession();
        const token = sessao.session?.access_token;
        const resposta = await fetch(`/api/perfil-cadastro?empresaId=${encodeURIComponent(empresaId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await resposta.json();
        if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível carregar o cadastro.');
        if (ativo) { setStatus(json); setDados(json.cadastro); }
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar o cadastro.');
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    void carregar();
    return () => { ativo = false; };
  }, [aberto, empresaId, statusInicial]);

  if (!aberto) return null;

  const pessoal = status?.tipoPerfil === 'pessoal';
  const autonomo = dados.tipo_empresa === 'autonomo';
  const tipoDocumento = pessoal || autonomo ? 'CPF' : 'CNPJ';
  const set = <K extends keyof CadastroPerfil>(campo: K, valor: CadastroPerfil[K]) => setDados((atual) => ({ ...atual, [campo]: valor }));
  const input = 'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 disabled:bg-slate-100 disabled:text-slate-400';
  const label = 'grid gap-1 text-[11px] font-bold text-slate-600';

  const buscarCep = async () => {
    const cep = dados.cep.replace(/\D/g, '');
    if (cep.length !== 8) { setErro('Informe um CEP com 8 dígitos.'); return; }
    setBuscandoCep(true); setErro('');
    try {
      const resposta = await fetch(`/api/cep?cep=${cep}`);
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem);
      setDados((atual) => ({ ...atual, cep, rua: json.rua, bairro: json.bairro, cidade: json.cidade, estado: json.estado, complemento: atual.complemento || json.complemento || '' }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'CEP não encontrado. Preencha manualmente.');
    } finally { setBuscandoCep(false); }
  };

  const salvarRascunhoAutomatico = async (rascunho: CadastroPerfil) => {
    if (autoSaveEmAndamento.current) {
      autoSavePendente.current = rascunho;
      return;
    }

    autoSaveEmAndamento.current = true;
    setStatusAutoSave('Salvando alterações...');
    try {
      const { data: sessao } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = sessao.session?.access_token;
      const resposta = await fetch('/api/perfil-cadastro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ empresaId, dados: rascunho, concluir: false }),
      });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível salvar automaticamente.');
      setStatus(json);
      setStatusAutoSave('Alterações salvas automaticamente.');
    } catch (e) {
      setStatusAutoSave(e instanceof Error ? e.message : 'Não foi possível salvar automaticamente.');
    } finally {
      autoSaveEmAndamento.current = false;
      const pendente = autoSavePendente.current;
      autoSavePendente.current = null;
      if (pendente) void salvarRascunhoAutomatico(pendente);
    }
  };

  const salvar = async () => {
    setSalvando(true); setErro('');
    try {
      while (autoSaveEmAndamento.current) {
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }
      const { data: sessao } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = sessao.session?.access_token;
      const resposta = await fetch('/api/perfil-cadastro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ empresaId, dados, concluir: true }),
      });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível concluir o cadastro.');
      setStatus(json); setDados(json.cadastro);
      await onConcluido(json, json.cobranca);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir o cadastro.');
    } finally { setSalvando(false); }
  };

  const lembrarDepois = async () => {
    onLembrarDepois?.();
  };

  const salvarParcial = async () => {
    setSalvando(true); setErro('');
    try {
      const { data: sessao } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = sessao.session?.access_token;
      const resposta = await fetch('/api/perfil-cadastro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ empresaId, dados, concluir: false }),
      });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível salvar as informações.');
      setStatus(json); setDados(json.cadastro);
      onLembrarDepois?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar as informações.');
    } finally { setSalvando(false); }
  };

  const titulo = contexto === 'lembrete'
    ? 'Complete o cadastro do perfil'
    : contexto === 'paywall'
      ? `Dados para cadastro e assinatura ${ciclo === 'anual' ? 'anual' : 'mensal'}`
      : contexto === 'edicao'
        ? 'Editar cadastro do perfil'
        : 'Complete seu cadastro para continuar o uso do sistema AvantaLab Gestão';

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/70 px-3 py-4" role="dialog" aria-modal="true">
      <section className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="shrink-0 bg-[#003E73] px-4 py-3 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Cadastro do perfil</p>
          <h2 className="mt-0.5 text-base font-black leading-tight sm:text-lg">{titulo}</h2>
          {contexto === 'lembrete' && <p className="mt-1 text-xs text-white/80">Faltam {status?.diasRestantes ?? 7} dias para este cadastro se tornar obrigatório.</p>}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {carregando ? <p className="py-12 text-center text-sm font-bold text-slate-500">Carregando cadastro...</p> : !status?.podeEditar ? (
            <div className="py-10 text-center">
              <p className="text-base font-black text-slate-900">Cadastro pendente</p>
              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">O cadastro deste perfil precisa ser concluído por um Gestor Master ou Administrador para continuar.</p>
            </div>
          ) : (
            <div
              className="grid gap-4"
              onBlur={(evento) => {
                if (!(evento.target instanceof HTMLInputElement || evento.target instanceof HTMLSelectElement)) return;
                void salvarRascunhoAutomatico(dados);
              }}
            >
              <div>
                <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-sky-800">Dados Gerais</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={label}>{pessoal ? 'Nome do perfil' : 'Nome Fantasia'}<input className={input} value={dados.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} /></label>
                  <label className={label}>{pessoal ? 'Nome completo' : 'Responsável'}<input className={input} value={dados.nome_responsavel} onChange={(e) => set('nome_responsavel', e.target.value)} /></label>
                  {!pessoal && <label className={label}>Razão Social<input className={input} value={dados.razao_social} onChange={(e) => set('razao_social', e.target.value)} /></label>}
                  {!pessoal && <label className={label}>Tipo de Empresa<select className={input} value={dados.tipo_empresa} onChange={(e) => setDados((atual) => ({ ...atual, tipo_empresa: e.target.value, documento: '' }))}><option value="">Selecione</option>{TIPOS_EMPRESA.map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></label>}
                  <label className={label}>{tipoDocumento}<input className={input} inputMode="numeric" value={dados.documento} onChange={(e) => set('documento', e.target.value.replace(/\D/g, '').slice(0, tipoDocumento === 'CPF' ? 11 : 14))} /></label>
                </div>
              </div>

              <div>
                <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-sky-800">Endereço</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className={label}>CEP<span className="flex gap-1"><input className={input} inputMode="numeric" value={dados.cep} onChange={(e) => set('cep', e.target.value.replace(/\D/g, '').slice(0, 8))} /><button type="button" onClick={buscarCep} className="h-9 shrink-0 rounded-lg bg-sky-700 px-3 text-xs font-black text-white">{buscandoCep ? '...' : 'Buscar'}</button></span></label>
                  <label className={`${label} lg:col-span-2`}>Rua<input className={input} value={dados.rua} onChange={(e) => set('rua', e.target.value)} /></label>
                  <label className={label}>Número<input className={input} value={dados.numero} onChange={(e) => set('numero', e.target.value)} /></label>
                  <label className={label}>Complemento (opcional)<input className={input} value={dados.complemento} onChange={(e) => set('complemento', e.target.value)} /></label>
                  <label className={label}>Bairro<input className={input} value={dados.bairro} onChange={(e) => set('bairro', e.target.value)} /></label>
                  <label className={label}>Cidade<input className={input} value={dados.cidade} onChange={(e) => set('cidade', e.target.value)} /></label>
                  <label className={label}>Estado<select className={input} value={dados.estado} onChange={(e) => set('estado', e.target.value)}><option value="">UF</option>{ESTADOS_BRASIL.map((uf) => <option key={uf}>{uf}</option>)}</select></label>
                </div>
              </div>

              <div>
                <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-sky-800">Contato</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={label}>Telefone<input className={input} inputMode="tel" value={dados.telefone} onChange={(e) => set('telefone', e.target.value)} /></label>
                  <label className={label}>WhatsApp<input className={input} inputMode="tel" value={dados.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></label>
                  <label className={label}>E-mail {pessoal ? '' : 'da empresa'}<input className={input} type="email" value={dados.email_empresa} onChange={(e) => set('email_empresa', e.target.value)} /></label>
                  <label className={label}>Site (opcional)<input className={input} value={dados.site} onChange={(e) => set('site', e.target.value)} /></label>
                  <label className={label}>Instagram (opcional)<input className={input} value={dados.instagram} onChange={(e) => set('instagram', e.target.value)} /></label>
                </div>
              </div>

              {!pessoal && <div>
                <h3 className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-sky-800">Dados Fiscais</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={label}>Inscrição Estadual<span className="flex gap-2"><input disabled={dados.inscricao_estadual_isento} className={input} value={dados.inscricao_estadual} onChange={(e) => set('inscricao_estadual', e.target.value)} /><span className="flex items-center gap-1 text-xs"><input type="checkbox" checked={dados.inscricao_estadual_isento} onChange={(e) => setDados((a) => ({ ...a, inscricao_estadual_isento: e.target.checked, inscricao_estadual: e.target.checked ? '' : a.inscricao_estadual }))} />Isento</span></span></label>
                  <label className={label}>Inscrição Municipal<span className="flex gap-2"><input disabled={dados.inscricao_municipal_isento} className={input} value={dados.inscricao_municipal} onChange={(e) => set('inscricao_municipal', e.target.value)} /><span className="flex items-center gap-1 text-xs"><input type="checkbox" checked={dados.inscricao_municipal_isento} onChange={(e) => setDados((a) => ({ ...a, inscricao_municipal_isento: e.target.checked, inscricao_municipal: e.target.checked ? '' : a.inscricao_municipal }))} />Isento</span></span></label>
                  <label className={label}>Regime Tributário<select className={input} value={dados.regime_tributario} onChange={(e) => set('regime_tributario', e.target.value)}><option value="">Selecione</option>{REGIMES_TRIBUTARIOS.map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></label>
                </div>
              </div>}
            </div>
          )}
          {erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
          {statusAutoSave && <p className="mt-2 text-[11px] font-bold text-slate-500">{statusAutoSave}</p>}
        </div>

        <footer className={`shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3 ${contexto === 'lembrete' ? 'grid grid-cols-3 gap-1.5' : 'flex justify-end gap-2'}`}>
          {contexto === 'lembrete' && <button type="button" onClick={lembrarDepois} disabled={salvando} className="h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-1 text-[10px] font-bold text-slate-600 transition active:scale-95 disabled:opacity-60">Lembrar depois</button>}
          {contexto === 'lembrete' && status?.podeEditar && <button type="button" onClick={salvarParcial} disabled={salvando || carregando} className="h-9 min-w-0 rounded-lg border border-sky-200 bg-sky-50 px-1 text-[10px] font-black text-sky-800 transition active:scale-95 disabled:opacity-60">{salvando ? 'Salvando...' : 'Salvar inclusões'}</button>}
          {contexto === 'paywall' && <button type="button" onClick={onCancelar} className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-600">Voltar aos planos</button>}
          {contexto === 'edicao' && <button type="button" onClick={onCancelar} disabled={salvando} className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-600 disabled:opacity-60">Cancelar</button>}
          {status?.podeEditar && <button type="button" onClick={salvar} disabled={salvando || carregando} className={`h-9 min-w-0 rounded-lg bg-[#003E73] text-xs font-black text-white transition active:scale-95 disabled:opacity-60 ${contexto === 'lembrete' ? 'px-1 text-[10px]' : 'px-5'}`}>{salvando ? 'Salvando...' : contexto === 'paywall' ? 'Salvar e continuar' : contexto === 'edicao' ? 'Salvar alterações' : 'Concluir cadastro'}</button>}
        </footer>
      </section>
    </div>
  );
}

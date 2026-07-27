'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  ESTADOS_BRASIL,
  formatarDocumentoFiscal,
  REGIMES_TRIBUTARIOS,
  somenteDigitos,
  TIPOS_EMPRESA,
  validarCnpj,
  validarCpf,
  validarNomeCompleto,
  type CadastroPerfil,
  type StatusCadastroPerfil,
} from '../lib/cadastro-perfil';
import {
  aplicarCnpjAoCadastro,
  CAMPOS_CADASTRO_CNPJ,
  mapearCnpjParaCadastro,
  ROTULOS_CAMPOS_CADASTRO_CNPJ,
  type DadosCnpjParaCadastro,
} from '../../lib/consultas/mappers/cadastro-perfil';
import type {
  ConsultaCnpjResponse,
  EmpresaConsultada,
} from '../../lib/consultas/types';
import { formatarCnpjParaExibicao } from '../../lib/consultas/validators/cnpj';

type DadosCobranca = { nome: string; cpfCnpj: string; email: string; telefone: string };

type ConsultaCadastroCnpj = {
  empresa: EmpresaConsultada;
  dados: DadosCnpjParaCadastro;
};

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
  const documentoId = useId();
  const consultaCnpjErroId = `${documentoId}-consulta-erro`;
  const [status, setStatus] = useState<StatusCadastroPerfil | null>(statusInicial || null);
  const [dados, setDados] = useState<CadastroPerfil>(statusInicial?.cadastro || VAZIO);
  const [carregando, setCarregando] = useState(!statusInicial);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [consultaCnpj, setConsultaCnpj] = useState<ConsultaCadastroCnpj | null>(null);
  const [consultaCnpjErro, setConsultaCnpjErro] = useState('');
  const [consultaCnpjSucesso, setConsultaCnpjSucesso] = useState('');
  const [substituirDadosCnpj, setSubstituirDadosCnpj] = useState(false);
  const [erro, setErro] = useState('');
  const [statusAutoSave, setStatusAutoSave] = useState('');
  const [documentoTocado, setDocumentoTocado] = useState(false);
  const [nomeCompletoTocado, setNomeCompletoTocado] = useState(false);
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
  const planoConsultaCnpj = consultaCnpj
    ? aplicarCnpjAoCadastro(dados, consultaCnpj.dados, substituirDadosCnpj)
    : null;
  const camposPreenchidosCnpj = consultaCnpj
    ? aplicarCnpjAoCadastro(dados, consultaCnpj.dados, false).camposPreservados
    : [];
  const camposDisponiveisCnpj = consultaCnpj
    ? CAMPOS_CADASTRO_CNPJ.filter((campo) => consultaCnpj.dados[campo])
    : [];
  const tipoDocumentoNormalizado = tipoDocumento === 'CPF' ? 'cpf' : 'cnpj';
  const limiteDocumento = tipoDocumento === 'CPF' ? 11 : 14;
  const documentoDigitos = somenteDigitos(dados.documento, limiteDocumento);
  const documentoValido = tipoDocumento === 'CPF'
    ? validarCpf(documentoDigitos)
    : validarCnpj(documentoDigitos);
  const documentoInvalido = documentoTocado && documentoDigitos.length > 0 && !documentoValido;
  const mensagemDocumento = documentoDigitos.length !== limiteDocumento
    ? `Informe um ${tipoDocumento} com ${limiteDocumento} dígitos.`
    : `${tipoDocumento} inválido. Confira os números informados.`;
  const nomeCompletoInvalido = Boolean(
    nomeCompletoTocado && dados.nome_responsavel.trim() && !validarNomeCompleto(dados.nome_responsavel)
  );
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

  const limparRetornoCnpj = () => {
    setConsultaCnpj(null);
    setConsultaCnpjErro('');
    setConsultaCnpjSucesso('');
    setSubstituirDadosCnpj(false);
  };

  const consultarCnpj = async () => {
    if (consultandoCnpj) return;
    if (!validarCnpj(dados.documento)) {
      setConsultaCnpj(null);
      setConsultaCnpjErro('Informe um CNPJ válido para continuar.');
      setConsultaCnpjSucesso('');
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setConsultandoCnpj(true);
    setConsultaCnpj(null);
    setConsultaCnpjErro('');
    setConsultaCnpjSucesso('');
    setSubstituirDadosCnpj(false);

    try {
      const resposta = await fetch('/api/consultas/cnpj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: dados.documento }),
        cache: 'no-store',
        signal: controller.signal,
      });
      const json = (await resposta.json().catch(() => null)) as ConsultaCnpjResponse | null;

      if (!resposta.ok || !json || !json.success) {
        const mensagem = json && !json.success
          ? json.error.message
          : 'O serviço de consulta está temporariamente indisponível.';
        throw new Error(mensagem);
      }

      const dadosConsultados = mapearCnpjParaCadastro(json.data);
      if (!Object.keys(dadosConsultados).length) {
        throw new Error('A empresa foi localizada, mas a fonte não retornou dados compatíveis com este cadastro.');
      }

      setConsultaCnpj({ empresa: json.data, dados: dadosConsultados });
    } catch (e) {
      const timeoutAtingido =
        controller.signal.aborted ||
        (e instanceof DOMException && e.name === 'AbortError');
      setConsultaCnpjErro(
        timeoutAtingido
          ? 'O serviço demorou mais que o esperado para responder. Tente novamente.'
          : e instanceof Error
            ? e.message
            : 'O serviço de consulta está temporariamente indisponível.',
      );
    } finally {
      window.clearTimeout(timeout);
      setConsultandoCnpj(false);
    }
  };

  const inserirDadosConsultados = () => {
    if (!consultaCnpj || !planoConsultaCnpj) return;
    if (!planoConsultaCnpj.camposAplicados.length) {
      setConsultaCnpjSucesso('Os dados disponíveis já estão preenchidos no cadastro.');
      return;
    }

    setDados(planoConsultaCnpj.dados);
    void salvarRascunhoAutomatico(planoConsultaCnpj.dados);
    setConsultaCnpj(null);
    setSubstituirDadosCnpj(false);
    setConsultaCnpjErro('');
    setConsultaCnpjSucesso(
      `${planoConsultaCnpj.camposAplicados.length} ${
        planoConsultaCnpj.camposAplicados.length === 1 ? 'campo foi inserido' : 'campos foram inseridos'
      }. O rascunho será salvo automaticamente; revise antes de concluir o cadastro.`,
    );
  };

  async function salvarRascunhoAutomatico(rascunho: CadastroPerfil) {
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
  }

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
                {pessoal ? (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(14rem,1fr)]">
                    <label className={label}>Nome do perfil<input className={input} value={dados.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} /></label>
                    <label className={label} htmlFor="cadastro-perfil-nome-completo">
                      Nome completo
                      <input
                        id="cadastro-perfil-nome-completo"
                        className={`${input} ${nomeCompletoInvalido ? '!border-red-500 focus:!border-red-600 focus:!ring-red-500/20' : ''}`}
                        value={dados.nome_responsavel}
                        aria-invalid={nomeCompletoInvalido}
                        aria-describedby={nomeCompletoInvalido ? 'cadastro-perfil-nome-completo-erro' : undefined}
                        onBlur={() => setNomeCompletoTocado(true)}
                        onChange={(e) => set('nome_responsavel', e.target.value)}
                      />
                      {nomeCompletoInvalido && (
                        <span id="cadastro-perfil-nome-completo-erro" className="text-[10px] font-bold text-red-600" role="alert">
                          Informe nome e sobrenome.
                        </span>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1.8fr)_minmax(14rem,0.85fr)]">
                      <label className={label}>Nome Fantasia<input className={input} value={dados.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} /></label>
                      <label className={label} htmlFor="cadastro-perfil-responsavel">
                        Responsável
                        <input
                          id="cadastro-perfil-responsavel"
                          className={`${input} ${nomeCompletoInvalido ? '!border-red-500 focus:!border-red-600 focus:!ring-red-500/20' : ''}`}
                          value={dados.nome_responsavel}
                          aria-invalid={nomeCompletoInvalido}
                          aria-describedby={nomeCompletoInvalido ? 'cadastro-perfil-responsavel-erro' : undefined}
                          onBlur={() => setNomeCompletoTocado(true)}
                          onChange={(e) => set('nome_responsavel', e.target.value)}
                        />
                        {nomeCompletoInvalido && (
                          <span id="cadastro-perfil-responsavel-erro" className="text-[10px] font-bold text-red-600" role="alert">
                            Informe nome e sobrenome.
                          </span>
                        )}
                      </label>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-[11rem_minmax(18rem,auto)_minmax(0,1fr)]">
                      <label className={label}>
                        Tipo de Empresa
                        <select
                          className={input}
                          value={dados.tipo_empresa}
                          onChange={(e) => {
                            limparRetornoCnpj();
                            setDocumentoTocado(false);
                            setDados((atual) => ({ ...atual, tipo_empresa: e.target.value, documento: '' }));
                          }}
                        >
                          <option value="">Selecione</option>
                          {TIPOS_EMPRESA.map(([v,n]) => <option key={v} value={v}>{n}</option>)}
                        </select>
                      </label>
                      <div className={label}>
                        <label htmlFor={documentoId}>{tipoDocumento}</label>
                        <span className="flex min-w-0 flex-col gap-1.5 sm:flex-row">
                          <input
                            id={documentoId}
                            className={`${input} ${documentoInvalido ? '!border-red-500 focus:!border-red-600 focus:!ring-red-500/20' : ''}`}
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder={tipoDocumento === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                            value={formatarDocumentoFiscal(dados.documento, tipoDocumentoNormalizado)}
                            aria-invalid={documentoInvalido || Boolean(consultaCnpjErro)}
                            aria-describedby={[
                              documentoInvalido ? 'cadastro-perfil-documento-erro' : '',
                              consultaCnpjErro ? consultaCnpjErroId : '',
                            ].filter(Boolean).join(' ') || undefined}
                            onBlur={() => setDocumentoTocado(true)}
                            onChange={(e) => {
                              limparRetornoCnpj();
                              set('documento', somenteDigitos(e.target.value, limiteDocumento));
                            }}
                            disabled={consultandoCnpj}
                          />
                          {tipoDocumento === 'CNPJ' && (
                            <button
                              type="button"
                              onClick={consultarCnpj}
                              disabled={consultandoCnpj || salvando}
                              className="min-h-11 w-full shrink-0 rounded-lg border border-sky-200 bg-sky-50 px-4 text-xs font-black text-sky-800 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-wait disabled:opacity-60 sm:min-h-9 sm:w-auto"
                              aria-label="Pesquisar dados cadastrais pelo CNPJ"
                            >
                              {consultandoCnpj ? 'Pesquisando…' : 'Pesquisar CNPJ'}
                            </button>
                          )}
                        </span>
                        {documentoInvalido && (
                          <span id="cadastro-perfil-documento-erro" className="text-[10px] font-bold text-red-600" role="alert">
                            {mensagemDocumento}
                          </span>
                        )}
                      </div>
                      <label className={label}>Razão Social<input className={input} value={dados.razao_social} onChange={(e) => set('razao_social', e.target.value)} /></label>
                    </div>
                  </div>
                )}

                <div className="mt-2" aria-live="polite">
                  {consultaCnpjErro && (
                    <p id={consultaCnpjErroId} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                      {consultaCnpjErro}
                    </p>
                  )}

                  {consultaCnpjSucesso && (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                      {consultaCnpjSucesso}
                    </p>
                  )}

                  {consultaCnpj && planoConsultaCnpj && (
                    <section className="rounded-lg border border-sky-200 bg-sky-50 p-3" aria-label="Dados encontrados pelo CNPJ">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-800">Dados encontrados</p>
                          <p className="mt-0.5 truncate text-sm font-black text-slate-900">
                            {consultaCnpj.empresa.nomeFantasia || consultaCnpj.empresa.razaoSocial || 'Empresa consultada'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-600">
                            {formatarCnpjParaExibicao(consultaCnpj.empresa.documento)}
                            {consultaCnpj.empresa.endereco.cidade ? ` · ${consultaCnpj.empresa.endereco.cidade}` : ''}
                            {consultaCnpj.empresa.endereco.uf ? `/${consultaCnpj.empresa.endereco.uf}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={limparRetornoCnpj}
                          className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                        >
                          Descartar
                        </button>
                      </div>

                      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                        Campos disponíveis: {camposDisponiveisCnpj.map((campo) => ROTULOS_CAMPOS_CADASTRO_CNPJ[campo]).join(', ')}.
                      </p>

                      {camposPreenchidosCnpj.length > 0 && (
                        <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md bg-white/75 px-2.5 py-2 text-[11px] font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={substituirDadosCnpj}
                            onChange={(e) => setSubstituirDadosCnpj(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-sky-700"
                          />
                          Substituir também os {camposPreenchidosCnpj.length} campos que já possuem conteúdo.
                        </label>
                      )}

                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={inserirDadosConsultados}
                          disabled={!planoConsultaCnpj.camposAplicados.length}
                          className="h-9 rounded-lg bg-[#003E73] px-4 text-[11px] font-black text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {planoConsultaCnpj.camposAplicados.length
                            ? `Inserir ${planoConsultaCnpj.camposAplicados.length} ${
                                planoConsultaCnpj.camposAplicados.length === 1 ? 'campo' : 'campos'
                              }`
                            : 'Dados já preenchidos'}
                        </button>
                      </div>
                    </section>
                  )}
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

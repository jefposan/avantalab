'use client';

import { useMemo, useRef, useState } from 'react';
import styles from '../recebimentos.module.css';
import type { Empresa, FrequenciaRecebimento, Subempresa } from './types';
import {
  FREQUENCIAS_RECEBIMENTO,
  formatarMoeda,
  formatarNomeProprio,
  formatarTelefone,
  formatarValorInput,
  parseValorBR,
  rotuloFrequenciaRecebimento,
  valorParaInput,
} from './helpers';

type DadosEmpresa = Omit<Empresa, 'id' | 'ativo'>;
type DadosSubempresa = Pick<Subempresa, 'nome' | 'endereco' | 'cep' | 'logradouro' | 'bairro' | 'cidade' | 'estado' | 'numero' | 'complemento' | 'responsavel' | 'valorCombinado' | 'frequenciaRecebimento' | 'configuracaoRecorrencia'>;

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  onAdicionarEmpresa: (dados: Omit<Empresa, 'id'>) => void;
  onEditarEmpresa: (id: string, dados: DadosEmpresa) => void;
  onExcluirEmpresa: (id: string) => void;
  onAlternarEmpresa: (id: string) => void;
  onAdicionarSubempresa: (dados: Omit<Subempresa, 'id'>) => void;
  onEditarSubempresa: (id: string, dados: DadosSubempresa) => void;
  onExcluirSubempresa: (id: string) => void;
  onAlternarSubempresa: (id: string) => void;
};

function IconeAcoes() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

export default function ListaEmpresas({
  empresas,
  subempresas,
  onAdicionarEmpresa,
  onEditarEmpresa,
  onExcluirEmpresa,
  onAlternarEmpresa,
  onAdicionarSubempresa,
  onEditarSubempresa,
  onExcluirSubempresa,
  onAlternarSubempresa,
}: Props) {
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});
  // Formulário de empresa: aberto para cadastro (novo) ou edição (id).
  const [formEmpresaAberto, setFormEmpresaAberto] = useState(false);
  const [editandoEmpresaId, setEditandoEmpresaId] = useState<string | null>(null);
  // Formulário de subempresa: empresa dona + id em edição (null = novo).
  const [subDe, setSubDe] = useState<string | null>(null);
  const [editandoSubId, setEditandoSubId] = useState<string | null>(null);
  // Grupo de ações aberto por toque (além do hover).
  const [acoesAbertas, setAcoesAbertas] = useState<Record<string, boolean>>({});
  // Exclusão em duas etapas dentro do formulário de edição.
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  // Busca fixa com filtro instantâneo.
  const [busca, setBusca] = useState('');
  const [erroEmpresa, setErroEmpresa] = useState('');
  const [erroSub, setErroSub] = useState('');

  // Referências dos blocos para rolar a empresa em edição ao topo do scroll.
  const blocosRef = useRef<Record<string, HTMLDivElement | null>>({});

  // Form empresa — todos os campos obrigatórios.
  const [eNome, setENome] = useState('');
  const [eResp, setEResp] = useState('');
  const [eTel, setETel] = useState('');
  const [eEmail, setEEmail] = useState('');

  // Form subempresa — todos os campos obrigatórios.
  const [sNome, setSNome] = useState('');
  const [sCep, setSCep] = useState('');
  const [sLogradouro, setSLogradouro] = useState('');
  const [sBairro, setSBairro] = useState('');
  const [sCidade, setSCidade] = useState('');
  const [sEstado, setSEstado] = useState('');
  const [sNumero, setSNumero] = useState('');
  const [sComplemento, setSComplemento] = useState('');
  const [sBuscandoCep, setSBuscandoCep] = useState(false);
  const [sResp, setSResp] = useState('');
  const [sValor, setSValor] = useState('');
  const [sFrequencia, setSFrequencia] = useState<Subempresa['frequenciaRecebimento']>('mensal');
  const [sDiasSemana, setSDiasSemana] = useState<number[]>([]);
  const [sDiaMes, setSDiaMes] = useState<number | null>(null);
  const [sMesInicio, setSMesInicio] = useState<number | null>(null);
  const [popupVencimento, setPopupVencimento] = useState<FrequenciaRecebimento | null>(null);

  const termo = busca.trim().toLowerCase();

  // Filtro instantâneo por letras/números: empresa (nome, responsável,
  // telefone, e-mail) e subempresas (nome, endereço, responsável).
  const empresasFiltradas = useMemo(() => {
    if (!termo) return empresas;
    return empresas.filter((emp) => {
      const alvoEmpresa = `${emp.nome} ${emp.responsavel} ${emp.telefone} ${emp.email}`.toLowerCase();
      if (alvoEmpresa.includes(termo)) return true;
      return subempresas.some(
        (s) => s.empresaId === emp.id && `${s.nome} ${s.endereco} ${s.responsavel}`.toLowerCase().includes(termo),
      );
    });
  }, [empresas, subempresas, termo]);

  function subsVisiveis(empresaId: string) {
    const subs = subempresas.filter((s) => s.empresaId === empresaId);
    if (!termo) return subs;
    const empresa = empresas.find((e) => e.id === empresaId);
    const empresaBate = empresa
      ? `${empresa.nome} ${empresa.responsavel} ${empresa.telefone} ${empresa.email}`.toLowerCase().includes(termo)
      : false;
    if (empresaBate) return subs;
    return subs.filter((s) => `${s.nome} ${s.endereco} ${s.responsavel}`.toLowerCase().includes(termo));
  }

  // Rola o bloco da empresa para o topo do corpo rolável, com fôlego para
  // não encostar no cabeçalho (scroll-margin-top no CSS).
  function focarBloco(empresaId: string) {
    window.setTimeout(() => {
      blocosRef.current[empresaId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  function alternarAcoes(id: string, ev: React.MouseEvent) {
    ev.stopPropagation();
    setAcoesAbertas((p) => ({ ...p, [id]: !p[id] }));
  }

  function limparFormEmpresa() {
    setENome(''); setEResp(''); setETel(''); setEEmail('');
    setErroEmpresa('');
    setConfirmandoExclusao(false);
    setFormEmpresaAberto(false);
    setEditandoEmpresaId(null);
  }

  function limparFormSub() {
    setSNome(''); setSCep(''); setSLogradouro(''); setSBairro(''); setSCidade(''); setSEstado(''); setSNumero(''); setSComplemento(''); setSResp(''); setSValor(''); setSFrequencia('mensal');
    setSDiasSemana([]); setSDiaMes(null); setSMesInicio(null);
    setPopupVencimento(null);
    setErroSub('');
    setConfirmandoExclusao(false);
    setSubDe(null);
    setEditandoSubId(null);
  }

  function abrirNovaEmpresa() {
    limparFormSub();
    setENome(''); setEResp(''); setETel(''); setEEmail('');
    setErroEmpresa('');
    setConfirmandoExclusao(false);
    setEditandoEmpresaId(null);
    setFormEmpresaAberto(true);
  }

  function abrirEdicaoEmpresa(emp: Empresa) {
    limparFormSub();
    setENome(emp.nome); setEResp(emp.responsavel); setETel(emp.telefone); setEEmail(emp.email);
    setErroEmpresa('');
    setConfirmandoExclusao(false);
    setEditandoEmpresaId(emp.id);
    setFormEmpresaAberto(true);
    setAcoesAbertas({});
    // A empresa em edição passa a ser o foco da lista.
    focarBloco(emp.id);
  }

  function abrirNovaSub(empresaId: string) {
    limparFormEmpresa();
    setSNome(''); setSCep(''); setSLogradouro(''); setSBairro(''); setSCidade(''); setSEstado(''); setSNumero(''); setSComplemento(''); setSResp(''); setSValor(''); setSFrequencia('mensal');
    setSDiasSemana([]); setSDiaMes(null); setSMesInicio(null);
    setPopupVencimento(null);
    setErroSub('');
    setConfirmandoExclusao(false);
    setEditandoSubId(null);
    setSubDe(empresaId);
  }

  function abrirEdicaoSub(s: Subempresa) {
    limparFormEmpresa();
    setSNome(s.nome);
    setSCep(s.cep);
    setSLogradouro(s.logradouro);
    setSBairro(s.bairro);
    setSCidade(s.cidade);
    setSEstado(s.estado);
    setSNumero(s.numero);
    setSComplemento(s.complemento);
    setSResp(s.responsavel);
    setSValor(valorParaInput(s.valorCombinado));
    setSFrequencia(s.frequenciaRecebimento);
    setSDiasSemana(s.configuracaoRecorrencia.diasSemana);
    setSDiaMes(s.configuracaoRecorrencia.diaMes);
    setSMesInicio(s.configuracaoRecorrencia.mesInicio);
    setPopupVencimento(null);
    setErroSub('');
    setConfirmandoExclusao(false);
    setEditandoSubId(s.id);
    setSubDe(s.empresaId);
    setExpandidas((p) => ({ ...p, [s.empresaId]: true }));
    setAcoesAbertas({});
    focarBloco(s.empresaId);
  }

  function salvarEmpresa() {
    setErroEmpresa('');
    // Todos os campos são obrigatórios.
    if (!eNome.trim() || !eResp.trim() || !eTel.trim() || !eEmail.trim()) {
      return setErroEmpresa('Preencha todos os campos: nome, responsável, telefone e e-mail.');
    }
    const dados: DadosEmpresa = { nome: eNome.trim(), responsavel: eResp.trim(), telefone: eTel.trim(), email: eEmail.trim() };
    if (editandoEmpresaId) {
      onEditarEmpresa(editandoEmpresaId, dados);
    } else {
      onAdicionarEmpresa({ ...dados, ativo: true });
    }
    limparFormEmpresa();
  }

  // Exclusão em duas etapas: o primeiro clique pede confirmação no próprio botão.
  function excluirEmpresaEmEdicao() {
    if (!editandoEmpresaId) return;
    if (!confirmandoExclusao) return setConfirmandoExclusao(true);
    onExcluirEmpresa(editandoEmpresaId);
    limparFormEmpresa();
  }

  function excluirSubEmEdicao() {
    if (!editandoSubId) return;
    if (!confirmandoExclusao) return setConfirmandoExclusao(true);
    onExcluirSubempresa(editandoSubId);
    limparFormSub();
  }

  function salvarSub(empresaId: string) {
    setErroSub('');
    const valor = parseValorBR(sValor);
    // Todos os campos são obrigatórios.
    if (!sNome.trim() || !sCep.trim() || !sLogradouro.trim() || !sBairro.trim() || !sCidade.trim() || !sEstado.trim() || !sNumero.trim() || !sResp.trim() || !sValor.trim() || !sFrequencia) {
      return setErroSub('Preencha todos os campos: nome, endereço, responsável, valor e recebimento.');
    }
    if (Number.isNaN(valor) || valor <= 0) return setErroSub('Informe um valor combinado maior que zero.');
    if (sFrequencia === 'semanal' && sDiasSemana.length === 0) return setErroSub('Selecione ao menos um dia da semana.');
    if (sFrequencia !== 'semanal' && !sDiaMes) return setErroSub('Selecione o dia do recebimento.');
    if (['trimestral', 'semestral', 'anual'].includes(sFrequencia) && !sMesInicio) return setErroSub('Selecione o mês inicial do recebimento.');

    const dados: DadosSubempresa = {
      nome: sNome.trim(),
      endereco: [sLogradouro.trim(), sNumero.trim(), sComplemento.trim(), sBairro.trim(), `${sCidade.trim()}/${sEstado.trim()}`].filter(Boolean).join(' · '),
      cep: sCep.trim(),
      logradouro: sLogradouro.trim(),
      bairro: sBairro.trim(),
      cidade: sCidade.trim(),
      estado: sEstado.trim().toUpperCase(),
      numero: sNumero.trim(),
      complemento: sComplemento.trim(),
      responsavel: sResp.trim(),
      valorCombinado: valor,
      frequenciaRecebimento: sFrequencia,
      configuracaoRecorrencia: { diasSemana: sDiasSemana, diaMes: sDiaMes, mesInicio: sMesInicio },
    };
    if (editandoSubId) {
      onEditarSubempresa(editandoSubId, dados);
    } else {
      onAdicionarSubempresa({
        empresaId,
        ...dados,
        shoppingGaleria: '', lojaSala: '',
        ativo: true,
      });
    }
    limparFormSub();
  }

  function mudarFrequencia(frequencia: FrequenciaRecebimento) {
    const mesmaFrequencia = sFrequencia === frequencia;
    setSFrequencia(frequencia);
    if (!mesmaFrequencia) {
      setSDiasSemana([]);
      setSDiaMes(null);
      setSMesInicio(null);
    }
    setPopupVencimento(frequencia === 'semanal' ? null : frequencia);
  }

  function alternarDiaSemana(dia: number) {
    setSDiasSemana((atual) => atual.includes(dia) ? atual.filter((item) => item !== dia) : [...atual, dia].sort());
  }

  function formatarCep(valor: string) {
    const digitos = valor.replace(/\D/g, '').slice(0, 8);
    return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
  }

  async function consultarCep(valor: string) {
    const cep = valor.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setSBuscandoCep(true);
    setErroSub('');
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const endereco = await resposta.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (!resposta.ok || endereco.erro) throw new Error('CEP não encontrado.');
      setSLogradouro(endereco.logradouro ?? '');
      setSBairro(endereco.bairro ?? '');
      setSCidade(endereco.localidade ?? '');
      setSEstado(endereco.uf ?? '');
    } catch (error) {
      setErroSub(error instanceof Error ? error.message : 'Não foi possível consultar o CEP.');
    } finally {
      setSBuscandoCep(false);
    }
  }

  function formRecorrencia() {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const precisaMes = ['trimestral', 'semestral', 'anual'].includes(sFrequencia);
    const popupAberto = popupVencimento === sFrequencia;
    function selecionarDia(dia: number) {
      setSDiaMes(dia);
      setPopupVencimento(null);
    }

    return (
      <div className={styles.recorrencia}>
        <div className={styles.formTitulo}>VENCIMENTO</div>
        <div className={styles.recorrenciaFrequencias} role="radiogroup" aria-label="Frequência de recebimento">
          {FREQUENCIAS_RECEBIMENTO.map(([valor, rotulo]) => (
            <button key={valor} type="button" className={`${styles.recorrenciaOpcao} ${sFrequencia === valor ? styles.recorrenciaOpcaoAtiva : ''}`} onClick={() => mudarFrequencia(valor)} aria-pressed={sFrequencia === valor}>{rotulo}</button>
          ))}
        </div>
        <div className={styles.recorrenciaConfig}>
          {sFrequencia === 'semanal' ? (
              <div className={styles.recorrenciaDias}>{dias.map((dia, indice) => <button key={dia} type="button" className={`${styles.recorrenciaDia} ${sDiasSemana.includes(indice) ? styles.recorrenciaDiaAtivo : ''}`} onClick={() => alternarDiaSemana(indice)} aria-pressed={sDiasSemana.includes(indice)}>{dia}</button>)}</div>
          ) : popupAberto ? (
              <div className={`${styles.recorrenciaPopup} ${styles.recorrenciaPopupDireto} ${precisaMes ? styles.recorrenciaPopupComMes : styles.recorrenciaPopupSemMes}`} role="dialog" aria-label="Configurar vencimento">
                {precisaMes && (
                  <div>
                    <div className={styles.recorrenciaPopupTitulo}>Mês inicial</div>
                    <div className={styles.recorrenciaMeses}>{meses.map((mes, indice) => <button key={mes} type="button" className={`${styles.recorrenciaEscolha} ${sMesInicio === indice + 1 ? styles.recorrenciaEscolhaAtiva : ''}`} onClick={() => setSMesInicio(indice + 1)}>{mes}</button>)}</div>
                  </div>
                )}
                <div>
                  <div className={styles.recorrenciaPopupTitulo}>{sFrequencia === 'quinzenal' ? 'Dia-base (intervalo de 15 dias)' : 'Dia do mês'}</div>
                  <div className={`${styles.recorrenciaDiasMes} ${sFrequencia === 'quinzenal' ? styles.recorrenciaDiasQuinzenal : ''} ${precisaMes ? styles.recorrenciaDiasComMes : styles.recorrenciaDiasSemMes}`}>{Array.from({ length: sFrequencia === 'quinzenal' ? 15 : 31 }, (_, indice) => indice + 1).map((dia) => <button key={dia} type="button" className={`${styles.recorrenciaEscolha} ${sDiaMes === dia ? styles.recorrenciaEscolhaAtiva : ''}`} onClick={() => selecionarDia(dia)}>{sFrequencia === 'quinzenal' ? `${dia}/${dia + 15}` : dia}</button>)}</div>
                </div>
              </div>
          ) : null}
        </div>
      </div>
    );
  }

  function camposEndereco() {
    return (
      <div className={styles.enderecoEstruturado}>
        <div className={styles.enderecoLinhaPrincipal}>
          <div className={`${styles.field} ${styles.enderecoCampoCep}`}><label className={styles.label}>CEP *</label><input className={styles.input} inputMode="numeric" placeholder="00000-000" value={sCep} onChange={(e) => setSCep(formatarCep(e.target.value))} onBlur={() => void consultarCep(sCep)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void consultarCep(sCep); } }} /><span className={styles.enderecoAjuda}>{sBuscandoCep ? 'Buscando endereço…' : 'Informe o CEP para preencher o endereço.'}</span></div>
          <div className={styles.field}><label className={styles.label}>Rua *</label><input className={styles.input} placeholder="Nome da rua" value={sLogradouro} onChange={(e) => setSLogradouro(e.target.value)} /></div>
          <div className={styles.field}><label className={styles.label}>Número *</label><input className={styles.input} placeholder="Número" value={sNumero} onChange={(e) => setSNumero(e.target.value)} /></div>
          <div className={styles.field}><label className={styles.label}>Complemento</label><input className={styles.input} placeholder="Sala, loja, bloco…" value={sComplemento} onChange={(e) => setSComplemento(e.target.value)} /></div>
          <div className={styles.field}><label className={styles.label}>Bairro *</label><input className={styles.input} placeholder="Bairro" value={sBairro} onChange={(e) => setSBairro(e.target.value)} /></div>
          <div className={styles.field}><label className={styles.label}>Cidade *</label><input className={styles.input} placeholder="Cidade" value={sCidade} onChange={(e) => setSCidade(e.target.value)} /></div>
          <div className={styles.field}><label className={styles.label}>UF *</label><input className={`${styles.input} ${styles.inputCentro}`} maxLength={2} placeholder="UF" value={sEstado} onChange={(e) => setSEstado(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())} /></div>
        </div>
      </div>
    );
  }

  function camposBasicosSubempresa() {
    return (
      <div className={styles.linhaEmpresaCampos}>
        <div className={styles.field}><label className={styles.label}>Nome da subempresa *</label><input className={styles.input} placeholder="Ex: Loja Renner" value={sNome} onChange={(e) => setSNome(formatarNomeProprio(e.target.value))} /></div>
        <div className={styles.field}><label className={styles.label}>Responsável *</label><input className={styles.input} placeholder="Ex: Gerente da loja" value={sResp} onChange={(e) => setSResp(formatarNomeProprio(e.target.value))} /></div>
        <div className={styles.field}><label className={styles.label}>Valor combinado *</label><input className={`${styles.input} ${styles.inputCentro}`} inputMode="decimal" placeholder="0,00" value={sValor} onChange={(e) => setSValor(formatarValorInput(e.target.value))} /></div>
      </div>
    );
  }

  function formEmpresa(edicao: boolean) {
    return (
      <div className={`${styles.subItem} ${styles.formCompacto} ${styles.blocoEditando}`} style={{ marginBottom: 10 }}>
        <div className={styles.formTitulo}>{edicao ? 'Editar empresa' : 'Nova empresa'}</div>
        <div className={styles.linhaEmpresaCampos}>
          <div className={styles.field}><label className={styles.label}>Nome da empresa *</label><input className={styles.input} placeholder="Ex: Shopping Morumbi" value={eNome} onChange={(e) => setENome(formatarNomeProprio(e.target.value))} /></div>
          <div className={styles.field}><label className={styles.label}>Responsável *</label><input className={styles.input} placeholder="Ex: Carla Menezes" value={eResp} onChange={(e) => setEResp(formatarNomeProprio(e.target.value))} /></div>
          <div className={styles.field}><label className={styles.label}>Contato *</label><input className={styles.input} inputMode="tel" placeholder="(11) 99999-9999" value={eTel} onChange={(e) => setETel(formatarTelefone(e.target.value))} /></div>
        </div>
        {/* E-mail e ações ficam na segunda linha. */}
        <div className={styles.linhaTelefoneAcoes}>
          <div className={styles.field} style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label className={styles.label}>E-mail *</label>
            <input className={styles.input} placeholder="Ex: financeiro@empresa.com.br" value={eEmail} onChange={(e) => setEEmail(e.target.value)} />
          </div>
          <div className={styles.acoesForm}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={limparFormEmpresa}>
              Cancelar
            </button>
            {edicao && (
              <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={excluirEmpresaEmEdicao}>
                {confirmandoExclusao ? 'Confirmar' : 'Excluir'}
              </button>
            )}
            <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={salvarEmpresa}>
              Salvar
            </button>
          </div>
        </div>
        {erroEmpresa && <div className={styles.aviso} style={{ marginTop: 8 }}>{erroEmpresa}</div>}
      </div>
    );
  }

  return (
    <div className={styles.listaShell}>
      <div className={styles.listaTopo}>
        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
          Empresas e subempresas{subDe && !editandoSubId && (
            <span className={styles.sectionTitleEmpresaPai}> — {empresas.find((empresa) => empresa.id === subDe)?.nome ?? ''}</span>
          )}
        </h3>
        <div className={styles.listaTopoAcoes}>
          <div className={styles.buscaFixa} role="search">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="6" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              className={styles.buscaFixaInput}
              placeholder="Pesquisar empresas…"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              aria-label="Pesquisar empresas e subempresas"
            />
            {busca && <button type="button" className={styles.buscaLimpar} onClick={() => setBusca('')} aria-label="Limpar pesquisa">×</button>}
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.listaAcaoPrincipal}`}
            onClick={() => (formEmpresaAberto && !editandoEmpresaId ? limparFormEmpresa() : abrirNovaEmpresa())}
          >
            {formEmpresaAberto && !editandoEmpresaId ? 'Fechar cadastro' : '+ Nova empresa'}
          </button>
        </div>
      </div>

      {/* Apenas esta área rola; o topo acima é estático (imune ao elástico). */}
      <div className={`${styles.listaRolavel} ${subDe && !editandoSubId ? styles.listaRolavelCadastro : ''}`}>
      {formEmpresaAberto && !editandoEmpresaId && formEmpresa(false)}

      {termo && empresasFiltradas.length === 0 && (
        <p className={styles.muted}>Nenhum resultado para “{busca.trim()}”.</p>
      )}

      {empresasFiltradas.map((emp) => {
        const subs = subsVisiveis(emp.id);
        const totalSubs = subempresas.filter((s) => s.empresaId === emp.id).length;
        const aberta = termo ? true : (expandidas[emp.id] ?? true);
        const editandoEsta = formEmpresaAberto && editandoEmpresaId === emp.id;
        const cadastroSubAtivo = subDe === emp.id && !editandoSubId;
        if (subDe && !editandoSubId && subDe !== emp.id) return null;
        return (
          <div
            key={emp.id}
            ref={(el) => { blocosRef.current[emp.id] = el; }}
            className={`${cadastroSubAtivo ? styles.cadastroSubShell : styles.empresaBloco} ${styles.blocoFoco} ${editandoEsta ? styles.blocoEditando : ''}`}
          >
            {!cadastroSubAtivo && <div className={styles.empresaHeader} onClick={() => setExpandidas((p) => ({ ...p, [emp.id]: !aberta }))}>
              <span style={{ transform: aberta ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', color: '#64748b', fontSize: 12 }}>▸</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.empresaNome}>{emp.nome}</div>
                <div className={styles.subMeta}>{emp.responsavel} · {emp.telefone} · {totalSubs} subempresa(s)</div>
              </div>
              <span className={`${styles.chip} ${emp.ativo ? styles.chipOn : styles.chipOff}`}>{emp.ativo ? 'Ativo' : 'Inativo'}</span>
              {/* Ações ocultas: surgem deslizando para a esquerda no hover/toque. */}
              <div
                className={`${styles.acoesGrupo} ${acoesAbertas[emp.id] ? styles.acoesGrupoAberto : ''}`}
                onClick={(ev) => ev.stopPropagation()}
              >
                <div className={styles.acoesBotoes}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={() => abrirEdicaoEmpresa(emp)}>
                    Editar
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={() => onAlternarEmpresa(emp.id)}>
                    {emp.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
                <button type="button" className={styles.acoesTrigger} onClick={(ev) => alternarAcoes(emp.id, ev)} aria-label={`Ações de ${emp.nome}`}>
                  <IconeAcoes />
                </button>
              </div>
            </div>}

            {editandoEsta && <div style={{ padding: '8px 12px 10px' }}>{formEmpresa(true)}</div>}

            {aberta && (
              <div className={`${styles.subLista} ${cadastroSubAtivo ? styles.subListaCadastro : ''}`}>
                {!cadastroSubAtivo && subs.map((s) =>
                  editandoSubId === s.id && subDe === emp.id ? (
                    <div key={s.id} className={`${styles.subItem} ${styles.formCompacto} ${styles.blocoEditando}`}>
                      <div className={styles.formTitulo}>Editar subempresa</div>
                      {camposBasicosSubempresa()}
                      {camposEndereco()}
                      {formRecorrencia()}
                      <div className={styles.linhaTelefoneAcoes}>
                        <div className={styles.acoesForm}>
                          <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={limparFormSub}>Cancelar</button>
                          <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={excluirSubEmEdicao}>
                            {confirmandoExclusao ? 'Confirmar' : 'Excluir'}
                          </button>
                          <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => salvarSub(emp.id)}>Salvar</button>
                        </div>
                      </div>
                      {erroSub && <div className={styles.aviso} style={{ marginTop: 8 }}>{erroSub}</div>}
                    </div>
                  ) : (
                    <div key={s.id} className={styles.subItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div className={styles.subNome}>{s.nome}</div>
                          <div className={styles.subMeta}>{s.endereco}</div>
                          <div className={styles.subMeta}>Responsável: {s.responsavel} · Recebimento {rotuloFrequenciaRecebimento(s.frequenciaRecebimento)} · {formatarMoeda(s.valorCombinado)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span className={`${styles.chip} ${s.ativo ? styles.chipOn : styles.chipOff}`}>{s.ativo ? 'Ativo' : 'Inativo'}</span>
                          <div className={`${styles.acoesGrupo} ${acoesAbertas[s.id] ? styles.acoesGrupoAberto : ''}`}>
                            <div className={styles.acoesBotoes}>
                              <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={() => abrirEdicaoSub(s)}>
                                Editar
                              </button>
                              <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={() => onAlternarSubempresa(s.id)}>
                                {s.ativo ? 'Desativar' : 'Ativar'}
                              </button>
                            </div>
                            <button type="button" className={styles.acoesTrigger} onClick={(ev) => alternarAcoes(s.id, ev)} aria-label={`Ações de ${s.nome}`}>
                              <IconeAcoes />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}

                {subDe === emp.id && !editandoSubId ? (
                  <div className={`${styles.subItem} ${styles.formCompacto} ${styles.formCadastroSub}`} style={{ background: '#f8fafc' }}>
                    <div className={styles.formTitulo}>Nova subempresa</div>
                    {camposBasicosSubempresa()}
                    {camposEndereco()}
                    {formRecorrencia()}
                    <div className={styles.linhaTelefoneAcoes}>
                      <div className={styles.acoesForm}>
                        <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={limparFormSub}>Cancelar</button>
                        <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => salvarSub(emp.id)}>Salvar</button>
                      </div>
                    </div>
                    {erroSub && <div className={styles.aviso} style={{ marginTop: 8 }}>{erroSub}</div>}
                  </div>
                ) : emp.ativo && subDe !== emp.id ? (
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnXs}`} style={{ justifySelf: 'end' }} onClick={() => abrirNovaSub(emp.id)}>
                    + Nova subempresa
                  </button>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

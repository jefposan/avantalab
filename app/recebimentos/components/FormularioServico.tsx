'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../recebimentos.module.css';
import type { AvaliacaoServico, Empresa, Servico, Subempresa, TipoNivelEndereco } from './types';
import type { PreparacaoRegistroServicoVoz } from '../voice/types';
import { dataLocalIso, formatarData } from './helpers';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  servicos: Servico[];
  selecaoInicial?: PreparacaoRegistroServicoVoz | null;
  onConfirmar: (empresaId: string, subempresaId: string | null, clienteNome: string, assinatura: string, avaliacao: AvaliacaoServico, observacao: string, servicoId?: string) => Promise<void> | void;
  onCancelar: () => void;
};

type Etapa = 'destino' | 'assinatura' | 'avaliacao' | 'regular';

const ROTULOS_NIVEL: Record<TipoNivelEndereco, string> = {
  andar: 'Andar', piso: 'Piso', subsolo: 'Subsolo', terreo: 'Térreo', mezanino: 'Mezanino', outro: 'Nível',
};

function chaveNivel(item: Subempresa) {
  return `${item.tipoNivel ?? 'sem-nivel'}:${item.identificacaoNivel.trim().toLocaleLowerCase('pt-BR')}`;
}

function rotuloNivel(item: Subempresa) {
  if (!item.tipoNivel) return 'Sem nível informado';
  return [ROTULOS_NIVEL[item.tipoNivel], item.identificacaoNivel.trim()].filter(Boolean).join(' ');
}

export default function FormularioServico({ empresas, subempresas, servicos, selecaoInicial, onConfirmar, onCancelar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('destino');
  const [empresaId, setEmpresaId] = useState(selecaoInicial?.companyId ?? '');
  const [subempresaId, setSubempresaId] = useState(selecaoInicial?.subcompanyId ?? '');
  const [servicoId, setServicoId] = useState(selecaoInicial?.serviceId ?? '');
  const [nivelSelecionado, setNivelSelecionado] = useState(() => {
    const subempresa = subempresas.find((item) => item.id === selecaoInicial?.subcompanyId);
    return subempresa ? chaveNivel(subempresa) : '';
  });
  const [clienteNome, setClienteNome] = useState('');
  const [assinatura, setAssinatura] = useState('');
  const [avaliacao, setAvaliacao] = useState<AvaliacaoServico | null>(null);
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const dialogoAssinatura = useRef<HTMLElement | null>(null);
  const cancelarAssinaturaRef = useRef<HTMLButtonElement | null>(null);
  const focoAntesAssinatura = useRef<HTMLElement | null>(null);
  const campoPisoRef = useRef<HTMLDivElement | null>(null);
  const listaClientesRef = useRef<HTMLElement | null>(null);
  const listaServicosRef = useRef<HTMLElement | null>(null);
  const campoAssinadorRef = useRef<HTMLDivElement | null>(null);
  const desenhando = useRef(false);
  const houveTraço = useRef(false);
  const [proximoCampoEmDestaque, setProximoCampoEmDestaque] = useState<'piso' | 'clientes' | 'servicos' | 'assinador' | null>(null);

  const hoje = dataLocalIso();
  const servicosDisponiveis = useMemo(() => servicos.filter((item) => item.dataProgramada <= hoje && (item.situacao === 'pendente' || item.situacao === 'atrasado')), [hoje, servicos]);
  const empresasAtivas = useMemo(() => empresas
    .filter((item) => item.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })), [empresas]);
  const empresa = useMemo(() => empresas.find((item) => item.id === empresaId) ?? null, [empresas, empresaId]);
  const subs = useMemo(() => subempresas.filter((item) => item.empresaId === empresaId && item.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })), [subempresas, empresaId]);
  const precisaSubempresa = empresa?.tipoCadastro === 'local_agrupador';
  const niveis = useMemo(() => Array.from(new Map(subs.map((item) => [chaveNivel(item), { chave: chaveNivel(item), rotulo: rotuloNivel(item) }])).values()).sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { sensitivity: 'base' })), [subs]);
  const escolherPiso = precisaSubempresa && subs.some((item) => item.tipoNivel != null || item.identificacaoNivel.trim() !== '');
  const subsNoNivel = useMemo(() => escolherPiso ? subs.filter((item) => chaveNivel(item) === nivelSelecionado) : subs, [escolherPiso, nivelSelecionado, subs]);
  const subempresa = useMemo(() => subsNoNivel.find((item) => item.id === subempresaId) ?? null, [subsNoNivel, subempresaId]);
  const servicoDisponivelParaSubempresa = (id: string) => servicosDisponiveis.some((item) => item.subempresaId === id);
  const proximoServicoParaSubempresa = (id: string) => servicos.filter((item) => item.subempresaId === id && item.situacao === 'pendente' && item.dataProgramada > hoje).sort((a, b) => a.dataProgramada.localeCompare(b.dataProgramada))[0] ?? null;
  const servicosDoDestino = useMemo(() => {
    if (!empresaId) return null;
    return servicosDisponiveis
      .filter((item) => item.empresaId === empresaId && (precisaSubempresa ? item.subempresaId === subempresaId : item.subempresaId == null))
      .sort((a, b) => a.dataProgramada.localeCompare(b.dataProgramada)
        || Number(a.tipoServico !== 'rotina') - Number(b.tipoServico !== 'rotina')
        || a.tipoServico.localeCompare(b.tipoServico));
  }, [empresaId, precisaSubempresa, servicosDisponiveis, subempresaId]);
  const servicoSelecionado = useMemo(() => servicosDoDestino?.find((item) => item.id === servicoId) ?? null, [servicoId, servicosDoDestino]);
  const destinoDefinido = Boolean(empresaId) && Boolean(servicoSelecionado) && (!precisaSubempresa || Boolean(subempresaId));
  const identificacaoEmpresa = [empresa?.nome, subempresa?.nome].filter(Boolean).join(' / ');
  const agendamentosManuaisDoDia = useMemo(() => servicos.filter((item) => item.empresaId === empresaId && item.dataProgramada === hoje && item.tipoServico !== 'rotina' && (item.situacao === 'pendente' || item.situacao === 'atrasado')).sort((a, b) => a.tipoServico.localeCompare(b.tipoServico)), [empresaId, hoje, servicos]);
  const rotuloTipoAgendado = (tipo: Servico['tipoServico']) => ({ interna: 'Interna', revisao: 'Revisão', extra: 'Extra', rotina: 'Rotina' })[tipo];

  useEffect(() => {
    if (!selecaoInicial) return;
    const subempresaSelecionada = subempresas.find((item) => item.id === selecaoInicial.subcompanyId);
    setEtapa('destino');
    setEmpresaId(selecaoInicial.companyId);
    setSubempresaId(selecaoInicial.subcompanyId ?? '');
    setServicoId(selecaoInicial.serviceId);
    setNivelSelecionado(subempresaSelecionada ? chaveNivel(subempresaSelecionada) : '');
    setClienteNome('');
    setAssinatura('');
    setAvaliacao(null);
    setObservacao('');
    setErro('');
    setProximoCampoEmDestaque('assinador');
  }, [selecaoInicial?.requestId]);

  useEffect(() => {
    if (etapa !== 'assinatura') return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelarAssinaturaRef.current?.focus();
    function manterFoco(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        cancelarAssinatura();
        return;
      }
      if (evento.key !== 'Tab') return;
      const foco = dialogoAssinatura.current?.querySelectorAll<HTMLElement>('button:not([disabled]), canvas[tabindex="0"]');
      if (!foco?.length) return;
      const primeiro = foco[0];
      const ultimo = foco[foco.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus(); }
      if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus(); }
    }
    document.addEventListener('keydown', manterFoco);
    return () => {
      document.removeEventListener('keydown', manterFoco);
      document.body.style.overflow = overflowAnterior;
    };
  }, [etapa]);

  useEffect(() => {
    if (!proximoCampoEmDestaque) return;
    const alvo = proximoCampoEmDestaque === 'piso'
      ? campoPisoRef.current
      : proximoCampoEmDestaque === 'clientes'
        ? listaClientesRef.current
        : proximoCampoEmDestaque === 'servicos'
          ? listaServicosRef.current
          : campoAssinadorRef.current;
    const respeitaMovimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const quadro = window.requestAnimationFrame(() => {
      alvo?.scrollIntoView({ behavior: respeitaMovimentoReduzido ? 'auto' : 'smooth', block: 'start' });
      if (proximoCampoEmDestaque === 'assinador') alvo?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
      setProximoCampoEmDestaque(null);
    });
    return () => window.cancelAnimationFrame(quadro);
  }, [proximoCampoEmDestaque]);

  function selecionarEmpresa(id: string) {
    const empresaEscolhida = empresas.find((item) => item.id === id);
    const possuiPiso = empresaEscolhida?.tipoCadastro === 'local_agrupador'
      && subempresas.some((item) => item.empresaId === id && item.ativo && (item.tipoNivel != null || item.identificacaoNivel.trim() !== ''));
    setEmpresaId(id); setSubempresaId(''); setServicoId(''); setNivelSelecionado(''); setErro('');
    setProximoCampoEmDestaque(empresaEscolhida?.tipoCadastro === 'local_agrupador' ? (possuiPiso ? 'piso' : 'clientes') : 'servicos');
  }
  function selecionarNivel(nivel: string) { setNivelSelecionado(nivel); setSubempresaId(''); setServicoId(''); setErro(''); setProximoCampoEmDestaque(nivel ? 'clientes' : null); }
  function selecionarServico(id: string) { const proximoId = servicoId === id ? '' : id; setServicoId(proximoId); setErro(''); setProximoCampoEmDestaque(proximoId ? 'assinador' : 'servicos'); }
  function ponto(evento: React.PointerEvent<HTMLCanvasElement>) {
    const alvo = evento.currentTarget;
    const area = alvo.getBoundingClientRect();
    return { x: (evento.clientX - area.left) * (alvo.width / area.width), y: (evento.clientY - area.top) * (alvo.height / area.height) };
  }
  function iniciarAssinatura(evento: React.PointerEvent<HTMLCanvasElement>) {
    const contexto = canvas.current?.getContext('2d');
    if (!contexto) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    const p = ponto(evento); contexto.beginPath(); contexto.moveTo(p.x, p.y); desenhando.current = true;
  }
  function desenhar(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const contexto = canvas.current?.getContext('2d'); if (!contexto) return;
    const p = ponto(evento); contexto.lineTo(p.x, p.y); contexto.stroke(); houveTraço.current = true;
  }
  function finalizarAssinatura() { desenhando.current = false; }
  function limparAssinatura() { const alvo = canvas.current; const contexto = alvo?.getContext('2d'); if (alvo && contexto) contexto.clearRect(0, 0, alvo.width, alvo.height); houveTraço.current = false; setAssinatura(''); }
  function avancarAssinatura() {
    if (!houveTraço.current || !canvas.current) return setErro('Peça ao cliente para assinar antes de avançar.');
    setAssinatura(canvas.current.toDataURL('image/png')); setErro(''); setEtapa('avaliacao');
  }
  function cancelarAssinatura() {
    limparAssinatura();
    setErro('');
    setEtapa('destino');
    requestAnimationFrame(() => focoAntesAssinatura.current?.focus());
  }
  function avancarDestino() {
    if (!empresa) return setErro('Selecione a empresa.');
    if (precisaSubempresa && !subempresaId) return setErro('Selecione o cliente.');
    if (!servicoSelecionado) return setErro('Selecione o serviço que será executado.');
    if (!clienteNome.trim()) return setErro('Informe o nome de quem recebeu o atendimento.');
    focoAntesAssinatura.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setErro(''); setEtapa('assinatura');
  }
  async function enviar(avaliacaoFinal: AvaliacaoServico, observacaoFinal = '') {
    if (!assinatura) return setEtapa('assinatura');
    setEnviando(true); setErro('');
    try { await onConfirmar(empresaId, precisaSubempresa ? subempresaId : null, clienteNome.trim(), assinatura, avaliacaoFinal, observacaoFinal.trim(), servicoSelecionado?.id); }
    catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível registrar o serviço.'); }
    finally { setEnviando(false); }
  }

  const assinaturaEmTelaCheia = etapa === 'assinatura' && typeof document !== 'undefined'
    ? createPortal(<div className={styles.assinaturaOverlay} role="presentation"><section ref={dialogoAssinatura} className={styles.assinaturaDialogo} role="dialog" aria-modal="true" aria-labelledby="servico-assinatura-titulo"><header className={styles.assinaturaCabecalho}><h2 id="servico-assinatura-titulo">Assinatura de {clienteNome}</h2><p>Pela empresa: {identificacaoEmpresa}</p></header><div className={styles.assinaturaCorpo}><p className={styles.servicoEtapa}>Assinar na área abaixo:</p><canvas ref={canvas} tabIndex={0} className={styles.assinaturaCanvas} width="1600" height="900" aria-label="Área de assinatura do cliente" onPointerDown={iniciarAssinatura} onPointerMove={desenhar} onPointerUp={finalizarAssinatura} onPointerCancel={finalizarAssinatura} />{erro && <div className={styles.aviso} role="alert">{erro}</div>}</div><footer className={styles.assinaturaAcoes}><div className={styles.assinaturaAcoesSecundarias}><button ref={cancelarAssinaturaRef} type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={cancelarAssinatura}>Cancelar</button><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={limparAssinatura}>Limpar assinatura</button></div><button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={avancarAssinatura}>Avançar</button></footer></section></div>, document.body)
    : null;

  return <>
  <div className={styles.formularioServico}>
    {etapa === 'destino' && <>
      <div className={styles.field}><label className={styles.label} htmlFor="servico-empresa">Empresa</label><select id="servico-empresa" className={styles.select} value={empresaId} onChange={(event) => selecionarEmpresa(event.target.value)}><option value="">Selecione…</option>{empresasAtivas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div>
      {empresasAtivas.length === 0 && <div className={styles.aviso} role="status">Não há empresa ativa cadastrada.</div>}
      {agendamentosManuaisDoDia.length > 0 && <aside className={styles.alertaAgendamentoServico} role="status"><strong>Há {agendamentosManuaisDoDia.length === 1 ? 'um serviço agendado' : `${agendamentosManuaisDoDia.length} serviços agendados`} para executar hoje nesta empresa.</strong><span>{agendamentosManuaisDoDia.map((item) => `${rotuloTipoAgendado(item.tipoServico)}${item.subempresaId ? ` · ${subempresas.find((sub) => sub.id === item.subempresaId)?.nome ?? 'local'}` : ''}`).join(' · ')}</span><small>Agendamentos e serviços padrão são execuções independentes: selecione cada um para registrar separadamente.</small></aside>}
      {precisaSubempresa && escolherPiso && <div ref={campoPisoRef} className={styles.field}><label className={styles.label} htmlFor="servico-piso">Piso</label><select id="servico-piso" className={styles.select} value={nivelSelecionado} onChange={(event) => selecionarNivel(event.target.value)}><option value="">Selecione o piso…</option>{niveis.map((nivel) => <option key={nivel.chave} value={nivel.chave}>{nivel.rotulo}</option>)}</select></div>}
      {precisaSubempresa && (!escolherPiso || nivelSelecionado) && <section ref={listaClientesRef} className={styles.listaVisitasPiso} aria-labelledby="servico-clientes-piso"><div className={styles.listaVisitasPisoTitulo}><h3 id="servico-clientes-piso">Clientes deste piso{escolherPiso ? ` — ${niveis.find((nivel) => nivel.chave === nivelSelecionado)?.rotulo ?? ''}` : ''}</h3><span>{subsNoNivel.length}</span></div><p>Selecione o local e, em seguida, o serviço que será executado.</p><div className={styles.listaVisitasPisoItens} role="group" aria-label="Clientes disponíveis neste piso">{subsNoNivel.map((item) => { const servicosDoLocal = servicosDisponiveis.filter((servico) => servico.subempresaId === item.id); const disponivel = servicosDoLocal.length > 0; const proximo = proximoServicoParaSubempresa(item.id); const tiposAgendados = servicosDoLocal.filter((servico) => servico.tipoServico !== 'rotina').map((servico) => rotuloTipoAgendado(servico.tipoServico)); return <button key={item.id} type="button" className={styles.visitaPisoItem} disabled={!disponivel} aria-pressed={subempresaId === item.id} onClick={() => { const proximoId = subempresaId === item.id ? '' : item.id; setSubempresaId(proximoId); setServicoId(''); setProximoCampoEmDestaque(proximoId ? 'servicos' : 'clientes'); setErro(''); }}><strong>{item.nome}</strong><span>{item.endereco || rotuloNivel(item)}</span><small>{disponivel ? (subempresaId === item.id ? 'Selecionado · escolher serviço' : `${servicosDoLocal.length} ${servicosDoLocal.length === 1 ? 'serviço disponível' : 'serviços disponíveis'}${tiposAgendados.length ? ` · ${tiposAgendados.join(' / ')}` : ''}`) : proximo ? `Programado: ${formatarData(proximo.dataProgramada)}` : 'Sem serviço pendente'}</small></button>; })}</div></section>}
      {empresaId && !precisaSubempresa && servicosDoDestino?.length === 0 && <div className={styles.aviso} role="status">Não há serviço pendente para este cliente hoje.</div>}
      {servicosDoDestino && servicosDoDestino.length > 0 && <section ref={listaServicosRef} className={styles.listaServicosPendentes} aria-labelledby="servicos-a-executar"><div className={styles.listaVisitasPisoTitulo}><h3 id="servicos-a-executar">Serviços a executar</h3><span>{servicosDoDestino.length}</span></div><p>Selecione uma execução. Cada serviço exige seu próprio registro e assinatura.</p><div className={styles.listaServicosPendentesItens} role="group" aria-label="Serviços disponíveis para execução">{servicosDoDestino.map((item) => <button key={item.id} type="button" className={styles.servicoPendenteItem} aria-pressed={servicoId === item.id} onClick={() => selecionarServico(item.id)}><span><strong>{item.tipoServico === 'rotina' ? 'Serviço padrão' : 'Serviço agendado'}</strong><small>{item.dataProgramada === hoje ? 'Programado para hoje' : `Programado para ${formatarData(item.dataProgramada)}`}</small></span>{item.tipoServico === 'rotina' ? <em>Rotina</em> : <em className={`${styles.tipoServicoBadge} ${styles[`tipoServico${item.tipoServico[0].toUpperCase()}${item.tipoServico.slice(1)}`]}`}>{rotuloTipoAgendado(item.tipoServico)}</em>}<b>{servicoId === item.id ? 'Selecionado' : 'Selecionar'}</b></button>)}</div></section>}
      {destinoDefinido && <div ref={campoAssinadorRef} className={styles.field}><label className={styles.label} htmlFor="servico-cliente-nome">Nome de quem recebeu o atendimento</label><input id="servico-cliente-nome" className={styles.input} value={clienteNome} onChange={(event) => setClienteNome(event.target.value)} maxLength={160} placeholder="Nome completo" autoComplete="name" /></div>}
      <div className={styles.acoesServico}><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancelar}>Cancelar</button>{destinoDefinido && <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={avancarDestino}>Avançar para assinatura</button>}</div>
    </>}
    {etapa === 'avaliacao' && <section className={styles.avaliacaoServico}><h3>{clienteNome}, como foi o atendimento?</h3><p>Escolha uma das opções para finalizar:</p><div><button type="button" className={styles.avaliacaoBom} disabled={enviando} onClick={() => { setAvaliacao('bom'); void enviar('bom'); }}><span aria-hidden="true">✓</span><strong>Bom</strong><small>Bom atendimento</small></button><button type="button" className={styles.avaliacaoRegular} disabled={enviando} onClick={() => { setAvaliacao('regular'); setEtapa('regular'); }}><span aria-hidden="true">!</span><strong>Regular</strong><small>Atendimento regular</small></button></div></section>}
    {etapa === 'regular' && <section className={styles.avaliacaoServico}><h3>Nos conte sobre sua experiência</h3><textarea className={styles.input} rows={4} value={observacao} onChange={(event) => setObservacao(event.target.value)} placeholder="Opcional" maxLength={2000} /><div className={styles.acoesServico}><button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={enviando} onClick={() => void enviar('regular')}>Ignorar e enviar</button><button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={enviando} onClick={() => void enviar('regular', observacao)}>{enviando ? 'Enviando…' : 'Enviar avaliação'}</button></div></section>}
    {etapa !== 'assinatura' && erro && <div className={styles.aviso} role="alert">{erro}</div>}
  </div>
  {assinaturaEmTelaCheia}
  </>;
}

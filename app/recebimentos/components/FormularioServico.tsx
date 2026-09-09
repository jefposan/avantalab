'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../recebimentos.module.css';
import type { AvaliacaoServico, Empresa, Servico, Subempresa, TipoNivelEndereco } from './types';
import { dataLocalIso, formatarData } from './helpers';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  servicos: Servico[];
  onConfirmar: (empresaId: string, subempresaId: string | null, clienteNome: string, assinatura: string, avaliacao: AvaliacaoServico, observacao: string) => Promise<void> | void;
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

export default function FormularioServico({ empresas, subempresas, servicos, onConfirmar, onCancelar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('destino');
  const [empresaId, setEmpresaId] = useState('');
  const [subempresaId, setSubempresaId] = useState('');
  const [nivelSelecionado, setNivelSelecionado] = useState('');
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
  const desenhando = useRef(false);
  const houveTraço = useRef(false);

  const hoje = dataLocalIso();
  const servicosDisponiveis = useMemo(() => servicos.filter((item) => item.dataProgramada <= hoje && (item.situacao === 'pendente' || item.situacao === 'atrasado')), [hoje, servicos]);
  const proximoServico = useMemo(() => servicos.filter((item) => item.situacao === 'pendente' && item.dataProgramada > hoje).sort((a, b) => a.dataProgramada.localeCompare(b.dataProgramada))[0] ?? null, [hoje, servicos]);
  const empresasAtivas = useMemo(() => empresas.filter((item) => item.ativo && servicosDisponiveis.some((servico) => servico.empresaId === item.id && (item.tipoCadastro === 'cliente_direto' ? servico.subempresaId == null : servico.subempresaId != null))).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })), [empresas, servicosDisponiveis]);
  const empresa = useMemo(() => empresas.find((item) => item.id === empresaId) ?? null, [empresas, empresaId]);
  const subs = useMemo(() => subempresas.filter((item) => item.empresaId === empresaId && item.ativo && servicosDisponiveis.some((servico) => servico.subempresaId === item.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })), [subempresas, empresaId, servicosDisponiveis]);
  const precisaSubempresa = empresa?.tipoCadastro === 'local_agrupador';
  const niveis = useMemo(() => Array.from(new Map(subs.map((item) => [chaveNivel(item), { chave: chaveNivel(item), rotulo: rotuloNivel(item) }])).values()).sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { sensitivity: 'base' })), [subs]);
  const escolherPiso = precisaSubempresa && niveis.length > 1;
  const subsNoNivel = useMemo(() => escolherPiso ? subs.filter((item) => chaveNivel(item) === nivelSelecionado) : subs, [escolherPiso, nivelSelecionado, subs]);
  const subempresa = useMemo(() => subsNoNivel.find((item) => item.id === subempresaId) ?? null, [subsNoNivel, subempresaId]);
  const destinoDefinido = Boolean(empresaId) && (!precisaSubempresa || Boolean(subempresaId));
  const identificacaoEmpresa = [empresa?.nome, subempresa?.nome].filter(Boolean).join(' / ');

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

  function selecionarEmpresa(id: string) { setEmpresaId(id); setSubempresaId(''); setNivelSelecionado(''); setErro(''); }
  function selecionarNivel(nivel: string) { setNivelSelecionado(nivel); setSubempresaId(''); setErro(''); }
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
    if (!clienteNome.trim()) return setErro('Informe o nome de quem recebeu o atendimento.');
    focoAntesAssinatura.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setErro(''); setEtapa('assinatura');
  }
  async function enviar(avaliacaoFinal: AvaliacaoServico, observacaoFinal = '') {
    if (!assinatura) return setEtapa('assinatura');
    setEnviando(true); setErro('');
    try { await onConfirmar(empresaId, precisaSubempresa ? subempresaId : null, clienteNome.trim(), assinatura, avaliacaoFinal, observacaoFinal.trim()); }
    catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível registrar o serviço.'); }
    finally { setEnviando(false); }
  }

  const assinaturaEmTelaCheia = etapa === 'assinatura' && typeof document !== 'undefined'
    ? createPortal(<div className={styles.assinaturaOverlay} role="presentation"><section ref={dialogoAssinatura} className={styles.assinaturaDialogo} role="dialog" aria-modal="true" aria-labelledby="servico-assinatura-titulo"><header className={styles.assinaturaCabecalho}><h2 id="servico-assinatura-titulo">Assinatura de {clienteNome}</h2><p>Pela empresa: {identificacaoEmpresa}</p></header><div className={styles.assinaturaCorpo}><p className={styles.servicoEtapa}>Assinar na área abaixo:</p><canvas ref={canvas} tabIndex={0} className={styles.assinaturaCanvas} width="1600" height="900" aria-label="Área de assinatura do cliente" onPointerDown={iniciarAssinatura} onPointerMove={desenhar} onPointerUp={finalizarAssinatura} onPointerCancel={finalizarAssinatura} />{erro && <div className={styles.aviso} role="alert">{erro}</div>}</div><footer className={styles.assinaturaAcoes}><div className={styles.assinaturaAcoesSecundarias}><button ref={cancelarAssinaturaRef} type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={cancelarAssinatura}>Cancelar</button><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={limparAssinatura}>Limpar assinatura</button></div><button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={avancarAssinatura}>Avançar</button></footer></section></div>, document.body)
    : null;

  return <>
  <div className={styles.formularioServico}>
    {etapa === 'destino' && <>
      {servicosDisponiveis.length === 0 ? <div className={styles.aviso} role="status">Não há serviço pendente para registrar hoje.{proximoServico ? ` A próxima execução está programada para ${formatarData(proximoServico.dataProgramada)}.` : ''}</div> : <>
      <div className={styles.field}><label className={styles.label} htmlFor="servico-empresa">Empresa</label><select id="servico-empresa" className={styles.select} value={empresaId} onChange={(event) => selecionarEmpresa(event.target.value)}><option value="">Selecione…</option>{empresasAtivas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div>
      {precisaSubempresa && escolherPiso && <div className={styles.field}><label className={styles.label} htmlFor="servico-piso">Piso</label><select id="servico-piso" className={styles.select} value={nivelSelecionado} onChange={(event) => selecionarNivel(event.target.value)}><option value="">Selecione o piso…</option>{niveis.map((nivel) => <option key={nivel.chave} value={nivel.chave}>{nivel.rotulo}</option>)}</select></div>}
      {precisaSubempresa && (!escolherPiso || nivelSelecionado) && <section className={styles.listaVisitasPiso} aria-labelledby="servico-clientes-piso"><div className={styles.listaVisitasPisoTitulo}><h3 id="servico-clientes-piso">Clientes para visitar{escolherPiso ? ` — ${niveis.find((nivel) => nivel.chave === nivelSelecionado)?.rotulo ?? ''}` : ''}</h3><span>{subsNoNivel.length}</span></div><p>Selecione o cliente para registrar o atendimento.</p><div className={styles.listaVisitasPisoItens} role="group" aria-label="Clientes disponíveis para registro">{subsNoNivel.map((item) => <button key={item.id} type="button" className={styles.visitaPisoItem} aria-pressed={subempresaId === item.id} onClick={() => { setSubempresaId(item.id); setErro(''); }}><strong>{item.nome}</strong><span>{item.endereco || rotuloNivel(item)}</span><small>{subempresaId === item.id ? 'Selecionado' : 'Selecionar'}</small></button>)}</div></section>}
      {destinoDefinido && <div className={styles.field}><label className={styles.label} htmlFor="servico-cliente-nome">Nome de quem recebeu o atendimento</label><input id="servico-cliente-nome" className={styles.input} value={clienteNome} onChange={(event) => setClienteNome(event.target.value)} maxLength={160} placeholder="Nome completo" autoComplete="name" /></div>}
      <div className={styles.acoesServico}><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancelar}>Cancelar</button>{destinoDefinido && <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={avancarDestino}>Avançar para assinatura</button>}</div>
      </>}
    </>}
    {etapa === 'avaliacao' && <section className={styles.avaliacaoServico}><h3>{clienteNome}, como foi o atendimento?</h3><p>Escolha uma das opções para finalizar:</p><div><button type="button" className={styles.avaliacaoBom} disabled={enviando} onClick={() => { setAvaliacao('bom'); void enviar('bom'); }}><span aria-hidden="true">✓</span><strong>Bom</strong><small>Bom atendimento</small></button><button type="button" className={styles.avaliacaoRegular} disabled={enviando} onClick={() => { setAvaliacao('regular'); setEtapa('regular'); }}><span aria-hidden="true">!</span><strong>Regular</strong><small>Atendimento regular</small></button></div></section>}
    {etapa === 'regular' && <section className={styles.avaliacaoServico}><h3>Nos conte sobre sua experiência</h3><textarea className={styles.input} rows={4} value={observacao} onChange={(event) => setObservacao(event.target.value)} placeholder="Opcional" maxLength={2000} /><div className={styles.acoesServico}><button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={enviando} onClick={() => void enviar('regular')}>Ignorar e enviar</button><button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={enviando} onClick={() => void enviar('regular', observacao)}>{enviando ? 'Enviando…' : 'Enviar avaliação'}</button></div></section>}
    {etapa !== 'assinatura' && erro && <div className={styles.aviso} role="alert">{erro}</div>}
  </div>
  {assinaturaEmTelaCheia}
  </>;
}

'use client';

import { useMemo, useRef, useState } from 'react';
import styles from '../recebimentos.module.css';
import type { AvaliacaoServico, Empresa, Subempresa } from './types';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  onConfirmar: (empresaId: string, subempresaId: string | null, clienteNome: string, assinatura: string, avaliacao: AvaliacaoServico, observacao: string) => Promise<void> | void;
  onCancelar: () => void;
};

type Etapa = 'destino' | 'assinatura' | 'avaliacao' | 'regular';

export default function FormularioServico({ empresas, subempresas, onConfirmar, onCancelar }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('destino');
  const [empresaId, setEmpresaId] = useState('');
  const [subempresaId, setSubempresaId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [assinatura, setAssinatura] = useState('');
  const [avaliacao, setAvaliacao] = useState<AvaliacaoServico | null>(null);
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
  const houveTraço = useRef(false);

  const empresasAtivas = useMemo(() => empresas.filter((item) => item.ativo), [empresas]);
  const empresa = useMemo(() => empresas.find((item) => item.id === empresaId) ?? null, [empresas, empresaId]);
  const subs = useMemo(() => subempresas.filter((item) => item.empresaId === empresaId && item.ativo), [subempresas, empresaId]);
  const precisaSubempresa = empresa?.tipoCadastro === 'local_agrupador';

  function selecionarEmpresa(id: string) { setEmpresaId(id); setSubempresaId(''); setErro(''); }
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
  function avancarDestino() {
    if (!empresa) return setErro('Selecione a empresa.');
    if (precisaSubempresa && !subempresaId) return setErro('Selecione o cliente.');
    if (!clienteNome.trim()) return setErro('Informe o nome de quem recebeu o atendimento.');
    setErro(''); setEtapa('assinatura');
  }
  async function enviar(avaliacaoFinal: AvaliacaoServico, observacaoFinal = '') {
    if (!assinatura) return setEtapa('assinatura');
    setEnviando(true); setErro('');
    try { await onConfirmar(empresaId, precisaSubempresa ? subempresaId : null, clienteNome.trim(), assinatura, avaliacaoFinal, observacaoFinal.trim()); }
    catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível registrar o serviço.'); }
    finally { setEnviando(false); }
  }

  return <div className={styles.formularioServico}>
    {etapa === 'destino' && <>
      <div className={styles.field}><label className={styles.label} htmlFor="servico-empresa">Empresa</label><select id="servico-empresa" className={styles.select} value={empresaId} onChange={(event) => selecionarEmpresa(event.target.value)}><option value="">Selecione…</option>{empresasAtivas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div>
      {precisaSubempresa && <div className={styles.field}><label className={styles.label} htmlFor="servico-cliente">Cliente</label><select id="servico-cliente" className={styles.select} value={subempresaId} onChange={(event) => setSubempresaId(event.target.value)}><option value="">Selecione…</option>{subs.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div>}
      {empresaId && <div className={styles.field}><label className={styles.label} htmlFor="servico-cliente-nome">Nome de quem recebeu o atendimento</label><input id="servico-cliente-nome" className={styles.input} value={clienteNome} onChange={(event) => setClienteNome(event.target.value)} maxLength={160} placeholder="Nome completo" autoComplete="name" /></div>}
      <div className={styles.acoesServico}><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancelar}>Cancelar</button><button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={avancarDestino}>Avançar para assinatura</button></div>
    </>}
    {etapa === 'assinatura' && <>
      <p className={styles.servicoEtapa}>Peça para <b>{clienteNome}</b> assinar na área abaixo.</p>
      <canvas ref={canvas} className={styles.assinaturaCanvas} width="800" height="280" aria-label="Área de assinatura do cliente" onPointerDown={iniciarAssinatura} onPointerMove={desenhar} onPointerUp={finalizarAssinatura} onPointerCancel={finalizarAssinatura} />
      <div className={styles.acoesServico}><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={limparAssinatura}>Limpar assinatura</button><button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={avancarAssinatura}>Avançar</button></div>
    </>}
    {etapa === 'avaliacao' && <section className={styles.avaliacaoServico}><h3>{clienteNome}, como foi o atendimento?</h3><p>Escolha uma das opções para finalizar:</p><div><button type="button" className={styles.avaliacaoBom} disabled={enviando} onClick={() => { setAvaliacao('bom'); void enviar('bom'); }}>Bom</button><button type="button" className={styles.avaliacaoRegular} disabled={enviando} onClick={() => { setAvaliacao('regular'); setEtapa('regular'); }}>Regular</button></div></section>}
    {etapa === 'regular' && <section className={styles.avaliacaoServico}><h3>Nos conte sobre sua experiência</h3><textarea className={styles.input} rows={4} value={observacao} onChange={(event) => setObservacao(event.target.value)} placeholder="Opcional" maxLength={2000} /><div className={styles.acoesServico}><button type="button" className={`${styles.btn} ${styles.btnGhost}`} disabled={enviando} onClick={() => void enviar('regular')}>Ignorar e enviar</button><button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={enviando} onClick={() => void enviar('regular', observacao)}>{enviando ? 'Enviando…' : 'Enviar avaliação'}</button></div></section>}
    {erro && <div className={styles.aviso} role="alert">{erro}</div>}
  </div>;
}

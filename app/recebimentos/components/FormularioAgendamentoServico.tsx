'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../recebimentos.module.css';
import { dataLocalIso } from './helpers';
import SeletorDataAgendamento from './SeletorDataAgendamento';
import { TIPOS_AGENDAMENTO_SERVICO, type Empresa, type Servico, type Subempresa, type TipoNivelEndereco, type TipoServico } from './types';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  onConfirmar: (empresaId: string, subempresaId: string | null, dataProgramada: string, tipoServico: Exclude<TipoServico, 'rotina'>) => Promise<void> | void;
  onCancelar: () => void;
  agendamentoInicial?: Pick<Servico, 'empresaId' | 'subempresaId' | 'dataProgramada' | 'tipoServico'>;
  rotuloConfirmar?: string;
  rotuloSalvando?: string;
};

const ROTULOS_NIVEL: Record<TipoNivelEndereco, string> = { andar: 'Andar', piso: 'Piso', subsolo: 'Subsolo', terreo: 'Térreo', mezanino: 'Mezanino', outro: 'Nível' };
const chaveNivel = (item: Subempresa) => `${item.tipoNivel ?? 'sem-nivel'}:${item.identificacaoNivel.trim().toLocaleLowerCase('pt-BR')}`;
const rotuloNivel = (item: Subempresa) => !item.tipoNivel ? 'Sem nível informado' : [ROTULOS_NIVEL[item.tipoNivel], item.identificacaoNivel.trim()].filter(Boolean).join(' ');

export default function FormularioAgendamentoServico({ empresas, subempresas, onConfirmar, onCancelar, agendamentoInicial, rotuloConfirmar = 'Agendar serviço', rotuloSalvando = 'Agendando…' }: Props) {
  const [empresaId, setEmpresaId] = useState(agendamentoInicial?.empresaId ?? '');
  const [subempresaId, setSubempresaId] = useState(agendamentoInicial?.subempresaId ?? '');
  const [nivelSelecionado, setNivelSelecionado] = useState(() => {
    if (!agendamentoInicial?.subempresaId) return '';
    const subempresa = subempresas.find((item) => item.id === agendamentoInicial.subempresaId);
    return subempresa ? chaveNivel(subempresa) : '';
  });
  const [dataProgramada, setDataProgramada] = useState(agendamentoInicial?.dataProgramada ?? dataLocalIso());
  const [tipoServico, setTipoServico] = useState<Exclude<TipoServico, 'rotina'>>((agendamentoInicial?.tipoServico ?? 'interna') as Exclude<TipoServico, 'rotina'>);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const proximoRef = useRef<HTMLElement | null>(null);

  const empresasAtivas = useMemo(() => empresas.filter((item) => item.ativo && (item.tipoCadastro !== 'local_agrupador' || subempresas.some((subempresa) => subempresa.empresaId === item.id && subempresa.ativo))).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })), [empresas, subempresas]);
  const empresa = useMemo(() => empresas.find((item) => item.id === empresaId) ?? null, [empresas, empresaId]);
  const precisaSubempresa = empresa?.tipoCadastro === 'local_agrupador';
  const subs = useMemo(() => subempresas.filter((item) => item.empresaId === empresaId && item.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })), [empresaId, subempresas]);
  const escolherPiso = precisaSubempresa && subs.some((item) => item.tipoNivel != null || item.identificacaoNivel.trim() !== '');
  const niveis = useMemo(() => Array.from(new Map(subs.map((item) => [chaveNivel(item), { chave: chaveNivel(item), rotulo: rotuloNivel(item) }])).values()).sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { sensitivity: 'base' })), [subs]);
  const subsNoNivel = useMemo(() => escolherPiso ? subs.filter((item) => chaveNivel(item) === nivelSelecionado) : subs, [escolherPiso, nivelSelecionado, subs]);
  const destinoDefinido = Boolean(empresaId) && (!precisaSubempresa || Boolean(subempresaId));

  useEffect(() => {
    if (!proximoRef.current) return;
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const quadro = window.requestAnimationFrame(() => proximoRef.current?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' }));
    return () => window.cancelAnimationFrame(quadro);
  }, [empresaId, nivelSelecionado, subempresaId]);

  function selecionarEmpresa(id: string) {
    setEmpresaId(id); setSubempresaId(''); setNivelSelecionado(''); setErro('');
  }
  const guardarProximo = (elemento: HTMLElement | null) => { if (elemento) proximoRef.current = elemento; };

  async function salvar() {
    if (!empresaId || (precisaSubempresa && !subempresaId)) return setErro('Selecione a empresa e o local do atendimento.');
    if (!dataProgramada) return setErro('Informe a data do agendamento.');
    setSalvando(true); setErro('');
    try { await onConfirmar(empresaId, precisaSubempresa ? subempresaId : null, dataProgramada, tipoServico); }
    catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível criar o agendamento.'); }
    finally { setSalvando(false); }
  }

  return <div className={`${styles.formularioServico} ${styles.formularioAgendamento}`}>
    <div className={styles.field}>
      <label className={styles.label} htmlFor="agendamento-empresa">Empresa</label>
      <select id="agendamento-empresa" className={styles.select} value={empresaId} onChange={(event) => selecionarEmpresa(event.target.value)}>
        <option value="">Selecione…</option>{empresasAtivas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
      </select>
    </div>
    {precisaSubempresa && escolherPiso && <div ref={guardarProximo} className={styles.field}>
      <label className={styles.label} htmlFor="agendamento-piso">Piso</label>
      <select id="agendamento-piso" className={styles.select} value={nivelSelecionado} onChange={(event) => { setNivelSelecionado(event.target.value); setSubempresaId(''); setErro(''); }}>
        <option value="">Selecione o piso…</option>{niveis.map((nivel) => <option key={nivel.chave} value={nivel.chave}>{nivel.rotulo}</option>)}
      </select>
    </div>}
    {precisaSubempresa && (!escolherPiso || nivelSelecionado) && <section ref={guardarProximo} className={styles.listaVisitasPiso} aria-labelledby="agendamento-clientes">
      <div className={styles.listaVisitasPisoTitulo}><h3 id="agendamento-clientes">Clientes disponíveis{escolherPiso ? ` — ${niveis.find((item) => item.chave === nivelSelecionado)?.rotulo ?? ''}` : ''}</h3><span>{subsNoNivel.length}</span></div>
      <p>Selecione o local que receberá o serviço agendado.</p>
      <div className={styles.listaVisitasPisoItens} role="group" aria-label="Clientes para agendamento">{subsNoNivel.map((item) => <button key={item.id} type="button" className={styles.visitaPisoItem} aria-pressed={subempresaId === item.id} onClick={() => { setSubempresaId((atual) => atual === item.id ? '' : item.id); setErro(''); }}><strong>{item.nome}</strong><span>{item.endereco || rotuloNivel(item)}</span><small>{subempresaId === item.id ? 'Selecionado · desfazer' : 'Selecionar'}</small></button>)}</div>
    </section>}
    {destinoDefinido && <div ref={guardarProximo} className={styles.agendamentoCampos}>
      <div className={styles.field}><label className={styles.label} htmlFor="agendamento-data">Data</label><SeletorDataAgendamento id="agendamento-data" value={dataProgramada} min={dataLocalIso()} onChange={setDataProgramada} /></div>
      <div className={styles.field}><label className={styles.label} htmlFor="agendamento-tipo">Tipo do serviço</label><select id="agendamento-tipo" className={styles.select} value={tipoServico} onChange={(event) => setTipoServico(event.target.value as Exclude<TipoServico, 'rotina'>)}>{TIPOS_AGENDAMENTO_SERVICO.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></div>
    </div>}
    {erro && <div className={styles.aviso} role="alert">{erro}</div>}
    <div className={styles.acoesServico}><button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancelar} disabled={salvando}>Cancelar</button>{destinoDefinido && <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => void salvar()} disabled={salvando}>{salvando ? rotuloSalvando : rotuloConfirmar}</button>}</div>
  </div>;
}

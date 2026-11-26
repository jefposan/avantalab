'use client';

import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useAcessosNavegacao } from '@/app/hooks/useAcessosNavegacao';
import { atualizarAcessosNavegacao } from '@/app/lib/navegacao-acessos-cliente';
import { validarSessaoDoDispositivo } from '@/app/lib/sessao-acesso-cliente';
import { opcoesNavegacao } from '@/app/lib/seletor-modulos';
import { Icon } from '@/app/projetos/components/Icon';
import ModalConfirmacao from './ModalConfirmacao';
import CarregamentoDadosModulo from './CarregamentoDadosModulo';
import styles from './SeletorModulos.module.css';

type Props = { compact?: boolean; empresaId: string; moduloAtual: string; darkMode?: boolean; corPrimaria?: string; ocupado?: boolean; alteracoesPendentes?: boolean; salvarAntesDeSair?: () => Promise<boolean>; descricaoPendencia?: string };
const icons: Record<string, string> = { dashboard: 'grid', ponto: 'calendar', vendas_mobile: 'people', recebimentos_presencial: 'map', projetos: 'layout', custos: 'barcode', vendas: 'shoppingBag', marketplaces: 'storefront' };

/** Apresentação apenas: o controlador revalida cada destino antes da navegação. */
export function ListaDestinosNavegacao({ opcoes, moduloAtual, bloqueado, onSelecionar }: {
  opcoes: ReturnType<typeof opcoesNavegacao>; moduloAtual: string; bloqueado: boolean; onSelecionar: (id: string) => void;
}) {
  return <>{opcoes.map((opcao, index) => <Fragment key={opcao.id}>
    {opcao.id !== 'dashboard' && (index === 0 || opcoes[index - 1].id === 'dashboard') && <h2 className={styles.sectionLabel}>MÓDULOS</h2>}
    <button type="button" disabled={bloqueado || opcao.id === moduloAtual} aria-current={opcao.id === moduloAtual ? 'page' : undefined} onClick={() => onSelecionar(opcao.id)}>
      <Icon name={icons[opcao.id] || 'grid'} size={18} /><span><strong>{opcao.nome}</strong></span>{opcao.id === moduloAtual ? <b>Atual</b> : <Icon name="chevron" size={14} />}
    </button>
  </Fragment>)}</>;
}

export default function SeletorModulos({ compact = false, empresaId, moduloAtual, darkMode = false, corPrimaria = '#003E73', ocupado = false, alteracoesPendentes = false, salvarAntesDeSair, descricaoPendencia }: Props) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const { perfil, usuarioId, atualizar, erro: erroPreparacao } = useAcessosNavegacao(empresaId);
  const opcoes = opcoesNavegacao(perfil ? [perfil] : [], empresaId);
  const [pendente, setPendente] = useState('');
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const [posicao, setPosicao] = useState({ top: 0, right: 8 });
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLElement>(null);
  const pedido = useRef(0);
  const ocupadoAtual = useRef(ocupado);
  const ultimoDestino = useRef('');
  const navegacaoEmCurso = useRef(false);
  const id = useId();
  const tema = { '--seletor-brand': corPrimaria } as CSSProperties;

  useEffect(() => { setAberto(false); setPendente(''); setCarregando(false); navegacaoEmCurso.current = false; return () => { pedido.current += 1; }; }, [empresaId, usuarioId]);
  useEffect(() => { ocupadoAtual.current = ocupado; }, [ocupado]);
  useEffect(() => {
    const retomar = () => { navegacaoEmCurso.current = false; setCarregando(false); };
    window.addEventListener('pageshow', retomar);
    return () => window.removeEventListener('pageshow', retomar);
  }, []);
  useEffect(() => {
    if (!aberto) return;
    const posicionar = () => {
      const rect = botao.current?.getBoundingClientRect();
      if (rect) {
        const largura = Math.min(320, window.innerWidth - 16);
        setPosicao({ top: Math.min(rect.bottom + 8, window.innerHeight - 140), right: Math.max(8, window.innerWidth - Math.max(8, Math.min(rect.left, window.innerWidth - largura - 8)) - largura) });
      }
    };
    const fechar = () => { if (salvandoRef.current) return; pedido.current += 1; setAberto(false); botao.current?.focus(); };
    const tecla = (event: KeyboardEvent) => { if (event.key === 'Escape' && !(event.target as Element)?.closest?.('[role="alertdialog"]')) { event.preventDefault(); fechar(); } };
    const fora = (event: PointerEvent) => { if ((event.target as Element)?.closest?.('[role="alertdialog"]')) return; if (!painel.current?.contains(event.target as Node) && !botao.current?.contains(event.target as Node)) fechar(); };
    const foco = (event: FocusEvent) => { if (salvandoRef.current || (event.target as Element)?.closest?.('[role="alertdialog"]')) return; if (!painel.current?.contains(event.target as Node) && !botao.current?.contains(event.target as Node)) { pedido.current += 1; setAberto(false); } };
    posicionar();
    painel.current?.focus();
    window.addEventListener('resize', posicionar);
    window.addEventListener('scroll', posicionar, true);
    document.addEventListener('keydown', tecla);
    document.addEventListener('pointerdown', fora);
    document.addEventListener('focusin', foco);
    return () => { window.removeEventListener('resize', posicionar); window.removeEventListener('scroll', posicionar, true); document.removeEventListener('keydown', tecla); document.removeEventListener('pointerdown', fora); document.removeEventListener('focusin', foco); };
  }, [aberto]);

  async function consultar(destino: string, salvoNestaConfirmacao = false) {
    if (navegacaoEmCurso.current) return;
    navegacaoEmCurso.current = true;
    ultimoDestino.current = destino;
    const sequencia = ++pedido.current;
    setAberto(false); setPendente('');
    setCarregando(true); setErro('');
    let encaminhado = false;
    try {
      if (!usuarioId) throw new Error('Sua sessão não está disponível. Entre novamente.');
      const perfis = await atualizarAcessosNavegacao(empresaId, usuarioId, true);
      const lista = opcoesNavegacao(perfis, empresaId);
      if (sequencia !== pedido.current) return;
      if (destino) {
        const opcao = lista.find(item => item.id === destino);
        if (!opcao) throw new Error('Este destino não está mais disponível para seu perfil.');
        const sessao = await validarSessaoDoDispositivo(empresaId, 'entrar');
        if (sequencia !== pedido.current) return;
        if (!sessao.ok || !sessao.ativa) throw new Error(sessao.mensagem || 'Não foi possível confirmar a sessão deste dispositivo.');
        if (ocupadoAtual.current && !salvoNestaConfirmacao) throw new Error('Aguarde a conclusão da operação antes de trocar de módulo.');
        // Navegação de documento preserva beforeunload, inclusive dos editores em iframes.
        // O destino é sempre derivado do registro oficial, nunca de uma URL recebida.
        (window.top || window).location.assign(opcao.href);
        encaminhado = true;
      }
    } catch (error) {
      if (sequencia === pedido.current) {
        setErro(error instanceof Error ? error.message : 'Não foi possível consultar seus módulos.');
        setAberto(true);
      }
    } finally {
      // Mantém a preparação até a troca do documento, sem piscar a tela de origem.
      if (!encaminhado && sequencia === pedido.current) { navegacaoEmCurso.current = false; setCarregando(false); }
    }
  }

  async function salvarENavegar() {
    if (salvandoRef.current || !salvarAntesDeSair || ocupadoAtual.current) return;
    const destino = pendente;
    const sequencia = pedido.current;
    salvandoRef.current = true; setSalvando(true); setErro('');
    try {
      const salvo = await salvarAntesDeSair();
      if (sequencia !== pedido.current) return;
      if (salvo) await consultar(destino, true);
      else { setAberto(false); }
      setPendente('');
    } catch {
      if (sequencia === pedido.current) { setPendente(''); setErro('Não foi possível salvar. Seus dados continuam nesta tela; confira antes de sair.'); }
    } finally { salvandoRef.current = false; setSalvando(false); }
  }
  async function descartarENavegar() {
    if (salvandoRef.current || ocupadoAtual.current) return;
    salvandoRef.current = true; setSalvando(true);
    try { await consultar(pendente); }
    finally { salvandoRef.current = false; setSalvando(false); setPendente(''); }
  }

  return <>
    <button ref={botao} type="button" className={`${styles.trigger} ${compact ? styles.compact : ''} ${darkMode ? styles.dark : ''}`} style={tema} aria-label="Navegar" aria-expanded={aberto} aria-controls={aberto ? id : undefined} disabled={!empresaId || ocupado || carregando} title={ocupado ? 'Aguarde a conclusão da operação' : 'Navegar entre Dashboard e módulos'} onClick={() => { if (aberto) { pedido.current += 1; setAberto(false); } else { setErro(''); setAberto(true); } }}>
      <Icon name="grid" size={18} /><span>Navegar</span><Icon name="chevron" size={14} />
    </button>
    {aberto && createPortal(<nav data-product-focus-navigation id={id} ref={painel} tabIndex={-1} aria-label="Navegar para" className={`${styles.panel} ${darkMode ? styles.dark : ''}`} style={{ ...tema, ...posicao }}>
      <header><strong>Navegar para</strong></header>
      {erro && <div role="alert"><p>{erro}</p><button type="button" disabled={carregando} onClick={() => void consultar(ultimoDestino.current)}>Tentar novamente</button></div>}
      {!perfil && erroPreparacao && <div role="alert"><p>{erroPreparacao}</p><button type="button" onClick={() => void atualizar()}>Atualizar acessos</button></div>}
      {!carregando && !erro && !erroPreparacao && !opcoes.length && <p role="status">{perfil ? 'Nenhum destino disponível. Consulte o gestor.' : 'Preparando a lista de acessos em segundo plano…'}</p>}
      <ListaDestinosNavegacao opcoes={opcoes} moduloAtual={moduloAtual} bloqueado={carregando || ocupado} onSelecionar={destino => { if (alteracoesPendentes) setPendente(destino); else void consultar(destino); }} />
    </nav>, document.body)}
    {carregando && createPortal(<CarregamentoDadosModulo ativo titulo={`Preparando ${opcoes.find(opcao => opcao.id === ultimoDestino.current)?.nome || 'destino'}`} mensagem="Carregando os dados do módulo…" corPrimaria={corPrimaria} temaEscuro={darkMode} />, document.body)}
    {pendente && createPortal(<ModalConfirmacao aberto={Boolean(pendente)} titulo="Sair desta tela?" variante="alerta" mensagem={descricaoPendencia || 'Existem alterações não salvas nesta tela. Sair sem salvar descarta essas alterações.'} textoCancelar="Cancelar" textoConfirmar={salvarAntesDeSair ? 'Salvar e sair' : 'Sair sem salvar'} carregando={salvando} mostrarProgresso corPrimaria={corPrimaria} darkMode={darkMode} aoCancelar={() => { if (!salvandoRef.current) setPendente(''); }} aoConfirmar={salvarAntesDeSair ? salvarENavegar : descartarENavegar} acaoAdicional={salvarAntesDeSair ? {texto:'Sair sem salvar',aoClicar:descartarENavegar} : undefined} />, document.body)}
  </>;
}

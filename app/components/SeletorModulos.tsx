'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/app/lib/supabase';
import { validarSessaoDoDispositivo } from '@/app/lib/sessao-acesso-cliente';
import { REGISTRO_MODULOS } from '@/app/lib/modulos-registro';
import { opcoesSeletorModulos, type PerfilSeletorModulos } from '@/app/lib/seletor-modulos';
import { Icon } from '@/app/projetos/components/Icon';
import ModalConfirmacao from './ModalConfirmacao';
import styles from './SeletorModulos.module.css';

type Props = { empresaId: string; moduloAtual: string; darkMode?: boolean; corPrimaria?: string; ocupado?: boolean; alteracoesPendentes?: boolean };
const icons: Record<string, string> = { ponto: 'calendar', vendas_mobile: 'people', recebimentos_presencial: 'map', projetos: 'layout', custos: 'barcode', vendas: 'shoppingBag', marketplaces: 'storefront' };

export default function SeletorModulos({ empresaId, moduloAtual, darkMode = false, corPrimaria = '#003E73', ocupado = false, alteracoesPendentes = false }: Props) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [opcoes, setOpcoes] = useState<ReturnType<typeof opcoesSeletorModulos>>([]);
  const [pendente, setPendente] = useState('');
  const [posicao, setPosicao] = useState({ top: 0, right: 8 });
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLElement>(null);
  const pedido = useRef(0);
  const ocupadoAtual = useRef(ocupado);
  const id = useId();
  const atual = REGISTRO_MODULOS.find(modulo => modulo.id === moduloAtual);
  const tema = { '--seletor-brand': corPrimaria } as CSSProperties;

  useEffect(() => () => { pedido.current += 1; }, [empresaId]);
  useEffect(() => { ocupadoAtual.current = ocupado; }, [ocupado]);
  useEffect(() => {
    if (!aberto) return;
    const posicionar = () => {
      const rect = botao.current?.getBoundingClientRect();
      if (rect) {
        const largura = Math.min(410, window.innerWidth - 16);
        setPosicao({ top: Math.min(rect.bottom + 8, window.innerHeight - 140), right: Math.max(8, Math.min(window.innerWidth - rect.right, window.innerWidth - largura - 8)) });
      }
    };
    const fechar = () => { pedido.current += 1; setAberto(false); botao.current?.focus(); };
    const tecla = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); fechar(); } };
    const fora = (event: PointerEvent) => { if ((event.target as Element)?.closest?.('[role="alertdialog"]')) return; if (!painel.current?.contains(event.target as Node) && !botao.current?.contains(event.target as Node)) fechar(); };
    const foco = (event: FocusEvent) => { if ((event.target as Element)?.closest?.('[role="alertdialog"]')) return; if (!painel.current?.contains(event.target as Node) && !botao.current?.contains(event.target as Node)) { pedido.current += 1; setAberto(false); } };
    posicionar();
    painel.current?.focus();
    window.addEventListener('resize', posicionar);
    window.addEventListener('scroll', posicionar, true);
    document.addEventListener('keydown', tecla);
    document.addEventListener('pointerdown', fora);
    document.addEventListener('focusin', foco);
    return () => { window.removeEventListener('resize', posicionar); window.removeEventListener('scroll', posicionar, true); document.removeEventListener('keydown', tecla); document.removeEventListener('pointerdown', fora); document.removeEventListener('focusin', foco); };
  }, [aberto]);

  async function consultar(destino?: string) {
    const sequencia = ++pedido.current;
    setCarregando(true); setErro('');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Sua sessão expirou. Entre novamente.');
      const parametros = new URLSearchParams({ empresaId, logos: 'adiadas' });
      const response = await fetch(`/api/acessos-usuario?${parametros}`, { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.mensagem || 'Não foi possível consultar seus módulos.');
      const lista = opcoesSeletorModulos(Array.isArray(body.perfis) ? body.perfis as PerfilSeletorModulos[] : [], empresaId);
      if (sequencia !== pedido.current) return;
      setOpcoes(lista);
      if (destino) {
        const opcao = lista.find(item => item.id === destino);
        if (!opcao) throw new Error('Este módulo não está mais disponível para seu perfil.');
        const sessao = await validarSessaoDoDispositivo(empresaId, 'entrar');
        if (sequencia !== pedido.current) return;
        if (!sessao.ok || !sessao.ativa) throw new Error(sessao.mensagem || 'Não foi possível confirmar a sessão deste dispositivo.');
        if (ocupadoAtual.current) throw new Error('Aguarde a conclusão da operação antes de trocar de módulo.');
        // Navegação de documento preserva beforeunload, inclusive dos editores em iframes.
        // O destino é sempre derivado do registro oficial, nunca de uma URL recebida.
        (window.top || window).location.assign(opcao.href);
      }
    } catch (error) {
      if (sequencia === pedido.current) setErro(error instanceof Error ? error.message : 'Não foi possível consultar seus módulos.');
    } finally { if (sequencia === pedido.current) setCarregando(false); }
  }

  return <>
    <button ref={botao} type="button" className={`${styles.trigger} ${darkMode ? styles.dark : ''}`} style={tema} aria-label={`Trocar de módulo. Atual: ${atual?.nome || 'Módulos'}`} aria-expanded={aberto} aria-controls={aberto ? id : undefined} disabled={!empresaId || ocupado} title={ocupado ? 'Aguarde a conclusão da operação' : 'Trocar de módulo'} onClick={() => { if (aberto) { pedido.current += 1; setAberto(false); } else { setAberto(true); void consultar(); } }}>
      <Icon name="grid" size={18} /><span>{atual?.nome || 'Módulos'}</span><Icon name="chevron" size={14} />
    </button>
    {aberto && createPortal(<nav id={id} ref={painel} tabIndex={-1} aria-label="Trocar de módulo" className={`${styles.panel} ${darkMode ? styles.dark : ''}`} style={{ ...tema, ...posicao }}>
      <header><strong>Trocar de módulo</strong><small>Disponíveis neste perfil</small></header>
      {carregando && <p role="status">Consultando acessos…</p>}
      {erro && <div role="alert"><p>{erro}</p><button type="button" onClick={() => void consultar()}>Tentar novamente</button></div>}
      {!carregando && !erro && !opcoes.length && <p role="status">Nenhum módulo disponível. Consulte o gestor.</p>}
      {!erro && opcoes.map(opcao => <button type="button" key={opcao.id} disabled={carregando || ocupado || opcao.id === moduloAtual} aria-current={opcao.id === moduloAtual ? 'page' : undefined} onClick={() => { if (alteracoesPendentes) setPendente(opcao.id); else void consultar(opcao.id); }}>
        <Icon name={icons[opcao.id] || 'grid'} size={22} /><span><strong>{opcao.nome}</strong><small>{opcao.descricao}</small></span>{opcao.id === moduloAtual ? <b>Atual</b> : <Icon name="chevron" size={16} />}
      </button>)}
    </nav>, document.body)}
    <ModalConfirmacao aberto={Boolean(pendente)} titulo="Trocar de módulo?" mensagem="Existem alterações não salvas nesta tela. Se continuar, elas serão descartadas." textoCancelar="Continuar editando" textoConfirmar="Descartar e trocar" corPrimaria={corPrimaria} darkMode={darkMode} aoCancelar={() => setPendente('')} aoConfirmar={() => { const destino = pendente; setPendente(''); void consultar(destino); }} />
  </>;
}

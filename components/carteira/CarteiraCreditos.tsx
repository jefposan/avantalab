'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { formatarCentavos, VALORES_RECARGA_CENTAVOS } from '@/app/lib/carteira';
import styles from './carteira.module.css';

type Movimento = { id: string; tipo: string; valor_centavos: number; saldo_apos_centavos: number; descricao: string; criado_em: string };
type Recarga = { id: string; valor_centavos: number; status: string; invoice_url: string | null; criado_em: string };
type Empresa = { id: string; nome: string };

export default function CarteiraCreditos() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [saldo, setSaldo] = useState(0);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const [podeGerenciar, setPodeGerenciar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState('');

  const token = useCallback(async () => (await supabase.auth.getSession()).data.session?.access_token || '', []);
  const carregarEstado = useCallback(async (id: string) => {
    const acesso = await token();
    if (!acesso) { setMensagem('Entre no AvantaLab para acessar sua carteira.'); setCarregando(false); return; }
    const resposta = await fetch(`/api/carteira/estado?empresaId=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${acesso}` }, cache: 'no-store' });
    const json = await resposta.json().catch(() => null);
    if (!resposta.ok || !json?.success) { setMensagem(json?.message || 'Não foi possível carregar a carteira.'); setCarregando(false); return; }
    setSaldo(json.data.saldoCentavos); setMovimentos(json.data.movimentos); setRecargas(json.data.recargas); setPodeGerenciar(json.data.podeGerenciar); setCarregando(false);
  }, [token]);

  useEffect(() => { void (async () => {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { setMensagem('Entre no AvantaLab para acessar sua carteira.'); setCarregando(false); return; }
    const { data: vinculos } = await supabase.from('usuarios_empresa').select('empresa_id').eq('user_id', sessao.session.user.id).eq('status', 'ativo');
    const ids = (vinculos || []).map((item) => item.empresa_id);
    const { data: perfis } = ids.length ? await supabase.from('empresas').select('id,nome').in('id', ids) : { data: [] as Empresa[] };
    const lista = (perfis || []) as Empresa[]; setEmpresas(lista);
    const ultimo = localStorage.getItem('avantalab_mobile_ultimo_perfil_id');
    const escolhido = lista.find((item) => item.id === ultimo)?.id || lista[0]?.id || '';
    setEmpresaId(escolhido);
    if (escolhido) await carregarEstado(escolhido); else { setMensagem('Nenhum perfil ativo foi encontrado.'); setCarregando(false); }
  })(); }, [carregarEstado]);

  async function recarregar(valorCentavos: number) {
    if (criando || !empresaId) return; setCriando(valorCentavos); setMensagem('');
    try {
      const acesso = await token();
      const resposta = await fetch('/api/carteira/recargas', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${acesso}` }, body: JSON.stringify({ empresaId, valorCentavos }) });
      const json = await resposta.json().catch(() => null);
      if (!resposta.ok || !json?.success) throw new Error(json?.message || 'Não foi possível iniciar o pagamento.');
      window.open(json.data.invoiceUrl, '_blank', 'noopener,noreferrer');
      setMensagem('Pagamento aberto. Os créditos entram após a confirmação da Asaas.');
      await carregarEstado(empresaId);
    } catch (erro) { setMensagem(erro instanceof Error ? erro.message : 'Não foi possível iniciar o pagamento.'); }
    finally { setCriando(null); }
  }

  return <section className={styles.card} aria-labelledby="carteira-titulo">
    <header className={styles.header}><div><span>Conta AvantaLab</span><h1 id="carteira-titulo">Meus créditos</h1><p>Adicione saldo à sua carteira. Neste momento, os créditos podem ser usados nas consultas disponíveis.</p></div><Link href="/consulta">Ir para consultas</Link></header>
    {empresas.length > 1 && <label className={styles.seletor}>Perfil<select value={empresaId} onChange={(e) => { setEmpresaId(e.target.value); setCarregando(true); void carregarEstado(e.target.value); }}>{empresas.map((empresa) => <option value={empresa.id} key={empresa.id}>{empresa.nome}</option>)}</select></label>}
    {carregando ? <p className={styles.estado} aria-live="polite">Carregando carteira…</p> : mensagem && !empresaId ? <p className={styles.aviso}>{mensagem}</p> : <>
      <div className={styles.saldo}><span>Saldo disponível</span><strong>{formatarCentavos(saldo)}</strong><small>Créditos não expiram.</small></div>
      <div className={styles.bloco}><h2>Adicionar créditos</h2><p>Escolha um valor. Na página segura da Asaas você poderá pagar por Pix, boleto ou cartão.</p><div className={styles.valores}>{VALORES_RECARGA_CENTAVOS.map((valor) => <button type="button" key={valor} disabled={!podeGerenciar || criando !== null} onClick={() => recarregar(valor)}>{criando === valor ? 'Abrindo…' : formatarCentavos(valor)}</button>)}</div>{!podeGerenciar && <small>Somente gestores e administradores podem adicionar créditos.</small>}</div>
      {mensagem && <p className={styles.aviso} role="status">{mensagem}</p>}
      <div className={styles.bloco}><h2>Extrato</h2>{movimentos.length ? <ul className={styles.lista}>{movimentos.map((item) => <li key={item.id}><div><strong>{item.descricao}</strong><span>{new Date(item.criado_em).toLocaleString('pt-BR')}</span></div><b className={item.valor_centavos > 0 ? styles.positivo : styles.negativo}>{item.valor_centavos > 0 ? '+' : ''}{formatarCentavos(item.valor_centavos)}</b></li>)}</ul> : <p className={styles.vazio}>Nenhuma movimentação na carteira.</p>}</div>
      {recargas.some((item) => item.status === 'pendente') && <div className={styles.bloco}><h2>Pagamentos pendentes</h2><ul className={styles.lista}>{recargas.filter((item) => item.status === 'pendente').map((item) => <li key={item.id}><div><strong>{formatarCentavos(item.valor_centavos)}</strong><span>Aguardando confirmação</span></div>{item.invoice_url && <a href={item.invoice_url} target="_blank" rel="noreferrer">Abrir pagamento</a>}</li>)}</ul></div>}
    </>}
  </section>;
}

'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { CONSULTAS_CREDITO, formatarCentavos, type TipoConsultaCredito } from '@/app/lib/carteira';
import type { ResultadoConsultaCredito } from '@/lib/consultas/credito-types';
import styles from './credito.module.css';

type Empresa = { id: string; nome: string };
const tipos = Object.keys(CONSULTAS_CREDITO) as TipoConsultaCredito[];

export default function ConsultaCredito() {
  const params = useSearchParams();
  const inicial = params.get('tipo') as TipoConsultaCredito;
  const [tipo, setTipo] = useState<TipoConsultaCredito>(tipos.includes(inicial) ? inicial : 'credito_essencial');
  const [empresas, setEmpresas] = useState<Empresa[]>([]); const [empresaId, setEmpresaId] = useState('');
  const [documento, setDocumento] = useState(''); const [resultado, setResultado] = useState<ResultadoConsultaCredito | null>(null);
  const [erro, setErro] = useState(''); const [carregando, setCarregando] = useState(false); const emAndamento = useRef(false);
  const pacote = useMemo(() => CONSULTAS_CREDITO[tipo], [tipo]);

  useEffect(() => { void (async () => {
    const sessao = (await supabase.auth.getSession()).data.session;
    if (!sessao) { setErro('Entre no AvantaLab para realizar consultas de crédito.'); return; }
    const { data: vinculos } = await supabase.from('usuarios_empresa').select('empresa_id').eq('user_id', sessao.user.id).eq('status', 'ativo');
    const ids = (vinculos || []).map((item) => item.empresa_id); const { data } = ids.length ? await supabase.from('empresas').select('id,nome').in('id', ids) : { data: [] as Empresa[] };
    const lista = (data || []) as Empresa[]; setEmpresas(lista); const ultimo = localStorage.getItem('avantalab_mobile_ultimo_perfil_id'); setEmpresaId(lista.find((item) => item.id === ultimo)?.id || lista[0]?.id || '');
  })(); }, []);

  async function consultar(event: FormEvent) {
    event.preventDefault(); if (emAndamento.current) return; setErro(''); setResultado(null);
    if (!empresaId || documento.replace(/\D/g, '').length < 11) { setErro('Informe um CPF ou CNPJ válido para continuar.'); return; }
    emAndamento.current = true; setCarregando(true);
    try {
      const sessao = (await supabase.auth.getSession()).data.session; if (!sessao) throw new Error('Entre novamente para continuar.');
      const resposta = await fetch('/api/consultas/credito', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessao.access_token}`, 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ empresaId, documento, tipoConsulta: tipo }) });
      const json = await resposta.json().catch(() => null); if (!resposta.ok || !json?.success) throw new Error(json?.error?.message || 'Não foi possível concluir a consulta.'); setResultado(json.data);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir a consulta.'); }
    finally { emAndamento.current = false; setCarregando(false); }
  }

  return <section className={styles.card}>
    <div className={styles.actionsTopo}><Link href="/consulta">← Central de Consultas</Link><Link href="/creditos">Meus créditos</Link></div>
    <header><span>Análise empresarial</span><h1>Consulta de crédito</h1><p>Escolha o nível de análise e confirme o documento. O valor só é descontado quando a consulta é iniciada; falhas do fornecedor geram estorno automático.</p></header>
    {!resultado ? <form onSubmit={consultar} className={styles.form}>
      <fieldset><legend>Tipo de consulta</legend><div className={styles.tipos}>{tipos.map((item) => <label className={tipo === item ? styles.ativo : ''} key={item}><input type="radio" name="tipo" value={item} checked={tipo === item} onChange={() => setTipo(item)} /><strong>{CONSULTAS_CREDITO[item].nome}</strong><span>{formatarCentavos(CONSULTAS_CREDITO[item].precoCentavos)}</span></label>)}</div></fieldset>
      {empresas.length > 1 && <label>Perfil<select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>{empresas.map((empresa) => <option value={empresa.id} key={empresa.id}>{empresa.nome}</option>)}</select></label>}
      <label>CPF ou CNPJ<input value={documento} onChange={(e) => { setDocumento(e.target.value.slice(0, 24)); setErro(''); }} autoComplete="off" placeholder="Digite somente o documento" /></label>
      <div className={styles.confirmacao}><div><span>Valor da consulta</span><strong>{formatarCentavos(pacote.precoCentavos)}</strong></div><button type="submit" disabled={carregando || !empresaId}>{carregando ? 'Consultando…' : 'Confirmar consulta'}</button></div>
      {erro && <p className={styles.erro} role="alert">{erro}</p>}
      <small>Os dados apoiam a análise, mas não substituem a decisão responsável de crédito.</small>
    </form> : <div className={styles.resultado} id="relatorio-consulta-credito"><div className={styles.resultadoCabecalho}><div><span>{resultado.nomeConsulta}</span><h2>{resultado.tipoDocumento} {resultado.documento}</h2><p>Direct Data · {new Date(resultado.consultadoEm).toLocaleString('pt-BR')}</p></div><strong>{formatarCentavos(resultado.valorCentavos)}</strong></div>{resultado.fontes.map((fonte) => <section key={fonte.codigo}><h3>{fonte.nome}</h3><dl>{Object.entries(fonte.resumo).filter(([, valor]) => valor !== null && (!Array.isArray(valor) || valor.length > 0)).map(([chave, valor]) => <div key={chave}><dt>{chave.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</dt><dd>{typeof valor === 'object' ? <pre>{JSON.stringify(valor, null, 2)}</pre> : String(valor)}</dd></div>)}</dl></section>)}<div className={styles.resultadoAcoes}><button type="button" onClick={() => { setResultado(null); setDocumento(''); }}>Nova consulta</button><button type="button" onClick={() => window.print()}>Imprimir</button></div></div>}
  </section>;
}

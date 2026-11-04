'use client';
import { useRef, useState } from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { emptyFiscal, fiscalStateText } from '@/app/modules/marketplaces/fiscal-state';
import type { MarketplaceSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';
import { marketplaceClientRequest } from './Anunciados';
import styles from './sale-actions.module.css';

export default function SaleFiscalDocuments({ sale, companyId, canManage, dark, brand, onSaleUpdated }: { sale: MarketplaceSale; companyId: string; canManage: boolean; dark: boolean; brand: string; onSaleUpdated: (sale: MarketplaceSale) => void }) {
  const [busy, setBusy] = useState(''), [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState<'issue' | 'import' | null>(null);
  const [file, setFile] = useState<{ name: string; xml: string; replaceInvoiceId?: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const lock = useRef(false), input = useRef<HTMLInputElement>(null);
  const dce = sale.fiscal?.dce || emptyFiscal(), nfe = sale.fiscal?.nfe || emptyFiscal();
  const pending = sale.shipmentStatus === 'ready_to_ship' && sale.shipmentSubstatus === 'invoice_pending' && ['paid', 'confirmed', 'partially_refunded'].includes(sale.status);
  const canReplace = !!nfe.importedInvoiceId && sale.shipmentStatus === 'ready_to_ship' && ['invoice_pending', 'ready_to_print'].includes(sale.shipmentSubstatus || '');
  const fiscalBlocked = !!sale.dceRequested || !!nfe.requestedAt || !!nfe.receiptId || !!nfe.importedInvoiceId;
  const nfeProfile = sale.fiscal?.profile?.kind !== 'pf';
  async function consult() {
    const result = await marketplaceClientRequest('vendas/dce', { empresaId: companyId, connectionId: sale.connectionId, saleId: sale.id, action: 'refresh' });
    onSaleUpdated(result.sale);
  }
  async function run(action: 'consult' | 'issue' | 'import') {
    if (lock.current) return;
    lock.current = true; setBusy(action); setMessage('');
    try {
      if (action === 'consult') { await consult(); setMessage('Consulta concluída. Confira os estados fiscal e logístico separadamente.'); }
      else {
        const result = await marketplaceClientRequest('vendas/fiscal', { empresaId: companyId, connectionId: sale.connectionId, saleId: sale.id,
          action: action === 'issue' ? 'issue_nfe' : 'import_nfe', confirmed: true, faturadorConfigured: action === 'issue',
          ...(action === 'import' && file ? { xml: file.xml, replaceInvoiceId: file.replaceInvoiceId } : {}) });
        setMessage(String(result.message));
        onSaleUpdated({ ...sale, fiscal: { ...sale.fiscal, dce, nfe: { ...nfe, status: 'requested', requestedAt: new Date().toISOString(), receiptId: String(result.emissionId || '') || undefined, query: undefined } } });
        // O protocolo já existe no servidor; uma falha desta leitura não libera reenvio.
        try { await consult(); } catch { setMessage('Solicitação aceita. O retorno da consulta está indisponível; consulte novamente antes de repetir.'); }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir a consulta fiscal.');
      const code = (error as { code?: string })?.code;
      if (action !== 'consult' && (!code || ['dce_uncertain', 'dce_confirmation_missing', 'dce_receipt_pending'].includes(code))) onSaleUpdated({ ...sale, fiscal: { ...sale.fiscal, dce, nfe: { ...nfe, status: 'uncertain', requestedAt: new Date().toISOString() } } });
      if (action !== 'consult') { try { await consult(); } catch { /* Preservar o erro e a reserva do servidor. */ } }
    } finally { lock.current = false; setBusy(''); if (action !== 'consult') { setFile(null); setFinished(true); } }
  }
  async function chooseFile(selected?: File) {
    if (!selected || lock.current) return;
    if (!/\.xml$/i.test(selected.name) || selected.size > 2 * 1024 * 1024) { setMessage('Selecione um XML de NF-e de até 2 MB.'); return; }
    setFile({ name: selected.name, xml: await selected.text(), ...(canReplace ? { replaceInvoiceId: nfe.importedInvoiceId } : {}) });
    setFinished(false); setConfirmation('import');
  }
  async function download(kind: 'dce' | 'nfe', documentId: string, format: 'pdf' | 'xml' | 'json') {
    if (lock.current) return;
    lock.current = true; setBusy('download'); setMessage('');
    try {
      const { data } = await (await import('@/app/lib/supabase')).supabase.auth.getSession();
      if (!data.session) throw new Error('Entre novamente para baixar o documento.');
      const response = await fetch('/api/modulos/marketplaces/vendas/fiscal', { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ empresaId: companyId, connectionId: sale.connectionId, saleId: sale.id, action: 'download', kind, documentId, format }) });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.message || 'Documento indisponível.'); }
      const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
      link.href = url; link.download = `${kind}-${sale.orderId}.${format}`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage('Documento disponível para download.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível baixar o documento.'); }
    finally { lock.current = false; setBusy(''); }
  }
  const needsAttention = [dce,nfe].some(state => ['rejected','cancelled','uncertain'].includes(state.status) || (state.query && !state.query.ok));
  return <div className={styles.fiscalDetails} aria-busy={!!busy}>
    {sale.fiscal && needsAttention && <div className={styles.fiscalStates} role="status"><p>{fiscalStateText('DC-e', dce)}</p>{(nfeProfile || nfe.status !== 'unknown' || nfe.documents.length > 0) && <p>{fiscalStateText('NF-e', nfe)}</p>}</div>}

    <details><summary>Documentos fiscais</summary>
    {sale.fiscal && !needsAttention && <div className={styles.fiscalStates} role="status"><p>{fiscalStateText('DC-e', dce)}</p>{(nfeProfile || nfe.status !== 'unknown' || nfe.documents.length > 0) && <p>{fiscalStateText('NF-e', nfe)}</p>}</div>}
      <div className={styles.fiscalControls}>
        <BotaoAcaoCompacto disabled={!!busy} onClick={() => void run('consult')}>{busy === 'consult' ? 'Consultando…' : 'Consultar documentos e etiqueta'}</BotaoAcaoCompacto>
        {canManage && pending && !fiscalBlocked && nfeProfile && <><BotaoAcaoCompacto disabled={!!busy} onClick={() => { setFinished(false); setConfirmation('issue'); }}>Emitir NF-e pelo Faturador</BotaoAcaoCompacto><BotaoAcaoCompacto disabled={!!busy} onClick={() => input.current?.click()}>Importar XML da NF-e</BotaoAcaoCompacto></>}
        {canManage && canReplace && <BotaoAcaoCompacto disabled={!!busy} onClick={() => input.current?.click()}>Substituir XML da NF-e</BotaoAcaoCompacto>}
        <input ref={input} type="file" accept=".xml,application/xml,text/xml" hidden aria-label="XML autorizado da NF-e" onChange={event => { void chooseFile(event.target.files?.[0]); event.target.value = ''; }} />
      </div>
      {(['dce', 'nfe'] as const).map(kind => (kind === 'dce' ? dce : nfe).documents.map(doc => <div className={styles.fiscalDocument} key={`${kind}:${doc.id}`}><span>{kind === 'dce' ? 'DC-e' : 'NF-e'} · {({ authorized: 'Autorizado', issued: 'Emitido', rejected: 'Rejeitado', pending: 'Em processamento', cancelled: 'Cancelado' } as Record<string, string>)[doc.status] || 'Situação em consulta'}{doc.errorCode ? ` · código ${doc.errorCode}` : ''}</span><div>{doc.formats.map(format => <BotaoAcaoCompacto key={format} disabled={!!busy || !['authorized', 'issued'].includes(doc.status)} onClick={() => void download(kind, doc.id, format)}>{format === 'pdf' ? kind === 'nfe' ? 'Baixar DANFE' : 'Baixar PDF' : `Baixar ${format.toUpperCase()}`}</BotaoAcaoCompacto>)}</div></div>))}
      <p className={styles.fiscalHelp}>DC-e: PF ou PJ não contribuinte. NF-e: PJ contribuinte. O Faturador exige cadastro fiscal, certificado A1 e dados dos produtos configurados no Mercado Livre. A liberação da etiqueta também depende do envio.</p>
      {sale.fiscal?.profile && <p className={styles.fiscalHelp}>Perfil da conta: {sale.fiscal.profile.kind === 'pf' ? 'Pessoa Física · DC-e' : sale.fiscal.profile.kind === 'pj' ? 'Pessoa Jurídica · confirme se é contribuinte antes de escolher o documento' : 'a API não confirmou PF/PJ; confira o cadastro fiscal no Mercado Livre'}.</p>}
      {nfe.importedInvoiceId && <p className={styles.fiscalHelp}>NF-e importada localizada neste envio. A substituição exige XML autorizado e só é permitida antes da impressão da etiqueta.</p>}
      <details className={styles.fiscalDiagnostics}><summary>Detalhes da última consulta</summary>{[['DC-e', dce.query], ['NF-e do Faturador', nfe.query], ['NF-e importada', nfe.importQuery]].map(([label, query]) => { const q = query as typeof dce.query; return <p key={String(label)}>{String(label)}: {q ? `${q.ok ? 'resposta recebida' : 'consulta não concluída'}${q.httpStatus ? ` · HTTP ${q.httpStatus}` : ''}${q.code ? ` · ${q.code}` : ''} · ${new Date(q.checkedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}${q.correlation ? ` · referência ${q.correlation}` : ''}` : 'ainda não consultada'}</p>; })}</details>
    </details>
    {message && <p className={styles.documentFeedback} role="status">{message}</p>}
    <ModalConfirmacao aberto={!!confirmation} titulo={finished ? 'Resultado da solicitação' : confirmation === 'issue' ? 'Emitir NF-e pelo Faturador?' : file?.replaceInvoiceId ? 'Substituir NF-e deste envio?' : 'Importar NF-e deste envio?'} rotuloCabecalho={`Pedido #${sale.orderId}`} mensagem={finished ? message : confirmation === 'issue'
      ? `Ao confirmar, você declara que esta conta é PJ contribuinte e tem Faturador, certificado A1 e dados fiscais configurados. O Mercado Livre validará a emissão real da NF-e deste pedido e das vendas do mesmo vendedor no carrinho. Se já emitiu ou solicitou sem confirmação, consulte antes de repetir.`
      : `Enviar ${file?.name || 'XML'} ao Mercado Livre para o Pedido #${sale.orderId}? Confira emitente, destinatário, produtos e valores. Use somente o XML original autorizado, modelo 55, de produção.${file?.replaceInvoiceId ? ' A nota vinculada será substituída; a etiqueta precisa continuar sem impressão.' : ''}`}
      textoConfirmar={finished ? 'Fechar' : 'Confirmar e enviar'} textoCancelar="Voltar" ocultarCancelar={finished} carregando={!!busy} mostrarProgresso corPrimaria={brand} darkMode={dark} variante="primaria" aoCancelar={() => { if (!lock.current) { setConfirmation(null); setFile(null); } }} aoConfirmar={() => { if (finished) setConfirmation(null); else void run(confirmation === 'issue' ? 'issue' : 'import'); }} />
  </div>;
}

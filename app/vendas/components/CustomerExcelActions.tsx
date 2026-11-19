'use client';
import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import AvisoFormulario from '@/app/components/AvisoFormulario';
import {Modal} from '@/app/projetos/components/Modal';
import {Icon} from '@/app/projetos/components/Icon';
import {baixarModeloClientes,lerModeloClientes,solicitarImportacaoClientes,type CustomerImportPreview,type CustomerImportRow} from '../lib/customer-excel';
import styles from './CustomerExcelActions.module.css';

export default function CustomerExcelActions({companyId,companyName,origin,canCreate,canView,brand,onNotify}:{companyId:string;companyName:string;origin:string;canCreate:boolean;canView:boolean;brand:string;onNotify:(message:string)=>void}) {
  const input=useRef<HTMLInputElement>(null);
  const errorId=useId();
  const [busy,setBusy]=useState(false),[opened,setOpened]=useState(false),[error,setError]=useState('');
  const [data,setData]=useState<{rows:CustomerImportRow[];fileName:string;fileCompanyId:string;preview:CustomerImportPreview}|null>(null);
  useEffect(()=>{if(!busy)return;const leave=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);},[busy]);
  const close=()=>{if(!busy){setOpened(false);setData(null);setError('');}};
  const exportar=async()=>{setBusy(true);setError('');try{await baixarModeloClientes(companyId);}catch{setOpened(true);setError('Não foi possível gerar o modelo Excel. Tente novamente.');}finally{setBusy(false);}};
  const importar=async(file?:File)=>{
    if(!file)return;setOpened(true);setBusy(true);setData(null);setError('');
    try {
      if(!/\.xlsx$/i.test(file.name)||file.size>5*1024*1024)throw Error('Selecione um arquivo .xlsx de até 5 MB.');
      const parsed=await lerModeloClientes(await file.arrayBuffer(),companyId);
      const preview=await solicitarImportacaoClientes({companyId,origin,...parsed,fileName:file.name,confirm:false});
      setData({...parsed,fileName:file.name,preview});
    }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível ler a planilha.');}finally{setBusy(false);if(input.current)input.current.value='';}
  };
  const confirmar=async()=>{if(!data||!data.preview.canImport||busy)return;setBusy(true);setError('');try{
    const result=await solicitarImportacaoClientes({companyId,origin,rows:data.rows,fileName:data.fileName,fileCompanyId:data.fileCompanyId,confirm:true,previewKey:data.preview.previewKey});
    if(!result.confirmed)throw Error('A importação não foi confirmada. Revise a planilha novamente.');
    setOpened(false);setData(null);onNotify(`${result.created} cliente(s) importado(s). ${result.skipped} já cadastrado(s), sem alteração.`);
  }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível concluir.');}finally{setBusy(false);}};
  const revalidar=async()=>{if(!data||busy)return;setBusy(true);try{const preview=await solicitarImportacaoClientes({companyId,origin,rows:data.rows,fileName:data.fileName,fileCompanyId:data.fileCompanyId,confirm:false});setData({...data,preview});setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível revisar a planilha.');}finally{setBusy(false);}};
  return <div className={styles.root} style={{'--brand':brand} as CSSProperties}>
    <input ref={input} type="file" accept=".xlsx" hidden aria-label="Planilha de clientes" onChange={event=>void importar(event.target.files?.[0])}/>
    <BotaoAcaoCompacto disabled={!canCreate||!companyId||!origin||busy} title={!canCreate?'Sem permissão para cadastrar clientes':!companyId||!origin?'Abra o módulo pelo perfil empresarial':undefined} aria-label="Importar clientes do Excel" onClick={()=>input.current?.click()}><Icon name="upload" size={18}/><span className={styles.label}><strong>Importar</strong><small>Excel</small></span></BotaoAcaoCompacto>
    <BotaoAcaoCompacto disabled={!canView||busy} aria-label="Exportar modelo Excel de clientes" onClick={()=>void exportar()}><Icon name="download" size={18}/><span className={styles.label}><strong>Exportar</strong><small>Excel</small></span></BotaoAcaoCompacto>
    <Modal open={opened} title="Importar clientes" description={data?.fileName||'Preencha o modelo Excel e revise antes de confirmar.'} onClose={close} wide compact headerTone="accent">
      <div className={styles.review} aria-busy={busy}>
        <p>Perfil de destino: <strong>{companyName}</strong></p>
        {busy&&<p role="status">{data?'Confirmando a importação…':'Lendo e validando a planilha…'}</p>}
        {data&&<><div className={styles.totals}><div><strong>{data.preview.created}</strong><span>Novos clientes</span></div><div><strong>{data.preview.skipped}</strong><span>Já cadastrados · ignorar</span></div><div><strong>{data.preview.rowErrors.length}</strong><span>Erros para corrigir</span></div></div>
          <p>Clientes já cadastrados pelo CPF/CNPJ não serão alterados. {data.preview.review>0&&`${data.preview.review} novo(s) cadastro(s) precisam de revisão fiscal antes da emissão.`}</p>
          {data.preview.rowErrors.length>0?<div className={styles.errors} tabIndex={0} aria-label="Erros na planilha"><table><thead><tr><th>Linha</th><th>Correção necessária</th></tr></thead><tbody>{data.preview.rowErrors.map((item,index)=><tr key={index}><td>{item.line}</td><td>{item.message}</td></tr>)}</tbody></table></div>:<p>Nenhuma alteração foi aplicada ainda. A confirmação grava o lote inteiro ou não grava nenhum cliente.</p>}
        </>}
        <footer className={styles.actions}>{error&&<AvisoFormulario idMensagem={errorId} titulo="Não foi possível continuar" mensagem={error}/>}<div><BotaoAcaoCompacto disabled={busy} onClick={close}>Cancelar</BotaoAcaoCompacto>{error&&data&&<BotaoAcaoCompacto disabled={busy} onClick={()=>void revalidar()}>Revalidar planilha</BotaoAcaoCompacto>}<BotaoAcaoCompacto variante="primario" disabled={busy||Boolean(error)||!data?.preview.canImport||!data.preview.created} onClick={()=>void confirmar()}>Confirmar importação</BotaoAcaoCompacto></div></footer>
      </div>
    </Modal>
  </div>;
}

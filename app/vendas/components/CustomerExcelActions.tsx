'use client';
import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import AvisoFormulario from '@/app/components/AvisoFormulario';
import {Modal} from '@/app/projetos/components/Modal';
import {Icon} from '@/app/projetos/components/Icon';
import {baixarModeloClientes,lerModeloClientes,solicitarImportacaoClientes,type CustomerImportPreview,type CustomerImportRow,type CustomerImportMode} from '../lib/customer-excel';
import styles from './CustomerExcelActions.module.css';

export default function CustomerExcelActions({companyId,companyName,origin,canCreate,canView,canEdit=false,brand,onNotify}:{companyId:string;companyName:string;origin:string;canCreate:boolean;canView:boolean;canEdit?:boolean;brand:string;onNotify:(message:string)=>void}) {
  const input=useRef<HTMLInputElement>(null);
  const errorId=useId();
  const [busy,setBusy]=useState(false),[opened,setOpened]=useState(false),[error,setError]=useState('');
  const [mode,setMode]=useState<CustomerImportMode>('add'),[replacementAccepted,setReplacementAccepted]=useState(false);
  const [data,setData]=useState<{rows:CustomerImportRow[];fileName:string;fileCompanyId:string;preview:CustomerImportPreview}|null>(null);
  useEffect(()=>{if(!busy)return;const leave=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);},[busy]);
  const close=()=>{if(!busy){setOpened(false);setData(null);setError('');setReplacementAccepted(false);}};
  const exportar=async()=>{setBusy(true);setError('');try{await baixarModeloClientes(companyId);}catch{setOpened(true);setError('Não foi possível gerar o modelo Excel. Tente novamente.');}finally{setBusy(false);}};
  const importar=async(file?:File)=>{
    if(!file)return;setOpened(true);setBusy(true);setData(null);setError('');setReplacementAccepted(false);
    try {
      if(!/\.xlsx$/i.test(file.name)||file.size>5*1024*1024)throw Error('Selecione um arquivo .xlsx de até 5 MB.');
      const parsed=await lerModeloClientes(await file.arrayBuffer(),companyId);
      const preview=await solicitarImportacaoClientes({companyId,origin,mode,...parsed,fileName:file.name,confirm:false});
      setData({...parsed,fileName:file.name,preview});
    }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível ler a planilha.');}finally{setBusy(false);if(input.current)input.current.value='';}
  };
  const confirmar=async()=>{if(!data||!data.preview.canImport||busy||(mode==='replace'&&!replacementAccepted))return;setBusy(true);setError('');try{
    const result=await solicitarImportacaoClientes({companyId,origin,mode,rows:data.rows,fileName:data.fileName,fileCompanyId:data.fileCompanyId,confirm:true,previewKey:data.preview.previewKey});
    if(!result.confirmed)throw Error('A importação não foi confirmada. Revise a planilha novamente.');
    setOpened(false);setData(null);onNotify(mode==='replace'?`${result.created} novo(s), ${result.updated||0} atualizado(s) e ${result.inactivated||0} inativado(s). Históricos preservados.`:`${result.created} cliente(s) importado(s). ${result.skipped} duplicado(s) ignorado(s), sem alteração.`);
  }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível concluir.');}finally{setBusy(false);}};
  const revalidar=async()=>{if(!data||busy)return;setBusy(true);setReplacementAccepted(false);try{const preview=await solicitarImportacaoClientes({companyId,origin,mode,rows:data.rows,fileName:data.fileName,fileCompanyId:data.fileCompanyId,confirm:false});setData({...data,preview});setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível revisar a planilha.');}finally{setBusy(false);}};
  return <div className={styles.root} style={{'--brand':brand} as CSSProperties}>
    <input ref={input} type="file" accept=".xlsx" hidden aria-label="Planilha de clientes" onChange={event=>void importar(event.target.files?.[0])}/>
    <BotaoAcaoCompacto disabled={!canCreate||!companyId||!origin||busy} title={!canCreate?'Sem permissão para cadastrar clientes':!companyId||!origin?'Abra o módulo pelo perfil empresarial':undefined} aria-label="Importar clientes do Excel" onClick={()=>{setMode('add');setData(null);setError('');setReplacementAccepted(false);setOpened(true);}}><Icon name="upload" size={18}/><span className={styles.label}><strong>Importar</strong><small>Excel</small></span></BotaoAcaoCompacto>
    <BotaoAcaoCompacto disabled={!canView||busy} aria-label="Exportar modelo Excel de clientes" onClick={()=>void exportar()}><Icon name="download" size={18}/><span className={styles.label}><strong>Exportar</strong><small>Excel</small></span></BotaoAcaoCompacto>
    <Modal open={opened} title="Importar Clientes" onClose={close} wide compact headerTone="accent">
      <div className={styles.review} aria-busy={busy}>
        <ol className={styles.steps} aria-label="Etapas da importação"><li aria-current={!data?'step':undefined}><b>1</b>Modo de importação</li><li><b>2</b>Planilha</li><li aria-current={data?'step':undefined}><b>3</b>Revisão</li></ol>
        {!data&&!busy&&<fieldset className={styles.modes}><legend className={styles.srOnly}>Modo de importação</legend>
<label className={styles.mode} data-selected={mode==='add'}><input type="radio" name={errorId} value="add" checked={mode==='add'} onChange={()=>setMode('add')}/><span className={styles.modeTitle}><Icon name="people" size={28}/><strong>Adicionar à base</strong></span>{mode==='add'&&<span className={styles.selected}>Selecionado</span>}<span>Adiciona somente novos clientes.</span><span>Mantém os cadastros existentes.</span><span>Ignora duplicados por CPF/CNPJ.</span></label>
          <label className={styles.mode} data-selected={mode==='replace'} aria-disabled={!canEdit}><input type="radio" name={errorId} value="replace" disabled={!canEdit} checked={mode==='replace'} onChange={()=>setMode('replace')}/><span className={styles.modeTitle}><Icon name="refresh" size={28}/><strong>Substituir a base</strong></span>{mode==='replace'&&<span className={styles.selected}>Selecionado</span>}<span>Atualiza os clientes da planilha.</span><span>Adiciona novos cadastros.</span><span>Inativa os que não estiverem no arquivo.</span>{!canEdit&&<small>Exige permissão para editar clientes.</small>}</label>
        </fieldset>}
        {busy&&<p role="status">{data?'Confirmando a importação…':'Lendo e validando a planilha…'}</p>}
        {data&&<><p className={styles.file}>{data.fileName} · {companyName}</p><p><strong>{mode==='add'?'Adicionar à base':'Substituir a base'}</strong></p><div className={styles.totals}><div><strong>{data.preview.created}</strong><span>Novos clientes</span></div>{mode==='replace'?<><div><strong>{data.preview.updated||0}</strong><span>Atualizar cadastros</span></div><div><strong>{data.preview.inactivated||0}</strong><span>Inativar ausentes</span></div></>:<div><strong>{data.preview.skipped}</strong><span>Duplicados · ignorar</span></div>}<div><strong>{data.preview.rowErrors.length}</strong><span>Erros para corrigir</span></div></div>
          <p>{mode==='add'?'Clientes já cadastrados pelo CPF/CNPJ não serão alterados.':'Clientes presentes serão atualizados; ausentes serão inativados, sem apagar pedidos, notas ou históricos.'} {data.preview.review>0&&`${data.preview.review} cadastro(s) precisam de revisão fiscal antes da emissão.`}</p>
          {data.preview.rowErrors.length>0?<div className={styles.errors} tabIndex={0} aria-label="Erros na planilha"><table><thead><tr><th>Linha</th><th>Correção necessária</th></tr></thead><tbody>{data.preview.rowErrors.map((item,index)=><tr key={index}><td>{item.line}</td><td>{item.message}</td></tr>)}</tbody></table></div>:<p>Nenhuma alteração foi aplicada ainda. A confirmação grava o lote inteiro ou não grava nenhum cliente.</p>}
        </>}
        {data&&mode==='replace'&&data.preview.canImport&&<label className={styles.accept}><input type="checkbox" checked={replacementAccepted} disabled={busy} onChange={event=>setReplacementAccepted(event.target.checked)}/>Confirmo a atualização e a inativação dos ausentes conforme os totais acima.</label>}
        <footer className={styles.actions}>{error&&<AvisoFormulario idMensagem={errorId} titulo="Não foi possível continuar" mensagem={error}/>}<div><BotaoAcaoCompacto disabled={busy} onClick={close}>Cancelar</BotaoAcaoCompacto>{data&&<BotaoAcaoCompacto disabled={busy} onClick={()=>{setData(null);setError('');setReplacementAccepted(false);}}>Voltar</BotaoAcaoCompacto>}{error&&data&&<BotaoAcaoCompacto disabled={busy} onClick={()=>void revalidar()}>Revalidar planilha</BotaoAcaoCompacto>}{!data?<BotaoAcaoCompacto variante="primario" disabled={busy||(mode==='replace'&&!canEdit)} onClick={()=>input.current?.click()}><Icon name="upload" size={18}/>{busy?'Validando…':'Selecionar planilha'}</BotaoAcaoCompacto>:<BotaoAcaoCompacto variante="primario" disabled={busy||Boolean(error)||!data.preview.canImport||(mode==='add'?!data.preview.created:!replacementAccepted)} onClick={()=>void confirmar()}>{busy?'Importando…':'Confirmar importação'}</BotaoAcaoCompacto>}</div></footer>
      </div>
    </Modal>
  </div>;
}

'use client';
import {useEffect,useId,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import CampoBusca from '@/app/components/CampoBusca';
import MarketplaceSelect from './MarketplaceSelect';
import {normalizarTexto} from '@/app/lib/formatters';
import {pictureId,pictureUrl,type ContentEditor,type ContentKind} from '@/app/modules/marketplaces/listing-content';
import type {marketplaceClientRequest} from './Anunciados';
import styles from './listing-quality.module.css';
import type {CommonProductEditor} from '@/app/modules/marketplaces/product-common-content';

export default function ListingContentEditor({companyId,accountId,itemId,kind,request,dark,brand,onClose,onBusy,onSaved,unified=false,heading,progress}:{companyId:string;accountId:string;itemId:string;kind:ContentKind;request:typeof marketplaceClientRequest;dark:boolean;brand:string;onClose:()=>void;onBusy?:(busy:boolean)=>void;onSaved:()=>void;unified?:boolean;heading?:string;progress?:ReactNode}){
 const prefix=useId(),[editor,setEditor]=useState<ContentEditor|null>(null),[pictures,setPictures]=useState<ContentEditor['pictures']>([]),[values,setValues]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[stale,setStale]=useState(false),[confirm,setConfirm]=useState(false),[discard,setDiscard]=useState<'close'|'reload'|null>(null),[query,setQuery]=useState('');
 const lock=useRef(false),alive=useRef(true),readController=useRef<AbortController|null>(null),requestKey=useRef(crypto.randomUUID()),errorRef=useRef<HTMLDivElement>(null);
 const initialValue=(a:ContentEditor['attributes'][number])=>['list','boolean'].includes(a.type)?a.valueId||'':a.value;
 const changes=editor?Object.fromEntries(Object.entries(values).filter(([id,value])=>{const a=editor.attributes.find(a=>a.id===id);return a?.editable&&value!==initialValue(a);})):{};
 const dirty=!!editor&&((unified&&(editor as CommonProductEditor).different)||(kind==='pictures'?JSON.stringify(pictures.map(p=>p.id))!==JSON.stringify(editor.pictures.map(p=>p.id)):Object.keys(changes).length>0));
 async function load(){
  if(lock.current)return;setLoading(true);setError('');readController.current?.abort();const controller=new AbortController();readController.current=controller;
  try{const params=new URLSearchParams({empresaId:companyId,connectionId:accountId,id:itemId,kind});const result=await request(`anunciados/qualidade/conteudo?${params}`,undefined,AbortSignal.any([controller.signal,AbortSignal.timeout(50_000)])) as ContentEditor;
   if(result.id!==itemId||result.connectionId!==accountId||result.kind!==kind||!Array.isArray(result.affectedIds)||!Array.isArray(result.attributes)||!Array.isArray(result.pictures))throw new Error('O contexto de edição não foi confirmado para este anúncio.');
   if(!controller.signal.aborted&&alive.current){setEditor(result);setPictures(result.pictures);setValues(Object.fromEntries(result.attributes.map(a=>[a.id,initialValue(a)])));setStale(false);setMessage('');requestKey.current=crypto.randomUUID();}
  }catch(e){if(!controller.signal.aborted&&alive.current)setError(e instanceof Error?e.message:'Não foi possível abrir a edição.');}
  finally{if(!controller.signal.aborted&&alive.current)setLoading(false);}
 }
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;readController.current?.abort();};},[companyId,accountId,itemId,kind]);
 useEffect(()=>{if(!dirty&&!saving&&!uploading)return;const protect=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[dirty,saving,uploading]);
 useEffect(()=>{if(error){errorRef.current?.focus();}},[error]);
 function close(){if(lock.current)return;if(dirty)setDiscard('close');else onClose();}
 async function upload(file:File){
  if(lock.current||!editor||editor.reason||stale)return;
  if(!['image/jpeg','image/png'].includes(file.type)||file.size>2_621_440){setError('Use uma foto JPG ou PNG de até 2,5 MB.');return;}
  if(pictures.length>=editor.maxPictures){setError(`O limite desta categoria é ${editor.maxPictures} fotos.`);return;}
  lock.current=true;setUploading(true);onBusy?.(true);setError('');
  try{const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Não foi possível ler a foto.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.readAsDataURL(file);});
   const picture=await request('anunciados/qualidade/foto',{empresaId:companyId,connectionId:accountId,id:itemId,base64,mime:file.type},AbortSignal.timeout(55_000));
   if(!pictureId(picture.id)||!pictureUrl(picture.url))throw new Error('O ML não confirmou a foto enviada.');
   if(alive.current){setPictures(old=>old.some(p=>p.id===picture.id)?old:[...old,{id:picture.id,url:pictureUrl(picture.url)}]);setMessage('Foto preparada no ML. O anúncio só será alterado ao revisar e confirmar o salvamento.');}
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Não foi possível enviar a foto.');}
  finally{lock.current=false;if(alive.current)setUploading(false);onBusy?.(false);}
 }
 async function save(){
  if(lock.current||!editor||editor.reason||stale||!dirty)return;
  lock.current=true;setSaving(true);onBusy?.(true);setError('');setConfirm(false);
  const commonValues=unified?Object.fromEntries(Object.entries(values).filter(([id,value])=>value.trim()&&editor.attributes.some(a=>a.id===id&&a.editable))):changes;
  try{const result=await request('anunciados/qualidade/conteudo',{empresaId:companyId,connectionId:accountId,id:itemId,kind,revision:editor.revision,requestKey:requestKey.current,confirmation:itemId,affectedIds:editor.affectedIds,values:kind==='pictures'?pictures.map(p=>p.id):commonValues},AbortSignal.timeout(unified?600_000:55_000),'PATCH');
   if(result.success!==true||result.pending!==false||result.editor?.id!==itemId)throw new Error('A alteração não foi confirmada. Recarregue para conferir antes de repetir.');
   if(alive.current){setEditor(result.editor);setPictures(result.editor.pictures);setValues(Object.fromEntries((result.editor as ContentEditor).attributes.map(a=>[a.id,initialValue(a)])));setMessage(result.message);requestKey.current=crypto.randomUUID();onSaved();}
  }catch(e){if(alive.current){setError(e instanceof Error?e.message:'Não foi possível confirmar a alteração.');const invalid=(e as {code?:string})?.code==='invalid_fields';setStale(!invalid);if(invalid)requestKey.current=crypto.randomUUID();}}
  finally{lock.current=false;if(alive.current)setSaving(false);onBusy?.(false);}
 }
 const disabled=loading||saving||uploading||stale||!!editor?.reason;
 return <><CardExpandidoModal aberto darkMode={dark} rotulo={heading||(kind==='pictures'?'Editar fotos do anúncio':'Editar ficha técnica')} onFechar={close}>
  <section className={styles.editor} style={{'--brand':brand,'--content-surface':dark?'#172132':'#fff','--content-ink':dark?'#e6edf4':'#1d2b3d'} as CSSProperties}>
   <header><div><h3>{heading||(kind==='pictures'?'Fotos do anúncio':'Ficha técnica do anúncio')}</h3><p className={styles.help}>{itemId} · {editor?.title}</p></div><BotaoAcaoCompacto disabled={saving||uploading} onClick={close}>Fechar</BotaoAcaoCompacto></header>
   <CarregamentoDadosModulo ativo={loading||uploading||saving} variante="local" titulo="Editor do anúncio" mensagem={saving?'Validando e enviando os dados. Aguarde a confirmação de cada destino…':uploading?'Preparando a foto no Mercado Livre…':'Consultando dados e permissões no Mercado Livre…'} temaEscuro={dark} corPrimaria={brand}/>
   {error&&<div ref={errorRef} tabIndex={-1} className={styles.error} role="alert">{error}</div>}{message&&<p className={styles.affected} role="status">{message}</p>}
   {progress}
   {editor&&<><div className={styles.affected}><strong>{unified?`Edição única para ${editor.affectedIds.length} anúncio(s) vinculado(s).`:editor.affectedIds.length===1?'Somente este anúncio será alterado.':`Conteúdo compartilhado: ${editor.affectedIds.length} anúncios desta conta serão afetados.`}</strong><details><summary>Conferir anúncios afetados</summary>{editor.affectedIds.join(' · ')}</details><small>{unified?'Os mesmos dados serão enviados aos destinos listados. Cada preço será preservado. Não altera o estoque nem publica novos anúncios.':'Fotos e características podem ser compartilhadas pelo ML. Não altera saldo físico, preço, outras contas ou publica novos anúncios.'}</small></div>
    {editor.reason&&<p className={styles.error}>{editor.reason}</p>}
    {!!(editor as CommonProductEditor).restrictions?.length&&<details><summary>Restrições de envio ao Mercado Livre</summary>{(editor as CommonProductEditor).restrictions!.map((r,i)=><p key={i}>{r.id}: {r.message}</p>)}</details>}
    {kind==='pictures'?<>
     <label className={styles.field}>Adicionar foto · JPG/PNG, até 2,5 MB<input type="file" accept="image/jpeg,image/png" disabled={disabled} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/></label>
     <p className={styles.help}>A primeira foto é a capa. Reordene pelas setas. Fotos associadas a variações não podem ser removidas.</p>
     <ol className={styles.photos}>{pictures.map((picture,index)=><li className={styles.photo} key={picture.id}>{picture.url?<img src={picture.url} alt={`Foto ${index+1} do anúncio`} />:<p>Prévia indisponível</p>}<small>{index===0?'Capa':`Foto ${index+1}`}</small><div className={styles.actions}>
      <BotaoAcaoCompacto aria-label={`Mover foto ${index+1} para antes`} disabled={disabled||index===0} onClick={()=>setPictures(old=>{const next=[...old];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})}>←</BotaoAcaoCompacto>
      <BotaoAcaoCompacto aria-label={`Mover foto ${index+1} para depois`} disabled={disabled||index===pictures.length-1} onClick={()=>setPictures(old=>{const next=[...old];[next[index+1],next[index]]=[next[index],next[index+1]];return next;})}>→</BotaoAcaoCompacto>
      <BotaoAcaoCompacto variante="destrutivo" disabled={disabled||pictures.length<2} onClick={()=>setPictures(old=>old.filter(p=>p.id!==picture.id))}>Remover</BotaoAcaoCompacto>
     </div></li>)}</ol>
    </>:<><CampoBusca aria-label="Filtrar características" placeholder="Pesquisar característica" value={query} onChange={setQuery}/>
     <div className={styles.fields}>{editor.attributes.filter(a=>a.editable&&normalizarTexto(a.name).includes(normalizarTexto(query))).map(a=><div key={a.id} className={styles.field}>{['list','boolean'].includes(a.type)?<MarketplaceSelect label={`${a.name}${a.required?' *':''}`} ariaLabel={a.name} value={values[a.id]||''} placeholder="Selecione" disabled={disabled} options={a.options.map(o=>({value:o.id,label:o.name}))} onChange={value=>setValues(old=>({...old,[a.id]:value}))}/>:<><label htmlFor={`${prefix}-${a.id}`}>{a.name}{a.required?' *':''}</label>{a.type==='text'?<textarea id={`${prefix}-${a.id}`} value={values[a.id]||''} disabled={disabled} maxLength={a.maxLength} rows={6} onChange={e=>setValues(old=>({...old,[a.id]:e.target.value}))}/>:<input id={`${prefix}-${a.id}`} value={values[a.id]||''} disabled={disabled} maxLength={a.maxLength} onChange={e=>setValues(old=>({...old,[a.id]:e.target.value}))}/ >}{a.type==='number_unit'&&<small className={styles.help}>Número e unidade. Permitidas: {a.units.join(', ')}</small>}</>}</div>)}</div>
     {!editor.attributes.some(a=>a.editable)&&<p>Nenhuma característica pode ser editada neste anúncio.</p>}
     <details className={styles.protected}><summary>Campos protegidos e valores preservados</summary>{editor.attributes.filter(a=>!a.editable).map(a=><p key={a.id}><strong>{a.name}: {a.value||'Não informado'}</strong><br/>{a.reason}</p>)}</details>
    </>}
   </>}
   <footer className={styles.footer}><BotaoAcaoCompacto disabled={saving||uploading} onClick={close}>Cancelar</BotaoAcaoCompacto><BotaoAcaoCompacto disabled={saving||uploading||loading} onClick={()=>dirty?setDiscard('reload'):void load()}>Recarregar dados</BotaoAcaoCompacto><BotaoAcaoCompacto variante="primario" disabled={disabled||!dirty} onClick={()=>setConfirm(true)}>Revisar e salvar</BotaoAcaoCompacto></footer>
  </section>
 </CardExpandidoModal>
 <ModalConfirmacao aberto={confirm} variante="primaria" titulo="Confirmar alteração no Mercado Livre?" mensagem={`Enviar ${kind==='pictures'?'a nova organização de fotos':'os dados revisados'} para ${editor?.affectedIds.length||0} anúncio(s) ${unified?'vinculado(s) ao produto':'da conta selecionada'}: ${editor?.affectedIds.join(', ')}. Estoque e cada preço serão preservados. A nota depende do recálculo do ML.`} textoConfirmar="Enviar alterações" textoCancelar="Continuar revisando" corPrimaria={brand} darkMode={dark} carregando={saving} aoCancelar={()=>setConfirm(false)} aoConfirmar={()=>void save()}/>
 <ModalConfirmacao aberto={!!discard} variante="alerta" titulo="Descartar alterações não salvas?" mensagem="O anúncio não será alterado. Fotos apenas preparadas não serão associadas ao anúncio." textoConfirmar="Descartar" textoCancelar="Continuar editando" corPrimaria={brand} darkMode={dark} aoCancelar={()=>setDiscard(null)} aoConfirmar={()=>{const action=discard;setDiscard(null);if(action==='reload')void load();else onClose();}}/>
 </>;
}

export const MARKETPLACE_ACCOUNT_SYNCED='avanta:marketplace-account-synced';
type Account={id:string;provider?:string;status:string;connected_at?:string|null;last_error_code?:string|null;local_label?:string|null;seller_name?:string|null};
type Request=(path:string,body?:unknown,signal?:AbortSignal)=>Promise<any>;
export async function refreshAccountSales(request:Request,companyId:string,connectionId:string,signal:AbortSignal){
  let salesUpdated=false;
  try{await request(`vendas?${new URLSearchParams({empresaId:companyId,connectionId})}`,undefined,AbortSignal.any([signal,AbortSignal.timeout(55_000)]));salesUpdated=true;}
  finally{if(!signal.aborted&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent(MARKETPLACE_ACCOUNT_SYNCED,{detail:{companyId,connectionId,salesUpdated}}));}
}
/** Uma fila por abertura do módulo. Sem filtros de tela, bloqueio visual ou gravação no marketplace. */
export function createStartupAccountSync(companyId:string,request:Request,onError:(connectionId:string,message:string)=>void){
  const seen=new Map<string,string>(),queue=new Map<string,Account>();
  const retries=new Map<string,ReturnType<typeof setTimeout>>(),attempts=new Map<string,number>();
  const cancelRetry=(id:string)=>{const timer=retries.get(id);if(timer!==undefined)clearTimeout(timer);retries.delete(id);attempts.delete(id);};
  let stopped=false,running=false,current:{id:string;controller:AbortController}|null=null;
  async function drain(){
    if(running||stopped)return;running=true;
    try{while(queue.size&&!stopped){
      const account=queue.values().next().value!;queue.delete(account.id);
      const controller=new AbortController();current={id:account.id,controller};
      try{
        let complete=false;
        for(let batch=0;batch<200;batch++){
          if(controller.signal.aborted)break;
          const progress=await request('anunciados/sincronizar',{empresaId:companyId,connectionId:account.id},AbortSignal.any([controller.signal,AbortSignal.timeout(55_000)]));
          if(controller.signal.aborted)break;
          if(progress.complete===true){complete=true;break;}
        }
        if(controller.signal.aborted)continue;
        if(!complete)throw Error('Ainda há anúncios para consultar. Use Atualizar em Anunciados para continuar.');
        await refreshAccountSales(request,companyId,account.id,controller.signal);
        attempts.delete(account.id);
      }catch(error){
        if(!stopped&&!controller.signal.aborted){
          if((error as {code?:unknown}|null)?.code==='sync_busy'){
            const count=attempts.get(account.id)||0;
            if(count<4){
              attempts.set(account.id,count+1);
              // A trava pertence a outra rotina: esperar sem bloquear as outras contas.
              retries.set(account.id,setTimeout(()=>{
                retries.delete(account.id);
                if(stopped||seen.get(account.id)!==(account.connected_at||''))return;
                queue.set(account.id,account);void drain();
              },30_000));
            }else{
              attempts.delete(account.id);
              onError(account.id,`${account.local_label||account.seller_name||account.id}: Não foi possível concluir a atualização após aguardar outra sincronização. Use Atualizar em Anunciados para tentar novamente.`);
            }
          }else onError(account.id,`${account.local_label||account.seller_name||account.id}: ${error instanceof Error?error.message:'Não foi possível concluir a sincronização.'}`);
        }
      }
      finally{if(current?.controller===controller)current=null;}
    }}finally{running=false;}
  }
  return {
    update(accounts:Account[]){
      if(stopped)return;
      const eligible=accounts.filter(a=>(a.provider==null||['mercado_livre','magalu'].includes(a.provider))&&(a.status==='connected'||a.provider==='magalu'&&a.status==='attention'&&a.last_error_code==='magalu_connector_pending'));
      const ids=new Set(eligible.map(a=>a.id));
      for(const id of seen.keys())if(!ids.has(id)){seen.delete(id);queue.delete(id);cancelRetry(id);if(current?.id===id)current.controller.abort();}
      for(const a of eligible)if(!seen.has(a.id)||seen.get(a.id)!==(a.connected_at||'')){if(current?.id===a.id)current.controller.abort();cancelRetry(a.id);seen.set(a.id,a.connected_at||'');queue.set(a.id,a);}
      queueMicrotask(()=>{if(!stopped)void drain();});
    },
    stop(){stopped=true;queue.clear();for(const id of retries.keys())cancelRetry(id);current?.controller.abort();},
  };
}

const pendingStates=['sending','uncertain','pending_review'];
export function controlledPlan(manifest,version,environment){
 const plan=manifest.controlledCheck;
 if(!plan||plan.version!==version)return null;
 if(plan.type!=='marketplace-post-sale-jeff'||plan.accountLabel!=='JEFF'||plan.mode!=='read-only-before-production'||!/^\d{1,24}$/.test(plan.sellerReference))throw Error('Plano de controle inválido.');
 for(const key of ['companyId','connectionId'])if(!/^[a-f0-9-]{36}$/i.test(plan[key]||''))throw Error('Identificação do controle inválida.');
 if(environment&&environment!=='production')throw Error('Este controle requer o ambiente de produção; nenhum segredo será copiado para preview.');
 return plan;
}
export function installControlledFetch({fetchImpl,supabaseUrl,plan}){
 const origin=new URL(supabaseUrl).origin,stats={mlReads:0,databaseReads:0,oauthRefreshes:0,credentialUpdates:0,blockedWrites:0};const responses=[];
 const wrapped=async(input,init={})=>{
  const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url),method=(init.method||input.method||'GET').toUpperCase();
  const ml=url.origin==='https://api.mercadolibre.com',db=url.origin===origin;
  if(method==='GET'&&(ml||db)){if(ml)stats.mlReads++;else stats.databaseReads++;}
  else if(ml&&url.pathname==='/oauth/token'&&method==='POST'&&new URLSearchParams(String(init.body)).get('grant_type')==='refresh_token')stats.oauthRefreshes++;
  else if(db&&url.pathname==='/rest/v1/marketplace_connections'&&method==='PATCH'&&url.searchParams.get('id')===`eq.${plan.connectionId}`&&url.searchParams.get('empresa_id')===`eq.${plan.companyId}`){
   let body;try{body=JSON.parse(String(init.body));}catch{body=null;}
   const allowed=['refresh_lock_owner','refresh_lock_until','token_sealed','expires_at','scopes','last_checked_at','last_error_code','status'];
   if(!body||Object.keys(body).some(k=>!allowed.includes(k))||body.status&&body.status!=='expired'){stats.blockedWrites++;throw Error('Escrita fora do controle de credencial bloqueada.');}stats.credentialUpdates++;
  }else{stats.blockedWrites++;throw Error('O teste controlado bloqueou uma chamada fora da leitura autorizada.');}
  const response=await fetchImpl(input,init);
  if(ml&&method==='GET'){
   const record={resource:url.pathname.replace(/\d+/g,':id'),status:response.status};
   try{const data=await response.clone().json();record.keys=Array.isArray(data)?['array']:Object.keys(data||{}).slice(0,20);for(const key of ['code','error','cause'])if(typeof data?.[key]==='string'&&/^[A-Za-z_]{1,100}$/.test(data[key]))record.providerCode=data[key];if(data?.conversation_status){record.conversationStatus=data.conversation_status.status;record.conversationSubstatus=data.conversation_status.substatus;record.paging=data.paging;}}
   catch{record.json=false;}responses.push(record);
  }
  return response;
 };
 return {fetch:wrapped,stats,responses};
}
export function verifyWorkspace(workspace){
 if(!workspace||!Array.isArray(workspace.messages)||!Array.isArray(workspace.cases)||workspace.casesComplete!==true||!/^\d{1,24}$/.test(workspace.orderId)||!/^[a-f0-9]{64}$/.test(workspace.revision))throw Error('O pedido, o histórico ou as permissões de reclamações não foram confirmados.');
 if(workspace.operations.some(o=>pendingStates.includes(o.state)))throw Error('A amostra contém solicitação real pendente; o teste não a modificará.');
 if(workspace.canReply&&workspace.reason)throw Error('Política de comunicação inconsistente.');
 return {orderSuffix:workspace.orderId.slice(-7),messages:workspace.messages.length,cases:workspace.cases.length,casesComplete:true,canReply:workspace.canReply,conversationPolicy:workspace.reason?'restricted':'available',nextPageAvailable:workspace.hasMore};
}

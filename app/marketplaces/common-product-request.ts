import type {marketplaceClientRequest} from './Anunciados';
import type {CommonProductEditor,CommonTarget,ProductCommonKind} from '@/app/modules/marketplaces/product-common-content';
export type CommonEditProgress={connectionId:string;id:string;status:'confirmed'|'failed'|'not_sent';message:string};
/** Uma revisão e uma confirmação; chamadas separadas mantêm o prazo por destino.
 * Nunca repete um envio, nem envia preço/estoque. Falhas parciais ficam explícitas. */
export function commonProductRequest({companyId,productId,kind,sourceConnectionId,sourceId,request,onProgress,onlyMissing=false}:{companyId:string;productId:string;kind:ProductCommonKind;sourceConnectionId:string;sourceId:string;request:typeof marketplaceClientRequest;onProgress:(results:CommonEditProgress[])=>void;onlyMissing?:boolean}):typeof marketplaceClientRequest{
 const common={empresaId:companyId,productId,kind,sourceConnectionId,sourceId};
 let loaded:CommonProductEditor|null=null;
  async function read(signal?:AbortSignal){const result=await request(`produtos/qualidade?${new URLSearchParams({...common,localDraft:'true'})}`,undefined,signal) as CommonProductEditor;
  if(result.productId!==productId||result.id!==sourceId||result.connectionId!==sourceConnectionId)throw Error('Os anúncios deste produto não foram confirmados.');loaded=result;return result;
 }
 return async(path,body,signal,method)=>{
  if(path.startsWith('anunciados/qualidade/conteudo?'))return read(signal);
  if(path==='anunciados/qualidade/conteudo'&&method==='PATCH'){
   if(!loaded)throw Error('Recarregue os dados antes de salvar.');
   const input=body as {revision:string;values:unknown};
   const review=await request('produtos/qualidade',{...common,localDraft:true,onlyMissing,revision:input.revision,values:input.values},signal) as {scopeHash:string;parts:CommonTarget[];destinations:string[];blocked?:{connectionId:string;id:string;message:string}[]};
   if(review.scopeHash!==loaded.scopeHash||!Array.isArray(review.parts))throw Error('O alcance mudou. Recarregue antes de enviar.');
   const results:CommonEditProgress[]=(review.blocked||[]).map(r=>({...r,status:'not_sent'}));onProgress([...results]);
   for(const part of review.parts){
    const current:CommonEditProgress={connectionId:part.connectionId,id:part.id,status:'not_sent',message:'Não enviado.'};
    if(!signal?.aborted)try{
     const result=await request('produtos/qualidade',{...common,scopeHash:review.scopeHash,confirmation:productId,target:part,values:input.values,requestKey:crypto.randomUUID()},AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(55_000)]),'PATCH');
     if(result.success!==true)throw Error('A plataforma não confirmou a alteração.');
     current.status='confirmed';current.message=result.unchanged?'Já estava atualizado.':'Alteração confirmada.';
    }catch(e){current.status='failed';current.message=e instanceof Error?e.message:'Não foi possível confirmar. Confira antes de reenviar.';}
    results.push(current);onProgress([...results]);
   }
   if(results.some(r=>r.status!=='confirmed'))throw Object.assign(new Error('Aplicação incompleta. Confira o resultado de cada anúncio. Os envios confirmados não serão repetidos automaticamente; recarregue para revisar os restantes.'),{code:'common_partial'});
   const editor=await read(signal);
   return {success:true,pending:false,editor,message:'Dados comuns confirmados nos destinos revisados. Os preços individuais foram preservados. Atualize os objetivos após o recálculo do ML.'};
  }
  // Upload prepara somente a mídia; associação aos destinos exige a confirmação conjunta.
  if(path==='anunciados/qualidade/foto')return request(path,body,signal,method);
  throw Error('Operação não disponível no editor único do produto.');
 };
}

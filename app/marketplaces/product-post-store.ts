import type {ProductPostDraft} from '../modules/marketplaces/product-post.ts';
import type {WarehouseContext} from '../modules/marketplaces/warehouses';
export type PostRequest=(path:string,options?:RequestInit)=>Promise<unknown>;
export type PostScope={companyId:string;productId?:string;historyId?:string};
export type SavedProductPost={draft:ProductPostDraft;image:Blob;source:Blob;revision:number;productId:string};
const PATH='/api/modulos/marketplaces/precos/post';
function identity(scope:PostScope){
 if(!scope.companyId||(!scope.productId&&!scope.historyId))throw new Error('Selecione um produto cadastrado para salvar o post.');
 return {empresaId:scope.companyId,...(scope.productId?{productId:scope.productId}:{historyId:scope.historyId!})};
}
async function readImage(url:string,signal?:AbortSignal){
 const response=await fetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),cache:'no-store',credentials:'omit'});
 if(!response.ok)throw new Error('Não foi possível abrir a imagem do post. Feche e tente novamente.');
 const blob=await response.blob();if(!blob.size||blob.size>3_145_728||!['image/jpeg','image/png'].includes(blob.type))throw new Error('A imagem salva não pôde ser lida.');return blob;
}
export async function loadProductPost(scope:PostScope,request:PostRequest,signal?:AbortSignal):Promise<{post:SavedProductPost|null;stock:WarehouseContext}>{
 const result=await request(`${PATH}?${new URLSearchParams(identity(scope))}`,{signal}) as {stock:WarehouseContext;post:null|{draft:Omit<ProductPostDraft,'image'>;imageUrl:string;sourceUrl:string;revision:number;productId:string}};
 if(!result.post)return {post:null,stock:result.stock};
 const p=result.post,[image,source]=await Promise.all([readImage(p.imageUrl,signal),readImage(p.sourceUrl,signal)]);
 return {post:{draft:{...p.draft,image:''},image,source,revision:p.revision,productId:p.productId},stock:result.stock};
}
export async function saveProductPost(scope:PostScope,request:PostRequest,draft:ProductPostDraft,image:Blob,source:Blob,revision:number,requestKey:string){
 const form=new FormData();for(const [key,value] of Object.entries(identity(scope)))form.set(key,value);
 const {image:ignored,...fields}=draft;void ignored;
 form.set('draft',JSON.stringify(fields));form.set('image',image,'post.png');form.set('source',source,'source.jpg');form.set('revision',String(revision));form.set('requestKey',requestKey);
 return await request(PATH,{method:'POST',body:form}) as {id:string;revision:number;productId:string};
}

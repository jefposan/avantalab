import type {CommonProductEditor,CommonTarget} from './product-common-content';

export const pictureTargetKey=(target:{connectionId:string;id:string})=>`${target.connectionId}:${target.id}`;
/** Uma conta bloqueada não libera nem bloqueia outra. Alcance compartilhado continua obrigatório. */
export function pictureAccountPermissions(editor:CommonProductEditor){
 const targets=editor.reviewTargets||[];
 return targets.map(target=>{
  const content=target.content;
  const restriction=editor.restrictions?.find(r=>r.connectionId===target.connectionId&&r.id===target.id);
  let reason=content?.reason||restriction?.message||'';
  if(!content)reason||='As permissões desta conta ainda não foram confirmadas.';
  if(!target.affectedIds.length||target.affectedIds.some(id=>!targets.some(t=>t.connectionId===target.connectionId&&t.id===id)))reason||='Este conteúdo afeta outro anúncio fora deste cadastro. Confira os vínculos.';
  if(targets.some(peer=>peer!==target&&peer.connectionId===target.connectionId&&peer.affectedIds.some(id=>target.affectedIds.includes(id))&&JSON.stringify([...peer.affectedIds].sort())!==JSON.stringify([...target.affectedIds].sort())))reason||='O alcance compartilhado mudou entre as contas. Recarregue os dados.';
  if(!Number.isSafeInteger(content?.maxPictures)||!content||content.maxPictures<=content.pictures.length)reason||='Esta conta não tem espaço disponível para novas fotos.';
  return {target,key:pictureTargetKey(target),allowed:!reason,reason};
 });
}
/** Prepara adição às contas elegíveis; cada galeria/capa existente será preservada no envio. */
export function perAccountPictureEditor(editor:CommonProductEditor):CommonProductEditor{
 const permissions=pictureAccountPermissions(editor),eligible=permissions.filter(row=>row.allowed);
 const primary=eligible.find(row=>row.target.connectionId===editor.connectionId&&row.target.id===editor.id)?.target||eligible[0]?.target;
 if(!primary)return {...editor,pictureAppendTargets:[],pictureSource:undefined,reason:permissions.length&&permissions.every(row=>/catálogo confirmado|controlad[oa].*catálogo|definid[oa].*catálogo|conteúdo de catálogo/i.test(row.reason))?'As galerias vinculadas são controladas pelo catálogo do ML.':'Nenhum anúncio vinculado está liberado para adicionar fotos nesta revisão.'};
 const pictures=primary.content!.pictures;
 const slots=Math.min(...eligible.map(row=>row.target.content!.maxPictures-row.target.content!.pictures.length));
 return {...editor,reason:'',pictures,maxPictures:pictures.length+slots,pictureAppendTargets:eligible.map(row=>row.key),pictureSource:{connectionId:primary.connectionId,id:primary.id}};
}
export function appendTargetPictures(target:CommonTarget,additions:unknown){
 if(!Array.isArray(additions)||!additions.length||additions.some(id=>typeof id!=='string')||new Set(additions).size!==additions.length)throw Error('Informe novas fotos válidas, sem repetição.');
 return [...new Set([...target.content!.pictures.map(p=>p.id),...additions as string[]])];
}

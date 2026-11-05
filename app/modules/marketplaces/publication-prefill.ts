import type {CatalogPreparation,PublicationForm} from './services/catalog-publication';

/** Exibição da origem não concede disponibilidade/permissão na nova conta. */
export function copiedSelectionOptions(options:Array<{id:string;name:string;path?:string}>|undefined,value:string,label:string,copied:boolean){
 const rows=options||[];
 return copied&&value&&!rows.some(row=>row.id===value)?[...rows,{id:value,name:`${label} · anúncio de origem (revalidar)`}]:rows;
}
export function copiedSelectionValue(options:Array<{id:string}>|undefined,value:string,copied:boolean){
 return copied?value:options?.some(row=>row.id===value)?value:'';
}
export function copiedAttributeValues(prepared:CatalogPreparation,form:PublicationForm){
 const values={...form.attributes};
 for(const field of [...prepared.requiredAttributes||[],...prepared.optionalAttributes||[]]){
  const value=values[field.id];
  const option=field.values.find(option=>option.id===value||option.name.trim().toLocaleLowerCase('pt-BR')===value?.trim().toLocaleLowerCase('pt-BR'));
  if(option)values[field.id]=option.id;
 }
 return values;
}

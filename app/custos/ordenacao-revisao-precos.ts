export type ColunaRevisao = 'sku' | 'nome' | 'tabela' | 'anterior' | 'novo';
type LinhaRevisao = {sku:string;nome:string;tabela:string;anterior:number;novo:number};
const comparador = new Intl.Collator('pt-BR',{numeric:true,sensitivity:'base'});
/** Ordena cópias das linhas completas; não altera a revisão nem o payload confirmado. */
export function ordenarMudancas<T extends LinhaRevisao>(linhas:readonly T[],ordem:{coluna:ColunaRevisao;direcao:'asc'|'desc'}|null):T[]{
 if(!ordem)return [...linhas];
 const {coluna,direcao}=ordem;
 return [...linhas].sort((a,b)=>{
  const resultado=coluna==='anterior'||coluna==='novo'?a[coluna]-b[coluna]:comparador.compare(a[coluna],b[coluna]);
  return direcao==='asc'?resultado:-resultado;
 });
}

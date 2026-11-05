/** Windows-safe, deterministic name; complete order reference stays before the product. */
export function shippingLabelFilename(orderId:string,items:readonly {title?:string|null}[]=[],extension:'txt'|'pdf'='txt'){
 const clean=(s:string,max:number)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/-+/g,'-').replace(/^[-_]+|[-_]+$/g,'').slice(0,max).replace(/[-_]+$/g,'');
 const order=clean(String(orderId||''),64)||'sem-referencia',names=items.map(i=>i.title?.trim()).filter((s):s is string=>!!s);
 const product=names[0]?clean(names[0],80):'';
 return `etiqueta-pedido-${order}${product?`-${product}`:''}${names.length>1?`-mais-${names.length-1}-itens`:''}.${extension}`;
}

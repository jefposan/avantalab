/** Só extrai o identificador do QR ML; nunca abre URL nem envia o payload completo. */
export function shippingLabelId(raw:unknown):string|null{
 if(typeof raw!=='string'||raw.length>2048)return null;
 try{const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const id=value.id;if(typeof id==='number'&&!Number.isSafeInteger(id))return null;
 return (typeof id==='string'||typeof id==='number')&&/^[1-9]\d{5,19}$/.test(String(id))?String(id):null;
 }catch{return null;}
}
export type LabelProduct={description:string;image:string|null;ean:string|null};
export type LabelResult={shipmentId:string;products:LabelProduct[]};

/** Replaces one complete operation only. Older snapshots cannot regress versions. */
export function mergeConfirmedReceivables(current,incoming,operationId){
 const previous=current.filter(row=>row.persistence?.operationId===operationId);
 const byId=new Map(incoming.map(row=>[row.id,row]));
 if(previous.some(row=>!byId.has(row.id)||Number(row.persistence.version)>Number(byId.get(row.id).persistence.version)))return current;
 let inserted=false;
 const next=[];
 for(const row of current){
  if(row.persistence?.operationId===operationId){if(!inserted){next.push(...incoming);inserted=true;}}
  else next.push(row);
 }
 return inserted?next:[...incoming,...current];
}
export function applyConfirmedOperationPayment(current,operation){
 return current.map(record=>{
  if(record.persistence?.operationId!==operation.id||record.persistence.version>operation.version)return record;
  const fields={paymentMethod:operation.payment.method,installments:operation.payment.installments,firstDueDate:operation.payment.firstDueDate};
  return {...record,persistence:{...record.persistence,version:operation.version},order:record.order?{...record.order,...fields}:record.order,serviceOrder:record.serviceOrder?{...record.serviceOrder,...fields}:record.serviceOrder};
 });
}
/** A profile load started before confirmation cannot restore the old payment. */
export function reconcileConfirmedOperationSnapshot(current,incoming,confirmed){
 const previous=new Map(current.filter(r=>r.persistence).map(r=>[r.persistence.operationId,r]));
 const payments=new Map(confirmed.map(op=>[op.id,op]));
 return incoming.map(row=>{
  const old=previous.get(row.persistence?.operationId);
  const selected=old&&old.persistence.version>row.persistence.version?old:row;
  const payment=payments.get(selected.persistence?.operationId);
  return payment?applyConfirmedOperationPayment([selected],payment)[0]:selected;
 });
}

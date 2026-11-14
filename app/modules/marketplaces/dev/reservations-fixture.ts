// Mesmas transações SQL de produção, executadas apenas em PostgreSQL/WASM local.
import {readFile} from 'node:fs/promises';
import {createDirectSalesFixture} from './direct-sales-fixture.ts';
export async function createReservationsFixture(){
 const f=await createDirectSalesFixture();
 try{
  await f.db.exec(await readFile(`${process.cwd()}/supabase/migrations/20261114160000_marketplace_stock_reservations.sql`,'utf8'));
  const balances=async()=>(await f.db.query<{id:string;name:string;is_online:boolean;quantity:number|null;reserved_quantity:number;revision:number;confirmed_at:string|null}>(`select w.id,w.name,w.is_online,b.quantity,b.reserved_quantity,b.revision,b.confirmed_at from marketplace_warehouses w join marketplace_warehouse_balances b on b.empresa_id=w.empresa_id and b.warehouse_id=w.id and b.product_id=$2 where w.empresa_id=$1 and w.archived_at is null order by w.is_online desc,w.created_at`,[f.company,f.product])).rows.map(({reserved_quantity,...w})=>({...w,reservedQuantity:reserved_quantity}));
  const reserve=async(action:string,data:Record<string,unknown>,key=crypto.randomUUID(),actor=f.actor,company=f.company)=>(await f.db.query<{r:{reservationId:string;status:string;productId:string;stockAfter:number;saleId:string|null}}>('select marketplace_reservation_command($1,$2,$3,$4,$5) r',[company,actor,action,JSON.stringify(data),key])).rows[0].r;
  return {...f,balances,reserve};
 }catch(e){await f.db.close();throw e;}
}

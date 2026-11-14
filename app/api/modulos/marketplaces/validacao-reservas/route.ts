import {NextResponse} from 'next/server';
import {createReservationsFixture} from '@/app/modules/marketplaces/dev/reservations-fixture';
import {publicReservation,reservationCommandData} from '@/app/modules/marketplaces/services/stock-reservations';
import {directCommandData} from '@/app/modules/marketplaces/services/direct-sales';
export const runtime='nodejs';
export const maxDuration=60;
async function fixture(){
 const f=await createReservationsFixture();
 await f.db.query('update marketplace_products set name=$1,ean=$2 where id=$3',['Liquidificador · Produto de teste','7909569454787',f.product]);
 for(const [id,quantity] of [[f.online,3],[f.offline,1]] as const){const b=(await f.balances()).find(w=>w.id===id)!;await f.db.query('select marketplace_warehouse_command($1,$2,$3,$4,$5)',[f.company,f.actor,'set',JSON.stringify({warehouseId:id,productId:f.product,revision:b.revision,quantity}),crypto.randomUUID()]);}
 await f.db.exec('delete from queued');
 return {...f,remoteQuantity:3,remoteStatus:'active',remotePausedBySystem:false,failDelivery:false};
}
const local=globalThis as typeof globalThis&{__avantaReservationsFixture?:ReturnType<typeof fixture>};
export async function POST(request:Request){
 if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(new URL(request.url).hostname))return new NextResponse(null,{status:404});
 const headers={'Cache-Control':'no-store'};
 try{
  const {path,body={}}=await request.json();
  if(path==='reset'){if(local.__avantaReservationsFixture)await(await local.__avantaReservationsFixture).db.close();local.__avantaReservationsFixture=fixture();await local.__avantaReservationsFixture;return NextResponse.json({reset:true},{headers});}
  local.__avantaReservationsFixture??=fixture();const f=await local.__avantaReservationsFixture;
  if(body.empresaId&&body.empresaId!==f.company)throw Error('Perfil inválido na prévia.');
  if(path==='bootstrap')return NextResponse.json({companyId:f.company,productId:f.product},{headers});
  const sync=async()=>{
   const pending=(await f.db.query<{n:number}>('select count(*)::int n from queued')).rows[0].n;
   return {pending:pending>0,failed:f.failDelivery,remoteQuantity:f.remoteQuantity,remoteStatus:f.remoteStatus,accounts:['JEFF','ALINE','CIDY','ADRIANO']};
  };
  if(path==='simulated-sync'){
   f.failDelivery=body.fail===true;
   if(!f.failDelivery){f.remoteQuantity=(await f.balances()).find(w=>w.is_online)!.quantity??0;f.remoteStatus=f.remoteQuantity?'active':'paused';await f.db.exec('delete from queued');}
   return NextResponse.json(await sync(),{headers});
  }
  if(path==='sync-status')return NextResponse.json(await sync(),{headers});
  if(path==='/api/modulos/marketplaces/reservas'){
   if(body.action==='context')return NextResponse.json({actorId:f.actor,canReserve:true,productId:f.product,reservations:(await f.db.query("select * from marketplace_stock_reservations where status='active' order by created_at desc")).rows.map(publicReservation),warehousesReady:true,warehouses:await f.balances()},{headers});
   const c=reservationCommandData(body);return NextResponse.json({result:await f.reserve(c.action,c.data,c.requestKey)},{headers});
  }
  if(path==='/api/modulos/marketplaces/precos/estoque'){
   if(body.action!=='context')await f.db.query('select marketplace_warehouse_command($1,$2,$3,$4,$5)',[f.company,f.actor,body.action,JSON.stringify(body),body.requestKey]);
   const p=(await f.db.query<{stock_quantity:number;revision:number}>('select stock_quantity,revision from marketplace_products where id=$1',[f.product])).rows[0];
   return NextResponse.json({stock:{productId:f.product,quantity:p.stock_quantity,revision:p.revision,confirmed:true,canManage:true,warehousesReady:true,warehouses:await f.balances()}},{headers});
  }
  if(path.startsWith('/api/modulos/marketplaces/vendas-diretas')){
   if(body.action==='context')return NextResponse.json({actorId:f.actor,canSell:true,canWithdraw:true,product:{id:f.product,name:'Liquidificador · Produto de teste',ean:'7909569454787',picture:null,referenceCents:22000},percentages:{minimum:50,medium:70,ideal:90},warehousesReady:true,warehouses:await f.balances()},{headers});
   if(body.action){const c=directCommandData(body);return NextResponse.json({result:await f.command(c.action,c.data,c.requestKey)},{headers});}
   return NextResponse.json({sales:[],canSell:true},{headers});
  }
  throw Error('Operação indisponível nesta prévia.');
 }catch(e){const err=e as Error&{code?:string;status?:number};return NextResponse.json({rejected:err.code==='P0001'||[400,409].includes(err.status||0),message:err.message},{status:err.code==='P0001'||[400,409].includes(err.status||0)?200:503,headers});}
}

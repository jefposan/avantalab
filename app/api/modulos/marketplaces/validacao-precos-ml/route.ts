import {NextResponse} from 'next/server';
import {createMarketPricesFixture} from '@/app/modules/marketplaces/dev/market-prices-fixture';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
let fixture:ReturnType<typeof createMarketPricesFixture>|undefined;
export async function POST(request:Request){
 if(process.env.NODE_ENV==='production'||!['127.0.0.1','localhost','[::1]'].includes(new URL(request.url).hostname))return NextResponse.json({message:'Não encontrado.'},{status:404,headers});
 try{
  if(Number(request.headers.get('content-length')||0)>4096)return NextResponse.json({message:'Corpo inválido.'},{status:413,headers});
  const body=await request.json();
  if(body.action==='reset'){if(fixture)await (await fixture).db.close();fixture=undefined;}
  const f=await (fixture??=createMarketPricesFixture());let notice='Referência cadastrada. Nenhuma consulta real é feita nesta tela.';
  if(body.action==='research'){
   if(!['ready','insufficient','partial','unavailable','empty'].includes(body.scenario)||typeof body.requestKey!=='string'||!/^[a-f0-9-]{36}$/i.test(body.requestKey)||!Number.isSafeInteger(body.revision))return NextResponse.json({message:'Tentativa inválida.'},{status:400,headers});
   const claim=await f.command('claim',body.requestKey,body.revision);
   if(claim.claimed){const e=f.scenario(body.scenario);const result=await f.command(body.scenario==='unavailable'?'fail':'complete',body.requestKey,body.revision,e.status==='ready'?e.offers:[],e);notice=result.status==='updated'?'Referência atualizada pelo Mercado Livre (simulação local).':'Referência anterior mantida. Confira os resultados da pesquisa.';}
  }else if(!['context','reset'].includes(body.action))return NextResponse.json({message:'Operação inválida.'},{status:400,headers});
  return NextResponse.json({...await f.snapshot(),notice},{headers});
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:'Não foi possível concluir a simulação.'},{status:503,headers});}
}

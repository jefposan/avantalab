import {NextResponse} from 'next/server';
import {readPublicOffers} from '@/app/modules/ofertas/server';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(){
 try{return NextResponse.json(await readPublicOffers(),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 catch{return NextResponse.json({message:'Não foi possível atualizar as ofertas. Tente novamente.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}

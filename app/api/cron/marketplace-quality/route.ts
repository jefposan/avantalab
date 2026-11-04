import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {refreshQualityBatch} from '@/app/modules/marketplaces/services/quality-cache';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({message:'Acesso não autorizado.'},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({message:'Atualização indisponível.'},{status:503});
 try{return NextResponse.json(await refreshQualityBatch(createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),randomUUID()));}catch{return NextResponse.json({message:'A atualização diária será retomada na próxima execução.'},{status:503});}
}

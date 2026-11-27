import type {SupabaseClient} from '@supabase/supabase-js';
import type {PrecoTabelaItem} from './types';

/** Carrega todos os preços das tabelas da empresa antes de permitir herança do padrão. */
export async function consultarPrecosCustos(db:SupabaseClient,tabelasIds:string[]):Promise<PrecoTabelaItem[]>{
 if(!tabelasIds.length)return [];
 const precos:PrecoTabelaItem[]=[];
 const tamanho=500;
 for(let inicio=0;;inicio+=tamanho){
  const {data,error}=await db.from('custos_tabela_preco_itens')
   .select('tabela_preco_id,produto_id,preco,atualizado_em').in('tabela_preco_id',tabelasIds)
   .order('tabela_preco_id').order('produto_id').range(inicio,inicio+tamanho-1);
  if(error||!Array.isArray(data))throw new Error('Não foi possível carregar todos os preços das tabelas. Tente novamente.');
  precos.push(...data.map(item=>({...item,preco:Number(item.preco)||0})));
  if(data.length<tamanho)return precos;
 }
}

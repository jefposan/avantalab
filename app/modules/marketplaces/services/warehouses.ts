import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { objectValue, uuidIsValid } from './listing-model';
import { WAREHOUSE_ACTIONS, type Warehouse, type WarehouseContext, type WarehouseAllocation } from '../warehouses';
import { validInternalNotes } from '../product-internal-notes';

export async function listWarehouses(db: SupabaseClient, companyId: string): Promise<Warehouse[]> {
  const rows:Warehouse[]=[];
  for(let offset=0;;offset+=500) {
    const result = await db.from('marketplace_warehouses').select('id,name,is_online').eq('empresa_id',companyId).is('archived_at',null).order('is_online',{ascending:false}).order('created_at').order('id').range(offset,offset+499).abortSignal(AbortSignal.timeout(20_000));
    if(result.error) throw new MarketplaceError(503,'warehouses_database','Não foi possível consultar os estoques. Confira a atualização do banco e tente novamente.');
    rows.push(...result.data||[]);if((result.data||[]).length<500) return rows;
  }
}
async function readBalances(db:SupabaseClient,companyId:string,productIds:string[]) {
  const rows:Array<{warehouse_id:string;product_id:string;quantity:number|null;revision:number;confirmed_at:string|null}>=[];
  for(let offset=0;;offset+=500) {
    const {data,error}=await db.from('marketplace_warehouse_balances').select('warehouse_id,product_id,quantity,revision,confirmed_at').eq('empresa_id',companyId).in('product_id',productIds).order('warehouse_id').order('product_id').range(offset,offset+499).abortSignal(AbortSignal.timeout(20_000));
    if(error)throw error;
    rows.push(...data||[]);if((data||[]).length<500)return rows;
  }
}
export async function warehouseContext(db: SupabaseClient, companyId: string, productId: string): Promise<WarehouseContext> {
  try {
    const warehouses = await listWarehouses(db,companyId);
    if(warehouses.filter(w=>w.is_online).length!==1)throw new Error('Estoque online não confirmado.');
    const data=await readBalances(db,companyId,[productId]);
    return {warehousesReady:true,warehouses:warehouses.map(w=>{
      const balance=data?.find(b=>b.warehouse_id===w.id);
      return {...w,quantity:balance ? balance.quantity : 0,revision:balance?.revision ?? 1,confirmed_at:balance?.confirmed_at ?? null};
    })};
  } catch {
    // Versões antigas continuam lendo o online; não presumir ausência de estoques.
    return {warehousesReady:false,warehouses:[],warehouseError:'Não foi possível consultar os estoques separados. Atualize antes de movimentar.'};
  }
}
export async function productAllocations(db: SupabaseClient, companyId: string, productIds: string[]) {
  if(!productIds.length) return new Map<string,WarehouseAllocation[]>();
  const warehouses=await listWarehouses(db,companyId);
  if(warehouses.filter(w=>w.is_online).length!==1)throw new Error('Estoque online não confirmado.');
  const data=await readBalances(db,companyId,productIds);
  return new Map(productIds.map(id=>[id,warehouses.map(w=>{const b=data?.find(b=>b.product_id===id&&b.warehouse_id===w.id);return {warehouseId:w.id,name:w.name,online:w.is_online,quantity:b?b.quantity:0};})]));
}
export async function warehouseCommand(db: SupabaseClient, companyId: string, actor: string, input: unknown) {
  const body=objectValue(input);
  if(!WAREHOUSE_ACTIONS.includes(body.action as typeof WAREHOUSE_ACTIONS[number]) || !uuidIsValid(body.requestKey)) throw new MarketplaceError(400,'invalid_warehouse_command','Atualize o formulário antes de continuar.');
  const data: Record<string,unknown>={};
  if(body.action==='create'||body.action==='rename') {
    if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>60) throw new MarketplaceError(400,'warehouse_name','Informe um nome de até 60 caracteres.');
    data.name=body.name.trim();
  }
  if(body.action!=='create') { if(!uuidIsValid(body.warehouseId)) throw new MarketplaceError(400,'warehouse_missing','Selecione o estoque.'); data.warehouseId=body.warehouseId; }
  if(['add','set','transfer'].includes(String(body.action))) {
    if(!uuidIsValid(body.productId)||!Number.isSafeInteger(body.quantity)||Number(body.quantity)<(body.action==='set'?0:1)||Number(body.quantity)>99999||!Number.isSafeInteger(body.revision)||Number(body.revision)<1) throw new MarketplaceError(400,'warehouse_quantity','Confira o produto, o saldo e a quantidade inteira de até 99.999 unidades.');
    Object.assign(data,{productId:body.productId,quantity:body.quantity,revision:body.revision});
    if(body.action==='transfer') {
      if(!uuidIsValid(body.destinationId)||body.destinationId===body.warehouseId||!Number.isSafeInteger(body.destinationRevision)||Number(body.destinationRevision)<1) throw new MarketplaceError(400,'warehouse_destination','Selecione outro estoque e atualize o saldo do destino.');
      Object.assign(data,{destinationId:body.destinationId,destinationRevision:body.destinationRevision});
    }
    if(typeof body.note==='string') data.note=body.note.trim().slice(0,500);
    if (body.internalNotes !== undefined) {
      if (!validInternalNotes(body.internalNotes) || !Number.isSafeInteger(body.internalNotesRevision) || Number(body.internalNotesRevision) < 0) throw new MarketplaceError(400,'product_notes_invalid','Informe observações internas de até 160 caracteres e atualize o cadastro.');
      data.internalNotes = body.internalNotes.trim();
      data.internalNotesRevision = body.internalNotesRevision;
    }
  }
  const {data:result,error}=await db.rpc(data.internalNotes !== undefined ? 'marketplace_warehouse_command_with_notes' : 'marketplace_warehouse_command',{p_empresa_id:companyId,p_actor_id:actor,p_action:body.action,p_data:data,p_request_key:body.requestKey});
  if(error) throw new MarketplaceError(error.code==='P0001'||error.code==='23505'?409:503,'warehouse_command',error.code==='P0001'?error.message:error.code==='23505'?'Já existe um estoque com esse nome.':'Não foi possível salvar o estoque. Atualize para conferir antes de repetir.');
  if(['add','set','transfer'].includes(String(body.action))){try{const {dispatchStockAfterCommit}=await import('./inventory-dispatch');dispatchStockAfterCommit(db,companyId);}catch{console.error('marketplace_stock_delivery_pending');}}
  return result;
}

export async function warehouseProducts(db:SupabaseClient,companyId:string,warehouseId:unknown,page:number) {
  if(!uuidIsValid(warehouseId)) throw new MarketplaceError(400,'warehouse_missing','Selecione o estoque.');
  const warehouses=await listWarehouses(db,companyId);
  if(!warehouses.some(w=>w.id===warehouseId)) throw new MarketplaceError(404,'warehouse_missing','Estoque não encontrado neste perfil.');
  const {data,error,count}=await db.from('marketplace_warehouse_balances')
    .select('quantity,product:marketplace_products!inner(id,name,ean)',{count:'exact'})
    .eq('empresa_id',companyId).eq('warehouse_id',warehouseId).gt('quantity',0).is('product.archived_at',null)
    .order('product_id').range((page-1)*25,page*25-1);
  if(error) throw new MarketplaceError(503,'warehouses_database','Não foi possível listar os produtos deste estoque.');
  return {products:data||[],total:count||0,page};
}

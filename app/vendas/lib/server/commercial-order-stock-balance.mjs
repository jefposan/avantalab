/** Called only after authenticated stock permission and company/location checks. */
export async function loadOrderStockBalance(client,{companyId,localId,productId,quantity,allowNegativeStock=false}) {
  const load=async()=>(await client.query('select * from public.vendas_estoque_saldos where empresa_id=$1 and local_id=$2 and produto_id=$3 for update',[companyId,localId,productId])).rows[0];
  let balance=await load();
  if(!balance&&allowNegativeStock){
    // A missing opening entry is not an unavailable product. Ownership is still
    // checked against the persisted product/catalog before creating a zero row.
    await client.query(`insert into public.vendas_estoque_saldos(empresa_id,local_id,produto_id,permite_negativo)
      select $1,$2,produto.id,true from public.vendas_mobile_catalogo_produtos produto
      join public.vendas_mobile_catalogos catalogo on catalogo.id=produto.catalogo_id
      where produto.id=$3 and catalogo.empresa_id=$1
      on conflict(empresa_id,local_id,produto_id) do nothing`,[companyId,localId,productId]);
    balance=await load();
  }
  await assertStockControlActive(client,companyId,balance);
  if(balance&&allowNegativeStock&&!balance.permite_negativo&&Math.round((Number(balance.saldo_fisico)-Number(balance.saldo_reservado))*1000)<Math.round(Number(quantity)*1000)){
    balance=(await client.query('update public.vendas_estoque_saldos set permite_negativo=true where empresa_id=$1 and id=$2 returning *',[companyId,balance.id])).rows[0];
  }
  return balance;
}

export async function assertStockControlActive(client,companyId,balance) {
 if(!balance||!Object.hasOwn(balance,'controle_ativo'))return;
 const company=(await client.query('select vendas_estoque_controle_ativo enabled from public.empresas where id=$1',[companyId])).rows[0];
 if(balance.controle_ativo===false||company?.enabled===false)throw Object.assign(Error('AV-STOCK-CONTROL-DISABLED'),{code:'AV-STOCK-CONTROL-DISABLED'});
}

// Uma carga só é publicada na tela após todas as páginas terem sido confirmadas.
// Falhas nunca transformam uma carga parcial em histórico completo.
export async function fetchCommercialPages({url,key,token,fetcher=fetch,pageSize=100}) {
  const result=[],seen=new Set();
  for(let offset=0;;offset+=pageSize){
    const separator=url.includes('?')?'&':'?';
    const response=await fetcher(`${url}${separator}limit=${pageSize}&offset=${offset}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
    const payload=await response.json();
    if(!response.ok||payload.ok!==true||!Array.isArray(payload[key]))throw Error(payload.message||'Não foi possível carregar o histórico completo. Tente novamente.');
    const page=payload[key];
    for(const row of page){const id=String(row.id||row.emissionId||row.draftId||'');if(!id||seen.has(id))throw Error('A lista mudou durante a consulta. Atualize para conferir o histórico completo.');seen.add(id);result.push(row);}
    if(page.length<pageSize)return result;
  }
}

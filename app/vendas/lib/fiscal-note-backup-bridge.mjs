export const FISCAL_BACKUP_REQUEST='AVANTALAB_VENDAS_FISCAL_BACKUP_V1';
export function requestFiscalBackup({companyId,origin,action='list',...input}){return new Promise((resolve,reject)=>{
 if(!companyId||!origin||window.parent===window){reject(Error('Abra Notas fiscais pelo perfil empresarial na Gestão.'));return;}
 const requestId=crypto.randomUUID(),channel=new MessageChannel();const timer=window.setTimeout(()=>{channel.port1.close();reject(Error('A conexão demorou. Reabra Backup de notas para consultar ou retomar a geração.'));},150000);
 channel.port1.onmessage=event=>{const reply=event.data;if(reply?.requestId!==requestId||reply.companyId!==companyId)return;window.clearTimeout(timer);channel.port1.close();if(reply.ok)resolve(reply);else reject(Error(reply.message||'Não foi possível concluir o backup.'));};
 window.parent.postMessage({type:FISCAL_BACKUP_REQUEST,companyId,requestId,action,...input},origin,[channel.port2]);
});}

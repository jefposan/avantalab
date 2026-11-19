const finalStates=new Set(['authorized','artifacts_stored','danfe_ready','canceled']);
export function countPendingFiscalDrafts(drafts){
 return drafts.filter(draft=>!finalStates.has(draft.remoteState)&&draft.status!=='Cancelado').length;
}
export function mergeFiscalIndicatorStatuses(drafts,statuses){
 let changed=false;
 const next=drafts.map(draft=>{const status=draft.emissionId?statuses[draft.emissionId]:undefined;
  if(!status||status.id!==draft.emissionId||status.version<(draft.remoteVersion||0)||!status.state)return draft;
  if(draft.remoteState===status.state&&draft.remoteVersion===status.version)return draft;
  changed=true;return {...draft,remoteState:status.state,remoteVersion:status.version};
 });
 return changed?next:drafts;
}

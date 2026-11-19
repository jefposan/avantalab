type Draft={emissionId?:string;remoteVersion?:number;remoteState?:string;status?:string};
export function countPendingFiscalDrafts(drafts:Draft[]):number;
export function mergeFiscalIndicatorStatuses<T extends Draft>(drafts:T[],statuses:Record<string,{id:string;state:string;version:number}>):T[];

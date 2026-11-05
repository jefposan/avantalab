export type QualityRecord={connection_id:string;listing_id:string;score:number|null;checked_at:string|null;issue:string|null};
export const qualityKey=(connection:string,id:string)=>`${connection}:${id}`;
export function qualitySummary(records:QualityRecord[],keys:string[]){
 const selected=[...new Set(keys)].map(key=>records.find(r=>qualityKey(r.connection_id,r.listing_id)===key));
 const known=selected.filter((r):r is QualityRecord=>!!r&&typeof r.score==='number'&&Number.isFinite(r.score)&&r.score>=0&&r.score<=100);
 return {score:known.length?Math.min(...known.map(r=>r.score!)):null,low:known.filter(r=>r.score!<70).length,unknown:selected.length-known.length,stale:known.some(r=>!!r.issue||!r.checked_at||Date.now()-Date.parse(r.checked_at)>26*3600000)};
}
